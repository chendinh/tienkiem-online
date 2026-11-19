// Nhiệm Vụ Phụ Trong Ngày: besides the daily "tame the day's creature" quest, every UTC day brings three more jobs, one Easy, one Medium and one Hard.
// They use only what the game already counts (fights won, Tu Sĩ beaten, herbs gathered, Kỳ Ngộ met, creatures tamed, items found by tier) so they need no new creature, item or picture.
// Which jobs a day brings is a pure function of the day and the world seed (no random numbers drawn), so server, browser and offline settling agree.
// The reward is a share of the Tu Vi the current Level needs, bigger for a harder job (BALANCE.taskCultPct).
import * as C from './content';
import { BALANCE as B } from './balance';

export type TaskKind = 'win' | 'elite' | 'npc' | 'res' | 'ev' | 'tame' | 'winel' | 'tameel' | 'item';
// `arg` is the element of an element job; an item job names a rarity (`tier`) and then a kind of item: one of the eight slots (`slot`) or one exact base such as "Vân Hài" (`base`).
export interface Task { id: string; kind: TaskKind; lv: 0 | 1 | 2; need: number; n: number; arg?: string; tier?: number; slot?: string; base?: string; done: boolean; reward: number }
export interface DayTasks { day: string; list: Task[] }
// something that just happened in the journey
export interface Hit { kind: 'win' | 'npc' | 'res' | 'ev' | 'tame' | 'item'; el?: string[]; elite?: boolean; tier?: number; slot?: string; base?: string }

export const LEVEL_NAME = ['Dễ', 'Vừa', 'Khó'];
// [kind, need, what it names]. The counts are tuned so that a job takes from about half an hour (Easy) to several hours (Hard) of adventuring.
// An item job is hard because of WHICH item it asks for, not how many: with about 70 items found an hour, an exact base of a given rarity turns up once in one to a few hours.
// (a drop is 34% an item; its rarity is Phàm 62%, Hoàng 29%, Huyền 9%, Địa 2.6%; then 1 in 8 for the slot and 1 in 3 to 6 for the base inside it. Weapons have 13 bases, too many to ask for one exactly, so only the slot is asked.)
type Def = { kind: TaskKind; need: number; arg?: 'el'; item?: { tier: number; by: 'slot' | 'base' } };
const POOL: Def[][] = [
  [{ kind: 'win', need: 15 }, { kind: 'res', need: 8 }, { kind: 'ev', need: 3 }, { kind: 'item', need: 3, item: { tier: 0, by: 'slot' } }, { kind: 'tame', need: 2 }],
  [{ kind: 'item', need: 1, item: { tier: 0, by: 'base' } }, { kind: 'item', need: 2, item: { tier: 1, by: 'slot' } }, { kind: 'npc', need: 6 }, { kind: 'winel', need: 10, arg: 'el' }, { kind: 'tameel', need: 2, arg: 'el' }, { kind: 'elite', need: 3 }],
  [{ kind: 'item', need: 1, item: { tier: 1, by: 'base' } }, { kind: 'item', need: 1, item: { tier: 3, by: 'slot' } }, { kind: 'elite', need: 6 }, { kind: 'tameel', need: 4, arg: 'el' }, { kind: 'win', need: 80 }],
];
const defKey = (d: Def) => d.kind + (d.item ? `${d.item.tier}${d.item.by}` : '');
const BASE_SLOTS = C.SLOTS.filter((x) => C.SLOT_BASE[x].length <= 6);
const hash32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return h >>> 0; };   // FNV-1a plus a final mix, so the low bits (used with %) are well spread

