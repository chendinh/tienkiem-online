import { after } from 'next/server';
import { beastsOf, carryOn, cutsFor, loadZoo, saveZoo, summon } from '@/lib/server/zoo';
import { ensureDaily } from '@/lib/server/dailystore';
import { json, guard, checkWrite, readBody, requireUser } from '@/lib/server/http';
import { ZOO_BGS, ZOO_MAX } from '@/lib/zoo';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // a clip is made after the answer is sent: the function must stay alive until it is saved

// Linh Thú Viên of a player (the game's session cookie).
// GET  the player's Dị Biến beasts (each with its look and, when made, its cut-out clip), their layout and the backgrounds
// POST { step: 'summon', beast }  make the clip of that beast's look if it is missing (once for everybody); answers its stage and a rough waiting time. Ask again until 'ready'.
// POST { step: 'save', bg, lay }  keep the layout (nothing is spent)
export async function GET(req: Request) {
  return guard(async () => {
    const u = await requireUser(req);
    await ensureDaily();   // the species of the day are known only after this
    const beasts = await beastsOf(u.id, true);
    if (!beasts) return json({ ok: false, code: 'E_NOT_FOUND' }, 404);
    const own = new Set(beasts.map((b) => b.id)), cuts = await cutsFor(beasts.map((b) => ({ sp: b.sp, look: b.look })));
    return json({
      ok: true, max: ZOO_MAX, bgs: ZOO_BGS, zoo: await loadZoo(u.id, own),
      beasts: beasts.map((b) => ({ ...b, cut: cuts.get(`${b.sp}:${b.look}`) || null })),
    });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    checkWrite(req);
    const u = await requireUser(req);
    const b = await readBody(req);
    await ensureDaily();
    const beasts = await beastsOf(u.id, b?.step === 'save');
    if (!beasts) return json({ ok: false, code: 'E_NOT_FOUND' }, 404);
    if (b?.step === 'save') return json({ ok: true, zoo: await saveZoo(u.id, b, new Set(beasts.map((x) => x.id))) });
    if (b?.step === 'summon') {
      const beast = beasts.find((x) => x.id === b.beast);   // only the look of a beast the player really has can be asked for
      if (!beast) return json({ status: 'invalid' });
      const out = await summon(beast.sp, beast.look);
      if (out.imgStarted || out.started) after(() => carryOn(beast.sp, beast.look));   // keeps the function alive and goes on to the next step by itself
      return json({ ok: true, status: out.status, stage: out.stage, eta: out.eta, cut: out.cut, why: out.why });
    }
    return json({ ok: false, code: 'E_BAD_REQUEST' }, 400);
  });
}
