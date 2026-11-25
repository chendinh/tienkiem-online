// Công việc, the kinds of job that ask for a NUMBER of something (the job of finding items is lib/orders.ts): Tìm thú (beasts), Đặt đan (Hồi Khí Đan) and Nguyên liệu (materials).
// Like Tìm đồ, a buyer stays until everything asked has been handed over, and then a new one takes the place. Whatever the player has is handed over at any time ("có bao nhiêu đưa bấy nhiêu"):
// each handover is paid at once, and when the last one comes there is a bonus and goods on top. The six places of the board keep their kind: 2 for beasts, 2 for pills, 2 for materials.
// The buyers come from the world seed and a running number alone (no random number is drawn from the game's streams) and are written into the save, like Tìm đồ.
// Nothing here may pay more than the shop would: pills can be bought, so a pill job pays less than the price of the pills it asks, and its goods are worth less than what is left.
// (tests/jobs.test.ts checks that buying pills only to hand them over always loses Linh Thạch.) Beasts and materials cannot be bought, so they are paid a multiple of what selling them gives.
import * as C from './content';
import * as D from './daily';
import * as O from './orders';
import { BALANCE as B } from './balance';

export type JobType = 'beast' | 'pill' | 'mat';
// `sp` a species, `el` an element of the species, `minCls` the least size class (0 Tí Hon .. 4 Khổng Lồ); a Dị Biến is never asked for (it is never sold).
export type Ask = { t: 'beast'; sp?: string; el?: string; minCls?: number } | { t: 'pill'; grade: number } | { t: 'mat'; id: string };
// `mult`: pay for each unit as a percentage of its value (the beast's release value, the pill's sell-back price, the material's price). `bonus`: the same for the whole, paid with the last unit.
// `sum`: the value handed over so far, `paid`: the Linh Thạch paid so far. `done`: all handed over, `left`: sent away; either way the place goes to a new buyer on the server's next tick.
export interface Job { id: string; type: JobType; who: O.Buyer; line: number; ask: Ask; need: number; got: number; mult: number; bonus: number; sum: number; paid: number; extra?: O.Extra; done: boolean; left?: boolean }
export interface JobBoard { v: 1; n: number; list: Job[] }

export const LAYOUT: JobType[] = ['beast', 'beast', 'pill', 'pill', 'mat', 'mat'];
export const BOARD_VERSION = 1;
export const MULT = { beast: 200, beastBonus: 100, pill: 150, mat: 200, matBonus: 50 } as const;
const hash32 = O.hash32, pick = O.pick;

export const isOpen = (j: Job): boolean => !j.done && !j.left;
export const isBoard = (b: any): b is JobBoard => !!b && b.v === BOARD_VERSION && Array.isArray(b.list) && typeof b.n === 'number';
export const ofType = (b: JobBoard | undefined, t: JobType): Job[] => (isBoard(b) ? b.list.filter((j) => j.type === t) : []);
export const left = (j: Job): number => j.need - j.got;

// ---- what the world has for a player of this level: the creatures and materials of the zones already open to them
const uniq = <T,>(a: T[]): T[] => [...new Set(a)];
const zonesAt = (level: number) => C.ZONES.filter((z) => z.minLevel <= level);
export const speciesAt = (level: number): string[] => uniq(zonesAt(level).flatMap((z) => Object.entries(z.species).filter(([, w]) => w > 0).map(([id]) => id)));
export const matsAt = (level: number): string[] => uniq(zonesAt(level).flatMap((z) => z.materials.map((m) => m.id)));
const spOf = (id: string) => C.SPECIES.find((s) => s.id === id) || D.dailySpecies().find((s) => s.id === id);
export const elementsAt = (level: number): string[] => uniq(speciesAt(level).map((id) => spOf(id)?.el[0]).filter((x): x is string => !!x));
/** The grades of Hồi Khí Đan whose materials a player of this level can already find. */
export const gradesAt = (level: number): number[] => { const m = matsAt(level); return C.RECIPES.filter((r) => Object.keys(r.need).every((id) => m.includes(id))).map((r) => r.grade); };

// ---- values (what the pay is a multiple of)
export const sellBack = (grade: number): number => Math.floor(B.sellBackRatio * C.SHOP_ITEM(`hp${grade}`)!.price);
export const unitValue = (a: Ask): number => (a.t === 'pill' ? sellBack(a.grade) : a.t === 'mat' ? C.MAT(a.id).price : 0);
export const payFor = O.payFor;

// ---- the goods on top. For pills only materials, worth less than the pay that is held back from the shop price (see the top of the file).
const PILL_EXTRA: Record<number, O.Extra> = { 0: { kind: 'mat', id: 'truc', n: 4 }, 1: { kind: 'mat', id: 'ngoc', n: 3 }, 2: { kind: 'mat', id: 'hoatinh', n: 3 } };
const BEAST_EXTRA: O.Extra[] = [{ kind: 'taming', idx: 0, n: 3 }, { kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 0, n: 3 }];
const MAT_EXTRA: O.Extra[] = [{ kind: 'hp', idx: 0, n: 2 }, { kind: 'taming', idx: 0, n: 1 }, { kind: 'hp', idx: 1, n: 1 }];

