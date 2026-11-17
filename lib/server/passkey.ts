// Passkeys (WebAuthn): sign in with fingerprint, face or device PIN, no password. Works for guests too, so a guest can come back without an e-mail.
import { randomBytes } from 'node:crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { query } from './db';
import { ApiError, metaById, openSession, lockOf } from './auth';
import { withLock } from './store';

const rpOf = (origin: string) => ({ rpID: new URL(origin).hostname, rpName: 'Tiên Kiếm' });
const MAX_PER_ACCOUNT = 10;

async function putChallenge(challenge: string, acc: string, now: number): Promise<string> {
  const id = randomBytes(16).toString('base64url');
  await query('DELETE FROM pk_challenges WHERE exp < $1', [now]);
  await query('INSERT INTO pk_challenges (id, challenge, acc, exp) VALUES ($1, $2, $3, $4)', [id, challenge, acc, now + 5 * 60000]);
  return id;
}
// one use: the row is deleted as it is read
async function takeChallenge(id: unknown, now: number): Promise<{ challenge: string; acc: string }> {
  if (typeof id !== 'string' || id.length > 60) throw new ApiError('E_PASSKEY');
  const r = await query<{ challenge: string; acc: string }>('DELETE FROM pk_challenges WHERE id = $1 AND exp >= $2 RETURNING challenge, acc', [id, now]);
  if (!r.rows[0]) throw new ApiError('E_PASSKEY');
  return r.rows[0];
}

export async function passkeyCount(acc: string): Promise<number> {
  return (await query<{ n: number }>('SELECT count(*)::int AS n FROM passkeys WHERE acc = $1', [acc])).rows[0].n;
}

export async function regOptions(acc: string, email: string, origin: string, now: number) {
  if ((await passkeyCount(acc)) >= MAX_PER_ACCOUNT) throw new ApiError('E_PASSKEY');
  const have = (await query<{ id: string }>('SELECT id FROM passkeys WHERE acc = $1', [acc])).rows;
  const { rpID, rpName } = rpOf(origin);
  const options = await generateRegistrationOptions({
    rpName, rpID, userName: email || 'khach', userDisplayName: email ? email : 'Đạo hữu (khách)', userID: Buffer.from(acc, 'hex'), attestationType: 'none',
    excludeCredentials: have.map((c) => ({ id: c.id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  return { options, cid: await putChallenge(options.challenge, acc, now) };
}

export async function regVerify(acc: string, cid: unknown, response: any, origin: string, now: number) {
  const c = await takeChallenge(cid, now);
  if (c.acc !== acc) throw new ApiError('E_PASSKEY');
  let v;
  try { v = await verifyRegistrationResponse({ response, expectedChallenge: c.challenge, expectedOrigin: origin, expectedRPID: rpOf(origin).rpID }); }
  catch { throw new ApiError('E_PASSKEY'); }
  if (!v.verified) throw new ApiError('E_PASSKEY');
  const cr = v.registrationInfo.credential;
  await query('INSERT INTO passkeys (id, acc, public_key, counter, transports, created) VALUES ($1, $2, $3, $4, $5::jsonb, $6) ON CONFLICT (id) DO NOTHING',
    [cr.id, acc, Buffer.from(cr.publicKey).toString('base64url'), cr.counter, JSON.stringify(cr.transports || []), now]);
}

export async function loginOptions(origin: string, now: number) {
  const options = await generateAuthenticationOptions({ rpID: rpOf(origin).rpID, userVerification: 'preferred' });   // no list: the device offers its own passkeys
  return { options, cid: await putChallenge(options.challenge, '', now) };
}

export async function loginVerify(cid: unknown, response: any, origin: string, ua: string, now: number): Promise<{ token: string; email: string; guest: boolean }> {
  const c = await takeChallenge(cid, now);
  const id = response && typeof response.id === 'string' ? response.id : '';
  const row = (await query<{ id: string; acc: string; public_key: string; counter: number; transports: string[] }>('SELECT id, acc, public_key, counter, transports FROM passkeys WHERE id = $1', [id])).rows[0];
  if (!row) throw new ApiError('E_PASSKEY', 401);
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response, expectedChallenge: c.challenge, expectedOrigin: origin, expectedRPID: rpOf(origin).rpID,
      credential: { id: row.id, publicKey: Buffer.from(row.public_key, 'base64url'), counter: row.counter, transports: row.transports as any },
    });
  } catch { throw new ApiError('E_PASSKEY', 401); }
  if (!v.verified) throw new ApiError('E_PASSKEY', 401);
  await query('UPDATE passkeys SET counter = $2 WHERE id = $1', [row.id, v.authenticationInfo.newCounter]);
  return withLock(lockOf(row.acc), async () => {
    const meta = await metaById(row.acc);
    if (!meta) throw new ApiError('E_PASSKEY', 401);
    return { token: await openSession(meta.id, ua, now), email: meta.guest ? '' : meta.email, guest: meta.guest };
  });
}

export async function removeAll(acc: string) { await query('DELETE FROM passkeys WHERE acc = $1', [acc]); }
