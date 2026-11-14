import { info, request } from '@/lib/imagegen';
import { json, requireUser, guard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json(info()); }
// Drawing costs money, so only a signed-in player may ask for a new picture.
export async function POST(req: Request) {
  return guard(async () => {
    await requireUser(req);
    let spec: any = null;
    try { spec = await req.json(); } catch {}
    return json(request(spec));
  });
}
