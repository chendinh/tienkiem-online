// Small helpers shared by the API routes.
import { BALANCE as B } from '../balance';
import { sessionUser, ApiError } from './auth';
import { serverNow } from './service';

export const COOKIE = 'tt_session';
export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export function cookieOf(req: Request, name = COOKIE): string | null {
  const c = req.headers.get('cookie') || '';
  for (const part of c.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
  return null;
}
export const sessionCookie = (token: string) => `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${B.sessionLifetimeSec}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// A request that changes something must be JSON and, when the browser says where it comes from, come from this site.
export function checkWrite(req: Request) {
  if (!(req.headers.get('content-type') || '').includes('application/json')) throw new ApiError('E_BAD_REQUEST');
  const origin = req.headers.get('origin'), host = req.headers.get('host');
  if (origin && host) { try { if (new URL(origin).host !== host) throw new ApiError('E_BAD_REQUEST', 403); } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError('E_BAD_REQUEST', 403); } }
}
export async function readBody(req: Request): Promise<any> {
  const text = await req.text();
  if (text.length > 20000) throw new ApiError('E_BAD_REQUEST', 413);
  try { return JSON.parse(text); } catch { throw new ApiError('E_BAD_REQUEST'); }
}
export async function requireUser(req: Request) {
  const u = await sessionUser(cookieOf(req), serverNow());
  if (!u) throw new ApiError('E_AUTH', 401);
  return u;
}
export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try { return await fn(); }
  catch (e) {
    if (e instanceof ApiError) return json({ ok: false, code: e.code }, e.status);
    console.error('[tutien] lỗi máy chủ', e);
    return json({ ok: false, code: 'E_SERVER' }, 500);
  }
}
