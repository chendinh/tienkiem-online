// Linh Sủng: a small spirit pet that follows the cultivator (2026-11-28). A branch of its own, apart from the Linh Thú that are tamed and fight in the Party.
// A Linh Sủng never adds to its master's stats and never deals damage (2026-11-29, for balance): it has its OWN stats, and they only make its own support
// skill stronger. Linh Lực is how much the skill gives, Linh Mẫn is the chance it acts after a won fight. Each species helps in its own way (Thỏ Ngọc heals,
// Mèo Mây adds Tu Vi, Cá Chép Vàng adds Linh Thạch). One follows at a time; it sits in the "Linh Sủng" slot of the equipment screen, and the bag has a
// "Linh Sủng" tab next to "Vật phẩm" listing them all.
//
// Kept deliberately simple so a casual ("chill") player has nothing to manage:
//   - it hatches from a Linh Noãn (an egg). Only ONE egg is hatched at a time: while one is in the nest no other is found. Every character gets the first;
//   - the one that follows gains experience from every won fight, and never climbs above its master's Level ("thú không vượt chủ");
//   - three forms (Ấu Thể, Thành Thể, Linh Thể), reached at fixed Levels; each form makes its stats stronger;
//   - no hunger, nothing lost while away, no random numbers on the pet itself (its stats come from its species, Level and form).
// The egg drop, the species an egg opens into and whether a skill acts all use hash01 of the save's seed (never the journey's random streams),
// so a save without a Linh Sủng plays exactly as before.
// A Linh Sủng lives in its master's mind (tâm niệm), not in the world: its picture is an ink wash painting (thủy mặc), the opposite of the realistic Linh Thú,
// and the painting grows fuller with each form. It is drawn on its own (never from the character or an item) and the character's portrait never shows it.
// The pictures are a fixed set (species x form, drawn once by `npm run pregen -- --only pets`), so a player never costs a new picture.

export interface Pet { id: number; sp: string; lv: number; xp: number }
export interface Egg { id: number; hatch: number }   // hatch: the tick it opens on (only the first egg of the list is in the nest)
export interface PetBox { list: Pet[]; on: number | null; eggs: Egg[] }

export type PetSkill = 'heal' | 'cult' | 'stones';
export interface PetSpecies {
  id: string; name: string;
  skill: string;           // the name of its support skill
  kind: PetSkill;          // what the skill does after a won fight: heal its master (Linh Lực = % of the maximum Sinh Lực), or add Linh Lực % to the Tu Vi / Linh Thạch of that fight
  luc: [number, number];   // Linh Lực at Level 1, and what each Level adds (before the form's multiplier)
  man: [number, number];   // Linh Mẫn (chance in %, see PET.manCap), the same way
  en: string;              // what it looks like, for the painting
  hue: string;             // its colour in the interface
}
export const PET_SPECIES: PetSpecies[] = [
  { id: 'tho', name: 'Thỏ Ngọc', skill: 'Hồi Xuân', kind: 'heal', luc: [4, 0.2], man: [25, 0.5], hue: '#9fe0d0',
    en: 'a jade rabbit spirit with soft white fur touched with pale jade green, long ears, a tiny crescent moon on its forehead' },
  { id: 'meo', name: 'Mèo Mây', skill: 'Ngộ Đạo', kind: 'cult', luc: [15, 0.4], man: [25, 0.5], hue: '#b9c8ff',
    en: 'a cloud cat spirit with soft silver-blue fur whose tail and paws dissolve into wisps of cloud, calm golden eyes' },
  { id: 'ca', name: 'Cá Chép Vàng', skill: 'Chiêu Tài', kind: 'stones', luc: [15, 0.4], man: [22, 0.5], hue: '#ffcf6e',
    en: 'a golden koi carp spirit floating in the air, gold and vermilion scales, long flowing fins like silk ribbons' },
];
export const PET = {
  hatchTicks: 1440,        // 2 hours of game time (5 s ticks)
  eggDropP: 1 / 2500,      // per won fight while the nest is empty; a character that plays all day wins about 4000 fights (far fewer while it waits at a Bình Cảnh)
  eggMax: 1,               // one egg is hatched at a time
  listMax: 12,             // Linh Sủng kept; a hatch of a species already owned gives that one experience instead (no duplicates to sort)
  dupXp: 1500,             // what such a hatch gives (about one Level in mid game, several early on)
  xpPerWin: 1,
  xpPerLevel: 120,         // experience from Level n to n+1 is xpPerLevel * n: Thành Thể (Lv9) after about 4300 wins, Linh Thể (Lv17) after about 16000. A new one needs a few days to catch up with its master
  manCap: 75,              // Linh Mẫn never passes this (a skill never acts after every fight)
};
export const STAGES = [
  { name: 'Ấu Thể', from: 1, mult: 1 },
  { name: 'Thành Thể', from: 9, mult: 1.2 },    // when the master is Kim Đan
  { name: 'Linh Thể', from: 17, mult: 1.45 },   // when the master is Hóa Thần
];

