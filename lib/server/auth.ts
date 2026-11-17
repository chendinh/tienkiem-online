// Account_Service: registration, login, sessions, password reset, account deletion (Requirement 1).
import { randomBytes, randomInt, scrypt as scryptCb, createHash, timingSafeEqual } from 'node:crypto';
import { BALANCE as B } from '../balance';
import { type ErrCode } from '../strings';
import { unpublish } from './ranking';
import { query } from './db';
import { saveAccount, removeAccount, withLock, type AccountFile } from './store';
import { sendMail, mailAllowed } from './mail';
import { resetMail, linkMail } from './mailTemplates';

export type { AccountFile };
interface AcctMeta { id: string; email: string; salt: string; hash: string; created: number; guest: boolean }
export class ApiError extends Error { constructor(public code: ErrCode, public status = 400) { super(code); } }

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const emailKey = (e: string) => e.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lock per account, so players do not wait for each other (the file version had one lock for everybody).
export const lockOf = (acc: string) => `auth:${acc}`;

const scrypt = (pw: string, salt: Buffer) => new Promise<Buffer>((res, rej) => scryptCb(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw: string): Promise<{ salt: string; hash: string }> { const salt = randomBytes(16); return { salt: salt.toString('hex'), hash: (await scrypt(pw, salt)).toString('hex') }; }
async function checkPassword(pw: string, m: { salt: string; hash: string }): Promise<boolean> {
  const k = await scrypt(pw, Buffer.from(m.salt, 'hex')), h = Buffer.from(m.hash, 'hex');
  return k.length === h.length && timingSafeEqual(k, h);
}
const DUMMY = { salt: '00'.repeat(16), hash: '00'.repeat(64) };

export async function metaById(id: string): Promise<AcctMeta | null> {
  return (await query<AcctMeta>('SELECT id, email, salt, hash, created, guest FROM acct_auth WHERE id = $1', [id])).rows[0] || null;
}
async function metaByEmail(key: string): Promise<AcctMeta | null> {
  return (await query<AcctMeta>('SELECT id, email, salt, hash, created, guest FROM acct_auth WHERE email_key = $1', [key])).rows[0] || null;
}

function checkCredentialsShape(email: unknown, password: unknown): { email: string; password: string } {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) throw new ApiError('E_EMAIL');
  if (typeof password !== 'string' || password.length < B.passwordMinLength || password.length > 200) throw new ApiError('E_PASSWORD');
  return { email: email.trim(), password };
}

// failed-login throttle (per email and address), kept in the database so every server instance sees the same count
async function throttle(key: string, now: number) {
  const r = await query<{ until: number }>('SELECT until FROM login_fails WHERE key = $1', [key]);
  if (r.rows[0] && r.rows[0].until > now) throw new ApiError('E_RATE_LIMIT', 429);
}
async function noteFail(key: string, now: number) {
  await query(
    `INSERT INTO login_fails (key, n, until, at) VALUES ($1, 1, 0, $3)
     ON CONFLICT (key) DO UPDATE SET at = $3,
       n = CASE WHEN login_fails.n + 1 >= 8 THEN 0 ELSE login_fails.n + 1 END,
       until = CASE WHEN login_fails.n + 1 >= 8 THEN $2 ELSE login_fails.until END`,
    [key, now + 15 * 60000, now],
  );
  if (Math.random() < 0.02) await query('DELETE FROM login_fails WHERE at < $1', [now - 86400000]);   // forget old rows now and then
}

// Open a session: forget this account's expired sessions, make room under Max_Active_Sessions (the oldest goes first), add the new one.
export async function openSession(acc: string, ua: string, now: number): Promise<string> {
  await query('DELETE FROM sessions WHERE acc = $1 AND $2 - last_at > $3', [acc, now, B.sessionLifetimeSec * 1000]);
  const alive = (await query<{ token_hash: string }>('SELECT token_hash FROM sessions WHERE acc = $1 ORDER BY last_at ASC', [acc])).rows;
  const drop = alive.length - (B.maxActiveSessions - 1);
  if (drop > 0) await query('DELETE FROM sessions WHERE token_hash = ANY($1::text[])', [alive.slice(0, drop).map((s) => s.token_hash)]);
  const token = randomBytes(32).toString('base64url');
  await query('INSERT INTO sessions (token_hash, acc, created, last_at, ua) VALUES ($1, $2, $3, $3, $4)', [sha(token), acc, now, ua.slice(0, 120)]);
  return token;
}

