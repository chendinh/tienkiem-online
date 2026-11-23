// The error log of /gen-ai: every failed picture is kept (what failed, at which step, what fal answered, the description; never the photo), so the owner can
// read the real reason on /admin/gen-ai instead of the short message the player sees. The player gets a reference (ref) to quote. Never throws.
import { randomBytes } from 'node:crypto';
import { query } from './db';
import { appendLog } from './store';
import { shapeError, type GenError } from '../genai';

export async function logError(e: Partial<Record<keyof GenError, unknown>>): Promise<string> {
  const ref = randomBytes(3).toString('hex'), entry = { ref, at: Date.now(), ...shapeError(e) };
  console.error('[gen-ai] error', ref, entry.stage, entry.code, entry.http, entry.fal, entry.detail.slice(0, 200));
  try { await appendLog('genai-error', entry); } catch (x: any) { console.warn('[gen-ai] could not save the error:', String(x?.message || x).slice(0, 100)); }
  return ref;
}
export async function recentErrors(limit = 100): Promise<GenError[]> {
  const r = await query<{ entry: GenError }>(`SELECT entry FROM logs WHERE name = 'genai-error' ORDER BY id DESC LIMIT $1`, [limit]);
  return r.rows.map((x) => x.entry);
}
export async function clearErrors(): Promise<number> {
  return (await query(`DELETE FROM logs WHERE name = 'genai-error'`)).rowCount || 0;
}
