// "Sign in with Google": the standard authorization-code flow, server side. Off until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
// Redirect URI to register in Google Cloud: <SITE_URL>/api/auth/google/callback
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function authUrl(origin: string, state: string): string {
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID as string, redirect_uri: redirectUri(origin), response_type: 'code', scope: 'openid email', state, prompt: 'select_account' });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

// Trade the code for the signed-in address. The id_token comes straight from Google over TLS, so its payload can be trusted without checking the signature again.
export async function emailFromCode(code: string, origin: string): Promise<string | null> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID as string, client_secret: process.env.GOOGLE_CLIENT_SECRET as string, redirect_uri: redirectUri(origin), grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const t = await r.json().catch(() => null);
  const part = t && typeof t.id_token === 'string' ? t.id_token.split('.')[1] : '';
  if (!part) return null;
  const c = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  if (c.aud !== process.env.GOOGLE_CLIENT_ID || !c.email_verified || typeof c.email !== 'string') return null;
  return c.email;
}
