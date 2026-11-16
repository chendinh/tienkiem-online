// Daily content: one "pack" per UTC day, written by the daily job (lib/server/dailygen.ts) and kept in the database.
// A pack holds a new creature, a new kind of weapon, a chapter of the world chronicle and short journey beats for every zone.
// Next to the packs lives the shared relic pool: Thiên and Tiên items that players dissolved, whose name and picture others can find again.
// This file is shared by the engine and the browser and has no server imports. The server fills the registry before it settles a save
// (lib/server/dailystore.ts); the browser fills it from /api/daily. With an empty registry the engine behaves exactly as before.
import * as C from './content';

export interface DailySpecies extends C.Species { day: string; zones: string[]; legend: string; en: string; art?: string }
// A new weapon base. `tiers` lists the rarities (0 = Phàm ... 3 = Địa) it can drop in; `cls` is its môn pháp.
export interface DailyWeapon { base: string; en: string; cls: string; tiers: number[]; day: string }
export interface DailyPack {
  day: string;                                // YYYY-MM-DD (UTC)
  title: string; chronicle: string;           // the chapter of the chronicle
  tales: Record<string, string[]>;            // zone id -> journey beats shown in the feed
  beast: DailySpecies;
  weapon?: DailyWeapon;
}
// A dissolved Thiên or Tiên item. Only its look is kept (never its numbers): whoever finds it again gets freshly rolled stats.
export interface Relic { tier: number; slot: string; base: string; el: string; art: number; name: string; tien?: string }
export const relicSig = (r: { tier: number; slot: string; base: string; art: number }) => `${r.tier}|${r.slot}|${r.base}|${r.art}`;
// What a save asks of the shared pool. A relic belongs to ONE save at a time: 'take' claims it (the server refuses if another save already holds it),
// 'give' hands a dissolved item back so the next finder can claim it.
export type RelicOp = ({ op: 'give' } & Relic) | { op: 'take'; sig: string };

export const FEATURE_DAYS = 14;               // for this many days after it appears, a creature or weapon is "new"...
export const TODAY_BOOST = 3;                 // ...and three times as common on its first day
export const TAIL_WEIGHT = 0.4;               // afterwards it stays in the game for good, at this weight (a static species or weapon has weight 1)
export const RELIC_P = 0.35;                  // a Thiên or Tiên drop reuses a dissolved item's name and picture with this chance
export const RELIC_PER_DAY = 2;               // at most this many per save and day
export const TALE_EVERY = 60;                 // ticks between two journey beats (5 minutes of play)
export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY_MS = 86400e3;
const ageDays = (day: string, ms: number) => Math.round((Date.parse(dayKey(ms) + 'T00:00:00Z') - Date.parse(day + 'T00:00:00Z')) / DAY_MS);
const freshWeight = (age: number) => (age < 0 ? 0 : age === 0 ? TODAY_BOOST : age < FEATURE_DAYS ? 1 : TAIL_WEIGHT);

let REG: DailyPack[] = [];
let RELICS: Relic[] = [];
export const dailyPacks = () => REG;
export const dailySpecies = () => REG.map((p) => p.beast);
export const dailyVersion = () => (REG.length ? REG[REG.length - 1].day : '');
export const packOn = (day: string) => REG.find((p) => p.day === day) || null;

