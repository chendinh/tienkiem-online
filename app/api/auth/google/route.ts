import { randomBytes } from 'node:crypto';
import { siteOrigin } from '@/lib/server/mail';
import { googleConfigured, authUrl } from '@/lib/server/google';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Start: remember a random `state` in a short cookie (checked on return), then go to Google.
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  if (!googleConfigured()) return Response.redirect(`${origin}/?authError=google`, 302);
  const state = randomBytes(16).toString('base64url');
  return new Response(null, { status: 302, headers: {
    Location: authUrl(origin, state),
    'Set-Cookie': `tt_oauth=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  } });
}
