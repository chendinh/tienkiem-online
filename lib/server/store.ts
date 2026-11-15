// Storage helpers shared by the server modules. Everything is kept in Postgres (see db.ts); this file holds the pieces the
// auth, game and ranking code use: the per-key lock, the append-only logs, and the account rows.
import { query, withLock } from './db';

export { withLock };

export interface AccountFile { id: string; email: string; created: number; state: any | null }

// audit.log and outbox.log of the file version: one row per line.
export async function appendLog(name: string, entry: unknown) {
  await query('INSERT INTO logs (name, entry) VALUES ($1, $2::jsonb)', [name, JSON.stringify(entry)]);
}

export async function loadAccount(id: string): Promise<AccountFile | null> {
  const r = await query<{ id: string; email: string; created: number; state: string | null }>('SELECT id, email, created, state FROM accounts WHERE id = $1', [id]);
  const a = r.rows[0];
  return a ? { id: a.id, email: a.email, created: a.created, state: a.state ? JSON.parse(a.state) : null } : null;
}
export async function saveAccount(a: AccountFile) {
  await query(
    'INSERT INTO accounts (id, email, created, state) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, state = EXCLUDED.state',
    [a.id, a.email, a.created, a.state === null ? null : JSON.stringify(a.state)],
  );
}
export async function removeAccount(id: string) { await query('UPDATE relics SET holder = NULL WHERE holder = $1', [id]); await query('DELETE FROM accounts WHERE id = $1', [id]); }
