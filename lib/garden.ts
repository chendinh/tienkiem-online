// Linh Thú Viên as a garden: every creature has ONE looping idle clip with its background cut out (made once, about 0.41 USD), and the owner drags
// creatures from a tray onto a background. A background is a beautiful picture with SMALL flat places in it (the top of a mossy boulder, a rock ledge, a stone
// slab by the water, a jade terrace): these are the "perches". A dropped creature goes to the nearest perch and stands on it, as big as that perch suits.
// Pure functions, no imports, so they are tested (tests/garden.test.ts).

// ---- perches: x, y = the middle of the flat surface, where the feet touch (shares of the picture); w = how wide the surface is (share of the picture's width);
// s = how big a creature standing there is (1 = HEIGHT of the stage): far perches are small, near ones big
export interface Perch { id: string; x: number; y: number; w: number; s: number }
export const ASPECT = 9 / 16;           // the stage is a phone held upright: width / height. Most players are on a phone, so every background is a tall picture
export const HEIGHT = 0.18;            // a creature's height at size 1, as a share of the stage's height
export const MAX_ITEMS = 12;           // each creature is two videos and a WebGL canvas: more than this is too much for a phone
export const MAX_PERCHES = 24;
export const K_RANGE = { min: 0.5, max: 2 } as const;
export const W_RANGE = { min: 0.04, max: 0.6 } as const;
export const DEFAULT_W = 0.14;
export const S_RANGE = { min: 0.2, max: 1.6 } as const;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const r2 = (x: number) => Math.round(x * 100) / 100;

// the size a perch gets by how low in the picture it is (low = near = big), until the owner sets it
export const sizeAtY = (y: number) => r2(clamp(0.5 + (y - 0.7) * 2.5, 0.4, 1.2));
// ... but not much bigger than the perch can hold: a creature is about 1.2 * HEIGHT * s / ASPECT of the picture's width, and may overhang its perch a little
export const defaultSize = (y: number, w: number) => r2(Math.max(0.3, Math.min(sizeAtY(y), (w * ASPECT) / (0.8 * HEIGHT))));
export const perchAt = (id: string, x: number, y: number, w = DEFAULT_W): Perch => ({ id, x: r4(clamp(x, 0.02, 0.98)), y: r4(clamp(y, 0.2, 0.99)), w: r4(clamp(w, W_RANGE.min, W_RANGE.max)), s: defaultSize(y, clamp(w, W_RANGE.min, W_RANGE.max)) });
export function cleanPerches(raw: unknown): Perch[] {
  const out: Perch[] = [], seen = new Set<string>();
  for (const p of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_PERCHES) break;
    if (typeof p?.id !== 'string' || !/^[a-z0-9]{2,12}$/.test(p.id) || seen.has(p.id) || !fin(p.x) || !fin(p.y)) continue;
    seen.add(p.id);
    out.push({ id: p.id, x: r4(clamp(p.x, 0.02, 0.98)), y: r4(clamp(p.y, 0.2, 0.99)), w: fin(p.w) ? r4(clamp(p.w, W_RANGE.min, W_RANGE.max)) : DEFAULT_W, s: fin(p.s) ? r2(clamp(p.s, S_RANGE.min, S_RANGE.max)) : defaultSize(p.y, fin(p.w) ? clamp(p.w, W_RANGE.min, W_RANGE.max) : DEFAULT_W) });
  }
  return out;
}
// Where a creature dropped at (x, y) really stands: on the nearest perch (distance measured on the screen, `aspect` = stage width over height), x kept inside the perch.
export function snapPerch(perches: Perch[], x: number, y: number, aspect: number): { perch: Perch; x: number; y: number } | null {
  let best: { perch: Perch; x: number; y: number; d: number } | null = null;
  for (const p of perches) {
    const cx = clamp(x, p.x - p.w / 2, p.x + p.w / 2), d = Math.hypot((x - cx) * aspect, y - p.y);
    if (!best || d < best.d) best = { perch: p, x: r4(cx), y: p.y, d };
  }
  return best && { perch: best.perch, x: best.x, y: best.y };
}
export const sizeOf = (p: Perch, k: number) => p.s * clamp(k, K_RANGE.min, K_RANGE.max);

