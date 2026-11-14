// Account_Service: registration, login, sessions, password reset, account deletion (Requirement 1).
import { randomBytes, scrypt as scryptCb, createHash, timingSafeEqual } from 'node:crypto';
import { BALANCE as B } from '../balance';
import { type ErrCode } from '../strings';
import { unpublish } from './ranking';
import { appendLog, accountFile, authFile, readJson, removeFile, withLock, writeJson } from './store';

interface AcctMeta { email: string; salt: string; hash: string; created: number }
interface Session { acc: string; created: number; last: number; ua: string }
interface AuthDB { users: Record<string, string>; accts: Record<string, AcctMeta>; sessions: Record<string, Session>; resets: Record<string, { acc: string; exp: number; used: boolean }> }
export interface AccountFile { id: string; email: string; created: number; state: any | null }
export class ApiError extends Error { constructor(public code: ErrCode, public status = 400) { super(code); } }

const emptyDb = (): AuthDB => ({ users: {}, accts: {}, sessions: {}, resets: {} });
const LOCK = 'auth';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const emailKey = (e: string) => e.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const scrypt = (pw: string, salt: Buffer) => new Promise<Buffer>((res, rej) => scryptCb(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw: string): Promise<{ salt: string; hash: string }> { const salt = randomBytes(16); return { salt: salt.toString('hex'), hash: (await scrypt(pw, salt)).toString('hex') }; }
async function checkPassword(pw: string, m: { salt: string; hash: string }): Promise<boolean> {
  const k = await scrypt(pw, Buffer.from(m.salt, 'hex')), h = Buffer.from(m.hash, 'hex');
  return k.length === h.length && timingSafeEqual(k, h);
}
const DUMMY = { salt: '00'.repeat(16), hash: '00'.repeat(64) };
const readDb = () => readJson<AuthDB>(authFile(), emptyDb());

function checkCredentialsShape(email: unknown, password: unknown): { email: string; password: string } {
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) throw new ApiError('E_EMAIL');
  if (typeof password !== 'string' || password.length < B.passwordMinLength || password.length > 200) throw new ApiError('E_PASSWORD');
  return { email: email.trim(), password };
}

// failed-login throttle (per email and address), in memory
const g = globalThis as any;
const fails: Map<string, { n: number; until: number }> = g.__tutienFails || (g.__tutienFails = new Map());
function throttle(key: string, now: number) { const f = fails.get(key); if (f && f.until > now) throw new ApiError('E_RATE_LIMIT', 429); }
function noteFail(key: string, now: number) { const f = fails.get(key) || { n: 0, until: 0 }; f.n++; if (f.n >= 8) { f.until = now + 15 * 60000; f.n = 0; } fails.set(key, f); }

function pruneSessions(db: AuthDB, acc: string, now: number) {
  const mine = Object.entries(db.sessions).filter(([, s]) => s.acc === acc);
  for (const [k, s] of mine) if (now - s.last > B.sessionLifetimeSec * 1000) delete db.sessions[k];
  const alive = Object.entries(db.sessions).filter(([, s]) => s.acc === acc).sort((a, b) => a[1].last - b[1].last);
  while (alive.length >= B.maxActiveSessions) delete db.sessions[alive.shift()![0]];
}
function openSession(db: AuthDB, acc: string, ua: string, now: number): string {
  pruneSessions(db, acc, now);
  const token = randomBytes(32).toString('base64url');
  db.sessions[sha(token)] = { acc, created: now, last: now, ua: ua.slice(0, 120) };
  return token;
}

// Create the Account together with its Player_Character and Game_State, or nothing at all (Requirement 1.1, 1.5).
export async function register(rawEmail: unknown, rawPassword: unknown, ua: string, now: number, makeState: (accountId: string) => any): Promise<{ token: string; email: string }> {
  const { email, password } = checkCredentialsShape(rawEmail, rawPassword);
  const pw = await hashPassword(password);
  return withLock(LOCK, async () => {
    const db = await readDb(), key = emailKey(email);
    if (db.users[key]) throw new ApiError('E_EMAIL_TAKEN', 409);
    const id = randomBytes(12).toString('hex');
    const file: AccountFile = { id, email, created: now, state: makeState(id) };
    await writeJson(accountFile(id), file);
    try {
      db.users[key] = id; db.accts[id] = { email, salt: pw.salt, hash: pw.hash, created: now };
      const token = openSession(db, id, ua, now);
      await writeJson(authFile(), db);
      return { token, email };
    } catch (e) { await removeFile(accountFile(id)); throw e; }
  });
}

