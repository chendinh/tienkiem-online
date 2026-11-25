import { raidView } from '@/lib/server/raid';
import { json, requireUser, guard } from '@/lib/server/http';
import { serverNow } from '@/lib/server/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Phó Bản. Reading only (and fighting the day's Dị Thú when its time has come, once for everyone). Joining, leaving and taking the reward are intents of /api/game.
// GET /api/raid   today's Dị Thú and who signed up, the film of the last fight (today's once fought, else yesterday's) and the rewards still to take
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req);
    return json({ ok: true, ...(await raidView(u.id, serverNow())) });
  });
}
