#!/usr/bin/env python3
"""
Copy all gallery images from the Squarespace CDN mirror into
public/images/galleries/{slug}/, naming them photo-01.jpg … photo-NN.jpg.

Reads each gallery's mirrored HTML page, extracts CDN image URLs in DOM order
(preserving Squarespace's original gallery ordering), finds the best available
local copy (full-quality preferred over __9ee94cce thumbnail), and copies.
"""

import os
import re
import shutil
from pathlib import Path

REPO = Path(__file__).parent.parent
MIRROR_BASE = REPO / "squarespace-backup" / "mirror"
CDN_BASE = MIRROR_BASE / "images.squarespace-cdn.com"
GALLERY_BASE = REPO / "public" / "images" / "galleries"
CONTENT_ID = "61b8ab96a7ffb614880edfac"

# Mirror gallery dir name → public gallery slug
GALLERY_MAP = {
    "spring-2023":        "spring-2023",
    "fall2022":           "fall2022",
    "summer-2022":        "summer-2022",
    "spring-2022":        "spring-2022",
    "winter-202122":      "winter-202122",
    "fall-2021":          "fall-2021",
    "uk-summer-2021":     "summer-2021",
    "spring-2021":        "spring-2021",
    "malta-winter-202021":"winter-202021",
    "fall-2020":          "fall-2020",
    "malta-summer-2020":  "summer-2020",
    "spring-2020":        "spring-2020",
    "2017-2018-2019":     "junior-years",
}

CDN_PATTERN = re.compile(
    r'content/v1/' + CONTENT_ID + r'/([a-f0-9-]+)/([^"?&\s]+\.(?:jpg|jpeg|png|JPG|JPEG|PNG))',
    re.IGNORECASE,
)


def find_cdn_file(uuid: str, filename: str) -> Path | None:
    base_dir = CDN_BASE / "content" / "v1" / CONTENT_ID / uuid

    # 1. exact match (original quality)
    p = base_dir / filename
    if p.exists():
        return p

    # 2. __9ee94cce variant (CDN-processed, still high quality)
    stem, ext = os.path.splitext(filename)
    p2 = base_dir / f"{stem}__9ee94cce{ext}"
    if p2.exists():
        return p2

    return None


def extract_images_ordered(html_path: Path):
    """Return ordered list of (uuid, original_filename) deduped by first occurrence."""
    text = html_path.read_text(encoding="utf-8", errors="replace")
    seen: set[tuple[str, str]] = set()
    result: list[tuple[str, str]] = []

    for m in CDN_PATTERN.finditer(text):
        uuid = m.group(1)
        raw_name = m.group(2)

        # Normalise: strip __9ee94cce so we deduplicate thumbnail vs original refs
        stem, ext = os.path.splitext(raw_name)
        clean_name = stem.replace("__9ee94cce", "") + ext

        key = (uuid, clean_name)
        if key not in seen:
            seen.add(key)
            result.append(key)

    return result


def normalize_ext(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".jpeg":
        return ".jpg"
    return ext


def main():
    total_copied = 0
    total_missing = 0
    gallery_counts: dict[str, int] = {}

    for mirror_dir, slug in GALLERY_MAP.items():
        html_path = MIRROR_BASE / "www.jamesjuhasz.com" / "gallery" / mirror_dir / "index.html"
        dest_dir = GALLERY_BASE / slug

        if not html_path.exists():
            print(f"\n[SKIP] {slug}: no HTML at {html_path}")
            continue

        images = extract_images_ordered(html_path)
        print(f"\n[{slug}] {len(images)} images found in HTML")

        dest_dir.mkdir(parents=True, exist_ok=True)
        copied = 0
        missing = 0

        for i, (uuid, filename) in enumerate(images, 1):
            src = find_cdn_file(uuid, filename)
            ext = normalize_ext(filename)
            dest_name = f"photo-{i:02d}{ext}"
            dest = dest_dir / dest_name

            if src is None:
                print(f"  MISSING  {i:02d}: {uuid}/{filename}")
                missing += 1
                continue

            shutil.copy2(src, dest)
            action = "copied " if not dest.exists() else "overwrote"
            print(f"  {action} {dest_name} ← {src.name}")
            copied += 1

        print(f"  → {copied} copied, {missing} missing")
        total_copied += copied
        total_missing += missing
        gallery_counts[slug] = copied

    print(f"\n{'='*50}")
    print(f"DONE: {total_copied} total images copied, {total_missing} missing")
    print("\nPhoto counts per gallery (for galleries.ts):")
    for slug, count in gallery_counts.items():
        print(f"  {slug}: {count}")


if __name__ == "__main__":
    main()
