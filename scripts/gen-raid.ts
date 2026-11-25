// Draws the pictures and clips of the Phó Bản Dị Thú (lib/raid.ts BOSSES) once, into public/art/raid/<id>/:
//   bg.jpg    the empty lair, 9:16 (Nano Banana 2.1, 1K)                         about 0.05 USD
//   boss.jpg  the same lair with the creature in it (an EDIT of bg.jpg)          about 0.07 USD
//   loop.mp4  the creature alive in its lair, first frame = last frame (Kling 2.6 Pro, 5 s)   about 0.35 USD
//   ult.mp4   its great attack, starting from boss.jpg (Kling 2.6 Pro, 5 s)    about 0.35 USD
// The clips are made smaller with ffmpeg (FFMPEG=path, else `ffmpeg` on the PATH): 720 px wide, H.264, no sound, fast start, so a phone plays them at once.
// Safe to stop and run again: a file that exists is not drawn again (--force redraws). Every call and its price go to public/art/raid/_manifest.json.
//   npx tsx scripts/gen-raid.ts --dry                     list what is missing and the price
//   npx tsx scripts/gen-raid.ts --only bachho --step bg,boss
//   npx tsx scripts/gen-raid.ts --max-usd 8               stop before the spend of this run passes 8 USD
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fal } from '@fal-ai/client';
import { BOSSES, type Boss } from '../lib/raid';

const args = process.argv.slice(2);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const flag = (n: string) => args.includes(n);
const only = opt('--only').split(',').filter(Boolean);
const steps = (opt('--step') || 'bg,boss,loop,ult').split(',');
const maxUsd = Number(opt('--max-usd') || 9);
const ROOT = path.join(process.cwd(), 'public', 'art', 'raid');
const MANIFEST = path.join(ROOT, '_manifest.json');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PRICE = { bg: 0.05, boss: 0.07, loop: 0.35, ult: 0.35 } as const;
type Step = keyof typeof PRICE;

const CORE = 'High-end Chinese Xianxia Fantasy RPG art, fantasy realistic 3D rendering, luminous cinematic lighting, volumetric light rays, rich fantasy color palette, premium AAA fantasy game quality, ultra detailed 3D render';
const BEAST = 'fantasy realistic creature, hyper-realistic anatomy and musculature, ultra detailed fur, scales and feathers, majestic AAA game boss design, not a cartoon, not cute';
const NEG = 'No text, no letters, no watermark, no logo, no border, no people.';
const bgPrompt = (b: Boss) => `${CORE}, cinematic xianxia environment, epic boss arena. ${b.lair}. Tall vertical 9:16 composition seen from a low dramatic angle. The upper half has a clear open area in the middle where a giant creature could stand; the lower half is open air and space for a battle. No creatures, no animals. ${NEG}`;
const bossPrompt = (b: Boss) => `Edit this image. Add ${b.en} into the scene. It is the boss of the place: enormous and menacing, in the upper middle of the picture, centred horizontally, facing the viewer in a three-quarter front view, its whole body visible inside the frame, its head about one third from the top of the picture. ${BEAST}. Keep the rest of the scene exactly the same: the same background, lighting and camera. Keep the lower third of the picture clear of the creature. ${NEG}`;
const loopPrompt = (b: Boss) => `The giant creature stays on the same spot and is clearly alive and menacing during the whole clip: ${b.idleEn}. The mist, clouds and light particles of the background drift. At the end it settles back into exactly the pose it started from. The camera is completely static. The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design and colors unchanged. Cinematic fantasy realism, no cuts, no text, no people.`;
const ultPrompt = (b: Boss) => `${b.ultEn} Epic cinematic boss attack, dramatic and powerful, the energy rushes toward the viewer, slight camera shake. Keep the creature's design unchanged. Cinematic fantasy realism, no cuts, no text, no people.`;
const CLIP_NEG = 'blur, distort, low quality, text, watermark, people, humans, cartoon, morphing into another creature, cuts, scene change';

