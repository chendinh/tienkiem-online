// Công việc, the kinds of job that ask for a NUMBER of something (the job of finding items is lib/orders.ts): Tìm thú (beasts), Đặt đan (Hồi Khí Đan) and Nguyên liệu (materials).
// Like Tìm đồ, a buyer stays until everything asked has been handed over, and then a new one takes the place. Whatever the player has is handed over at any time ("có bao nhiêu đưa bấy nhiêu"):
// each handover is paid at once, and when the last one comes there is a bonus and goods on top. The six places of the board keep their kind: 2 for beasts, 2 for pills, 2 for materials.
// The buyers come from the world seed and a running number alone (no random number is drawn from the game's streams) and are written into the save, like Tìm đồ.
// Nothing here may pay more than the shop would: pills can be bought, so a pill job pays less than the price of the pills it asks, and its goods are worth less than what is left.
// (tests/jobs.test.ts checks that buying pills only to hand them over always loses Linh Thạch.) Beasts and materials cannot be bought, so they are paid a multiple of what selling them gives.
// Pills and materials get harder the more of them the player has finished (the "bậc", rank 0 to 5, counted per kind in `board.done`): bigger orders, rarer materials, higher grades of pill, and better pay.
// Without it the loop gather materials, make pills, hand over pills would stay the same size forever.
import * as C from './content';
import * as D from './daily';
import * as O from './orders';
import { BALANCE as B } from './balance';

export type JobType = 'beast' | 'pill' | 'mat';
// `sp` a species, `el` an element of the species, `minCls` the least size class (0 Tí Hon .. 4 Khổng Lồ); a Dị Biến is never asked for (it is never sold).
export type Ask = { t: 'beast'; sp?: string; el?: string; minCls?: number } | { t: 'pill'; grade: number } | { t: 'mat'; id: string };
// `mult`: pay for each unit as a percentage of its value (the beast's release value, the pill's sell-back price, the material's price). `bonus`: the same for the whole, paid with the last unit.
// `sum`: the value handed over so far, `paid`: the Linh Thạch paid so far. `done`: all handed over, `left`: sent away; either way the place goes to a new buyer on the server's next tick.
// `rank`: the bậc of the player in this kind when the buyer was made (0 when missing: a buyer made before ranks existed).
export interface Job { id: string; type: JobType; who: O.Buyer; line: number; ask: Ask; need: number; got: number; mult: number; bonus: number; sum: number; paid: number; extra?: O.Extra; done: boolean; left?: boolean; rank?: number }
// `done`: how many buyers of each kind have been handed everything (a board made before ranks existed has none: it counts as 0).
export interface JobBoard { v: 1; n: number; list: Job[]; done?: Partial<Record<JobType, number>> }

export const LAYOUT: JobType[] = ['beast', 'beast', 'pill', 'pill', 'mat', 'mat'];
export const BOARD_VERSION = 1;
export const MULT = { beast: 200, beastBonus: 100, pill: 150, mat: 200, matBonus: 50 } as const;
const hash32 = O.hash32, pick = O.pick;

export const isOpen = (j: Job): boolean => !j.done && !j.left;
export const isBoard = (b: any): b is JobBoard => !!b && b.v === BOARD_VERSION && Array.isArray(b.list) && typeof b.n === 'number';
export const ofType = (b: JobBoard | undefined, t: JobType): Job[] => (isBoard(b) ? b.list.filter((j) => j.type === t) : []);
export const left = (j: Job): number => j.need - j.got;

// ---- bậc: jobs finished in a kind -> rank. Only pills and materials have one (beasts get no harder: they already follow the level of the player).
export const RANK_AT = [0, 3, 8, 15, 25, 40];
export const RANK_NAME = ['Tập Sự', 'Học Việc', 'Thạo Việc', 'Lão Luyện', 'Đại Sư', 'Tông Sư'];
export const RANKED: JobType[] = ['pill', 'mat'];
export const rankOf = (done: number): number => RANK_AT.reduce((r, at, i) => (done >= at ? i : r), 0);
export const doneOf = (b: JobBoard | undefined, t: JobType): number => (isBoard(b) && b.done ? b.done[t] || 0 : 0);
/** The size of an order of the given rank, as a multiple of the size at rank 0. */
export const QTY = [1, 1.5, 2.2, 3.2, 4.5, 6];
/** Jobs still to finish for the next rank (null at the top). */
export const toNext = (done: number): number | null => { const r = rankOf(done); return r + 1 < RANK_AT.length ? RANK_AT[r + 1] - done : null; };

