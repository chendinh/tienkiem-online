// Turns and spend of /gen-ai. Both live in the kv table, one small row per account per day and one per day for the whole site, and are changed
// with single SQL statements, so several server instances can share them. The day is the Vietnamese day (dayKey in lib/genai.ts).
import { query } from './db';
import { dayKey } from '../genai';

const turnKey = (acc: string, now: number) => `genai.turns.${dayKey(now)}.${acc}`;
const spendKey = (now: number) => `genai.spend.${dayKey(now)}`;

export async function turnsUsed(acc: string, now = Date.now()): Promise<number> {
  const r = await query<{ n: number | null }>(`SELECT (value->>'n')::int AS n FROM kv WHERE key = $1`, [turnKey(acc, now)]);
  return r.rows[0]?.n || 0;
}
// Takes one turn when the account still has one; returns false (and takes nothing) when the day's turns are used up.
export async function takeTurn(acc: string, limit: number, now = Date.now()): Promise<boolean> {
  const r = await query<{ n: number }>(
    `INSERT INTO kv (key, value) VALUES ($1, jsonb_build_object('n', 1))
     ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('n', COALESCE((kv.value->>'n')::int, 0) + 1)
     RETURNING (value->>'n')::int AS n`, [turnKey(acc, now)]);
  if ((r.rows[0]?.n || 0) <= limit) return true;
  await giveTurnBack(acc, now);
  return false;
}
export async function giveTurnBack(acc: string, now = Date.now()) {
  try { await query(`UPDATE kv SET value = jsonb_build_object('n', GREATEST(0, COALESCE((value->>'n')::int, 0) - 1)) WHERE key = $1`, [turnKey(acc, now)]); }
  catch (e: any) { console.warn('[gen-ai] could not give a turn back:', String(e?.message || e).slice(0, 100)); }
}

export async function spentToday(now = Date.now()): Promise<number> {
  const r = await query<{ usd: number | null }>(`SELECT (value->>'usd')::float8 AS usd FROM kv WHERE key = $1`, [spendKey(now)]);
  return r.rows[0]?.usd || 0;
}
// A failed write must not lose a picture that was already paid for, so it only logs.
export async function addSpent(usd: number, now = Date.now()) {
  if (!(usd > 0)) return;
  try {
    await query(
      `INSERT INTO kv (key, value) VALUES ($1, jsonb_build_object('usd', $2::float8, 'n', 1))
       ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('usd', COALESCE((kv.value->>'usd')::float8, 0) + $2::float8, 'n', COALESCE((kv.value->>'n')::int, 0) + 1)`,
      [spendKey(now), usd]);
  } catch (e: any) { console.warn('[gen-ai] could not write the spend:', String(e?.message || e).slice(0, 100)); }
}

// ---- per-account record, for the owner's page (/admin/gen-ai): { n: pictures drawn in all, last: time of the last one, email, bonus: extra turns the owner granted }.
// The bonus is spent after the free turns of the day are used up, and it does not expire.
const userKey = (acc: string) => `genai.user.${acc}`;
export interface UserRec { acc: string; email: string; n: number; last: number; bonus: number }

export async function bonusOf(acc: string): Promise<number> {
  const r = await query<{ b: number | null }>(`SELECT (value->>'bonus')::int AS b FROM kv WHERE key = $1`, [userKey(acc)]);
  return Math.max(0, r.rows[0]?.b || 0);
}
// Spends one bonus turn if there is one.
export async function useBonus(acc: string): Promise<boolean> {
  const r = await query(`UPDATE kv SET value = value || jsonb_build_object('bonus', (value->>'bonus')::int - 1) WHERE key = $1 AND COALESCE((value->>'bonus')::int, 0) > 0 RETURNING 1`, [userKey(acc)]);
  return (r.rowCount || 0) > 0;
}
export async function giveBonusBack(acc: string) {
  try { await query(`UPDATE kv SET value = value || jsonb_build_object('bonus', COALESCE((value->>'bonus')::int, 0) + 1) WHERE key = $1`, [userKey(acc)]); }
  catch (e: any) { console.warn('[gen-ai] could not give a bonus turn back:', String(e?.message || e).slice(0, 100)); }
}
// One more picture drawn by this account. Keeps the bonus as it is.
export async function recordGen(acc: string, email: string, now = Date.now()) {
  try {
    await query(
      `INSERT INTO kv (key, value) VALUES ($1, jsonb_build_object('n', 1, 'last', $2::bigint, 'email', $3::text, 'bonus', 0))
       ON CONFLICT (key) DO UPDATE SET value = kv.value || jsonb_build_object('n', COALESCE((kv.value->>'n')::int, 0) + 1, 'last', $2::bigint, 'email', $3::text)`,
      [userKey(acc), now, email]);
  } catch (e: any) { console.warn('[gen-ai] could not record the picture:', String(e?.message || e).slice(0, 100)); }
}
// Owner: add (or take away, never below zero) bonus turns. Returns the bonus after the change.
export async function grantBonus(acc: string, email: string, add: number): Promise<number> {
  const r = await query<{ b: number }>(
    `INSERT INTO kv (key, value) VALUES ($1, jsonb_build_object('n', 0, 'last', 0, 'email', $3::text, 'bonus', GREATEST(0, $2::int)))
     ON CONFLICT (key) DO UPDATE SET value = kv.value || jsonb_build_object('email', $3::text, 'bonus', GREATEST(0, COALESCE((kv.value->>'bonus')::int, 0) + $2::int))
     RETURNING (value->>'bonus')::int AS b`, [userKey(acc), add, email]);
  return r.rows[0]?.b || 0;
}
// Every account that has drawn or been granted something, newest first, with today's turns.
export async function listUsers(now = Date.now()): Promise<(UserRec & { today: number })[]> {
  const rows = (await query<{ key: string; value: any }>(`SELECT key, value FROM kv WHERE key LIKE 'genai.user.%' ORDER BY COALESCE((value->>'last')::bigint, 0) DESC LIMIT 500`)).rows;
  const prefix = `genai.turns.${dayKey(now)}.`;
  const today = new Map((await query<{ key: string; n: number | null }>(`SELECT key, (value->>'n')::int AS n FROM kv WHERE key LIKE $1`, [prefix + '%'])).rows.map((r) => [r.key.slice(prefix.length), r.n || 0]));
  return rows.map((r) => {
    const acc = r.key.slice('genai.user.'.length), v = r.value || {};
    return { acc, email: String(v.email || ''), n: Number(v.n) || 0, last: Number(v.last) || 0, bonus: Math.max(0, Number(v.bonus) || 0), today: today.get(acc) || 0 };
  });
}
// An account with this e-mail that is not a guest (guests cannot use the feature).
export async function accountByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const r = await query<{ id: string; email: string }>(`SELECT id, email FROM acct_auth WHERE email_key = $1 AND guest = false`, [email.trim().toLowerCase()]);
  return r.rows[0] || null;
}
