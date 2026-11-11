#!/usr/bin/env python3
"""
OPTIMIZE IMAGES  —  run this after you add or replace any image
================================================================
    python3 tools/optimize-images.py            make the small copies
    python3 tools/optimize-images.py --check    only report what is out of date

Phones were downloading your full-size photos (a news banner is about 800 KB)
to show them in a space a fraction of that size. This script makes small WebP
copies in assets/_small/ and writes assets/_small/manifest.js, the list the
site reads to know which small copies exist.

  * Your original files are never changed.
  * An image with no small copy still works: the site shows the original.
  * Only new or changed images are processed, so it is quick to re-run.

Needs Python 3 and Pillow:   pip install pillow
See docs/09-SPEED.md.
"""

import base64
import hashlib
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is missing. Install it with:  pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ASSETS / "_small"
MANIFEST = OUT / "manifest.js"

# Widths (in pixels) made for each kind of image. A width larger than the
# original becomes one copy at the original's own width.
PLANS = {
    "players": [128, 640],         # 128: avatar circles · 640: the large card photo
    "news":    [640, 1280, 1920],  # phones · tablets and laptops · sharp desktop screens
    "":        [96],               # files directly in assets/ (the logo)
}
OTHER_FOLDERS = [640, 1280]        # any other folder you add under assets/
QUALITY = 74
SOURCE_TYPES = {".jpg", ".jpeg", ".png", ".webp"}
FAVICON_FROM = ("logo.png", "logo.jpg", "logo.jpeg")   # first one found in assets/
HEAVY_KB = 300                     # warn about anything this large that cannot be shrunk


def plan_for(path: Path):
    rel = path.relative_to(ASSETS)
    top = rel.parts[0] if len(rel.parts) > 1 else ""
    return PLANS.get(top, OTHER_FOLDERS)


def digest(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:12]


def small_name(rel: Path, width: int) -> Path:
    return OUT / rel.parent / f"{rel.stem}-{width}.webp"


def placeholder(img: Image.Image) -> str:
    """A 16-pixel-wide preview, small enough to live inside the manifest."""
    tiny = img.copy()
    tiny.thumbnail((16, 16))
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def load_manifest() -> dict:
    if not MANIFEST.exists():
        return {}
    text = MANIFEST.read_text(encoding="utf-8")
    start, end = text.find("{"), text.rfind("}")
    try:
        return json.loads(text[start:end + 1])
    except ValueError:
        return {}


def main() -> int:
    check_only = "--check" in sys.argv
    old = load_manifest()
    new, made, stale = {}, 0, []

    sources = sorted(
        p for p in ASSETS.rglob("*")
        if p.is_file() and p.suffix.lower() in SOURCE_TYPES and OUT not in p.parents
    )

    for src in sources:
        widths = plan_for(src)
        if widths is None:
            continue
        rel = src.relative_to(ASSETS)
        key = f"assets/{rel.as_posix()}"
        sha = digest(src)
        prev = old.get(key)

        fresh = (
            prev is not None
            and prev.get("sha") == sha
            and all(small_name(rel, w).exists() for w in prev.get("sizes", []))
        )
        if fresh:
            new[key] = prev
            continue

        stale.append(key)
        if check_only:
            continue

        with Image.open(src) as opened:
            img = ImageOps.exif_transpose(opened).convert("RGB")
        sizes = []
        for width in sorted({min(width, img.width) for width in widths}):
            copy = img.copy()
            copy.thumbnail((width, width * 4), Image.LANCZOS)
            target = small_name(rel, width)
            target.parent.mkdir(parents=True, exist_ok=True)
            copy.save(target, "WEBP", quality=QUALITY, method=6)
            sizes.append(width)
            made += 1
        new[key] = {"w": img.width, "h": img.height, "sizes": sizes, "ph": placeholder(img), "sha": sha}

    if check_only:
        removed = sorted(set(old) - set(new) - set(stale))
        if stale or removed:
            for key in stale:
                print(f"out of date: {key}")
            for key in removed:
                print(f"no longer exists: {key}")
            print("\nRun:  python3 tools/optimize-images.py")
            return 1
        print(f"All {len(new)} images have up-to-date small copies.")
        return 0

    # The browser-tab icon, from the logo.
    for name in FAVICON_FROM:
        if (ASSETS / name).exists():
            with Image.open(ASSETS / name) as opened:
                icon = ImageOps.exif_transpose(opened).convert("RGBA")
            icon.thumbnail((64, 64), Image.LANCZOS)
            OUT.mkdir(parents=True, exist_ok=True)
            icon.save(OUT / "favicon.png", optimize=True)
            break

    # Remove small copies whose original is gone or no longer needs them.
    keep = {small_name(Path(k).relative_to("assets"), w) for k, v in new.items() for w in v["sizes"]}
    for leftover in OUT.rglob("*.webp"):
        if leftover not in keep:
            leftover.unlink()

    OUT.mkdir(parents=True, exist_ok=True)
    body = json.dumps(new, indent=2, sort_keys=True)
    MANIFEST.write_text(
        "/* GENERATED by tools/optimize-images.py. Do not edit by hand.\n"
        "   Lists the small copies that exist for each image, so the site can\n"
        "   use them. See docs/09-SPEED.md. */\n"
        f"export default {body};\n",
        encoding="utf-8",
    )

    before = sum(p.stat().st_size for p in sources if plan_for(p) is not None)
    after = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"{len(new)} images listed, {made} small copies made.")
    print(f"Originals: {before / 1024:.0f} KB   Small copies: {after / 1024:.0f} KB")

    # Files this script cannot shrink (SVG, GIF) are sent to visitors as they are.
    for p in sorted(ASSETS.rglob("*")):
        if (p.is_file() and OUT not in p.parents and p.suffix.lower() not in SOURCE_TYPES
                and p.suffix.lower() in {".svg", ".gif", ".bmp"} and p.stat().st_size > HEAVY_KB * 1024):
            print(f"WARNING: {p.relative_to(ROOT)} is {p.stat().st_size / 1024:.0f} KB and cannot be shrunk. "
                  "If the site uses it, visitors download all of it. Prefer a JPG or PNG.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
