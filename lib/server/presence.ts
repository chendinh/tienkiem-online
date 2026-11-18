// How long players really have the game open, for the report page (lib/server/report.ts). Nothing here touches the saved game.
// The page asks for the state every 10 s while it is visible (a hidden tab does not ask). Each ask marks the current minute of the day as "present" in a bitmap
// (db.ts, table presence). Marking a minute twice changes nothing, so it does not matter which server instance gets the ask, and an instance writes at most
// once per minute per account. Online time = the number of marked minutes (a visit shorter than a minute counts as one minute).
import { query } from './db';
import { dayKey } from '../daily';

const g = globalThis as any;
const S: { last: Map<string, number> } = g.__tutienPresence || (g.__tutienPresence = { last: new Map() });
const ZERO = '0'.repeat(1440);
const PRESENCE_SPAN = 3;   // minutes one ask counts for (the page asks every 3 minutes)

// Call after each state request of a signed-in player. Never throws: a failed write only loses a minute of counting.
export async function touchPresence(acc: string, now = Date.now()): Promise<void> {
  try {
    const minute = Math.floor(now / 60000);
    if (S.last.get(acc) === minute) return;
    S.last.set(acc, minute);
    const m = Math.floor((now % 86400000) / 60000);
    // The page asks every few minutes (Online_Poll_Interval), so one ask stands for the minutes since the previous one: mark this minute and the PRESENCE_SPAN - 1 before it.
    const from = Math.max(0, m - (PRESENCE_SPAN - 1));
    const mask = ZERO.slice(0, from) + '1'.repeat(m - from + 1) + ZERO.slice(m + 1);
    await query(
      `INSERT INTO presence (acc, day, bits) VALUES ($1, $2, $3::bit(1440))
       ON CONFLICT (acc, day) DO UPDATE SET bits = presence.bits | $3::bit(1440)`,
      [acc, dayKey(now), mask],
    );
    if (S.last.size > 5000) S.last.clear();
  } catch (err: any) { console.warn('[presence]', String(err?.message || err).slice(0, 120)); }
}
