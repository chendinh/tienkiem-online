// Adds every existing item picture to image_index (the stable lookup by item look). Only INSERTs rows: no picture is changed or deleted.
// Safe to run again. Pictures that cannot be recognised (books, props, unknown prompts) are skipped and counted.
//   npx tsx scripts/index-images.ts --dry     count only, writes nothing
//   npx tsx scripts/index-images.ts           add the rows
try { (process as any).loadEnvFile('.env.local'); } catch {}
import { query, closeDb } from '../lib/server/db';
import { itemAssetKey } from '../lib/assetKey';
import { itemKeyFromPrompt } from '../lib/assetKeyParse';
import { keyOfSpec } from '../lib/server/imageindex';
import { STYLE_VERSION } from '../lib/imageprompt';

(async () => {
  const dry = process.argv.includes('--dry');
  const rows = (await query<{ id: string; spec: any; prompt: string | null; seed: number | null; attempt: number | null; created: Date }>(
    `SELECT id, meta->'spec' AS spec, meta->>'prompt' AS prompt, (meta->>'seed')::float8 AS seed, (meta->>'attempt')::int AS attempt, created FROM images WHERE meta->>'kind' = 'item' OR meta->>'prompt' LIKE '%an inventory icon of a single%'`)).rows;
  let ok = 0, fromSpec = 0, skipped = 0, added = 0, fixed = 0;
  for (const r of rows) {
    // the prompt and seed tell what the picture really shows; the stored spec is the fallback
    const k = itemKeyFromPrompt(r.prompt, r.seed, r.attempt ?? 0);
    const key = k ? itemAssetKey(k) : keyOfSpec(r.spec);
    if (!key) { skipped++; continue; }
    if (k) ok++; else fromSpec++;
    // self-heal: drop rows of this picture that point at another key (an earlier, wrong reading); the picture itself is never touched
    if (!dry) fixed += (await query('DELETE FROM image_index WHERE image_id = $1 AND asset_key <> $2', [r.id, key])).rowCount || 0;
    if (!dry) added += (await query('INSERT INTO image_index (asset_key, image_id, style, created) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [key, r.id, STYLE_VERSION, r.created])).rowCount || 0;
  }
  console.log(JSON.stringify({ dry, rows: rows.length, fromPrompt: ok, fromSpec, skipped, added, removedWrongRows: fixed }));
  await closeDb();
})().catch((e) => { console.error('failed:', String(e?.message || e).slice(0, 200)); process.exit(1); });
