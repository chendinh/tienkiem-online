import { json, guard, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { resetVariants, variantStats } from '@/lib/server/variants';
import { MUTATIONS } from '@/lib/anim';
import { ApiError } from '@/lib/server/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Owner only (Authorization: Bearer <ADMIN_KEY>).
// GET                   the Dị Biến looks, with how many pictures and still cut-outs each has saved
// POST { look }         look = a look id, or 'all': forget the saved pictures of it, so they are drawn again (with the current model) when a creature of that look next needs one
export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    return json({ ok: true, ...(await variantStats()) });
  });
}
export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const b: any = await readBody(req);
    const look = b?.look;
    const ids = look === 'all' ? MUTATIONS.map((m) => m.id) : MUTATIONS.some((m) => m.id === look) ? [look as string] : null;
    if (!ids) throw new ApiError('E_BAD_REQUEST', 400);
    return json({ ok: true, ...(await resetVariants(ids)) });
  });
}
