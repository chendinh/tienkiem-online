// The fixed pictures of the game (the ones shipped in public/art): which ones exist as a job, what each is drawn from, and where its file goes.
// One list for the two ways of drawing them: `npm run pregen` (writes the files) and the owner's page (draws them on the server, see app/api/admin/art).
import { introSpec, monsterSpec, propSpec, placeSpec, bookSpec } from './avatarSpec';
import * as A from './arts';
import * as C from './content';
import { keyOfSpec } from './assetKey';

export const ART_GROUPS = ['intro', 'monsters', 'shop', 'zones', 'arenas', 'books'] as const;
export type ArtGroup = (typeof ART_GROUPS)[number];
export interface ArtJob { name: string; spec: any; dest: string; group: ArtGroup }

// every picture of the game that is drawn once and kept: `only` limits it to one group
export function artJobs(only = ''): ArtJob[] {
  const jobs: ArtJob[] = [];
  const want = (g: ArtGroup) => !only || only === g;
  if (want('intro')) for (const g of ['f', 'm'] as const) jobs.push({ name: `intro_${g}`, spec: introSpec(g), dest: C.introArt(g), group: 'intro' });
  if (want('monsters')) for (const s of C.SPECIES) jobs.push({ name: s.id, spec: monsterSpec(s.id), dest: C.monsterArt(s.id), group: 'monsters' }, { name: `${s.id}_mut`, spec: monsterSpec(s.id, true), dest: C.monsterArt(s.id, true), group: 'monsters' });
  // Phường Thị goods and materials (inventory icons) and the zone and market scenes
  if (want('shop')) for (const id of Object.keys(C.PROP_EN)) jobs.push({ name: id, spec: propSpec(id), dest: id.startsWith('mat_') ? C.matArt(id.slice(4)) : id.startsWith('ui_') ? C.uiArt(id.slice(3)) : C.shopArt(id), group: 'shop' });
  if (want('zones')) for (const id of Object.keys(C.PLACE_EN).filter((k) => !k.startsWith('arena_'))) jobs.push({ name: `zone_${id}`, spec: placeSpec(id), dest: C.zoneArt(id), group: 'zones' });
  if (want('arenas')) for (const a of C.ARENAS) jobs.push({ name: `arena_${a.id}`, spec: placeSpec(`arena_${a.id}`), dest: C.arenaArt(a.id), group: 'arenas' });
  if (want('books')) for (const n of [...Object.values(A.TECHS).filter((t) => !t.basic).map((t) => t.name), ...A.METHODS.map((m) => m.name)]) jobs.push({ name: `book_${C.slug(n)}`, spec: bookSpec(n), dest: C.techArt(n), group: 'books' });
  return jobs;
}

// The key a fixed picture is remembered under in the database (image_index): the file path without the "/art/" in front.
export const artKey = (dest: string) => `art|${dest.replace(/^\/art\//, '')}`;
const KEY_OF_SPEC = (() => {
  const g = globalThis as any;
  return (g.__tutienArtKeys as Map<string, string>) || (g.__tutienArtKeys = new Map<string, string>());
})();
// The fixed picture a drawing request is for (null for every other picture). Asked when a picture is saved, so the file path of that picture finds it from then on.
export function artKeyOfSpec(spec: any): string | null {
  if (!spec || typeof spec !== 'object' || spec.kind === 'item') return null;   // the thousands of item icons have their own keys
  if (!KEY_OF_SPEC.size) for (const j of artJobs()) KEY_OF_SPEC.set(JSON.stringify(j.spec), artKey(j.dest));
  return KEY_OF_SPEC.get(JSON.stringify(spec)) || null;
}

// ---- what the owner's button draws: item icons first (every drop shows one), then the fixed pictures --------------------------------------------------------------------------
export type TodoGroup = ArtGroup | 'looks';
export interface Todo { spec: any; label: string; group: TodoGroup; dest?: string }   // dest only for a fixed picture (its file path)
// One press of the button draws up to this many points of pictures: an item icon is 1 (small, quick), a book cover or a scene is 2. One press must fit in the five minutes a serverless
// function may run, and the drawing is one picture at a time (fal).
export const DRAW_POINTS = 24;
export const pointsOf = (t: Todo) => (t.group === 'looks' ? 1 : 2);
export function takeBatch(todo: Todo[], limit = DRAW_POINTS): Todo[] {
  const out: Todo[] = [];
  let used = 0;
  for (const t of todo) { if (out.length && used + pointsOf(t) > limit) break; out.push(t); used += pointsOf(t); }
  return out;
}

// Every common look of every item base: Phàm, Hoàng (no element) and Huyền (one per element), the icons almost every drop shows (the same list as scripts/draw-wanted.ts).
export function commonLooks(): Todo[] {
  const out: Todo[] = [];
  for (const slot of C.SLOTS) for (const base of C.basesOf(slot)) {
    out.push({ spec: { kind: 'item', slot, base, tier: 0, e: '' }, label: base, group: 'looks' }, { spec: { kind: 'item', slot, base, tier: 1, e: '' }, label: base, group: 'looks' });
    for (const e of C.EO) out.push({ spec: { kind: 'item', slot, base, tier: 2, e }, label: base, group: 'looks' });
  }
  return out;
}
// Looks that players asked for while drawing was off or limited (image_wanted): Địa and Thiên are never drawn until the owner allows it (DRAW_DIA_ART, DRAW_THIEN_ART), the rest yes.
export function wantedDrawable(spec: any): boolean {
  const t = Number(spec && spec.tier);
  return t >= 0 && t <= 2 || t === 3 && process.env.DRAW_DIA_ART === '1' || t === 4 && process.env.DRAW_THIEN_ART === '1';
}
// The item icons that have no picture yet (`have` = the keys that have one, in any style): the common looks, then the wanted ones. Pure.
export function missingLooks(common: Todo[], wanted: any[], have: { has(k: string): boolean }): Todo[] {
  const out: Todo[] = [], seen = new Set<string>();
  const add = (t: Todo) => { const k = keyOfSpec(t.spec); if (!k || seen.has(k)) return; seen.add(k); if (!have.has(k)) out.push(t); };
  for (const t of common) add(t);
  for (const w of wanted) if (w && w.kind === 'item' && wantedDrawable(w)) add({ spec: w, label: String(w.base || w.slot), group: 'looks' });
  return out;
}
export const fixedTodos = (jobs: ArtJob[]): Todo[] => jobs.map((j) => ({ spec: j.spec, label: j.dest.replace(/^\/art\//, ''), group: j.group, dest: j.dest }));

// Why the image service would refuse a new drawing right now (null when it would not): drawing off, the provider locked, today's money used up, or this instance's hourly limit.
// Asked from the same numbers request() uses (lib/imagegen.ts), so the owner sees the real reason instead of a button that seems to do nothing.
export type Blocked = { why: 'off' | 'locked' | 'budget' | 'hour'; detail?: string } | null;
export function blockedBy(P: { enabled: boolean }, i: { locked?: string; budget?: { spentUsd: number; capUsd: number }; hour?: { items: number; itemMax: number } }): Blocked {
  if (!P.enabled) return { why: 'off' };
  if (i.locked) return { why: 'locked', detail: String(i.locked).slice(0, 120) };
  if (i.budget && i.budget.spentUsd >= i.budget.capUsd) return { why: 'budget' };
  if (i.hour && i.hour.items >= i.hour.itemMax) return { why: 'hour' };
  return null;
}