// ---- what the world has for a player of this level: the creatures and materials of the zones already open to them
const uniq = <T,>(a: T[]): T[] => [...new Set(a)];
const zonesAt = (level: number) => C.ZONES.filter((z) => z.minLevel <= level);
export const speciesAt = (level: number): string[] => uniq(zonesAt(level).flatMap((z) => Object.entries(z.species).filter(([, w]) => w > 0).map(([id]) => id)));
export const matsAt = (level: number): string[] => uniq(zonesAt(level).flatMap((z) => z.materials.map((m) => m.id)));
type SpLite = { id: string; name: string; el: string[] };
let SP_BY_ID: Map<string, SpLite> | null = null;
/** A species by id (the fixed ones and the daily ones). Looked up in a Map built once: this runs for every creature of the pen on every redraw. */
const spOf = (id: string): SpLite | undefined => {
  if (!SP_BY_ID) { SP_BY_ID = new Map(); for (const s of D.dailySpecies()) SP_BY_ID.set(s.id, s as SpLite); for (const s of C.SPECIES) SP_BY_ID.set(s.id, s as SpLite); }
  return SP_BY_ID.get(id);
};
/** The first element of a species (the fallback picture of a beast ask). */
export const speciesEl = (id: string): string | undefined => spOf(id)?.el[0];
export const elementsAt = (level: number): string[] => uniq(speciesAt(level).map((id) => spOf(id)?.el[0]).filter((x): x is string => !!x));
/** The grades of Hồi Khí Đan whose materials a player of this level can already find. */
export const gradesAt = (level: number): number[] => { const m = matsAt(level); return C.RECIPES.filter((r) => Object.keys(r.need).every((id) => m.includes(id))).map((r) => r.grade); };

// ---- values (what the pay is a multiple of)
export const sellBack = (grade: number): number => Math.floor(B.sellBackRatio * C.SHOP_ITEM(`hp${grade}`)!.price);
export const unitValue = (a: Ask): number => (a.t === 'pill' ? sellBack(a.grade) : a.t === 'mat' ? C.MAT(a.id).price : 0);
export const payFor = O.payFor;

// ---- the goods on top. For pills only materials, worth at most 40% of what is held back from the shop price (see the top of the file), a rarer material the higher the grade and the rank.
const BEAST_EXTRA: O.Extra[] = [{ kind: 'taming', idx: 0, n: 3 }, { kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 0, n: 3 }];
// What a material buyer gives grows with the rank: better pills and scrolls, and more of them.
const MAT_EXTRA: O.Extra[][] = [
  [{ kind: 'hp', idx: 0, n: 2 }, { kind: 'taming', idx: 0, n: 1 }, { kind: 'hp', idx: 1, n: 1 }],
  [{ kind: 'hp', idx: 1, n: 2 }, { kind: 'taming', idx: 1, n: 1 }, { kind: 'hp', idx: 0, n: 4 }],
  [{ kind: 'hp', idx: 1, n: 3 }, { kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 2, n: 1 }],
];
const scaled = (x: O.Extra, k: number): O.Extra => ({ ...x, n: Math.max(1, Math.round(x.n * k)) });
/** The goods a pill buyer gives: materials worth (at the full price of the material) at most 40% of the gap between the shop price of the pills and what the buyer pays for them, so buying pills at the shop to hand them over always loses. */
export function pillExtra(grade: number, need: number, rank: number, level: number): O.Extra {
  const price = C.SHOP_ITEM(`hp${grade}`)!.price, gap = need * (price - payFor(MULT.pill, sellBack(grade)));
  const pool = matsAt(level).filter((id) => id !== 'linhthao').sort((a, b) => C.MAT(a).price - C.MAT(b).price);
  const id = pool.length ? pool[Math.min(pool.length - 1, grade + Math.floor(rank / 2))] : 'truc';
  return { kind: 'mat', id, n: Math.max(1, Math.min(80, Math.floor((0.4 * gap) / C.MAT(id).price))) };
}

