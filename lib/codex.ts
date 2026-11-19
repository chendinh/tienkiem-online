// Sưu Tập: what a player has collected (the album of Dị Biến looks and of artifacts) and the honours (Ấn) earned for it.
// Pure and small: the engine (lib/game.ts) calls noteItem when an item arrives and newHonors after something worth a count has happened; the pages only read.
import * as C from './content';
import { MUTATIONS } from './anim';
import { lookOf } from './zoo';
import type { GameState, Item } from './game';

// ---------------------------------------------------------------- the album of artifacts
// One entry per kind and element (41 kinds x 8 elements = 328). It keeps the best rarity the player has ever held of that kind and element and the picture look of that item,
// so the album shows exactly the picture the player saw. Stored as { key: tier + 8 * art } with a 3-character key, so a full album stays a few kilobytes.
export type Album = Record<string, number>;
export const albumKey = (slot: string, base: string, el: string): string | null => {
  const s = C.SLOTS.indexOf(slot), b = s < 0 ? -1 : C.basesOf(slot).indexOf(base), e = C.EO.indexOf(el);
  return s < 0 || b < 0 || b >= 36 || e < 0 ? null : `${s}${b.toString(36)}${e}`;
};
export const albumPack = (tier: number, art: number | undefined) => tier + (tier >= 3 && art && art > 0 ? 8 * art : 0);
export const albumUnpack = (v: number) => ({ tier: v % 8, art: Math.floor(v / 8) });
export interface AlbumSlot { key: string; slot: string; base: string; el: string }
// every entry the album can have, by kind (the order of the game's own lists)
export const ALBUM_SLOTS: AlbumSlot[] = C.SLOTS.flatMap((slot) => C.basesOf(slot).flatMap((base) => C.EO.map((el) => ({ key: albumKey(slot, base, el)!, slot, base, el }))));
export const ALBUM_TOTAL = ALBUM_SLOTS.length;
// Put an item in the album: true when the album changed (a new kind and element, or a higher rarity of one).
export function noteItem(st: GameState, it: Item): boolean {
  const k = albumKey(it.slot, it.base, it.el);
  if (!k || !Number.isInteger(it.tier) || it.tier < 0 || it.tier > 5) return false;
  const a = st.album || (st.album = {}), cur = a[k];
  if (cur !== undefined && albumUnpack(cur).tier >= it.tier) return false;
  a[k] = albumPack(it.tier, it.art);
  return true;
}
// the same for everything the player holds (used once for a save older than the album, so the first look is not empty)
export function backfill(st: GameState): void {
  if (st.album) return;
  st.album = {};
  for (const it of [...st.bag, ...st.stash, ...Object.values(st.eq)]) if (it) noteItem(st, it);
}

// ---------------------------------------------------------------- the album of Dị Biến looks
// A Dị Biến beast shows one of ten looks decided by its species and number (lib/zoo.ts). The album is what the player owns: Dị Biến beasts are never sold or let go.
export interface MutSlot { sp: string; look: string; have: boolean }
export const mutLooks = (st: GameState): Set<string> => {
  const s = new Set<string>();
  for (const b of st.beasts) { const l = lookOf(b); if (l) s.add(`${b.sp}:${l}`); }
  return s;
};
export const MUT_LOOKS = MUTATIONS.map((m) => ({ id: m.id, name: m.name }));

