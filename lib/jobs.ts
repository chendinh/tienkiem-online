// Công việc, the kinds of job that ask for a NUMBER of something (the job of finding items is lib/orders.ts): Tìm thú (beasts), Đặt đan (Hồi Khí Đan) and Nguyên liệu (materials).
// Tìm thú asks for creatures by element only (1 to 3 elements, any species) and always gives a Khế Ước Phù of grade Huyền or higher and Hồi Khí Đan when everything is handed over.
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
// Tìm thú asks by ELEMENT only (2026-11-28: asking for one exact species or size was too hard and paid too little): 1 to 3 different elements, `n` creatures of each,
// any species of the element, `got` how many came so far. A Dị Biến is never asked for (it is never sold). A buyer saved before this (a species `sp`, a size `minCls`
// or one `el`, without `want`) is not open any more and the next tick puts a new buyer in its place (see `isLegacy`); what it was handed stays paid.
export type BeastWant = { el: string; n: number; got: number };
export type Ask = { t: 'beast'; want: BeastWant[] } | { t: 'pill'; grade: number } | { t: 'mat'; id: string };
// `mult`: pay for each unit as a percentage of its value (the beast's release value, the pill's sell-back price, the material's price). `bonus`: the same for the whole, paid with the last unit.
// `sum`: the value handed over so far, `paid`: the Linh Thạch paid so far. `done`: all handed over, `left`: sent away; either way the place goes to a new buyer on the server's next tick.
// `rank`: the bậc of the player in this kind when the buyer was made (0 when missing: a buyer made before ranks existed).
// `extra`: the one gift of a pill or material buyer; `gifts`: the gifts of a beast buyer (a Khế Ước Phù and Hồi Khí Đan). Read both through `giftsOf`.
export interface Job { id: string; type: JobType; who: O.Buyer; line: number; ask: Ask; need: number; got: number; mult: number; bonus: number; sum: number; paid: number; extra?: O.Extra; gifts?: O.Extra[]; done: boolean; left?: boolean; rank?: number }
// `done`: how many buyers of each kind have been handed everything (a board made before ranks existed has none: it counts as 0).
export interface JobBoard { v: 1; n: number; list: Job[]; done?: Partial<Record<JobType, number>> }

export const LAYOUT: JobType[] = ['beast', 'beast', 'pill', 'pill', 'mat', 'mat'];
export const BOARD_VERSION = 1;
// Beasts: each creature 3 times its selling price, and 2 times the whole on top when everything is handed over (raised 2026-11-28 from 2 and 1).
export const MULT = { beast: 300, beastBonus: 200, pill: 150, mat: 200, matBonus: 50 } as const;
const hash32 = O.hash32, pick = O.pick;

/** The elements a beast buyer asks for ([] for anything else, and for a beast buyer of an old save). */
export const wantsOf = (a: Ask): BeastWant[] => (a.t === 'beast' && Array.isArray((a as { want?: unknown }).want) ? a.want : []);
/** A beast buyer saved before Tìm thú asked by element only: no longer open, replaced on the next tick. */
export const isLegacy = (j: Pick<Job, 'type' | 'ask'>): boolean => j.type === 'beast' && !wantsOf(j.ask).length;
export const isOpen = (j: Job): boolean => !j.done && !j.left && !isLegacy(j);
/** What a buyer gives on top when everything is handed over. */
export const giftsOf = (j: Pick<Job, 'extra' | 'gifts'>): O.Extra[] => j.gifts || (j.extra ? [j.extra] : []);
export const giftsText = (j: Pick<Job, 'extra' | 'gifts'>): string => giftsOf(j).map((x) => `${x.n} ${O.extraName(x)}`).join(' và ');
export const isBoard = (b: any): b is JobBoard => !!b && b.v === BOARD_VERSION && Array.isArray(b.list) && typeof b.n === 'number';
export const ofType = (b: JobBoard | undefined, t: JobType): Job[] => (isBoard(b) ? b.list.filter((j) => j.type === t) : []);
export const left = (j: Job): number => j.need - j.got;
/** What is still short, in words: "1 con hệ Hỏa, 2 con hệ Thủy" for beasts, the number for the rest. */
export const leftText = (j: Job): string => { const w = wantsOf(j.ask).filter((x) => x.got < x.n); return w.length ? w.map((x) => `${x.n - x.got} con hệ ${x.el}`).join(', ') : String(left(j)); };

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
let SP_BY_ID: Map<string, SpLite> | null = null, SP_FOR: unknown = null;
/** A species by id (the fixed ones and the daily ones). Looked up in a Map, as this runs for every creature of the pen on every redraw.
 *  The Map is built again whenever the daily registry is replaced (`setDaily` makes a new list: the server reloads it every few minutes, the browser once the
 *  page has it). Built only once, it missed the creatures of the days that came after (2026-11-28: the server refused a new creature the browser had accepted). */
