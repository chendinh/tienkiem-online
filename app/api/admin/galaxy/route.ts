import { json, guard, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { manifest, draw, reset } from '@/lib/server/galaxyArt';
import { GX_ART_NAMES } from '@/lib/galaxyArt';
import { ApiError } from '@/lib/server/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// Owner only (Authorization: Bearer <ADMIN_KEY>).
// GET                              the redrawn pictures so far ("<name>_<2k|1k|t>" -> address)
// POST { name, size: '2k' | '1k' }  draw that picture again with the image model (30 to 120 s; costs about 0.07 to 0.17 USD)
// POST { name, reset: true }       forget the redrawn pictures of it, so the page shows the ones that ship with the game again
export async function GET(req: Request) {
  return guard(async () => { requireAdmin(req); return json({ ok: true, names: GX_ART_NAMES, art: await manifest() }); });
}
export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const b: any = await readBody(req);
    if (b?.reset) { await reset(String(b.name)); return json({ ok: true, art: await manifest() }); }
    if (typeof b?.name !== 'string') throw new ApiError('E_BAD_REQUEST', 400);
    const r = await draw(b.name, b.size, new URL(req.url).origin);
    return json({ ok: true, art: r.urls, cost: r.cost });
  });
}