// ---------------------------------------------------------------- honours
export type HonorGroup = 'thu' | 'he' | 'di' | 'khi';
export interface Ctx { seen: number; tamed: number; el: Record<string, { n: number; seen: number }>; looks: number; mutSp: number; entries: number; t3: number; t4: number; t5: number; full: number }
export interface Honor { id: string; name: string; blurb: string; group: HonorGroup; goal: number; of: (c: Ctx) => number; icon?: string }
export const GROUPS: { id: HonorGroup; name: string; blurb: string }[] = [
  { id: 'thu', name: 'Linh Thú', blurb: 'Gặp và thu phục các loài yêu thú' },
  { id: 'he', name: 'Tám Hệ', blurb: 'Gặp đủ mọi loài của một hệ' },
  { id: 'di', name: 'Dị Biến', blurb: 'Dị Biến thu phục được' },
  { id: 'khi', name: 'Pháp Khí', blurb: 'Pháp khí từng nằm trong tay' },
];
const SPECIES_N = C.SPECIES.length;
const H = (group: HonorGroup, id: string, name: string, blurb: string, goal: number, of: (c: Ctx) => number): Honor => ({ group, id, name, blurb, goal, of });
export const HONORS: Honor[] = [
  H('thu', 'seen10', 'Sơ Nhập Linh Cảnh', 'Đã gặp 10 loài yêu thú.', 10, (c) => c.seen),
  H('thu', 'seen25', 'Du Sơn Giám Thú', 'Đã gặp 25 loài yêu thú.', 25, (c) => c.seen),
  H('thu', 'seen45', 'Vạn Thú Lữ Khách', 'Đã gặp 45 loài yêu thú.', 45, (c) => c.seen),
  H('thu', 'seenAll', 'Thiên Hạ Đồ Giám', 'Đã gặp đủ mọi loài yêu thú.', SPECIES_N, (c) => c.seen),
  H('thu', 'tame10', 'Ngự Thú Học Đồ', 'Đã thu phục 10 loài khác nhau.', 10, (c) => c.tamed),
  H('thu', 'tame25', 'Ngự Thú Sứ', 'Đã thu phục 25 loài khác nhau.', 25, (c) => c.tamed),
  H('thu', 'tame45', 'Ngự Thú Tông Sư', 'Đã thu phục 45 loài khác nhau.', 45, (c) => c.tamed),
  H('thu', 'tameAll', 'Vạn Thú Chi Chủ', 'Đã thu phục đủ mọi loài yêu thú.', SPECIES_N, (c) => c.tamed),
  ...C.EO.map((e) => H('he', `el${e}`, `${e} Hệ Giám Sư`, `Đã gặp đủ mọi loài yêu thú hệ ${e}.`, Math.max(1, (C.SPECIES.filter((s) => s.el[0] === e)).length), (c) => (c.el[e] ? c.el[e].seen : 0))),
  H('di', 'look1', 'Kẻ Gặp Dị Duyên', 'Thu phục Dị Biến đầu tiên.', 1, (c) => c.looks),
  H('di', 'look3', 'Tầm Dị Sứ', 'Có 3 dạng Dị Biến khác nhau.', 3, (c) => c.looks),
  H('di', 'look5', 'Ngũ Dị Linh Chủ', 'Có 5 dạng Dị Biến khác nhau.', 5, (c) => c.looks),
  H('di', 'look10', 'Thập Dị Viên Mãn', 'Có đủ 10 dạng Dị Biến.', MUTATIONS.length, (c) => c.looks),
  H('di', 'mutsp5', 'Dị Thú Tàng Gia', 'Có Dị Biến của 5 loài khác nhau.', 5, (c) => c.mutSp),
  H('di', 'mutsp15', 'Dị Thú Đại Tàng Gia', 'Có Dị Biến của 15 loài khác nhau.', 15, (c) => c.mutSp),
  H('khi', 'ent25', 'Khách Chợ Pháp Khí', 'Từng cầm 25 kiểu pháp khí khác nhau (theo loại và hệ).', 25, (c) => c.entries),
  H('khi', 'ent80', 'Tàng Khí Các Chủ', 'Từng cầm 80 kiểu pháp khí khác nhau.', 80, (c) => c.entries),
  H('khi', 'ent160', 'Vạn Khí Quán Chủ', 'Từng cầm 160 kiểu pháp khí khác nhau.', 160, (c) => c.entries),
  H('khi', 'entAll', 'Thiên Hạ Bảo Khố', 'Từng cầm đủ mọi kiểu pháp khí.', ALBUM_TOTAL, (c) => c.entries),
  H('khi', 't3a', 'Nhập Địa Tàng Gia', 'Từng cầm 10 kiểu pháp khí hạng Địa trở lên.', 10, (c) => c.t3),
  H('khi', 't3b', 'Địa Bảo Tàng Gia', 'Từng cầm 40 kiểu pháp khí hạng Địa trở lên.', 40, (c) => c.t3),
  H('khi', 't4a', 'Thiên Bảo Hữu Duyên', 'Từng cầm 5 kiểu pháp khí hạng Thiên trở lên.', 5, (c) => c.t4),
  H('khi', 't4b', 'Thiên Bảo Tàng Gia', 'Từng cầm 20 kiểu pháp khí hạng Thiên trở lên.', 20, (c) => c.t4),
  H('khi', 't5a', 'Tiên Duyên Hữu Phận', 'Từng cầm một pháp khí hạng Tiên.', 1, (c) => c.t5),
  H('khi', 't5b', 'Tiên Khí Tam Bảo', 'Từng cầm 3 pháp khí hạng Tiên.', 3, (c) => c.t5),
  H('khi', 'full1', 'Bát Hệ Nhất Khí', 'Có một loại pháp khí đủ cả tám hệ.', 1, (c) => c.full),
  H('khi', 'full5', 'Bát Hệ Viên Mãn', 'Có năm loại pháp khí, mỗi loại đủ cả tám hệ.', 5, (c) => c.full),
];
export const honorOf = (id: string) => HONORS.find((h) => h.id === id);

export function context(st: GameState): Ctx {
  const el: Ctx['el'] = {};
  for (const e of C.EO) el[e] = { n: 0, seen: 0 };
  let seen = 0, tamed = 0;
  for (const s of C.SPECIES) {
    const b = st.best[s.id], g = el[s.el[0]];
    if (g) g.n++;
    if (b && b.seen > 0) { seen++; if (g) g.seen++; }
    if (b && b.tamed > 0) tamed++;
  }
  const have = mutLooks(st), looks = new Set<string>(), sps = new Set<string>();
  for (const k of have) { const i = k.indexOf(':'); sps.add(k.slice(0, i)); looks.add(k.slice(i + 1)); }
  let entries = 0, t3 = 0, t4 = 0, t5 = 0;
  const perBase: Record<string, number> = {};
  for (const [k, v] of Object.entries(st.album || {})) {
    const t = albumUnpack(v).tier;
    entries++; if (t >= 3) t3++; if (t >= 4) t4++; if (t >= 5) t5++;
    const bk = k.slice(0, 2); perBase[bk] = (perBase[bk] || 0) + 1;
  }
  const full = Object.values(perBase).filter((n) => n >= C.EO.length).length;
  return { seen, tamed, el, looks: looks.size, mutSp: sps.size, entries, t3, t4, t5, full };
}
// The honours the player has just earned (not yet in player.honors), in the order of the list.
export function newHonors(st: GameState): Honor[] {
  const got = new Set(st.player.honors || []), c = context(st);
  return HONORS.filter((h) => !got.has(h.id) && h.of(c) >= h.goal);
}