// ---- the words of a buyer
const LINES: Record<JobType, string[]> = {
  beast: ['Ta cần linh thú cho trại của ta, ngươi có thì nhường lại, ta trả hậu.', 'Đang thiếu đúng loại này, ai có xin giao giúp.', 'Nuôi thú mà thiếu giống thì khổ, ngươi tìm giúp ta với.', 'Ta không đi săn được, ngươi có con nào dư thì đưa ta.'],
  pill: ['Dược đường của ta hết đan rồi, ngươi luyện được thì giao giúp.', 'Có bao nhiêu viên cứ đưa bấy nhiêu, ta thu dần.', 'Đệ tử ta tu luyện cần nhiều đan, ngươi giúp ta một phen.'],
  mat: ['Lò ta đang thiếu nguyên liệu này, ngươi gom được thì đưa ta.', 'Ta nhận hết, nhiều ít gì cũng được, gom đủ thì ta thưởng thêm.', 'Thợ của ta chờ nguyên liệu, ngươi gom giúp ta nhé.'],
};
export const lineOf = (j: Pick<Job, 'type' | 'line'>): string => LINES[j.type][j.line % LINES[j.type].length];
const ARCHS: Record<JobType, string[]> = { beast: ['Thể Tu', 'Tán Tu'], pill: ['Đan Sư'], mat: ['Đan Sư', 'Phù Sư', 'Tán Tu'] };

// ---- making a buyer
const askKey = (j: Job) => JSON.stringify(j.ask);
function build(type: JobType, key: string, level: number): Pick<Job, 'ask' | 'need' | 'mult' | 'bonus' | 'extra'> {
  const r = hash32(`jr|${key}`) % 100;
  if (type === 'beast') {
    const sp = pick(speciesAt(level), `jsp|${key}`), els = elementsAt(level);
    if (r < 25 && els.length) return { ask: { t: 'beast', el: pick(els, `jel|${key}`) }, need: 3, mult: MULT.beast, bonus: MULT.beastBonus, extra: pick(BEAST_EXTRA, `jx|${key}`) };
    if (r < 45) return { ask: { t: 'beast', sp, minCls: 3 }, need: 1, mult: MULT.beast, bonus: 0, extra: hash32(`jx?|${key}`) % 100 < 30 ? pick(BEAST_EXTRA, `jx|${key}`) : undefined };
    const need = [1, 1, 2, 2, 3][hash32(`jn|${key}`) % 5];
    return { ask: { t: 'beast', sp }, need, mult: MULT.beast, bonus: need > 1 ? MULT.beastBonus : 0, extra: need > 1 || hash32(`jx?|${key}`) % 100 < 30 ? pick(BEAST_EXTRA, `jx|${key}`) : undefined };
  }
  if (type === 'pill') {
    const gs = gradesAt(level).length ? gradesAt(level) : [0], w = (g: number) => (g === 0 ? 60 : g === 1 ? 30 : 10);
    let t = hash32(`jg|${key}`) % gs.reduce((a, g) => a + w(g), 0), grade = gs[0];
    for (const g of gs) { if (t < w(g)) { grade = g; break; } t -= w(g); }
    const need = grade === 0 ? 5 + (hash32(`jn|${key}`) % 6) : grade === 1 ? 3 + (hash32(`jn|${key}`) % 4) : 2 + (hash32(`jn|${key}`) % 3);
    return { ask: { t: 'pill', grade }, need, mult: MULT.pill, bonus: 0, extra: PILL_EXTRA[grade] };
  }
  const id = pick(matsAt(level), `jm|${key}`), price = C.MAT(id).price;
  return { ask: { t: 'mat', id }, need: Math.max(3, Math.min(50, Math.round((40 + (hash32(`jn|${key}`) % 41)) / price))), mult: MULT.mat, bonus: MULT.matBonus, extra: pick(MAT_EXTRA, `jx|${key}`) };
}
/** One new buyer for place `i` of the board; `n` is the running number of buyers made so far; `others` are the buyers there now (none of them is asked the same). */
export function makeJob(i: number, n: number, seed: number | string, others: Job[], opt: { level: number }): Job {
  const type = LAYOUT[i % LAYOUT.length];
  let b = build(type, '', opt.level), key = '';
  for (let a = 0; a < 40; a++) {   // the pool of pills is small at first (two or three grades), so a buyer may need several tries to be different from the one waiting
    key = `${seed}|${i}|${n}|${a}`;
    b = build(type, key, opt.level);
    if (!others.some((o) => isOpen(o) && o.type === type && JSON.stringify(o.ask) === JSON.stringify(b.ask))) break;
  }
  const who = O.buyerNamed(`j|${key}`, pick(ARCHS[type], `jarch|${key}`));
  return { id: `${type}${i}-${n}`, type, who, line: hash32(`jline|${key}`), sum: 0, paid: 0, got: 0, done: false, ...b };
}
export function newBoard(seed: number | string, opt: { level: number }): JobBoard {
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
/** The open beast jobs that wait for this creature. */
export function beastWantedBy(b: JobBoard | undefined, x: BeastLike): Job[] { return ofType(b, 'beast').filter((j) => isOpen(j) && beastMatches(j.ask, x)); }
/** What the beast buyers wait for is kept from "Bán nhanh các con dư": for every open job, the weakest creatures that fit it, as many as it still needs (not counting those kept anyway). */
export function keepBeastIds<T extends BeastLike & { id: number; power: number }>(b: JobBoard | undefined, beasts: T[], already: Set<number>): Set<number> {
  const keep = new Set<number>();
  for (const j of ofType(b, 'beast')) {
    if (!isOpen(j)) continue;
    beasts.filter((x) => !already.has(x.id) && beastMatches(j.ask, x)).sort((p, q) => p.power - q.power || p.id - q.id).slice(0, left(j)).forEach((x) => keep.add(x.id));
  }
  return keep;
}

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
