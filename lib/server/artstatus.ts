// Which fixed pictures (public/art, see lib/artjobs.ts) are still missing, and which of them the server has drawn since (kept in the database, shown by app/api/art).
// A fixed picture is "missing" when its file was not shipped with this build and the server has not drawn it either.
import { query } from './db';
import { artJobs } from '../artjobs';
import { shippedArt, missingArt, type ArtStatus } from './artfiles';
export { shippedArt, missingArt, type ArtStatus };

// key -> id of the newest picture the server drew for that file. Remembered for half a minute (a page of book covers asks for dozens of files at once).
const g = globalThis as any;
const CACHE: { at: number; v: Map<string, string> } = g.__tutienDrawnArt || (g.__tutienDrawnArt = { at: 0, v: new Map() });
export async function drawnArt(fresh = false): Promise<Map<string, string>> {
  const now = Date.now();
  if (!fresh && now - CACHE.at < 30_000) return CACHE.v;
  const rows = (await query<{ asset_key: string; image_id: string }>(
    `SELECT x.asset_key, x.image_id FROM image_index x JOIN images i ON i.id = x.image_id WHERE starts_with(x.asset_key, 'art|') ORDER BY x.style, x.created`)).rows;
  const v = new Map<string, string>();
  for (const r of rows) v.set(r.asset_key, r.image_id);   // oldest first, so the newest picture of a file wins
  CACHE.at = now; CACHE.v = v;
  return v;
}
export const forgetDrawnArt = () => { CACHE.at = 0; };

export async function artStatus(fresh = false): Promise<ArtStatus> { return missingArt(artJobs(), shippedArt(), await drawnArt(fresh)); }
