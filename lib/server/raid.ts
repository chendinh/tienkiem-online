// Phó Bản, the server side: the day's raid row, signing up, the fight itself (fought ONCE, by whichever request first comes after the fight time), the film every screen replays,
// and the rewards. The rules are in lib/raid.ts.
//
// Writes to a save happen only in the intents below (service.actGame: the caller's own lock, settlement and idempotency key). The fight writes no save: it stores each fighter's
// reward on their raid_entries row, and the player takes it into their save later (raid_claim). So fighting never locks anyone's account.
import * as G from '../game';
import * as R from '../raid';
import { query, withLock } from './db';
import { loadAccount, decodeState } from './store';
import { publicId } from './ranking';
import { giveStack, stackInfo } from '../goods';
import * as C from '../content';
import { fighterOf } from '../raidfighter';
export { fighterOf };

// The fight time of a day. RAID_FIGHT_MINUTE (minutes after midnight, Vietnam time) moves it, to test without waiting for the evening.
const fightMinute = () => { const m = Number(process.env.RAID_FIGHT_MINUTE); return Number.isInteger(m) && m >= 0 && m < 1440 ? m : R.FIGHT_HOUR * 60; };
export const fightAt = (day: string) => R.fightAtOf(day, fightMinute());

// RAID_BOSS (an id of lib/raid.ts BOSSES) fixes the Dị Thú of a new day, to test one in particular.
const bossFor = (day: string) => { const id = process.env.RAID_BOSS; return id && R.BOSSES.some((b) => b.id === id) ? id : R.bossOfDay(day).id; };
async function ensureRaid(day: string) {
  await query(`INSERT INTO raids (day, boss, at) VALUES ($1, $2, $3) ON CONFLICT (day) DO NOTHING`, [day, bossFor(day), fightAt(day)]);
}

// The fight time stored with the day (it was fixed when the day's row was made).
const atOf = async (day: string) => { await ensureRaid(day); return (await query<{ at: number }>(`SELECT at FROM raids WHERE day = $1`, [day])).rows[0]?.at ?? fightAt(day); };

// The trial: every player is in every day's fight, with no sign-up (RAID_EVERYONE=0 goes back to signing up).
export const everyone = () => process.env.RAID_EVERYONE !== '0';
/** Put players into a day's fight with their numbers from the save: those not in it yet, or (fresh) everyone again with their current numbers. */
async function enlist(day: string, now: number, fresh: boolean) {
  const rows = (await query<{ id: string; state: string }>(fresh
    ? `SELECT id, state FROM accounts WHERE state IS NOT NULL`
    : `SELECT a.id, a.state FROM accounts a WHERE a.state IS NOT NULL AND NOT EXISTS (SELECT 1 FROM raid_entries e WHERE e.day = $1 AND e.acc = a.id)`, fresh ? [] : [day])).rows;
  for (const r of rows) {
    try {
      const st = decodeState(r.state);
      if (!st || !st.player) continue;
      await query(`INSERT INTO raid_entries (day, acc, fighter, joined) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (day, acc) DO UPDATE SET fighter = EXCLUDED.fighter`, [day, r.id, JSON.stringify(fighterOf(st, await publicId(r.id))), now]);
    } catch (e) { console.error('[tutien] raid enlist', r.id, e); }
  }
}

export interface Film { day: string; boss: string; at: number; win: boolean; max: number; fighters: R.Fighter[]; rounds: R.Round[]; dmg: number[]; ko: number[]; mvp: number }
const g = globalThis as any;
const films: Map<string, Film> = g.__tutienRaidFilms || (g.__tutienRaidFilms = new Map());   // a fought day never changes: kept in memory once read

/** resolveDue at most once per RAID_POLL_MS in this server instance, for the game's own poll: the fight happens at its time even when nobody opens Phó Bản.
 *  Never throws (a failure here must not break the game). */
