import { ApiError, sessionUser } from '@/lib/server/auth';
import { json, guard, checkWrite, cookieOf, requireUser } from '@/lib/server/http';
import { logError } from '@/lib/server/genaiErrors';
import { dbConfigured } from '@/lib/server/db';
import { appendLog } from '@/lib/server/store';
import { serverNow } from '@/lib/server/service';
import { claimJob, releaseJobs } from '@/lib/server/images';
import { addSpent, bonusOf, giveBonusBack, giveTurnBack, recordGen, spentToday, takeTurn, turnsUsed, useBonus } from '@/lib/server/genaiQuota';
import { FACE_MAX_CHARS, inputOf, isPhotoDataUrl, modelOf } from '@/lib/anh18';
import { LEGAL_VERSION, buildGenPrompt, consentOk, QUIET_CODES, isGender, isUnlimited, sceneOf, sceneProblem, turnsLeft } from '@/lib/genai';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// The player-facing picture maker. Signed-in accounts with an e-mail only (guests are refused), Seedream 4.5 "edit" with the player's own photo and nothing else,
// the fal safety checker always on. The photo goes to fal and is not stored; the picture stays on fal's CDN (the page offers it for download at once).
// GET   -> { enabled, user, left, limit, terms }                         (user is null when nobody is signed in)
// POST  { consent: { personal, adult, terms }, photo, gender?: 'f' | 'm', noFace?, pick, scene? }  -> { ok, url, w, h, ms, left }
// Limits (environment): GENAI_DAILY_LIMIT turns per account per day (default 3), GENAI_DAILY_BUDGET_USD for the whole site per day (default 5),
// GENAI_COST_USD per picture (default 0.04, Seedream 4.5), GENAI_OFF=1 closes the feature.
const limitPerDay = () => Math.max(1, Math.floor(Number(process.env.GENAI_DAILY_LIMIT) || 3));
const budgetPerDay = () => Number(process.env.GENAI_DAILY_BUDGET_USD) || 5;
const costEach = () => Number(process.env.GENAI_COST_USD) || 0.04;
const enabled = () => !!process.env.FAL_KEY && process.env.GENAI_OFF !== '1';
// Local development without a database (the owner's usual setup): no accounts, turns or ledger. Never true in production.
const dev = () => !dbConfigured() && process.env.NODE_ENV !== 'production';
const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };

export async function GET(req: Request) {
  return guard(async () => {
    const base = { ok: true, enabled: enabled(), terms: LEGAL_VERSION, limit: limitPerDay() };
    if (dev()) return json({ ...base, user: { email: 'dev@local', guest: false }, left: base.limit });
    const u = await sessionUser(cookieOf(req), serverNow());
    if (!u) return json({ ...base, user: null, left: 0 });
    const unlimited = !u.guest && isUnlimited(u.email, process.env.GENAI_UNLIMITED);
    const left = u.guest ? 0 : unlimited ? base.limit : turnsLeft(base.limit, await turnsUsed(u.id), await bonusOf(u.id));
    return json({ ...base, user: { email: u.email, guest: u.guest }, left, unlimited });
  });
}

// What is known about the request when it fails, for the error log (lib/server/genaiErrors.ts).
interface Ctx { acc?: string; email?: string; gender?: string; scene?: string; stage?: string; detail?: string; fal?: number; t0?: number }

export async function POST(req: Request) {
  const ctx: Ctx = { t0: Date.now() };
  try { return await run(req, ctx); }
  catch (e: any) {
    const api = e instanceof ApiError ? e : null;
    const code = api ? api.code : 'E_SERVER', http = api ? api.status : 500;
    if (!api) console.error('[tutien] lỗi máy chủ', e);
    let ref = '';
    if (!QUIET_CODES.includes(code)) {
      ref = await logError({ ...ctx, stage: ctx.stage || (api ? 'input' : 'server'), code, http, detail: ctx.detail || (api ? '' : `${e?.message || e} ${String(e?.stack || '').split('\n').slice(1, 3).join(' | ')}`), ms: Date.now() - (ctx.t0 || Date.now()) });
    }
    return json({ ok: false, code, ref }, http);
  }
}

