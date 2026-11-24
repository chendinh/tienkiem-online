import { drawnArt } from '@/lib/server/artstatus';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A fixed picture of the game (/art/books/x.jpg ...) whose file is not part of this build: next.config.mjs sends such a request here (a "fallback" rewrite, so a shipped file is
// always served first). If the owner's page has drawn the picture on the server, it is sent on to its place in the database; otherwise 404 and the game shows its stand-in.
// Reads only, never draws: a visitor must not be able to start a paid drawing.
const OK = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.(jpg|webp|png)$/;
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = (path || []).join('/');
  const none = () => new Response('not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } });
  if (!OK.test(rel)) return none();
  try {
    const id = (await drawnArt()).get(`art|${rel}`);
    if (!id) return none();
    return new Response(null, { status: 307, headers: { Location: `/api/img/${id}`, 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
  } catch (e) {
    console.error('[tutien] art', rel, e);
    return none();
  }
}
