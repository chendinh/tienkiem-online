import { oauthSignIn, sessionUser, ApiError } from '@/lib/server/auth';
import { createState, serverNow } from '@/lib/server/service';
import { cookieOf, sessionCookie } from '@/lib/server/http';
import { siteOrigin } from '@/lib/server/mail';
import { googleConfigured, emailFromCode } from '@/lib/server/google';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const origin = siteOrigin(req), url = new URL(req.url);
  const back = (e: string) => new Response(null, { status: 302, headers: { Location: `${origin}/?authError=${e}`, 'Set-Cookie': 'tt_oauth=; Path=/api/auth/google; Max-Age=0' } });
  try {
    const state = url.searchParams.get('state'), code = url.searchParams.get('code');
    if (!googleConfigured() || !code || !state || state !== cookieOf(req, 'tt_oauth')) return back('google');
    const email = await emailFromCode(code, origin);
    if (!email) return back('google');
    const now = serverNow();
    const cur = await sessionUser(cookieOf(req), now);   // a guest who signs in with Google keeps the character
    const r = await oauthSignIn(email, cur && cur.guest ? cur.id : null, req.headers.get('user-agent') || '', now, (_id, em) => createState(undefined, now, em));
    const h = new Headers({ Location: `${origin}/` });
    h.append('Set-Cookie', sessionCookie(r.token));
    h.append('Set-Cookie', 'tt_oauth=; Path=/api/auth/google; Max-Age=0');
    return new Response(null, { status: 302, headers: h });
  } catch (e) {
    if (!(e instanceof ApiError)) console.error('[tutien] google', e);
    return back('google');
  }
}
