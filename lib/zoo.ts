// Linh Thú Viên for players (/linh-thu-vien): the Dị Biến beasts a player has tamed are put on one of the game's own tall backgrounds and stand on its perches.
// Pure (no server, no browser), shared by the page and the API. The owner's lab (lib/garden.ts, /lab/linh-thu/vien) is a separate thing and stays as it is.
import { MUTATIONS } from './anim';
import { DEFAULT_PERCHES, K_RANGE, snapPerch, ASPECT } from './garden';

// Every Dị Biến beast shows one of these looks, fixed by the beast itself (its species and its number), so the same beast always looks the same
// and one species shows many different Dị Biến. The look decides the picture and the clip; both are made once and shared by every player.
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const variantOf = (sp: string, beastId: number): string => MUTATIONS[fnv(`${sp}#${beastId}`) % MUTATIONS.length].id;
export const variantName = (id: string) => MUTATIONS.find((m) => m.id === id)?.name || id;

export const ZOO_MAX = 8;   // creatures on one background: each is two videos and a WebGL canvas, so a phone holds only a few
export interface ZooBg { id: string; name: string; src: string }
// Only pictures the game already has (nothing is drawn for a player): the tall versions of three zones.
export const ZOO_BGS: ZooBg[] = [
  { id: 'thanhvan', name: 'Thanh Vân', src: '/art/zones/thanhvan_v.jpg' },
  { id: 'tinhha', name: 'Tinh Hà', src: '/art/zones/tinhha_v.jpg' },
  { id: 'xichviem', name: 'Xích Viêm', src: '/art/zones/xichviem_v.jpg' },
];
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
export type Stage = 'base' | 'variant' | 'clip' | 'cut';
export const ETA_MIN: Record<Stage, number> = { base: 6, variant: 5, clip: 4, cut: 2 };
export const etaText = (stage: Stage | undefined) => `khoảng ${ETA_MIN[stage || 'base']} phút`;

// a colour for each look, to tell them apart at a glance in the tray
export const LOOK_COLOR: Record<string, string> = {
  ngusac: '#e58bff', hoalinh: '#ff7a3d', hanbang: '#8fd8ff', loidien: '#8c6bff', huyetma: '#d03a4e', hoangkim: '#f0c33c', tinhha: '#6c8bff', ngocbich: '#3fd6a2', amminh: '#b3a6e0', thanhmoc: '#7bd25a',
};
