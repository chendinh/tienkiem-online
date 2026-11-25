// Thú đi làm: the sixth kind of Công việc (components/Work.tsx). Postings on a board of six places; the player sends one of their Linh Thú to a posting that fits it, the creature works for a while
// (real time: it goes on while the player is away, up to what 12 offline hours bring) and when the time is up the player collects the pay. Nothing is ever taken from the player: the creature is
// the player's own and comes back as it left; it is only busy (it cannot be sold, handed over to a buyer or put on a stand of Triển Lãm) from the moment it is sent until the pay is collected.
// The creature still goes out to fight with the Party meanwhile (a first, simple rule: working takes nothing from the journey).
//
// The six places keep their difficulty: 2 Dễ (the right element, any species of it), 2 Vừa (the right species), 1 Khó (the right species and a level), 1 Đặc biệt (a Dị Biến, the right element or species).
// The element of a creature is its species' (every species has exactly one), so "the right element and the right species" never needs both: an element asks for any of 8 or 9 species, a species for one.
// The postings come from the world seed and a running number alone (no random number is drawn from the game's streams) and are written into the save, like the other kinds of job. Pay and goods are
// fixed when the posting is made; a posting waits on the board until it is done or sent away (✕), and the server gives a new one to a finished place on its next tick.
import * as C from './content';
import * as O from './orders';
import * as J from './jobs';
import { BALANCE as B } from './balance';

const hash32 = O.hash32, pick = O.pick;
const uniq = <T,>(a: T[]): T[] => [...new Set(a)];

export type Tier = 0 | 1 | 2 | 3;
export const TIER_NAME = ['Dễ', 'Vừa', 'Khó', 'Đặc biệt'];
/** The kind of each of the six places of the board. */
export const LAYOUT: Tier[] = [0, 0, 1, 1, 2, 3];
export const BOARD_VERSION = 1;

// ---- time and pay
/** How long a posting of each tier takes, in seconds (each posting is 80% to 120% of it). */
export const BASE_SECS = [20 * 60, 60 * 60, 3 * 3600, 6 * 3600];
/** Linh Thạch an hour for each level of the player, at the easiest tier; the harder tiers pay more for each hour (the right creature is harder to have), the special one four times. */
export const RATE = 30;
export const RATE_MULT = [1, 1.4, 2, 4];
export const payFor = (level: number, tier: Tier, secs: number): number => Math.max(10, Math.round((RATE * level * RATE_MULT[tier] * secs) / 3600 / 5) * 5);

// ---- the goods on top: shop goods only (Khế Ước Phù, Hồi Khí Đan, Độ Kiếp Phù). Easy work gives them rarely, the special work always gives two.
const GOODS: O.Extra[][] = [
  [{ kind: 'hp', idx: 0, n: 2 }, { kind: 'taming', idx: 0, n: 1 }],
  [{ kind: 'taming', idx: 0, n: 2 }, { kind: 'hp', idx: 0, n: 4 }, { kind: 'hp', idx: 1, n: 1 }],
  [{ kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 1, n: 3 }, { kind: 'taming', idx: 0, n: 5 }],
];
const BIG_GOODS: [O.Extra[], O.Extra[]] = [
  [{ kind: 'taming', idx: 2, n: 2 }, { kind: 'taming', idx: 1, n: 5 }],
  [{ kind: 'hp', idx: 2, n: 2 }, { kind: 'hp', idx: 1, n: 6 }, { kind: 'trib', n: 1 }],
];
const goodsOf = (tier: Tier, key: string): O.Extra[] | undefined => {
  if (tier === 3) return [pick(BIG_GOODS[0], `wg0|${key}`), pick(BIG_GOODS[1], `wg1|${key}`)];
  if (tier === 0) return hash32(`wg?|${key}`) % 100 < 35 ? [pick(GOODS[0], `wg|${key}`)] : undefined;
  return [pick(GOODS[tier], `wg|${key}`)];
};

