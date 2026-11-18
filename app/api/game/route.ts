import { after } from 'next/server';
import { getGame, actGame } from '@/lib/server/service';
import { touchPresence } from '@/lib/server/presence';
import { json, checkWrite, readBody, guard, requireUser } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET: settle up to the server clock and return the state.
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req);
    const out = await getGame(u.id);
    after(() => touchPresence(u.id));   // the minute counts as online time on the report page
    return json(out);
  });
}
// POST: one intent ({ type, rid, ... }). The browser never sends a result, only what it wants to do.
export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const u = await requireUser(req);
    const out = await actGame(u.id, await readBody(req));
    return json(out, out.ok || !out.code ? 200 : out.code === 'E_SERVER' ? 500 : 200);
  });
}
