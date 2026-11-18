import { after } from 'next/server';
import { idle as imageIdle, idFromUrl, request, falCost, falModels } from '@/lib/imagegen';
import * as C from '@/lib/content';
import * as D from '@/lib/daily';
import { json, guard, checkWrite, readBody } from '@/lib/server/http';
import { SCENE_IDS, fgCost } from '@/lib/anim';
import { requireAdmin } from '@/lib/server/admin';
import { ensureDaily } from '@/lib/server/dailystore';
import { assetsOf, bgClip, bgClipOf, clip, cut, cutsAll, fg, fgsAll, idle, info, spotClip, spotPic, spotsAll, spotUsd, variant, type Out } from '@/lib/server/anim';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // a clip is made after the answer is sent: the function must stay alive until it is saved

// Owner only (Authorization: Bearer <ADMIN_KEY>, the same key as /admin). This route spends money.
// GET  ?sp=<species id>   prices, spend, the species list and what is already made for that species
// GET  ?spots=1           the same, plus every creature picture and clip at the spots of the background
// GET  ?cuts=1            the same, plus every cut-out creature and every foreground layer (for the scene page)
// POST { step: 'base' | 'variant' | 'clip' | 'cut', sp, mut?, motion?, src? }  or  { step: 'fg', zone }  or  { step: 'spotpic' | 'spotclip', sp, mut, spot, src }   answers { status, id } at once; ask again until the status is not 'pending'
const fgPrice = () => fgCost(falCost(falModels().edit, 1376, 768));
const speciesOk = (sp: string) => D.allSpecies().some((s) => s.id === sp) && !!C.SPECIES_EN[sp];

export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    await ensureDaily();
    const q = new URL(req.url).searchParams, sp = q.get('sp') || '';
    const species = D.allSpecies().filter((s) => C.SPECIES_EN[s.id]).map((s) => ({ id: s.id, name: s.name, isNew: !C.SPECIES.some((x) => x.id === s.id) }));
    return json({ ok: true, ...(await info()), species, assets: sp && speciesOk(sp) ? await assetsOf(sp) : [], ...(q.get('spots') === '1' ? { spots: await spotsAll(), spotUsd: spotUsd(), bg: await bgClipOf() } : {}), ...(q.get('cuts') === '1' ? { cuts: await cutsAll(), fgs: await fgsAll(), fgUsd: fgPrice() } : {}) });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    checkWrite(req);
    const b = await readBody(req);
    await ensureDaily();
    let out: Out;
    if (b?.step === 'fg') {
      // the foreground layer belongs to a background picture (the game's dawn/night or a zone's), not to a species
      const z = typeof b.zone === 'string' ? b.zone : '';
      out = (C.ZONES.some((x) => x.id === z) || (SCENE_IDS as readonly string[]).includes(z)) ? await fg(z, new URL(req.url).origin) : { status: 'invalid' };
      if (out.started) after(() => idle());
      return json({ status: out.status, id: out.id, why: out.why });
    }
    if (b?.step === 'bgclip') {
      // the background's own moving clip: one for the whole picture, not tied to a species
      out = await bgClip(new URL(req.url).origin);
      if (out.started) after(() => idle());
      return json({ status: out.status, id: out.id, why: out.why });
    }
    const sp = typeof b?.sp === 'string' ? b.sp : '';
    if (!speciesOk(sp)) return json({ status: 'invalid' });
    if (b.step === 'base' || (b.step === 'variant' && b.mut === 'ngusac')) {
      // The creature's own picture, and its rainbow variant, are the game's: the lab asks for them the way the game does.
      const r = await request(b.step === 'base' ? { kind: 'monster', sp } : { kind: 'monster', sp, mut: true });
      if (r.status === 'pending') after(() => imageIdle());
      out = { status: r.status, id: r.url ? idFromUrl(r.url) : undefined };
    } else if (b.step === 'variant') {
      const base = await request({ kind: 'monster', sp });
      if (base.status === 'pending') after(() => imageIdle());
      out = base.status === 'ready' && base.url ? await variant(sp, String(b.mut), idFromUrl(base.url)) : { status: base.status };
    } else if (b.step === 'clip') {
      out = await clip(sp, String(b.mut), String(b.motion), String(b.src));
    } else if (b.step === 'spotpic') {
      out = await spotPic(sp, String(b.mut), String(b.spot), String(b.src), new URL(req.url).origin);
    } else if (b.step === 'spotclip') {
      out = await spotClip(sp, String(b.mut), String(b.spot), String(b.src));
    } else if (b.step === 'cut') {
      out = await cut(sp, String(b.mut), String(b.motion), String(b.src));
    } else return json({ status: 'invalid' }, 400);
    // Only the call that started the job keeps the function alive: a later "still pending?" question must not hold a second function open.
    if (out.started) after(() => idle());
    return json({ status: out.status, id: out.id, alpha: out.alpha, why: out.why });
  });
}
