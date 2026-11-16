// Daily packs in Postgres (table kv, key "daily:YYYY-MM-DD") and the in-memory registry the engine reads (lib/daily.ts).
import { query } from './db';
import { type DailyPack, type Relic, relicSig, setDaily, setRelics } from '../daily';

const g = globalThis as any;
const REFRESH_MS = 60_000;
const KEY = /^daily:\d{4}-\d{2}-\d{2}$/;

// No default cap: every pack ever published must stay in the registry, or old daily weapons lose their class and icon spec.
export async function loadPacks(limit = 100000): Promise<DailyPack[]> {
  const r = await query<{ key: string; value: DailyPack }>(`SELECT key, value FROM kv WHERE key LIKE 'daily:%' ORDER BY key DESC LIMIT $1`, [limit]);
  return r.rows.filter((x) => KEY.test(x.key) && x.value && x.value.beast).map((x) => x.value).reverse();
}
export async function savePack(p: DailyPack, replace = false) {
  const sql = `INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO ${replace ? 'UPDATE SET value = EXCLUDED.value' : 'NOTHING'}`;
  await query(sql, [`daily:${p.day}`, JSON.stringify(p)]);
}

const RELIC_KEEP = 400;   // the newest free relics the engine looks at
export async function loadRelics(): Promise<Relic[]> {
  const r = await query<{ item: Relic }>('SELECT item FROM relics WHERE holder IS NULL ORDER BY id DESC LIMIT $1', [RELIC_KEEP]);
  return r.rows.map((x) => x.item).filter((x) => x && x.tier >= 4 && typeof x.art === 'number' && typeof x.name === 'string');
}
// A relic belongs to one save at a time. Claiming is one atomic UPDATE, so two saves can never both get it (even on two server instances).
export async function claimRelic(sig: string, holder: string): Promise<boolean> {
  const r = await query('UPDATE relics SET holder = $2 WHERE sig = $1 AND holder IS NULL RETURNING id', [sig, holder]);
  return (r.rowCount || 0) > 0;
}
// A dissolved Thiên or Tiên item goes back to the pool (new rows start free). Only the save that holds a relic can free it.
export async function giveRelic(x: Relic, holder: string) {
  const item: Relic = { tier: x.tier, slot: x.slot, base: x.base, el: x.el, art: x.art, name: x.name, ...(x.tien ? { tien: x.tien } : {}) };
  await query(
    'INSERT INTO relics (sig, tier, item, holder) VALUES ($1, $2, $3::jsonb, NULL) ON CONFLICT (sig) DO UPDATE SET holder = NULL WHERE relics.holder = $4 OR relics.holder IS NULL',
    [relicSig(item), item.tier, JSON.stringify(item), holder],
  );
}
// A save that starts over or is deleted loses all its items: whatever it held becomes free again.
export async function releaseHeld(holder: string) { await query('UPDATE relics SET holder = NULL WHERE holder = $1', [holder]); }

// Make the registry current before a save is settled. A failure keeps the registry as it was and is retried on the next request.
export function ensureDaily(force = false): Promise<void> {
  const now = Date.now();
  if (!force && g.__tutienDaily && now - g.__tutienDaily.at < REFRESH_MS) return g.__tutienDaily.p;
  const p: Promise<void> = Promise.all([loadPacks(), loadRelics()]).then(([packs, relics]) => { setDaily(packs); setRelics(relics); }).catch((e) => {
    console.warn('[daily] could not load', String(e?.message || e).slice(0, 120));
    if (g.__tutienDaily && g.__tutienDaily.p === p) g.__tutienDaily = null;
  });
  g.__tutienDaily = { at: now, p };
  return p;
}
