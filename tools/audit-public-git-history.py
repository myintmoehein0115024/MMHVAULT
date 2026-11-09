#!/usr/bin/env python3
"""No-deploy Public MMHVAULT repository + reachable Git history secret pattern audit.

NEVER prints candidate secrets, source lines, credentials, or blob IDs.
Heuristics are not a guarantee of absence or a substitute for GitHub secret scanning.
Requires a complete Git checkout (fetch-depth: 0).
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter
import io
import json
from pathlib import PurePosixPath
import re
import subprocess
from pathlib import Path

MAX_BLOB_BYTES = 8 * 1024 * 1024
PATTERNS = {
    "private_key_block": re.compile(rb"-----BEGIN ((?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?)PRIVATE KEY-----[\s\S]{32,16384}?-----END \1PRIVATE KEY-----"),
    "supabase_secret_key": re.compile(rb"\bsb_secret_[A-Za-z0-9_-]{16,}"),
    "payment_secret_key": re.compile(rb"\bsk_(?:live|test)_[A-Za-z0-9]{16,}"),
    "resend_api_key": re.compile(rb"\bre_[A-Za-z0-9]{24,}"),
    "github_access_token": re.compile(rb"\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}"),
    "aws_access_key_id": re.compile(rb"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
}
JWT_PATTERN = re.compile(rb"\beyJ[A-Za-z0-9_-]{6,}\.eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{8,}\b")
DANGEROUS_NAME = re.compile(
    r"(^|/)(?:\.env(?:\.[^/]*)?|id_(?:rsa|ed25519)|credentials\.json|"
    r"service[-_]?account[^/]*\.json|.*\.(?:pem|p12|pfx|key))$", re.I
)

def git(*args: str, input_data: bytes | None = None) -> bytes:
    r = subprocess.run(["git", *args], input=input_data, capture_output=True, check=True)
    return r.stdout

def classify_blob(data: bytes) -> set[str]:
    found = {kind for kind, pattern in PATTERNS.items() if pattern.search(data)}
    # Decode only the JWT payload and classify the role; do not log the JWT.
    for m in list(JWT_PATTERN.finditer(data))[:64]:
        token = m.group().split(b".")
        try:
            payload = base64.urlsafe_b64decode(token[1] + b"=" * (-len(token[1]) % 4))
            if re.search(rb'"role"\s*:\s*"service_role"', payload):
                found.add("service_role_jwt")
                break
        except (ValueError, Exception):
            continue
    return found

def self_test() -> None:
    assert not classify_blob(b"sb_publishable_SYNTHETIC_PUBLIC_CLIENT_KEY")
    assert not classify_blob(b"SUPABASE_SERVICE_ROLE_KEY is a variable name, not a value")
    assert "supabase_secret_key" in classify_blob(b"sb_secret_" + b"X" * 25)
    assert "resend_api_key" in classify_blob(b"re_" + b"R" * 30)
    assert "github_access_token" in classify_blob(b"ghp_" + b"A" * 36)
    assert "private_key_block" in classify_blob(b"-----BEGIN " + b"PRIVATE KEY-----\n" + b"A" * 64 + b"\n-----END " + b"PRIVATE KEY-----")
    assert DANGEROUS_NAME.search("a/.env.production")
    assert not DANGEROUS_NAME.search("analytics-worker/wrangler.toml")
    print("PASS: history scanner synthetic detections and public-key exclusions")

def scan() -> dict:
    objects = git("rev-list", "--objects", "--all").decode("utf-8", errors="replace").splitlines()
    keyed = []
    for row in objects:
        key, _, path = row.partition(" ")
        if re.fullmatch(r"[a-f0-9]{40,64}", key):
            keyed.append((key, path))
    current = git("ls-files", "-s", "-z").split(b"\0")
    current_blob_shas = set()
    current_paths = []
    for rec in current:
        if not rec or b"\t" not in rec:
            continue
        prefix, name = rec.split(b"\t", 1)
        fields = prefix.split()
        if len(fields) >= 2:
            current_blob_shas.add(fields[1].decode("ascii"))
        current_paths.append(name.decode("utf-8", errors="replace"))
    all_paths = {p for _, p in keyed if p} | set(current_paths)
    suspicious_paths = {p for p in all_paths if DANGEROUS_NAME.search(p)}
    check_input = ("\n".join(key for key, _ in keyed) + "\n").encode()
    checks = git("cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)", input_data=check_input)
    sizes = {}
    for row in checks.decode("ascii", errors="replace").splitlines():
        fields = row.split()
        if len(fields) == 3 and fields[1] == "blob":
            sizes[fields[0]] = int(fields[2])
    targets = [sha for sha, _ in keyed if sha in sizes and sizes[sha] <= MAX_BLOB_BYTES]
    oversize = sum(1 for sha, _ in keyed if sha in sizes and sizes[sha] > MAX_BLOB_BYTES)
    kinds = Counter()
    current_kinds = Counter()
    text_blobs = 0
    binary_blobs = 0
    # Process bounded chunks to avoid a single huge buffering operation.
    for start in range(0, len(targets), 24):
        ids = targets[start:start + 24]
        output = git("cat-file", "--batch", input_data=("\n".join(ids) + "\n").encode())
        stream = io.BytesIO(output)
        for expected in ids:
            header = stream.readline().strip().split()
            if len(header) != 3 or header[0].decode() != expected or header[1] != b"blob":
                raise RuntimeError("Git batch object mismatch")
            length = int(header[2])
            payload = stream.read(length)
            if len(payload) != length or stream.read(1) != b"\n":
                raise RuntimeError("Git batch framing error")
            if b"\0" in payload[:8192]:
                binary_blobs += 1
                continue
            text_blobs += 1
            for category in classify_blob(payload):
                kinds[category] += 1
                if expected in current_blob_shas:
                    current_kinds[category] += 1
    results = {
        "scope": "public_checkout_reachable_refs_only",
        "working_tree_files": len(current_paths),
        "unique_git_objects": len(keyed),
        "unique_blobs": len(sizes),
        "text_blobs_scanned": text_blobs,
        "binary_blobs_skipped": binary_blobs,
        "oversize_blobs_skipped": oversize,
        "sensitive_filename_flags": len(suspicious_paths),
        "possible_secret_blob_count_by_type": dict(sorted(kinds.items())),
        "possible_current_secret_blob_count_by_type": dict(sorted(current_kinds.items())),
        "conclusion": "heuristic_pattern_scan_not_proof_of_absence"
    }
    print("AUDIT: working_tree_files=", results["working_tree_files"],
          "unique_blobs=", results["unique_blobs"],
          "text_scanned=", text_blobs,
          "binary_skipped=", binary_blobs,
          "large_skipped=", oversize)
    print("AUDIT: sensitive_filename_flags=", results["sensitive_filename_flags"],
          "potential_history_matches=", sum(kinds.values()),
          "potential_current_matches=", sum(current_kinds.values()))
    print("AUDIT: potential_history_categories=", dict(sorted(kinds.items())),
          "potential_current_categories=", dict(sorted(current_kinds.items())))
    if kinds or suspicious_paths or oversize:
        print("::warning::Historical audit found potential patterns or coverage gaps. Review privately; NO secret values logged.")
    if current_kinds:
        print("::error::Current public HEAD has suspected credential patterns. Manual security review required.")
    return results

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", default="public-git-safety-summary.json")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    result = scan()
    Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return 1 if result["possible_current_secret_blob_count_by_type"] else 0

if __name__ == "__main__":
    raise SystemExit(main())
