// Khách Cầu Mua (Phường Thị): cultivators come to the market asking for something, and the player hands over what is spare in the bag, a piece at a time.
// A buyer stays until everything asked for has been handed over; only then does a new buyer take the place. There are six places on the board:
//   one  x3  a single item (a kind of item and a rarity; Huyền names a slot and an element instead of a kind), paid 3 times what dissolving it gives
//   set  x2  a set of 3 or 5 DIFFERENT pieces, one for each of the slots named, all of one rarity (Phàm or Hoàng), any kind of item; every piece is paid 3 times
//            what dissolving gives as it is handed over, and when the set is complete there is a bonus (1 or 3 times the whole) and goods on top
//   vip  x1  a guest who wants one Địa (rarely Thiên) item of an element, any slot, paid 2.5 times, plus better goods
// Handing over is "có bao nhiêu đưa bấy nhiêu": each piece is paid on the spot and ticked off, so nothing is lost if the player stops half way or sends the buyer away.
// The buyers are made from the world seed and a running number alone (no random number is drawn from the game's streams), and they are written into the save,
// so server, browser and offline settling agree and the browser needs no seed. A finished buyer is replaced on the server's next tick (lib/game.ts ensureOrders).
import * as C from './content';
import * as A from './arts';
import type { Item } from './game';

export type OrderKind = 'one' | 'set' | 'vip';
// What an item must be to count: `tier` always; the rest only when given. `cls` is the môn of a weapon (lib/arts.ts), `el` an element.
export interface Want { tier: number; slot?: string; base?: string; cls?: string; el?: string }
// Goods paid on top of the Linh Thạch (they are the shop's own goods: Khế Ước Phù, Hồi Khí Đan, Phá Cảnh Đan, Độ Kiếp Phù, or a material).
export type Extra = { kind: 'taming' | 'hp' | 'bt'; idx: number; n: number } | { kind: 'trib'; n: number } | { kind: 'mat'; id: string; n: number };
export interface Buyer { name: string; g: 'f' | 'm'; arch: string }
export interface Part { want: Want; got?: boolean }
// `mult` is the pay for each piece as a percentage of what dissolving it would give (300 = three times); `bonus` the same for the whole of what was handed over, paid when the last piece comes.
// `sum` is the dissolve worth handed over so far and `paid` the Linh Thạch paid so far. `done`: everything handed over; `left`: sent away. Either one means the place is given to a new buyer.
export interface Order { id: string; kind: OrderKind; who: Buyer; line: number; parts: Part[]; mult: number; bonus: number; sum: number; paid: number; extra?: Extra; done: boolean; left?: boolean }
export interface Board { v: 2; n: number; list: Order[] }

export const LAYOUT: OrderKind[] = ['one', 'one', 'one', 'set', 'set', 'vip'];
export const MULT = { part: 300, vip: 250, bonus3: 100, bonus5: 300 } as const;
export const BOARD_VERSION = 2;

const hash32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return h >>> 0; };
const pick = <T,>(arr: T[], key: string): T => arr[hash32(key) % arr.length];
/** `n` different members of `arr`, in an order that depends only on the key. */
const distinct = <T,>(arr: T[], n: number, key: string): T[] => arr.map((x, i) => ({ x, h: hash32(`${key}|${i}`) })).sort((a, b) => a.h - b.h).slice(0, n).map((e) => e.x);

