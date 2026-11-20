import { json, guard } from '@/lib/server/http';
import { manifest } from '@/lib/server/galaxyArt';
export const runtime = 'nodejs';
// The addresses of the pictures the owner has redrawn (empty: the pictures that ship with the game are used). Public, short cache.
export async function GET() {
  return guard(async () => json({ ok: true, art: await manifest() }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=60' }));
}