// The three jobs of a day. `els` are the elements of the creatures that live in the zones this player can already enter (an element job is only given for one of them).
export function pickTasks(day: string, seed: number | string, els: string[]): Task[] {
  const out: Task[] = [], used = new Set<string>();
  for (let lv = 0; lv < 3; lv++) {
    const ok = POOL[lv].filter((d) => (d.arg !== 'el' || els.length > 0) && !used.has(defKey(d)));
    const pool = ok.length ? ok : POOL[lv];
    const d = pool[hash32(`task|${day}|${seed}|${lv}`) % pool.length];
    used.add(defKey(d));
    const t: Task = { id: '', kind: d.kind, lv: lv as 0 | 1 | 2, need: d.need, n: 0, done: false, reward: 0 };
    if (d.arg === 'el') t.arg = els[hash32(`taskel|${day}|${seed}|${lv}`) % els.length];
    if (d.item) {
      t.tier = d.item.tier;
      if (d.item.by === 'slot') t.slot = C.SLOTS[hash32(`taskslot|${day}|${seed}|${lv}`) % C.SLOTS.length];
      else { const sl = BASE_SLOTS[hash32(`taskslot|${day}|${seed}|${lv}`) % BASE_SLOTS.length], bs = C.SLOT_BASE[sl]; t.slot = sl; t.base = bs[hash32(`taskbase|${day}|${seed}|${lv}`) % bs.length]; }
    }
    t.id = [t.kind, t.arg, t.tier, t.slot, t.base].filter((x) => x !== undefined).join(':');
    out.push(t);
  }
  return out;
}
// the elements a player can meet: those of the creatures of every zone already open
export function openElements(level: number): string[] {
  const set = new Set<string>();
  for (const z of C.ZONES) if (z.minLevel <= level) for (const s of C.SPECIES) if ((z.species[s.id] || 0) > 0) for (const e of s.el) set.add(e);
  return C.EO.filter((e) => set.has(e));
}
export const matches = (t: Task, h: Hit): boolean => {
  switch (t.kind) {
    case 'win': return h.kind === 'win';
    case 'elite': return h.kind === 'win' && !!h.elite;
    case 'npc': return h.kind === 'npc';
    case 'res': return h.kind === 'res';
    case 'ev': return h.kind === 'ev';
    case 'tame': return h.kind === 'tame';
    case 'winel': return h.kind === 'win' && !!h.el && h.el.includes(t.arg as string);
    case 'tameel': return h.kind === 'tame' && !!h.el && h.el.includes(t.arg as string);
    case 'item': return h.kind === 'item' && h.tier === t.tier && (!t.slot || h.slot === t.slot) && (!t.base || h.base === t.base);
  }
};
export const rewardOf = (lv: number, cultNeed: number) => Math.round(cultNeed * B.taskCultPct[lv]);

export function title(t: Task): string {
  switch (t.kind) {
    case 'win': return `Hạ ${t.need} yêu thú`;
    case 'elite': return `Hạ ${t.need} yêu thú tinh anh`;
    case 'npc': return `Đánh bại ${t.need} tu sĩ`;
    case 'res': return `Thu thập tài nguyên ${t.need} lần`;
    case 'ev': return `Gặp ${t.need} kỳ ngộ`;
    case 'tame': return `Thu phục ${t.need} Linh Thú bất kỳ`;
    case 'winel': return `Hạ ${t.need} yêu thú hệ ${t.arg}`;
    case 'tameel': return `Thu phục ${t.need} Linh Thú hệ ${t.arg}`;
    case 'item': return t.base ? `Nhặt ${t.need} ${t.base} hạng ${C.RARITY[t.tier!]}` : `Nhặt ${t.need} ${C.SLOT_VI[t.slot!]} hạng ${C.RARITY[t.tier!]}`;
  }
}
export function hint(t: Task): string {
  switch (t.kind) {
    case 'win': case 'winel': case 'elite': return 'Đang du hành, thắng trận với yêu thú là tính.' + (t.kind === 'elite' ? ' Khoảng 1 trong 12 yêu thú là tinh anh.' : '');
    case 'npc': return 'Giao chiến và thắng Tu Sĩ gặp trên đường (bật “Tự giao chiến” nếu muốn máy làm thay).';
    case 'res': return 'Gặp điểm tài nguyên khi du hành.';
    case 'ev': return 'Kỳ ngộ xuất hiện khi du hành; tuần Kỳ Ngộ gặp nhiều gấp đôi.';
    case 'tame': case 'tameel': return 'Cần Khế Ước Phù; bật “Tự thu phục” để máy tự thử.';
    case 'item': return `Món rơi khi thắng trận hoặc gặp kỳ ngộ, ${t.base ? 'đúng loại này, hệ nào cũng được' : 'loại nào trong nhóm này cũng được'}. Tính cả món máy tự phân giải; quà nhiệm vụ không tính.`;
  }
}