// ---- what the owner has put on one background
export interface Placed { uid: string; cut: string; perch: string; x: number; y: number; flip: boolean; k: number }   // k: the owner's size factor
export interface Layout { perches: Perch[]; items: Placed[] }
const isCutId = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{20}$/.test(s);
export const isBgId = (s: unknown): s is string => typeof s === 'string' && (/^[a-z]{3,12}$/.test(s) || /^[a-f0-9]{20}$/.test(s));
// `fallback`: the perches of a background that has none saved yet. A creature whose perch was moved or deleted goes to the nearest one; with no perch at all there are no creatures.
export function parseLayout(raw: unknown, fallback: Perch[] = [], aspect = 16 / 9): Layout {
  const o = raw as any, perches = Array.isArray(o?.perches) ? cleanPerches(o.perches) : cleanPerches(fallback), items: Placed[] = [], seen = new Set<string>();
  for (const it of Array.isArray(o?.items) ? o.items : []) {
    if (items.length >= MAX_ITEMS) break;
    if (!isCutId(it?.cut) || !fin(it?.x) || !fin(it?.y) || typeof it?.uid !== 'string' || !/^[a-z0-9]{4,16}$/.test(it.uid) || seen.has(it.uid)) continue;
    const s = snapPerch(perches, it.x, it.y, aspect);
    if (!s) continue;
    seen.add(it.uid);
    items.push({ uid: it.uid, cut: it.cut, perch: s.perch.id, x: s.x, y: s.y, flip: it.flip === true, k: fin(it.k) ? r2(clamp(it.k, K_RANGE.min, K_RANGE.max)) : 1 });
  }
  return { perches, items };
}
export const newUid = (rnd: () => number = Math.random) => Array.from({ length: 8 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rnd() * 36)]).join('');

// The perches of the pictures that come with the site, read off them by eye (the owner can move every one). The drawn backgrounds start empty: the owner
// asks for suggestions (a vision model looks at the picture) or taps them in.
const mk = (rows: [string, number, number, number][]) => rows.map(([id, x, y, w]) => perchAt(id, x, y, w));
export const DEFAULT_PERCHES: Record<string, Perch[]> = {
  thanhvan: mk([['da1', 0.1, 0.765, 0.16], ['da2', 0.88, 0.775, 0.18], ['suoi1', 0.4, 0.665, 0.1], ['suoi2', 0.64, 0.685, 0.09], ['bo', 0.7, 0.725, 0.12], ['dao', 0.5, 0.82, 0.2], ['gan', 0.35, 0.9, 0.24]]),
  tinhha: mk([['xa', 0.55, 0.775, 0.2], ['trai', 0.25, 0.84, 0.2], ['phai', 0.78, 0.83, 0.2], ['giua', 0.5, 0.9, 0.3]]),
  xichviem: mk([['da1', 0.13, 0.745, 0.14], ['da2', 0.88, 0.735, 0.12], ['bo', 0.5, 0.765, 0.2], ['trai', 0.3, 0.82, 0.26], ['phai', 0.72, 0.86, 0.26], ['gan', 0.45, 0.92, 0.3]]),
};

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

// ---- putting a creature on the stage. `aspect` is the stage's width over its height; the video frame is square. `size` = sizeOf(perch, k).
// The creature's box gets the height HEIGHT * size (of the stage), its feet (the bottom middle of its box) are on (x, y). Returns percentages of the stage.
export function frameOf(b: Box, it: Pick<Placed, 'x' | 'y'>, size: number, aspect: number) {
  const hb = HEIGHT * size, fh = hb / (b.y1 - b.y0), fw = fh / Math.max(0.1, aspect);   // frame size, as shares of the stage's height and width
  const cx = (b.x0 + b.x1) / 2, p = (n: number) => Math.round(n * 100000) / 1000;
  return {
    left: p(it.x - cx * fw), top: p(it.y - b.y1 * fh), width: p(fw), height: p(fh),
    pivot: Math.round(cx * 10000) / 100,                                          // % of the frame's width the mirror turns around (the middle of the creature)
    shadow: { left: p(it.x), top: p(it.y), width: p((b.x1 - b.x0) * fw * 1.05), height: p(Math.max(0.012, hb * 0.1)) },
  };
}

