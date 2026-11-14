// Bảng Phong Thần: the player ranking. A small index of one line per account, kept in memory and in data/ranking.json,
// is refreshed whenever an account is saved. Lists come from the index; a profile is built from the saved account on demand.
// Nothing here exposes an email or an account id: players are shown by a public id derived from a server secret.
import { createHmac, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as G from '../game';
import * as C from '../content';
import { dataDir, readJson, writeJson, accountFile } from './store';

export interface RankEntry { pid: string; acc: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; cp: number; power: number; el: string[]; hide: boolean; t: number }
interface Index { secret: string; entries: Record<string, RankEntry> }
export type Board = 'cult' | 'power';

const g = globalThis as any;
const S: { idx?: Index; ready?: Promise<Index>; dirty: boolean; timer: any; sorted: Record<string, { at: number; list: RankEntry[] }> } = g.__tutienRank || (g.__tutienRank = { dirty: false, timer: null, sorted: {} });
const file = () => path.join(dataDir(), 'ranking.json');
const pidOf = (idx: Index, acc: string) => createHmac('sha256', idx.secret).update(acc).digest('hex').slice(0, 12);

export function entryOf(st: G.GameState, pid: string, acc: string, now: number): RankEntry {
  const p = st.player;
  return { pid, acc, name: p.name, dao: p.dao, g: p.look.g, realm: p.realm, sub: p.sub, level: G.levelOf(p), cp: Math.round(p.cp), power: G.combatPower(st), el: p.linh, hide: !!st.set.hideRank, t: now };
}

// First use: load the file, or build the index once from every saved account.
function load(): Promise<Index> {
  if (S.idx) return Promise.resolve(S.idx);
  if (!S.ready) {
    S.ready = (async () => {
      let idx = await readJson<Index | null>(file(), null);
      if (!idx) {
        idx = { secret: randomBytes(24).toString('hex'), entries: {} };
        let names: string[] = [];
        try { names = await fs.readdir(path.join(dataDir(), 'accounts')); } catch {}
        for (const n of names) {
          if (!n.endsWith('.json')) continue;
          const acc = n.slice(0, -5), a = await readJson<any>(accountFile(acc), null);
          if (a && a.state && a.state.player) { try { idx.entries[acc] = entryOf(a.state, pidOf(idx, acc), acc, Date.now()); } catch {} }
        }
        await writeJson(file(), idx);
      }
      S.idx = idx;
      return idx;
    })();
  }
  return S.ready;
}
function flushSoon() {
  S.dirty = true;
  if (S.timer) return;
  S.timer = setTimeout(async () => { S.timer = null; if (S.dirty && S.idx) { S.dirty = false; try { await writeJson(file(), S.idx); } catch {} } }, 10000);
  if (S.timer.unref) S.timer.unref();
}

export async function publish(acc: string, st: G.GameState, now: number) {
  const idx = await load();
  idx.entries[acc] = entryOf(st, idx.entries[acc]?.pid || pidOf(idx, acc), acc, now);
  flushSoon();
}
export async function unpublish(acc: string) {
  const idx = await load();
  if (idx.entries[acc]) { delete idx.entries[acc]; S.sorted = {}; flushSoon(); }
}

const cmp: Record<Board, (a: RankEntry, b: RankEntry) => number> = {
  cult: (a, b) => b.level - a.level || b.cp - a.cp || b.power - a.power || a.t - b.t,
  power: (a, b) => b.power - a.power || b.level - a.level || a.t - b.t,
};
async function sortedBoard(board: Board, now: number): Promise<RankEntry[]> {
  const idx = await load(), hit = S.sorted[board];
  if (hit && now - hit.at < 5000) return hit.list;
  const list = Object.values(idx.entries).filter((e) => !e.hide).sort(cmp[board]);
  S.sorted[board] = { at: now, list };
  return list;
}

export interface RankRow { rank: number; pid: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; power: number; el: string[]; me: boolean; t: number }
export async function board(b: Board, meAcc: string, now: number, top = 100) {
  const list = await sortedBoard(b, now);
  const row = (e: RankEntry, i: number): RankRow => ({ rank: i + 1, pid: e.pid, name: e.name, dao: e.dao, g: e.g, realm: e.realm, sub: e.sub, level: e.level, power: e.power, el: e.el, me: e.acc === meAcc, t: e.t });
  const mine = list.findIndex((e) => e.acc === meAcc);
  return { board: b, total: list.length, rows: list.slice(0, top).map(row), me: mine >= 0 ? row(list[mine], mine) : null };
}

// A player's open page: stats, worn items and the Linh Thú that go into battle.
export async function profile(pid: string, now: number) {
  const idx = await load();
  const e = Object.values(idx.entries).find((x) => x.pid === pid);
  if (!e || e.hide) return null;
  const a = await readJson<any>(accountFile(e.acc), null);
  const st: G.GameState | null = a && a.state;
  if (!st) { if (!a) { delete idx.entries[e.acc]; S.sorted = {}; flushSoon(); } return null; }   // the account is gone: drop its line
  const S_ = G.pstats(st), p = st.player;
  const rankOf = async (b: Board) => (await sortedBoard(b, now)).findIndex((x) => x.pid === pid) + 1;
  return {
    pid, name: p.name, dao: p.dao, g: p.look.g, avatar: p.avatar && p.avatar.url, realm: p.realm, sub: p.sub, level: G.levelOf(p), linh: p.linh, purity: p.purity, pers: p.pers, origin: p.origin,
    stats: S_, power: G.combatPower(st), equipment: Object.fromEntries(C.SLOTS.map((s) => [s, st.eq[s] || null])), party: G.bestParty(st),
    beasts: st.beasts.length, species: Object.values(st.best).filter((b) => b.seen > 0).length, tamedSpecies: Object.values(st.best).filter((b) => b.tamed > 0).length, kills: st.kills,
    rank: { cult: await rankOf('cult'), power: await rankOf('power') }, active: e.t,
  };
}
