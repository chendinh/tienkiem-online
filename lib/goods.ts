// Goods that are counted, not individual items: Bí Kíp scrolls, materials, pills and contracts. Chợ Đêm trades them like gear, in a quantity.
// A key names one kind: `book:<technique or Công Pháp>`, `mat:<material id>`, `shop:<Phường Thị good id>`.
import * as C from './content';
import * as A from './arts';
import { BALANCE as B } from './balance';
import type { GameState } from './game';
export interface Stack { stack: true; key: string; qty: number }
export const isStack = (x: any): x is Stack => !!x && x.stack === true && typeof x.key === 'string';
export interface StackInfo { name: string; art: string; tier: number; sub: string; cat: 'book' | 'mat' | 'pill' }
export function stackInfo(key: string): StackInfo | null {
  const i = key.indexOf(':'), kind = key.slice(0, i), id = key.slice(i + 1);
  if (kind === 'book') {
    if (A.isTech(id)) { const t = A.TECHS[id]; return { name: id, art: C.techArt(id), tier: t.tier + 1, sub: `Bí kíp · ${A.ART(t.cls).name}`, cat: 'book' }; }
    if (A.isMethod(id)) { const m = A.methodOf(id); return { name: id, art: C.techArt(id), tier: m.tier + 1, sub: 'Kinh Công Pháp', cat: 'book' }; }
  } else if (kind === 'mat') {
    const m = C.MATERIALS.find((x) => x.id === id);
    if (m) return { name: m.name, art: C.matArt(m.id), tier: 0, sub: 'Nguyên liệu', cat: 'mat' };
  } else if (kind === 'shop') {
    const s = C.SHOP_ITEM(id);
    if (s) return { name: s.name, art: C.shopArt(s.id), tier: Math.min(5, s.idx + 1), sub: s.kind === 'taming' ? 'Khế Ước Phù' : s.kind === 'hp' ? 'Đan dược' : s.kind === 'bt' ? 'Phá Cảnh Đan' : 'Phù Độ Kiếp', cat: 'pill' };
  }
  return null;
}
type Slot = { get: () => number; set: (n: number) => void };
function slot(st: GameState, key: string): Slot | null {
  if (!stackInfo(key)) return null;
  const i = key.indexOf(':'), kind = key.slice(0, i), id = key.slice(i + 1);
  if (kind === 'book') return { get: () => st.inv.books[id] || 0, set: (n) => { if (n > 0) st.inv.books[id] = n; else delete st.inv.books[id]; } };
  if (kind === 'mat') return { get: () => st.inv.mat[id] || 0, set: (n) => { st.inv.mat[id] = n; } };
  const s = C.SHOP_ITEM(id)!;
  if (s.kind === 'taming') return { get: () => st.inv.taming[s.idx] || 0, set: (n) => { st.inv.taming[s.idx] = n; } };
  if (s.kind === 'hp') return { get: () => st.inv.hp[s.idx] || 0, set: (n) => { st.inv.hp[s.idx] = n; } };
  if (s.kind === 'bt') return { get: () => st.inv.bt[s.idx] || 0, set: (n) => { st.inv.bt[s.idx] = n; } };
  return { get: () => st.inv.trib, set: (n) => { st.inv.trib = n; } };
}
export const stackCount = (st: GameState, key: string) => slot(st, key)?.get() ?? 0;
export function takeStack(st: GameState, key: string, qty: number): boolean {
  const s = slot(st, key);
  if (!s || !Number.isInteger(qty) || qty < 1 || s.get() < qty) return false;
  s.set(s.get() - qty); return true;
}
// false when the player would pass Stack_Max (nothing is added then)
export function giveStack(st: GameState, key: string, qty: number): boolean {
  const s = slot(st, key);
  if (!s || s.get() + qty > B.stackMax) return false;
  s.set(s.get() + qty); return true;
}
export const MAX_QTY = 99;   // the most one stall or offer carries
// Everything of this kind the player holds, for the pick lists.
export function holdings(st: GameState): { key: string; qty: number; info: StackInfo }[] {
  const out: { key: string; qty: number; info: StackInfo }[] = [];
  const add = (key: string) => { const q = stackCount(st, key), info = stackInfo(key); if (q > 0 && info) out.push({ key, qty: q, info }); };
  for (const n of Object.keys(st.inv.books)) add(`book:${n}`);
  for (const m of C.MATERIALS) add(`mat:${m.id}`);
  for (const s of C.SHOP) add(`shop:${s.id}`);
  return out;
}