export async function login(rawEmail: unknown, rawPassword: unknown, ua: string, ip: string, now: number): Promise<{ token: string; email: string }> {
  if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string' || rawEmail.length > 254 || rawPassword.length > 200) throw new ApiError('E_CREDENTIALS', 401);
  const key = emailKey(rawEmail), tk = `${key}|${ip}`;
  throttle(tk, now);
  const db = await readDb(), id = db.users[key], meta = id ? db.accts[id] : null;
  const good = await checkPassword(rawPassword, meta || DUMMY);   // the same work whether or not the email exists (Requirement 1.11)
  if (!meta || !good) { noteFail(tk, now); throw new ApiError('E_CREDENTIALS', 401); }
  fails.delete(tk);
  return withLock(LOCK, async () => {
    const d = await readDb();
    if (!d.accts[id]) throw new ApiError('E_CREDENTIALS', 401);
    const token = openSession(d, id, ua, now);
    await writeJson(authFile(), d);
    return { token, email: meta.email };
  });
}

export async function sessionUser(token: string | undefined | null, now: number): Promise<{ id: string; email: string } | null> {
  if (!token) return null;
  const db = await readDb(), k = sha(token), s = db.sessions[k];
  if (!s || now - s.last > B.sessionLifetimeSec * 1000) return null;
  const meta = db.accts[s.acc];
  if (!meta) return null;
  if (now - s.last > 60000) {   // sliding expiry, written at most once a minute
    await withLock(LOCK, async () => { const d = await readDb(); if (d.sessions[k]) { d.sessions[k].last = now; await writeJson(authFile(), d); } });
  }
  return { id: s.acc, email: meta.email };
}

export async function logout(token: string | undefined | null) {
  if (!token) return;
  await withLock(LOCK, async () => { const d = await readDb(); delete d.sessions[sha(token)]; await writeJson(authFile(), d); });
}

// Same answer for known and unknown emails (Requirement 1.17). The link goes to data/outbox.log and the server console until a mail service is connected.
export async function requestReset(rawEmail: unknown, origin: string, now: number) {
  if (typeof rawEmail !== 'string' || rawEmail.length > 254) return;
  await withLock(LOCK, async () => {
    const d = await readDb(), id = d.users[emailKey(rawEmail)];
    if (!id) return;
    const token = randomBytes(32).toString('base64url');
    d.resets[sha(token)] = { acc: id, exp: now + B.passwordResetLifetimeSec * 1000, used: false };
    for (const [k, r] of Object.entries(d.resets)) if (r.exp < now - 86400000) delete d.resets[k];
    await writeJson(authFile(), d);
    const link = `${origin}/?reset=${token}`;
    await appendLog('outbox.log', { at: now, to: d.accts[id].email, subject: 'Đặt lại mật khẩu', link });
    console.log(`[tutien] liên kết đặt lại mật khẩu cho ${d.accts[id].email}: ${link}`);
  });
}
export async function confirmReset(token: unknown, rawPassword: unknown, now: number) {
  if (typeof token !== 'string' || typeof rawPassword !== 'string' || rawPassword.length < B.passwordMinLength || rawPassword.length > 200) throw new ApiError('E_PASSWORD');
  const pw = await hashPassword(rawPassword);
  await withLock(LOCK, async () => {
    const d = await readDb(), r = d.resets[sha(token)];
    if (!r || r.used || r.exp < now || !d.accts[r.acc]) throw new ApiError('E_RESET_INVALID');
    r.used = true;
    d.accts[r.acc].salt = pw.salt; d.accts[r.acc].hash = pw.hash;
    for (const [k, s] of Object.entries(d.sessions)) if (s.acc === r.acc) delete d.sessions[k];
    await writeJson(authFile(), d);
  });
}

// Remove the Account and all its data (Requirement 1 data deletion, A13).
export async function deleteAccount(id: string, rawPassword: unknown) {
  if (typeof rawPassword !== 'string') throw new ApiError('E_CREDENTIALS', 401);
  const db = await readDb(), meta = db.accts[id];
  if (!meta || !(await checkPassword(rawPassword, meta))) throw new ApiError('E_CREDENTIALS', 401);
  await withLock(`acct:${id}`, () => withLock(LOCK, async () => {
    const d = await readDb();
    delete d.users[emailKey(meta.email)]; delete d.accts[id];
    for (const [k, s] of Object.entries(d.sessions)) if (s.acc === id) delete d.sessions[k];
    for (const [k, r] of Object.entries(d.resets)) if (r.acc === id) delete d.resets[k];
    await writeJson(authFile(), d);
    await removeFile(accountFile(id));
    await unpublish(id);
  }));
}
