// The owner's tool to draw the Dị Biến pictures again (/admin). Redrawing = forgetting the saved pictures of a look (the variant pictures and the still cut-outs made from them) and
// bumping a revision that goes into the id and the seed of every new picture, so the next ones are new files with new addresses (no browser shows an old copy) and a new draw.
// Nothing is drawn here: a picture is made again, with the current model, the next time a player's creature of that look needs it (see summon and portrait in zoo.ts),
// so only the creatures that players really have are paid for.
import { query } from './db';
import * as A from '../anim';

const REV = 'variant.rev';
let memo: { t: number; n: number } | null = null;
export async function variantRev(): Promise<number> {
  if (memo && Date.now() - memo.t < 10000) return memo.n;
  let n = 0;
  try { n = Number((await query<{ v: string }>(`SELECT value #>> '{}' AS v FROM kv WHERE key = $1`, [REV])).rows[0]?.v) || 0; } catch { /* no row yet: revision 0 */ }
  memo = { t: Date.now(), n };
  return n;
}

export interface LookStat { id: string; name: string; pictures: number; stills: number }
export async function variantStats(): Promise<{ rev: number; looks: LookStat[] }> {
  const r = await query<{ mut: string; kind: string; n: string }>(
    `SELECT meta->'spec'->>'mut' AS mut, kind, count(*) AS n FROM images WHERE kind IN ('animvar','animstill') AND meta->'spec'->>'kind' IN ('variant','still') GROUP BY 1, 2`);
  const looks = A.MUTATIONS.map((m) => ({
    id: m.id, name: m.name,
    pictures: Number(r.rows.find((x) => x.mut === m.id && x.kind === 'animvar')?.n || 0),
    stills: Number(r.rows.find((x) => x.mut === m.id && x.kind === 'animstill')?.n || 0),
  }));
  return { rev: await variantRev(), looks };
}

// `looks`: Dị Biến look ids. Returns how many pictures were forgotten.
export async function resetVariants(looks: string[]): Promise<{ rev: number; removed: number }> {
  const ids = looks.filter((l) => !!A.mutationOf(l));
  if (!ids.length) return { rev: await variantRev(), removed: 0 };
  const r = await query(`DELETE FROM images WHERE kind IN ('animvar','animstill') AND meta->'spec'->>'kind' IN ('variant','still') AND meta->'spec'->>'mut' = ANY($1::text[]) RETURNING id`, [ids]);
  const rev = (await variantRev()) + 1;
  await query(`INSERT INTO kv (key, value) VALUES ($1, to_jsonb($2::int)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [REV, rev]);
  memo = { t: Date.now(), n: rev };
  return { rev, removed: r.rows.length };
}

// ---- item icons of the highest rarities (Thiên = 4, Tiên = 5). An item look is found by its key (lib/assetKey.ts), never by prompt, so an icon drawn long ago keeps showing for ever;
// to have it drawn again (with the current model) it is forgotten here, and the next time a player's item of that look is shown it is drawn.
export async function itemStats(): Promise<{ tier: number; name: string; pictures: number }[]> {
  const r = await query<{ t: string; n: string }>(`SELECT split_part(asset_key, '|', 5) AS t, count(*) AS n FROM image_index WHERE split_part(asset_key, '|', 5) IN ('4','5') GROUP BY 1`);
  return [{ tier: 4, name: 'Thiên phẩm' }, { tier: 5, name: 'Tiên phẩm' }].map((x) => ({ ...x, pictures: Number(r.rows.find((y) => Number(y.t) === x.tier)?.n || 0) }));
}
export async function resetItems(tier: number): Promise<{ removed: number }> {
  if (tier !== 4 && tier !== 5) return { removed: 0 };
  const ids = (await query<{ image_id: string }>(`SELECT image_id FROM image_index WHERE split_part(asset_key, '|', 5) = $1`, [String(tier)])).rows.map((x) => x.image_id);
  await query(`DELETE FROM image_index WHERE split_part(asset_key, '|', 5) = $1`, [String(tier)]);
  if (ids.length) await query(`DELETE FROM images WHERE id = ANY($1::text[])`, [ids]);
  return { removed: ids.length };
}