let manifest: Record<string, any> = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}
const save = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
let spent = 0;
const fileOf = (b: Boss, s: Step) => path.join(ROOT, b.id, s === 'loop' || s === 'ult' ? `${s}.mp4` : `${s}.jpg`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function download(url: string): Promise<Buffer> {
  for (let i = 0; ; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (i >= 3) throw e; await sleep(2000 * (i + 1)); }
  }
}
async function upload(file: string): Promise<string> {
  const buf = fs.readFileSync(file);
  return fal.storage.upload(new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }));
}
// Re-encode a clip: 720 px wide, H.264 high, CRF 26, no sound, moov atom first (streams before it is fully loaded).
function shrink(src: string, dst: string) {
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-an', '-vf', 'scale=720:-2:flags=lanczos', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', dst]);
}
// Pictures are kept at 720 x 1280, JPEG quality 84 (the stage is at most about 480 px wide on a screen).
async function shrinkJpg(buf: Buffer, dst: string) {
  const sharp = (await import('sharp')).default;
  await sharp(buf).resize({ width: 720, height: 1280, fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(dst);
}

async function run(b: Boss, s: Step) {
  const out = fileOf(b, s);
  if (!flag('--force') && fs.existsSync(out)) return;
  if (spent + PRICE[s] > maxUsd) { console.log(`skip ${b.id}/${s}: this run would pass ${maxUsd} USD`); return; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const key = `${b.id}/${s}`, t0 = Date.now();
  console.log(`drawing ${key} ...`);
  let res: any, prompt = '';
  if (s === 'bg') {
    prompt = bgPrompt(b);
    res = await fal.subscribe('google/nano-banana-2.1', { input: { prompt, aspect_ratio: '9:16', resolution: '1K', num_images: 1, output_format: 'jpeg', thinking_level: 'medium' } as any });
    const url = res.data?.images?.[0]?.url; if (!url) throw new Error('no image');
    await shrinkJpg(await download(url), out);
  } else if (s === 'boss') {
    const bg = fileOf(b, 'bg'); if (!fs.existsSync(bg)) { console.log(`skip ${key}: no bg yet`); return; }
    prompt = bossPrompt(b);
    res = await fal.subscribe('google/nano-banana-2.1/edit', { input: { prompt, image_urls: [await upload(bg)], aspect_ratio: '9:16', resolution: '1K', num_images: 1, output_format: 'jpeg', thinking_level: 'medium' } as any });
    const url = res.data?.images?.[0]?.url; if (!url) throw new Error('no image');
    await shrinkJpg(await download(url), out);
  } else {
    const pic = fileOf(b, 'boss'); if (!fs.existsSync(pic)) { console.log(`skip ${key}: no boss picture yet`); return; }
    const url = await upload(pic);
    prompt = s === 'loop' ? loopPrompt(b) : ultPrompt(b);
    const input: any = { prompt, start_image_url: url, duration: '5', negative_prompt: CLIP_NEG, generate_audio: false };
    if (s === 'loop') input.end_image_url = url;
    res = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', { input, logs: false });
    const vurl = res.data?.video?.url; if (!vurl) throw new Error('no video');
    const raw = out.replace('.mp4', '.raw.mp4');
    fs.writeFileSync(raw, await download(vurl));
    shrink(raw, out); fs.unlinkSync(raw);
  }
  spent += PRICE[s];
  manifest[key] = { model: s === 'bg' ? 'google/nano-banana-2.1' : s === 'boss' ? 'google/nano-banana-2.1/edit' : 'fal-ai/kling-video/v2.6/pro/image-to-video', requestId: res.requestId, usd: PRICE[s], date: new Date().toISOString(), prompt, bytes: fs.statSync(out).size };
  save();
  console.log(`done ${key} in ${Math.round((Date.now() - t0) / 1000)} s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB (run total ${spent.toFixed(2)} USD)`);
}

(async () => {
  const list = BOSSES.filter((b) => !only.length || only.includes(b.id));
  const todo = list.flatMap((b) => (steps as Step[]).filter((s) => s in PRICE && (flag('--force') || !fs.existsSync(fileOf(b, s)))).map((s) => ({ b, s })));
  console.log(`to draw: ${todo.length}, about ${todo.reduce((a, x) => a + PRICE[x.s], 0).toFixed(2)} USD (cap ${maxUsd})`);
  if (flag('--dry')) { todo.forEach((x) => console.log(' ', x.b.id, x.s)); return; }
  if (!process.env.FAL_KEY) { console.log('FAL_KEY is not set'); process.exit(1); }
  fal.config({ credentials: process.env.FAL_KEY });
  // pictures first (cheap, and every clip needs them); the clips of different creatures run two at a time
  for (const { b, s } of todo.filter((x) => x.s === 'bg' || x.s === 'boss')) { try { await run(b, s); } catch (e: any) { console.log(`failed ${b.id}/${s}:`, e?.message || e, JSON.stringify(e?.body || '').slice(0, 300)); } }
  const clips = todo.filter((x) => x.s === 'loop' || x.s === 'ult');
  const lanes = Number(opt('--lanes') || 2);
  await Promise.all(Array.from({ length: lanes }, async (_, k) => { for (let i = k; i < clips.length; i += lanes) { const { b, s } = clips[i]; try { await run(b, s); } catch (e: any) { console.log(`failed ${b.id}/${s}:`, e?.message || e, JSON.stringify(e?.body || '').slice(0, 300)); } } }));
  const total = Object.values(manifest).reduce((a: number, m: any) => a + (m.usd || 0), 0);
  console.log(`DONE. this run ${spent.toFixed(2)} USD, all raid art so far ${total.toFixed(2)} USD`);
})();
