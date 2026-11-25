// Triển Lãm: the third place of Công việc (components/Expo.tsx). The player puts 3 to 6 things of their own (a piece of equipment or a Linh Thú) on stands among the clouds;
// cultivators fly past on swords, look at them one by one and react: some love what they see and give something, some are not impressed. Nothing is ever taken from the player.
//
// Pure rules, no random numbers drawn: a visitor is made from the save's seed and its running number (hash), so the server can settle hours of visits in a loop and the same
// save always gets the same visitors. The server makes the visits on its tick (lib/game.ts runExpo); the browser only shows them and collects the box (the pieces below).
//
//   Who comes        visitorOf(seed, n): a kind of cultivator (C.NPC_TITLES), a name, a favourite element and how demanding they are (`bar`: the rarity they are used to).
//   What they think  scoreOf(): the rarity of the piece against `bar`, a favourite element, what that kind of cultivator likes, a little luck. reactionOf(): love, wow, like, nothing, sad, angry.
//   What they give   a share of what the piece is worth in Linh Thạch (love, wow, like only), and sometimes a gift that fits the kind of cultivator: a weapon, pills or a Bí Kíp.
//   How often        one visitor about every 5 seconds while 3 or more stands are filled (a little quicker with more stands), up to what 12 offline hours bring. Pay is scaled to the pace (payScale).
import * as C from './content';
import * as A from './arts';
import { BALANCE as B } from './balance';
import { hash32, pick, buyerNamed } from './orders';
import type { Item } from './game';

export const STANDS = 6, MIN_OPEN = 3, LOG_KEEP = 6, BOX_WEAPONS = 3, BOX_BOOKS = 8, BOX_PILLS = 20, FIRST_VISIT_MS = 5_000, MAX_PER_TICK = 4;
export const ROWS = [[0, 1], [2, 3], [4, 5]] as const;   // three tiers of cloud, two stands on each

export type Reaction = 'love' | 'wow' | 'like' | 'sad' | 'angry';
export const REACTIONS: Reaction[] = ['love', 'wow', 'like', 'sad', 'angry'];
export const REACTION_NAME: Record<Reaction, string> = { love: 'Mê', wow: 'Ngạc nhiên', like: 'Thích', sad: 'Thất vọng', angry: 'Chê' };
export type Tally = [number, number, number, number, number];   // how many times each reaction of REACTIONS happened in front of this stand

export interface Stand { kind: 'item' | 'beast'; id: number; was?: boolean /* the piece was locked before it was put here: it stays locked when taken away */; tally: Tally }
export type Gift = { kind: 'weapon'; name: string; tier: number } | { kind: 'pill'; grade: number; n: number } | { kind: 'book'; name: string };
export interface Step { slot: number; r: Reaction | null; stones: number }
export interface Visit { n: number; at: number; who: { name: string; g: 'f' | 'm'; arch: string }; side: 0 | 1; route: Step[]; gift?: Gift }
export interface Box { stones: number; weapons: Item[]; pills: number[]; books: Record<string, number> }
export interface Expo { v: 1; stands: (Stand | null)[]; n: number; next: number; log: Visit[]; box: Box }

export const emptyTally = (): Tally => [0, 0, 0, 0, 0];
export const emptyBox = (): Box => ({ stones: 0, weapons: [], pills: [0, 0, 0], books: {} });
export const newExpo = (): Expo => ({ v: 1, stands: Array.from({ length: STANDS }, () => null), n: 0, next: 0, log: [], box: emptyBox() });
export const isExpo = (x: unknown): x is Expo => !!x && typeof x === 'object' && (x as Expo).v === 1 && Array.isArray((x as Expo).stands) && (x as Expo).stands.length === STANDS && !!(x as Expo).box;
export const filled = (e: Expo): number => e.stands.reduce((a, s) => a + (s ? 1 : 0), 0);
export const isOpen = (e: Expo): boolean => filled(e) >= MIN_OPEN;
/** Is there anything in the box to collect? */
export const boxCount = (b: Box): number => (b.stones > 0 ? 1 : 0) + b.weapons.length + b.pills.reduce((a, n) => a + (n > 0 ? 1 : 0), 0) + Object.keys(b.books).length;
/** Seconds between two visitors, by how many stands are filled: about one every 5 seconds, a little quicker with more stands. Each gap is 0.6 to 1.4 times this, so now and then two come together. */
export const INTERVAL_SEC = [0, 0, 0, 5.5, 5, 4.5, 4];
/** The pace the pay was tuned at when a visitor came every 90 to 56 seconds. A visitor now pays this share of what one of those paid, so a busier stage changes the show and not what an hour is worth. */
const TUNED_SEC = [0, 0, 0, 90, 78, 66, 56];
export const payScale = (open: number): number => { const k = Math.max(MIN_OPEN, Math.min(STANDS, open)); return INTERVAL_SEC[k] / TUNED_SEC[k]; };

