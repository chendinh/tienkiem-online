// Stage engine of the technique effects: plays a recipe (lib/skillfx.ts) with the textures of public/art/fx.
// The textures are grayscale light on black. `loadTex` turns the brightness into transparency and tints it with the colour of the element once,
// so every element shares the same pictures. Sprites are plain DOM nodes in the stage's effect layer, moved with the Web Animations API
// (no canvas and no timers: each node removes itself when its animation ends).
import { TEXTURES, defaultHit, textureIds, type SkillFx } from '@/lib/skillfx';

export interface Tex { url: string; w: number; h: number }
type Pt = { x: number; y: number };

const cache = new Map<string, Tex>();
const pending = new Map<string, Promise<Tex | null>>();
const images = new Map<string, Promise<HTMLImageElement | null>>();
const loadImage = (id: string) => {
  let p = images.get(id);
  if (!p) { p = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `/art/fx/${id}.webp`; }); images.set(id, p); }
  return p;
};
const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// The picture `id` as light of `color` on transparency (null when the file is missing: the stage then falls back to the plain icon).
export function loadTex(id: string, color: string): Promise<Tex | null> {
  const key = `${id}|${color}`;
  const had = pending.get(key); if (had) return had;
  const p = (async () => {
    const im = await loadImage(id); if (!im) return null;
    const w = im.naturalWidth, h = im.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return null;
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h), px = d.data, [cr, cg, cb] = rgb(color);
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i] / 255, core = smooth(0.5, 0.98, v) * 0.8;   // the brightest part stays white-hot, the rest takes the colour
      px[i] = cr + (255 - cr) * core; px[i + 1] = cg + (255 - cg) * core; px[i + 2] = cb + (255 - cb) * core;
      px[i + 3] = Math.min(255, v * 255 * 1.25);
    }
    g.putImageData(d, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png')); if (!blob) return null;
    const tex = { url: URL.createObjectURL(blob), w, h }; cache.set(key, tex); return tex;
  })().catch(() => null);
  pending.set(key, p);
  return p;
}
export const texOf = (id: string, color: string): Tex | null => cache.get(`${id}|${color}`) || null;
// Start loading everything a recipe can show.
export const warmFx = (fx: SkillFx, color: string): Promise<unknown> => Promise.all([...new Set([...textureIds(fx), ...(defaultHit(fx) ? [defaultHit(fx)!] : [])])].map((id) => loadTex(id, color)));

export interface PlayOpts { layer: HTMLElement; fx: SkillFx; color: string; from: Pt; to: Pt; k: number; level: 'low' | 'mid' | 'high'; crit: boolean }
// cast: ms until the technique is released; impacts: ms at which each blow lands on the recipient; total: ms until the last sprite is gone.
export interface Played { cast: number; impacts: number[]; total: number }