export const PSP = (id: string) => PET_SPECIES.find((s) => s.id === id) || PET_SPECIES[0];
export const stageOf = (lv: number) => (lv >= STAGES[2].from ? 2 : lv >= STAGES[1].from ? 1 : 0);
export const xpNeed = (lv: number) => PET.xpPerLevel * lv;
// Its own stats: from its species, Level and form only.
export function petStats(p: Pet): { luc: number; man: number } {
  const s = PSP(p.sp), m = STAGES[stageOf(p.lv)].mult;
  return { luc: Math.round((s.luc[0] + s.luc[1] * (p.lv - 1)) * m), man: Math.min(PET.manCap, Math.round((s.man[0] + s.man[1] * (p.lv - 1)) * m)) };
}
// What its skill does, with its numbers, in the player's words.
export function skillText(p: Pet): string {
  const s = PSP(p.sp), { luc, man } = petStats(p);
  const what = s.kind === 'heal' ? `hồi ${luc}% Sinh Lực cho chủ` : s.kind === 'cult' ? `ngộ thêm ${luc}% Tu Vi của trận` : `nhặt thêm ${luc}% Linh Thạch của trận`;
  return `Sau mỗi trận thắng, ${man}% cơ hội ${what}.`;
}
export const petArt = (sp: string, stage: number) => `/art/pets/${sp}_${stage}.jpg`;
export const EGG_ART = '/art/pets/egg.jpg';

export const newBox = (): PetBox => ({ list: [], on: null, eggs: [] });
export const following = (box: PetBox | undefined | null): Pet | null => (box && box.on !== null ? box.list.find((p) => p.id === box.on) || null : null);

// Experience. It stops at its master's Level: the bar stays full until the master climbs.
export function addXp(p: Pet, n: number, masterLv: number): { up: number; stage: boolean } {
  if (n <= 0) return { up: 0, stage: false };
  const st0 = stageOf(p.lv);
  let up = 0;
  p.xp += n;
  while (p.xp >= xpNeed(p.lv) && p.lv < masterLv) { p.xp -= xpNeed(p.lv); p.lv++; up++; }
  if (p.lv >= masterLv) p.xp = Math.min(p.xp, xpNeed(p.lv));
  return { up, stage: stageOf(p.lv) > st0 };
}
export function gainXp(box: PetBox, n: number, masterLv: number): { up: number; stage: boolean } {
  const p = following(box);
  return p ? addXp(p, n, masterLv) : { up: 0, stage: false };
}

// The species an egg opens into: from the save's seed and the egg's id alone.
export const hatchSpecies = (r: number) => PET_SPECIES[Math.min(PET_SPECIES.length - 1, Math.floor(r * PET_SPECIES.length))].id;
