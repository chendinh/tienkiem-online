// Chủ Đề Tuần: every week (Monday 00:00 UTC, the same moment the day of the daily quest turns) the whole world leans one way for seven days.
// Eight weeks favour one element (that element's creatures come far more often everywhere), four favour something else (cultivation, fortune, herbs, taming).
// It needs no new creature, no new item and no picture: it only bends dials the game already has (the same ones a zone's Dị Tượng bends), and the order is fixed and public,
// so players can plan around "next week is Tuần Thủy". Pure: the same time always gives the same week, on the server and in the browser.
import * as C from './content';

const DAY = 86400_000;
export interface Theme {
  id: string; name: string; short: string; text: string; icon: string; el?: string;
  cult?: number; luck?: number; enc?: Partial<Record<'monster' | 'npc' | 'resource' | 'event', number>>; species?: Record<string, number>; tame?: number;
}
const EL_MULT = 2.5;   // creatures of the week's element come this many times as often in every zone
const elTheme = (el: string, name: string, line: string): Theme => ({
  id: `el${C.slug(el)}`, name: `Tuần ${name}`, short: `Hệ ${el}`, el, icon: 'el', text: line,
  species: Object.fromEntries(C.SPECIES.filter((s) => s.el[0] === el).map((s) => [s.id, EL_MULT])),
});
const THEMES: Record<string, Theme> = {
  Hỏa: elTheme('Hỏa', 'Liệt Diễm', 'Hỏa khí cuộn lên từ lòng đất, yêu thú hệ Hỏa kéo ra khắp nơi.'),
  Thủy: elTheme('Thủy', 'Bích Ba', 'Sóng linh trào dâng, yêu thú hệ Thủy hiện ra nhiều hơn mọi khi.'),
  Mộc: elTheme('Mộc', 'Thanh Mộc', 'Cây cỏ đồng loạt nảy lộc, yêu thú hệ Mộc rời rừng sâu ra ngoài.'),
  Kim: elTheme('Kim', 'Thái Bạch', 'Kim quang rọi khắp núi non, yêu thú hệ Kim đua nhau xuất hiện.'),
  Thổ: elTheme('Thổ', 'Hậu Thổ', 'Đất trời trầm xuống, yêu thú hệ Thổ trở mình khỏi lòng núi.'),
  Lôi: elTheme('Lôi', 'Cửu Lôi', 'Sấm rền suốt tuần, yêu thú hệ Lôi đổ về những nơi mây đen tụ.'),
  Âm: elTheme('Âm', 'U Nguyệt', 'Trăng mờ phủ lối đi, yêu thú hệ Âm lặng lẽ bước ra khỏi bóng tối.'),
  Dương: elTheme('Dương', 'Thần Dương', 'Nắng vàng chói rạng cả tuần, yêu thú hệ Dương nô nức khắp nẻo.'),
  ngodao: { id: 'ngodao', name: 'Tuần Ngộ Đạo', short: 'Tu Vi', icon: 'cult', text: 'Linh khí thông suốt, ngồi đâu cũng thấy lòng sáng: Tu Vi nhận thêm 25%.', cult: 1.25 },
  kyngo: { id: 'kyngo', name: 'Tuần Kỳ Ngộ', short: 'Kỳ ngộ', icon: 'sparkle', text: 'Đường đời lắm duyên: kỳ ngộ xuất hiện nhiều gấp đôi, yêu thú đỡ chặn lối hơn một chút.', enc: { event: 2, monster: 0.9 } },
  bachthao: { id: 'bachthao', name: 'Tuần Bách Thảo', short: 'Tài nguyên', icon: 'lotus', text: 'Hoa cỏ nở khắp sơn cốc: gặp tài nguyên nhiều gấp rưỡi.', enc: { resource: 1.5 } },
  quyphuc: { id: 'quyphuc', name: 'Tuần Quy Phục', short: 'Thu phục', icon: 'contract', text: 'Linh thú dễ lòng hơn: tỷ lệ thu phục tăng thêm 20% (tối đa vẫn theo trần chung).', tame: 1.2 },
};
// Elements and the others take turns (two elements, then one other): twelve weeks, then it starts again.
export const ORDER = ['Hỏa', 'Thủy', 'ngodao', 'Mộc', 'Kim', 'kyngo', 'Thổ', 'Lôi', 'bachthao', 'Âm', 'Dương', 'quyphuc'];
export const THEME_LIST: Theme[] = ORDER.map((k) => THEMES[k]);

// weeks counted from a Monday; 1970-01-01 was a Thursday
export const weekIndex = (ms: number) => Math.floor((ms / DAY + 3) / 7);
export const weekStart = (w: number) => (w * 7 - 3) * DAY;
export const themeOfWeek = (w: number): Theme => THEME_LIST[((w % THEME_LIST.length) + THEME_LIST.length) % THEME_LIST.length];
export const weekAt = (ms: number): Theme => themeOfWeek(weekIndex(ms));
export const tameMult = (ms: number): number => weekAt(ms).tame || 1;

// the numbers of a theme as plain lines
export function themeEffects(t: Theme): string[] {
  const out: string[] = [];
  if (t.el) out.push(`Yêu thú hệ ${t.el} ×${String(EL_MULT).replace('.', ',')}`);
  if (t.cult) out.push(`Tu Vi +${Math.round((t.cult - 1) * 100)}%`);
  if (t.luck) out.push(`May mắn ${t.luck > 0 ? '+' : '−'}${Math.abs(t.luck)}`);
  if (t.enc) for (const [k, v] of Object.entries(t.enc)) out.push(`${({ monster: 'Yêu thú', npc: 'Tu sĩ', resource: 'Tài nguyên', event: 'Kỳ ngộ' } as Record<string, string>)[k]} ×${String(v).replace('.', ',')}`);
  if (t.tame) out.push(`Thu phục +${Math.round((t.tame - 1) * 100)}%`);
  return out;
}
// What the client shows: this week with its end, and the next two so players can look ahead.
export interface WeekView { id: string; name: string; short: string; text: string; icon: string; el?: string; effects: string[]; startsAt: number; endsAt: number }
const view = (w: number): WeekView => { const t = themeOfWeek(w); return { id: t.id, name: t.name, short: t.short, text: t.text, icon: t.icon, el: t.el, effects: themeEffects(t), startsAt: weekStart(w), endsAt: weekStart(w + 1) }; };
export const weekView = (nowMs: number): { cur: WeekView; next: WeekView[] } => { const w = weekIndex(nowMs); return { cur: view(w), next: [view(w + 1), view(w + 2)] }; };

// The week laid over a zone's own Dị Tượng: one set of numbers for the engine (Tu Vi and May mắn add up or multiply, the Encounter and species weights multiply).
// The name and text stay those of the Dị Tượng (the reports count them by name); with none, the theme stands in alone.
export function merge(ph: C.Phenomenon | null, t: Theme): C.Phenomenon | null {
  if (!t.cult && !t.luck && !t.enc && !t.species) return ph;
  const base: C.Phenomenon = ph ? { ...ph } : { id: `week:${t.id}`, name: t.name, text: t.text };
  if (t.cult) base.cult = (base.cult || 1) * t.cult;
  if (t.luck) base.luck = (base.luck || 0) + t.luck;
  if (t.enc) { const e = { ...(base.enc || {}) } as Record<string, number>; for (const [k, v] of Object.entries(t.enc)) e[k] = (e[k] ?? 1) * (v as number); base.enc = e; }
  if (t.species) { const s = { ...(base.species || {}) }; for (const [k, v] of Object.entries(t.species)) s[k] = (s[k] ?? 1) * v; base.species = s; }
  return base;
}
