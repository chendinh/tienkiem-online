// Access to the owner's pages (the report). A long secret in the environment, sent as "Authorization: Bearer <key>" (the page asks for it once and keeps it in the tab).
// ADMIN_KEY, or CRON_SECRET when ADMIN_KEY is not set. Without either the pages stay closed. Wrong keys are slowed down per address.
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from './auth';
import { clientIp } from './http';

export const adminSecret = () => process.env.ADMIN_KEY || process.env.CRON_SECRET || '';
const g = globalThis as any;
const FAILS: Map<string, { n: number; until: number; at: number }> = g.__tutienAdminFails || (g.__tutienAdminFails = new Map());

export function checkAdminKey(given: string, secret = adminSecret()): boolean {
  if (!secret || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function requireAdmin(req: Request, now = Date.now()) {
  const secret = adminSecret();
  if (!secret) throw new ApiError('E_NO_ADMIN_KEY', 503);
  const ip = clientIp(req), f = FAILS.get(ip);
  if (f && f.until > now) throw new ApiError('E_RATE_LIMIT', 429);
  const h = req.headers.get('authorization') || '';
  const given = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (checkAdminKey(given, secret)) { FAILS.delete(ip); return; }
  const n = (f && now - f.at < 900_000 ? f.n : 0) + 1;   // a quiet quarter of an hour forgives earlier mistakes
  FAILS.set(ip, { n, at: now, until: n >= 5 ? now + 60_000 * Math.min(30, 2 ** (n - 5)) : 0 });
  if (FAILS.size > 500) FAILS.clear();
  throw new ApiError('E_AUTH', 401);
}
