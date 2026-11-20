// Linh Thú Viên for players (/linh-thu-vien): the Dị Biến beasts a player has tamed are put on one of the game's own tall backgrounds and stand on its perches.
// Pure (no server, no browser), shared by the page and the API. The owner's lab (lib/garden.ts, /lab/linh-thu/vien) is a separate thing and stays as it is.
import { MUTATIONS } from './anim';
import { DEFAULT_PERCHES, K_RANGE, snapPerch, ASPECT } from './garden';

// Every Dị Biến beast shows one of these looks, fixed by the beast itself (its species and its number), so the same beast always looks the same
// and one species shows many different Dị Biến. The look decides the picture and the clip; both are made once and shared by every player.
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const variantOf = (sp: string, beastId: number): string => MUTATIONS[fnv(`${sp}#${beastId}`) % MUTATIONS.length].id;
// The look of any Dị Biến beast of the game (its species and number decide it, see variantOf); null for an ordinary beast.
export const lookOf = (b: { sp: string; id: number; mut?: boolean } | null | undefined): string | null => (b && b.mut ? variantOf(b.sp, b.id) : null);
export const variantName = (id: string) => MUTATIONS.find((m) => m.id === id)?.name || id;

export const ZOO_MAX = 8;   // creatures on one background: each is two videos and a WebGL canvas, so a phone holds only a few
export interface ZooBg { id: string; name: string; src: string }
// Only pictures the game already has (nothing is drawn for a player): the tall versions of three zones.
export const ZOO_BGS: ZooBg[] = [
  { id: 'thanhvan', name: 'Thanh Vân', src: '/art/zones/thanhvan_v.jpg' },
  { id: 'tinhha', name: 'Tinh Hà', src: '/art/zones/tinhha_v.jpg' },
  { id: 'xichviem', name: 'Xích Viêm', src: '/art/zones/xichviem_v.jpg' },
];
// The pose a creature takes on a perch: by the kind of place the perch is named for (rock, stream, bank, island, far, left/right, near); any other perch: standing.
const POSE_BY_PERCH: [RegExp, string][] = [[/^(da|xa)/, 'watch'], [/^suoi/, 'drink'], [/^(bo|dao)/, 'rest'], [/^(trai|phai)/, 'walk']];
export const poseOf = (perchId: string): string => POSE_BY_PERCH.find(([r]) => r.test(perchId))?.[1] || 'stand';
export const zooBgOk = (id: unknown): id is string => ZOO_BGS.some((b) => b.id === id);

export interface ZooItem { uid: string; beast: number; perch: string; x: number; y: number; flip: boolean; k: number }
export interface ZooLayout { v: 2; bg: string; lay: Record<string, ZooItem[]> }
export const emptyZoo = (): ZooLayout => ({ v: 2, bg: ZOO_BGS[0].id, lay: {} });

const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// What the page or a client sent, made safe: unknown backgrounds and beasts are dropped, a creature goes to the nearest perch of its background (and so stands
// where a creature can stand), a beast is on a background once, and a background holds at most ZOO_MAX. `own` = the numbers of the player's Dị Biến beasts.
export function parseZoo(raw: unknown, own: ReadonlySet<number>): ZooLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { bg?: unknown; lay?: unknown };
  const out = emptyZoo();
  if (zooBgOk(r.bg)) out.bg = r.bg;
  const lay = (r.lay && typeof r.lay === 'object' ? r.lay : {}) as Record<string, unknown>;
  for (const bg of ZOO_BGS) {
    const perches = DEFAULT_PERCHES[bg.id] || [], list = Array.isArray(lay[bg.id]) ? (lay[bg.id] as unknown[]) : [], items: ZooItem[] = [], uids = new Set<string>(), beasts = new Set<number>();
    for (const it of list as any[]) {
      if (items.length >= ZOO_MAX) break;
      if (!it || typeof it !== 'object' || typeof it.uid !== 'string' || !/^[a-z0-9]{4,12}$/.test(it.uid) || uids.has(it.uid)) continue;
      if (!Number.isInteger(it.beast) || !own.has(it.beast) || beasts.has(it.beast) || !fin(it.x) || !fin(it.y)) continue;
      const s = snapPerch(perches, it.x, it.y, ASPECT);
      if (!s) continue;
      uids.add(it.uid); beasts.add(it.beast);
      items.push({ uid: it.uid, beast: it.beast, perch: s.perch.id, x: r4(s.x), y: r4(s.y), flip: it.flip === true, k: fin(it.k) ? r2(clamp(it.k, K_RANGE.min, K_RANGE.max)) : 1 });
    }
    if (items.length) out.lay[bg.id] = items;
  }
  return out;
}

// How long a creature takes to be made the first time anyone asks for it (its variant picture, one idle clip, the cut-out of the clip), by the step it is at, in minutes.
// A rough guess from the services' own timings, shown to the player as "khoảng N phút"; once made, a creature is there for everybody at once.
// The motion a Linh Thú Viên clip is made with (lib/anim.ts MOTIONS). A cut-out made with another motion (the first version used 'idle') is not used: it was nearly still.
export const ZOO_MOTION = 'live';
export type Stage = 'base' | 'variant' | 'clip' | 'cut';
export type ZooMode = 'video' | 'still';   // how a creature is shown in the pen: a looping video clip, or one still cut-out picture (cheaper to make)
export const ETA_MIN: Record<Stage, number> = { base: 6, variant: 5, clip: 4, cut: 2 };
export const etaText = (stage: Stage | undefined) => `khoảng ${ETA_MIN[stage || 'base']} phút`;

