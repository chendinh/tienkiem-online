// Postgres access. Accounts, saves, ranking, spend ledger, story cache and pictures live in one database (DATABASE_URL),
// so the game runs on serverless hosting (Vercel) where the disk is read-only and wiped between requests.
//
// Concurrency: the old code ran one request per account at a time with an in-memory lock. That does not work when several server
// instances run side by side, so withLock() opens a transaction and takes a Postgres advisory lock on the key. Every query made
// inside the callback (also in nested calls) goes through that same transaction and connection, and the lock is released when it ends.
import { Pool, types, type PoolClient, type QueryResult } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';

// bigint columns hold millisecond timestamps and counters: far below 2^53, so plain numbers are safe.
types.setTypeParser(20, (v) => Number(v));

const g = globalThis as any;
const als: AsyncLocalStorage<PoolClient> = g.__tutienDbCtx || (g.__tutienDbCtx = new AsyncLocalStorage<PoolClient>());

export const dbConfigured = () => !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

function pool(): Pool {
  if (g.__tutienPool) return g.__tutienPool as Pool;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set: the game stores everything in Postgres (see .env.example)');
  const p = new Pool({
    connectionString: url,
    // Each serverless instance needs only a few connections: use the provider's pooled connection string (Neon "pooled", Supabase transaction pooler).
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 60000,   // a connection that closes after a short pause costs a new TLS handshake with the database on the next click
    connectionTimeoutMillis: 15000,
  });
  p.on('error', (e) => console.error('[tutien] database pool:', e.message));
  g.__tutienPool = p;
  return p;
}

const SCHEMA = [
  // one row per account: the whole saved game as JSON text (the database never looks inside it)
  `CREATE TABLE IF NOT EXISTS accounts (id text PRIMARY KEY, email text NOT NULL, created bigint NOT NULL, state text)`,
  `CREATE TABLE IF NOT EXISTS acct_auth (id text PRIMARY KEY, email text NOT NULL, email_key text NOT NULL UNIQUE, salt text NOT NULL, hash text NOT NULL, created bigint NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, acc text NOT NULL, created bigint NOT NULL, last_at bigint NOT NULL, ua text NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS sessions_acc ON sessions (acc)`,
  `CREATE TABLE IF NOT EXISTS resets (token_hash text PRIMARY KEY, acc text NOT NULL, exp bigint NOT NULL, used boolean NOT NULL DEFAULT false)`,
  `CREATE TABLE IF NOT EXISTS login_fails (key text PRIMARY KEY, n int NOT NULL, until bigint NOT NULL, at bigint NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS rank_entries (acc text PRIMARY KEY, entry jsonb NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS rank_pid ON rank_entries ((entry->>'pid'))`,
  `CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS logs (id bigserial PRIMARY KEY, name text NOT NULL, at timestamptz NOT NULL DEFAULT now(), entry jsonb NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS logs_name ON logs (name, id)`,
  `CREATE TABLE IF NOT EXISTS story_cache (id text PRIMARY KEY, value jsonb NOT NULL)`,
  // dissolved Thiên and Tiên items: only their look (name, picture id, element), shared by every player. Rows are never deleted.
  `CREATE TABLE IF NOT EXISTS relics (id bigserial PRIMARY KEY, sig text NOT NULL UNIQUE, tier int NOT NULL, item jsonb NOT NULL, created timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE relics ADD COLUMN IF NOT EXISTS holder text`,   // the save (account id) that holds it now; null = free to find
  `CREATE INDEX IF NOT EXISTS relics_free ON relics (id) WHERE holder IS NULL`,
  // generated pictures: id is the hash the game saves, sm is the small copy made on first request
  `CREATE TABLE IF NOT EXISTS images (id text PRIMARY KEY, kind text NOT NULL DEFAULT 'other', folder text NOT NULL DEFAULT 'other', ext text NOT NULL, data bytea NOT NULL, sm bytea, meta jsonb NOT NULL DEFAULT '{}', created timestamptz NOT NULL DEFAULT now())`,
  // a picture being drawn right now: stops two server instances from paying for the same picture twice
  `CREATE TABLE IF NOT EXISTS image_jobs (id text PRIMARY KEY, started bigint NOT NULL)`,
];

