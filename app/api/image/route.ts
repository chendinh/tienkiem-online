import { after } from 'next/server';
import { idle, info, request } from '@/lib/imagegen';
import { json, requireUser, guard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // a picture is drawn after the answer is sent: the function must stay alive until it is saved
// Public: only what the page needs to know (can it ask for pictures, is the provider locked). Spend, budget, models and the queue are on the owner's report page.
export async function GET() { return guard(async () => { const i = await info(); return json({ enabled: i.enabled, ...(i.locked ? { locked: true } : {}) }); }); }
// Drawing costs money, so only a signed-in player may ask for a new picture.
export async function POST(req: Request) {
  return guard(async () => {
    await requireUser(req);
    let spec: any = null;
    try { spec = await req.json(); } catch {}
    const res = await request(spec);
    // Serverless hosting freezes the function once the answer is sent. Keep it running until the queued pictures are finished and saved.
    if (res.status === 'pending') after(() => idle());
    return json(res);
  });
}
