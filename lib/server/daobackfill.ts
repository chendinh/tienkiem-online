// Gives every saved account the đạo hiệu of its e-mail address (and the starting privileges, once), without waiting for the player to log in.
// The game does the same thing by itself the next time an account is read (see upgrade in service.ts); this is for doing it for all of them now.
import * as G from '../game';
import { query, withLock } from './db';
import { loadAccount, saveAccount } from './store';
import { publish } from './ranking';

export interface DaoBackfill { total: number; changed: { id: string; email: string; from: string; to: string }[] }
// apply = false only lists what would change.
export async function backfillDao(apply: boolean, now = Date.now()): Promise<DaoBackfill> {
  const ids = (await query<{ id: string }>('SELECT id FROM accounts WHERE state IS NOT NULL')).rows.map((r) => r.id);
  const out: DaoBackfill = { total: ids.length, changed: [] };
  for (const id of ids) {
    await withLock(`acct:${id}`, async () => {
      const a = await loadAccount(id);
      if (!a || !a.state || !a.state.player) return;
      const st: G.GameState = a.state, p = st.player;
      if (p.daoFix && p.dao) return;    // already follows its address
      const from = p.dao || '', was = JSON.stringify([p.dao, p.daoFix]);
      G.adoptDao(st, a.email);
      if (JSON.stringify([p.dao, p.daoFix]) === was) return;   // nothing to give this account
      out.changed.push({ id, email: a.email, from, to: p.dao });
      if (!apply) return;
      G.flushLedger(st, 'dao-backfill', now);
      await saveAccount(a);
      try { await publish(id, st, now); } catch { /* the ranking row catches up the next time the player is online */ }
    });
  }
  return out;
}
