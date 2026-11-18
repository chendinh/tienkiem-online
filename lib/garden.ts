// Linh Thú Viên as a garden: every creature has ONE looping idle clip with its background cut out (made once, about 0.41 USD), and the owner drags
// creatures from a tray onto a background. A background is a picture with a wide flat HORIZONTAL ground (the "plane"): the creatures stand on it, are pushed
// back onto it when dropped elsewhere, and get smaller the farther back they stand. Pure functions, no imports, so they are tested (tests/garden.test.ts).

// ---- the plane: the band of the picture (shares of its height) where feet may stand, y0 the far edge, y1 the near edge
export interface Plane { y0: number; y1: number }
export const PLANE: Plane = { y0: 0.72, y1: 0.93 };
export const FAR = 0.55, NEAR = 1.1;   // size of a creature at the far and near edge of the plane (1 = the size the stage gives it)
export const HEIGHT = 0.3;             // a creature's height at size 1, as a share of the stage's height
export const MAX_ITEMS = 12;           // each creature is two videos and a WebGL canvas: more than this is too much for a phone
export const K_RANGE = { min: 0.5, max: 2 } as const;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function cleanPlane(p: unknown, fallback: Plane = PLANE): Plane {
  const o = p as any;
  if (!fin(o?.y0) || !fin(o?.y1)) return fallback;
  const y0 = clamp(o.y0, 0.3, 0.95), y1 = clamp(o.y1, y0 + 0.04, 0.99);
  return { y0: Math.round(y0 * 1000) / 1000, y1: Math.round(y1 * 1000) / 1000 };
}
// where a dropped creature really stands: x inside the picture, y inside the plane
export const snap = (p: Plane, x: number, y: number) => ({ x: clamp(x, 0.03, 0.97), y: clamp(y, p.y0, p.y1) });
export const depth = (p: Plane, y: number) => clamp((y - p.y0) / Math.max(1e-6, p.y1 - p.y0), 0, 1);
export const scaleAt = (p: Plane, y: number) => FAR + (NEAR - FAR) * depth(p, y);

// ---- what the owner has put on one background
export interface Placed { uid: string; cut: string; x: number; y: number; flip: boolean; k: number }   // x, y: where the feet are, shares of the picture; k: the owner's size factor
export interface Layout { plane: Plane; items: Placed[] }
const isCutId = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{20}$/.test(s);
export const isBgId = (s: unknown): s is string => typeof s === 'string' && (/^[a-z]{3,12}$/.test(s) || /^[a-f0-9]{20}$/.test(s));
export function parseLayout(raw: unknown, fallback: Plane = PLANE): Layout {
  const o = raw as any, plane = cleanPlane(o?.plane, fallback), items: Placed[] = [], seen = new Set<string>();
  for (const it of Array.isArray(o?.items) ? o.items : []) {
    if (items.length >= MAX_ITEMS) break;
    if (!isCutId(it?.cut) || !fin(it?.x) || !fin(it?.y) || typeof it?.uid !== 'string' || !/^[a-z0-9]{4,16}$/.test(it.uid) || seen.has(it.uid)) continue;
    seen.add(it.uid);
    const s = snap(plane, it.x, it.y);
    items.push({ uid: it.uid, cut: it.cut, x: Math.round(s.x * 10000) / 10000, y: Math.round(s.y * 10000) / 10000, flip: it.flip === true, k: fin(it.k) ? Math.round(clamp(it.k, K_RANGE.min, K_RANGE.max) * 100) / 100 : 1 });
  }
  return { plane, items };
}
export const newUid = (rnd: () => number = Math.random) => Array.from({ length: 8 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rnd() * 36)]).join('');

// ---- measuring a cut-out creature from its alpha: the box of the creature inside its (square) video frame, as shares of the frame
export interface Box { x0: number; y0: number; x1: number; y1: number }
// `a` is one byte per pixel (0..255), row by row. A few stray pixels (dust left by the cut-out) must not stretch the box: a row or column counts when enough of it is opaque.
export function alphaBox(a: ArrayLike<number>, w: number, h: number): Box | null {
  if (!(w > 0 && h > 0) || a.length < w * h) return null;
  const rows = new Uint32Array(h), cols = new Uint32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] >= 128) { rows[y]++; cols[x]++; }
  const need = (n: number) => Math.max(2, Math.ceil(n * 0.004));
  let y0 = 0, y1 = h - 1, x0 = 0, x1 = w - 1;
  while (y0 < h && rows[y0] < need(w)) y0++;
  while (y1 >= 0 && rows[y1] < need(w)) y1--;
  while (x0 < w && cols[x0] < need(h)) x0++;
  while (x1 >= 0 && cols[x1] < need(h)) x1--;
  if (y0 > y1 || x0 > x1) return null;
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}
export const boxOk = (b: unknown): b is Box => !!b && [(b as Box).x0, (b as Box).y0, (b as Box).x1, (b as Box).y1].every(fin) && (b as Box).x1 > (b as Box).x0 && (b as Box).y1 > (b as Box).y0;

