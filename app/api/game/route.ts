import { after } from 'next/server';
import { getGame, actGame } from '@/lib/server/service';
import { touchPresence } from '@/lib/server/presence';
import { paintWanted, wantLooks } from '@/lib/server/zoo';
import { json, checkWrite, readBody, guard, requireUser } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // the pictures of newly tamed Dị Biến beasts are drawn after the answer (lib/server/zoo.ts wantLooks); an ordinary answer still ends at once

// GET: settle up to the server clock and return the state.
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req);
    const logs = Number(new URL(req.url).searchParams.get('logs'));   // the newest journey row whose fight log the browser already has (lib/feedlogs.ts)
    const out = await getGame(u.id, Number.isSafeInteger(logs) && logs > 0 ? logs : 0);
    after(() => touchPresence(u.id));   // the minute counts as online time on the report page
    if (wantLooks(u.id, (out.state as any)?.beasts)) after(() => paintWanted());
    return json(out);
  });
}
// POST: one intent ({ type, rid, ... }). The browser never sends a result, only what it wants to do.
export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const u = await requireUser(req);
    const out = await actGame(u.id, await readBody(req));
    if (wantLooks(u.id, (out.state as any)?.beasts)) after(() => paintWanted());   // a beast just tamed: its look is drawn now
    return json(out, out.ok || !out.code ? 200 : out.code === 'E_SERVER' ? 500 : 200);
  });
}
