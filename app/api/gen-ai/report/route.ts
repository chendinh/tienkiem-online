import { ApiError } from '@/lib/server/auth';
import { json, guard, checkWrite, requireUser } from '@/lib/server/http';
import { dbConfigured } from '@/lib/server/db';
import { logError } from '@/lib/server/genaiErrors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The page reports a failure the server never saw (the host answered with a page instead of JSON: body too large, timeout, lost connection), so it still
// reaches the owner's error list. Signed-in accounts only; a short body; the answer is the reference the player can quote.
// POST { http, code, detail, gender, size }  -> { ok, ref }
export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const dev = !dbConfigured() && process.env.NODE_ENV !== 'production';
    const user = dev ? { id: 'dev', email: 'dev@local' } : await requireUser(req);
    const text = await req.text();
    if (text.length > 3000) throw new ApiError('E_BAD_REQUEST', 413);
    let b: any; try { b = JSON.parse(text); } catch { throw new ApiError('E_BAD_REQUEST'); }
    const size = Number(b?.size) || 0;
    const ref = await logError({ acc: user.id, email: user.email, gender: b?.gender, stage: 'client', code: b?.code, http: b?.http, detail: `${typeof b?.detail === 'string' ? b.detail : ''}${size ? ` (photo ${Math.round(size / 1024)} KB)` : ''}` });
    return json({ ok: true, ref });
  });
}
