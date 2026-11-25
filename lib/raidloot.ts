// Phó Bản's prize (2026-11-26): three Thiên pieces a day, known from midnight so the lobby can show them before the fight. After the fight each piece goes to one
// cultivator, each drawn on its own: a fighter's chance at a piece is its share of all the damage dealt. Whoever fell still counts; whoever dealt nothing cannot get one.
// One fighter may get more than one piece (each draw is its own, so the chance is exactly the share). The record of who got what is in the film, for everyone to see.
//
// A piece is made at its winner's level (the level of the fighter's snapshot), with the most affixes a Thiên piece can have and every roll near the top of its range,
// so a prize piece is always a strong one. The same day, piece and level always give the same piece: what the lobby shows a player is what that player would get.
import * as C from './content';
import { BALANCE as B } from './balance';
import { rng } from './raid';
import type { Item } from './game';

export const LOOT_N = 3;
export const LOOT_TIER = 4;      // Thiên
export const LOOT_FLOOR = 0.85;  // every roll of a prize piece lands in the top 15% of its range (a Thiên piece found on a journey: anywhere above 45%)

/** One prize piece of a day, before it has a level: its look and name, and its rolls as fractions of their ranges. */
export interface LootDrop { slot: string; base: string; el: string; art?: number; name: string; u: number; aff: { id: string; u: number }[] }
/** A prize piece made for a level (an Item without its id: the save gives it one when it is taken). */
export type LootItem = Omit<Item, 'id'>;
/** Who got a piece: the fighter (index in the film), the piece made at their level, and their chance at it (their share of the damage). */
export interface LootWon { k: number; to: number; p: number; item: LootItem }

export interface LootLook { base: string; el: string; art: number }
/** The three pieces of a day: three different kinds of gear, each with the look of a Thiên picture that already exists (`looksFor`, lib/daily.ts thienLooksFor;
 *  no new picture is ever drawn for a prize), else a plain piece of that kind. */
export function lootOfDay(day: string, looksFor: (slot: string) => LootLook[]): LootDrop[] {
  const r = rng(`raid|loot|${day}`), pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
  const slots = C.SLOTS.slice();
  for (let k = slots.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [slots[k], slots[j]] = [slots[j], slots[k]]; }
  return slots.slice(0, LOOT_N).map((slot) => {
    const pool = looksFor(slot);
    let base: string, el: string, art: number | undefined;
    if (pool.length) { const l = pick(pool); base = l.base; el = l.el; art = l.art; }
    else { base = pick(C.basesOf(slot)); el = pick(C.EO); }
    const name = `${pick(C.PROPER1)} ${pick(C.PROPER2)} ${base}`;
    const top = () => LOOT_FLOOR + (1 - LOOT_FLOOR) * r();
    const u = top(), aff: LootDrop['aff'] = [], used = new Set<string>();
    let pre = 0, suf = 0;
    for (let i = 0; i < B.affixCountByTier[LOOT_TIER][1]; i++) {
      const cand = C.AFFIX.filter((a) => !used.has(a.id) && !(a.kind === 'p' && pre >= B.maxPrefix) && !(a.kind === 's' && suf >= B.maxSuffix));
      if (!cand.length) break;
      const a = pick(cand);
      used.add(a.id); if (a.kind === 'p') pre++; else suf++;
      aff.push({ id: a.id, u: top() });
    }
    return { slot, base, el, ...(art !== undefined ? { art } : {}), name, u, aff };
  });
}

/** A prize piece made at a level, the way lib/game.ts genItem makes a piece (the same numbers for the same rolls). */
export function lootItem(d: LootDrop, level: number): LootItem {
  const lvl = Math.max(1, Math.min(B.playableLevelCap, Math.round(level) || 1));
  const scale = (1 + 0.12 * (lvl - 1)) * B.gearScale;
  const im = C.SLOT_IMPL[d.slot];
  const implV = Math.max(1, Math.round((im.r[0] + d.u * (im.r[1] - im.r[0])) * scale));
  const affixes = d.aff.flatMap(({ id, u }) => {
    const a = C.AFFIX.find((x) => x.id === id);
    return a ? [{ id: a.id, label: a.label, stat: a.stat, value: Math.max(1, Math.round((a.r[0] + u * (a.r[1] - a.r[0])) * scale)) }] : [];
  });
  let power = implV * C.PW[im.stat];
  for (const a of affixes) power += a.value * C.PW[a.stat];
  return { base: d.base, slot: d.slot, name: d.name, tier: LOOT_TIER, level: lvl, el: d.el, ...(d.art !== undefined ? { art: d.art } : {}), impl: { stat: im.stat, value: implV }, affixes, power: Math.round(power) };
}

/** Who gets each piece: one draw per piece, a fighter's chance being its share of the damage. -1 when nobody dealt any. */
export function lootDraw(day: string, dmg: number[]): number[] {
  const total = dmg.reduce((a, d) => a + Math.max(0, d), 0);
  return Array.from({ length: LOOT_N }, (_, k) => {
    if (total <= 0) return -1;
    let x = rng(`raid|loot|${day}|${k}`)() * total;
    for (let i = 0; i < dmg.length; i++) { const d = Math.max(0, dmg[i]); if (d <= 0) continue; x -= d; if (x < 0) return i; }
    for (let i = dmg.length - 1; i >= 0; i--) if (dmg[i] > 0) return i;
    return -1;
  });
}

/** The pieces of a fought day, each made at its winner's level. */
export function lootWon(day: string, drops: LootDrop[], levels: number[], dmg: number[]): LootWon[] {
  const total = dmg.reduce((a, d) => a + Math.max(0, d), 0) || 1, to = lootDraw(day, dmg);
  return drops.flatMap((d, k) => (to[k] >= 0 ? [{ k, to: to[k], p: Math.max(0, dmg[to[k]]) / total, item: lootItem(d, levels[to[k]]) }] : []));
}
