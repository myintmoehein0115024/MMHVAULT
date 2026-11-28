#!/usr/bin/env python3
"""Build a local, isolated Myanmar font candidate pack from pinned OFL inputs.
No network, GitHub writes, deployment, or application changes. Requires fonttools
and brotli. Output is for QA; do not publish until license and visual review.
"""
import argparse
import hashlib
import io
import json
import re
from pathlib import Path

from fontTools.ttLib import TTFont

REVISION = "5026800714d07231937d92eb4cceabf06e05d74e"
CANDIDATES = {
    "notosansmyanmar": ("NotoSansMyanmar[wdth,wght].ttf", "a7af8e405d24076f2930c0840523110b3236560b", "c94c47416f38b8ddec9f3fbc9e0241998d7823dc", "MMH Personal Myanmar A"),
    "notoserifmyanmar": ("NotoSerifMyanmar-Regular.ttf", "86adf96a587b326f5961b9550d54029608bdc760", "94d1bf7b52481343e2983fb7751e8b7abe1ea07b", "MMH Personal Myanmar B"),
    "padauk": ("Padauk-Regular.ttf", "a6882fbb2177bec0271a0b10821a33100efe1fc7", "57410e8e9eb58b0cce938440696cf36e2daf8fcf", "MMH Personal Myanmar C"),
    "tharlon": ("Tharlon-Regular.ttf", "d3840f3ccd173b3da87e0ed476d33027ad880490", "6ef7b18ea7f5b430f10160034ecdcd0295335954", "MMH Personal Myanmar D"),
}
SAMPLE = "လက်ကျန်ငွေနှင့်စုဆောင်းငွေမြန်မာဘာသာ၀၁၂၃၄၅၆၇၈၉"

def git_blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def require(condition, message):
    if not condition:
        raise ValueError(message)

def axes(font):
    return [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in font["fvar"].axes] if "fvar" in font else []

def token(text):
    return re.sub(r"[^A-Za-z0-9-]", "", text) or "Regular"

def rename_identity(font, family):
    # New names for modified font derivatives; preserve copyright/license notices.
    names = font["name"]
    ps = token(family)
    subfamily = names.getDebugName(17) or names.getDebugName(2) or "Regular"
    identities = {
        1: family, 3: ps + "-" + token(subfamily) + "-v265",
        4: family + " " + subfamily, 6: ps + "-" + token(subfamily),
        16: family, 18: family + " " + subfamily, 20: ps,
        21: family, 25: ps,
    }
    if "fvar" in font:
        for index, instance in enumerate(font["fvar"].instances):
            name_id = getattr(instance, "postscriptNameID", 0xFFFF)
            if name_id != 0xFFFF:
                # Use a unique ASCII PostScript identifier, not the upstream family.
                identities[name_id] = ps + "-Instance" + str(index)
    for record in names.names:
        if record.nameID in identities:
            record.string = identities[record.nameID].encode(record.getEncoding())
    # Required identity entries must resolve to the derivative name.
    require(names.getDebugName(1) == family, "family rename failed")
    require((names.getDebugName(6) or "").startswith(ps), "PostScript rename failed")

def build(candidate, source, license_data, output):
    filename, source_hash, license_hash, family = CANDIDATES[candidate]
    require(0 < len(source) <= 4 * 1024 * 1024, "unexpected source size")
    require(0 < len(license_data) <= 65536, "unexpected license size")
    require(git_blob(source) == source_hash, "source Git blob hash mismatch")
    require(git_blob(license_data) == license_hash, "license Git blob hash mismatch")
    require(re.search(rb"SIL OPEN FONT LICENSE Version 1\.1", license_data, re.I), "missing OFL 1.1 notice")
    font = TTFont(io.BytesIO(source), recalcTimestamp=False)
    original_cmap = dict(font.getBestCmap())
    require(set(map(ord, SAMPLE)) <= set(original_cmap), "Myanmar sample coverage missing")
    require(all(cp in original_cmap for cp in range(0x1000, 0x10A0)), "Myanmar basic block incomplete")
    original_axes = axes(font)
    require("GSUB" in font and "GPOS" in font, "shaping tables missing")
    preserved = {i: font["name"].getDebugName(i) for i in (0, 7, 13, 14)}
    rename_identity(font, family)
    font.flavor = "woff2"
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    require(data[:4] == b"wOF2" and 0 < len(data) < len(source), "invalid compressed output")
    check = TTFont(io.BytesIO(data), recalcTimestamp=False)
    require(set(check.getBestCmap()) == set(original_cmap), "full cmap changed")
    require(axes(check) == original_axes, "variable axes changed")
    require("GSUB" in check and "GPOS" in check, "shaping tables lost")
    require(check["name"].getDebugName(1) == family, "output family mismatch")
    require({i: check["name"].getDebugName(i) for i in preserved} == preserved, "legal notices changed")
    weights = next((f"{a[1]:g} {a[3]:g}" for a in original_axes if a[0] == "wght"), "400")
    manifest = {
        "candidate": candidate, "family": family, "source_revision": REVISION,
        "source_file": filename, "source_git_blob": source_hash,
        "license_git_blob": license_hash, "license": "OFL-1.1",
        "output_sha256": hashlib.sha256(data).hexdigest(),
        "source_bytes": len(source), "output_bytes": len(data),
        "codepoints": len(original_cmap), "weight": weights, "axes": original_axes,
        "status": "candidate-only; visual and redistribution review required",
    }
    # Explicitly fresh directory; never overwrite existing assets.
    output.mkdir(parents=True, exist_ok=False)
    (output / "font.woff2").write_bytes(data)
    (output / "OFL.txt").write_bytes(license_data)
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    (output / "font.css").write_text(
        '@font-face{font-family:"' + family + '";src:url("./font.woff2") format("woff2");font-weight:' + weights + ';font-style:normal;font-display:swap}\n',
        encoding="utf-8",
    )
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", choices=sorted(CANDIDATES))
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--license", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.candidate, args.source.read_bytes(), args.license.read_bytes(), args.output), ensure_ascii=False))

if __name__ == "__main__":
    main()