// ---- a posting
// `sp` a species, `el` an element, `minLv` the least level of the creature, `mut` only a Dị Biến.
export interface Ask { sp?: string; el?: string; minLv?: number; mut?: true }
// `beast` the creature sent, `start`/`end` the game clock (ms) of when it left and when it is done. `done`: the pay was collected, `left`: sent away (or the creature was called back with nothing).
// Either one means the place goes to a new posting on the server's next tick.
export interface Post { id: string; tier: Tier; who: O.Buyer; job: string; line: number; ask: Ask; secs: number; stones: number; extra?: O.Extra[]; beast?: number; start?: number; end?: number; done?: boolean; left?: boolean }
export interface WorkBoard { v: 1; n: number; list: Post[] }
export const isBoard = (b: any): b is WorkBoard => !!b && b.v === BOARD_VERSION && Array.isArray(b.list) && typeof b.n === 'number';
export const isOpen = (p: Post): boolean => !p.done && !p.left;
/** free: waits for a creature; run: a creature is working; ready: the time is up, the pay is there to collect; gone: finished or sent away, a new posting comes. */
export type Stage = 'free' | 'run' | 'ready' | 'gone';
export const stageOf = (p: Post, clock: number): Stage => (!isOpen(p) ? 'gone' : p.beast === undefined ? 'free' : clock >= (p.end ?? Infinity) ? 'ready' : 'run');
export const postsOf = (b: WorkBoard | undefined): Post[] => (isBoard(b) ? b.list : []);
/** The creatures that are busy with a posting (sent and not yet collected). */
export const bookedIds = (b: WorkBoard | undefined): Set<number> => new Set(postsOf(b).filter((p) => isOpen(p) && p.beast !== undefined).map((p) => p.beast!));

// ---- who can do what
type BeastLike = { sp: string; level: number; mut: boolean };
export function fits(a: Ask, b: BeastLike): boolean {
  if (a.mut && !b.mut) return false;
  if (a.sp && b.sp !== a.sp) return false;
  if (a.el && !J.speciesEls(b.sp).includes(a.el)) return false;
  if (a.minLv !== undefined && b.level < a.minLv) return false;
  return true;
}
/** The free creatures that fit a posting, the weakest first (the strong ones are the Party's), Dị Biến last. */
export function candidates<T extends BeastLike & { id: number; power: number }>(p: Post, beasts: T[], booked: ReadonlySet<number>, busy: ReadonlySet<number> = new Set()): T[] {
  return beasts.filter((b) => !booked.has(b.id) && !busy.has(b.id) && fits(p.ask, b)).sort((a, b) => Number(a.mut) - Number(b.mut) || a.power - b.power || a.id - b.id);
}

// ---- making a posting
/** The species a player of this level can meet in a zone where creatures reach `minLv`: a posting never asks for a level that no creature of that species is met at. */
const speciesWith = (level: number, minLv: number): string[] => uniq(C.ZONES.filter((z) => z.minLevel <= level && Math.min(z.lv[1], B.playableLevelCap) >= minLv).flatMap((z) => Object.entries(z.species).filter(([, w]) => w > 0).map(([id]) => id)));
function askOf(tier: Tier, key: string, level: number): Ask {
  const els = J.elementsAt(level), all = J.speciesAt(level);
  if (tier === 0) return { el: pick(els.length ? els : ['Kim'], `wel|${key}`) };
  if (tier === 1) return { sp: pick(all, `wsp|${key}`) };
  if (tier === 2) {
    const minLv = Math.max(1, Math.min(level, level - 3 + (hash32(`wlv|${key}`) % 4))), pool = speciesWith(level, minLv);
    return { sp: pick(pool.length ? pool : all, `wsp|${key}`), minLv };
  }
  return hash32(`wmu|${key}`) % 100 < 65 ? { mut: true, el: pick(els.length ? els : ['Kim'], `wel|${key}`) } : { mut: true, sp: pick(all, `wsp|${key}`) };
}
const TITLES: Record<string, string[]> = {
  Hỏa: ['Giữ lửa lò luyện đan', 'Sưởi ấm linh điền mùa đông', 'Rèn kiếm cùng thợ già'],
  Thủy: ['Canh ao linh ngư', 'Dẫn nước tưới linh điền', 'Vớt linh tảo dưới đầm'],
  Mộc: ['Chăm vườn linh thảo', 'Hái quả trên cây cổ thụ', 'Ươm mầm ở dược viên'],
  Kim: ['Canh giữ kho khoáng', 'Đào quặng ở mỏ sâu', 'Mài kiếm ở lò rèn'],
  Thổ: ['Khuân đá xây sơn môn', 'Vỡ đất khai linh điền', 'Đào hầm trữ dược'],
  Lôi: ['Trấn lôi trận đêm mưa', 'Dẫn sét vào lôi trì', 'Chạy tin khẩn qua ba ngọn núi'],
  Âm: ['Gác đêm ở di tích cổ', 'Dẫn đường trong hang tối', 'Canh trăng ở đỉnh núi lạnh'],
  Dương: ['Gọi nắng cho linh điền', 'Mở đường lúc bình minh', 'Canh đỉnh núi đón mặt trời'],
};
const BIG_TITLES: Record<string, string> = {
  Hỏa: 'Thủ hộ địa hỏa ngàn năm', Thủy: 'Trấn giữ mạch nước linh đàm', Mộc: 'Hộ pháp cho cây cổ ngàn tuổi', Kim: 'Gác mạch khoáng của tiền bối',
  Thổ: 'Nâng đỡ sơn môn khi mở đại trận', Lôi: 'Dẫn thiên lôi luyện bảo', Âm: 'Thủ nguyệt tinh trận suốt đêm', Dương: 'Hộ tống Hạo Nhật rời núi',
};
const LINES = [
  'Ta cần một chân làm việc đáng tin, thú nào hợp thì đến, ta trả hậu.',
  'Việc không nặng, chỉ cần đúng loại. Làm xong ta thưởng liền.',
  'Mấy hôm nay thiếu người, ngươi có thú hợp thì giúp ta một tay.',
  'Ta thuê thú của ngươi, xong việc nó về nguyên vẹn, ngươi cứ yên tâm.',
];
const BIG_LINES = [
  'Việc này chỉ thú Dị Biến mới gánh nổi. Ngươi có thì nhận, ta trả rất hậu.',
  'Ta tìm khắp nơi mới biết linh thú dị biến mới làm được. Thù lao không ít.',
];
const ARCHS = ['Thể Tu', 'Tán Tu', 'Phù Sư', 'Đan Sư'];
export const lineOf = (p: Pick<Post, 'tier' | 'line'>): string => (p.tier === 3 ? BIG_LINES[p.line % BIG_LINES.length] : LINES[p.line % LINES.length]);
/** The element a posting is about (for its picture and its words): the one asked, or the one of the species asked. */
export const elOf = (a: Ask): string => a.el || (a.sp ? J.speciesEl(a.sp) : undefined) || 'Kim';

