// How long players really have the game open, for the report page (lib/server/report.ts). Nothing here touches the saved game.
// The page asks for the state every 10 s while it is visible (a hidden tab does not ask). Each ask marks the current minute of the day as "present" in a bitmap
// (db.ts, table presence). Marking a minute twice changes nothing, so it does not matter which server instance gets the ask, and an instance writes at most
// once per minute per account. Online time = the number of marked minutes (a visit shorter than a minute counts as one minute).
import { query } from './db';
import { dayKey } from '../daily';

const g = globalThis as any;
const S: { last: Map<string, number> } = g.__tutienPresence || (g.__tutienPresence = { last: new Map() });
const ZERO = '0'.repeat(1440);

// Call after each state request of a signed-in player. Never throws: a failed write only loses a minute of counting.
export async function touchPresence(acc: string, now = Date.now()): Promise<void> {
  try {
    const minute = Math.floor(now / 60000);
    if (S.last.get(acc) === minute) return;
    S.last.set(acc, minute);
    const m = Math.floor((now % 86400000) / 60000);
    await query(
      `INSERT INTO presence (acc, day, bits) VALUES ($1, $2, set_bit($3::bit(1440), $4::int, 1))
       ON CONFLICT (acc, day) DO UPDATE SET bits = set_bit(presence.bits, $4::int, 1)`,
      [acc, dayKey(now), ZERO, m],
    );
    if (S.last.size > 5000) S.last.clear();
  } catch (err: any) { console.warn('[presence]', String(err?.message || err).slice(0, 120)); }
}
