import { json, guard, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { draw, stamps, writable } from '@/lib/server/galaxyArt';
import { GX_ART_NAMES } from '@/lib/galaxyArt';
import { ApiError } from '@/lib/server/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// Owner only (Authorization: Bearer <ADMIN_KEY>). Pictures are written into public/art/galaxy, so this only draws where the disk can be written (your own machine).
// GET                              { writable, names, stamps }  stamps = when each picture file was last written
// POST { name, size: '2k' | '1k' }  draw that picture again with the image model (30 to 120 s; about 0.09 to 0.17 USD) and replace the file
export async function GET(req: Request) {
  return guard(async () => { requireAdmin(req); return json({ ok: true, names: GX_ART_NAMES, writable: await writable(), stamps: await stamps() }); });
}
export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const b: any = await readBody(req);
    if (typeof b?.name !== 'string') throw new ApiError('E_BAD_REQUEST', 400);
    const r = await draw(b.name, b.size);
    return json({ ok: true, cost: r.cost, files: r.files, stamps: await stamps() });
  });
}
