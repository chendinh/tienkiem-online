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
