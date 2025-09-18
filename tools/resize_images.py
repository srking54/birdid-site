#!/usr/bin/env python3
import argparse, os, sys
from pathlib import Path
from PIL import Image, ImageOps

def is_image(p: Path) -> bool:
    return p.suffix.lower() in {".jpg", ".jpeg", ".png"}

def ensure_rgb(img: Image.Image, ext: str) -> Image.Image:
    # Convert palette/alpha to RGB for JPEG
    if ext in (".jpg", ".jpeg"):
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
    return img

def resize_to_box(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    # Honor EXIF orientation
    img = ImageOps.exif_transpose(img)
    w, h = img.size
    if w <= max_w and h <= max_h:
        return img
    # scale by the most-constraining dimension
    img.thumbnail((max_w, max_h), Image.LANCZOS)
    return img

def main():
    ap = argparse.ArgumentParser(description="Resize images for web.")
    ap.add_argument("--input", "-i", required=True, help="Input images folder")
    ap.add_argument("--output", "-o", required=True, help="Output folder (can be same as input for in-place)")
    ap.add_argument("--max-width", type=int, default=1280)
    ap.add_argument("--max-height", type=int, default=960)
    ap.add_argument("--quality", type=int, default=82, help="JPEG quality (ignored for PNG)")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite even if output exists")
    args = ap.parse_args()

    src_dir = Path(args.input).expanduser().resolve()
    dst_dir = Path(args.output).expanduser().resolve()
    dst_dir.mkdir(parents=True, exist_ok=True)

    if not src_dir.is_dir():
        print(f"ERROR: input folder not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    count_total = 0
    count_resized = 0
    count_copied = 0

    for p in sorted(src_dir.iterdir()):
        if not p.is_file() or not is_image(p):
            continue
        count_total += 1

        out_path = dst_dir / p.name
        if out_path.exists() and not args.overwrite:
            print(f"↷ Skip (exists): {out_path.name}")
            continue

        try:
            with Image.open(p) as img:
                orig_w, orig_h = img.size
                img2 = resize_to_box(img, args.max_width, args.max_height)
                img2 = ensure_rgb(img2, p.suffix.lower())

                # If unchanged size, we still re-save optimized to strip metadata
                if img2.size != (orig_w, orig_h):
                    count_resized += 1
                    action = "Resized"
                else:
                    count_copied += 1
                    action = "Optimized"

                if p.suffix.lower() in (".jpg", ".jpeg"):
                    img2.save(out_path, format="JPEG", quality=args.quality, optimize=True, progressive=True)
                elif p.suffix.lower() == ".png":
                    # pngopt: Pillow optimize=True, no alpha change
                    img2.save(out_path, format="PNG", optimize=True)
                else:
                    # default fallback
                    img2.save(out_path, optimize=True)

                print(f"✔ {action}: {p.name}  →  {out_path.name}  ({orig_w}x{orig_h} → {img2.size[0]}x{img2.size[1]})")
        except Exception as e:
            print(f"✖ Error processing {p.name}: {e}", file=sys.stderr)

    print(f"\nDone. Files processed: {count_total}, resized: {count_resized}, optimized: {count_copied}")
    print(f"Output folder: {dst_dir}")

if __name__ == "__main__":
    main()
