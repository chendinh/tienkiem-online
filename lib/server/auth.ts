// Account_Service: registration, login, sessions, password reset, account deletion (Requirement 1).
import { randomBytes, scrypt as scryptCb, createHash, timingSafeEqual } from 'node:crypto';
import { BALANCE as B } from '../balance';
import { type ErrCode } from '../strings';
import { unpublish } from './ranking';
import { query } from './db';
import { appendLog, saveAccount, removeAccount, withLock, type AccountFile } from './store';

export type { AccountFile };
interface AcctMeta { id: string; email: string; salt: string; hash: string; created: number }
export class ApiError extends Error { constructor(public code: ErrCode, public status = 400) { super(code); } }

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const emailKey = (e: string) => e.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lock per account, so players do not wait for each other (the file version had one lock for everybody).
const lockOf = (acc: string) => `auth:${acc}`;

const scrypt = (pw: string, salt: Buffer) => new Promise<Buffer>((res, rej) => scryptCb(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw: string): Promise<{ salt: string; hash: string }> { const salt = randomBytes(16); return { salt: salt.toString('hex'), hash: (await scrypt(pw, salt)).toString('hex') }; }
async function checkPassword(pw: string, m: { salt: string; hash: string }): Promise<boolean> {
  const k = await scrypt(pw, Buffer.from(m.salt, 'hex')), h = Buffer.from(m.hash, 'hex');
  return k.length === h.length && timingSafeEqual(k, h);
}
const DUMMY = { salt: '00'.repeat(16), hash: '00'.repeat(64) };

async function metaById(id: string): Promise<AcctMeta | null> {
  return (await query<AcctMeta>('SELECT id, email, salt, hash, created FROM acct_auth WHERE id = $1', [id])).rows[0] || null;
}
async function metaByEmail(key: string): Promise<AcctMeta | null> {
  return (await query<AcctMeta>('SELECT id, email, salt, hash, created FROM acct_auth WHERE email_key = $1', [key])).rows[0] || null;
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
async function openSession(acc: string, ua: string, now: number): Promise<string> {
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

export async function sessionUser(token: string | undefined | null, now: number): Promise<{ id: string; email: string } | null> {
  if (!token) return null;
  const k = sha(token);
  const r = await query<{ acc: string; last_at: number; email: string }>('SELECT s.acc, s.last_at, a.email FROM sessions s JOIN acct_auth a ON a.id = s.acc WHERE s.token_hash = $1', [k]);
  const s = r.rows[0];
  if (!s || now - s.last_at > B.sessionLifetimeSec * 1000) return null;
  if (now - s.last_at > 60000) await query('UPDATE sessions SET last_at = $2 WHERE token_hash = $1', [k, now]);   // sliding expiry, written at most once a minute
  return { id: s.acc, email: s.email };
}

export async function logout(token: string | undefined | null) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [sha(token)]);
}

// Same answer for known and unknown emails (Requirement 1.17). The link goes to the outbox log and the server console until a mail service is connected.
export async function requestReset(rawEmail: unknown, origin: string, now: number) {
  if (typeof rawEmail !== 'string' || rawEmail.length > 254) return;
  const meta = await metaByEmail(emailKey(rawEmail));
  if (!meta) return;
  await withLock(lockOf(meta.id), async () => {
    const token = randomBytes(32).toString('base64url');
    await query('INSERT INTO resets (token_hash, acc, exp, used) VALUES ($1, $2, $3, false)', [sha(token), meta.id, now + B.passwordResetLifetimeSec * 1000]);
    await query('DELETE FROM resets WHERE exp < $1', [now - 86400000]);
    const link = `${origin}/?reset=${token}`;
    await appendLog('outbox.log', { at: now, to: meta.email, subject: 'Đặt lại mật khẩu', link });
    console.log(`[tutien] liên kết đặt lại mật khẩu cho ${meta.email}: ${link}`);
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
  if (typeof rawPassword !== 'string') throw new ApiError('E_CREDENTIALS', 401);
  const meta = await metaById(id);
  if (!meta || !(await checkPassword(rawPassword, meta))) throw new ApiError('E_CREDENTIALS', 401);
  await withLock(`acct:${id}`, () => withLock(lockOf(id), async () => {
    await query('DELETE FROM sessions WHERE acc = $1', [id]);
    await query('DELETE FROM resets WHERE acc = $1', [id]);
    await query('DELETE FROM acct_auth WHERE id = $1', [id]);
    await removeAccount(id);
    await unpublish(id);
  }));
}
