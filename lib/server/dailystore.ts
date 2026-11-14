// Daily packs in Postgres (table kv, key "daily:YYYY-MM-DD") and the in-memory registry the engine reads (lib/daily.ts).
import { query } from './db';
import { type DailyPack, setDaily } from '../daily';

const g = globalThis as any;
const REFRESH_MS = 60_000;
const KEY = /^daily:\d{4}-\d{2}-\d{2}$/;

export async function loadPacks(limit = 800): Promise<DailyPack[]> {
  const r = await query<{ key: string; value: DailyPack }>(`SELECT key, value FROM kv WHERE key LIKE 'daily:%' ORDER BY key DESC LIMIT $1`, [limit]);
  return r.rows.filter((x) => KEY.test(x.key) && x.value && x.value.beast).map((x) => x.value).reverse();
}
export async function savePack(p: DailyPack, replace = false) {
  const sql = `INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO ${replace ? 'UPDATE SET value = EXCLUDED.value' : 'NOTHING'}`;
  await query(sql, [`daily:${p.day}`, JSON.stringify(p)]);
}

// Make the registry current before a save is settled. A failure keeps the registry as it was and is retried on the next request.
export function ensureDaily(force = false): Promise<void> {
  const now = Date.now();
  if (!force && g.__tutienDaily && now - g.__tutienDaily.at < REFRESH_MS) return g.__tutienDaily.p;
  const p: Promise<void> = loadPacks().then((packs) => setDaily(packs)).catch((e) => {
    console.warn('[daily] could not load', String(e?.message || e).slice(0, 120));
    if (g.__tutienDaily && g.__tutienDaily.p === p) g.__tutienDaily = null;
  });
  g.__tutienDaily = { at: now, p };
  return p;
}