// Create the Account together with its Player_Character and Game_State, or nothing at all (Requirement 1.1, 1.5).
// Everything runs in one transaction, so a failure leaves no half-made account behind.
export async function register(rawEmail: unknown, rawPassword: unknown, ua: string, now: number, makeState: (accountId: string, email: string) => any): Promise<{ token: string; email: string }> {
  const { email, password } = checkCredentialsShape(rawEmail, rawPassword);
  const pw = await hashPassword(password);
  const id = randomBytes(12).toString('hex');
  return withLock(lockOf(id), async () => {
    // the unique index on email_key decides between two sign-ups with the same address, also across server instances
    const ins = await query('INSERT INTO acct_auth (id, email, email_key, salt, hash, created) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email_key) DO NOTHING', [id, email, emailKey(email), pw.salt, pw.hash, now]);
    if (!ins.rowCount) throw new ApiError('E_EMAIL_TAKEN', 409);
    await saveAccount({ id, email, created: now, state: makeState(id, email) });
    const token = await openSession(id, ua, now);
    return { token, email };
  });
}

export async function login(rawEmail: unknown, rawPassword: unknown, ua: string, ip: string, now: number): Promise<{ token: string; email: string }> {
  if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string' || rawEmail.length > 254 || rawPassword.length > 200) throw new ApiError('E_CREDENTIALS', 401);
  const key = emailKey(rawEmail), tk = `${key}|${ip}`;
  await throttle(tk, now);
  const meta = await metaByEmail(key);
  const good = await checkPassword(rawPassword, meta || DUMMY);   // the same work whether or not the email exists (Requirement 1.11)
  if (!meta || !good) { await noteFail(tk, now); throw new ApiError('E_CREDENTIALS', 401); }
  await query('DELETE FROM login_fails WHERE key = $1', [tk]);
  return withLock(lockOf(meta.id), async () => {
    if (!(await metaById(meta.id))) throw new ApiError('E_CREDENTIALS', 401);
    return { token: await openSession(meta.id, ua, now), email: meta.email };
  });
}

export async function sessionUser(token: string | undefined | null, now: number): Promise<{ id: string; email: string; guest: boolean } | null> {
  if (!token) return null;
  const k = sha(token);
  const r = await query<{ acc: string; last_at: number; email: string; guest: boolean }>('SELECT s.acc, s.last_at, a.email, a.guest FROM sessions s JOIN acct_auth a ON a.id = s.acc WHERE s.token_hash = $1', [k]);
  const s = r.rows[0];
  if (!s || now - s.last_at > B.sessionLifetimeSec * 1000) return null;
  if (now - s.last_at > 60000) await query('UPDATE sessions SET last_at = $2 WHERE token_hash = $1', [k, now]);   // sliding expiry, written at most once a minute
  return { id: s.acc, email: s.email, guest: s.guest };
}

export async function logout(token: string | undefined | null) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [sha(token)]);
}

// Same answer for known and unknown emails (Requirement 1.17). The mail goes out through lib/server/mail.ts.
export async function requestReset(rawEmail: unknown, origin: string, now: number) {
  if (typeof rawEmail !== 'string' || rawEmail.length > 254) return;
  const meta = await metaByEmail(emailKey(rawEmail));
  if (!meta || meta.guest) return;   // a guest has no real address to write to
  if (!(await mailAllowed(meta.email, now))) return;   // same silent answer
  await withLock(lockOf(meta.id), async () => {
    const token = randomBytes(32).toString('base64url');
    await query('INSERT INTO resets (token_hash, acc, exp, used) VALUES ($1, $2, $3, false)', [sha(token), meta.id, now + B.passwordResetLifetimeSec * 1000]);
    await query('DELETE FROM resets WHERE exp < $1', [now - 86400000]);
    const link = `${origin}/?reset=${token}`;
    await sendMail(resetMail(origin, meta.email, link, Math.round(B.passwordResetLifetimeSec / 60)), now);
  });
}
export async function confirmReset(token: unknown, rawPassword: unknown, now: number) {
  if (typeof token !== 'string' || typeof rawPassword !== 'string' || rawPassword.length < B.passwordMinLength || rawPassword.length > 200) throw new ApiError('E_PASSWORD');
  const pw = await hashPassword(rawPassword);
  const k = sha(token);
  await withLock(`reset:${k}`, async () => {
    // single use: only one request can flip `used`
    const r = await query<{ acc: string }>('UPDATE resets SET used = true WHERE token_hash = $1 AND used = false AND exp >= $2 RETURNING acc', [k, now]);
    const acc = r.rows[0]?.acc;
    if (!acc) throw new ApiError('E_RESET_INVALID');
    const upd = await query('UPDATE acct_auth SET salt = $2, hash = $3 WHERE id = $1', [acc, pw.salt, pw.hash]);
    if (!upd.rowCount) throw new ApiError('E_RESET_INVALID');   // the account is gone (rolled back: the token stays unused)
    await query('DELETE FROM sessions WHERE acc = $1', [acc]);
  });
}