const RAID_POLL_MS = 20000;
export async function resolveSoon(now: number) {
  if (now - (g.__tutienRaidPoll || 0) < RAID_POLL_MS) return;
  g.__tutienRaidPoll = now;
  try { await resolveDue(now); } catch (e) { console.error('[tutien] raid resolve', e); }
}
/** Fight every day whose time has come and that is not fought yet (today, and the last two days in case nobody came by). */
export async function resolveDue(now: number) {
  const today = R.raidDay(now);
  await ensureRaid(today);
  const due = (await query<{ day: string }>(`SELECT day FROM raids WHERE status = 'open' AND at <= $1 AND day >= $2 ORDER BY day`, [now, R.prevDay(R.prevDay(today))])).rows;
  for (const { day } of due) await resolve(day, now);
}
async function resolve(day: string, now: number) {
  await withLock(`raid:${day}`, async () => {
    const row = (await query<{ status: string; boss: string; at: number }>(`SELECT status, boss, at FROM raids WHERE day = $1`, [day])).rows[0];
    if (!row || row.status !== 'open' || row.at > now) return;
    if (everyone()) await enlist(day, now, true);
    // those who join every day are in, with their last numbers (a player who joined by hand today keeps the numbers of that moment)
    await query(`INSERT INTO raid_entries (day, acc, fighter, joined) SELECT $1, acc, fighter, at FROM raid_auto ON CONFLICT (day, acc) DO NOTHING`, [day]);
    const rows = (await query<{ acc: string; fighter: R.Fighter }>(`SELECT acc, fighter FROM raid_entries WHERE day = $1 ORDER BY joined, acc`, [day])).rows;
    const boss = R.BOSS(row.boss);
    if (!rows.length) { await query(`UPDATE raids SET status = 'empty', done = $2 WHERE day = $1`, [day, now]); return; }
    const fs = rows.map((r) => r.fighter);
    const res = R.fight(boss, fs, day);
    for (let i = 0; i < rows.length; i++) await query(`UPDATE raid_entries SET idx = $3, reward = $4::jsonb WHERE day = $1 AND acc = $2`, [day, rows[i].acc, i, JSON.stringify(R.rewardOf(boss, res, fs, i, day))]);
    const film: Film = { day, boss: boss.id, at: row.at, win: res.win, max: res.max, fighters: fs, rounds: res.rounds, dmg: res.dmg, ko: res.ko, mvp: res.mvp };
    await query(`UPDATE raids SET status = 'done', n = $2, film = $3::jsonb, done = $4 WHERE day = $1`, [day, rows.length, JSON.stringify(film), now]);
    films.set(day, film);
  });
}
async function filmOf(day: string): Promise<Film | null> {
  const had = films.get(day); if (had) return had;
  const f = (await query<{ film: Film | null }>(`SELECT film FROM raids WHERE day = $1 AND status = 'done'`, [day])).rows[0]?.film || null;
  if (f) films.set(day, f);
  return f;
}

// Whoever has signed up for a day, for the stage before the fight: everyone up to SHOW, the strongest first, and always the caller.
const SHOW = 60;
async function crowdOf(day: string, acc: string): Promise<{ count: number; list: R.Fighter[] }> {
  const all = (await query<{ acc: string; fighter: R.Fighter }>(`SELECT acc, fighter FROM raid_entries WHERE day = $1 UNION ALL SELECT acc, fighter FROM raid_auto WHERE acc NOT IN (SELECT acc FROM raid_entries WHERE day = $1)`, [day])).rows;
  const mine = all.find((r) => r.acc === acc);
  const rest = all.filter((r) => r.acc !== acc).map((r) => r.fighter).sort((a, b) => b.power - a.power).slice(0, mine ? SHOW - 1 : SHOW);
  return { count: all.length, list: mine ? [mine.fighter, ...rest] : rest };
}

