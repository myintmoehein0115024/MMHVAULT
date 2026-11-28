#!/usr/bin/env python3
"""Build a local, isolated Myanmar or Chinese font candidate pack from pinned OFL inputs.
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
from fontTools import subset

REVISION = "5026800714d07231937d92eb4cceabf06e05d74e"
CANDIDATES = {
    "notosansmyanmar": ("NotoSansMyanmar[wdth,wght].ttf", "a7af8e405d24076f2930c0840523110b3236560b", "c94c47416f38b8ddec9f3fbc9e0241998d7823dc", "MMH Personal Myanmar A"),
    "notoserifmyanmar": ("NotoSerifMyanmar-Regular.ttf", "86adf96a587b326f5961b9550d54029608bdc760", "94d1bf7b52481343e2983fb7751e8b7abe1ea07b", "MMH Personal Myanmar B"),
    "padauk": ("Padauk-Regular.ttf", "a6882fbb2177bec0271a0b10821a33100efe1fc7", "57410e8e9eb58b0cce938440696cf36e2daf8fcf", "MMH Personal Myanmar C"),
    "tharlon": ("Tharlon-Regular.ttf", "d3840f3ccd173b3da87e0ed476d33027ad880490", "6ef7b18ea7f5b430f10160034ecdcd0295335954", "MMH Personal Myanmar D"),
}
SAMPLE = "လက်ကျန်ငွေနှင့်စုဆောင်းငွေမြန်မာဘာသာ၀၁၂၃၄၅၆၇၈၉"
CHINESE_SAMPLE = "账户余额与储蓄交易投资设置财务目标汇率预算收入支出"
CHINESE = {
    "notosanssc": ("NotoSansSC[wght].ttf", "fb0637bafbcd804fe32152370a1225990745b4bc", "1c9f43281b8f216c5461fe9ac729afbade7724e4", "MMH Personal Chinese A"),
    "notoserifsc": ("NotoSerifSC[wght].ttf", "eab063faf229160a52d3760f5555150e4eb9e5bf", "94d1bf7b52481343e2983fb7751e8b7abe1ea07b", "MMH Personal Chinese B"),
    "zcoolqingkehuangyou": ("ZCOOLQingKeHuangYou-Regular.ttf", "982a3b80143268592f573feb196791fbc2330e17", "bd3df5cf6f237a4afaea70106f8243da07cd8cd8", "MMH Personal Chinese C"),
}


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

def han(cp):
    return (0x3400 <= cp <= 0x4DBF or 0x4E00 <= cp <= 0x9FFF or
            0xF900 <= cp <= 0xFAFF or 0x20000 <= cp <= 0x323AF)

def partition_chars(chars, ui):
    # Keep non-Han and combining marks together; only rare Han are split.
    core = {cp for cp in chars if not han(cp)} | (chars & set(map(ord, ui + CHINESE_SAMPLE)))
    rest = sorted(chars - core)
    return [sorted(core)] + [rest[i:i + 1024] for i in range(0, len(rest), 1024)]

def unicode_ranges(codes):
    ranges = []
    start = end = codes[0]
    for cp in codes[1:]:
        if cp == end + 1:
            end = cp
            continue
        ranges.append(f"U+{start:X}" + (f"-{end:X}" if end != start else ""))
        start = end = cp
    ranges.append(f"U+{start:X}" + (f"-{end:X}" if end != start else ""))
    return ",".join(ranges)

def variation_sequences(font):
    # Format 14 pairs are separate from the base Unicode cmap. Record whether
    # the source uses the default glyph or an explicit alternate glyph.
    return {(base, selector, glyph is not None)
            for table in font["cmap"].tables if table.format == 14
            for selector, pairs in table.uvsDict.items()
            for base, glyph in pairs}

def build_chinese(candidate, source, license_data, ui, output):
    filename, source_hash, license_hash, family = CHINESE[candidate]
    require(not output.exists(), "output already exists")
    require(0 < len(source) <= 40 * 1024 * 1024, "unexpected source size")
    require(0 < len(license_data) <= 65536, "unexpected license size")
    require(git_blob(source) == source_hash, "source Git blob hash mismatch")
    require(git_blob(license_data) == license_hash, "license Git blob hash mismatch")
    require(re.search(rb"SIL OPEN FONT LICENSE Version 1\.1", license_data, re.I), "missing OFL 1.1 notice")
    original = TTFont(io.BytesIO(source), recalcTimestamp=False)
    chars = set(original.getBestCmap())
    require(set(map(ord, CHINESE_SAMPLE)) <= chars, "Chinese sample coverage missing")
    missing_ui_han = sorted({ord(ch) for ch in ui if han(ord(ch))} - chars)
    source_variations = variation_sequences(original)
    preserved_variations = set()
    original_axes = axes(original)
    preserved = {i: original["name"].getDebugName(i) for i in (0, 7, 13, 14)}
    weights = next((f"{a[1]:g} {a[3]:g}" for a in original_axes if a[0] == "wght"), "400")
    groups = partition_chars(chars, ui)
    seen = set()
    entries, payloads, css = [], [], []
    for i, group in enumerate(groups):
        require(group and not seen.intersection(group), "invalid shard partition")
        font = TTFont(io.BytesIO(source), recalcTimestamp=False)
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_languages = ["*"]
        opts.name_legacy = True
        sub = subset.Subsetter(options=opts)
        # FontTools only retains cmap format 14 when the selector itself is
        # requested. Keep each base and its selectors in the same shard.
        advertised = set(group)
        selectors = {selector for base, selector, _ in source_variations if base in advertised}
        sub.populate(unicodes=advertised | selectors)
        sub.subset(font)
        # Distinct internal derivative identities for each subset, common CSS family.
        shard_family = family + " " + str(i)
        rename_identity(font, shard_family)
        font.flavor = "woff2"
        buffer = io.BytesIO()
        font.save(buffer)
        data = buffer.getvalue()
        require(data[:4] == b"wOF2" and 0 < len(data) < len(source), "invalid compressed shard")
        check = TTFont(io.BytesIO(data), recalcTimestamp=False)
        require(set(group) <= set(check.getBestCmap()), "shard cmap incomplete")
        expected_variations = {pair for pair in source_variations if pair[0] in advertised}
        actual_variations = {pair for pair in variation_sequences(check) if pair[0] in advertised}
        require(actual_variations == expected_variations, "shard variation sequences changed")
        preserved_variations.update(actual_variations)
        require(axes(check) == original_axes, "variable axes changed")
        require(check["name"].getDebugName(1) == shard_family, "output family mismatch")
        require({k: check["name"].getDebugName(k) for k in preserved} == preserved, "legal notices changed")
        name = f"part-{i}.woff2"
        ranges = unicode_ranges(group)
        entries.append({"id": i, "file": name, "codes": group, "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest(), "family": shard_family})
        payloads.append((name, data))
        css.append('@font-face{font-family:"' + family + '";src:url("./' + name +
                   '") format("woff2");font-weight:' + weights +
                   ';font-style:normal;font-display:swap;unicode-range:' + ranges + '}')
        seen.update(group)
    require(seen == chars, "source cmap coverage incomplete")
    require(preserved_variations == source_variations, "source variation sequences incomplete")
    manifest = {
        "candidate": candidate, "family": family, "source_revision": REVISION,
        "source_file": filename, "source_git_blob": source_hash, "license_git_blob": license_hash,
        "license": "OFL-1.1", "source_bytes": len(source), "sourceCount": len(chars),
        "weight": weights, "axes": original_axes, "groups": entries,
        "missing_ui_han_count": len(missing_ui_han),
        "missing_ui_han": missing_ui_han,
        "source_uvs_count": len(source_variations),
        "preserved_uvs_count": len(preserved_variations),
        "missing_uvs_count": len(source_variations - preserved_variations),
        "status": "candidate-only; variation sequence browser selection, shaping, visual and redistribution review required",
    }
    output.mkdir(parents=True, exist_ok=False)
    for name, data in payloads:
        (output / name).write_bytes(data)
    (output / "OFL.txt").write_bytes(license_data)
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    (output / "font.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", choices=sorted(set(CANDIDATES) | set(CHINESE)))
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--license", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--ui-source", type=Path, help="Static application source only; never account data")
    args = parser.parse_args()
    if args.candidate in CHINESE:
        require(args.ui_source is not None, "Chinese packing requires static UI source")
        require(args.ui_source.stat().st_size <= 8 * 1024 * 1024, "UI source too large")
        result = build_chinese(args.candidate, args.source.read_bytes(), args.license.read_bytes(),
                               args.ui_source.read_text(encoding="utf-8"), args.output)
    else:
        require(args.ui_source is None, "UI source is only used for Chinese packing")
        result = build(args.candidate, args.source.read_bytes(), args.license.read_bytes(), args.output)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
