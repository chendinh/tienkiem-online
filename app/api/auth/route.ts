import { register, login, logout, requestReset, confirmReset, deleteAccount, sessionUser, ApiError } from '@/lib/server/auth';
import { createState, serverNow } from '@/lib/server/service';
import { cookieOf, json, sessionCookie, clearCookie, checkWrite, readBody, guard, clientIp, requireUser } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return guard(async () => {
    const u = await sessionUser(cookieOf(req), serverNow());
    return json({ ok: true, user: u ? { email: u.email } : null });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const b = await readBody(req), now = serverNow(), ua = req.headers.get('user-agent') || '';
    switch (b && b.action) {
      case 'register': {
        const gender = b.gender === 'f' || b.gender === 'm' ? b.gender : undefined;
        const r = await register(b.email, b.password, ua, now, () => createState(gender, now));
        return json({ ok: true, user: { email: r.email } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'login': {
        const r = await login(b.email, b.password, ua, clientIp(req), now);
        return json({ ok: true, user: { email: r.email } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'logout':
        await logout(cookieOf(req));
        return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
      case 'reset-request': {
        await requestReset(b.email, new URL(req.url).origin, now);
        return json({ ok: true });
      }
      case 'reset-confirm':
        await confirmReset(b.token, b.password, now);
        return json({ ok: true });
      case 'delete': {
        const u = await requireUser(req);
        await deleteAccount(u.id, b.password);
        return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
      }
      default:
        throw new ApiError('E_BAD_REQUEST');
    }
  });
}