export interface Claim { day: string; boss: string; win: boolean; reward: R.Reward }
/** What the Phó Bản screen shows. Also fights a due day, and refreshes the caller's numbers while they can still change. */
export async function raidView(acc: string, now: number) {
  await resolveDue(now);
  const day = R.raidDay(now);
  const row = (await query<{ status: string; boss: string; at: number }>(`SELECT status, boss, at FROM raids WHERE day = $1`, [day])).rows[0];
  const at = row ? row.at : fightAt(day), boss = R.BOSS(row ? row.boss : bossFor(day));
  const status = row ? row.status : 'open';
  // players who are not in today's fight yet (new since the last look), at most once a minute in this server instance
  if (everyone() && status === 'open' && now < at && now - (g.__tutienRaidEnlist || 0) > 60000) {
    g.__tutienRaidEnlist = now;
    try { await enlist(day, now, false); } catch (e) { console.error('[tutien] raid enlist', e); }
  }
  const joinedRow = (await query<{ joined: number }>(`SELECT joined FROM raid_entries WHERE day = $1 AND acc = $2`, [day, acc])).rows[0];
  const auto = !!(await query(`SELECT 1 FROM raid_auto WHERE acc = $1`, [acc])).rowCount;
  // before the fight, the numbers of a fighter follow the save (gear changed since joining counts)
  if (status === 'open' && now < at && (joinedRow || auto)) {
    try {
      const a = await loadAccount(acc);
      if (a && a.state && a.state.player) {
        const f = JSON.stringify(fighterOf(a.state, await publicId(acc)));
        if (joinedRow) await query(`UPDATE raid_entries SET fighter = $3::jsonb WHERE day = $1 AND acc = $2`, [day, acc, f]);
        if (auto) await query(`UPDATE raid_auto SET fighter = $2::jsonb WHERE acc = $1`, [acc, f]);
      }
    } catch (e) { console.error('[tutien] raid refresh', e); }
  }
  const crowd = status === 'open' ? await crowdOf(day, acc) : { count: (await query<{ n: number }>(`SELECT n FROM raids WHERE day = $1`, [day])).rows[0]?.n || 0, list: [] };
  // the film: today's once fought, else the last fought day (yesterday's, while today's is still to come)
  const last = (await query<{ day: string }>(`SELECT day FROM raids WHERE status = 'done' AND day <= $1 ORDER BY day DESC LIMIT 1`, [day])).rows[0];
  const film = last ? await filmOf(last.day) : null;
  let me = -1, myReward: R.Reward | null = null, claimed = false;
  if (film) {
    const e = (await query<{ idx: number | null; reward: R.Reward | null; claimed: boolean }>(`SELECT idx, reward, claimed FROM raid_entries WHERE day = $1 AND acc = $2`, [film.day, acc])).rows[0];
    if (e && e.idx !== null) { me = e.idx; myReward = e.reward; claimed = e.claimed; }
  }
  const claims = await claimsOf(acc);
  return {
    now, today: { day, boss: boss.id, at, status, joined: !!joinedRow, auto, all: everyone(), count: crowd.count, crowd: crowd.list },
    film: film ? { ...film, me, reward: myReward, claimed } : null,
    claims,
  };
}
async function claimsOf(acc: string): Promise<Claim[]> {
  const rows = (await query<{ day: string; reward: R.Reward; boss: string; film_win: boolean | null }>(
    `SELECT e.day, e.reward, r.boss, (r.film->>'win')::boolean AS film_win FROM raid_entries e JOIN raids r ON r.day = e.day WHERE e.acc = $1 AND e.claimed = false AND e.reward IS NOT NULL ORDER BY e.day DESC LIMIT 7`, [acc])).rows;
  return rows.map((r) => ({ day: r.day, boss: r.boss, win: !!r.film_win, reward: r.reward }));
}