// ---- what a stand holds, seen by the visitors: the same numbers for a piece of equipment and a Linh Thú
export interface Exhibit { kind: 'item' | 'beast'; tier: number; el: string; slot?: string; mut?: boolean; level: number; value: number }

// ---- who comes
export interface Visitor { who: { name: string; g: 'f' | 'm'; arch: string }; el: string; bar: number; gen: number }
const BARS = [1, 1, 2, 2, 2, 3];
export function visitorOf(seed: number, n: number): Visitor {
  const key = `${seed}|expo|${n}`, arch = pick(C.NPC_TITLES, `xa|${key}`);
  const bar = Math.max(0, BARS[hash32(`xb|${key}`) % BARS.length] - (arch === 'Tán Tu' ? 1 : 0));   // a wandering rogue is easy to please
  return { who: buyerNamed(key, arch), el: pick(C.EO, `xe|${key}`), bar, gen: 0.8 + (hash32(`xg|${key}`) % 5) * 0.1 };
}

// ---- what they think
const ARMOUR = ['Robe', 'Headwear', 'Footwear', 'Back'], CHARM = ['Talisman', 'Ring', 'Accessory'];
/** What each kind of cultivator likes on top of the rarity: more for the piece they would reach for. */
export function liking(arch: string, x: Exhibit): number {
  switch (arch) {
    case 'Kiếm Tu': return x.slot === 'Weapon' ? 1 : 0;
    case 'Thể Tu': return x.slot && ARMOUR.includes(x.slot) ? 1 : 0;
    case 'Phù Sư': return x.slot && CHARM.includes(x.slot) ? 1 : 0;
    case 'Đan Sư': return x.kind === 'beast' ? 1 : 0;
    case 'Ma Tu': return x.mut ? 2 : 0;
    default: return 0;
  }
}
/** 5 or more: love, 4: wow, 3: like, 2: nothing to say, 1: sad, 0 or less: angry. A piece of the rarity the visitor is used to scores 3. */
export function scoreOf(v: Visitor, x: Exhibit, key: string): number {
  let s = x.tier - v.bar + 3;
  if (x.el === v.el) s += 1;
  s += liking(v.who.arch, x);
  const luck = hash32(`xn|${key}`) % 4;
  return s + (luck === 0 ? -1 : luck === 3 ? 1 : 0);
}
export const reactionOf = (s: number): Reaction | null => (s >= 5 ? 'love' : s === 4 ? 'wow' : s === 3 ? 'like' : s === 2 ? null : s === 1 ? 'sad' : 'angry');

