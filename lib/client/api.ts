'use client';
// Talks to the Game_Server. The browser only sends intents; every result comes back from the server (Requirement 2).
import type { ServerOut } from './types';
import { errText } from '../strings';

export type AuthOut = { ok: boolean; code?: string; user?: { email: string } | null };
let onNet: (up: boolean) => void = () => {};
export const watchNet = (f: (up: boolean) => void) => { onNet = f; };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2)}`);

async function send(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  const j = await r.json().catch(() => ({ ok: false, code: 'E_SERVER' }));
  return { status: r.status, j };
}
// Retries on a lost connection with the SAME request id, so a repeat never applies twice (Requirement 31.12).
async function retrying<T>(f: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { const v = await f(); onNet(true); return v; } catch (e) { last = e; onNet(false); await sleep(Math.min(8000, 800 * 2 ** i)); }
  }
  throw last;
}

export const authMe = async (): Promise<{ email: string } | null> => { const { j } = await retrying(() => send('/api/auth')); return j.user || null; };
export async function authPost(body: any): Promise<AuthOut> {
  try { const { j } = await send('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return j; }
  catch { return { ok: false, code: 'E_SERVER' }; }
}
export async function gameGet(): Promise<ServerOut> {
  const { status, j } = await retrying(() => send('/api/game'));
  if (status === 401) return { ok: false, code: 'E_AUTH', state: null };
  return j;
}
export async function gameAct(body: any): Promise<ServerOut> {
  const withId = { rid: rid(), ...body };
  const { status, j } = await retrying(() => send('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withId) }));
  if (status === 401) return { ok: false, code: 'E_AUTH', state: null };
  return j;
}
export async function rankingGet(query: string): Promise<any> {
  const { status, j } = await retrying(() => send(`/api/ranking?${query}`));
  if (status === 401) return { ok: false, code: 'E_AUTH' };
  return j;
}
export async function marketGet(query: string): Promise<any> {
  const { status, j } = await retrying(() => send(`/api/market?${query}`));
  if (status === 401) return { ok: false, code: 'E_AUTH' };
  return j;
}
export const messageOf = (o: { ok: boolean; code?: string; msg?: string }) => (o.ok ? o.msg || '' : errText(o.code || 'E_SERVER'));
