// Bảng Phong Thần: the player ranking. One row per account in rank_entries, refreshed whenever an account is saved.
// Lists are sorted here from those rows and cached for RANK_CACHE_SEC (default 5 seconds) in each server instance; a profile is built from the saved account on demand and cached too.
// Nothing here exposes an email or an account id: players are shown by a public id derived from a server secret.
import { createHmac } from 'node:crypto';
import * as G from '../game';
import * as C from '../content';
import { query, savepoint } from './db';
import { loadAccount, decodeState } from './store';

export interface RankEntry { pid: string; acc: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; cp: number; power: number; el: string[]; hide: boolean; t: number; qd?: number; av?: string; tp?: TienOwn[] }
export type Board = 'cult' | 'power' | 'quest';
// An item of the highest rarity (Tiên, tier 5) that the player owns: worn, in the bag or in the stash. Kept on the player's row so the Tiên Phẩm list needs no account loads.
export interface TienOwn { it: G.Item; w?: 1 }
const TIEN = C.RARITY.length - 1, TIEN_MAX = 12;
const tienOf = (st: G.GameState): TienOwn[] => {
  const worn = new Set(Object.values(st.eq).filter((i): i is G.Item => !!i).map((i) => i.id));
  const seen = new Set<number>(), out: TienOwn[] = [];
  for (const it of [...Object.values(st.eq), ...(st.bag || []), ...(st.stash || [])]) {
    if (!it || it.tier !== TIEN || seen.has(it.id)) continue;
    seen.add(it.id); out.push(worn.has(it.id) ? { it, w: 1 } : { it });
  }
  return out.sort((a, b) => (b.w || 0) - (a.w || 0) || b.it.power - a.it.power).slice(0, TIEN_MAX);
};

const g = globalThis as any;
const S: { secret?: Promise<string>; sorted: Record<string, { at: number; list: RankEntry[] }>; last: Map<string, { sig: string; at: number }>; tien?: { at: number; list: { e: RankEntry; o: TienOwn }[] } } = g.__tutienRank || (g.__tutienRank = { sorted: {}, last: new Map() });
const pidOf = (secret: string, acc: string) => createHmac('sha256', secret).update(acc).digest('hex').slice(0, 12);
// How long a sorted list or a profile is reused. The boards are looked at far more often than they change (a save is written at most every few minutes).
const ttl = () => { const n = Number(process.env.RANK_CACHE_SEC ?? 5); return (Number.isFinite(n) && n >= 0 ? n : 5) * 1000; };
const PROFILE_KEEP = 300;
const PS: { prof: Map<string, { at: number; v: any }>; rows: { at: number; p: Promise<RankEntry[]> } | null } = g.__tutienRankCache || (g.__tutienRankCache = { prof: new Map(), rows: null });

export function entryOf(st: G.GameState, pid: string, acc: string, now: number): RankEntry {
  const p = st.player, tp = tienOf(st);
  return { pid, acc, name: p.name, dao: p.dao, g: p.look.g, realm: p.realm, sub: p.sub, level: G.levelOf(p), cp: Math.round(p.cp), power: G.combatPower(st), el: p.linh, hide: !!st.set.hideRank, t: now, qd: G.questCount(st), ...(tp.length ? { tp } : {}), ...(p.avatar && p.avatar.url ? { av: p.avatar.url } : {}) };
}

// The rows of every player. One read of the table serves every board and the Tiên list; callers that arrive meanwhile share it.
async function allRows(now: number): Promise<RankEntry[]> {
  await secret();
  const keep = ttl();
  if (PS.rows && now - PS.rows.at < keep) return PS.rows.p;
  const p = (async () => (await query<{ entry: RankEntry }>('SELECT entry FROM rank_entries')).rows.map((r) => r.entry))();
  PS.rows = { at: now, p };
  p.catch(() => { if (PS.rows && PS.rows.p === p) PS.rows = null; });
  return p;
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
  S.last.delete(acc); S.sorted = {}; S.tien = undefined; PS.rows = null; PS.prof.clear();
}

const cmp: Record<Board, (a: RankEntry, b: RankEntry) => number> = {
  cult: (a, b) => b.level - a.level || b.cp - a.cp || b.power - a.power || a.t - b.t,
  power: (a, b) => b.power - a.power || b.level - a.level || a.t - b.t,
  quest: (a, b) => (b.qd || 0) - (a.qd || 0) || b.level - a.level || b.power - a.power || a.t - b.t,
};
async function sortedBoard(board: Board, now: number): Promise<RankEntry[]> {
  await secret();
  const hit = S.sorted[board];
  if (hit && now - hit.at < ttl()) return hit.list;
  const rows = await allRows(now);
  const list = rows.filter((e) => !e.hide && (board !== 'quest' || (e.qd || 0) > 0)).sort(cmp[board]);
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

export interface TienRow { rank: number; pid: string; owner: string; dao: string; me: boolean; worn: boolean; it: G.Item }
// Tiên Phẩm: every Tiên-rarity item and who owns it, strongest first.
export async function tien(meAcc: string, now: number, top = 100) {
  await secret();
  let hit = S.tien;
  if (!hit || now - hit.at >= ttl()) {
    const rows = (await allRows(now)).filter((e) => !e.hide && e.tp && e.tp.length);
    const list = rows.flatMap((e) => e.tp!.map((o) => ({ e, o }))).sort((x, y) => y.o.it.power - x.o.it.power || x.e.t - y.e.t);
    hit = S.tien = { at: now, list };
  }
  const row = (x: { e: RankEntry; o: TienOwn }, i: number): TienRow => ({ rank: i + 1, pid: x.e.pid, owner: x.e.name, dao: x.e.dao, me: x.e.acc === meAcc, worn: !!x.o.w, it: x.o.it });
  return { board: 'tien' as const, total: hit.list.length, owners: new Set(hit.list.map((x) => x.e.acc)).size, rows: hit.list.slice(0, top).map(row), me: null };
}

// A player's open page: stats, worn items and the Linh Thú that go into battle.
// A page is kept for ttl() per instance (a few seconds).
export async function profile(pid: string, now: number) {
  await secret();
  const hit = PS.prof.get(pid);
  if (hit && now - hit.at < ttl()) return hit.v;
  const v = await buildProfile(pid, now);
  if (v) { PS.prof.set(pid, { at: now, v }); if (PS.prof.size > PROFILE_KEEP) PS.prof.delete(PS.prof.keys().next().value as string); }
  else PS.prof.delete(pid);
  return v;
}
async function buildProfile(pid: string, now: number) {
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
