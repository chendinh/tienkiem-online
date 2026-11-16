import { after } from 'next/server';
import { board, profile, type Board } from '@/lib/server/ranking';
import { kickBots } from '@/lib/server/bots';
import { json, requireUser, guard } from '@/lib/server/http';
import { serverNow } from '@/lib/server/service';
import { ApiError } from '@/lib/server/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;   // the bots may be brought up to date after the answer is sent

// GET /api/ranking?board=cult|power   the top of a board and the caller's own place
// GET /api/ranking?pid=<public id>    one player's page (stats, worn items, Linh Thú in battle)
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req), q = new URL(req.url).searchParams, now = serverNow();
    const pid = q.get('pid');
    if (pid !== null) {
      if (!/^[a-f0-9]{12}$/.test(pid)) throw new ApiError('E_BAD_REQUEST');
      const p = await profile(pid, now);
      if (!p) throw new ApiError('E_NO_PLAYER', 404);
      return json({ ok: true, profile: p });
    }
    after(() => kickBots());   // somebody is looking at the board: let the bots catch up (at most once every 10 minutes, see lib/server/bots.ts)
    const b = q.get('board') === 'power' ? 'power' : 'cult';
    return json({ ok: true, ...(await board(b as Board, u.id, now)) });
  });
}
