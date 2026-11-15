import { browse, mine } from '@/lib/server/market';
import { json, requireUser, guard } from '@/lib/server/http';
import { serverNow } from '@/lib/server/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Chợ Đêm. Reading only; every change (put up, offer, accept, decline, withdraw, collect) is an intent of /api/game, so it shares the save's lock and idempotency key.
// GET /api/market              the stalls open to everyone (newest first) and the caller's own offer on each
// GET /api/market?view=mine    the caller's own stalls with the offers they hold, the offers the caller sent, and the mailbox
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req), q = new URL(req.url).searchParams, now = serverNow();
    if (q.get('view') === 'mine') return json({ ok: true, ...(await mine(u.id, now)) });
    return json({ ok: true, ...(await browse(u.id, now)) });
  });
}