// ---- who asks. The kind of cultivator follows what is asked for; each of the six kinds has a portrait of a woman and of a man (lib/content.ts buyerArt)
const SYL_M1 = ['Hạo', 'Thiên', 'Vân', 'Kiệt', 'Phong', 'Lăng', 'Tuấn', 'Minh', 'Trạch', 'Dật', 'Hàn', 'Mặc'];
const SYL_M2 = ['Vũ', 'Dương', 'Hiên', 'Thần', 'Phàm', 'Nhiên', 'Quân', 'Khải', 'Bách', 'Lâm', 'Sơn', 'Nghị'];
const ARCH_OF_SLOT: Record<string, string> = { Headwear: 'Phù Sư', Robe: 'Đan Sư', Footwear: 'Tán Tu', Back: 'Thể Tu', Accessory: 'Đan Sư', Ring: 'Ma Tu', Talisman: 'Phù Sư' };
const ARCH_OF_CLS: Record<string, string> = { kiem: 'Kiếm Tu', thuong: 'Kiếm Tu', cung: 'Kiếm Tu', dao: 'Kiếm Tu', quyen: 'Thể Tu', cam: 'Tán Tu', tieu: 'Tán Tu', phat: 'Phù Sư' };
const archOf = (kind: OrderKind, w: Want, key: string): string => (kind === 'one' ? (w.slot === 'Weapon' ? ARCH_OF_CLS[w.cls || ''] : w.slot ? ARCH_OF_SLOT[w.slot] : '') : '') || pick(C.NPC_TITLES, `ordarch|${key}`);
function buyerFor(key: string, kind: OrderKind, want: Want): Buyer {
  const g: 'f' | 'm' = hash32(`ordg|${key}`) % 2 ? 'f' : 'm';
  const fam = pick(C.FAMILY, `ordfam|${key}`);
  const name = g === 'f' ? `${fam} ${pick(C.SYL1, `ords1|${key}`)} ${pick(C.SYL2, `ords2|${key}`)}` : `${fam} ${pick(SYL_M1, `ordm1|${key}`)} ${pick(SYL_M2, `ordm2|${key}`)}`;
  return { name, g, arch: archOf(kind, want, key) };
}

// ---- what is asked
const elFor = (key: string, week?: string) => (week && C.EO.includes(week) ? week : pick(C.EO, `ordel|${key}`));
function wantOne(key: string, week?: string): Want {
  const r = hash32(`ordt|${key}`) % 100, tier = r < 40 ? 0 : r < 90 ? 1 : 2;
  const slot = pick(C.SLOTS, `ordslot|${key}`);
  if (tier === 2) return { tier, slot, el: elFor(key, week) };   // a Huyền piece is asked by slot and element only (the week's element more often: the theme of the week is what the market wants)
  return slot === 'Weapon' ? { tier, slot, cls: pick(A.ARTS, `ordcls|${key}`).id } : { tier, slot, base: pick(C.SLOT_BASE[slot], `ordbase|${key}`) };
}
function wantSet(key: string): Want[] {
  const tier = hash32(`ordt|${key}`) % 100 < 60 ? 0 : 1, n = hash32(`ordn|${key}`) % 2 ? 5 : 3;
  return distinct(C.SLOTS, n, `ordslots|${key}`).map((slot) => ({ tier, slot }));
}
const wantVip = (key: string, week?: string): Want => ({ tier: hash32(`ordt|${key}`) % 100 < 90 ? 3 : 4, el: elFor(key, week) });
const wantsKey = (parts: Part[]) => parts.map((p) => [p.want.tier, p.want.slot, p.want.base, p.want.cls, p.want.el].join('|')).sort().join(';');

// ---- goods on top (all are things the shop sells; the worth stays small next to the shop price of the same thing)
const ONE_EXTRA: Extra[] = [{ kind: 'hp', idx: 0, n: 2 }, { kind: 'taming', idx: 0, n: 2 }, { kind: 'mat', id: 'linhthao', n: 3 }];
const SET_EXTRA: Extra[] = [{ kind: 'taming', idx: 0, n: 3 }, { kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 0, n: 3 }, { kind: 'hp', idx: 1, n: 2 }, { kind: 'mat', id: 'truc', n: 4 }, { kind: 'mat', id: 'ngoc', n: 3 }];
const vipExtras = (realm: number): Extra[] => [{ kind: 'taming', idx: 2, n: 2 }, { kind: 'hp', idx: 2, n: 3 }, { kind: 'trib', n: 1 }, ...(realm >= 0 && realm <= 1 ? [{ kind: 'bt' as const, idx: realm, n: 1 }] : [])];
// The shop's id of a piece of goods (its name, price and picture are the shop's), and the number of it.
export const extraId = (x: Extra): string => (x.kind === 'mat' ? `mat:${x.id}` : x.kind === 'trib' ? 'trib' : `${x.kind}${x.idx}`);
export function extraName(x: Extra): string {
  if (x.kind === 'mat') return C.MAT(x.id).name;
  return C.SHOP_ITEM(extraId(x))?.name || 'Vật phẩm';
}
export const extraArt = (x: Extra): string => (x.kind === 'mat' ? C.matArt(x.id) : C.shopArt(extraId(x)));