// ---------- intents (service.ts ASYNC_INTENTS): the caller's save is `st`, already settled and under its lock
type Res = G.Res;
export async function join(acc: string, st: G.GameState, body: any, now: number): Promise<Res> {
  await resolveDue(now);
  const day = R.raidDay(now), at = await atOf(day);
  if (now >= at) return G.fail('E_RAID_CLOSED');
  const f = fighterOf(st, await publicId(acc));
  await query(`INSERT INTO raid_entries (day, acc, fighter, joined) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (day, acc) DO UPDATE SET fighter = EXCLUDED.fighter`, [day, acc, JSON.stringify(f), now]);
  if (body && body.auto === true) await query(`INSERT INTO raid_auto (acc, fighter, at) VALUES ($1, $2::jsonb, $3) ON CONFLICT (acc) DO UPDATE SET fighter = EXCLUDED.fighter`, [acc, JSON.stringify(f), now]);
  return G.ok('Đã ghi danh Phó Bản.', { fighter: f });
}
export async function leave(acc: string, _st: G.GameState, _body: any, now: number): Promise<Res> {
  const day = R.raidDay(now), at = await atOf(day);
  if (now >= at) return G.fail('E_RAID_CLOSED');
  await query(`DELETE FROM raid_entries WHERE day = $1 AND acc = $2`, [day, acc]);
  await query(`DELETE FROM raid_auto WHERE acc = $1`, [acc]);   // leaving today also stops joining every day (else the fight would put them back in)
  return G.ok('Đã rút tên khỏi Phó Bản hôm nay.');
}
export async function setAuto(acc: string, st: G.GameState, body: any, now: number): Promise<Res> {
  if (!body || typeof body.on !== 'boolean') return G.fail('E_BAD_REQUEST');
  if (!body.on) { await query(`DELETE FROM raid_auto WHERE acc = $1`, [acc]); return G.ok('Đã tắt tự tham gia.'); }
  const f = fighterOf(st, await publicId(acc));
  await query(`INSERT INTO raid_auto (acc, fighter, at) VALUES ($1, $2::jsonb, $3) ON CONFLICT (acc) DO UPDATE SET fighter = EXCLUDED.fighter`, [acc, JSON.stringify(f), now]);
  // turning it on before today's fight also signs up for today
  const day = R.raidDay(now);
  if (now < (await atOf(day))) await query(`INSERT INTO raid_entries (day, acc, fighter, joined) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (day, acc) DO NOTHING`, [day, acc, JSON.stringify(f), now]);
  return G.ok('Mỗi ngày sẽ tự tham gia Phó Bản.');
}
/** Take the reward of a fought day into the save. A good that does not fit (the counter is full) is paid in Linh Thạch at its Phường Thị price instead. */
export async function claim(acc: string, st: G.GameState, body: any, _now: number): Promise<Res> {
  const day = body && typeof body.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : null;
  if (!day) return G.fail('E_BAD_REQUEST');
  const e = (await query<{ reward: R.Reward | null; claimed: boolean }>(`SELECT reward, claimed FROM raid_entries WHERE day = $1 AND acc = $2 FOR UPDATE`, [day, acc])).rows[0];
  if (!e || !e.reward) return G.fail('E_NOT_FOUND');
  if (e.claimed) return G.fail('E_RAID_CLAIMED');
  const r = e.reward;
  let stones = r.stones;
  for (const gd of r.goods) {
    if (!stackInfo(gd.key) || !giveStack(st, gd.key, gd.qty)) {
      const id = gd.key.startsWith('shop:') ? gd.key.slice(5) : '', s = id ? C.SHOP_ITEM(id) : null, m = gd.key.startsWith('mat:') ? C.MATERIALS.find((x) => `mat:${x.id}` === gd.key) : null;
      stones += Math.round((s ? s.price : m ? m.price * 10 : 200) * gd.qty);
    }
  }
  G.earn(st, stones, 'raid');
  await query(`UPDATE raid_entries SET claimed = true WHERE day = $1 AND acc = $2`, [day, acc]);
  return G.ok('Đã nhận thưởng Phó Bản.', { day, reward: r, stones });
}
