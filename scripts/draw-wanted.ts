// Draws item icons that the library does not have yet:
//   1. every common look of every item base: Phàm, Hoàng (no element) and Huyền (one per element), the icons almost every drop shows;
//   2. the looks players asked for while drawing was off or limited (table image_wanted: Thiên, Tiên, Địa ...), most requested first.
// A look that already has ANY picture (any style) is skipped, so nothing paid is drawn twice. Safe to stop and run again.
//   npx tsx scripts/draw-wanted.ts --dry            list what is missing and the estimated cost, no API calls
//   npx tsx scripts/draw-wanted.ts                  draw the common looks and the wanted ones
//   npx tsx scripts/draw-wanted.ts --common-only    only the common looks
//   npx tsx scripts/draw-wanted.ts --max 50         stop after 50 pictures
try { (process as any).loadEnvFile('.env.local'); } catch {}
import * as C from '../lib/content';
import { request, idle, info } from '../lib/imagegen';
import { query, closeDb } from '../lib/server/db';
import { keyOfSpec, lookupKey } from '../lib/server/imageindex';

const flag = (n: string) => process.argv.includes(n);
const maxArg = process.argv.indexOf('--max');
const MAX = maxArg > 0 ? Number(process.argv[maxArg + 1]) || Infinity : Infinity;
const COST = 0.003;   // fal list price of one icon

(async () => {
  const specs: any[] = [];
  for (const slot of C.SLOTS) for (const base of C.basesOf(slot)) {
    specs.push({ kind: 'item', slot, base, tier: 0, e: '' }, { kind: 'item', slot, base, tier: 1, e: '' });
    for (const e of C.EO) specs.push({ kind: 'item', slot, base, tier: 2, e });
  }
  if (!flag('--common-only')) {
    const w = (await query<{ spec: any }>('SELECT spec FROM image_wanted ORDER BY hits DESC, tier ASC, added ASC')).rows;
    for (const r of w) specs.push(r.spec);
  }
  const todo: any[] = [];
  for (const s of specs) { const k = keyOfSpec(s); if (k && !(await lookupKey(k))) todo.push(s); }
  console.log(`looks checked ${specs.length} | missing ${todo.length} | estimated $${(Math.min(todo.length, MAX) * COST).toFixed(3)}`);
  if (flag('--dry') || !todo.length) { await closeDb(); return; }

  let done = 0, failed = 0;
  for (const s of todo.slice(0, MAX)) {
    for (let tries = 0; ; tries++) {
      if (tries > 200) { failed++; console.log('gave up', s.slot, s.base, s.tier, s.e || ''); break; }
      const r = await request({ ...s, pri: 3 });
      if (r.status === 'ready') { done++; console.log('drawn', done, s.slot, s.base, s.tier, s.e || ''); break; }
      if (r.status === 'pending') { await idle(); continue; }
      if (r.status === 'failed') { failed++; console.log('failed', s.slot, s.base, s.tier, s.e || ''); break; }
      console.log('Stopped:', r.status, JSON.stringify(await info()));
      await closeDb();
      process.exit(1);
    }
  }
  console.log(`drawn ${done}, failed ${failed}`, JSON.stringify((await info()).budget));
  await closeDb();
  process.exit(failed ? 2 : 0);
})().catch((e) => { console.error('failed:', String(e?.message || e).slice(0, 200)); process.exit(1); });
