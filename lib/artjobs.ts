// The fixed pictures of the game (the ones shipped in public/art): which ones exist as a job, what each is drawn from, and where its file goes.
// One list for the two ways of drawing them: `npm run pregen` (writes the files) and the owner's page (draws them on the server, see app/api/admin/art).
import { introSpec, monsterSpec, propSpec, placeSpec, bookSpec } from './avatarSpec';
import * as A from './arts';
import * as C from './content';

export const ART_GROUPS = ['intro', 'monsters', 'shop', 'zones', 'arenas', 'books'] as const;
export type ArtGroup = (typeof ART_GROUPS)[number];
// How many pictures one press of the owner's button draws. The drawing is one at a time (fal), so a press fits in the five minutes a serverless function may run.
export const ART_BATCH = 12;
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
