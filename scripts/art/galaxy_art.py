#!/usr/bin/env python3
"""
Draws the pictures of Vạn Giới Tinh Đồ (public/art/galaxy) with code: no network, no API key.

  python3 scripts/art/galaxy_art.py                 # everything, full size
  python3 scripts/art/galaxy_art.py map thienhuyen  # only these
  SCALE=0.3 python3 scripts/art/galaxy_art.py       # quick small preview, written to /tmp/galaxy-preview

Output, per picture: <name>_2k.webp (2560x1440, PC) and <name>_1k.webp (1080x1920, phone held upright).
  map           the star chart with every galaxy on it
  <galaxy id>   one close-up scene per galaxy (ids and palettes come from content/galaxies.json)
  nav icon      public/art/ui/nav/galaxy.png (round medallion, same size as the other header icons)
Replace any of these files with a picture drawn by an image model and the page uses it as it is (see docs/tinh-ha.md).
"""
import json, math, os, random, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = json.load(open(os.path.join(ROOT, 'content', 'galaxies.json'), encoding='utf-8'))
SCALE = float(os.environ.get('SCALE', '1'))
OUT = os.path.join(ROOT, 'public', 'art', 'galaxy') if SCALE == 1 else '/tmp/galaxy-preview'
SIZES = {'2k': (2560, 1440), '1k': (1080, 1920)}
f32 = np.float32


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], f32)


def C(r, g, b):
    return np.array([r, g, b], f32) / 255


# ---------------------------------------------------------------- noise, colour, light
def noise(h, w, seed, cells=6, octaves=6, gain=0.55, ys=1.0):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), f32); amp = 1.0; tot = 0.0; c = float(cells)
    for _ in range(octaves):
        gh, gw = max(2, int(round(c * h / w / ys))), max(2, int(round(c)))
        out += amp * cv2.resize(r.random((gh, gw)).astype(f32), (w, h), interpolation=cv2.INTER_CUBIC)
        tot += amp; amp *= gain; c *= 2.0
    return out / tot


def norm(a):
    lo, hi = float(a.min()), float(a.max())
    return (a - lo) / (hi - lo + 1e-9)