const spOf = (id: string): SpLite | undefined => {
  const reg = D.dailyPacks();
  if (!SP_BY_ID || SP_FOR !== reg) {
    SP_BY_ID = new Map(); SP_FOR = reg;
    for (const s of D.dailySpecies()) SP_BY_ID.set(s.id, s as SpLite);
    for (const s of C.SPECIES) SP_BY_ID.set(s.id, s as SpLite);
  }
  return SP_BY_ID.get(id);
};
/** The name and the elements of a species (Thú đi làm, lib/work.ts, asks for creatures the same way). */
export const speciesName = (id: string): string | undefined => spOf(id)?.name;
export const speciesEls = (id: string): string[] => spOf(id)?.el || [];
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
/** The gifts of a beast buyer: always a Khế Ước Phù of grade Huyền or higher (an order of 3 or more creatures has a better chance of Địa, one of 5 or more a small chance of Thiên),
 *  and Hồi Khí Đan of grade 1 or 2, more of both the more creatures are asked. */
export function beastGifts(need: number, key: string): O.Extra[] {
  const r = hash32(`jt|${key}`) % 100, big = need >= 5, mid = need >= 3;
  const taming: O.Extra = big && r < 8 ? { kind: 'taming', idx: 3, n: 1 }
    : r < (big ? 38 : mid ? 25 : 10) ? { kind: 'taming', idx: 2, n: big ? 2 : 1 }
    : { kind: 'taming', idx: 1, n: 1 + Math.ceil(need / 2) };
  const g = hash32(`jp|${key}`) % 2;
  return [taming, { kind: 'hp', idx: g, n: g === 0 ? 2 + Math.ceil(need / 2) : 1 + Math.floor(need / 2) }];
}
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
  beast: ['Ta cần linh thú cho trại của ta, ngươi có thì nhường lại, ta trả hậu.', 'Trận pháp của ta thiếu linh thú đúng hệ, con nào cũng được.', 'Nuôi thú mà thiếu hệ thì khổ, ngươi tìm giúp ta với.', 'Ta không đi săn được, ngươi có con nào dư thì đưa ta.'],
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
/** `k` different elements out of `els`, in the order of the element ring (so the same elements always read, and compare, the same way). */
function someEls(els: string[], k: number, key: string): string[] {
  const left = els.slice(), out: string[] = [];
  for (let i = 0; i < k && left.length; i++) out.push(left.splice(hash32(`${key}|${i}`) % left.length, 1)[0]);
  return out.sort((a, b) => C.EO.indexOf(a) - C.EO.indexOf(b));
}
function build(type: JobType, key: string, level: number, rank: number): Pick<Job, 'ask' | 'need' | 'mult' | 'bonus' | 'extra' | 'gifts'> {
  if (type === 'beast') {
    // one element (2 to 4 creatures), two (1 to 3 of each) or three (1 or 2 of each); any species of the element will do, at most 6 creatures in all
    const els = elementsAt(level).length ? elementsAt(level) : ['Kim'], kinds = Math.min(els.length, [1, 1, 2, 2, 3][hash32(`jk|${key}`) % 5]);
    const want = someEls(els, kinds, `jel|${key}`).map((el, i): BeastWant => {
      const h = hash32(`jn|${key}|${i}`);
      return { el, n: kinds === 1 ? 2 + (h % 3) : kinds === 2 ? 1 + (h % 3) : 1 + (h % 2), got: 0 };
    });
    const need = want.reduce((a, w) => a + w.n, 0);
    return { ask: { t: 'beast', want }, need, mult: MULT.beast, bonus: MULT.beastBonus, gifts: beastGifts(need, key) };
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
/** What is asked, without how much of it has come (two buyers with the same key ask for the same thing). */
export const askKey = (a: Ask): string => (a.t === 'beast' ? `beast:${wantsOf(a).map((w) => `${w.el}${w.n}`).join(',')}` : JSON.stringify(a));
/** One new buyer for place `i` of the board; `n` is the running number of buyers made so far; `others` are the buyers there now (none of them is asked the same). */
export function makeJob(i: number, n: number, seed: number | string, others: Job[], opt: { level: number; done?: JobBoard['done'] }): Job {
  const type = LAYOUT[i % LAYOUT.length], rank = RANKED.includes(type) ? rankOf((opt.done && opt.done[type]) || 0) : 0;
  let b = build(type, '', opt.level, rank), key = '';
  for (let a = 0; a < 40; a++) {   // the pool of pills is small at first (two or three grades), so a buyer may need several tries to be different from the one waiting
    key = `${seed}|${i}|${n}|${a}`;
    b = build(type, key, opt.level, rank);
    if (!others.some((o) => isOpen(o) && o.type === type && askKey(o.ask) === askKey(b.ask))) break;
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
/** Can this creature fill one of the elements still short? A Dị Biến never can: it is never handed over, as it is never sold. */
export function beastMatches(a: Ask, b: BeastLike): boolean {
  if (a.t !== 'beast' || b.mut) return false;
  const els = speciesEls(b.sp);
  return wantsOf(a).some((w) => w.got < w.n && els.includes(w.el));
}
/** Which element each creature goes to (its index in `want`), or null when they cannot all be placed (too many of an element, a wrong one, a Dị Biến).
 *  A creature of two elements goes where there is room: the places are matched like a small bipartite matching, so the order of the creatures never matters. */
export function assignBeasts(want: BeastWant[], beasts: BeastLike[]): number[] | null {
  const slots: number[] = [];   // one entry per creature still asked, holding the index of its element
  want.forEach((w, k) => { for (let i = w.got; i < w.n; i++) slots.push(k); });
  if (beasts.length > slots.length || beasts.some((b) => b.mut)) return null;
  const fits = beasts.map((b) => { const els = speciesEls(b.sp); return slots.map((k, s) => (els.includes(want[k].el) ? s : -1)).filter((s) => s >= 0); });
  const holder: number[] = slots.map(() => -1);
  const place = (i: number, seen: boolean[]): boolean => {
    for (const s of fits[i]) { if (seen[s]) continue; seen[s] = true; if (holder[s] < 0 || place(holder[s], seen)) { holder[s] = i; return true; } }
    return false;
  };
  for (let i = 0; i < beasts.length; i++) if (!place(i, slots.map(() => false))) return null;
  const out: number[] = beasts.map(() => -1);
  holder.forEach((i, s) => { if (i >= 0) out[i] = slots[s]; });
  return out;
}
/** Can `b` be added to the creatures already chosen for this buyer (every one of them still finding a place)? */
export const canAdd = (a: Ask, chosen: BeastLike[], b: BeastLike): boolean => a.t === 'beast' && assignBeasts(wantsOf(a), [...chosen, b]) !== null;
/** The creatures picked (ids, in the order they were picked) after a tap on `b`: put back if it was picked; else added when there is room, else put in place of the one
 *  picked longest ago that makes room (one tap changes the pick, no need to put one back first); else the same array, unchanged. `of` turns ids into creatures. */
export function tapPick<T extends BeastLike & { id: number }>(a: Ask, of: ReadonlyMap<number, T>, cur: number[], b: T): number[] {
  const beasts = (ids: number[]) => ids.flatMap((id) => { const x = of.get(id); return x ? [x] : []; });
  if (cur.includes(b.id)) return cur.filter((x) => x !== b.id);
  if (canAdd(a, beasts(cur), b)) return [...cur, b.id];
  for (let i = 0; i < cur.length; i++) { const rest = cur.filter((_, k) => k !== i); if (canAdd(a, beasts(rest), b)) return [...rest, b.id]; }
  return cur;
}
/** The ids of the strongest `size` creatures: the Party that goes out to fight. Sorted once by the caller, never once per creature.
 *  The caller adds the creatures that must not go by themselves either (the framed one, the ones on a stand of Triển Lãm) to the same set: `keep`. */
export const partyOf = (beasts: { id: number; power: number }[], size: number): Set<number> => new Set(beasts.slice().sort((a, b) => b.power - a.power).slice(0, size).map((b) => b.id));
/** The creatures that fit a beast job: the spare ones first (weakest first), the ones in `keep` (Party, framed, on a stand) last. */
export function beastCands<T extends BeastLike & { id: number; power: number }>(j: Job, beasts: T[], keep: ReadonlySet<number>): T[] {
  const rank = (b: T) => (keep.has(b.id) ? 1 : 0);
  return beasts.filter((b) => beastMatches(j.ask, b)).sort((a, b) => rank(a) - rank(b) || a.power - b.power || a.id - b.id);
}
/** Is this creature free to be handed over (not in `keep`)? */
export const isSpare = (b: { id: number }, keep: ReadonlySet<number>): boolean => !keep.has(b.id);
/** The open beast jobs that wait for this creature. */
export function beastWantedBy(b: JobBoard | undefined, x: BeastLike): Job[] { return ofType(b, 'beast').filter((j) => isOpen(j) && beastMatches(j.ask, x)); }
// ---- words and pictures
/** What the buyer asks for, in words. */
export function askText(j: Pick<Job, 'ask' | 'need'>): string {
  const a = j.ask;
  if (a.t === 'pill') return `${j.need} Hồi Khí Đan hạng ${a.grade + 1}`;
  if (a.t === 'mat') return `${j.need} ${C.MAT(a.id).name}`;
  const w = wantsOf(a);
  return w.length ? `${w.map((x) => `${x.n} con hệ ${x.el}`).join(', ')}` : `${j.need} linh thú`;
}
/** The short name under the picture of what is asked. */
export function askShort(a: Ask): string {
  if (a.t === 'pill') return `Đan hạng ${a.grade + 1}`;
  if (a.t === 'mat') return C.MAT(a.id).name;
  const w = wantsOf(a);
  return w.length ? `Hệ ${w.map((x) => x.el).join(', ')}` : 'Linh thú';
}
/** The picture of what is asked (a fixed picture of the shop or the materials), or '' for beasts: the card draws the signs of the elements. */
export function askArt(a: Ask): string { return a.t === 'pill' ? C.shopArt(`hp${a.grade}`) : a.t === 'mat' ? C.matArt(a.id) : ''; }