// ---- the words of a buyer: a line for each kind, one of them is chosen by the key
export const ONE_LINES = [
  'Ta còn thiếu đúng một món cho đủ bộ, ngươi có thì nhường lại, ta trả hậu.',
  'Gấp lắm, ai có xin nhượng giúp, ta không cò kè.',
  'Tìm mãi chưa thấy món này, ngươi mà có là cứu ta một phen.',
  'Sư phụ dặn phải tìm cho bằng được, giá cả cứ nói.',
  'Phường Thị hết hàng món này rồi, ngươi có thì bán lại cho ta.',
];
export const SET_LINES = [
  'Ta đang gom một bộ, mỗi ô một món. Ngươi có món nào cứ đưa trước, đủ bộ ta thưởng thêm.',
  'Đội ta thiếu đủ thứ. Có món nào đưa món đó, ta trả ngay, gom đủ bộ thì ta không tiếc.',
  'Ta mở sạp cần cả bộ đồ. Ngươi tích góp dần cũng được, ta chờ.',
];
export const VIP_LINES = [
  'Ta là khách của một thế gia, chỉ nhận món quý, đúng ý thì ta không tiếc linh thạch.',
  'Món này chủ nhân ta tìm đã nhiều năm, ngươi mà có thì mọi chuyện đều dễ nói.',
  'Ta ở lại Phường Thị chờ món quý này, bao lâu cũng được.',
];
export const lineOf = (o: Pick<Order, 'kind' | 'line'>): string => { const l = o.kind === 'set' ? SET_LINES : o.kind === 'vip' ? VIP_LINES : ONE_LINES; return l[o.line % l.length]; };

// ---- the board
export const isOpen = (o: Order): boolean => !o.done && !o.left;
/** One new buyer for place `i` of the board; `n` is the running number of buyers made so far (it is what makes every buyer different). `others` are the buyers there now, none of them is asked the same thing. */
export function makeOrder(i: number, n: number, seed: number | string, others: Order[], opt: { week?: string; realm?: number } = {}): Order {
  const kind = LAYOUT[i % LAYOUT.length];
  let parts: Part[] = [], key = '';
  for (let a = 0; a < 8; a++) {
    key = `${seed}|${i}|${n}|${a}`;
    parts = (kind === 'set' ? wantSet(key) : [kind === 'vip' ? wantVip(key, opt.week) : wantOne(key, opt.week)]).map((want) => ({ want }));
    if (!others.some((o) => isOpen(o) && wantsKey(o.parts) === wantsKey(parts))) break;
  }
  const o: Order = { id: `${kind}${i}-${n}`, kind, who: buyerFor(key, kind, parts[0].want), line: hash32(`ordline|${key}`), parts, mult: MULT.part, bonus: 0, sum: 0, paid: 0, done: false };
  if (kind === 'set') { o.bonus = parts.length === 5 ? MULT.bonus5 : MULT.bonus3; o.extra = pick(SET_EXTRA, `ordx|${key}`); }
  if (kind === 'one' && hash32(`ordx?|${key}`) % 100 < 25) o.extra = pick(ONE_EXTRA, `ordx|${key}`);
  if (kind === 'vip') { o.mult = MULT.vip; o.extra = pick(vipExtras(opt.realm ?? 9), `ordx|${key}`); }
  return o;
}
export function newBoard(seed: number | string, opt: { week?: string; realm?: number } = {}): Board {
  const list: Order[] = [];
  LAYOUT.forEach((_, i) => list.push(makeOrder(i, i, seed, list, opt)));
  return { v: BOARD_VERSION, n: LAYOUT.length, list };
}
/** Is this a board of the present kind? (A save from the first version of the feature kept a list of the day instead.) */
export const isBoard = (b: any): b is Board => !!b && b.v === BOARD_VERSION && Array.isArray(b.list) && typeof b.n === 'number';
export const progress = (o: Order): { got: number; total: number } => ({ got: o.parts.filter((p) => p.got).length, total: o.parts.length });

