import { register, login, logout, requestReset, confirmReset, deleteAccount, sessionUser, createGuest, requestLink, confirmLink, confirmLinkCode, ApiError } from '@/lib/server/auth';
import { siteOrigin } from '@/lib/server/mail';
import { googleConfigured } from '@/lib/server/google';
import * as PK from '@/lib/server/passkey';
import { createState, serverNow } from '@/lib/server/service';
import { cookieOf, json, sessionCookie, clearCookie, checkWrite, readBody, guard, clientIp, requireUser } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return guard(async () => {
    const u = await sessionUser(cookieOf(req), serverNow());
    return json({ ok: true, user: u ? { email: u.guest ? '' : u.email, guest: u.guest, passkeys: await PK.passkeyCount(u.id) } : null, providers: { google: googleConfigured() } });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const pkOrigin = req.headers.get('origin') || siteOrigin(req);   // WebAuthn checks the page's own origin
    const b = await readBody(req), now = serverNow(), ua = req.headers.get('user-agent') || '';
    switch (b && b.action) {
      case 'register': {
        const gender = b.gender === 'f' || b.gender === 'm' ? b.gender : undefined;
        const r = await register(b.email, b.password, ua, now, (_id, email) => createState(gender, now, email));
        return json({ ok: true, user: { email: r.email, guest: false } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'login': {
        const r = await login(b.email, b.password, ua, clientIp(req), now);
        return json({ ok: true, user: { email: r.email, guest: false } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'guest': {
        const r = await createGuest(ua, clientIp(req), now, (_id, email) => createState(undefined, now, email, true));
        return json({ ok: true, user: { email: '', guest: true } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'link-request': {
        const u = await requireUser(req);
        await requestLink(u.id, b.email, b.password, siteOrigin(req), now);
        return json({ ok: true });
      }
      case 'link-code': {
        const u = await requireUser(req);
        const r = await confirmLinkCode(u.id, b.code, now);
        return json({ ok: true, user: { email: r.email, guest: false } });
      }
      case 'pk-reg-options': {
        const u = await requireUser(req);
        return json({ ok: true, ...(await PK.regOptions(u.id, u.guest ? '' : u.email, pkOrigin, now)) });
      }
      case 'pk-reg-verify': {
        const u = await requireUser(req);
        await PK.regVerify(u.id, b.cid, b.response, pkOrigin, now);
        return json({ ok: true });
      }
      case 'pk-login-options':
        return json({ ok: true, ...(await PK.loginOptions(pkOrigin, now)) });
      case 'pk-login-verify': {
        const r = await PK.loginVerify(b.cid, b.response, pkOrigin, ua, now);
        return json({ ok: true, user: { email: r.email, guest: r.guest } }, 200, { 'Set-Cookie': sessionCookie(r.token) });
      }
      case 'pk-remove': {
        const u = await requireUser(req);
        await PK.removeAll(u.id);
        return json({ ok: true });
      }
      case 'link-confirm': {
        const r = await confirmLink(b.token, now);
        return json({ ok: true, user: { email: r.email, guest: false } });
      }
      case 'logout':
        await logout(cookieOf(req));
        return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
      case 'reset-request': {
        await requestReset(b.email, siteOrigin(req), now);
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
