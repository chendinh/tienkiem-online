// Draws the effect pictures of the techniques (lib/skillfx.ts TEXTURES) once and ships them in public/art/fx/{id}.webp.
// Each picture is a grayscale glow on pure black. The stage turns the brightness into transparency and tints it with the colour of the
// technique's element (components/fx/SkillFx.ts), so one picture serves every element.
// Standalone: it talks to fal.ai directly (needs FAL_KEY in .env.local) and does not use the database or the in-game spend ledger,
// so it has its own cap (--max-usd). Safe to stop and run again: finished files are skipped.
//   npm run gen:skillfx                      draw every picture that is missing
//   npx tsx scripts/gen-skillfx.ts --dry     list what would be drawn and the estimated cost (no API calls)
//   npx tsx scripts/gen-skillfx.ts --only flame,sun   draw just these (add --force to redraw them)
//   npx tsx scripts/gen-skillfx.ts --sheet   write a contact sheet of the finished pictures to /tmp/skillfx-sheet.png (for a quick look)
// Model: FAL_FX_MODEL (default google/nano-banana-2.1, about $0.05 a picture at 1K); a FLUX model such as fal-ai/flux/dev also works.
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TEXTURES } from '../lib/skillfx';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const OUT = path.join(process.cwd(), 'public', 'art', 'fx');
const MANIFEST = path.join(OUT, '_manifest.json');
const MODEL = process.env.FAL_FX_MODEL || 'google/nano-banana-2.1';
const NANO = /nano-banana/.test(MODEL);
const PRICE = Number(process.env.FAL_FX_PRICE || (NANO ? 0.05 : 0.03));   // USD a picture, rounded up
const MAX_USD = Number(opt('--max-usd') || 3);
const WIDTH = 512;                                                         // pixel width of the saved picture (wide ones keep their ratio)

const STYLE = ' Isolated on a pure solid black background (#000000). Monochrome grayscale glowing visual effect sprite for a 2D game: a white-hot bright core fading softly into darker grey, no colors at all. Centered, with a wide empty black margin on every side, nothing touching or cut by the edges. No text, no letters, no calligraphy, no seal stamp, no watermark, no frame, no border, no person, no face, no floor or scenery. Style: East Asian xianxia fantasy spell effect, painterly ink and light, crisp high contrast.';
const promptOf = (id: string) => `A visual effect picture: ${TEXTURES[id].what}.${STYLE}`;
const seedOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17) % 1_000_000;
const aspectOf = (ar: number) => (ar > 1.5 ? '16:9' : '1:1');
const dims = (ar: number) => [WIDTH, Math.round(WIDTH / ar)] as const;

// Turn what the model drew into a clean light mask: grayscale, near-black noise removed, edges faded to pure black so the sprite never shows a box.
async function clean(buf: Buffer, ar: number): Promise<Buffer> {
  const [w, h] = dims(ar);
  const { data } = await sharp(buf).resize(w, h, { fit: 'cover' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(w * h);
  const floor = 16, fade = 0.1;
  const ss = (a: number) => { const t = Math.min(1, Math.max(0, a)); return t * t * (3 - 2 * t); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const v = Math.max(0, data[i] - floor) / (255 - floor);
    const edge = Math.min(ss(x / (w * fade)), ss((w - 1 - x) / (w * fade)), ss(y / (h * fade)), ss((h - 1 - y) / (h * fade)));
    out[i] = Math.round(Math.pow(v, 1.05) * 255 * edge);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 84, effort: 5 }).toBuffer();
}

async function draw(id: string): Promise<{ buf: Buffer; cost: number; requestId?: string }> {
  const { fal } = await import('@fal-ai/client');
  const t = TEXTURES[id], [w, h] = dims(t.ar);
  const input: any = NANO
    ? { prompt: promptOf(id), aspect_ratio: aspectOf(t.ar), resolution: '1K', seed: seedOf(id), num_images: 1, output_format: 'jpeg', ...(/nano-banana-2\.1/.test(MODEL) ? { thinking_level: process.env.FAL_THINKING || 'medium' } : {}) }
    : { prompt: promptOf(id), image_size: { width: Math.max(512, w), height: Math.max(512, h) }, seed: seedOf(id), num_images: 1, output_format: 'jpeg', enable_safety_checker: true };
  const res: any = await fal.subscribe(MODEL, { input });
  const url = res?.data?.images?.[0]?.url;
  if (!url) throw new Error('no image in the answer');
  if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(url).hostname)) throw new Error('unexpected image host');
  let last: any;
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`download ${r.status}`); return { buf: Buffer.from(await r.arrayBuffer()), cost: PRICE, requestId: res.requestId }; }
    catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}

