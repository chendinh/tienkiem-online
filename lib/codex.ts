// Sưu Tập: what a player has collected .
// Pure and small: the engine (lib/game.ts) calls noteItem when an item arrives; the pages only read.
import * as C from './content';
import { MUTATIONS } from './anim';
import { lookOf } from './zoo';
import { workersOf } from './work';
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
  for (const b of [...st.beasts, ...workersOf(st.work)]) { const l = lookOf(b); if (l) s.add(`${b.sp}:${l}`); }   // with the ones away at work (lib/work.ts)
  return s;
};
export const MUT_LOOKS = MUTATIONS.map((m) => ({ id: m.id, name: m.name }));