// ---- beautiful backgrounds drawn from text (one picture each, about 0.05 USD), with several small flat places in them to put creatures on
export interface Theme { id: string; name: string; en: string }
export const THEMES: Theme[] = [
  { id: 'sonthuy', name: 'Sơn thủy: suối và thác', en: 'a misty mountain valley with a clear winding river, tall waterfalls on the cliffs, twisted ancient pines, bamboo groves, a tiny pagoda far away and rays of golden sunrise through the mist' },
  { id: 'hosen', name: 'Hồ sen ngọc', en: 'a still jade-green lotus lake at dawn with pink lotus flowers, a small pavilion on stilts, willow trees, stepping stones and distant karst peaks wrapped in mist' },
  { id: 'dinhmay', name: 'Đỉnh núi trên biển mây', en: 'a high cliff-top garden above a sea of clouds, jagged floating peaks and waterfalls in the distance, old pines clinging to the rock, lanterns drifting in the sky, golden sunrise' },
  { id: 'daovien', name: 'Vườn đào trên sườn núi', en: 'a peach blossom hillside with winding stone steps, mossy boulders, a small stream and a curved stone bridge, petals drifting in the air, misty mountains far away, soft pink and gold light' },
  { id: 'trangbac', name: 'Hồ trăng và đá', en: 'a calm moonlit lake under a huge full moon, silvery rocks and grass along the shore, a few glowing spirit lights, pines on a distant island, cool blue and silver night with a warm lantern glow' },
  { id: 'hangtien', name: 'Động tiên pha lê', en: 'a vast glowing cavern with giant blue and violet crystals, an underground river with a waterfall, glowing moss and hanging vines, soft magical light shafts from an opening high above' },
];
export const themeOf = (id: unknown) => THEMES.find((t) => t.id === id);
export const planePrompt = (t: Theme) =>
  `A breathtaking, richly detailed xianxia (Chinese immortal-cultivation fantasy) landscape painting in a tall vertical 9:16 portrait picture made for a phone screen: ${t.en}. ` +
  `Layered, cinematic depth with a clear foreground, middle ground and far distance, soft glowing light, atmospheric mist, painterly style. ` +
  `Spread through the middle ground and the foreground there are SEVERAL small natural flat places where a single animal could stand or lie, at different distances from the viewer: ` +
  `for example the flat top of a mossy boulder, a wide rock ledge, a smooth stone slab at the water's edge, a stone step, a wooden jetty, the broad root platform of an old tree, a flat jade terrace. ` +
  `Each flat place is clearly visible and about as wide as a large dog or a deer, seen from the side at eye level, with open space above it (no branches or plants crossing in front of it) and the scenery behind it. ` +
  `Everything else stays natural and uneven. No creatures, no people, no text, no watermark, no border.`;
// asked of a vision model, with a labelled grid drawn over the picture (the grid is what makes its coordinates usable)
export const perchAsk = () =>
  'This is a tall painted fantasy scene. A grid is drawn over it, labelled with fractions of the picture width along the top and of its height down the left side (0.1 to 0.9). ' +
  'Find up to 8 small flat places where one animal about the size of a dog could stand or lie: the flat top of a boulder, a rock ledge, a stone slab, a stone step, a jetty, a root platform, a terrace. ' +
  'Choose different distances (some far and high in the picture, some near and low), clearly visible, not hidden behind trees or mist, and spread across the width and over the lower two thirds of the picture. ' +
  'For each give x, y = the point on the flat surface where an animal\'s feet would touch it (the middle of the surface, on its top), as fractions of the picture width and height, and w = how wide the flat surface is as a fraction of the picture width (usually 0.1 to 0.3). ' +
  'Be precise: read the grid labels. Answer with JSON only: {"perches":[{"x":0.5,"y":0.7,"w":0.06}]}';

// A labelled grid drawn over a background before a vision model looks at it. The labels are seven-segment digits drawn as paths, not text (a server may have no fonts).
const SEG: Record<string, string> = { '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
function digit(d: string, x: number, y: number, w: number, h: number): string {
  const L: Record<string, [number, number, number, number]> = { a: [0, 0, w, 0], b: [w, 0, w, h / 2], c: [w, h / 2, w, h], d: [0, h, w, h], e: [0, h / 2, 0, h], f: [0, 0, 0, h / 2], g: [0, h / 2, w, h / 2] };
  return [...(SEG[d] || '')].map((k) => `M${x + L[k][0]} ${y + L[k][1]}L${x + L[k][2]} ${y + L[k][3]}`).join('');
}
export function gridSvg(w: number, h: number): string {
  let lines = '', digits = '';
  for (let i = 1; i <= 9; i++) {
    const x = Math.round((w * i) / 10), y = Math.round((h * i) / 10), dw = 9, dh = 15;
    lines += `M${x} 0V${h}M0 ${y}H${w}`;
    for (const yy of [4, h - dh - 4]) digits += digit(String(i), x + 4, yy, dw, dh);          // along the top and the bottom: tenths of the width
    for (const xx of [4, w - dw - 4]) digits += digit(String(i), xx, y + 4, dw, dh);          // down the left and the right: tenths of the height
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${lines}" stroke="#fff" stroke-opacity="0.45" stroke-width="1" fill="none"/><path d="${digits}" stroke="#000" stroke-width="4.5" stroke-linecap="round" fill="none"/><path d="${digits}" stroke="#ffe14d" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
}
// Rough price of one new creature: its variant picture (not for the original), its idle clip and the cut-out of the clip.
export const creatureUsd = (u: { edit: number; clip: number; cut: number }, mutated: boolean) => Math.round(((mutated ? u.edit : 0) + u.clip + u.cut) * 1000) / 1000;