async function sheet() {
  const ids = Object.keys(TEXTURES).filter((id) => fs.existsSync(path.join(OUT, `${id}.webp`)));
  const cell = 220, cols = 6, rows = Math.ceil(ids.length / cols);
  const tiles = await Promise.all(ids.map(async (id, k) => {
    const png = await sharp(path.join(OUT, `${id}.webp`)).resize(cell - 8, cell - 28, { fit: 'contain', background: '#000' }).png().toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="20"><text x="6" y="15" font-family="monospace" font-size="14" fill="#eed08a">${id}</text></svg>`);
    return [{ input: png, left: (k % cols) * cell + 4, top: Math.floor(k / cols) * cell + 24 }, { input: label, left: (k % cols) * cell, top: Math.floor(k / cols) * cell + 2 }];
  }));
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#0b0b10' } }).composite(tiles.flat()).png().toFile('/tmp/skillfx-sheet.png');
  console.log(`wrote /tmp/skillfx-sheet.png (${ids.length} pictures)`);
}

(async () => {
  if (flag('--sheet')) { await sheet(); return; }
  const only = opt('--only') ? opt('--only').split(',').map((s) => s.trim()).filter(Boolean) : [];
  const unknown = only.filter((id) => !TEXTURES[id]);
  if (unknown.length) { console.error(`unknown texture id: ${unknown.join(', ')}`); process.exit(1); }
  const ids = (only.length ? only : Object.keys(TEXTURES)).filter((id) => flag('--force') || !fs.existsSync(path.join(OUT, `${id}.webp`)));
  const est = ids.length * PRICE;
  console.log(`model ${MODEL} | wanted ${only.length || Object.keys(TEXTURES).length} | to draw ${ids.length} | estimated $${est.toFixed(2)} (cap $${MAX_USD})`);
  if (flag('--dry')) { for (const id of ids) console.log(' ', id, aspectOf(TEXTURES[id].ar)); return; }
  if (!ids.length) { console.log('nothing to do'); return; }
  if (est > MAX_USD) { console.error(`the estimate is over the cap: raise it with --max-usd ${Math.ceil(est)}`); process.exit(1); }
  if (!process.env.FAL_KEY) { console.error('FAL_KEY is missing (.env.local)'); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  let manifest: Record<string, any> = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}
  let spent = 0; const failed: string[] = []; const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      if (spent + PRICE > MAX_USD) { failed.push(id); continue; }
      try {
        const r = await draw(id); spent += r.cost;
        fs.writeFileSync(path.join(OUT, `${id}.webp`), await clean(r.buf, TEXTURES[id].ar));
        manifest[id] = { model: MODEL, seed: seedOf(id), cost: r.cost, requestId: r.requestId, date: new Date().toISOString().slice(0, 10), prompt: promptOf(id) };
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
        console.log('drawn', id);
      } catch (e: any) { failed.push(id); console.log('failed', id, String(e?.message || e).slice(0, 140)); }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log(failed.length ? `DONE with ${failed.length} not drawn: ${failed.join(', ')} (run again)` : 'DONE', `| spent about $${spent.toFixed(2)}`);
  process.exit(failed.length ? 2 : 0);
})();