// ---- the words of a buyer
const LINES: Record<JobType, string[]> = {
  beast: ['Ta cần linh thú cho trại của ta, ngươi có thì nhường lại, ta trả hậu.', 'Đang thiếu đúng loại này, ai có xin giao giúp.', 'Nuôi thú mà thiếu giống thì khổ, ngươi tìm giúp ta với.', 'Ta không đi săn được, ngươi có con nào dư thì đưa ta.'],
  pill: ['Dược đường của ta hết đan rồi, ngươi luyện được thì giao giúp.', 'Có bao nhiêu viên cứ đưa bấy nhiêu, ta thu dần.', 'Đệ tử ta tu luyện cần nhiều đan, ngươi giúp ta một phen.'],
  mat: ['Lò ta đang thiếu nguyên liệu này, ngươi gom được thì đưa ta.', 'Ta nhận hết, nhiều ít gì cũng được, gom đủ thì ta thưởng thêm.', 'Thợ của ta chờ nguyên liệu, ngươi gom giúp ta nhé.'],
};
export const lineOf = (j: Pick<Job, 'type' | 'line'>): string => LINES[j.type][j.line % LINES[j.type].length];
const ARCHS: Record<JobType, string[]> = { beast: ['Thể Tu', 'Tán Tu'], pill: ['Đan Sư'], mat: ['Đan Sư', 'Phù Sư', 'Tán Tu'] };

// ---- making a buyer
/** One of `items` by weight, from a key (no random number is drawn). */
function weighted<T>(items: T[], weight: (x: T) => number, key: string): T {
  const total = items.reduce((a, x) => a + weight(x), 0);
  let t = ((hash32(key) % 100000) / 100000) * total;
  for (const x of items) { t -= weight(x); if (t < 0) return x; }
  return items[items.length - 1];
}
function build(type: JobType, key: string, level: number, rank: number): Pick<Job, 'ask' | 'need' | 'mult' | 'bonus' | 'extra'> {
  const r = hash32(`jr|${key}`) % 100;
  if (type === 'beast') {
    const sp = pick(speciesAt(level), `jsp|${key}`), els = elementsAt(level);
    if (r < 25 && els.length) return { ask: { t: 'beast', el: pick(els, `jel|${key}`) }, need: 3, mult: MULT.beast, bonus: MULT.beastBonus, extra: pick(BEAST_EXTRA, `jx|${key}`) };
    if (r < 45) return { ask: { t: 'beast', sp, minCls: 3 }, need: 1, mult: MULT.beast, bonus: 0, extra: hash32(`jx?|${key}`) % 100 < 30 ? pick(BEAST_EXTRA, `jx|${key}`) : undefined };
    const need = [1, 1, 2, 2, 3][hash32(`jn|${key}`) % 5];
    return { ask: { t: 'beast', sp }, need, mult: MULT.beast, bonus: need > 1 ? MULT.beastBonus : 0, extra: need > 1 || hash32(`jx?|${key}`) % 100 < 30 ? pick(BEAST_EXTRA, `jx|${key}`) : undefined };
  }
  if (type === 'pill') {
    // the higher the rank, the more often a high grade is asked, and the bigger the order
    const gs = gradesAt(level).length ? gradesAt(level) : [0];
    const grade = weighted(gs, (g) => (g === 0 ? 60 - 10 * rank : g === 1 ? 30 + 4 * rank : 10 + 6 * rank), `jg|${key}`);
    const base = grade === 0 ? 5 + (hash32(`jn|${key}`) % 6) : grade === 1 ? 3 + (hash32(`jn|${key}`) % 4) : 2 + (hash32(`jn|${key}`) % 3);
    const need = Math.min(80, Math.round(base * QTY[rank]));
    return { ask: { t: 'pill', grade }, need, mult: MULT.pill, bonus: 0, extra: pillExtra(grade, need, rank, level) };
  }
  // materials: the higher the rank, the rarer (dearer) the material asked, the more of it, the better the pay and the goods
  const id = weighted(matsAt(level), (m) => Math.pow(C.MAT(m).price, 0.5 * rank), `jm|${key}`), price = C.MAT(id).price;
  const need = Math.max(3, Math.min(Math.round(50 * QTY[rank]), Math.round(((40 + (hash32(`jn|${key}`) % 41)) * QTY[rank]) / price)));   // the cheapest materials are capped (50 at rank 0) so that a buyer never asks for a mountain of them
  const goods = MAT_EXTRA[rank <= 1 ? 0 : rank <= 3 ? 1 : 2];
  return { ask: { t: 'mat', id }, need, mult: MULT.mat + 12 * rank, bonus: MULT.matBonus + 10 * rank, extra: scaled(pick(goods, `jx|${key}`), 1 + 0.25 * rank) };
}
/** One new buyer for place `i` of the board; `n` is the running number of buyers made so far; `others` are the buyers there now (none of them is asked the same). */
export function makeJob(i: number, n: number, seed: number | string, others: Job[], opt: { level: number; done?: JobBoard['done'] }): Job {
  const type = LAYOUT[i % LAYOUT.length], rank = RANKED.includes(type) ? rankOf((opt.done && opt.done[type]) || 0) : 0;
  let b = build(type, '', opt.level, rank), key = '';
  for (let a = 0; a < 40; a++) {   // the pool of pills is small at first (two or three grades), so a buyer may need several tries to be different from the one waiting
    key = `${seed}|${i}|${n}|${a}`;
    b = build(type, key, opt.level, rank);
    if (!others.some((o) => isOpen(o) && o.type === type && JSON.stringify(o.ask) === JSON.stringify(b.ask))) break;
  }
  const who = O.buyerNamed(`j|${key}`, pick(ARCHS[type], `jarch|${key}`));
  return { id: `${type}${i}-${n}`, type, who, line: hash32(`jline|${key}`), sum: 0, paid: 0, got: 0, done: false, rank, ...b };
}
export function newBoard(seed: number | string, opt: { level: number; done?: JobBoard['done'] }): JobBoard {
  const list: Job[] = [];
  LAYOUT.forEach((_, i) => list.push(makeJob(i, i, seed, list, opt)));
  return { v: BOARD_VERSION, n: LAYOUT.length, list };
}