// Create the tables once per server process. Everything runs in ONE transaction under a transaction-level advisory lock, so two
// instances that start together cannot race on CREATE, and the lock is released by the end of the transaction itself.
// (A session-level lock, pg_advisory_lock, must not be used: behind a transaction pooler such as Neon's the unlock can reach another
// connection than the lock, the lock stays held for ever and every later request waits for it.)
function ready(): Promise<void> {
  if (!g.__tutienSchema) {
    g.__tutienSchema = (async () => {
      const c = await pool().connect();
      let broken: unknown;
      try {
        // the tables are checked once per version of this list, not on every cold start: 17 statements are 17 round trips to the database
        const marker = `v${SCHEMA.length}:${SCHEMA.reduce((h, s) => (h * 31 + s.length) >>> 0, 7)}`;
        try { const r = await c.query(`SELECT value #>> '{}' AS v FROM kv WHERE key = 'schema.version'`); if (r.rows[0] && r.rows[0].v === marker) return; } catch { /* no kv table yet: create everything */ }
        await c.query('BEGIN');
        await c.query('SELECT pg_advisory_xact_lock(738201)');
        for (const s of SCHEMA) await c.query(s);
        await c.query(`INSERT INTO kv (key, value) VALUES ('schema.version', to_jsonb($1::text)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [marker]);
        // the secret behind the public ids of the ranking is made here, outside any request transaction, so it can never be rolled back
        await c.query(`INSERT INTO kv (key, value) VALUES ('rank.secret', to_jsonb($1::text)) ON CONFLICT (key) DO NOTHING`, [randomBytes(24).toString('hex')]);
        await c.query('COMMIT');
      } catch (e) {
        try { await c.query('ROLLBACK'); } catch (e2) { broken = e2; }
        throw e;
      } finally { c.release(broken as any); }
    })().catch((e) => { g.__tutienSchema = null; throw e; });
  }
  return g.__tutienSchema;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  await ready();
  const c = als.getStore();
  return c ? c.query<T>(sql, params) : pool().query<T>(sql, params);
}

const LOCK_SQL = 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))';

// Run `fn` after every earlier call with the same key has finished, on any server instance (one order for concurrent requests, Requirement 2.9).
// All writes of `fn` commit together; when `fn` throws they are rolled back.
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  await ready();
  const held = als.getStore();
  if (held) { await held.query(LOCK_SQL, [key]); return fn(); }   // nested: same transaction, one more lock (always taken in the same order: acct, then auth)
  const c = await pool().connect();
  let broken: unknown;
  try {
    await c.query('BEGIN');
    await c.query(LOCK_SQL, [key]);
    const out = await als.run(c, fn);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch (e2) { broken = e2; }
    throw e;
  } finally {
    c.release(broken as any);   // a connection that could not roll back is dropped, not reused
  }
}

// Run `fn` so that a failure inside it undoes only its own writes. Inside withLock a failed statement would otherwise mark the
// whole transaction as aborted and the final COMMIT would silently turn into a ROLLBACK, losing the save that came before it.
export async function savepoint<T>(fn: () => Promise<T>): Promise<T> {
  const c = als.getStore();
  if (!c) return fn();
  await c.query('SAVEPOINT soft');
  try { const out = await fn(); await c.query('RELEASE SAVEPOINT soft'); return out; }
  catch (e) { await c.query('ROLLBACK TO SAVEPOINT soft'); throw e; }
}

export async function closeDb() {
  const p = g.__tutienPool as Pool | undefined;
  g.__tutienPool = undefined; g.__tutienSchema = null;
  if (p) await p.end();
}
