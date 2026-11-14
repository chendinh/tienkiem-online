// Daily content: one "pack" per UTC day, written by the daily job (lib/server/dailygen.ts) and kept in the database.
// A pack holds a new creature, a chapter of the world chronicle and short journey beats for every zone.
// This file is shared by the engine and the browser and has no server imports. The server fills the registry before it settles a save
// (lib/server/dailystore.ts); the browser fills it from /api/daily. With an empty registry the engine behaves exactly as before.
import * as C from './content';

export interface DailySpecies extends C.Species { day: string; zones: string[]; legend: string; en: string; art?: string }
export interface DailyPack {
  day: string;                                // YYYY-MM-DD (UTC)
  title: string; chronicle: string;           // the chapter of the chronicle
  tales: Record<string, string[]>;            // zone id -> journey beats shown in the feed
  beast: DailySpecies;
}

export const FEATURE_DAYS = 14;               // a creature roams its zones for this many days after it appears
export const TODAY_BOOST = 3;                 // and is three times as common on its first day
export const TALE_EVERY = 60;                 // ticks between two journey beats (5 minutes of play)
export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

let REG: DailyPack[] = [];
export const dailyPacks = () => REG;
export const dailySpecies = () => REG.map((p) => p.beast);
export const dailyVersion = () => (REG.length ? REG[REG.length - 1].day : '');
export const packOn = (day: string) => REG.find((p) => p.day === day) || null;

// Replace the registry (oldest first). Pictures and the English prompt text go where the image code already looks.
export function setDaily(packs: DailyPack[]) {
  const base = new Set(C.SPECIES.map((s) => s.id));
  for (const p of REG) { delete C.SPECIES_EN[p.beast.id]; delete C.DAILY_ART[p.beast.id]; }
  REG = [...packs].filter((p) => p && p.beast && !base.has(p.beast.id)).sort((a, b) => (a.day < b.day ? -1 : 1));
  for (const p of REG) { C.SPECIES_EN[p.beast.id] = p.beast.en; if (p.beast.art) C.DAILY_ART[p.beast.id] = p.beast.art; }
}

export const allSpecies = (): C.Species[] => (REG.length ? [...C.SPECIES, ...dailySpecies()] : C.SPECIES);

// Species that can appear in a zone at time `ms`, with their weights. Static species keep their own table; daily ones come after them,
// so the weight list of an empty registry is the old list.
export function dailyWeights(zoneId: string, ms: number): number[] {
  if (!REG.length) return [];
  const today = Date.parse(dayKey(ms) + 'T00:00:00Z');
  return REG.map((p) => {
    const age = Math.round((today - Date.parse(p.day + 'T00:00:00Z')) / 86400e3);
    if (age < 0 || age >= FEATURE_DAYS || !p.beast.zones.includes(zoneId)) return 0;
    return age === 0 ? TODAY_BOOST : 1;
  });
}

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