// a colour for each look, to tell them apart at a glance in the tray
export const LOOK_COLOR: Record<string, string> = {
  ngusac: '#e58bff', hoalinh: '#ff7a3d', hanbang: '#8fd8ff', loidien: '#8c6bff', huyetma: '#d03a4e', hoangkim: '#f0c33c', tinhha: '#6c8bff', ngocbich: '#3fd6a2', amminh: '#b3a6e0', thanhmoc: '#7bd25a',
};

// ---- the moving air of a background: a few specks that drift (petals fall in Thanh Vân, starlight and embers rise elsewhere). They are plain CSS animations of small
// elements (transform and opacity only, drawn by the GPU, no video), so they cost almost nothing next to the creatures. Placed by a fixed formula: the same on every render.
export interface Air { kind: 'fall' | 'rise'; shape: 'petal' | 'dot'; color: string; glow: number; n: number; size: [number, number]; dur: [number, number] }
export const AIR: Record<string, Air> = {
  thanhvan: { kind: 'fall', shape: 'petal', color: '#fff0f2', glow: 3, n: 12, size: [4, 8], dur: [16, 28] },
  tinhha: { kind: 'rise', shape: 'dot', color: '#d2e6ff', glow: 8, n: 16, size: [2, 5], dur: [14, 26] },
  xichviem: { kind: 'rise', shape: 'dot', color: '#ffb057', glow: 9, n: 14, size: [2, 5], dur: [9, 17] },
};
export interface Speck { x: number; s: number; dur: number; delay: number; dx: number; rot: number }   // x: % of the width; s: px; dx: px sideways over the whole way
export function specks(bg: string): Speck[] {
  const a = AIR[bg];
  if (!a) return [];
  let r = fnv(`air#${bg}`) || 1;
  const rnd = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
  const mix = (lo: number, hi: number) => Math.round((lo + (hi - lo) * rnd()) * 100) / 100;
  return Array.from({ length: a.n }, (_, i) => {
    const dur = mix(a.dur[0], a.dur[1]);
    return { x: mix(3, 97), s: mix(a.size[0], a.size[1]), dur, delay: -mix(0, dur), dx: mix(-28, 28), rot: Math.round(rnd() * 360) };   // a negative delay: already on its way when the page opens
  });
}

// ---- a second layer of the same kind, fixed in place: things that blink or pulse where the picture has light (fireflies over the grass, stars, the glow of the lava).
// Opacity (and a small drift) only, so it costs about as little as the specks above.
export interface Glow { kind: 'firefly' | 'twinkle'; color: string; glow: number; n: number; size: [number, number]; y: [number, number]; dur: [number, number]; pulses?: Pulse[] }
export interface Pulse { x: number; y: number; w: number; h: number; dur: number; delay: number }   // a soft light blob: centre and size in % of the picture
export const GLOW: Record<string, Glow> = {
  thanhvan: { kind: 'firefly', color: '#e4ff9a', glow: 9, n: 14, size: [3, 5], y: [48, 88], dur: [3, 6] },
  tinhha: { kind: 'twinkle', color: '#ffffff', glow: 10, n: 18, size: [2, 4], y: [3, 58], dur: [2, 5] },
  // the lava river, and the two lava falls, of Xích Viêm's picture
  xichviem: { kind: 'twinkle', color: '#ffd79a', glow: 8, n: 8, size: [2, 3], y: [40, 80], dur: [1.6, 3.6], pulses: [
    { x: 55, y: 67, w: 62, h: 24, dur: 5.5, delay: 0 }, { x: 31, y: 56, w: 18, h: 24, dur: 4.2, delay: -1.7 }, { x: 88, y: 58, w: 20, h: 14, dur: 6.3, delay: -3.1 },
  ] },
};
export interface Spark { x: number; y: number; s: number; dur: number; delay: number; dx: number; dy: number }   // x, y: % of the picture; dx, dy: px a firefly drifts
export function sparks(bg: string): Spark[] {
  const g = GLOW[bg];
  if (!g) return [];
  let r = fnv(`glow#${bg}`) || 1;
  const rnd = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
  const mix = (lo: number, hi: number) => Math.round((lo + (hi - lo) * rnd()) * 100) / 100;
  const drift = g.kind === 'firefly' ? 16 : 0;
  return Array.from({ length: g.n }, () => {
    const dur = mix(g.dur[0], g.dur[1]);
    return { x: mix(4, 96), y: mix(g.y[0], g.y[1]), s: mix(g.size[0], g.size[1]), dur, delay: -mix(0, dur), dx: mix(-drift, drift), dy: mix(-drift, drift) };
  });
}

// ---- a third, very soft layer: the light of the picture's main source breathes (a warm glow and, where the picture has them, a fan of light shafts that sways).
export interface Light { x: number; y: number; r: number; color: string; a: number; rays: boolean }   // centre in % of the picture; r: radius in % of its width; color: 'r,g,b'; a: strength 0..1
export const LIGHT: Record<string, Light> = {
  thanhvan: { x: 44, y: 21, r: 62, color: '255, 226, 160', a: 0.5, rays: true },    // the low sun behind the mountains
  tinhha: { x: 50, y: 30, r: 70, color: '150, 170, 255', a: 0.3, rays: false },     // the glow of the nebula
  xichviem: { x: 52, y: 12, r: 60, color: '255, 196, 150', a: 0.4, rays: true },    // the light coming down through the smoke
};