// Replace the registry (oldest first). Pictures, the English text and the weapon tables go where the image and art code already look.
export function setDaily(packs: DailyPack[]) {
  const base = new Set(C.SPECIES.map((s) => s.id));
  const staticWeapons = new Set(C.SLOT_BASE.Weapon);
  for (const p of REG) {
    delete C.SPECIES_EN[p.beast.id]; delete C.DAILY_ART[p.beast.id];
    if (p.weapon) { delete C.BASE_EN[p.weapon.base]; delete C.PLACE_WEAPON[p.weapon.base]; delete C.WEAPON_CLASS[p.weapon.base]; }
  }
  C.EXTRA_BASE.Weapon = [];
  REG = [...packs].filter((p) => p && p.beast && !base.has(p.beast.id)).sort((a, b) => (a.day < b.day ? -1 : 1));
  for (const p of REG) {
    C.SPECIES_EN[p.beast.id] = p.beast.en; if (p.beast.art) C.DAILY_ART[p.beast.id] = p.beast.art;
    const w = p.weapon;
    if (w && !staticWeapons.has(w.base) && !C.EXTRA_BASE.Weapon.includes(w.base)) {
      const twin = C.SLOT_BASE.Weapon.find((b) => C.WEAPON_CLASS[b] === w.cls);   // it is held like the static weapons of its môn
      C.BASE_EN[w.base] = w.en; C.WEAPON_CLASS[w.base] = w.cls; C.PLACE_WEAPON[w.base] = (twin && C.PLACE_WEAPON[twin]) || 'It is held in the right hand.';
      C.EXTRA_BASE.Weapon.push(w.base);
    }
  }
}

export const allSpecies = (): C.Species[] => (REG.length ? [...C.SPECIES, ...dailySpecies()] : C.SPECIES);

// Species that can appear in a zone at time `ms`, with their weights. Static species keep their own table; daily ones come after them,
// so the weight list of an empty registry is the old list.
export function dailyWeights(zoneId: string, ms: number): number[] {
  if (!REG.length) return [];
  return REG.map((p) => (p.beast.zones.includes(zoneId) ? freshWeight(ageDays(p.day, ms)) : 0));
}

// New weapon bases that can drop at rarity `tier` at time `ms`, with their weights (a static weapon weighs 1).
export function weaponPool(tier: number, ms: number): { base: string; w: number }[] {
  if (!REG.length || tier > 3) return [];
  const out: { base: string; w: number }[] = [];
  for (const p of REG) { const w = p.weapon; if (w && w.tiers.includes(tier) && C.EXTRA_BASE.Weapon.includes(w.base)) { const x = freshWeight(ageDays(p.day, ms)); if (x > 0) out.push({ base: w.base, w: x }); } }
  return out;
}

export const setRelics = (list: Relic[]) => { RELICS = list; };
export const relicsFor = (tier: number, slot: string): Relic[] => (RELICS.length ? RELICS.filter((r) => r.tier === tier && r.slot === slot && (slot !== 'Weapon' || C.basesOf(slot).includes(r.base))) : []);

// The journey beat for this tick, if any. No random numbers are used, so it never moves the engine's streams.
export function taleAt(zoneId: string, ms: number, tick: number): string | null {
  if (!REG.length || tick % TALE_EVERY !== 0) return null;
  const p = packOn(dayKey(ms));
  const list = p && p.tales[zoneId];
  return list && list.length ? list[(tick / TALE_EVERY) % list.length] : null;
}

// The line announcing the day's chronicle chapter, once per day and save.
export const newsAt = (ms: number): { day: string; text: string } | null => {
  const p = packOn(dayKey(ms));
  return p ? { day: p.day, text: `Nhật Ký Thiên Hạ, ngày ${p.day.split('-').reverse().join('/')}: ${p.title}. Mở Thiên Thư để đọc.` } : null;
};

export const legendOf = (id: string) => REG.find((p) => p.beast.id === id)?.beast.legend || '';

// Marks shown on an item: `isNew` while its weapon kind is still within its first FEATURE_DAYS days, `exclusive` for every Thiên or Tiên item of any slot
// (each of them has a picture of its own). Read only from the registry and the item, so it needs no saved state.
export function itemMarks(it: { slot: string; base: string; tier: number }, nowMs = Date.now()): { isNew: boolean; exclusive: boolean } {
  const exclusive = it.tier >= 4;
  if (it.slot !== 'Weapon') return { isNew: false, exclusive };
  const p = REG.find((x) => x.weapon && x.weapon.base === it.base);
  return { isNew: !!p && ageDays(p.day, nowMs) < FEATURE_DAYS, exclusive };
}
