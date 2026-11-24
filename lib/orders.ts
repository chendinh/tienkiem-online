// Khách Cầu Mua (Phường Thị): every UTC day a few cultivators ask for something to buy, and the player sells it to them if there is a spare one in the bag.
// Three kinds of order:
//   one  a single item (a kind of item and a rarity; Huyền also names an element), paid 3 times what dissolving it gives
//   set  3 or 5 items that look the SAME (same picture: same kind of item and rarity, Phàm or Hoàng), paid 4 or 6 times what dissolving gives, plus goods
//   vip  a guest who wants one Địa (rarely Thiên) item of an element, paid 2.5 times, plus better goods; only on some days
// "The same picture" is the rule of the game's own picture keys (lib/assetKey.ts, itemSpec in lib/avatarSpec.ts): Phàm and Hoàng have one picture per kind of item,
// Huyền one per kind and element, Địa and Thiên a few looks, only Tiên its own. Names are no help: they are put together at random (Thiên and Tiên) or carry the element (Hoàng).
// Which orders a day brings is a pure function of the day, the world seed and the week's theme (no random number is drawn from the game's streams), and the day's list is
// written into the save on the first tick of the day, so server, browser and offline settling agree and the browser needs no seed.
import * as C from './content';
import * as A from './arts';
import type { Item } from './game';

export type OrderKind = 'one' | 'set' | 'vip';
// What an item must be to count: `tier` always; the rest only when given. `cls` is the môn of a weapon (lib/arts.ts), `el` an element.
export interface Want { tier: number; slot?: string; base?: string; cls?: string; el?: string }
// Goods paid on top of the Linh Thạch (they are the shop's own goods: Khế Ước Phù, Hồi Khí Đan, Phá Cảnh Đan, Độ Kiếp Phù, or a material).
export type Extra = { kind: 'taming' | 'hp' | 'bt'; idx: number; n: number } | { kind: 'trib'; n: number } | { kind: 'mat'; id: string; n: number };
export interface Buyer { name: string; g: 'f' | 'm'; arch: string }
// `mult` is the pay as a percentage of what dissolving the delivered items would give (300 = three times). `paid` is the Linh Thạch that was paid once the order is done.
export interface Order { id: string; kind: OrderKind; who: Buyer; line: number; want: Want; need: number; mult: number; extra?: Extra; done: boolean; paid?: number }
export interface DayOrders { day: string; list: Order[] }

export const ONE_COUNT = 3, SET_COUNT = 2, VIP_DAYS_PERCENT = 50;
export const MULT = { one: 300, set3: 400, set5: 600, vip: 250 } as const;
// the sets are asked of the slots that have only a few kinds (every slot but the weapon), so a set is something a player can really gather
const SET_SLOTS = C.SLOTS.filter((s) => C.SLOT_BASE[s].length <= 6);

const hash32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return h >>> 0; };
const pick = <T,>(arr: T[], key: string): T => arr[hash32(key) % arr.length];