// ---- putting a creature on the stage. `aspect` is the stage's width over its height; the video frame is square.
// The creature's box gets the height HEIGHT * scale * k (of the stage), its feet (the bottom middle of its box) are on (x, y). Returns percentages of the stage.
export function frameOf(plane: Plane, b: Box, it: Pick<Placed, 'x' | 'y' | 'k'>, aspect: number) {
  const hb = HEIGHT * scaleAt(plane, it.y) * clamp(it.k, K_RANGE.min, K_RANGE.max), fh = hb / (b.y1 - b.y0), fw = fh / Math.max(0.1, aspect);   // frame size, as shares of the stage's height and width
  const cx = (b.x0 + b.x1) / 2, p = (n: number) => Math.round(n * 100000) / 1000;
  return {
    left: p(it.x - cx * fw), top: p(it.y - b.y1 * fh), width: p(fw), height: p(fh),
    pivot: Math.round(cx * 10000) / 100,                                          // % of the frame's width the mirror turns around (the middle of the creature)
    shadow: { left: p(it.x), top: p(it.y), width: p((b.x1 - b.x0) * fw * 1.05), height: p(Math.max(0.012, hb * 0.1)) },
  };
}

// ---- backgrounds with a flat ground, drawn from text (one picture each, about 0.05 USD)
export interface Theme { id: string; name: string; en: string }
export const THEMES: Theme[] = [
  { id: 'hosen', name: 'Đài đá bên hồ sen', en: 'a wide flat paved stone terrace beside a still lotus lake at dawn, pink lotus flowers on the water, distant misty karst peaks and a small pagoda far away' },
  { id: 'dinhmay', name: 'Đài ngọc trên biển mây', en: 'a wide flat platform of pale jade and white stone high above a sea of clouds, floating mountain peaks and waterfalls in the distance, golden sunrise' },
  { id: 'trexanh', name: 'Bãi đất trong rừng tre', en: 'a wide flat clearing of soft mossy ground inside a bamboo forest, tall green bamboo on both sides, shafts of light and floating fireflies in the air behind' },
  { id: 'trangbac', name: 'Đồng cỏ bạc dưới trăng', en: 'a wide flat meadow of short silver-blue grass beside a calm glowing lake under a huge full moon, soft spirit lights floating in the distance, cool blue night' },
  { id: 'daovien', name: 'Sân đá vườn đào', en: 'a wide flat stone courtyard in a peach blossom garden, blossoming peach trees and drifting petals on both sides, a curved bridge and mountains far away, soft pink light' },
  { id: 'phalenh', name: 'Nền pha lê trong hang', en: 'a wide flat smooth cave floor of dark stone with a few glowing crystals along the far back wall, glowing blue and violet crystals and an underground lake far away, magical light' },
];
export const themeOf = (id: unknown) => THEMES.find((t) => t.id === id);
export const planePrompt = (t: Theme) =>
  `A beautiful painted xianxia (Chinese fantasy) scene in a wide 16:9 picture: ${t.en}. ` +
  `Seen from the side at eye level. A wide FLAT HORIZONTAL ground fills the lower quarter of the picture from the left edge to the right edge, with the far edge of the ground at about 72% of the height ` +
  `and the near edge at about 93%. That ground is completely empty and clear: no rocks, plants, puddles, steps, railings or objects on it, nothing taller than a few centimetres, evenly lit, so that animals can stand anywhere on it. ` +
  `All the detail and drama of the scenery is above that ground and in the far distance. Rich, soft, cinematic light, painterly style. No creatures, no people, no text, no watermark, no border.`;

// ---- the moving background: one looping clip of a whole background, made once (about 0.70 USD), shared by everyone
export const BG_SECONDS = 10;   // longer than a creature's clip, so the repeat is less noticeable
const STATIC = 'The camera is completely static and everything in the scene stays in place except what is described.';
export const bgClipPrompt = () =>
  'The whole scene is alive with clearly visible, gentle, continuous motion: any water flows and ripples with moving highlights; waterfalls pour without stopping; thick mist rolls slowly; ' +
  'light rays shimmer and shift; trees, bamboo, flowers and leaves sway and rustle in a steady breeze; glowing spirit lights float and flicker; clouds drift across the sky. ' +
  'The ground in the lower part of the picture stays still and unchanged. Nothing appears or disappears: no creature, bird, insect or person is added. ' +
  `${STATIC} The animation loops seamlessly: the last frame returns exactly to the first frame. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;

// Rough price of one new creature: its variant picture (not for the original), its idle clip and the cut-out of the clip.
export const creatureUsd = (u: { edit: number; clip: number; cut: number }, mutated: boolean) => Math.round(((mutated ? u.edit : 0) + u.clip + u.cut) * 1000) / 1000;
