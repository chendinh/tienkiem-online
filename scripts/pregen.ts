// Draws the fixed pictures of the game once and ships them in public/art:
//   intro_f.jpg, intro_m.jpg          the two starting portraits (gender choice screen)
//   monsters/{sp}.jpg, {sp}_mut.jpg   one master per species, and its mutated variant (an EDIT of the master)
//   shop/{id}.jpg, shop/mat_{id}.jpg  Phường Thị goods and materials (inventory icons)
//   zones/{zone}.jpg, zones/market.jpg  one wide scene per zone and one for the market
//   arenas/{arena}.jpg                 the 10 fight backgrounds (two per zone)
//   books/{name}.jpg                   one picture per technique (Bí Kíp) and per Công Pháp scripture, shared by all players
//   buyers/{arch}_{f|m}.jpg            the portraits of the Khách Cầu Mua of Phường Thị: a woman and a man for each kind of cultivator
// It goes through the same service as the game (lib/imagegen.ts): same style block, seeds, cache, spend caps and
// Claude review. Safe to stop and run again: finished files are skipped.
//   npm run pregen                       draw everything that is missing
//   npx tsx scripts/pregen.ts --dry      list what would be drawn and the estimated cost (no API calls)
//   npx tsx scripts/pregen.ts --only intro | monsters | shop | zones | arenas | books | buyers
//   npx tsx scripts/pregen.ts --force    redraw even when the file exists (unchanged prompts are free: the picture cache in the database)
// Needs DATABASE_URL (the pictures are cached there): for a local run see "npm run db:dev" in the README.
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import { request, provider, idFromUrl, info, estimateCost } from '../lib/imagegen';
import { getImage } from '../lib/server/images';
import { buildPlan } from '../lib/imageprompt';
import { artJobs, type ArtJob } from '../lib/artjobs';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const PUB = path.join(process.cwd(), 'public');
const MANIFEST = path.join(PUB, 'art', '_manifest.json');

type Job = ArtJob;
const jobs: Job[] = artJobs(only);
const abs = (dest: string) => path.join(PUB, dest);
const todo = jobs.filter((j) => flag('--force') || !fs.existsSync(abs(j.dest)));
const est = (j: Job) => estimateCost(j.spec);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let manifest: Record<string, any> = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}

(async () => {
  const P = provider();
  console.log(`provider ${P.name} | wanted ${jobs.length} | to draw ${todo.length} | estimated $${todo.reduce((a, j) => a + est(j), 0).toFixed(3)} (fal list prices, before Claude review redraws)`);
  if (flag('--dry')) { for (const j of todo) console.log(' ', j.dest, buildPlan(j.spec).refs?.length ? '(edit)' : ''); return; }
  if (!todo.length) { console.log('nothing to do'); return; }

  const left = new Map(todo.map((j) => [j.name, j]));
  const failed: string[] = [];
  let lastLogged = -1;
  while (left.size) {
    for (const [name, j] of [...left]) {
      const r = await request(j.spec);
      if (r.status === 'ready') {
        const id = idFromUrl(r.url!), f = await getImage(id);
        if (!f) { failed.push(name); left.delete(name); continue; }
        if (f.ext !== 'jpg') console.warn(`warning: ${name} came back as .${f.ext}; it is saved as ${j.dest} anyway`);
        fs.mkdirSync(path.dirname(abs(j.dest)), { recursive: true });
        fs.writeFileSync(abs(j.dest), f.data);
        const meta: any = f.meta || {};
        manifest[j.dest.replace('/art/', '')] = { kind: meta.kind, provider: meta.provider, model: meta.model, seed: meta.seed, attempt: meta.attempt, requestId: meta.requestId, cost: meta.cost, date: meta.date, cacheId: id, refCacheId: meta.ref, prompt: meta.prompt, editPrompt: meta.editPrompt };
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
        left.delete(name);
        console.log('drawn', j.dest);
      } else if (r.status === 'failed') { failed.push(name); left.delete(name); console.log('failed', j.dest); }
      else if (r.status === 'limited') { console.log('Stopped: image budget reached, hourly cap hit, or the provider refused (403).', JSON.stringify(await info())); process.exit(1); }
      else if (r.status === 'disabled' || r.status === 'invalid') { console.log(`Cannot draw ${name}: ${r.status}`); process.exit(1); }
    }
    if (left.size !== lastLogged) { console.log('remaining', left.size, new Date().toISOString().slice(11, 19)); lastLogged = left.size; }
    if (left.size) await sleep(4000);
  }
  const spent = Object.values(manifest).reduce((a: number, m: any) => a + (m.cost || 0), 0);
  console.log(failed.length ? `DONE with ${failed.length} failed: ${failed.join(', ')} (see the log above; run again later)` : 'DONE', `| cost recorded in manifest $${spent.toFixed(3)} | ledger`, JSON.stringify((await info()).budget));
  try { (await import('node:child_process')).execSync('npx tsx scripts/thumbs.ts', { stdio: 'inherit' }); } catch {}
  process.exit(failed.length ? 2 : 0);
})();
