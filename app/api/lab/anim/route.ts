import { after } from 'next/server';
import { idle as imageIdle, idFromUrl, request } from '@/lib/imagegen';
import * as C from '@/lib/content';
import * as D from '@/lib/daily';
import { json, guard, checkWrite, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { ensureDaily } from '@/lib/server/dailystore';
import { assetsOf, clip, idle, info, variant, type Out } from '@/lib/server/anim';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // a clip is made after the answer is sent: the function must stay alive until it is saved

// Owner only (Authorization: Bearer <ADMIN_KEY>, the same key as /admin). This route spends money.
// GET  ?sp=<species id>   prices, spend, the species list and what is already made for that species
// POST { step: 'base' | 'variant' | 'clip', sp, mut?, motion?, src? }   answers { status, id } at once; ask again until the status is not 'pending'
const speciesOk = (sp: string) => D.allSpecies().some((s) => s.id === sp) && !!C.SPECIES_EN[sp];

export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    await ensureDaily();
    const sp = new URL(req.url).searchParams.get('sp') || '';
    const species = D.allSpecies().filter((s) => C.SPECIES_EN[s.id]).map((s) => ({ id: s.id, name: s.name, isNew: !C.SPECIES.some((x) => x.id === s.id) }));
    return json({ ok: true, ...(await info()), species, assets: sp && speciesOk(sp) ? await assetsOf(sp) : [] });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    checkWrite(req);
    const b = await readBody(req);
    await ensureDaily();
    const sp = typeof b?.sp === 'string' ? b.sp : '';
    if (!speciesOk(sp)) return json({ status: 'invalid' });
    let out: Out;
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
    } else return json({ status: 'invalid' }, 400);
    // Only the call that started the job keeps the function alive: a later "still pending?" question must not hold a second function open.
    if (out.started) after(() => idle());
    return json({ status: out.status, id: out.id, why: out.why });
  });
}
