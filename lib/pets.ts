// Linh Sủng: a small spirit pet that follows the cultivator (2026-11-28). A branch of its own, apart from the Linh Thú that are tamed and fight in the Party:
// a Linh Sủng never deals damage, it only makes its master stronger (a talent that adds to one of the master's stats). One follows at a time; it sits in the
// "Linh Sủng" slot of the equipment screen (the slot that was the "Cơ duyên" placeholder).
//
// Kept deliberately simple so a casual ("chill") player has nothing to manage:
//   - it hatches from a Linh Noãn (an egg) after a while of game time; every character gets one egg, more come rarely after a won fight;
//   - the one that follows gains experience from every won fight, and never climbs above its master's Level ("thú không vượt chủ");
//   - three forms (Ấu Thể, Thành Thể, Linh Thể), reached at fixed Levels; each form makes the talent stronger;
//   - no hunger, nothing lost while away, no random numbers on the pet itself.
// Hatching and the egg drop use hash01 of the save's seed (never the journey's random streams), so a save without a Linh Sủng plays exactly as before.
// A Linh Sủng lives in its master's mind (tâm niệm), not in the world: its picture is an ink wash painting (thủy mặc), the opposite of the realistic Linh Thú,
// and the painting grows fuller with each form. It is drawn on its own (never from the character or an item) and the character's portrait never shows it.
// The pictures are a fixed set (species x form, drawn once by `npm run pregen -- --only pets`), so a player never costs a new picture.

export interface Pet { id: number; sp: string; lv: number; xp: number }
export interface Egg { id: number; hatch: number }   // hatch: the tick it opens on
export interface PetBox { list: Pet[]; on: number | null; eggs: Egg[] }

export type PetStat = 'hp' | 'cult' | 'luck';
export interface PetSpecies {
  id: string; name: string;
  talent: string;          // the name of its gift
  stat: PetStat;           // which of the master's stats it adds to
  unit: string;            // how the number reads ('%' or '')
  base: number; per: number;   // the talent at Level 1, and what each Level adds (before the form's multiplier)
  en: string;              // what it looks like, for the picture
  hue: string;             // a colour for its frame while there is no picture
}
export const PET_SPECIES: PetSpecies[] = [
  { id: 'tho', name: 'Thỏ Ngọc', talent: 'Hộ Thể', stat: 'hp', unit: '%', base: 4, per: 0.3, hue: '#9fe0d0',
    en: 'a jade rabbit spirit with soft white fur touched with pale jade green, long ears, a tiny crescent moon on its forehead' },
  { id: 'meo', name: 'Mèo Mây', talent: 'Ngộ Đạo', stat: 'cult', unit: '%', base: 3, per: 0.25, hue: '#b9c8ff',
    en: 'a cloud cat spirit with soft silver-blue fur whose tail and paws dissolve into wisps of cloud, calm golden eyes' },
  { id: 'ca', name: 'Cá Chép Vàng', talent: 'Phúc Vận', stat: 'luck', unit: '', base: 2, per: 0.2, hue: '#ffcf6e',
    en: 'a golden koi carp spirit floating in the air, gold and vermilion scales, long flowing fins like silk ribbons' },
];
export const PET = {
  hatchTicks: 1440,        // 2 hours of game time (5 s ticks)
  eggDropP: 1 / 2500,      // per won fight; a character that plays all day wins about 4000 fights (far fewer while it waits at a Bình Cảnh), so one or two eggs a day
  eggMax: 3,               // eggs waiting at once (a full nest finds no more)
  listMax: 12,             // Linh Sủng kept; a hatch of a species already owned gives that one experience instead (no duplicates to sort)
  dupXp: 1500,             // what such a hatch gives (about one Level in mid game, several early on)
  xpPerWin: 1,
  xpPerLevel: 120,         // experience from Level n to n+1 is xpPerLevel * n: Thành Thể (Lv9) after about 4300 wins, Linh Thể (Lv17) after about 16000. A new one needs a few days to catch up with its master
};
export const STAGES = [
  { name: 'Ấu Thể', from: 1, mult: 1 },
  { name: 'Thành Thể', from: 9, mult: 1.3 },    // when the master is Kim Đan
  { name: 'Linh Thể', from: 17, mult: 1.6 },    // when the master is Hóa Thần
];

export const PSP = (id: string) => PET_SPECIES.find((s) => s.id === id) || PET_SPECIES[0];
export const stageOf = (lv: number) => (lv >= STAGES[2].from ? 2 : lv >= STAGES[1].from ? 1 : 0);
export const xpNeed = (lv: number) => PET.xpPerLevel * lv;
export const talentOf = (p: Pet) => { const s = PSP(p.sp); return Math.round((s.base + s.per * (p.lv - 1)) * STAGES[stageOf(p.lv)].mult); };
export const talentText = (p: Pet) => { const s = PSP(p.sp); return `${STAT_VI[s.stat]} +${talentOf(p)}${s.unit}`; };
export const STAT_VI: Record<PetStat, string> = { hp: 'Sinh Lực tối đa', cult: 'Tốc độ tu luyện', luck: 'May Mắn' };
export const petArt = (sp: string, stage: number) => `/art/pets/${sp}_${stage}.jpg`;
export const EGG_ART = '/art/pets/egg.jpg';

export const newBox = (): PetBox => ({ list: [], on: null, eggs: [] });
export const following = (box: PetBox | undefined | null): Pet | null => (box && box.on !== null ? box.list.find((p) => p.id === box.on) || null : null);

// What the Linh Sủng that follows adds to its master's stats: hp is a share of the base Sinh Lực (in %), cult is % of Tu Vi, luck is points.
export function petBonus(box: PetBox | undefined | null): { hp: number; cult: number; luck: number } {
  const out = { hp: 0, cult: 0, luck: 0 }, p = following(box);
  if (p) out[PSP(p.sp).stat] = talentOf(p);
  return out;
}

// Experience for the one that follows. It stops at its master's Level: the bar stays full until the master climbs.
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
