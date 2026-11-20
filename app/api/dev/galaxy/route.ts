import { draw, stamps, writable } from '@/lib/server/galaxyArt';
import { GX_ART_NAMES } from '@/lib/galaxyArt';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// Developer tool, local only: no database and no admin key needed. It answers 404 on Vercel / in production, so it cannot be reached on the live game.
// GET                              { writable, names, stamps }
// POST { name, size: '2k' | '1k' }  draw that picture again with the image model (30 to 120 s; about 0.09 to 0.17 USD) and replace the file in public/art/galaxy
const off = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const out = (b: unknown, status = 200) => Response.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  if (off()) return out({ ok: false }, 404);
  return out({ ok: true, names: GX_ART_NAMES, writable: await writable(), stamps: await stamps() });
}
export async function POST(req: Request) {
  if (off()) return out({ ok: false }, 404);
  try {
    const b: any = await req.json().catch(() => ({}));
    if (typeof b?.name !== 'string') return out({ ok: false, code: 'E_BAD_REQUEST' }, 400);
    const r = await draw(b.name, b.size);
    return out({ ok: true, cost: r.cost, files: r.files, stamps: await stamps() });
  } catch (e: any) {
    return out({ ok: false, code: e?.code || 'E_FAILED', message: String(e?.message || e) }, e?.status || 500);
  }
}
