// Draws the cultivators of the stages (Phó Bản, Triển lãm, the result cards) with AI, once, into public/art/tusi/<kind>_<g>_<n>.webp. lib/tusi.ts says which kinds
// (one per môn of weapon, and one empty-handed) and which outfits; nothing else about a player shows.
//   1. the first man (the swordsman, outfit 0) is drawn from a prompt (Nano Banana 2.1, square, 1K)                                    about 0.05 USD
//   2. the first woman is an EDIT of him, every other picture an EDIT of the first of its sex: one style, camera, size and flying sword for all   about 0.07 USD each
//   3. its background is removed (Bria), the figure is framed the same way in a 480 x 360 box (the flying sword at the same height, as the figure drawn in code)
//      and saved as WebP with alpha (about 30-60 KB)                                                                                    about 0.02 USD each
// The pictures as drawn and as cut out are kept in data/tusi/ (not shipped), so framing again costs nothing. lib/tusi-art.ts (which pictures exist) is rewritten after
// every run: until a kind has pictures the game keeps the figure drawn in code for it. Safe to stop and run again: a picture that exists is not drawn again.
//   npm run gen:tusi -- --dry                      list what is missing and the price
//   npm run gen:tusi -- --only kiem --variants 1   just the swordsman and the swordswoman, to look at the style first (/demo/tu-si)
//   npm run gen:tusi                               everything missing (9 kinds x woman and man x 3 outfits)
//   npm run gen:tusi -- --redo cung_f_1,dao_m_0    draw these again (a bad one; redoing kiem_m_0 or kiem_f_0 does not redraw the others made from it)
//   npm run gen:tusi -- --flip tieu_m_2            mirror one that faces left (free)
//   npm run gen:tusi -- --reframe                  frame every cut-out again (free: after changing the framing below)
// Other options: --g f|m (one sex only), --variants N (outfits per kind, up to 5), --max-usd 8 (stop before this run spends more), --lanes 3 (pictures drawn at once).
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';
import { TUSI_KINDS, TUSI_LOOKS, type TusiKind } from '../lib/tusi';

const args: string[] = process.argv.slice(2);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] || '' : '');
const flag = (n: string) => args.includes(n);
const list = (n: string) => opt(n).split(',').map((s) => s.trim()).filter(Boolean);
const only = list('--only'), redo = new Set(list('--redo')), flips = list('--flip');
const sexes: ('f' | 'm')[] = opt('--g') === 'f' ? ['f'] : opt('--g') === 'm' ? ['m'] : ['m', 'f'];
const variants = Math.max(1, Math.min(TUSI_LOOKS.length, Number(opt('--variants') || 3)));
const maxUsd = Number(opt('--max-usd') || 8), lanes = Math.max(1, Number(opt('--lanes') || 3));
const OUT = path.join(process.cwd(), 'public', 'art', 'tusi'), RAW = path.join(process.cwd(), 'data', 'tusi');
const MANIFEST = path.join(RAW, '_manifest.json'), INDEX = path.join(process.cwd(), 'lib', 'tusi-art.ts');
const PRICE = { draw: 0.05, edit: 0.07, cut: 0.02 };
const DRAW = 'google/nano-banana-2.1', EDIT = 'google/nano-banana-2.1/edit', CUT = process.env.FAL_FG_CUT_MODEL || 'fal-ai/bria/background/remove';
// The framing: a box of 4:3 like the figure drawn in code; the figure (with its sword and what it holds) at most FIG_H of the box tall and FIG_W wide, its lowest point
// (the flying sword) at FOOT of the box's height, centred across.
const BOX_W = 480, BOX_H = 360, FIG_H = 0.8, FIG_W = 0.98, FOOT = 0.87;

const STYLE = 'High-end Chinese Xianxia Fantasy RPG character art, fantasy realistic 3D rendering, beautiful detailed face, luminous cinematic lighting with a bright clean rim light so the silhouette reads even at a small size, rich saturated colours, premium AAA fantasy game quality, ultra detailed';
const FRAME = 'Full-body game character sprite, one character only. The character stands upright on a long glowing flying sword (yujian sword flight): the flying sword lies horizontally under the feet, its tip pointing to the right. Seen from the side in a three-quarter view, the character faces and flies toward the RIGHT side of the picture. Robes, sleeves, hair and sash stream backward to the left in the wind. The whole body and the whole flying sword are inside the frame, centred, with a clear margin around them. Plain flat light grey studio background: no scenery, no ground, no clouds, no shadow on the background.';
const NEG = 'No text, no letters, no watermark, no logo, no border, no frame, no second character.';
const who = (g: 'f' | 'm', n: number) => {
  const l = TUSI_LOOKS[n];
  return g === 'f' ? `a beautiful young woman cultivator with a graceful figure, wearing ${l.robe}, ${l.f}` : `a handsome young man cultivator with a strong lean figure, wearing ${l.robe}, ${l.m}`;
};
const drawPrompt = (k: TusiKind, g: 'f' | 'm', n: number) => `${STYLE}. ${FRAME} The character: ${who(g, n)}. In the hands: ${k.weapon}. ${NEG}`;
const editPrompt = (k: TusiKind, g: 'f' | 'm', n: number) =>
  `Edit this image. Keep exactly the same art style, rendering, lighting, camera angle and distance, character size and framing; keep the same long glowing flying sword under the feet at the same size and place, and the same plain flat light grey background. The character still stands upright on the flying sword, facing and flying toward the RIGHT, robes and hair streaming back to the left. Change the character to ${who(g, n)}. Change what is in the hands to: ${k.weapon}. The whole body, the flying sword and what the hands hold stay inside the frame. ${NEG}`;

