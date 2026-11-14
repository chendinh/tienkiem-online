// Draws ONE sample outfit for a starting portrait (an edit of its base picture) so you can check that the face stays the
// same while the clothes change. The outfit is drawn from the base picture + the icon of each worn item, so the first run also draws
// up to 6 icons ($0.003 each). Costs about $0.07 for the outfit (+ about $0.05 if the base is not drawn yet); see FAL_OUTFIT_MODEL in .env.example.
//   npx tsx scripts/sample-outfit.ts [f|m] [tier 0-5]      -> data/samples/{base,outfit}_<g>_t<tier>.jpg
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import { request, fileFor, idFromUrl, info } from '../lib/imagegen';
import { introSpec } from '../lib/avatarSpec';

const g = (process.argv[2] === 'm' ? 'm' : 'f') as 'f' | 'm';
const t = Math.min(5, Math.max(0, Number(process.argv[3] ?? 3)));
const base = introSpec(g);
const el = base.el;
const eq = {
  Weapon: { b: 'Trường Kiếm', t, e: el }, Headwear: { b: 'Ngọc Quan', t, e: el }, Robe: { b: 'Đạo Bào', t, e: el },
  Footwear: { b: 'Vân Hài', t, e: el }, Back: { b: 'Đấu Bồng', t, e: el }, Accessory: { b: 'Ngọc Bội', t, e: el },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const save = (url: string, name: string) => {
  const f = fileFor(idFromUrl(url));
  if (!f) throw new Error('missing file for ' + url);
  const out = path.join(process.cwd(), 'data', 'samples');
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(f.file, path.join(out, name));
  console.log('saved data/samples/' + name);
};
(async () => {
  let baseDone = false;
  for (;;) {
    if (!baseDone) { const b = request(base); if (b.status === 'ready') { save(b.url!, `base_${g}_t${t}.jpg`); baseDone = true; } else if (b.status !== 'pending') { console.log('base:', b.status, JSON.stringify(info())); process.exit(1); } }
    const r = request({ kind: 'outfit', look: base.look, el, pers: base.pers, eq });
    if (r.status === 'ready') { save(r.url!, `outfit_${g}_t${t}.jpg`); console.log(JSON.stringify(info().budget)); process.exit(0); }
    if (r.status !== 'pending') { console.log('outfit:', r.status, JSON.stringify(info())); process.exit(1); }
    await sleep(4000);
  }
})();
