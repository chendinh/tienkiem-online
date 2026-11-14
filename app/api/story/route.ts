import { storyInfo, storyRequest } from '@/lib/story';
import { json, requireUser, guard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;   // a Claude call may take up to 150 s
export async function GET() { return guard(async () => json(await storyInfo())); }
export async function POST(req: Request) {
  return guard(async () => {
    await requireUser(req);
    let b: any = null;
    try { b = await req.json(); } catch {}
    return json(await storyRequest(b));
  });
}
