// Stable lookup of item pictures by item look (lib/assetKey.ts), independent of prompt, model and provider.
// Only reads and adds rows: nothing here changes or deletes a picture.
import { query } from './db';
import { itemAssetKey, type ItemKeyInput } from '../assetKey';

// Only wearable-item specs have a stable key.
export function keyOfSpec(spec: any): string | null {
  if (!spec || typeof spec !== 'object' || spec.kind !== 'item' || typeof spec.slot !== 'string') return null;
  return itemAssetKey({ slot: spec.slot, base: typeof spec.base === 'string' ? spec.base : '', tier: Number(spec.tier) | 0, e: typeof spec.e === 'string' ? spec.e : '', v: Number(spec.v) | 0 });
}

export async function indexImage(key: string, imageId: string, style: number) {
  await query('INSERT INTO image_index (asset_key, image_id, style) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [key, imageId, style]);
}
// The best picture that exists for this look: the newest style first, then the newest picture of that style. Never draws.
export async function lookupKey(key: string): Promise<{ id: string; ext: string; crop: number; style: number } | null> {
  const r = (await query<{ id: string; ext: string; crop: number | null; style: number }>(
    `SELECT i.id, i.ext, (i.meta->>'crop')::float8 AS crop, x.style FROM image_index x JOIN images i ON i.id = x.image_id WHERE x.asset_key = $1 ORDER BY x.style DESC, x.created DESC LIMIT 1`, [key])).rows[0];
  return r ? { id: r.id, ext: r.ext, crop: typeof r.crop === 'number' && isFinite(r.crop) ? r.crop : 0, style: r.style } : null;
}
export async function wantImage(key: string, spec: any) {
  try {
    const s: ItemKeyInput = { slot: spec.slot, base: spec.base || '', tier: Number(spec.tier) | 0, e: spec.e || '', v: Number(spec.v) | 0 };
    await query(`INSERT INTO image_wanted (asset_key, spec, tier) VALUES ($1, $2::jsonb, $3) ON CONFLICT (asset_key) DO UPDATE SET hits = image_wanted.hits + 1`, [key, JSON.stringify({ kind: 'item', slot: s.slot, base: s.base, tier: s.tier, e: s.e, ...(s.v ? { v: s.v } : {}) }), s.tier]);
  } catch (e: any) { console.warn('[imageindex] could not note a wanted picture:', String(e?.message || e).slice(0, 100)); }
}
export async function dropWanted(key: string) { await query('DELETE FROM image_wanted WHERE asset_key = $1', [key]); }
