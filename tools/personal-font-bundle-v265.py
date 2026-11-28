#!/usr/bin/env python3
"""Assemble eight pinned Personal font candidates in a fresh, isolated directory.

Input: <source-root>/<candidate>/<original filename> and OFL.txt.
Output: <output>/<candidate>/ plus fonts.css and bundle.json.
Offline QA only. Never runs deployment, modifies the repository, or approves distribution.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
spec = importlib.util.spec_from_file_location("personal_font_pack", HERE / "personal-font-pack-v265.py")
pack = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(pack)

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def isolated(path):
    resolved = path.resolve()
    require(resolved != REPO and REPO not in resolved.parents, "QA output must be outside repository")
    return resolved

def source_bytes(root, candidate, filename, limit):
    directory = root / candidate
    path = directory / filename
    require(not directory.is_symlink() and not path.is_symlink(), "symlink input rejected")
    require(path.is_file() and 0 < path.stat().st_size <= limit, "missing or oversized source: " + candidate)
    return path.read_bytes()

# Reserved names from the exact pinned license headers; neutral derivative names
# are used even where a license grants additional web-subsetting permission.
RESERVED_NAMES = {
    "notosanssc": ["Source"],
    "padauk": ["Padauk", "Namkio", "Deemawso"],
    "tharlon": ["Yunghkio", "Arimo", "TharLon"],
    "lxgwwenkai": ["霞鹜", "霞鶩", "落霞孤鹜", "落霞孤鶩", "LXGW"],
}

def provenance(name, filename):
    if name == "lxgwwenkai":
        return ("lxgw/LxgwWenKai", "f4cc16fa07f7d115135d203065e711d43c3076d3",
                "fonts/TTF/" + filename, "OFL.txt")
    return ("google/fonts", pack.REVISION, "ofl/" + name + "/" + filename,
            "ofl/" + name + "/OFL.txt")

def build_bundle(root, ui_path, output):
    root = root.resolve()
    output = isolated(output)
    require(not output.exists(), "output already exists")
    require(output.parent.is_dir(), "output parent must exist")
    require(ui_path.is_file() and ui_path.stat().st_size <= 8 * 1024 * 1024, "invalid static UI source")
    ui = ui_path.read_text(encoding="utf-8")
    candidates = {**pack.CANDIDATES, **pack.CHINESE}
    # Verify every source and notice before expensive packing.
    inputs = {}
    for name, (filename, font_hash, license_hash, family) in sorted(candidates.items()):
        is_chinese = name in pack.CHINESE
        font = source_bytes(root, name, filename, (40 if is_chinese else 4) * 1024 * 1024)
        license_data = source_bytes(root, name, "OFL.txt", 65536)
        require(pack.git_blob(font) == font_hash, "source hash mismatch: " + name)
        require(pack.git_blob(license_data) == license_hash, "license hash mismatch: " + name)
        inputs[name] = font, license_data
    records, css = [], []
    with tempfile.TemporaryDirectory(prefix=".mmh-font-qa-", dir=output.parent) as temporary:
        stage = Path(temporary) / "bundle"
        stage.mkdir()
        for name, (font, license_data) in inputs.items():
            dest = stage / name
            is_chinese = name in pack.CHINESE
            result = (pack.build_chinese(name, font, license_data, ui, dest)
                      if is_chinese else pack.build(name, font, license_data, dest))
            require((dest / "OFL.txt").read_bytes() == license_data, "license not preserved")
            if is_chinese:
                files = [{"file": g["file"], "sha256": g["sha256"], "bytes": g["bytes"]}
                         for g in result["groups"]]
            else:
                files = [{"file": "font.woff2", "sha256": result["output_sha256"],
                          "bytes": result["output_bytes"]}]
            for item in files:
                data = (dest / item["file"]).read_bytes()
                require(len(data) == item["bytes"] and digest(data) == item["sha256"],
                        "generated font mismatch")
            stylesheet = (dest / "font.css").read_text(encoding="utf-8")
            names = re.findall(r'src:url\("\./([^"]+)"\)', stylesheet)
            require(names == [item["file"] for item in files], "unexpected generated CSS URLs")
            css.append(stylesheet.replace('src:url("./', 'src:url("./' + name + '/'))
            filename, font_hash, license_hash, family = candidates[name]
            repository, revision, source_path, license_path = provenance(name, filename)
            reserved = RESERVED_NAMES.get(name, [])
            require(result["family"] == family and all(
                word.casefold() not in family.casefold() for word in reserved),
                "reserved derivative family name: " + name)
            require(result["source_git_blob"] == font_hash and result["license_git_blob"] == license_hash,
                    "manifest input provenance mismatch: " + name)
            records.append({"candidate": name, "family": result["family"],
                            "source_repository": repository, "source_revision": revision,
                            "source_path": source_path, "source_license_path": license_path,
                            "source_git_blob": result["source_git_blob"],
                            "license_git_blob": result["license_git_blob"],
                            "license_id": "OFL-1.1", "reserved_source_names": reserved,
                            "derivative": "neutral family rename; WOFF2 conversion" +
                                          (" and Unicode partitioning" if is_chinese else ""),
                            "license": name + "/OFL.txt",
                            "manifest": name + "/manifest.json",
                            "manifest_sha256": digest((dest / "manifest.json").read_bytes()),
                            "files": files})
        require(len({r["family"] for r in records}) == 8, "duplicate font family")
        stylesheet = "\n".join(css).encode("utf-8")
        (stage / "fonts.css").write_bytes(stylesheet)
        notice = ["MMHVAULT Personal font candidate notices",
                  "Isolated QA only; not approved for distribution.",
                  "Each candidate retains its exact upstream OFL.txt.\n"]
        for record in records:
            notice.extend([record["family"],
                           "Source: https://github.com/" + record["source_repository"] +
                           "/tree/" + record["source_revision"],
                           "Original file: " + record["source_path"],
                           "Original license: " + record["source_license_path"],
                           "Local notice: " + record["license"],
                           "Modification: " + record["derivative"],
                           "Reserved source names: " + (", ".join(record["reserved_source_names"]) or "none declared in pinned header"),
                           ""])
        notice_data = ("\n".join(notice) + "\n").encode("utf-8")
        (stage / "FONT-NOTICES.txt").write_bytes(notice_data)
        manifest = {"status": "isolated QA only; not approved for distribution",
                    "notices": "FONT-NOTICES.txt", "notices_sha256": digest(notice_data),
                    "static_ui_sha256": digest(ui.encode("utf-8")),
                    "stylesheet": "fonts.css", "stylesheet_sha256": digest(stylesheet),
                    "candidates": records}
        (stage / "bundle.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        require(not output.exists(), "output appeared during build")
        stage.rename(output)
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--ui-source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    manifest = build_bundle(args.source_root, args.ui_source, args.output)
    print(json.dumps(manifest, sort_keys=True))

if __name__ == "__main__":
    main()