// ---- who asks. The kind of cultivator follows what is asked for; each of the six kinds has a portrait of a woman and of a man (lib/content.ts buyerArt)
const SYL_M1 = ['Hạo', 'Thiên', 'Vân', 'Kiệt', 'Phong', 'Lăng', 'Tuấn', 'Minh', 'Trạch', 'Dật', 'Hàn', 'Mặc'];
const SYL_M2 = ['Vũ', 'Dương', 'Hiên', 'Thần', 'Phàm', 'Nhiên', 'Quân', 'Khải', 'Bách', 'Lâm', 'Sơn', 'Nghị'];
const ARCH_OF_SLOT: Record<string, string> = { Headwear: 'Phù Sư', Robe: 'Đan Sư', Footwear: 'Tán Tu', Back: 'Thể Tu', Accessory: 'Đan Sư', Ring: 'Ma Tu', Talisman: 'Phù Sư' };
const ARCH_OF_CLS: Record<string, string> = { kiem: 'Kiếm Tu', thuong: 'Kiếm Tu', cung: 'Kiếm Tu', dao: 'Kiếm Tu', quyen: 'Thể Tu', cam: 'Tán Tu', tieu: 'Tán Tu', phat: 'Phù Sư' };
const archOf = (w: Want, key: string): string => (w.slot === 'Weapon' ? ARCH_OF_CLS[w.cls || ''] : w.slot ? ARCH_OF_SLOT[w.slot] : '') || pick(C.NPC_TITLES, `ordarch|${key}`);
function buyerFor(key: string, want: Want): Buyer {
  const g: 'f' | 'm' = hash32(`ordg|${key}`) % 2 ? 'f' : 'm';
  const fam = pick(C.FAMILY, `ordfam|${key}`);
  const name = g === 'f' ? `${fam} ${pick(C.SYL1, `ords1|${key}`)} ${pick(C.SYL2, `ords2|${key}`)}` : `${fam} ${pick(SYL_M1, `ordm1|${key}`)} ${pick(SYL_M2, `ordm2|${key}`)}`;
  return { name, g, arch: archOf(want, key) };
}
export const ONE_LINES = [
  'Ta còn thiếu đúng một món cho đủ bộ, ngươi có thì nhường lại, ta trả hậu.',
  'Gấp lắm, ai có xin nhượng giúp, ta không cò kè.',
  'Tìm mãi chưa thấy món này, ngươi mà có là cứu ta một phen.',
  'Sư phụ dặn phải tìm cho bằng được, giá cả cứ nói.',
  'Phường Thị hết hàng món này rồi, ngươi có thì bán lại cho ta.',
];
export const SET_LINES = [
  'Cả đội ta cần mặc cùng một kiểu, ngươi gom đủ cả lô thì ta trả giá lô.',
  'Ta mở sạp cần một lô giống hệt nhau, đủ số là ta không tiếc linh thạch.',
  'Cần mấy món giống nhau để luyện khí, ngươi có đủ thì bán cả lô.',
];
export const VIP_LINES = [
  'Ta là khách của một thế gia, chỉ nhận món quý, đúng ý thì ta không tiếc linh thạch.',
  'Món này chủ nhân ta tìm đã nhiều năm, ngươi mà có thì mọi chuyện đều dễ nói.',
  'Hôm nay ta chỉ ghé Phường Thị một lúc, có món quý nào đúng ý là ta mua ngay.',
];
export const lineOf = (o: Pick<Order, 'kind' | 'line'>): string => { const l = o.kind === 'set' ? SET_LINES : o.kind === 'vip' ? VIP_LINES : ONE_LINES; return l[o.line % l.length]; };

// ---- what is asked
const wantKey = (w: Want) => [w.tier, w.slot, w.base, w.cls, w.el].join('|');
const elFor = (key: string, week?: string) => (week && C.EO.includes(week) ? week : pick(C.EO, `ordel|${key}`));
function wantOne(key: string, week?: string): Want {
  const r = hash32(`ordt|${key}`) % 100, tier = r < 30 ? 0 : r < 80 ? 1 : 2;
  const slot = pick(C.SLOTS, `ordslot|${key}`);
  const w: Want = { tier, slot };
  if (slot === 'Weapon') w.cls = pick(A.ARTS, `ordcls|${key}`).id; else w.base = pick(C.SLOT_BASE[slot], `ordbase|${key}`);
  if (tier === 2) w.el = elFor(key, week);   // the week's element is asked for more: the theme of the week is what the market wants
  return w;
}
function wantSet(key: string): Want {
  const slot = pick(SET_SLOTS, `ordslot|${key}`);
  return { tier: hash32(`ordt|${key}`) % 100 < 60 ? 0 : 1, slot, base: pick(C.SLOT_BASE[slot], `ordbase|${key}`) };
}
function wantVip(key: string, week?: string): Want { return { tier: hash32(`ordt|${key}`) % 100 < 90 ? 3 : 4, el: elFor(key, week) }; }

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

