import { after } from 'next/server';
import { idle, info, request } from '@/lib/imagegen';
import { json, requireUser, guard } from '@/lib/server/http';
import { ApiError } from '@/lib/server/auth';
import { ensureDaily } from '@/lib/server/dailystore';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // a picture is drawn after the answer is sent: the function must stay alive until it is saved
// Public: only what the page needs to know (can it ask for pictures, is the provider locked). Spend, budget, models and the queue are on the owner's report page.
export async function GET() { return guard(async () => { const i = await info(); return json({ enabled: i.enabled, ...(i.locked ? { locked: true } : {}) }); }); }
// Drawing costs money, so only a signed-in player may ask for a new picture.
export async function POST(req: Request) {
  return guard(async () => {
    const u = await requireUser(req);
    let spec: any = null;
    try { spec = await req.json(); } catch {}
    // A guest has the plain base picture and the standing pose, drawn for them; what is paid per press (a character wearing equipment, another version) is for an account
    if (u.guest && spec && typeof spec === 'object' && (spec.kind === 'outfit' || (Number(spec.v) > 0 && (spec.kind === 'avatar' || spec.kind === 'pose')))) throw new ApiError('E_GUEST_LOCKED', 403);
    // The creatures and weapons of the day are known only after the registry is loaded. Without this, this server instance answered 'invalid' for the picture
    // of a weapon that is new today (its base is not in the list yet) and the item showed no picture at all.
    await ensureDaily();
    const res = await request(spec);
    // Serverless hosting freezes the function once the answer is sent. Keep it running until the queued pictures are finished and saved.
    if (res.status === 'pending') after(() => idle());
    return json(res);
  });
}