export function makePost(i: number, n: number, seed: number | string, others: Post[], opt: { level: number }): Post {
  const tier = LAYOUT[i % LAYOUT.length];
  let key = '', ask: Ask = {};
  for (let a = 0; a < 40; a++) {   // two places of the same tier must not ask the same
    key = `${seed}|w${i}|${n}|${a}`;
    ask = askOf(tier, key, opt.level);
    if (!others.some((o) => isOpen(o) && o.tier === tier && JSON.stringify(o.ask) === JSON.stringify(ask))) break;
  }
  const secs = Math.round((BASE_SECS[tier] * (0.8 + (hash32(`wsec|${key}`) % 5) * 0.1)) / 60) * 60;
  const el = elOf(ask), job = tier === 3 ? BIG_TITLES[el] || 'Việc trọng đại' : pick(TITLES[el] || TITLES.Kim, `wjob|${key}`);
  const extra = goodsOf(tier, key);
  return { id: `w${i}-${n}`, tier, who: O.buyerNamed(`w|${key}`, pick(ARCHS, `warch|${key}`)), job, line: hash32(`wline|${key}`), ask, secs, stones: payFor(opt.level, tier, secs), ...(extra ? { extra } : {}) };
}
export function newBoard(seed: number | string, opt: { level: number }): WorkBoard {
  const list: Post[] = [];
  LAYOUT.forEach((_, i) => list.push(makePost(i, i, seed, list, opt)));
  return { v: BOARD_VERSION, n: LAYOUT.length, list };
}

// ---- words and pictures
/** "20 phút", "1 giờ", "1 giờ 5 phút", "45 giây" (rounded up to the minute from a minute on). */
export function durText(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec} giây`;
  const m = Math.ceil(sec / 60), h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h} giờ ${r} phút` : `${h} giờ`) : `${m} phút`;
}
/** What a posting asks for, in words. */
export function askText(a: Ask): string {
  const who = a.sp ? J.speciesName(a.sp) || 'linh thú' : `linh thú hệ ${a.el}`;
  if (a.mut) return a.sp ? `${who} Dị Biến` : `Linh thú Dị Biến hệ ${a.el}`;
  if (a.minLv !== undefined) return `${who}, từ cấp ${a.minLv} trở lên`;
  return a.sp ? who : `${who}, loài nào cũng được`;
}
/** The short name under the picture of what is asked. */
export const askShort = (a: Ask): string => (a.mut ? 'Dị Biến' : '') + (a.sp ? (a.mut ? ' ' : '') + (J.speciesName(a.sp) || 'Linh thú') : `${a.mut ? ' ' : ''}Hệ ${a.el}`);
/** The picture of the species asked, or '' for an element (the screen shows the element's own icon). */
export const askArt = (a: Ask): string => (a.sp ? C.monsterArt(a.sp, !!a.mut, true) : '');
/** The goods of a posting in one line for a label or a seal. */
export const goodsText = (p: Pick<Post, 'extra'>): string => (p.extra || []).map((x) => `${x.n} ${O.extraName(x)}`).join(', ');
