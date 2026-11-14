#!/usr/bin/env python3
"""Builds the brand files the site uses from the two AI-drawn originals in docs/brand/ (both drawn on solid black).

    python3 scripts/build-brand.py

Black is keyed out by brightness (alpha follows the brightest channel), so glow and mist fade softly into the dark page.
Outputs: public/brand/lockup.webp, public/brand/emblem.webp, app/icon.png, app/apple-icon.png, app/favicon.ico
Needs: Pillow, numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs' / 'brand'
PUB = ROOT / 'public' / 'brand'
APP = ROOT / 'app'


def key_black(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0
    h, w, _ = a.shape
    m = a.max(axis=2)
    b = max(8, min(h, w) // 40)
    border = np.concatenate([m[:b].ravel(), m[-b:].ravel(), m[:, :b].ravel(), m[:, -b:].ravel()])
    bp = float(np.percentile(border, 99.5))
    alpha = np.clip((m - bp) / (1.0 - bp), 0, 1)
    sat = np.clip(a / np.maximum(m, 1e-4)[..., None], 0, 1)  # un-premultiplied colour for the translucent glow
    solid = np.clip(alpha * 4.0, 0, 1)[..., None]
    return a * solid + sat * (1 - solid), alpha


def smooth(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


def crop_feather(rgb, alpha, box, fx, fy):
    x0, y0, x1, y1 = box
    cw, ch = x1 - x0, y1 - y0
    ex = smooth(np.minimum(np.arange(cw), np.arange(cw)[::-1]) / max(fx, 1))
    ey = smooth(np.minimum(np.arange(ch), np.arange(ch)[::-1]) / max(fy, 1))
    al = alpha[y0:y1, x0:x1] * ey[:, None] * ex[None, :]
    out = np.dstack([rgb[y0:y1, x0:x1], al])
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA')


def solid_box(alpha, thr=0.30):
    ys, xs = np.where(alpha > thr)
    return xs.min(), ys.min(), xs.max(), ys.max()


def build_lockup():
    rgb, alpha = key_black(Image.open(SRC / 'logo_source.png'))
    h, w = alpha.shape
    x0, y0, x1, y1 = solid_box(alpha)
    px, py = int((x1 - x0) * 0.05), int((y1 - y0) * 0.10)
    box = (max(0, x0 - px), max(0, y0 - py), min(w, x1 + px), min(h, y1 + py))
    im = crop_feather(rgb, alpha, box, px * 0.9, py * 0.9)
    W = 880
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    im.save(PUB / 'lockup.webp', 'WEBP', quality=92, method=6)
    return im


def build_emblem():
    rgb, alpha = key_black(Image.open(SRC / 'emblem_source.png'))
    h, w = alpha.shape
    x0, y0, x1, y1 = solid_box(alpha)
    side = int(max(x1 - x0, y1 - y0) * 1.08)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    bx0 = min(max(0, cx - side // 2), w - side)
    by0 = min(max(0, cy - side // 2), h - side)
    im = crop_feather(rgb, alpha, (bx0, by0, bx0 + side, by0 + side), side * 0.03, side * 0.03)
    big = im.resize((512, 512), Image.LANCZOS)
    im.resize((256, 256), Image.LANCZOS).save(PUB / 'emblem.webp', 'WEBP', quality=92, method=6)
    return big


def tile(emblem, size, rounded):
    """Emblem on a dark glowing tile (tab icons must stay readable on light and dark browser themes)."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
    d = np.sqrt((xx - 0.5) ** 2 + (yy - 0.45) ** 2) / 0.72
    t = np.clip(1 - d, 0, 1)[..., None]
    c0, c1 = np.array([8, 14, 19], np.float32), np.array([30, 56, 60], np.float32)
    bg = Image.fromarray((c1 * t + c0 * (1 - t)).astype(np.uint8), 'RGB').convert('RGBA')
    em = emblem.resize((round(size * 0.9), round(size * 0.9)), Image.LANCZOS)
    bg.alpha_composite(em, ((size - em.width) // 2, (size - em.height) // 2))
    if rounded:
        ss = 4
        mask = Image.new('L', (size * ss, size * ss), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=int(size * ss * 0.22), fill=255)
        bg.putalpha(mask.resize((size, size), Image.LANCZOS))
    return bg


def main():
    PUB.mkdir(parents=True, exist_ok=True)
    lock = build_lockup()
    emb = build_emblem()
    tile(emb, 192, True).save(APP / 'icon.png')
    tile(emb, 180, False).convert('RGB').save(APP / 'apple-icon.png')
    tile(emb, 256, True).save(APP / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('lockup', lock.size, 'emblem', emb.size)


if __name__ == '__main__':
    main()
