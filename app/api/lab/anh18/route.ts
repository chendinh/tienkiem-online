import { ApiError } from '@/lib/server/auth';
import { json, guard, checkWrite, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { MODELS, buildPrompt, inputOf, modelOf, promptProblem, type Res } from '@/lib/anh18';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Owner only (Authorization: Bearer <ADMIN_KEY>, the same key as /admin). This route spends money and keeps nothing: the picture stays on fal's CDN.
// GET   the models, and whether this server may switch the fal safety checker off (FAL_NSFW_AUTHORIZED=1, only after fal has authorised the account)
// POST { model, scene, res: '2k' | '4k', tol?: 1..5 }  ->  { ok, url, seed, ms, checker, flagged }  (url is empty when fal filtered the picture)
const authorised = () => process.env.FAL_NSFW_AUTHORIZED === '1';
const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };

export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    return json({ ok: true, models: MODELS, fal: !!process.env.FAL_KEY, checkerOff: authorised() });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    checkWrite(req);
    const b = await readBody(req);
    const m = modelOf(b?.model), scene = typeof b?.scene === 'string' ? b.scene : '';
    const res: Res = b?.res === '2k' ? '2k' : '4k';
    if (!m || scene.trim().length < 5 || b?.images || b?.image_urls) throw new ApiError('E_BAD_REQUEST');   // text only: no reference picture is ever accepted
    if (promptProblem(scene)) throw new ApiError('E_PROMPT_BLOCKED', 422);
    if (!process.env.FAL_KEY) throw new ApiError('E_NO_FAL', 503);
    const { fal } = await import('@fal-ai/client');
    const t0 = Date.now();
    let out: any;
    try {
      out = await Promise.race([
        fal.subscribe(m.endpoint, { input: inputOf(m.id, buildPrompt(scene), res, Number(b?.tol), authorised()) as any }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('fal timeout')), 240000)),
      ]);
    } catch (e: any) {
      // say what fal answered, so the owner can tell "filtered by the content policy" from "bad parameter" or "no credit"
      const detail = (() => { try { return JSON.stringify(e?.body?.detail ?? e?.body ?? e?.message ?? '').slice(0, 240); } catch { return String(e?.message || '').slice(0, 240); } })();
      console.error('[anh18]', m.id, e?.status, detail);
      return json({ ok: false, code: /content_policy|safety|nsfw|flagged/i.test(detail) ? 'E_FAL_POLICY' : 'E_FAL', detail, status: e?.status ?? null, model: m.id }, /content_policy|safety|nsfw|flagged/i.test(detail) ? 422 : 502);
    }
    const img = out?.data?.images?.[0];
    const flagged = Array.isArray(out?.data?.has_nsfw_concepts) ? out.data.has_nsfw_concepts.some(Boolean) : false;
    if (img?.url) falHost(img.url);
    return json({ ok: true, url: img?.url || '', w: img?.width || 0, h: img?.height || 0, seed: out?.data?.seed ?? null, ms: Date.now() - t0, checker: !authorised(), flagged });
  });
}
