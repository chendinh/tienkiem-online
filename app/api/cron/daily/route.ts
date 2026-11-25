import { timingSafeEqual } from 'node:crypto';
import { runDaily } from '@/lib/server/dailygen';
import { resolveDue } from '@/lib/server/raid';
import { dayKey } from '@/lib/daily';
import { json, guard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // the picture is drawn before the function ends

// Called once a day by Vercel Cron (see vercel.json), which sends "Authorization: Bearer $CRON_SECRET". Without CRON_SECRET the route stays closed.
// Running it again on the same day is safe: it only finishes what is missing (for example the picture).
export async function GET(req: Request) {
  return guard(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return json({ ok: false, code: 'E_NO_CRON_SECRET' }, 503);
    const got = Buffer.from(req.headers.get('authorization') || ''), want = Buffer.from(`Bearer ${secret}`);
    if (got.length !== want.length || !timingSafeEqual(got, want)) return json({ ok: false, code: 'E_AUTH' }, 401);
    try { await resolveDue(Date.now()); } catch (e) { console.error('[daily] raid', e); }   // a Phó Bản nobody came to see is fought here at the latest
    const r = await runDaily(dayKey(Date.now()));
    console.log('[daily]', JSON.stringify(r));
    return json({ ok: r.story !== 'failed', ...r });
  });
}