type Job = { key: string; k: TusiKind; g: 'f' | 'm'; n: number; from: string | null /* the picture it is an edit of; null: drawn from the prompt */ };
const ROOT_M = 'kiem_m_0', ROOT_F = 'kiem_f_0';
const jobOf = (k: TusiKind, g: 'f' | 'm', n: number): Job => {
  const key = `${k.id}_${g}_${n}`;
  return { key, k, g, n, from: key === ROOT_M ? null : key === ROOT_F ? ROOT_M : g === 'f' ? ROOT_F : ROOT_M };
};
const rawOf = (key: string) => path.join(RAW, `${key}.jpg`), cutOf = (key: string) => path.join(RAW, `${key}.png`), outOf = (key: string) => path.join(OUT, `${key}.webp`);

let manifest: Record<string, any> = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}
const save = () => { fs.mkdirSync(RAW, { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1)); };
let spent = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function download(url: string): Promise<Buffer> {
  for (let i = 0; ; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (i >= 3) throw e; await sleep(2000 * (i + 1)); }
  }
}
const uploads = new Map<string, Promise<string>>();
const upload = (file: string, type: string) => {
  let u = uploads.get(file);
  if (!u) { u = fal.storage.upload(new Blob([new Uint8Array(fs.readFileSync(file))], { type })); uploads.set(file, u); }
  return u;
};

// Cut-out -> the framed picture. The box of the figure counts only what is solid enough (a faint halo left by the cut-out does not).
async function frame(key: string) {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(cutOf(key)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 40) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error('nothing is left after the cut-out');
  const w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.min((BOX_H * FIG_H) / h, (BOX_W * FIG_W) / w);
  const fw = Math.max(1, Math.round(w * s)), fh = Math.max(1, Math.round(h * s));
  let fig = sharp(cutOf(key)).ensureAlpha().extract({ left: x0, top: y0, width: w, height: h }).resize(fw, fh, { kernel: 'lanczos3' });
  if (manifest[key]?.flip) fig = fig.flop();
  const left = Math.max(0, Math.min(BOX_W - fw, Math.round(BOX_W / 2 - fw / 2))), top = Math.max(0, Math.round(BOX_H * FOOT - fh));
  fs.mkdirSync(OUT, { recursive: true });
  await sharp({ create: { width: BOX_W, height: BOX_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await fig.png().toBuffer(), left, top }])
    .webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(outOf(key));
}

async function make(j: Job) {
  const cost = (j.from ? PRICE.edit : PRICE.draw) + PRICE.cut;
  if (spent + cost > maxUsd) { console.log(`skip ${j.key}: this run would pass ${maxUsd} USD`); return false; }
  if (j.from && !fs.existsSync(rawOf(j.from))) { console.log(`skip ${j.key}: ${j.from} is not drawn yet`); return false; }
  fs.mkdirSync(RAW, { recursive: true });
  const t0 = Date.now();
  console.log(`drawing ${j.key} ...`);
  const prompt = j.from ? editPrompt(j.k, j.g, j.n) : drawPrompt(j.k, j.g, j.n);
  const input: any = { prompt, aspect_ratio: '1:1', resolution: '1K', num_images: 1, output_format: 'jpeg', thinking_level: 'medium' };
  if (j.from) input.image_urls = [await upload(rawOf(j.from), 'image/jpeg')];
  const res: any = await fal.subscribe(j.from ? EDIT : DRAW, { input });
  const url = res.data?.images?.[0]?.url; if (!url) throw new Error('no image');
  fs.writeFileSync(rawOf(j.key), await download(url));
  uploads.delete(rawOf(j.key));
  spent += cost - PRICE.cut;
  const c: any = await fal.subscribe(CUT, { input: { image_url: await upload(rawOf(j.key), 'image/jpeg') } });
  const ci = c?.data?.image || c?.data?.images?.[0];
  if (!ci?.url) throw new Error('no image from the background removal');
  const png = await download(ci.url);
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('the cut-out is not a PNG (no alpha)');
  fs.writeFileSync(cutOf(j.key), png);
  spent += PRICE.cut;
  manifest[j.key] = { ...(manifest[j.key]?.flip ? { flip: true } : {}), model: j.from ? EDIT : DRAW, from: j.from, cut: CUT, requestId: res.requestId, usd: cost, date: new Date().toISOString(), prompt };
  await frame(j.key);
  manifest[j.key].bytes = fs.statSync(outOf(j.key)).size;
  save();
  console.log(`done ${j.key} in ${Math.round((Date.now() - t0) / 1000)} s, ${(manifest[j.key].bytes / 1024).toFixed(0)} KB (run total ${spent.toFixed(2)} USD)`);
  return true;
}