// ---- what they give
/** Share of the piece's worth, in hundredths of a percent. A piece is never used up, so this is small: a full row of Thiên pieces earns a few percent of their worth per hour. */
export const STONE_BP: Partial<Record<Reaction, number>> = { love: 20, wow: 12, like: 5 };
const STONE_MIN: Partial<Record<Reaction, number>> = { love: 2, wow: 1, like: 0 };
/** What a reaction is worth before it is turned into whole Linh Thạch. */
export const stoneShare = (r: Reaction | null, x: Exhibit, gen: number): number => {
  const bp = r && STONE_BP[r];
  return bp ? Math.max(STONE_MIN[r!]!, (x.value * bp * gen) / 10000) : 0;
};
/** Whole Linh Thạch for one look. `scale` (payScale) shrinks it for a busy stage; `u` (0 to 1, drawn from the visit's key) rounds up or down so the average stays exactly right even when a look is worth less than one. Alone, `u` 0.5 is plain rounding. */
export const stonesFor = (r: Reaction | null, x: Exhibit, gen: number, scale = 1, u = 0.5): number => {
  const s = stoneShare(r, x, gen);
  return s > 0 ? Math.floor(s * scale + u) : 0;
};
/** What each kind of cultivator gives when it is moved: weapons, pills or a Bí Kíp. */
export const GIFT_OF: Record<string, 'weapon' | 'pill' | 'book'> = { 'Kiếm Tu': 'weapon', 'Thể Tu': 'weapon', 'Đan Sư': 'pill', 'Tán Tu': 'pill', 'Phù Sư': 'book', 'Ma Tu': 'book' };
const GIFT_P: Partial<Record<Reaction, number>> = { love: 35, wow: 10 };   // per thousand: about two gifts an hour for a full row of Thiên pieces, and a gift is worth about what a few Linh Thạch gifts are
export interface GiftPlan { kind: 'weapon' | 'pill' | 'book'; tier: number }
/** Does this reaction bring a gift (one per visit at most, decided by the best reaction), and of what tier? */
export function giftOf(arch: string, r: Reaction | null, x: Exhibit, key: string, scale = 1): GiftPlan | null {
  const p = r && GIFT_P[r];
  if (!p || hash32(`xp|${key}`) % 100000 >= p * 100 * scale) return null;   // `scale`: payScale, as for the stones
  return { kind: GIFT_OF[arch] || 'pill', tier: Math.max(0, Math.min(3, x.tier - 1)) };
}
export const pillGrade = (tier: number): number => (tier <= 2 ? 0 : tier === 3 ? 1 : 2);
/** The Bí Kíp a visitor brings: of the visitor's favourite element, of a rarity the piece deserves, and one the player could use soon. Worked out from the key alone. */
export function bookFor(el: string, tier: number, level: number, key: string): string | null {
  const classes = A.CLASSES_BY_EL[el] || A.CLASSES_BY_EL.Kim;
  const pool = A.techsOf(pick(classes, `xc|${key}`)).filter((t) => t.minLevel <= level + 2 && t.tier <= tier);
  if (!pool.length) return null;
  const w = pool.map((t) => B.bookTierWeights[t.tier] || 1), total = w.reduce((a, b) => a + b, 0);
  let r = (hash32(`xk|${key}`) % 10000) / 10000 * total;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i].name; }
  return pool[pool.length - 1].name;
}

// ---- when and where
export const intervalMs = (open: number, seed: number, n: number): number => Math.round(INTERVAL_SEC[Math.max(MIN_OPEN, Math.min(STANDS, open))] * 1000 * (0.6 + (hash32(`xi|${seed}|${n}`) % 81) / 100));
/** The stands a visitor looks at, in the order they fly past: 1 to 3 of the filled ones, from the top tier down, and along the tier from the side they came in. */
export function routeOf(e: Expo, seed: number, n: number): { slots: number[]; side: 0 | 1 } {
  const key = `${seed}|expo|${n}`, side = (hash32(`xs|${key}`) % 2) as 0 | 1;
  const open = e.stands.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const want = Math.min(open.length, 1 + (hash32(`xr|${key}`) % 3));
  const chosen = open.map((i) => ({ i, h: hash32(`xv|${key}|${i}`) })).sort((a, b) => a.h - b.h).slice(0, want).map((x) => x.i);
  const rowOf = (i: number) => (i >> 1), col = (i: number) => (i & 1);
  chosen.sort((a, b) => rowOf(a) - rowOf(b) || (side === 0 ? col(a) - col(b) : col(b) - col(a)));
  return { slots: chosen, side };
}

/** The look most visitors gave (the better one when two are level), or null when nobody has looked yet. */
export const topReaction = (t: Tally): { r: Reaction; n: number } | null => REACTIONS.reduce<{ r: Reaction; n: number } | null>((m, r, i) => (t[i] > 0 && (!m || t[i] > m.n) ? { r, n: t[i] } : m), null);
/** The total each reaction was seen, over every stand (the strip under the scene). */
export const talliesOf = (e: Expo): Tally => e.stands.reduce<Tally>((t, s) => (s ? (t.map((x, i) => x + s.tally[i]) as Tally) : t), emptyTally());
/** The rarity of a Linh Thú as a visitor sees it: its size, one step more for a Dị Biến. */
export const beastTier = (cls: number, mut: boolean): number => Math.max(0, Math.min(5, cls + (mut ? 1 : 0)));