async function run(req: Request, ctx: Ctx): Promise<Response> {
  return (async () => {
    checkWrite(req);
    if (!enabled()) throw new ApiError('E_GENAI_OFF', 503);
    const isDev = dev();
    const user = isDev ? { id: 'dev', email: 'dev@local', guest: false } : await requireUser(req);
    ctx.acc = user.id; ctx.email = user.email;
    if (user.guest) throw new ApiError('E_GENAI_LINK', 403);

    const text = await req.text();
    if (text.length > FACE_MAX_CHARS + 20000) throw new ApiError('E_BAD_REQUEST', 413);
    let b: any; try { b = JSON.parse(text); } catch { throw new ApiError('E_BAD_REQUEST'); }
    if (!consentOk(b?.consent)) throw new ApiError('E_FACE_CONSENT', 422);
    if (!isPhotoDataUrl(b?.photo)) throw new ApiError('E_GENAI_PHOTO');
    const noFace = b?.noFace === true;
    if (b?.gender !== undefined && !isGender(b.gender)) throw new ApiError('E_BAD_REQUEST');
    const gender = b?.gender === 'm' ? 'm' : 'f';
    const { scene, custom } = sceneOf(b?.pick, b?.scene, noFace, gender);
    ctx.gender = gender; ctx.scene = scene;
    const bad = sceneProblem(scene);
    if (bad === 'short') throw new ApiError('E_BAD_REQUEST');
    if (bad) throw new ApiError('E_PROMPT_BLOCKED', 422);
    const m = modelOf('seedreamFace');
    if (!m) throw new ApiError('E_SERVER', 500);

    const limit = limitPerDay(), now = Date.now();
    const unlimited = !isDev && isUnlimited(user.email, process.env.GENAI_UNLIMITED);   // the owner: no daily limit and no site budget check (his spend is still counted)
    let job = '';
    if (!isDev) {
      if (!unlimited && (await spentToday(now)) + costEach() > budgetPerDay()) throw new ApiError('E_GENAI_BUDGET', 503);
      job = `genai:${user.id}`;
      if (!(await claimJob(job))) throw new ApiError('E_GENAI_BUSY', 429);
    }
    let taken: '' | 'daily' | 'bonus' = '';   // which kind of turn this picture took (given back on a failure)
    const refund = async () => { const t = taken; taken = ''; if (t === 'daily') await giveTurnBack(user.id, now); else if (t === 'bonus') await giveBonusBack(user.id); };
    try {
      if (!isDev) {
        if (!unlimited) {
          if (await takeTurn(user.id, limit, now)) taken = 'daily';
          else if (await useBonus(user.id)) taken = 'bonus';   // the free turns of the day are used up: the turns the owner granted come next
          else throw new ApiError('E_GENAI_LIMIT', 429);
        }
        // what is kept for abuse handling: who, when, which terms were confirmed, the description. Never the photo.
        try { await appendLog('genai', { acc: user.id, at: now, terms: b.consent.terms, gender, custom, noFace, unlimited, scene }); } catch (e: any) { console.warn('[gen-ai] log:', String(e?.message || e).slice(0, 100)); }
      }
      const prompt = buildGenPrompt(scene, noFace, gender);
      const input = inputOf('seedreamFace', prompt, '4k', 2, false, b.photo);   // the fal safety checker stays on for this model
      const { fal } = await import('@fal-ai/client');
      const t0 = Date.now();
      let out: any;
      try {
        out = await Promise.race([
          fal.subscribe(m.endpoint, { input: input as any }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('fal timeout')), 240000)),
        ]);
      } catch (e: any) {
        const detail = (() => { try { return JSON.stringify(e?.body?.detail ?? e?.body ?? e?.message ?? '').slice(0, 240); } catch { return String(e?.message || '').slice(0, 240); } })();
        ctx.stage = 'fal'; ctx.detail = detail || String(e?.message || ''); ctx.fal = Number(e?.status) || 0;
        await refund();
        const policy = /content_policy|safety|nsfw|flagged/i.test(detail);
        throw new ApiError(policy ? 'E_GENAI_POLICY' : 'E_GENAI_FAIL', policy ? 422 : 502);
      }
      if (!isDev) await addSpent(costEach(), now);   // fal bills the call even when its checker blanks the picture
      const img = out?.data?.images?.[0];
      if (!img?.url) {
        ctx.stage = 'fal'; ctx.detail = `no picture returned: ${JSON.stringify({ keys: Object.keys(out?.data || {}), nsfw: out?.data?.has_nsfw_concepts })}`;
        await refund();
        throw new ApiError('E_GENAI_POLICY', 422);
      }
      taken = '';   // the picture is drawn: the turn is spent whatever happens next
      falHost(img.url);
      if (!isDev) await recordGen(user.id, user.email, now);
      const left = isDev || unlimited ? limit : turnsLeft(limit, await turnsUsed(user.id, now), await bonusOf(user.id));
      return json({ ok: true, url: img.url, w: img.width || 0, h: img.height || 0, ms: Date.now() - t0, left });
    } catch (e) {
      await refund();   // an unexpected failure after the turn was taken: the player does not pay for it
      throw e;
    } finally {
      if (job) await releaseJobs([job]);
    }
  })();
}