// Remove the Account and all its data (Requirement 1 data deletion, A13).
export async function deleteAccount(id: string, rawPassword: unknown) {
  const meta = await metaById(id);
  if (!meta) throw new ApiError('E_CREDENTIALS', 401);
  if (!meta.guest && (typeof rawPassword !== 'string' || !(await checkPassword(rawPassword, meta)))) throw new ApiError('E_CREDENTIALS', 401);
  await withLock(`acct:${id}`, () => withLock(lockOf(id), async () => {
    await query('DELETE FROM sessions WHERE acc = $1', [id]);
    await query('DELETE FROM resets WHERE acc = $1', [id]);
    await query('DELETE FROM email_links WHERE acc = $1', [id]);
    await query('DELETE FROM passkeys WHERE acc = $1', [id]);
    await query('DELETE FROM acct_auth WHERE id = $1', [id]);
    await removeAccount(id);
    await unpublish(id);
  }));
}

// ---- Guest play, e-mail linking and sign-in through a provider (Google)

const GUEST_DOMAIN = 'guest.invalid';
export const isGuestEmail = (e: string) => e.endsWith('@' + GUEST_DOMAIN);
const LINK_LIFETIME_SEC = 3600;

// A quick account: no e-mail and no password to type. The session cookie is the only key, so the player is asked to link an e-mail later.
// Creating many at once is throttled per address (the same counter as failed logins: 8 in a row, then 15 minutes).
export async function createGuest(ua: string, ip: string, now: number, makeState: (accountId: string, email: string) => any): Promise<{ token: string; email: string }> {
  const tk = `guest|${ip}`;
  await throttle(tk, now);
  await noteFail(tk, now);
  const id = randomBytes(12).toString('hex'), email = `khach-${id.slice(0, 10)}@${GUEST_DOMAIN}`;
  const pw = await hashPassword(randomBytes(24).toString('hex'));
  return withLock(lockOf(id), async () => {
    await query('INSERT INTO acct_auth (id, email, email_key, salt, hash, created, guest) VALUES ($1, $2, $3, $4, $5, $6, true)', [id, email, email, pw.salt, pw.hash, now]);
    await saveAccount({ id, email, created: now, state: makeState(id, email) });
    return { token: await openSession(id, ua, now), email };
  });
}

// Step 1 of linking: the guest gives an e-mail and a password; nothing changes until the link in the mail is clicked.
export async function requestLink(accId: string, rawEmail: unknown, rawPassword: unknown, origin: string, now: number) {
  const { email, password } = checkCredentialsShape(rawEmail, rawPassword);
  const key = emailKey(email);
  const meta = await metaById(accId);
  if (!meta || !meta.guest) throw new ApiError('E_BAD_REQUEST');
  await throttle(`link|${accId}`, now);
  await noteFail(`link|${accId}`, now);
  const other = await metaByEmail(key);
  if (other) throw new ApiError('E_EMAIL_TAKEN', 409);
  if (!(await mailAllowed(email, now))) throw new ApiError('E_RATE_LIMIT', 429);
  const pw = await hashPassword(password);
  await withLock(lockOf(accId), async () => {
    const token = randomBytes(32).toString('base64url'), code = String(randomInt(0, 1000000)).padStart(6, '0');
    await query('DELETE FROM email_links WHERE acc = $1 OR exp < $2', [accId, now - 86400000]);   // a new request replaces the older one
    await query('INSERT INTO email_links (token_hash, acc, email, email_key, salt, hash, exp, code_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [sha(token), accId, email, key, pw.salt, pw.hash, now + LINK_LIFETIME_SEC * 1000, sha(`${accId}:${code}`)]);
    await sendMail(linkMail(origin, email, `${origin}/?link=${token}`, LINK_LIFETIME_SEC / 60, code), now);
  });
}

// Step 2: the click. The token alone proves the inbox, so it works from any browser. The saved game stays with the account id.
export async function confirmLink(token: unknown, now: number): Promise<{ email: string }> {
  if (typeof token !== 'string' || token.length > 100) throw new ApiError('E_LINK_INVALID');
  return finishLink(sha(token), now);
}

// The same thing with the 6 digits from the mail, typed into the game by the signed-in guest. 5 tries, then the code is dead.
export async function confirmLinkCode(accId: string, code: unknown, now: number): Promise<{ email: string }> {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) throw new ApiError('E_LINK_INVALID');
  // the counter is raised in its own statement before the comparison, so a wrong guess is counted even though it ends in an error
  const r = await query<{ token_hash: string; tries: number; code_hash: string }>('UPDATE email_links SET tries = tries + 1 WHERE acc = $1 AND used = false AND exp >= $2 RETURNING token_hash, tries, code_hash', [accId, now]);
  const l = r.rows[0];
  if (!l || l.tries > 5 || l.code_hash !== sha(`${accId}:${code.trim()}`)) throw new ApiError('E_LINK_INVALID');
  return finishLink(l.token_hash, now);
}