// ---- beasts
type BeastLike = { sp: string; cls: number; mut: boolean };
export function beastMatches(a: Ask, b: BeastLike): boolean {
  if (a.t !== 'beast' || b.mut) return false;   // a Dị Biến is never handed over: it is never sold
  if (a.sp && b.sp !== a.sp) return false;
  if (a.minCls !== undefined && b.cls < a.minCls) return false;
  if (a.el && !(spOf(b.sp)?.el || []).includes(a.el)) return false;
  return true;
}
/** The ids of the strongest `size` creatures: the Party that goes out to fight. Sorted once by the caller, never once per creature. */
export const partyOf = (beasts: { id: number; power: number }[], size: number): Set<number> => new Set(beasts.slice().sort((a, b) => b.power - a.power).slice(0, size).map((b) => b.id));
/** The creatures that fit a beast job: the spare ones first (weakest first), the Party and the framed one last. */
export function beastCands<T extends BeastLike & { id: number; power: number }>(j: Job, beasts: T[], party: Set<number>, framed: number | null): T[] {
  const rank = (b: T) => (party.has(b.id) || b.id === framed ? 1 : 0);
  return beasts.filter((b) => beastMatches(j.ask, b)).sort((a, b) => rank(a) - rank(b) || a.power - b.power || a.id - b.id);
}
/** Is this creature free to be handed over (not in the Party, not the framed one)? */
export const isSpare = (b: { id: number }, party: Set<number>, framed: number | null): boolean => !party.has(b.id) && b.id !== framed;
/** The open beast jobs that wait for this creature. */
export function beastWantedBy(b: JobBoard | undefined, x: BeastLike): Job[] { return ofType(b, 'beast').filter((j) => isOpen(j) && beastMatches(j.ask, x)); }
// ---- words and pictures
const sizeWord = (c: number) => `cỡ ${C.SIZE_CLASS[c]} trở lên`;
/** What the buyer asks for, in words. */
export function askText(j: Pick<Job, 'ask' | 'need'>): string {
  const a = j.ask;
  if (a.t === 'pill') return `${j.need} Hồi Khí Đan hạng ${a.grade + 1}`;
  if (a.t === 'mat') return `${j.need} ${C.MAT(a.id).name}`;
  if (a.el) return `${j.need} linh thú hệ ${a.el}, loài nào cũng được`;
  return `${j.need} ${spOf(a.sp!)?.name || 'linh thú'}${a.minCls !== undefined ? `, ${sizeWord(a.minCls)}` : ''}`;
}
/** The short name under the picture of what is asked. */
export function askShort(a: Ask): string {
  if (a.t === 'pill') return `Đan hạng ${a.grade + 1}`;
  if (a.t === 'mat') return C.MAT(a.id).name;
  return a.el ? `Hệ ${a.el}` : spOf(a.sp!)?.name || 'Linh thú';
}
/** The picture of what is asked (a fixed picture of the shop, the materials or the creature), or '' when none fits (any creature of an element). */
export function askArt(a: Ask): string { return a.t === 'pill' ? C.shopArt(`hp${a.grade}`) : a.t === 'mat' ? C.matArt(a.id) : a.sp ? C.monsterArt(a.sp, false, true) : ''; }