// ---- matching
export function matchesWant(w: Want, it: Pick<Item, 'slot' | 'base' | 'tier' | 'el'>): boolean {
  if (it.tier !== w.tier) return false;
  if (w.slot && it.slot !== w.slot) return false;
  if (w.base && it.base !== w.base) return false;
  if (w.cls && A.weaponClass(it.base) !== w.cls) return false;
  if (w.el && it.el !== w.el) return false;
  return true;
}
/** For each item, the part of the order it would fill (a part takes one item), or the reason in words when some item cannot be handed over. */
export function assign(o: Order, items: Item[]): number[] | string {
  const used = new Set<number>(), out: number[] = [];
  for (const it of items) {
    const k = o.parts.findIndex((p, j) => !p.got && !used.has(j) && matchesWant(p.want, it));
    if (k < 0) return `${it.name}: khách không cần món này, hoặc phần này đã đủ.`;
    used.add(k); out.push(k);
  }
  return out;
}
/** The open parts that this item would fill. */
export function wantedBy(b: Board | undefined, it: Pick<Item, 'slot' | 'base' | 'tier' | 'el'>): { order: Order; part: number }[] {
  const out: { order: Order; part: number }[] = [];
  if (!isBoard(b)) return out;
  for (const o of b.list) if (isOpen(o)) o.parts.forEach((p, part) => { if (!p.got && matchesWant(p.want, it)) out.push({ order: o, part }); });
  return out;
}
/** What the buyers wait for is kept from the cleaning ("Dọn túi"): for every open part, the weakest of the pieces held that fit it (a locked piece is kept anyway). */
export function keepIds(b: Board | undefined, held: Item[]): Set<number> {
  const keep = new Set<number>();
  if (!isBoard(b)) return keep;
  for (const o of b.list) if (isOpen(o)) for (const p of o.parts) {
    if (p.got) continue;
    const fit = held.filter((x) => matchesWant(p.want, x));
    if (!fit.length || fit.some((x) => x.locked)) continue;
    keep.add(fit.reduce((a, x) => (x.power < a.power || (x.power === a.power && x.id < a.id) ? x : a)).id);
  }
  return keep;
}
/** A new item arrives: does a buyer wait for it, and nothing held fits that part yet? Then auto-dissolve leaves it alone. */
export function keepNew(b: Board | undefined, held: Item[], x: Item): boolean {
  if (!isBoard(b)) return false;
  for (const o of b.list) if (isOpen(o)) for (const p of o.parts) if (!p.got && matchesWant(p.want, x) && !held.some((h) => matchesWant(p.want, h))) return true;
  return false;
}
export const payFor = (mult: number, dissolveSum: number): number => Math.floor((dissolveSum * mult) / 100);

// ---- words
/** What one part asks for, in words. */
export function partText(w: Want): string {
  const what = w.base || (w.cls ? `vũ khí ${A.ART(w.cls).name}` : w.slot ? C.SLOT_VI[w.slot] : 'pháp khí');
  return `${what} hạng ${C.RARITY[w.tier]}${w.el ? `, hệ ${w.el}` : ''}`;
}
/** The short name of what one part asks for (under its picture on a card). */
export const partShort = (w: Want): string => w.base || (w.cls ? `Vũ khí ${A.ART(w.cls).name}` : w.slot ? C.SLOT_VI[w.slot] : 'Pháp khí');
/** What the buyer asks for, in words. */
export function wantText(o: Pick<Order, 'parts' | 'kind'>): string {
  if (o.kind !== 'set') return partText(o.parts[0].want);
  return `Bộ ${o.parts.length} món hạng ${C.RARITY[o.parts[0].want.tier]}, mỗi ô một món khác nhau`;
}
/** An item that shows the picture asked for (for the card), or null when there is no one picture for it (any kind of item will do). */
export function sampleItem(w: Want): Item | null {
  const base = w.base || (w.cls ? Object.keys(C.WEAPON_CLASS).find((b) => C.WEAPON_CLASS[b] === w.cls) : '');
  if (!w.slot || !base) return null;
  return { id: -1, base, slot: w.slot, name: base, tier: w.tier, level: 1, el: w.el || 'Kim', impl: { stat: C.SLOT_IMPL[w.slot].stat, value: 0 }, affixes: [], power: 0 };
}
