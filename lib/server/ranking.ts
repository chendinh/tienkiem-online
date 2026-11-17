// Bảng Phong Thần: the player ranking. One row per account in rank_entries, refreshed whenever an account is saved.
// Lists are sorted here from those rows and cached for a few seconds in each server instance; a profile is built from the saved account on demand.
// Nothing here exposes an email or an account id: players are shown by a public id derived from a server secret.
import { createHmac } from 'node:crypto';
import * as G from '../game';
import * as C from '../content';
import { query, savepoint } from './db';
import { loadAccount, decodeState } from './store';

export interface RankEntry { pid: string; acc: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; cp: number; power: number; el: string[]; hide: boolean; t: number; qd?: number; av?: string }
export type Board = 'cult' | 'power';

const g = globalThis as any;
const S: { secret?: Promise<string>; sorted: Record<string, { at: number; list: RankEntry[] }>; last: Map<string, { sig: string; at: number }> } = g.__tutienRank || (g.__tutienRank = { sorted: {}, last: new Map() });
const pidOf = (secret: string, acc: string) => createHmac('sha256', secret).update(acc).digest('hex').slice(0, 12);

export function entryOf(st: G.GameState, pid: string, acc: string, now: number): RankEntry {
  const p = st.player;
  return { pid, acc, name: p.name, dao: p.dao, g: p.look.g, realm: p.realm, sub: p.sub, level: G.levelOf(p), cp: Math.round(p.cp), power: G.combatPower(st), el: p.linh, hide: !!st.set.hideRank, t: now, qd: G.questCount(st), ...(p.avatar && p.avatar.url ? { av: p.avatar.url } : {}) };
}

const upsert = (e: RankEntry) => query('INSERT INTO rank_entries (acc, entry) VALUES ($1, $2::jsonb) ON CONFLICT (acc) DO UPDATE SET entry = EXCLUDED.entry', [e.acc, JSON.stringify(e)]);

// The secret that turns an account id into a public id (created with the tables, see db.ts).
// An empty board with saved accounts behind it (first start after moving from files) is filled once from those accounts.
function secret(): Promise<string> {
  if (!S.secret) {
    S.secret = (async () => {
      const sec = (await query<{ v: string }>(`SELECT value #>> '{}' AS v FROM kv WHERE key = 'rank.secret'`)).rows[0].v;
      if (!(await query('SELECT 1 FROM rank_entries LIMIT 1')).rowCount) {
        for (const a of (await query<{ id: string; state: string | null }>('SELECT id, state FROM accounts WHERE state IS NOT NULL')).rows) {
          try { const st = decodeState(a.state!); if (st && st.player) await upsert(entryOf(st, pidOf(sec, a.id), a.id, Date.now())); } catch {}
        }
      }
      return sec;
    })().catch((e) => { S.secret = undefined; throw e; });
  }
  return S.secret;
}

export async function publish(acc: string, st: G.GameState, now: number) {
  const e = entryOf(st, pidOf(await secret(), acc), acc, now);
  // a player online changes the account every few seconds: write the row again only when something shown on the board changed, or after a minute
  // cp and power move on nearly every tick, so they are left out of the comparison: the row is refreshed when something else changed, or after a minute
  const { t: _t, cp: _c, power: _w, ...rest } = e, sig = JSON.stringify(rest), prev = S.last.get(acc);
  if (prev && prev.sig === sig && now - prev.at < 60000) return;
  await savepoint(() => upsert(e));   // a failed ranking row must not undo the account save that came before it
  S.last.set(acc, { sig, at: now });
}
export async function unpublish(acc: string) {
  await query('DELETE FROM rank_entries WHERE acc = $1', [acc]);
  S.last.delete(acc); S.sorted = {};
}

const cmp: Record<Board, (a: RankEntry, b: RankEntry) => number> = {
  cult: (a, b) => b.level - a.level || b.cp - a.cp || b.power - a.power || a.t - b.t,
  power: (a, b) => b.power - a.power || b.level - a.level || a.t - b.t,
};
async function sortedBoard(board: Board, now: number): Promise<RankEntry[]> {
  await secret();
  const hit = S.sorted[board];
  if (hit && now - hit.at < 5000) return hit.list;
  const rows = (await query<{ entry: RankEntry }>('SELECT entry FROM rank_entries')).rows;
  const list = rows.map((r) => r.entry).filter((e) => !e.hide).sort(cmp[board]);
  S.sorted[board] = { at: now, list };
  return list;
}

export interface RankRow { rank: number; pid: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; power: number; el: string[]; me: boolean; t: number; qd: number; av?: string }
export async function board(b: Board, meAcc: string, now: number, top = 100) {
  const list = await sortedBoard(b, now);
  const row = (e: RankEntry, i: number): RankRow => ({ rank: i + 1, pid: e.pid, name: e.name, dao: e.dao, g: e.g, realm: e.realm, sub: e.sub, level: e.level, power: e.power, el: e.el, me: e.acc === meAcc, t: e.t, qd: e.qd || 0, av: e.av });
  const mine = list.findIndex((e) => e.acc === meAcc);
  return { board: b, total: list.length, rows: list.slice(0, top).map(row), me: mine >= 0 ? row(list[mine], mine) : null };
}

// A player's open page: stats, worn items and the Linh Thú that go into battle.
export async function profile(pid: string, now: number) {
  await secret();
  const e = (await query<{ entry: RankEntry }>(`SELECT entry FROM rank_entries WHERE entry->>'pid' = $1`, [pid])).rows[0]?.entry;
  if (!e || e.hide) return null;
  const a = await loadAccount(e.acc);
  const st: G.GameState | null = a && a.state;
  if (!st) { if (!a) await unpublish(e.acc); return null; }   // the account is gone: drop its line
  const S_ = G.pstats(st), p = st.player;
  const rankOf = async (b: Board) => (await sortedBoard(b, now)).findIndex((x) => x.pid === pid) + 1;
  return {
    pid, name: p.name, dao: p.dao, title: C.titleOf(p.title)?.name || '', g: p.look.g, avatar: p.avatar && p.avatar.url, realm: p.realm, sub: p.sub, level: G.levelOf(p), linh: p.linh, purity: p.purity, pers: p.pers, origin: p.origin,
    stats: S_, power: G.combatPower(st), equipment: Object.fromEntries(C.SLOTS.map((s) => [s, st.eq[s] || null])), party: G.bestParty(st),
    beasts: st.beasts.length, species: Object.values(st.best).filter((b) => b.seen > 0).length, tamedSpecies: Object.values(st.best).filter((b) => b.tamed > 0).length, kills: st.kills, quests: G.questCount(st),
    rank: { cult: await rankOf('cult'), power: await rankOf('power') }, active: e.t,
  };
}