def wnoise(h, w, seed, cells=4, octaves=6, warp=0.25, gain=0.55, ys=1.0):
    base = noise(h, w, seed, cells, octaves, gain, ys)
    ax = (noise(h, w, seed + 1, 3, 3) - 0.5) * 2 * warp * w
    ay = (noise(h, w, seed + 2, 3, 3) - 0.5) * 2 * warp * w
    gx, gy = np.meshgrid(np.arange(w, dtype=f32), np.arange(h, dtype=f32))
    return cv2.remap(base, gx + ax.astype(f32), gy + ay.astype(f32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def ramp(t, stops):
    out = np.empty(t.shape + (3,), f32)
    ps = [s[0] for s in stops]
    for c in range(3):
        out[..., c] = np.interp(t, ps, [s[1][c] for s in stops])
    return out


def blur(a, sigma):
    if sigma <= 0.3:
        return a
    f = int(sigma // 5)
    if f >= 2:
        h, w = a.shape[:2]
        s = cv2.resize(a, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
        s = cv2.GaussianBlur(s, (0, 0), sigma / f)
        return cv2.resize(s, (w, h), interpolation=cv2.INTER_CUBIC)
    return cv2.GaussianBlur(a, (0, 0), sigma)


def shift(a, dx, dy):
    h, w = a.shape[:2]
    return cv2.warpAffine(a, np.float32([[1, 0, dx], [0, 1, dy]]), (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def glow(img, mask, col, k=1.0, sig=(2, 8, 28), wts=(0.8, 0.5, 0.35)):
    """additive light around a mask (float HxW)"""
    for s, wt in zip(sig, wts):
        img += blur(mask, s * U)[..., None] * col * (k * wt)


U = 1.0  # unit scale of the picture being drawn (set per picture)


# ---------------------------------------------------------------- stars and galaxies
def flare(img, x, y, b, col):
    r = int(10 + b * 22) * 1
    x0, x1, y0, y1 = int(x) - r, int(x) + r + 1, int(y) - r, int(y) + r + 1
    H, W = img.shape[:2]
    if x1 < 0 or y1 < 0 or x0 >= W or y0 >= H:
        return
    yy, xx = np.mgrid[max(0, y0):min(H, y1), max(0, x0):min(W, x1)].astype(f32)
    dx, dy = xx - x, yy - y
    d2 = dx * dx + dy * dy
    core = np.exp(-d2 / (2 * (0.9 + b * 0.9) ** 2)) * b * 1.2
    halo = np.exp(-d2 / (2 * (3.5 + b * 4) ** 2)) * b * 0.25
    spike = (np.exp(-np.abs(dy) / 0.55) * np.exp(-np.abs(dx) / (r * 0.55)) + np.exp(-np.abs(dx) / 0.55) * np.exp(-np.abs(dy) / (r * 0.55))) * b * 0.45
    img[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] += (core + halo + spike)[..., None] * col


def stars(img, seed, n, bright=1.0, flares=0, tint=None):
    H, W = img.shape[:2]
    r = np.random.default_rng(seed)
    x, y = r.random(n) * W, r.random(n) * H
    b = np.clip((r.pareto(1.7, n) + 0.03) * 0.1, 0.02, 2.5) * bright
    t = r.random(n)[:, None]
    col = np.where(t < 0.22, C(255, 205, 160), np.where(t < 0.72, C(255, 255, 255), C(170, 205, 255)))
    if tint is not None:
        col = col * 0.55 + tint * 0.45
    layer = np.zeros((H, W, 3), f32)
    ix, iy = x.astype(int).clip(0, W - 1), y.astype(int).clip(0, H - 1)
    for c in range(3):
        np.add.at(layer[..., c], (iy, ix), (b * col[:, c]).astype(f32))
    img += cv2.GaussianBlur(layer, (0, 0), 0.75) * 3.2
    for i in np.argsort(-b)[:flares]:
        flare(img, x[i], y[i], min(1.0, b[i] * 1.6 + 0.35), col[i])


def spiral(img, cx, cy, R, rot, squash, pal, seed, arms=2, twist=2.5, k=1.0):
    H, W = img.shape[:2]
    ext = int(R * 1.9)
    x0, x1, y0, y1 = max(0, int(cx - ext)), min(W, int(cx + ext)), max(0, int(cy - ext)), min(H, int(cy + ext))
    if x1 <= x0 + 4 or y1 <= y0 + 4:
        return
    hh, ww = y1 - y0, x1 - x0
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(f32)
    dx, dy = xx - cx, yy - cy
    c, s = math.cos(rot), math.sin(rot)
    u, v = dx * c + dy * s, (-dx * s + dy * c) / squash
    r = np.sqrt(u * u + v * v) / R + 1e-4
    th = np.arctan2(v, u)
    nz = noise(hh, ww, seed, 8, 6)
    ph = arms * (th - twist * np.log(r + 0.05)) + (nz - 0.5) * 2.4
    arm = (0.5 + 0.5 * np.cos(ph)) ** 2.3
    disc = np.exp(-r * 2.5) * (1 - np.exp(-r * 12))
    dens = disc * (0.10 + 1.15 * arm) * (0.5 + 0.95 * nz) + np.exp(-r * 1.4) * 0.16
    dn = noise(hh, ww, seed + 7, 14, 5)
    lanes = ((0.5 + 0.5 * np.cos(ph + 1.15)) ** 3) * (1 - np.abs(2 * dn - 1)) ** 2
    dens *= 1 - 0.62 * lanes * np.exp(-r * 1.1)
    col = ramp(np.clip(r * 1.05, 0, 1), [(0, pal['core']), (0.2, pal['mid']), (0.55, pal['arm']), (1, pal['rim'])])
    knots = np.clip((nz - 0.6) * 5, 0, 1) * arm * np.exp(-r * 1.2)
    local = dens[..., None] * col * 1.55 + knots[..., None] * pal['knot'] * 0.9
    local += (np.exp(-(r / 0.07) ** 2) * 2.4 + np.exp(-(r / 0.24) ** 2) * 0.55)[..., None] * pal['core']
    # point stars along the arms
    rr = np.random.default_rng(seed + 3)
    n = int(R * R * 0.55)
    px, py = rr.integers(0, ww, n), rr.integers(0, hh, n)
    ok = rr.random(n) < np.clip(dens[py, px] * 1.6, 0, 1) ** 1.3
    pts = np.zeros((hh, ww), f32)
    np.add.at(pts, (py[ok], px[ok]), (rr.random(ok.sum()) * 0.8 + 0.25).astype(f32))
    local += cv2.GaussianBlur(pts, (0, 0), 0.8)[..., None] * 3.0 * pal['arm']
    fade = np.clip(1 - (r / 1.8) ** 2, 0, 1)[..., None]
    img[y0:y1, x0:x1] += local * fade * k


def nebula(img, seed, stops, amount=1.0, cells=3, octaves=7, thr=0.4, soft=0.35, warp=0.35, mask=None):
    H, W = img.shape[:2]
    n = norm(wnoise(H, W, seed, cells, octaves, warp))
    a = np.clip((n - thr) / soft, 0, 1) ** 1.6
    if mask is not None:
        a = a * mask
    col = ramp(norm(wnoise(H, W, seed + 11, 2, 3, 0.2)), stops)
    fil = norm(noise(H, W, seed + 5, 20, 4))
    img += a[..., None] * col * amount * (0.75 + 0.5 * fil[..., None])


def band(img, y0, amp, wid, pal, seed, slope=0.0, k=1.0):
    """a river of stars across the sky"""
    H, W = img.shape[:2]
    gx, gy = np.meshgrid(np.arange(W, dtype=f32), np.arange(H, dtype=f32))
    yc = y0 * H + amp * H * np.sin(gx / W * 5.2 + seed) + slope * (gx - W / 2)
    d = (gy - yc) / (wid * H)
    n = norm(wnoise(H, W, seed, 5, 7, 0.3))
    a = np.exp(-d * d) * np.clip((n - 0.25) / 0.5, 0, 1) ** 1.2
    col = ramp(n, [(0, pal['rim']), (0.5, pal['arm']), (1, pal['core'])])
    img += a[..., None] * col * 0.6 * k
    dust = np.exp(-(d * 0.8) ** 2) * np.clip(norm(noise(H, W, seed + 9, 12, 5)) - 0.55, 0, 1) * 2
    img -= dust[..., None] * img * 0.5
    # grains of the river: many tiny stars only inside it
    r = np.random.default_rng(seed + 4)
    n_pts = int(W * H / 40)
    px, py = r.integers(0, W, n_pts), r.integers(0, H, n_pts)
    ok = r.random(n_pts) < a[py, px] ** 1.5
    layer = np.zeros((H, W), f32)
    np.add.at(layer, (py[ok], px[ok]), (r.random(ok.sum()) * 0.9 + 0.2).astype(f32))
    img += cv2.GaussianBlur(layer, (0, 0), 0.8)[..., None] * 2.6 * pal['core']


def shafts(img, cx, cy, col, k=0.6, count=22, length=0.9, seed=1):
    H, W = img.shape[:2]
    r = np.random.default_rng(seed)
    gx, gy = np.meshgrid(np.arange(W, dtype=f32), np.arange(H, dtype=f32))
    dx, dy = gx - cx, gy - cy
    ang = np.arctan2(dy, dx)
    dist = np.sqrt(dx * dx + dy * dy)
    prof = cv2.resize(r.random((1, count * 3)).astype(f32), (720, 1), interpolation=cv2.INTER_CUBIC)[0]
    idx = ((ang + math.pi) / (2 * math.pi) * 719).astype(int).clip(0, 719)
    s = np.clip(prof[idx] - 0.45, 0, 1) ** 1.6 * 2.2
    s *= np.exp(-dist / (length * max(W, H))) * (1 - np.exp(-dist / (0.04 * W)))
    img += s[..., None] * col * k


def bokeh(img, seed, n, col, size=(6, 26), alpha=(0.03, 0.12), region=None):
    H, W = img.shape[:2]
    r = np.random.default_rng(seed)
    layer = Image.new('RGB', (W, H), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x, y = r.random() * W, r.random() * H
        if region is not None:
            x, y = region(r)
        rad = (size[0] + r.random() ** 2 * (size[1] - size[0])) * U
        a = alpha[0] + r.random() * (alpha[1] - alpha[0])
        c = tuple(int(255 * min(1, v * a * 3.2)) for v in col)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=c)
    img += cv2.GaussianBlur(np.asarray(layer, f32) / 255, (0, 0), 1.6 * U)


def meteors(img, seed, n, col, ang=0.55, length=(90, 300)):
    H, W = img.shape[:2]
    r = np.random.default_rng(seed)
    L = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(L)
    for _ in range(n):
        x, y = r.random() * W, r.random() * H * 0.7
        ln = (length[0] + r.random() * (length[1] - length[0])) * U
        for i in range(24):
            t0, t1 = i / 24, (i + 1) / 24
            v = int(255 * (1 - t0) ** 2 * (0.5 + r.random() * 0.5))
            d.line([x - math.cos(ang) * ln * t0, y - math.sin(ang) * ln * t0, x - math.cos(ang) * ln * t1, y - math.sin(ang) * ln * t1], fill=v, width=max(1, int(2 * U * (1 - t0) + 0.5)))
    m = np.asarray(L, f32) / 255
    img += m[..., None] * col * 1.1 + blur(m, 3 * U)[..., None] * col * 0.5


# ---------------------------------------------------------------- silhouettes (islands, pagodas, trees, swords…)
class Mask:
    def __init__(self, W, H, ss=2):
        self.W, self.H, self.ss = W, H, ss
        self.im = Image.new('L', (W * ss, H * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def poly(self, pts):
        s = self.ss
        self.d.polygon([(x * s, y * s) for x, y in pts], fill=255)

    def line(self, a, b, wd):
        s = self.ss
        self.d.line([a[0] * s, a[1] * s, b[0] * s, b[1] * s], fill=255, width=max(1, int(wd * s)))

    def ell(self, cx, cy, rx, ry):
        s = self.ss
        self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)

    def arr(self):
        return np.asarray(self.im.resize((self.W, self.H), Image.LANCZOS), f32) / 255


def shade(img, m, body, rim, toward, haze_col=None, haze=0.0, rim_k=1.0, rim_w=2.4, lights=None):
    """paint a silhouette: a dark body (fading to the haze colour with distance) and a bright edge on the side facing the light"""
    b = body * (1 - haze) + (haze_col if haze_col is not None else body) * haze
    a = m[..., None]
    img[:] = img * (1 - a) + b * a
    dx, dy = toward
    edge = np.clip(m - shift(m, -dx * rim_w * U, -dy * rim_w * U), 0, 1)
    img += edge[..., None] * rim * rim_k * (1 - haze * 0.5)
    img += blur(edge, 3 * U)[..., None] * rim * rim_k * 0.4 * (1 - haze * 0.5)
    soft = np.clip(m - blur(shift(m, -dx * 26 * U, -dy * 26 * U), 12 * U), 0, 1)
    img += (soft * m)[..., None] * rim * rim_k * 0.22 * (1 - haze)
    if lights is not None and len(lights):
        L = np.zeros(m.shape, f32)
        for (x, y, s, v) in lights:
            xi, yi = int(x), int(y)
            if 0 <= xi < m.shape[1] and 0 <= yi < m.shape[0]:
                cv2.circle(L, (xi, yi), max(1, int(s * U)), float(v), -1, cv2.LINE_AA)
        img += blur(L, 1.4 * U)[..., None] * C(255, 214, 140) * 1.4 + blur(L, 7 * U)[..., None] * C(255, 190, 100) * 0.9


class Island:
    """a floating rock: a grassy top with peaks and a long broken underside. `top(x)` gives the height of the surface at a spot."""

    def __init__(self, mask, cx, cy, w, h, seed, peaks=3, under=1.5, flat=0.0):
        self.cx, self.cy, self.w, self.h = cx, cy, w, h
        r = random.Random(seed)
        n = 64
        xs = np.linspace(-0.5, 0.5, n)
        env = np.sqrt(np.clip(1 - (2 * xs) ** 2, 0, 1))
        top = env * (0.12 + flat * 0.08)
        for _ in range(peaks):
            p = r.uniform(-0.3, 0.3)
            top += r.uniform(0.3, 0.8) * (1 - abs(p) * 1.5) * np.exp(-((xs - p) / r.uniform(0.05, 0.1)) ** 2) * (1 - flat)
        top += np.array([r.uniform(-0.012, 0.012) for _ in range(n)])
        top *= env ** 0.35
        self.xs, self.topv = xs, top
        up = [(cx + x * w, cy - t * h) for x, t in zip(xs, top)]
        prof = np.clip(1 - np.abs(2 * xs[::-1]) ** 1.5, 0, 1) ** 1.25
        jag = np.array([r.uniform(-0.35, 0.2) if i % 2 else 0 for i in range(n)])
        # long stalactites
        for _ in range(4):
            j = r.randrange(8, n - 8)
            jag[j] += r.uniform(0.2, 0.5)
        low = [(cx + x * w, cy + (pr * (0.85 + jg * 0.3)) * h * under) for x, pr, jg in zip(xs[::-1], prof, jag)]
        mask.poly(up + low)
        self.mask = mask
        self.seed = seed

    def top(self, xr):
        return self.cy - float(np.interp(xr, self.xs, self.topv)) * self.h

    def pt(self, xr):
        return self.cx + xr * self.w, self.top(xr)


def far_shade(img, m, p, toward):
    """distant islands: almost the colour of the haze, so they read as depth, not as shapes"""
    shade(img, m, p['body'] * 2, p['rim_l'] * 0.4, toward, p['haze'] * 0.55, 0.8, 0.4, rim_w=1.6)


def pine(m, x, y, h):
    for i in range(3):
        w = h * (0.34 - i * 0.08)
        yy = y - h * (i * 0.27)
        m.poly([(x - w, yy), (x + w, yy), (x, yy - h * 0.5)])
    m.line((x, y), (x, y + h * 0.08), max(1, h * 0.06))


def pagoda(m, cx, by, width, tiers, lights=None):
    """a many-tiered tower with upturned eaves; returns the spots of its windows"""
    y = by
    for i in range(tiers):
        w = width * (1 - 0.15 * i)
        bh = width * 0.16
        m.poly([(cx - 0.36 * w, y), (cx + 0.36 * w, y), (cx + 0.34 * w, y - bh), (cx - 0.34 * w, y - bh)])
        xs = np.linspace(-1, 1, 15) * 0.7 * w
        up = width * 0.07
        bot = [(cx + x, y - bh - up * (abs(x) / (0.7 * w)) ** 3 + w * 0.012) for x in xs]
        topv = [(cx + x * 0.42, y - bh - width * 0.075) for x in xs[::-1]]
        m.poly(bot + topv)
        if lights is not None:
            lights.append((cx, y - bh * 0.5, 1.6, 0.9))
        y -= bh + width * 0.05
    m.poly([(cx - width * 0.02, y + width * 0.04), (cx + width * 0.02, y + width * 0.04), (cx, y - width * 0.3)])
    m.ell(cx, y - width * 0.05, width * 0.035, width * 0.035)
    return y


def gate(m, cx, by, width, lights=None):
    """a pailou: two pillars, two lintels, a curved roof"""
    for sx in (-1, 1):
        m.poly([(cx + sx * width * 0.4 - width * 0.03, by), (cx + sx * width * 0.4 + width * 0.03, by), (cx + sx * width * 0.4 + width * 0.025, by - width * 0.62), (cx + sx * width * 0.4 - width * 0.025, by - width * 0.62)])
    m.poly([(cx - width * 0.5, by - width * 0.5), (cx + width * 0.5, by - width * 0.5), (cx + width * 0.5, by - width * 0.56), (cx - width * 0.5, by - width * 0.56)])
    xs = np.linspace(-1, 1, 15) * width * 0.6
    m.poly([(cx + x, by - width * 0.62 - width * 0.06 * (abs(x) / (width * 0.6)) ** 3) for x in xs] + [(cx + x * 0.5, by - width * 0.72) for x in xs[::-1]])
    m.poly([(cx - width * 0.4, by - width * 0.36), (cx + width * 0.4, by - width * 0.36), (cx + width * 0.4, by - width * 0.4), (cx - width * 0.4, by - width * 0.4)])
    if lights is not None:
        lights.append((cx, by - width * 0.52, 2.2, 0.8))


def tree_dead(m, x, y, h, seed, depth=5):
    r = random.Random(seed)

    def go(px, py, ang, ln, wd, d):
        nx, ny = px + math.cos(ang) * ln, py - math.sin(ang) * ln
        m.line((px, py), (nx, ny), wd)
        if d <= 0:
            return
        for k in range(2 if d > 1 else 3):
            go(nx, ny, ang + r.uniform(-0.8, 0.8), ln * r.uniform(0.62, 0.78), wd * 0.68, d - 1)

    go(x, y, math.pi / 2 + r.uniform(-0.15, 0.15), h * 0.3, max(2, h * 0.04), depth)


def sword(m, x, y, ln, ang, wd=1.0):
    ca, sa = math.cos(ang), math.sin(ang)
    px, py = -sa, ca

    def P(t, o):
        return (x + ca * t + px * o, y + sa * t + py * o)

    m.poly([P(0, -wd * 0.5), P(ln * 0.78, -wd * 0.62), P(ln, 0), P(ln * 0.78, wd * 0.62), P(0, wd * 0.5)])
    m.poly([P(-ln * 0.02, -wd * 2.0), P(ln * 0.02, -wd * 2.0), P(ln * 0.02, wd * 2.0), P(-ln * 0.02, wd * 2.0)])
    m.line(P(-ln * 0.02, 0), P(-ln * 0.2, 0), wd * 0.8)


def bolt(d, p0, p1, disp, depth, wd, r):
    if depth == 0:
        d.line([p0[0], p0[1], p1[0], p1[1]], fill=255, width=max(1, int(wd)))
        return
    mx, my = (p0[0] + p1[0]) / 2 + r.uniform(-disp, disp), (p0[1] + p1[1]) / 2 + r.uniform(-disp, disp)
    bolt(d, p0, (mx, my), disp / 2, depth - 1, wd, r)
    bolt(d, (mx, my), p1, disp / 2, depth - 1, wd, r)
    if depth >= 3 and r.random() < 0.45:
        ex, ey = mx + r.uniform(-1, 1) * disp * 3.2, my + abs(r.uniform(0.3, 1.0)) * disp * 3.2
        bolt(d, (mx, my), (ex, ey), disp / 2.2, depth - 2, max(1, wd * 0.55), r)


def lightning(img, seed, strikes, col, W, H):
    r = random.Random(seed)
    L = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(L)
    for (x0, y0, x1, y1) in strikes:
        bolt(d, (x0, y0), (x1, y1), 70 * U, 6, 3 * U, r)
    m = np.asarray(L, f32) / 255
    img += m[..., None] * C(255, 255, 255) * 1.4
    img += blur(m, 3 * U)[..., None] * col * 1.3 + blur(m, 14 * U)[..., None] * col * 0.9 + blur(m, 50 * U)[..., None] * col * 0.5


def disc(img, cx, cy, R, light, base, hi, seed, bands=0.0, ring=None, rot=0.0, atmo=None, crater=0.0):
    """a planet or moon lit from `light` (unit vector), optionally with a ring (tilt `rot`, squash)"""
    H, W = img.shape[:2]
    ext = int(R * (2.5 if ring else 1.4))
    x0, x1, y0, y1 = max(0, int(cx - ext)), min(W, int(cx + ext)), max(0, int(cy - ext)), min(H, int(cy + ext))
    hh, ww = y1 - y0, x1 - x0
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(f32)
    dx, dy = (xx - cx) / R, (yy - cy) / R
    r2 = dx * dx + dy * dy
    inside = r2 < 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    lam = np.clip(dx * light[0] + dy * light[1] + z * light[2], 0, 1)
    tex = noise(hh, ww, seed, 5, 6)
    col = base + (hi - base) * (0.35 + 0.65 * tex[..., None])
    if bands:
        b = 0.5 + 0.5 * np.sin(dy * 14 + tex * 5 * bands)
        col = col * (0.75 + 0.5 * b[..., None])
    if crater:
        cn = noise(hh, ww, seed + 5, 12, 4)
        col = col * (1 - crater * np.clip(0.5 - cn, 0, 1)[..., None] * 1.4)
    shade_ = (lam ** 0.9)[..., None]
    out = col * (0.04 + 1.05 * shade_)
    edge = (1 - z) ** 3
    if atmo is not None:
        out += (edge * (0.2 + lam))[..., None] * atmo * 1.2
    a = np.clip((1 - np.sqrt(r2)) * R / 1.6, 0, 1)
    layer = np.zeros((hh, ww, 3), f32)
    layer[:] = out
    sub = img[y0:y1, x0:x1]
    if ring is None:
        sub[:] = sub * (1 - a[..., None]) + layer * a[..., None]
    else:
        c, s = math.cos(rot), math.sin(rot)
        u = (dx * c + dy * s)
        v = (-dx * s + dy * c) / ring['squash']
        rr = np.sqrt(u * u + v * v)
        inner, outer = ring['in'], ring['out']
        grain = noise(hh, ww, seed + 12, 60, 3)
        m_ring = np.clip((rr - inner) / 0.03, 0, 1) * np.clip((outer - rr) / 0.05, 0, 1)
        lanes = 0.45 + 0.55 * np.sin(rr * 70) ** 2 * (0.5 + grain)
        m_ring = m_ring * lanes * (1 - 0.6 * np.exp(-((rr - (inner + outer) / 2) / 0.04) ** 2))
        rcol = ring['col'] * (0.5 + 0.8 * np.clip(grain, 0, 1)[..., None])
        # the planet's shadow falls on the ring behind it
        sh = np.clip(1 - np.exp(-((u * light[1] - v * ring['squash'] * 0 + 0) ** 2) * 0), 0, 1)
        behind = (v < 0) & inside
        ring_a = m_ring.copy()
        ring_a[behind] = 0
        front = v >= 0
        # back part first (under the planet), then the planet, then the front part
        back_a = np.where(~front, m_ring, 0) * (1 - a)
        sub[:] = sub * (1 - back_a[..., None]) + rcol * back_a[..., None] * 1.0
        sub[:] = sub * (1 - a[..., None]) + layer * a[..., None]
        front_a = np.where(front, m_ring, 0)
        sub[:] = sub * (1 - front_a[..., None]) + rcol * front_a[..., None] * 1.0
    if atmo is not None:
        gl = np.exp(-np.clip(np.sqrt(r2) - 1, 0, None) * 7) * (np.sqrt(r2) >= 1) * 0.5
        sub += gl[..., None] * atmo


def clouds(img, y0, th, seed, lit, dark, toward, haze=0.0, haze_col=None, k=1.0, cells=5):
    """a sea of cloud: wide soft billows, brighter on top, darker and thicker towards the bottom of the picture"""
    H, W = img.shape[:2]
    gy = np.arange(H, dtype=f32)[:, None]
    n = norm(noise(H, W, seed, cells + 1, 6, 0.55, ys=2.0))
    fall = np.clip((gy - y0) / th, 0, 1)
    a = np.clip((n - 0.46 + (1 - fall) * 0.5) / 0.3, 0, 1) * np.clip(fall * 2.2, 0, 1)
    top = np.clip(1 - blur(a, 5 * U) / (blur(shift(a, 0, -14 * U), 5 * U) + 1e-3), 0, 1)   # where the cloud's upper edge is
    lt = np.clip(n * 1.1 + top * 0.9 - fall * 0.5, 0, 1)
    col = dark + (lit - dark) * lt[..., None]
    col = col * (1 - haze) + (haze_col if haze_col is not None else col) * haze
    img[:] = img * (1 - a[..., None] * k) + col * a[..., None] * k


def vignette(img, k=0.55):
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(f32)
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    img *= (1 - k * np.clip(r - 0.35, 0, 1) ** 1.6)[..., None]


def finish(img, expo=1.25, bloom=0.5):
    if bloom:
        br = np.clip(img - 0.8, 0, None)
        img = img + (blur(br, 7 * U) * 0.6 + blur(br, 28 * U) * 0.9 + blur(br, 90 * U) * 1.1) * bloom
    out = 1 - np.exp(-np.clip(img, 0, None) * expo)
    out = out ** (1 / 1.12)
    rng = np.random.default_rng(7)
    out += (rng.random(out.shape[:2]).astype(f32)[..., None] - 0.5) * (1.6 / 255)
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def sky(W, H, top, bot, tint=1.0):
    t = np.linspace(0, 1, H, dtype=f32)[:, None, None]
    return np.broadcast_to(top * (1 - t) + bot * t, (H, W, 3)).copy() * tint


# ---------------------------------------------------------------- palettes for the galaxies
PAL = {
    'thienhuyen': dict(core=C(255, 238, 190), mid=C(255, 214, 140), arm=C(120, 235, 200), rim=C(40, 150, 170), knot=C(255, 170, 120), top=C(1, 8, 18), bot=C(4, 30, 40), neb=[(0, C(4, 40, 50)), (0.5, C(18, 120, 120)), (1, C(255, 214, 140))], glow=C(255, 214, 140), haze=C(24, 90, 96), body=C(3, 14, 20), rim_l=C(255, 220, 150)),
    'huyenminh': dict(core=C(230, 220, 255), mid=C(190, 160, 255), arm=C(120, 90, 230), rim=C(50, 40, 140), knot=C(120, 220, 255), top=C(3, 2, 12), bot=C(18, 8, 40), neb=[(0, C(20, 8, 60)), (0.55, C(90, 50, 190)), (1, C(120, 220, 255))], glow=C(160, 210, 255), haze=C(50, 36, 110), body=C(5, 3, 14), rim_l=C(150, 215, 255)),
    'xichdiem': dict(core=C(255, 240, 200), mid=C(255, 190, 110), arm=C(255, 110, 60), rim=C(150, 30, 20), knot=C(255, 220, 130), top=C(12, 2, 2), bot=C(42, 10, 6), neb=[(0, C(50, 8, 6)), (0.55, C(190, 50, 20)), (1, C(255, 190, 90))], glow=C(255, 150, 70), haze=C(110, 36, 22), body=C(10, 3, 3), rim_l=C(255, 160, 80)),
    'thanhde': dict(core=C(235, 255, 220), mid=C(170, 255, 190), arm=C(70, 220, 150), rim=C(20, 110, 100), knot=C(200, 255, 255), top=C(1, 10, 10), bot=C(3, 36, 30), neb=[(0, C(2, 40, 36)), (0.55, C(24, 150, 110)), (1, C(170, 255, 230))], glow=C(150, 255, 210), haze=C(22, 100, 84), body=C(2, 12, 10), rim_l=C(170, 255, 200)),
    'tutieu': dict(core=C(240, 235, 255), mid=C(200, 180, 255), arm=C(130, 110, 255), rim=C(50, 50, 170), knot=C(170, 240, 255), top=C(5, 3, 18), bot=C(20, 12, 50), neb=[(0, C(24, 12, 70)), (0.55, C(100, 70, 230)), (1, C(170, 235, 255))], glow=C(170, 215, 255), haze=C(60, 50, 140), body=C(4, 3, 14), rim_l=C(190, 225, 255)),
    'hondon': dict(core=C(255, 252, 235), mid=C(255, 226, 160), arm=C(220, 180, 100), rim=C(90, 70, 40), knot=C(255, 255, 255), top=C(1, 1, 3), bot=C(12, 9, 7), neb=[(0, C(10, 8, 6)), (0.55, C(120, 90, 40)), (1, C(255, 232, 170))], glow=C(255, 232, 170), haze=C(70, 56, 36), body=C(2, 2, 3), rim_l=C(255, 232, 170)),
}


def scene_setup(W, H):
    global U
    U = math.sqrt(W * H / (2560 * 1440))
    return W > H


# ---------------------------------------------------------------- the scenes
def common_bg(W, H, p, seed, band_y=0.42, nebula_amt=0.9, band_k=1.0):
    img = sky(W, H, p['top'], p['bot'])
    nebula(img, seed, p['neb'], nebula_amt * 0.34, cells=3, thr=0.5, soft=0.35)
    nebula(img, seed + 40, p['neb'], nebula_amt * 0.26, cells=5, thr=0.55, soft=0.3, warp=0.5)
    stars(img, seed + 1, int(W * H / 160), 0.8)
    stars(img, seed + 2, int(W * H / 2400), 1.5, flares=60 if SCALE == 1 else 14)
    band(img, band_y, 0.12, 0.09, p, seed + 3, slope=-0.12 * (H / W), k=band_k)
    return img


def place(W, H, land, port):
    return (land if W > H else port)


def scene_thienhuyen(W, H):
    L = scene_setup(W, H)
    p = PAL['thienhuyen']
    img = common_bg(W, H, p, 11, band_y=0.34 if L else 0.28)
    gx, gy = (0.27 * W, 0.34 * H) if L else (0.62 * W, 0.2 * H)
    spiral(img, gx, gy, 0.46 * H if L else 0.6 * W, -0.5, 0.5, p, 21, arms=2, twist=2.6, k=1.0)
    shafts(img, gx, gy, p['glow'], 0.16, seed=5)
    disc(img, 0.8 * W if L else 0.22 * W, 0.2 * H if L else 0.33 * H, 0.055 * H if L else 0.07 * W, np.array([-0.6, -0.4, 0.7], f32), C(40, 70, 70), C(170, 230, 210), 4, atmo=C(120, 255, 220), crater=0.5)
    meteors(img, 9, 5, p['glow'])
    toward = np.array([-0.7, -0.5], f32)
    # far islands (hazy), then the near ones
    far = Mask(W, H)
    spots = [(0.10, 0.62, 0.10, 0.05, 31), (0.47, 0.55, 0.09, 0.045, 32), (0.93, 0.5, 0.1, 0.05, 33)] if L else [(0.2, 0.52, 0.28, 0.025, 31), (0.85, 0.46, 0.3, 0.022, 32), (0.5, 0.36, 0.2, 0.018, 33)]
    for x, y, w, h, s in spots:
        Island(far, x * W, y * H, w * W, h * H * 1.6 if L else h * H * 1.6, s, peaks=2, under=1.2)
    far_shade(img, far.arr(), p, toward)
    clouds(img, H * 0.74, H * 0.2, 71, p['haze'] * 1.1, p['haze'] * 0.45, toward, 0.2, p['haze'] * 0.6, 0.7)
    # mid island with one pagoda
    m2 = Mask(W, H); lights = []
    cx, cy, w, h = (0.27 * W, 0.7 * H, 0.17 * W, 0.075 * H) if L else (0.25 * W, 0.66 * H, 0.42 * W, 0.045 * H)
    i2 = Island(m2, cx, cy, w, h, 41, peaks=2)
    x, y = i2.pt(0.05); pagoda(m2, x, y + 2, w * 0.2, 4, lights)
    for t in (-0.3, 0.25, 0.35):
        x, y = i2.pt(t); pine(m2, x, y + 1, w * 0.07)
    shade(img, m2.arr(), p['body'] * 1.4, p['rim_l'], toward, p['haze'], 0.3, 1.0, lights=lights)
    # the main island: nine peaks, three pagodas, a waterfall
    m = Mask(W, H); lights = []
    cx, cy, w, h = (0.62 * W, 0.62 * H, 0.42 * W, 0.12 * H) if L else (0.58 * W, 0.74 * H, 0.95 * W, 0.075 * H)
    isl = Island(m, cx, cy, w, h, 51, peaks=4, under=1.9)
    for t, sz, tr in ((-0.18, 0.15, 5), (0.12, 0.2, 7), (0.33, 0.11, 4)):
        x, y = isl.pt(t); pagoda(m, x, y + 2, w * sz, tr, lights)
    for t in np.linspace(-0.42, 0.42, 16):
        x, y = isl.pt(float(t)); pine(m, x, y + 2, w * random.Random(int(t * 99)).uniform(0.025, 0.045))
    mm = m.arr()
    shade(img, mm, p['body'], p['rim_l'], toward, p['haze'], 0.08, 1.2, lights=lights)
    fx, fy = isl.pt(-0.45)
    fall = np.zeros((H, W), f32)
    ln = int(0.32 * H)
    cols = np.linspace(0, 1, ln, dtype=f32)
    for i in range(ln):
        yy = int(fy + i)
        if yy >= H:
            break
        wd = (1.5 + 3.5 * cols[i]) * U
        xx = int(fx - 2 + math.sin(i / 30) * 2)
        fall[yy, max(0, int(xx - wd)):min(W, int(xx + wd + 1))] = (1 - cols[i]) ** 1.3
    glow(img, fall, C(170, 255, 235), 1.2, sig=(1.5, 6, 18))
    # sea of clouds in front
    clouds(img, H * 0.84, H * 0.22, 81, C(110, 200, 190), C(4, 22, 30), toward, 0.0, None, 0.95)
    bokeh(img, 3, 30, p['glow'], size=(4, 18), alpha=(0.02, 0.07))
    vignette(img, 0.5)
    return finish(img, 1.35)


def scene_huyenminh(W, H):
    L = scene_setup(W, H)
    p = PAL['huyenminh']
    img = common_bg(W, H, p, 12, band_y=0.3, nebula_amt=1.0, band_k=0.8)
    mx, my, mr = (0.7 * W, 0.3 * H, 0.2 * H) if L else (0.62 * W, 0.2 * H, 0.2 * W)
    light = np.array([-0.5, -0.3, 0.8], f32)
    spiral(img, 0.16 * W if L else 0.2 * W, 0.2 * H if L else 0.46 * H, 0.13 * H if L else 0.2 * W, 0.4, 0.5, p, 22, k=0.7)
    img += 0
    glow_l = np.zeros((H, W), f32); cv2.circle(glow_l, (int(mx), int(my)), int(mr * 1.05), 1.0, -1)
    glow(img, glow_l, C(120, 90, 255), 0.7, sig=(30, 90, 220), wts=(0.5, 0.5, 0.5))
    disc(img, mx, my, mr, light, C(18, 14, 40), C(120, 110, 190), 6, bands=0.6, ring=dict(squash=0.22, **{'in': 1.35, 'out': 2.15, 'col': C(150, 160, 255)}), rot=-0.35, atmo=C(130, 190, 255))
    meteors(img, 8, 3, p['glow'], ang=0.3)
    toward = np.array([0.6, -0.5], f32)
    # the river that runs up into the sky
    rv = Image.new('L', (W, H), 0); d = ImageDraw.Draw(rv)
    pts = [(0.3 * W + math.sin(i / 7) * 0.05 * W + i * 0.012 * W, H - i * (H * 0.0125)) for i in range(60)]
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=int(255 * (1 - i / 60) ** 0.8), width=max(1, int((5 + 14 * (1 - i / 60)) * U)))
    rv = np.asarray(rv, f32) / 255
    glow(img, rv, C(110, 210, 255), 1.0, sig=(2, 9, 30))
    far = Mask(W, H)
    for x, y, w, h, s in ([(0.9, 0.62, 0.12, 0.05, 61), (0.5, 0.5, 0.08, 0.04, 62)] if L else [(0.15, 0.5, 0.3, 0.02, 61), (0.85, 0.42, 0.2, 0.02, 62)]):
        Island(far, x * W, y * H, w * W, h * H * 1.5, s, peaks=2, under=1.2)
    far_shade(img, far.arr(), p, toward)
    clouds(img, H * 0.72, H * 0.25, 72, p['haze'] * 1.4, p['haze'] * 0.4, toward, 0.2, p['haze'], 0.85)
    m = Mask(W, H); lights = []
    cx, cy, w, h = (0.33 * W, 0.68 * H, 0.4 * W, 0.15 * H) if L else (0.4 * W, 0.7 * H, 0.9 * W, 0.08 * H)
    isl = Island(m, cx, cy, w, h, 52, peaks=3, under=1.5, flat=0.5)
    x, y = isl.pt(0.02); gate(m, x, y + 2, w * 0.3, lights)
    for t, s in ((-0.34, 62), (0.3, 63), (0.38, 64)):
        x, y = isl.pt(t); tree_dead(m, x, y + 2, w * 0.2, s)
    shade(img, m.arr(), p['body'], p['rim_l'], toward, p['haze'], 0.05, 1.0)
    # soul lanterns
    wl = np.zeros((H, W), f32); rr = random.Random(5)
    for _ in range(46):
        x = (cx + rr.uniform(-0.5, 0.6) * w) if rr.random() < 0.8 else rr.random() * W
        y = H * rr.uniform(0.25, 0.8)
        cv2.circle(wl, (int(x), int(y)), max(1, int(rr.uniform(2, 5) * U)), rr.uniform(0.5, 1), -1, cv2.LINE_AA)
    glow(img, wl, C(130, 225, 255), 1.5, sig=(1.2, 5, 16))
    clouds(img, H * 0.86, H * 0.2, 82, p['mid'] * 0.4, C(8, 4, 22), toward, 0.0, None, 0.92)
    bokeh(img, 3, 60, C(150, 200, 255), size=(8, 28), alpha=(0.02, 0.07))
    vignette(img, 0.6)
    return finish(img, 1.3)


def scene_xichdiem(W, H):
    L = scene_setup(W, H)
    p = PAL['xichdiem']
    img = common_bg(W, H, p, 13, band_y=0.26, nebula_amt=1.05, band_k=0.7)
    gx, gy = (0.76 * W, 0.3 * H) if L else (0.62 * W, 0.2 * H)
    spiral(img, gx, gy, 0.3 * H if L else 0.38 * W, 0.6, 0.62, p, 23, arms=3, twist=2.1)
    shafts(img, gx, gy, p['glow'], 0.18, seed=7)
    toward = np.array([0.4, -0.6], f32)
    far = Mask(W, H)
    for x, y, w, h, s in ([(0.12, 0.6, 0.12, 0.05, 61), (0.9, 0.58, 0.1, 0.05, 62), (0.52, 0.5, 0.08, 0.04, 63)] if L else [(0.15, 0.5, 0.3, 0.02, 61), (0.85, 0.4, 0.25, 0.02, 62)]):
        Island(far, x * W, y * H, w * W, h * H * 1.5, s, peaks=2, under=1.3)
    far_shade(img, far.arr(), p, toward)
    clouds(img, H * 0.72, H * 0.25, 73, p['haze'] * 1.5, p['haze'] * 0.4, toward, 0.15, p['haze'], 0.85)
    m = Mask(W, H); lights = []
    cx, cy, w, h = (0.42 * W, 0.7 * H, 0.46 * W, 0.17 * H) if L else (0.5 * W, 0.74 * H, 0.95 * W, 0.09 * H)
    isl = Island(m, cx, cy, w, h, 53, peaks=3, under=1.45, flat=0.55)
    bx, by = isl.pt(0.0)
    cw = w * 0.2
    fire = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(fire); rr = random.Random(9)
    for k in range(11):
        tall = rr.uniform(0.18, 0.5) * H * (1.0 if k in (4, 5, 6) else 0.6)
        sway = rr.uniform(-0.12, 0.12) * tall
        xs0 = bx + rr.uniform(-0.55, 0.55) * cw
        left, right = [], []
        for i in range(26):
            t = i / 25
            wd = cw * 0.22 * (1 - t) ** 0.8 * (1 + 0.5 * math.sin(t * 7 + k))
            cxp = xs0 + sway * t * t + math.sin(t * 5 + k) * cw * 0.05
            yp = by - cw * 0.95 - tall * t
            left.append((cxp - wd, yp)); right.append((cxp + wd, yp))
        fd.polygon(left + right[::-1], fill=int(150 + 105 * rr.random()))
    fire = np.asarray(fire, f32) / 255
    glow(img, fire, C(255, 140, 50), 1.5, sig=(3, 14, 50), wts=(1.0, 0.8, 0.7))
    img += blur(fire, 2.2 * U)[..., None] * C(255, 226, 170) * 1.5
    # the cauldron: round belly, two ears, three legs
    m.ell(bx, by - cw * 0.5, cw * 0.62, cw * 0.5)
    m.poly([(bx - cw * 0.7, by - cw * 0.86), (bx + cw * 0.7, by - cw * 0.86), (bx + cw * 0.62, by - cw * 0.98), (bx - cw * 0.62, by - cw * 0.98)])
    for sx in (-1, 1):
        m.ell(bx + sx * cw * 0.66, by - cw * 1.05, cw * 0.08, cw * 0.14)
        m.poly([(bx + sx * cw * 0.5 - cw * 0.07, by - cw * 0.12), (bx + sx * cw * 0.5 + cw * 0.07, by - cw * 0.12), (bx + sx * cw * 0.56, by + 2), (bx + sx * cw * 0.42, by + 2)])
    m.poly([(bx - cw * 0.06, by - cw * 0.05), (bx + cw * 0.06, by - cw * 0.05), (bx + cw * 0.05, by + 2), (bx - cw * 0.05, by + 2)])
    for t in (-0.36, -0.3, 0.3, 0.36, 0.4):
        x, y = isl.pt(t); sword(m, x, y + 4, w * 0.12, -math.pi / 2 + random.Random(int(t * 99)).uniform(-0.25, 0.25), w * 0.005)
    shade(img, m.arr(), p['body'], p['rim_l'], toward, p['haze'], 0.04, 1.1)
    img += blur(fire, 6 * U)[..., None] * C(255, 160, 80) * 0.0
    lava = np.zeros((H, W), f32)
    for _ in range(26):
        x = cx + rr.uniform(-0.4, 0.4) * w
        y = cy + rr.uniform(0.05, 0.7) * h
        cv2.line(lava, (int(x), int(y)), (int(x + rr.uniform(-18, 18) * U), int(y + rr.uniform(10, 40) * U)), 1.0, max(1, int(2 * U)), cv2.LINE_AA)
    glow(img, lava * (m.arr() > 0.5), C(255, 110, 40), 1.4, sig=(1.5, 6, 20))
    bokeh(img, 4, 130, C(255, 160, 70), size=(1.5, 6), alpha=(0.1, 0.4), region=lambda r: (bx + r.uniform(-0.25, 0.25) * W, r.uniform(0.1, 0.8) * H))
    clouds(img, H * 0.86, H * 0.2, 83, p['mid'] * 0.45, C(22, 6, 4), toward, 0.0, None, 0.92)
    vignette(img, 0.55)
    return finish(img, 1.3)


def scene_thanhde(W, H):
    L = scene_setup(W, H)
    p = PAL['thanhde']
    img = common_bg(W, H, p, 14, band_y=0.5, nebula_amt=1.0)
    spiral(img, 0.2 * W if L else 0.25 * W, 0.28 * H if L else 0.2 * H, 0.22 * H if L else 0.28 * W, 0.2, 0.55, p, 24)
    toward = np.array([-0.4, -0.7], f32)
    tx = 0.62 * W if L else 0.5 * W
    # the tree: a big trunk with roots, boughs, and a crown of lights
    m = Mask(W, H)
    r = random.Random(8)
    leaves = []

    def branch(x, y, ang, ln, wd, d):
        nx, ny = x + math.cos(ang) * ln, y - math.sin(ang) * ln
        ca, sa = math.cos(ang), math.sin(ang)
        wn = wd * 0.72
        m.poly([(x - sa * wd / 2, y - ca * wd / 2), (x + sa * wd / 2, y + ca * wd / 2), (nx + sa * wn / 2, ny + ca * wn / 2), (nx - sa * wn / 2, ny - ca * wn / 2)])
        if d == 0:
            for _ in range(14):
                leaves.append((nx + r.uniform(-1, 1) * ln * 1.3, ny + r.uniform(-1, 1) * ln * 1.1))
            return
        for k in range(3 if d > 4 else 2):
            branch(nx, ny, ang + r.uniform(-0.7, 0.7) + (0.16 if k == 0 else -0.14), ln * r.uniform(0.66, 0.78), wn, d - 1)

    base = H * 0.9
    tw = 0.1 * W if L else 0.2 * W
    branch(tx, base, math.pi / 2, H * 0.2, tw, 7)
    for i in range(7):  # roots
        a = math.pi + (i - 3) * 0.5
        rx = tx + (i - 3) * tw * 0.35
        m.poly([(rx - tw * 0.18, base - 4), (rx + tw * 0.18, base - 4), (rx + (i - 3) * tw * 0.7, base + tw * 0.4)])
    shade(img, m.arr(), p['body'], p['rim_l'], toward, p['haze'], 0.0, 1.0)
    ll = np.zeros((H, W), f32)
    for (x, y) in leaves:
        cv2.circle(ll, (int(x), int(y)), max(1, int(r.uniform(1.5, 5) * U)), r.uniform(0.4, 1.0), -1, cv2.LINE_AA)
    glow(img, ll, C(150, 255, 200), 1.3, sig=(1.2, 6, 24))
    glow(img, ll, C(60, 220, 150), 1.3, sig=(30, 70, 120), wts=(0.9, 0.7, 0.5))
    # fruit: little galaxies hanging in the crown
    for k in range(5):
        x, y = leaves[r.randrange(len(leaves))]
        spiral(img, x, y, (38 + r.random() * 30) * U, r.random() * 3, 0.6, p, 90 + k, k=1.2)
    # floating lotus islands
    far = Mask(W, H)
    for x, y, w, h, s in ([(0.12, 0.62, 0.12, 0.05, 61), (0.3, 0.76, 0.1, 0.04, 62), (0.9, 0.55, 0.1, 0.045, 63)] if L else [(0.2, 0.62, 0.3, 0.02, 61), (0.82, 0.7, 0.26, 0.02, 62)]):
        Island(far, x * W, y * H, w * W, h * H * 1.5, s, peaks=2, under=1.2)
    far_shade(img, far.arr(), p, toward)
    clouds(img, H * 0.8, H * 0.2, 74, p['haze'] * 1.5, p['haze'] * 0.4, toward, 0.1, p['haze'], 0.9)
    bokeh(img, 4, 150, C(190, 255, 190), size=(2, 8), alpha=(0.1, 0.4))
    clouds(img, H * 0.9, H * 0.12, 84, p['mid'] * 0.4, C(2, 20, 18), toward, 0.0, None, 0.95)
    vignette(img, 0.55)
    return finish(img, 1.3)


def scene_tutieu(W, H):
    L = scene_setup(W, H)
    p = PAL['tutieu']
    img = common_bg(W, H, p, 15, band_y=0.22, nebula_amt=0.8, band_k=0.6)
    cx, cy = (0.55 * W, 0.58 * H) if L else (0.5 * W, 0.6 * H)
    # a storm: dark masses with light behind them
    nebula(img, 60, [(0, C(8, 4, 30)), (0.5, C(60, 40, 150)), (1, C(170, 150, 255))], 1.1, cells=2, octaves=7, thr=0.35, soft=0.3, warp=0.5,
           mask=np.clip(1.2 - np.hypot((np.arange(W, dtype=f32)[None, :] - cx) / (0.5 * W), (np.arange(H, dtype=f32)[:, None] - cy) / (0.45 * H)), 0, 1))
    toward = np.array([0.0, -1.0], f32)
    m = Mask(W, H); lights = []
    tw = 0.15 * W if L else 0.4 * W
    top = pagoda(m, cx, H * 0.9, tw, 8, lights)
    shade(img, m.arr(), p['body'], p['rim_l'], toward, p['haze'], 0.0, 1.3, lights=lights)
    # the sword array: rings of blades turning round the tower
    sm = Mask(W, H)
    rr = random.Random(3)
    for ring_i, (ry, rx, n, ln) in enumerate([(0.05, 0.24, 36, 0.085), (0.04, 0.34, 48, 0.07), (0.03, 0.44, 60, 0.055)]):
        for k in range(n):
            a = k / n * math.tau
            x = cx + math.cos(a) * rx * W * (1 if L else 0.62)
            y = H * 0.46 + math.sin(a) * ry * H * 2.2 + ring_i * H * 0.07
            sword(sm, x, y, ln * H, -math.pi / 2 + math.cos(a) * 0.3 + rr.uniform(-0.04, 0.04), H * 0.0035)
    sa = sm.arr()
    shade(img, sa, p['body'] * 3, C(210, 230, 255), toward, None, 0.0, 1.6)
    glow(img, sa, C(150, 190, 255), 0.5, sig=(2, 10, 30))
    # lightning
    strikes = [(cx - 0.12 * W, 0.0, cx - 0.02 * W, 0.4 * H), (cx + 0.1 * W, 0.05 * H, cx + 0.05 * W, 0.45 * H), (0.12 * W, 0.0, 0.2 * W, 0.5 * H), (0.88 * W, 0.0, 0.8 * W, 0.4 * H)] if L else [(0.2 * W, 0, 0.3 * W, 0.4 * H), (0.85 * W, 0.05 * H, 0.75 * W, 0.45 * H), (cx, 0.0, cx + 0.03 * W, 0.38 * H)]
    lightning(img, 17, strikes, C(150, 140, 255), W, H)
    clouds(img, H * 0.8, H * 0.25, 75, p['mid'] * 0.5, C(8, 4, 24), toward, 0.0, None, 0.95)
    bokeh(img, 4, 90, C(190, 210, 255), size=(2, 9), alpha=(0.1, 0.35))
    vignette(img, 0.55)
    return finish(img, 1.3)


def scene_hondon(W, H):
    L = scene_setup(W, H)
    p = PAL['hondon']
    img = common_bg(W, H, p, 16, band_y=0.5, nebula_amt=0.55, band_k=0.5)
    cx, cy = W * 0.5, H * (0.46 if L else 0.4)
    R = 0.2 * H if L else 0.3 * W
    # a vortex of gold dust
    spiral(img, cx, cy, R * 2.2, 0.3, 0.9, p, 26, arms=3, twist=1.6, k=0.8)
    spiral(img, cx, cy, R * 1.4, 1.5, 0.9, dict(p, core=C(255, 255, 255)), 27, arms=2, twist=-1.2, k=0.7)
    # the taiji
    H_, W_ = img.shape[:2]
    ext = int(R * 1.1)
    x0, x1, y0, y1 = int(cx - ext), int(cx + ext), int(cy - ext), int(cy + ext)
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(f32)
    dx, dy = (xx - cx) / R, (yy - cy) / R
    r = np.sqrt(dx * dx + dy * dy)
    tw = 0.9 * (1 - np.clip(r, 0, 1)) ** 1.5
    ca, sa_ = np.cos(tw), np.sin(tw)
    x_, y_ = dx * ca - dy * sa_, dx * sa_ + dy * ca
    light = x_ > 0
    light = np.where(x_ * x_ + (y_ + 0.5) ** 2 < 0.25, True, light)
    light = np.where(x_ * x_ + (y_ - 0.5) ** 2 < 0.25, False, light)
    light = np.where(x_ * x_ + (y_ + 0.5) ** 2 < 0.018, False, light)
    light = np.where(x_ * x_ + (y_ - 0.5) ** 2 < 0.018, True, light)
    star = noise(y1 - y0, x1 - x0, 5, 40, 3)
    cl = np.where(light[..., None], C(255, 240, 200) * (0.8 + 0.5 * star[..., None]) * 1.5, C(10, 6, 14) * (0.4 + star[..., None]))
    a = np.clip((1 - r) * R / 2, 0, 1)[..., None]
    sub = img[y0:y1, x0:x1]
    sub[:] = sub * (1 - a) + cl * a
    rim = np.exp(-np.abs(r - 1) * R / 3) * 0.9
    sub += rim[..., None] * p['glow'] * 1.2
    ring = np.zeros((H, W), f32)
    for k, (rad, wd, alpha) in enumerate([(1.28, 2, 0.8), (1.5, 1.2, 0.5), (1.9, 3, 0.35), (2.3, 1.2, 0.3)]):
        cv2.ellipse(ring, (int(cx), int(cy)), (int(R * rad), int(R * rad * (1 if k % 2 == 0 else 0.35))), 20 * k, 20, 320 - 30 * k, alpha, max(1, int(wd * U)), cv2.LINE_AA)
    glow(img, ring, p['glow'], 1.0, sig=(1, 5, 18))
    # shards of a broken sphere along the rings
    toward = np.array([0.0, -1.0], f32)
    sm = Mask(W, H); rr = random.Random(4)
    for _ in range(46):
        a = rr.uniform(0, math.tau); rad = R * rr.uniform(1.4, 2.7)
        x, y = cx + math.cos(a) * rad, cy + math.sin(a) * rad * 0.7
        s = R * rr.uniform(0.04, 0.16)
        k = rr.uniform(0, math.tau)
        sm.poly([(x + math.cos(k + i * 2.1) * s * rr.uniform(0.6, 1.2), y + math.sin(k + i * 2.1) * s * rr.uniform(0.6, 1.2)) for i in range(3)])
    sh = sm.arr()
    shade(img, sh, C(8, 6, 4), p['glow'] * 1.2, np.array([0.0, -1.0], f32), None, 0.0, 1.5)
    meteors(img, 10, 4, p['glow'], ang=0.9)
    bokeh(img, 5, 130, p['mid'], size=(2, 9), alpha=(0.1, 0.4))
    vignette(img, 0.7)
    return finish(img, 1.25, 0.6)


SCENES = dict(thienhuyen=scene_thienhuyen, huyenminh=scene_huyenminh, xichdiem=scene_xichdiem, thanhde=scene_thanhde, tutieu=scene_tutieu, hondon=scene_hondon)


def scene_map(W, H):
    L = scene_setup(W, H)
    base = dict(top=C(1, 3, 10), bot=C(6, 12, 26), neb=[(0, C(10, 14, 50)), (0.5, C(60, 50, 150)), (1, C(255, 214, 160))], rim=C(60, 70, 150), arm=C(150, 140, 230), core=C(255, 240, 210))
    img = sky(W, H, base['top'], base['bot'])
    nebula(img, 101, base['neb'], 0.5, cells=3, thr=0.42, soft=0.4)
    nebula(img, 102, [(0, C(30, 6, 40)), (0.6, C(120, 40, 110)), (1, C(255, 160, 140))], 0.3, cells=4, thr=0.5, soft=0.3, warp=0.5)
    stars(img, 103, int(W * H / 140), 0.85)
    stars(img, 104, int(W * H / 2000), 1.6, flares=90 if SCALE == 1 else 14)
    band(img, 0.5, 0.18, 0.1, dict(base, rim=C(50, 60, 130)), 105, slope=-0.1 * (H / W), k=0.8)
    pts = {}
    for g in DATA['galaxies']:
        pos = g['pos'] if L else g['posM']
        pts[g['id']] = (pos[0] * W, pos[1] * H, g['size'])
    # armillary rings behind everything
    ar = np.zeros((H, W), f32)
    c0 = (int(W * 0.5), int(H * 0.5))
    for k, (rx, ry, an, al) in enumerate([(0.46, 0.4, 14, 0.5), (0.36, 0.28, -22, 0.4), (0.52, 0.2, 8, 0.3), (0.28, 0.46, 40, 0.3)]):
        cv2.ellipse(ar, c0, (int(rx * (W if L else W * 1.1)), int(ry * H)), an, 0, 360, al, max(1, int(1.6 * U)), cv2.LINE_AA)
    glow(img, ar, C(240, 200, 120), 0.5, sig=(1, 5, 18))
    # the dragon vein joining the galaxies, in order
    order = ['thienhuyen', 'huyenminh', 'xichdiem', 'thanhde', 'tutieu', 'hondon']
    vein = np.zeros((H, W), f32)
    seq = [pts[i] for i in (['thienhuyen', 'thanhde', 'xichdiem', 'huyenminh'] if False else order)]
    for a, b in zip(seq[:-1], seq[1:]):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        nx, ny = -(b[1] - a[1]), (b[0] - a[0])
        ln = math.hypot(nx, ny) + 1e-6
        cxp, cyp = mx + nx / ln * 0.07 * min(W, H), my + ny / ln * 0.07 * min(W, H)
        prev = None
        for i in range(61):
            t = i / 60
            x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cxp + t * t * b[0]
            y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cyp + t * t * b[1]
            if prev is not None and i % 2 == 0:
                cv2.line(vein, (int(prev[0]), int(prev[1])), (int(x), int(y)), 1.0, max(1, int(2 * U)), cv2.LINE_AA)
            prev = (x, y)
    glow(img, vein, C(240, 200, 120), 0.9, sig=(1.2, 5, 16))
    for gid, (x, y, s) in pts.items():
        g = next(q for q in DATA['galaxies'] if q['id'] == gid)
        p = PAL[gid]
        R = s * min(W, H) * (2.3 if L else 2.9)
        soon = g['status'] != 'open'
        rot = random.Random(gid).uniform(-0.9, 0.9)
        spiral(img, x, y, R * (1 if soon else 1.15), rot, random.Random(gid + 'x').uniform(0.42, 0.66), p, sum(map(ord, gid)) % 999, arms=3 if gid == 'xichdiem' else 2, k=0.62 if soon else 1.2)
        halo = np.zeros((H, W), f32); cv2.circle(halo, (int(x), int(y)), int(R * 0.5), 1.0, -1)
        glow(img, halo, p['glow'], 0.22 if soon else 0.55, sig=(20, 60, 150), wts=(0.5, 0.5, 0.5))
    # little stars joined by lines, like a constellation, around the edges
    cn = Image.new('L', (W, H), 0); d = ImageDraw.Draw(cn); rr = random.Random(77)
    for k in range(7):
        px, py = rr.choice([(rr.uniform(0.02, 0.2), rr.uniform(0.05, 0.95)), (rr.uniform(0.8, 0.98), rr.uniform(0.05, 0.95)), (rr.uniform(0.2, 0.8), rr.choice([rr.uniform(0.03, 0.12), rr.uniform(0.88, 0.97)]))])
        pp = [(px * W, py * H)]
        for _ in range(rr.randint(3, 6)):
            pp.append((pp[-1][0] + rr.uniform(-0.05, 0.05) * W, pp[-1][1] + rr.uniform(-0.06, 0.06) * H))
        for a, b in zip(pp[:-1], pp[1:]):
            d.line([a, b], fill=90, width=max(1, int(1 * U)))
        for a in pp:
            d.ellipse([a[0] - 3 * U, a[1] - 3 * U, a[0] + 3 * U, a[1] + 3 * U], fill=255)
    cm = np.asarray(cn, f32) / 255
    img += cm[..., None] * C(255, 235, 190) * 0.9 + blur(cm, 5 * U)[..., None] * C(255, 220, 160) * 0.8
    # a floating island with a pagoda beside the home galaxy: "you are here"
    x, y, s = pts['thienhuyen']
    m = Mask(W, H); lights = []
    iw = min(W, H) * 0.16
    ix, iy = x + (0.17 * min(W, H) if L else 0.2 * W), y - (0.05 * min(W, H) if L else 0.02 * H)
    isl = Island(m, ix, iy, iw, iw * 0.3, 7, peaks=2, under=1.3)
    px, py = isl.pt(0.05); pagoda(m, px, py + 1, iw * 0.3, 4, lights)
    shade(img, m.arr(), C(3, 10, 16), C(255, 214, 150), np.array([-0.7, -0.5], f32), None, 0.0, 1.2, lights=lights)
    bokeh(img, 6, 60, C(200, 200, 255), size=(5, 20), alpha=(0.02, 0.06))
    meteors(img, 12, 3, C(255, 235, 200))
    vignette(img, 0.6)
    return finish(img, 1.25, 0.55)


# ---------------------------------------------------------------- the nav icon: a round gold-rimmed medallion like the other header icons
def icon(px=704):
    global U
    U = px / 1440
    S = px
    img = sky(S, S, C(2, 8, 22), C(8, 40, 52))
    nebula(img, 3, PAL['thienhuyen']['neb'], 0.7, cells=2, thr=0.38, soft=0.4)
    stars(img, 4, 1500 if SCALE == 1 else 300, 0.9, flares=8)
    spiral(img, S * 0.5, S * 0.4, S * 0.3, -0.5, 0.5, PAL['thienhuyen'], 8, k=1.3)
    glow_l = np.zeros((S, S), f32); cv2.circle(glow_l, (S // 2, int(S * 0.4)), int(S * 0.1), 1, -1)
    glow(img, glow_l, C(255, 214, 140), 0.7, sig=(10, 40, 100))
    m = Mask(S, S); lights = []
    far = Mask(S, S)
    Island(far, S * 0.18, S * 0.78, S * 0.3, S * 0.05, 3, peaks=2, under=1.2)
    far_shade(img, far.arr(), PAL['thienhuyen'], np.array([-0.7, -0.5], f32))
    isl = Island(m, S * 0.58, S * 0.74, S * 0.62, S * 0.14, 51, peaks=4, under=1.3)
    for t, sz, tr in ((-0.12, 0.17, 5), (0.2, 0.12, 4)):
        x, y = isl.pt(t); pagoda(m, x, y + 2, S * 0.62 * sz, tr, lights)
    shade(img, m.arr(), C(2, 10, 14), C(255, 220, 150), np.array([-0.7, -0.5], f32), None, 0.0, 1.2, lights=lights)
    clouds(img, S * 0.86, S * 0.16, 77, C(120, 220, 200), C(4, 26, 32), np.array([-0.7, -0.5], f32), 0, None, 0.9)
    vignette(img, 0.3)
    rgbimg = finish(img, 1.3)
    # round, with a double gold rim and a row of small notches (the meander of the other icons)
    ss = 2
    big = cv2.resize(rgbimg, (S * ss // 2 * 2 // 2, S * ss // 2 * 2 // 2), interpolation=cv2.INTER_CUBIC) if False else rgbimg
    yy, xx = np.mgrid[0:S, 0:S].astype(f32)
    r = np.sqrt((xx - S / 2) ** 2 + (yy - S / 2) ** 2) / (S / 2)
    ang = np.arctan2(yy - S / 2, xx - S / 2)
    inner = 0.8
    ringmask = (r <= 1.0) & (r > inner)
    t = np.clip((r - inner) / (1 - inner), 0, 1)
    gold = ramp(1 - np.abs(t - 0.5) * 2, [(0, C(120, 78, 20)), (0.35, C(214, 162, 70)), (0.7, C(255, 232, 160)), (1, C(255, 246, 205))])
    notch = (np.abs(np.sin(ang * 24)) > 0.55) & (t > 0.28) & (t < 0.72)
    gold = np.where(notch[..., None], gold * 0.5, gold)
    lipin = np.exp(-((r - inner) * S / 6) ** 2)[..., None] * C(60, 36, 8) * 0.6
    out = rgbimg.astype(f32) / 255
    # inner shadow under the rim
    out = out * (1 - 0.5 * np.exp(-np.clip(inner - r, 0, None) * 18))[..., None]
    out = np.where(ringmask[..., None], np.clip(gold - lipin, 0, 1), out)
    a = np.clip((1.0 - r) * S / 2 / 1.5, 0, 1)
    rgba = np.dstack([out, a]).astype(f32)
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((176, 176), Image.LANCZOS)
    return im


def save(arr, name, size):
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(arr).save(os.path.join(OUT, f'{name}_{size}.webp'), quality=82, method=5)


def thumbs():
    for g in DATA['galaxies']:
        im = Image.open(os.path.join(OUT, f"{g['id']}_2k.webp")).convert('RGB')
        w, h = im.size
        c = im.crop((int(w * 0.5 - h * 0.45), int(h * 0.05), int(w * 0.5 + h * 0.45), int(h * 0.95))).resize((192, 192), Image.LANCZOS)
        c.save(os.path.join(OUT, f"{g['id']}_t.webp"), quality=84)
        print('thumb', g['id'])


def main():
    if sys.argv[1:] == ['thumbs']:
        return thumbs()
    want = sys.argv[1:] or (['map'] + list(SCENES) + ['icon'])
    for name in want:
        if name == 'icon':
            im = icon(704 if SCALE == 1 else 352)
            dest = os.path.join(ROOT, 'public', 'art', 'ui', 'nav', 'galaxy.png') if SCALE == 1 else '/tmp/galaxy-preview/galaxy.png'
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            im.save(dest)
            print('icon', dest)
            continue
        fn = scene_map if name == 'map' else SCENES[name]
        for size, (w, h) in SIZES.items():
            W, H = int(w * SCALE), int(h * SCALE)
            save(fn(W, H), name, size)
            print(name, size, f'{W}x{H}', flush=True)


if __name__ == '__main__':
    main()
