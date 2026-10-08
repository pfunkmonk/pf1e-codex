#!/usr/bin/env python
"""Compress incoming art to the Codex image policy BEFORE it is added to art/ (see SIZE-PLAN.md).

  python tools/art-compress.py <input-folder> [--out art] [--max-edge 1280] [--quality 72] [--cap-kb 150] [--hard-kb 220] [--dry]
  python tools/art-compress.py --audit            # report the size distribution of what is already in art/

Policy (new images): WebP, long edge <= 1280 px, quality 72 (method 6, metadata stripped). Target <= 60 KB average; a file over --cap-kb is retried at
lower quality (down to 58); a file still over --hard-kb is REFUSED (reported, not written). Output name = input name with a .webp extension, lower-cased,
spaces -> hyphens. A file that already exists in the output folder is NEVER overwritten (shipped art is not re-encoded).

Needs Pillow:  pip install pillow      (AVIF output, if wanted later, is also supported by Pillow; browsers need a WebP fallback, so we ship WebP).
Art lives OUTSIDE git now (art/ is ignored; it is deployed to the pf1e-codex-art Netlify site by tools/deploy-art.mjs). After adding art, run:
  node tools/gen-art-manifest.mjs   (existing step)   then   node tools/deploy-art.mjs
"""
import argparse, io, os, re, statistics, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("src", nargs="?")
ap.add_argument("--out", default="art")
ap.add_argument("--max-edge", type=int, default=1280)
ap.add_argument("--quality", type=int, default=72)
ap.add_argument("--cap-kb", type=int, default=150)
ap.add_argument("--hard-kb", type=int, default=220)
ap.add_argument("--dry", action="store_true")
ap.add_argument("--audit", action="store_true")
a = ap.parse_args()

def kb(n): return round(n / 1024, 1)

if a.audit:
    files = [f for f in os.listdir(a.out) if f.lower().endswith(".webp")]
    sizes = sorted(os.path.getsize(os.path.join(a.out, f)) for f in files)
    print(f"{len(files)} files, {kb(sum(sizes) / 1024) } MB total (KB shown below)")
    print("avg", kb(statistics.mean(sizes)), "median", kb(statistics.median(sizes)), "p95", kb(sizes[int(len(sizes) * .95)]), "max", kb(sizes[-1]))
    print("over cap:", sum(1 for s in sizes if s > a.cap_kb * 1024), "| over hard cap:", sum(1 for s in sizes if s > a.hard_kb * 1024))
    sys.exit(0)

if not a.src: ap.error("give an input folder (or --audit)")
os.makedirs(a.out, exist_ok=True)
EXT = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff")
done = skipped = refused = 0; total_in = total_out = 0; outs = []
for root, _, names in os.walk(a.src):
    for n in sorted(names):
        if not n.lower().endswith(EXT): continue
        key = re.sub(r"[^a-z0-9._-]+", "-", os.path.splitext(n)[0].lower()).strip("-") + ".webp"
        dst = os.path.join(a.out, key); srcp = os.path.join(root, n)
        if os.path.exists(dst): skipped += 1; print(f"skip (already shipped): {key}"); continue
        im = Image.open(srcp); im.load()
        if im.mode not in ("RGB", "RGBA"): im = im.convert("RGB")
        w, h = im.size; s = a.max_edge / max(w, h)
        if s < 1: im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        best = None
        for q in range(a.quality, 57, -4):
            b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6)
            best = b.getvalue()
            if len(best) <= a.cap_kb * 1024: break
        if len(best) > a.hard_kb * 1024:
            refused += 1; print(f"REFUSED {n}: {kb(len(best))} KB even at q58 (hard cap {a.hard_kb})"); continue
        total_in += os.path.getsize(srcp); total_out += len(best); outs.append(len(best)); done += 1
        print(f"{'would write' if a.dry else 'wrote'} {key}: {kb(os.path.getsize(srcp))} KB -> {kb(len(best))} KB  ({im.size[0]}x{im.size[1]})")
        if not a.dry:
            with open(dst, "wb") as f: f.write(best)
print(f"\n{done} converted, {skipped} skipped, {refused} refused | {kb(total_in / 1024)} MB -> {kb(total_out / 1024)} MB" + (f" | avg {kb(statistics.mean(outs))} KB" if outs else ""))