async function finishLink(k: string, now: number): Promise<{ email: string }> {
  return withLock(`link:${k}`, async () => {
    const r = await query<{ acc: string; email: string; email_key: string; salt: string; hash: string }>('UPDATE email_links SET used = true WHERE token_hash = $1 AND used = false AND exp >= $2 RETURNING acc, email, email_key, salt, hash', [k, now]);
    const l = r.rows[0];
    if (!l) throw new ApiError('E_LINK_INVALID');
    return withLock(lockOf(l.acc), async () => {
      const meta = await metaById(l.acc);
      if (!meta) throw new ApiError('E_LINK_INVALID');
      if (!meta.guest && emailKey(meta.email) === l.email_key) return { email: meta.email };   // clicked twice
      if (await metaByEmail(l.email_key)) throw new ApiError('E_EMAIL_TAKEN', 409);
      await query('UPDATE acct_auth SET email = $2, email_key = $3, salt = $4, hash = $5, guest = false WHERE id = $1', [l.acc, l.email, l.email_key, l.salt, l.hash]);
      await query('UPDATE accounts SET email = $2 WHERE id = $1', [l.acc, l.email]);
      return { email: l.email };
    });
  });
}

// Sign in with an address a provider has already verified. Existing account: sign in. A signed-in guest: the guest becomes this address
// (progress kept). Otherwise a new account is made. No password is set: the player can use "Quên mật khẩu" to add one.
export async function oauthSignIn(rawEmail: string, guestAcc: string | null, ua: string, now: number, makeState: (accountId: string, email: string) => any): Promise<{ token: string; email: string }> {
  if (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail.trim())) throw new ApiError('E_EMAIL');
  const email = rawEmail.trim(), key = emailKey(email);
  const found = await metaByEmail(key);
  if (found) return withLock(lockOf(found.id), async () => ({ token: await openSession(found.id, ua, now), email: found.email }));
  const pw = await hashPassword(randomBytes(24).toString('hex'));
  const guest = guestAcc ? await metaById(guestAcc) : null;
  if (guest && guest.guest) {
    return withLock(lockOf(guest.id), async () => {
      if (await metaByEmail(key)) throw new ApiError('E_EMAIL_TAKEN', 409);
      await query('UPDATE acct_auth SET email = $2, email_key = $3, salt = $4, hash = $5, guest = false WHERE id = $1', [guest.id, email, key, pw.salt, pw.hash]);
      await query('UPDATE accounts SET email = $2 WHERE id = $1', [guest.id, email]);
      return { token: await openSession(guest.id, ua, now), email };
    });
  }
  const id = randomBytes(12).toString('hex');
  return withLock(lockOf(id), async () => {
    const ins = await query('INSERT INTO acct_auth (id, email, email_key, salt, hash, created) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email_key) DO NOTHING', [id, email, key, pw.salt, pw.hash, now]);
    if (!ins.rowCount) throw new ApiError('E_EMAIL_TAKEN', 409);
    await saveAccount({ id, email, created: now, state: makeState(id, email) });
    return { token: await openSession(id, ua, now), email };
  });
}