/** The orders of a UTC day. `week` is the element the week's theme favours (if any); `realm` is the player's realm (a Phá Cảnh Đan is only offered for the first two). */
export function pickOrders(day: string, seed: number | string, opt: { week?: string; realm?: number } = {}): Order[] {
  const out: Order[] = [], seen = new Set<string>();
  const add = (kind: OrderKind, i: number, make: (key: string) => Want) => {
    let want!: Want, key = '';
    for (let a = 0; a < 8; a++) { key = `${day}|${seed}|${kind}${i}|${a}`; want = make(key); if (!seen.has(wantKey(want))) break; }
    seen.add(wantKey(want));
    const o: Order = { id: `${kind}${i}`, kind, who: buyerFor(key, want), line: hash32(`ordline|${key}`), want, need: 1, mult: MULT.one, done: false };
    if (kind === 'set') { o.need = hash32(`ordn|${key}`) % 2 ? 5 : 3; o.mult = o.need === 5 ? MULT.set5 : MULT.set3; o.extra = pick(SET_EXTRA, `ordx|${key}`); }
    if (kind === 'one' && hash32(`ordx?|${key}`) % 100 < 25) o.extra = pick(ONE_EXTRA, `ordx|${key}`);
    if (kind === 'vip') { o.mult = MULT.vip; o.extra = pick(vipExtras(opt.realm ?? 9), `ordx|${key}`); }
    out.push(o);
  };
  for (let i = 0; i < ONE_COUNT; i++) add('one', i, (k) => wantOne(k, opt.week));
  for (let i = 0; i < SET_COUNT; i++) add('set', i, (k) => wantSet(k));
  if (hash32(`ordvip|${day}|${seed}`) % 100 < VIP_DAYS_PERCENT) add('vip', 0, (k) => wantVip(k, opt.week));
  return out;
}

// ---- matching. `lookKey` is the identity of an item's picture (the same fields as itemSpec in lib/avatarSpec.ts: element only from Huyền up, the look number if it has one).
export const lookKey = (it: Pick<Item, 'slot' | 'base' | 'tier' | 'el' | 'art'>): string => [it.slot, it.base, it.tier, it.tier >= 2 ? it.el : '', it.art || 0].join('|');
export function matchesWant(w: Want, it: Pick<Item, 'slot' | 'base' | 'tier' | 'el'>): boolean {
  if (it.tier !== w.tier) return false;
  if (w.slot && it.slot !== w.slot) return false;
  if (w.base && it.base !== w.base) return false;
  if (w.cls && A.weaponClass(it.base) !== w.cls) return false;
  if (w.el && it.el !== w.el) return false;
  return true;
}
/** Can these items be handed to the order (the right number, all unique, all matching, and for a set all of the same picture)? Returns the reason in words when they cannot. */
export function checkItems(o: Order, items: Item[]): string | null {
  if (items.length !== o.need) return `Đơn này cần đúng ${o.need} món.`;
  if (new Set(items.map((x) => x.id)).size !== items.length) return 'Một món bị chọn hai lần.';
  if (!items.every((x) => matchesWant(o.want, x))) return 'Có món không đúng yêu cầu của khách.';
  if (o.kind === 'set' && new Set(items.map(lookKey)).size !== 1) return 'Các món phải giống hệt nhau (cùng hình).';
  return null;
}
export const payFor = (mult: number, dissolveSum: number): number => Math.floor((dissolveSum * mult) / 100);

// ---- words
export function wantText(o: Pick<Order, 'want' | 'need' | 'kind'>): string {
  const w = o.want;
  const what = w.base || (w.cls ? `vũ khí ${A.ART(w.cls).name}` : w.slot ? C.SLOT_VI[w.slot] : 'pháp khí');
  return `${o.need} ${what} hạng ${C.RARITY[w.tier]}${w.el ? `, hệ ${w.el}` : ''}${o.kind === 'set' ? ' (giống hệt nhau)' : ''}`;
}
/** An item that shows the picture asked for (for the card), or null when any kind of item will do. */
export function sampleItem(w: Want): Item | null {
  if (!w.slot) return null;
  const base = w.base || (w.cls ? Object.keys(C.WEAPON_CLASS).find((b) => C.WEAPON_CLASS[b] === w.cls) : '') || C.SLOT_BASE[w.slot][0];
  return { id: -1, base, slot: w.slot, name: base, tier: w.tier, level: 1, el: w.el || 'Kim', impl: { stat: C.SLOT_IMPL[w.slot].stat, value: 0 }, affixes: [], power: 0 };
}
