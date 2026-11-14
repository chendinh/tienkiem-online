// Generated pictures live in the images table (the id is the hash the saved games remember). Nothing here touches the disk.
import { query } from './db';

export interface Picture { id: string; ext: string; data: Buffer; meta: any; crop: number }

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : 0);

// Does the picture exist? Reads only the extension and the crop, never the picture itself.
export async function hasImage(id: string): Promise<{ ext: string; crop: number } | null> {
  const r = (await query<{ ext: string; crop: number | null }>(`SELECT ext, (meta->>'crop')::float8 AS crop FROM images WHERE id = $1`, [id])).rows[0];
  return r ? { ext: r.ext, crop: num(r.crop) } : null;
}
export async function getImage(id: string): Promise<Picture | null> {
  const r = (await query<{ ext: string; data: Buffer; meta: any }>('SELECT ext, data, meta FROM images WHERE id = $1', [id])).rows[0];
  return r ? { id, ext: r.ext, data: r.data, meta: r.meta, crop: num(r.meta?.crop) } : null;
}
export async function putImage(p: { id: string; kind: string; folder: string; ext: string; data: Buffer; meta: any }) {
  await query(
    'INSERT INTO images (id, kind, folder, ext, data, meta) VALUES ($1, $2, $3, $4, $5, $6::jsonb) ON CONFLICT (id) DO NOTHING',
    [p.id, p.kind, p.folder, p.ext, p.data, JSON.stringify(p.meta ?? {})],
  );
}
export async function getSmall(id: string): Promise<Buffer | null> {
  return (await query<{ sm: Buffer | null }>('SELECT sm FROM images WHERE id = $1', [id])).rows[0]?.sm || null;
}
export async function putSmall(id: string, data: Buffer) {
  await query('UPDATE images SET sm = $2 WHERE id = $1 AND sm IS NULL', [id, data]);
}

// ---- who is drawing what. A claim lasts a few minutes: a server instance that dies mid-picture does not block it for ever.
const STALE_MS = 8 * 60 * 1000;
export async function claimJob(id: string): Promise<boolean> {
  const now = Date.now();
  const r = await query('INSERT INTO image_jobs (id, started) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET started = $2 WHERE image_jobs.started < $3 RETURNING id', [id, now, now - STALE_MS]);
  return r.rows.length > 0;
}
export async function releaseJobs(ids: string[]) {
  if (!ids.length) return;
  try { await query('DELETE FROM image_jobs WHERE id = ANY($1::text[])', [ids]); } catch (e: any) { console.warn('[images] could not release', ids.length, 'claim(s):', String(e?.message || e).slice(0, 100)); }
}