// lib/tusi-art.ts: how many pictures each kind and sex has, counted from 0 without a gap (the game picks among them)
function writeIndex() {
  const counts: Record<string, number> = {};
  for (const k of TUSI_KINDS) for (const g of ['f', 'm']) { let n = 0; while (fs.existsSync(outOf(`${k.id}_${g}_${n}`))) n++; if (n) counts[`${k.id}_${g}`] = n; }
  const body = `// Written by scripts/gen-tusi.ts: how many AI-drawn pictures each kind of cultivator has (public/art/tusi/<kind>_<g>_<n>.webp, n from 0). Do not edit by hand.\n`
    + `export const TUSI_ART: Record<string, number> = ${JSON.stringify(counts).replace(/,/g, ', ')};\nexport const TUSI_REV = '${Date.now().toString(36)}';\n`;
  fs.writeFileSync(INDEX, body);
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`lib/tusi-art.ts: ${n} pictures in ${Object.keys(counts).length} kinds and sexes`);
}

(async () => {
  // free work first: mirror, frame again
  if (flips.length || flag('--reframe')) {
    for (const key of flips) { if (!fs.existsSync(cutOf(key))) { console.log(`no cut-out of ${key}`); continue; } manifest[key] = { ...(manifest[key] || {}), flip: !manifest[key]?.flip }; }
    save();
    const keys = flag('--reframe') ? fs.readdirSync(RAW).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)) : flips;
    for (const key of keys) if (fs.existsSync(cutOf(key))) { await frame(key); console.log(`framed ${key}${manifest[key]?.flip ? ' (mirrored)' : ''}`); }
    writeIndex();
    return;
  }
  const kinds = TUSI_KINDS.filter((k) => !only.length || only.includes(k.id));
  const want: Job[] = [];
  for (const k of kinds) for (const g of sexes) for (let n = 0; n < variants; n++) want.push(jobOf(k, g, n));
  for (const key of redo) { const [id, g, n] = key.split('_'), k = TUSI_KINDS.find((x) => x.id === id); if (k && (g === 'f' || g === 'm') && !want.some((j) => j.key === key)) want.push(jobOf(k, g, Number(n) || 0)); }
  const missing = (j: Job) => redo.has(j.key) || flag('--force') || !fs.existsSync(outOf(j.key));
  let todo = want.filter(missing);
  // every picture is an edit of the first of its sex (and the first woman of the first man): those go first, also when only they are missing
  const has = (key: string) => todo.some((j) => j.key === key), drawn = (key: string) => fs.existsSync(rawOf(key));
  const wantF = has(ROOT_F) || (todo.some((j) => j.from === ROOT_F) && !drawn(ROOT_F));
  const wantM = has(ROOT_M) || ((wantF || todo.some((j) => j.from === ROOT_M)) && !drawn(ROOT_M));
  const roots = [...(wantM ? [jobOf(TUSI_KINDS[0], 'm', 0)] : []), ...(wantF ? [jobOf(TUSI_KINDS[0], 'f', 0)] : [])];
  todo = [...roots, ...todo.filter((j) => !roots.some((r) => r.key === j.key))];
  const price = todo.reduce((a, j) => a + (j.from ? PRICE.edit : PRICE.draw) + PRICE.cut, 0);
  console.log(`to draw: ${todo.length}, about ${price.toFixed(2)} USD (cap ${maxUsd})`);
  if (flag('--dry')) { todo.forEach((j) => console.log(' ', j.key, j.from ? `edit of ${j.from}` : 'from the prompt')); return; }
  if (!todo.length) { writeIndex(); return; }
  if (!process.env.FAL_KEY) { console.log('FAL_KEY is not set (.env.local)'); process.exit(1); }
  fal.config({ credentials: process.env.FAL_KEY });
  const fail = (j: Job, e: any) => console.log(`failed ${j.key}:`, e?.message || e, JSON.stringify(e?.body || '').slice(0, 300));
  for (const r of roots) { try { await make(r); } catch (e) { fail(r, e); } }
  const rest = todo.slice(roots.length);
  await Promise.all(Array.from({ length: lanes }, async (_, l) => { for (let i = l; i < rest.length; i += lanes) { try { await make(rest[i]); } catch (e) { fail(rest[i], e); } } }));
  writeIndex();
  const total = Object.values(manifest).reduce((a: number, m: any) => a + (m.usd || 0), 0);
  console.log(`DONE. this run ${spent.toFixed(2)} USD, all cultivator pictures so far ${total.toFixed(2)} USD. Look at them on /demo/tu-si`);
})();
