import { json, guard } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { cachedReport } from '@/lib/server/report';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;   // the report reads every saved game
// GET /api/admin/report            the whole report (kept for a minute)
// GET /api/admin/report?fresh=1    read everything again now
// Owner only: Authorization: Bearer <ADMIN_KEY> (see lib/server/admin.ts).
export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const fresh = new URL(req.url).searchParams.get('fresh') === '1';
    return json({ ok: true, report: await cachedReport(Date.now(), fresh) });
  });
}