// Pictures drawn facing right: they are mirrored (not turned upside down) when the foe casts them toward the left.
const DIRECTIONAL = new Set(['thrust', 'arrow', 'blade_wave', 'sound', 'phoenix', 'dragon', 'moon', 'shadow']);
// Pictures that are a whirl: they turn while they travel.
const SWIRLY = new Set(['leaf', 'fire_swirl', 'water_swirl']);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function playSkill(o: PlayOpts): Played | null {
  const { layer, fx, color, from, to, k, level, crit } = o;
  const main = texOf(fx.tex, color); if (!main) return null;
  const hitId = defaultHit(fx), hitTex = hitId ? texOf(hitId, color) : null, castTex = fx.cast ? texOf(fx.cast, color) : null;
  const low = level === 'low';
  const u = Math.max(0.6, Math.min(1, layer.clientWidth / 560));   // a narrow stage (phone) draws everything smaller
  const t = (ms: number) => Math.round(ms * k);
  const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy), dir = dx < 0 ? -1 : 1;
  const big = crit ? 2 : 1;   // a critical hit draws its technique twice as large
  const baseW = (fx.size ?? TEXTURES[fx.tex].size) * u * big;
  const impacts: number[] = [];
  let total = 0;

  const spawn = (tex: Tex, w: number, cx: number, cy: number, frames: Keyframe[], delay: number, duration: number, easing = 'linear', style: Partial<CSSStyleDeclaration> = {}) => {
    const h = (w * tex.h) / tex.w, el = document.createElement('div');
    Object.assign(el.style, { position: 'absolute', left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`, backgroundImage: `url(${tex.url})`, backgroundSize: '100% 100%', pointerEvents: 'none', opacity: '0', willChange: 'transform, opacity', ...style });
    layer.appendChild(el);
    const a = el.animate(frames, { delay, duration, easing, fill: 'both' });
    a.onfinish = () => el.remove(); a.oncancel = () => el.remove();
    total = Math.max(total, delay + duration);
  };
  // the flash on the recipient when a blow lands
  const flash = (at: number, px: number, py: number) => {
    impacts.push(at);
    if (!hitTex || !hitId) return;
    const w = TEXTURES[hitId].size * u * (crit ? 2 : 1) * (low ? 0.8 : 1), r = rnd(-0.35, 0.35);
    spawn(hitTex, w, px, py, [{ opacity: 0, transform: `rotate(${r}rad) scale(0.4)` }, { opacity: 1, transform: `rotate(${r}rad) scale(1)`, offset: 0.25 }, { opacity: 0, transform: `rotate(${r + 0.2}rad) scale(1.25)` }], at, t(crit ? 420 : 320), 'ease-out');
  };

  // the technique gathers on the caster
  const cast = castTex && !low ? t(170) : t(90);
  if (castTex && !low) spawn(castTex, TEXTURES[fx.cast!].size * u * 0.9 * big, from.x, from.y, [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 0.95, transform: 'scale(1.05)', offset: 0.6 }, { opacity: 0, transform: 'scale(1.35)' }], 0, cast + t(60), 'ease-out');

  const m = fx.m;
  if (m === 'bolt' || m === 'arc' || m === 'sweep') {
    const n = low ? 1 : Math.max(1, fx.n ?? 1), directional = DIRECTIONAL.has(fx.tex), spin = fx.spin || SWIRLY.has(fx.tex);
    const travel = t(Math.max(200, Math.min(340, dist * 0.85)) * (m === 'sweep' ? 1.2 : 1)), gap = t(95);
    const flip = directional ? dir : 1, tilt = directional ? Math.atan2(dy, Math.abs(dx)) * dir : 0;
    for (let i = 0; i < n; i++) {
      const lane = (i - (n - 1) / 2) * 14 * u, sx = from.x + dir * 40 * u, sy = from.y + lane, ex = to.x - dir * 8 * u, ey = to.y + lane * 0.4, delay = cast + i * gap;
      const grow0 = m === 'sweep' ? 0.7 : 0.75, grow1 = m === 'sweep' ? 1.5 : 1.05;
      const frames: Keyframe[] = [];
      const steps = 8;   // the fade in and out needs keyframes in between, also on a straight path
      for (let s = 0; s <= steps; s++) {
        const p = s / steps, lift = m === 'arc' ? -Math.sin(Math.PI * p) * Math.min(70, dist * 0.28) : 0;
        const opacity = p < 0.12 ? p / 0.12 : p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1;
        frames.push({ offset: p, opacity, transform: `translate(${(ex - sx) * p}px, ${(ey - sy) * p + lift}px) rotate(${tilt + (spin ? p * 9.4 : 0)}rad) scale(${(grow0 + (grow1 - grow0) * p) * flip}, ${grow0 + (grow1 - grow0) * p})` });
      }
      spawn(main, baseW, sx, sy, frames, delay, travel, m === 'sweep' ? 'linear' : 'ease-in');
      if (fx.trail && !low) for (let g = 1; g <= 3; g++) spawn(main, baseW * (1 - g * 0.08), sx, sy, frames.map((f) => ({ ...f, opacity: Number(f.opacity) * (0.42 - g * 0.1) })), delay + g * t(28), travel, 'ease-in');
      flash(delay + Math.round(travel * 0.96), ex, ey);
    }
  } else if (m === 'beam') {
    const w = (dist + 30 * u) / 0.7, ang = Math.atan2(dy, dx);   // the beam fills the middle 70% of its picture
    // the picture grows about its middle, so it is shifted along the beam to keep its near end on the caster
    const mid = { x: from.x + Math.cos(ang) * (dist / 2), y: from.y + Math.sin(ang) * (dist / 2) };
    const bf = (sx: number, sy: number, offset?: number): Keyframe => { const sh = -0.35 * w * (1 - sx) - 15 * u * (1 - sx); return { opacity: sx < 0.2 ? 0 : 1, transform: `translate(${Math.cos(ang) * sh}px, ${Math.sin(ang) * sh}px) rotate(${ang}rad) scale(${sx}, ${sy * big})`, ...(offset === undefined ? {} : { offset }) }; };
    spawn(main, w, mid.x, mid.y, [
      bf(0.15, 0.5), bf(1, 1, 0.3), bf(1, 1.15, 0.7), { ...bf(1, 0.4), opacity: 0 },
    ], cast, t(380), 'ease-out');
    flash(cast + t(110), to.x, to.y);
  } else if (m === 'slash') {
    const n = low ? 1 : Math.max(1, fx.n ?? 1);
    for (let i = 0; i < n; i++) {
      const delay = cast + i * t(110), r = (-0.5 + i * 0.7) * dir, px = to.x + rnd(-6, 6), py = to.y + rnd(-8, 8);
      spawn(main, baseW, px, py, [
        { opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: `rotate(${r}rad) scale(${0.75 * dir}, 0.75)` },
        { opacity: 1, clipPath: 'inset(0 0% 0 0)', transform: `rotate(${r}rad) scale(${1.05 * dir}, 1.05)`, offset: 0.3 },
        { opacity: 1, clipPath: 'inset(0 0% 0 0)', transform: `rotate(${r}rad) scale(${1.1 * dir}, 1.1)`, offset: 0.65 },
        { opacity: 0, clipPath: 'inset(0 0% 0 0)', transform: `rotate(${r}rad) scale(${1.18 * dir}, 1.18)` },
      ], delay, t(380), 'ease-out');
      flash(delay + t(100), px, py);
    }
  } else if (m === 'rain') {
    const n = low ? 1 : Math.max(1, fx.n ?? 1), strike = fx.tex === 'lightning', gap = t(120);
    for (let i = 0; i < n; i++) {
      const delay = cast + i * gap, px = to.x + (i - (n - 1) / 2) * 38 * u + rnd(-8, 8);
      if (strike) {
        const h = (baseW * main.h) / main.w;
        spawn(main, baseW, px, to.y - h * 0.3, [
          { opacity: 0, transform: 'scaleY(0.5)', transformOrigin: '50% 100%' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.18 }, { opacity: 0.35, transform: 'scaleY(1)', offset: 0.38 }, { opacity: 1, transform: 'scaleY(1.04)', offset: 0.5 }, { opacity: 0, transform: 'scaleY(1)' },
        ], delay, t(420), 'linear');
        flash(delay + t(70), px, to.y);
      } else {
        const fall = t(230), rise = 150 * u;
        spawn(main, baseW, px, to.y, [{ opacity: 0, transform: `translateY(${-rise}px) scale(0.7)` }, { opacity: 1, transform: `translateY(${-rise * 0.7}px) scale(0.85)`, offset: 0.2 }, { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 }], delay, fall, 'ease-in');
        spawn(main, baseW, px, to.y, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(4px) scale(1.2)' }], delay + fall, t(220), 'ease-out');
        flash(delay + fall, px, to.y);
      }
    }
  } else if (m === 'burst') {
    spawn(main, baseW, to.x, to.y, [
      { opacity: 0, transform: 'scale(0.35)' }, { opacity: 1, transform: 'scale(1.05)', offset: 0.25 }, { opacity: 1, transform: 'scale(1.12)', offset: 0.7 }, { opacity: 0, transform: 'scale(1.22)' },
    ], cast, t(540), 'ease-out');
    flash(cast + t(90), to.x, to.y);
  } else {   // aura: rises around the recipient
    const shield = fx.tex === 'shield', rise = shield ? -4 : -30;
    spawn(main, baseW, to.x, to.y + (shield ? -4 : 0), shield
      ? [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1.06)', offset: 0.22 }, { opacity: 0.9, transform: 'scale(1)', offset: 0.7 }, { opacity: 0, transform: 'scale(1.08)' }]
      : [{ opacity: 0, transform: 'translateY(14px) scale(0.75)' }, { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.3 }, { opacity: 0.9, transform: `translateY(${rise * 0.5}px) scale(1.04)`, offset: 0.7 }, { opacity: 0, transform: `translateY(${rise}px) scale(1.08)` }],
    cast, t(820), 'ease-out');
    flash(cast + t(120), to.x, to.y);
  }
  return { cast, impacts: impacts.length ? impacts : [cast + t(100)], total };
}
