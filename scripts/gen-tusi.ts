// Draws the cultivators of the stages (Phó Bản, Triển lãm, the result cards) with AI, once, into public/art/tusi/<kind>_<g>_<n>.webp. lib/tusi.ts says which kinds
// (one per môn of weapon, and one empty-handed) and which outfits; nothing else about a player shows.
// The character and the flying sword under its feet are drawn APART (drawn together, the swords came out crooked and broken), then put together here:
//   1. the flying sword, once, from a prompt, alone, seen from straight above (Nano Banana 2.1), its background removed, laid level (from the axis of the blade) with
//      its point to the right, and pressed into a board seen from a little above (its flat face up: what the feet stand on)
//                                                                                                                                   about 0.07 USD
//   2. the first man (the swordsman, outfit 0) from a prompt: standing upright in the air, feet together, NOTHING under the feet          about 0.05 USD
//   3. the first woman is an EDIT of him, every other picture an EDIT of the first of its sex: one style, camera, size and stance for all  about 0.07 USD each
//   4. each one's background is removed (Bria); it is put on the one flying sword (its soles on the blade, the same size for all) in a 480 x 360 box, the
//      sword's lowest point at the same height as the figure drawn in code, and saved as WebP with alpha (about 30-60 KB)                  about 0.02 USD each
// The pictures as drawn and as cut out are kept in data/tusi/ (not shipped), so putting them together again costs nothing. lib/tusi-art.ts (which pictures exist) is
// rewritten after every run: until a kind has pictures the game keeps the figure drawn in code for it. Safe to stop and run again: what exists is not drawn again.
// Pictures from the first way (the sword drawn with the character) are moved to data/tusi/old/ and drawn again.
//   npm run gen:tusi -- --dry                      list what is missing and the price
//   npm run gen:tusi -- --only kiem --variants 1   the sword, the swordsman and the swordswoman, to look at the style first (/demo/tu-si)
//   npm run gen:tusi                               everything missing (9 kinds x woman and man x 3 outfits)
//   npm run gen:tusi -- --redo cung_f_1,dao_m_0    draw these again (a bad one; redoing kiem_m_0 or kiem_f_0 does not redraw the others made from it)
//   npm run gen:tusi -- --redo sword               draw the flying sword again (every cultivator is put on the new one, free)
//   npm run gen:tusi -- --flip tieu_m_2            mirror one that faces left (free); --flip sword turns the sword end for end
//   npm run gen:tusi -- --reframe                  put every one together again (free: after changing the numbers below)
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
// 2: the character drawn alone and put on the one flying sword here. A picture made another way is drawn again.
const VER = 2;
// Putting together, in the 480 x 360 box (4:3 like the figure drawn in code): the character (head to soles) CHAR_H of the box tall, the same for all; the sword
// SWORD_L times that long, centred across, its lowest point at FOOT of the box's height; the feet FEET_AT of the way along it from the hilt, the soles SINK of the
// way down its face (the soles in the middle of the flat face, standing on it, not on an edge). What sticks out of the box (a long spear) makes the whole of it smaller.
// The sword is drawn from straight above (its whole flat face, which AI draws well) and turned into a board seen from a little above here: the face pressed to FLAT
// of its height, and the side of the blade (EDGE of its length thick, darker) showing under it.
const BOX_W = 480, BOX_H = 360, FOOT = 0.87, CHAR_H = 0.68, SWORD_L = 1.1, FEET_AT = 0.44, SINK = 0.5, MARGIN = 3, FLAT = 0.55, EDGE = 0.011;

const STYLE = 'High-end Chinese Xianxia Fantasy RPG character art, fantasy realistic 3D rendering, beautiful detailed face, luminous cinematic lighting with a bright clean rim light so the silhouette reads even at a small size, rich saturated colours, premium AAA fantasy game quality, ultra detailed';
const STANCE = 'standing upright in mid-air: legs straight and close together, both feet side by side at the same height as if standing on a narrow beam, the boots fully visible and the lowest point of the figure (the robe hem ends above the ankles)';
const FRAME = `Full-body game character sprite, one character only, ${STANCE}. Seen from the side in a three-quarter view, the character faces and moves toward the RIGHT side of the picture. Robes, sleeves, hair and sash stream backward to the left in the wind. NOTHING under the feet: no flying sword, no platform, no cloud, no ground, no shadow. The whole figure and what the hands hold are inside the frame, centred, with a clear margin around them. Plain flat light grey studio background, no scenery.`;
const NEG = 'No text, no letters, no watermark, no logo, no border, no frame.';
const who = (g: 'f' | 'm', n: number) => {
  const l = TUSI_LOOKS[n];
  return g === 'f' ? `a beautiful young woman cultivator with a graceful figure, wearing ${l.robe}, ${l.f}` : `a handsome young man cultivator with a strong lean figure, wearing ${l.robe}, ${l.m}`;
};
const drawPrompt = (k: TusiKind, g: 'f' | 'm', n: number) => `${STYLE}. ${FRAME} The character: ${who(g, n)}. In the hands: ${k.weapon}; it is held in the hands, never under the feet. ${NEG} No second character.`;
const editPrompt = (k: TusiKind, g: 'f' | 'm', n: number) =>
  `Edit this image. Keep exactly the same art style, rendering, lighting, camera angle and distance, character size and framing, the same stance (${STANCE}, nothing under the feet) and the same plain flat light grey background. The character faces and moves toward the RIGHT, robes and hair streaming back to the left. Change the character to ${who(g, n)}. Change what is in the hands to: ${k.weapon}; it is held in the hands, never under the feet. The whole figure and what the hands hold stay inside the frame. ${NEG} No second character.`;
const SWORD_PROMPT = 'High-end Chinese Xianxia Fantasy RPG item art, fantasy realistic 3D rendering, luminous cinematic lighting with a bright clean rim light, premium AAA fantasy game quality, ultra detailed. '
  + 'A single magical flying sword (a long straight Chinese jian with a broad blade), shown as a flat lay: it lies flat and is seen from directly above, so the whole broad flat face of the blade faces the camera; horizontal and straight across the picture, the hilt on the LEFT and the point on the RIGHT. '
  + 'A polished silver-white blade with a raised ridge along its middle and a fine pale blue luminous edge, a soft pale blue glow close around it, an ornate guard of gold and jade, a grip wrapped in dark blue silk, a small gold pommel. '
  + 'No tassel, no ribbon, no hand, no person, no stand, no scabbard, no motion trail, no sparks. The whole sword is inside the frame with a clear margin at both ends, centred. Plain flat light grey studio background, no shadow, no scenery. ' + NEG;

type Job = { key: string; k: TusiKind; g: 'f' | 'm'; n: number; from: string | null /* the picture it is an edit of; null: drawn from the prompt */ };
const ROOT_M = 'kiem_m_0', ROOT_F = 'kiem_f_0', SWORD = 'sword';
const jobOf = (k: TusiKind, g: 'f' | 'm', n: number): Job => {
  const key = `${k.id}_${g}_${n}`;
  return { key, k, g, n, from: key === ROOT_M ? null : key === ROOT_F ? ROOT_M : g === 'f' ? ROOT_F : ROOT_M };
};
const rawOf = (key: string) => path.join(RAW, `${key}.jpg`), cutOf = (key: string) => path.join(RAW, `${key}.png`), outOf = (key: string) => path.join(OUT, `${key}.webp`);
const LEVEL = path.join(RAW, 'sword_level.png'); // the sword laid level, point to the right, trimmed

let manifest: Record<string, any> = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}
const save = () => { fs.mkdirSync(RAW, { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1)); };
const cur = (key: string) => manifest[key]?.v === VER && fs.existsSync(cutOf(key));
const swordReady = () => cur(SWORD) && fs.existsSync(LEVEL) && manifest[SWORD]?.level;
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
const sharpOf = async () => (await import('sharp')).default;
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// The box of what is solid enough (a faint halo left by the cut-out does not count) in raw RGBA.
function solidBox(d: Buffer, W: number, H: number, min = 40) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] <= min) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };

// The sword as cut out -> laid level (turned by the axis of what is solid), the point to the right, trimmed; and where the blade's top and bottom are (in the middle
// of its length: the soles stand there). Which end is the hilt is guessed once, for a sword newly drawn: the grip (dark silk, the prompt asks for it) is darker
// than the silver blade; failing that, the guard (the narrow widest part across) is near the hilt; failing that, the point is the end that thins out. The guess
// is kept after that; --flip sword turns it round.
async function levelSword() {
  const sharp = await sharpOf();
  const a = await sharp(cutOf(SWORD)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = a.info.width, H = a.info.height, d = a.data;
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) { n++; sx += x; sy += y; }
  if (!n) throw new Error('nothing is left of the sword after the cut-out');
  const mx = sx / n, my = sy / n;
  let xx = 0, yy = 0, xy = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) { const dx = x - mx, dy = y - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
  const deg = (0.5 * Math.atan2(2 * xy, xx - yy) * 180) / Math.PI;
  if (Math.abs(deg) > 25) console.log(`the sword was drawn ${deg.toFixed(0)} degrees off level: look at it (/demo/tu-si), --redo sword if it is wrong`);
  const r = await sharp(cutOf(SWORD)).ensureAlpha().rotate(-deg, { background: CLEAR }).raw().toBuffer({ resolveWithObject: true });
  const RW = r.info.width, RH = r.info.height, rd = r.data;
  const b = solidBox(rd, RW, RH);
  if (!b) throw new Error('nothing is left of the sword after laying it level');
  // how wide across it is, column by column (what is solid, not the glow), smoothed
  const across: number[] = [];
  for (let x = b.x0; x <= b.x1; x++) {
    let t = -1, u = -1;
    for (let y = b.y0; y <= b.y1; y++) if (rd[(y * RW + x) * 4 + 3] > 160) { if (t < 0) t = y; u = y; }
    across.push(t < 0 ? 0 : u - t + 1);
  }
  const rad = Math.max(1, Math.round(b.w * 0.006));
  const sm = across.map((_, i) => { let a = 0, c = 0; for (let j = Math.max(0, i - rad); j <= Math.min(b.w - 1, i + rad); j++) { a += across[j]; c++; } return a / c; });
  let gi = 0;
  sm.forEach((v, i) => { if (v > sm[gi]) gi = i; });
  const mid = median(sm.filter((v) => v > 0)) || 1, e = Math.max(3, Math.round(b.w * 0.06));
  const avg = (a: number[]) => a.reduce((p, q) => p + q, 0) / Math.max(1, a.length);
  // how bright the solid part is at each end (15% of the length)
  const lum = (left: boolean) => {
    let t = 0, n = 0;
    const w = Math.max(2, Math.round(b.w * 0.15));
    for (let i = 0; i < w; i++) {
      const x = left ? b.x0 + i : b.x1 - i;
      for (let y = b.y0; y <= b.y1; y++) { const o = (y * RW + x) * 4; if (rd[o + 3] > 160) { t += 0.2126 * rd[o] + 0.7152 * rd[o + 1] + 0.0722 * rd[o + 2]; n++; } }
    }
    return n ? t / n : 0;
  };
  const lL = lum(true), lR = lum(false);
  let peak = 0;
  for (let i = Math.max(0, gi - Math.round(b.w * 0.08)); i <= Math.min(b.w - 1, gi + Math.round(b.w * 0.08)); i++) if (sm[i] > (sm[gi] + mid) / 2) peak++;
  const guard = sm[gi] >= mid * 1.6 && peak < b.w * 0.05;
  const by = Math.abs(lL - lR) > 25 ? 'the dark grip' : guard ? 'the guard' : 'the thin point';
  const hiltRight = by === 'the dark grip' ? lR < lL : guard ? gi > b.w / 2 : avg(sm.slice(b.w - e)) > avg(sm.slice(0, e));
  const prev = manifest[SWORD]?.level;
  const flip = typeof prev?.turned === 'boolean' ? prev.turned : hiltRight;
  const tops: number[] = [], bots: number[] = [];
  for (let x = b.x0 + Math.round(b.w * 0.3); x <= b.x0 + Math.round(b.w * 0.7); x++) {
    let t = -1, u = -1;
    for (let y = b.y0; y <= b.y1; y++) if (rd[(y * RW + x) * 4 + 3] > 160) { if (t < 0) t = y; u = y; }
    if (t >= 0) { tops.push(t - b.y0); bots.push(u - b.y0); }
  }
  const top = tops.length ? median(tops) : Math.round(b.h * 0.35), bot = bots.length ? Math.max(top + 1, median(bots)) : Math.round(b.h * 0.65);
  let img = sharp(rd, { raw: { width: RW, height: RH, channels: 4 } }).extract({ left: b.x0, top: b.y0, width: b.w, height: b.h });
  if (flip) img = img.flop();
  // a board seen from a little above: the face pressed down, the side of the blade showing under it
  const fh = Math.max(2, Math.round(b.h * FLAT)), edge = Math.max(2, Math.round(b.w * EDGE));
  const face = await img.resize(b.w, fh, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const side = await sharp(face).modulate({ brightness: 0.4 }).png().toBuffer();
  await sharp({ create: { width: b.w, height: fh + edge, channels: 4, background: CLEAR } })
    .composite([{ input: side, left: 0, top: edge }, { input: side, left: 0, top: Math.round(edge / 2) }, { input: face, left: 0, top: 0 }])
    .png().toFile(LEVEL);
  manifest[SWORD] = { ...manifest[SWORD], level: { deg: +deg.toFixed(2), turned: flip, w: b.w, h: fh + edge, top: Math.round(top * FLAT), bot: Math.max(Math.round(top * FLAT) + 1, Math.round(bot * FLAT)) } };
  save();
  const how = typeof prev?.turned === 'boolean' ? 'as before' : `by ${by}`;
  console.log(`sword laid level: turned ${deg.toFixed(1)} degrees${flip ? ', end for end' : ''} (${how}), ${b.w} x ${fh + edge} as a board`);
}

// A character as cut out + the sword -> the picture of the game.
async function frame(key: string) {
  if (!swordReady()) throw new Error('the flying sword is not drawn yet');
  const sharp = await sharpOf();
  const sw = manifest[SWORD].level as { w: number; h: number; top: number; bot: number };
  const { data, info } = await sharp(cutOf(key)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = solidBox(data, info.width, info.height);
  if (!b) throw new Error('nothing is left after the cut-out');
  // the feet: the middle of what is solid in the lowest rows
  const band = Math.max(2, Math.round(b.h * 0.03));
  let fsum = 0, fn = 0;
  for (let y = b.y1 - band + 1; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (data[(y * info.width + x) * 4 + 3] > 40) { fsum += x; fn++; }
  const flip = !!manifest[key]?.flip;
  let fx = (fn ? fsum / fn : (b.x0 + b.x1) / 2) - b.x0;
  if (flip) fx = b.w - 1 - fx;
  // at full size, from the anchor (the middle of the box across, the sword's lowest point down)
  const s = (BOX_H * CHAR_H) / b.h, L = SWORD_L * BOX_H * CHAR_H, ss = L / sw.w, sH = sw.h * ss;
  const bladeTop = -sH + sw.top * ss, foot = bladeTop + SINK * (sw.bot - sw.top) * ss;
  const cx0 = -L / 2 + FEET_AT * L - fx * s, cy0 = foot - b.h * s;
  const minX = Math.min(-L / 2, cx0), maxX = Math.max(L / 2, cx0 + b.w * s), minY = Math.min(-sH, cy0);
  const ax = BOX_W / 2, ay = BOX_H * FOOT;
  let k = 1;
  if (ax + minX < MARGIN) k = Math.min(k, (ax - MARGIN) / -minX);
  if (ax + maxX > BOX_W - MARGIN) k = Math.min(k, (BOX_W - MARGIN - ax) / maxX);
  if (ay + minY < MARGIN) k = Math.min(k, (ay - MARGIN) / -minY);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const swW = Math.max(1, Math.round(L * k)), swH = Math.max(1, Math.round(sH * k));
  const fw = Math.max(1, Math.round(b.w * s * k)), fh = Math.max(1, Math.round(b.h * s * k));
  const swLeft = clamp(Math.round(ax - swW / 2), 0, BOX_W - swW), swTop = clamp(Math.round(ay - swH), 0, BOX_H - swH);
  const left = clamp(Math.round(ax + cx0 * k), 0, BOX_W - fw), top = clamp(Math.round(ay + foot * k - fh), 0, BOX_H - fh);
  let fig = sharp(cutOf(key)).ensureAlpha().extract({ left: b.x0, top: b.y0, width: b.w, height: b.h }).resize(fw, fh, { kernel: 'lanczos3' });
  if (flip) fig = fig.flop();
  const blade = await sharp(LEVEL).resize(swW, swH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  fs.mkdirSync(OUT, { recursive: true });
  await sharp({ create: { width: BOX_W, height: BOX_H, channels: 4, background: CLEAR } })
    .composite([{ input: blade, left: swLeft, top: swTop }, { input: await fig.png().toBuffer(), left, top }])
    .webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(outOf(key));
  manifest[key].bytes = fs.statSync(outOf(key)).size;
}

async function cutOut(key: string) {
  const c: any = await fal.subscribe(CUT, { input: { image_url: await upload(rawOf(key), 'image/jpeg') } });
  const ci = c?.data?.image || c?.data?.images?.[0];
  if (!ci?.url) throw new Error('no image from the background removal');
  const png = await download(ci.url);
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('the cut-out is not a PNG (no alpha)');
  fs.writeFileSync(cutOf(key), png);
  spent += PRICE.cut;
}

async function makeSword() {
  const cost = PRICE.draw + PRICE.cut;
  if (spent + cost > maxUsd) { console.log(`skip the sword: this run would pass ${maxUsd} USD`); return false; }
  fs.mkdirSync(RAW, { recursive: true });
  console.log('drawing the flying sword ...');
  const input: any = { prompt: SWORD_PROMPT, aspect_ratio: '16:9', resolution: '1K', num_images: 1, output_format: 'jpeg', thinking_level: 'medium' };
  let res: any;
  try { res = await fal.subscribe(DRAW, { input }); }
  catch { input.aspect_ratio = '1:1'; res = await fal.subscribe(DRAW, { input }); }
  const url = res.data?.images?.[0]?.url; if (!url) throw new Error('no image');
  fs.writeFileSync(rawOf(SWORD), await download(url));
  uploads.delete(rawOf(SWORD));
  spent += PRICE.draw;
  await cutOut(SWORD);
  manifest[SWORD] = { v: VER, model: DRAW, cut: CUT, requestId: res.requestId, usd: cost, date: new Date().toISOString(), prompt: SWORD_PROMPT };
  save();
  await levelSword();
  return true;
}

async function make(j: Job) {
  const cost = (j.from ? PRICE.edit : PRICE.draw) + PRICE.cut;
  if (spent + cost > maxUsd) { console.log(`skip ${j.key}: this run would pass ${maxUsd} USD`); return false; }
  if (j.from && !cur(j.from)) { console.log(`skip ${j.key}: ${j.from} is not drawn yet`); return false; }
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
  await cutOut(j.key);
  manifest[j.key] = { v: VER, ...(manifest[j.key]?.flip ? { flip: true } : {}), model: j.from ? EDIT : DRAW, from: j.from, cut: CUT, requestId: res.requestId, usd: cost, date: new Date().toISOString(), prompt };
  if (swordReady()) await frame(j.key);
  save();
  const kb = manifest[j.key].bytes ? `, ${(manifest[j.key].bytes / 1024).toFixed(0)} KB` : ' (put on the sword once it is drawn)';
  console.log(`done ${j.key} in ${Math.round((Date.now() - t0) / 1000)} s${kb} (run total ${spent.toFixed(2)} USD)`);
  return true;
}

// Pictures of the first way (the sword drawn with the character) leave the game; what was drawn is kept in data/tusi/old/.
function retireOld() {
  const old = path.join(RAW, 'old'), keep = (key: string) => key === 'sword_level' || manifest[key]?.v === VER;
  let n = 0;
  if (fs.existsSync(RAW)) for (const f of fs.readdirSync(RAW)) {
    const m = f.match(/^(.+)\.(jpg|png)$/);
    if (!m || keep(m[1])) continue;
    fs.mkdirSync(old, { recursive: true }); fs.renameSync(path.join(RAW, f), path.join(old, f)); n++;
  }
  if (fs.existsSync(OUT)) for (const f of fs.readdirSync(OUT)) if (f.endsWith('.webp') && !keep(f.slice(0, -5))) fs.unlinkSync(path.join(OUT, f));
  const gone = Object.keys(manifest).filter((key) => !keep(key));
  if (gone.length) {
    const om = path.join(old, '_manifest.json');
    let prev: Record<string, any> = {};
    try { prev = JSON.parse(fs.readFileSync(om, 'utf8')); } catch {}
    for (const key of gone) { prev[key] = manifest[key]; delete manifest[key]; }
    fs.mkdirSync(old, { recursive: true }); fs.writeFileSync(om, JSON.stringify(prev, null, 1)); save();
  }
  if (n) console.log(`${n} files of the first way (sword drawn with the character) moved to data/tusi/old/, out of the game`);
}

// lib/tusi-art.ts: how many pictures each kind and sex has, counted from 0 without a gap (the game picks among them)
function writeIndex() {
  const counts: Record<string, number> = {};
  for (const k of TUSI_KINDS) for (const g of ['f', 'm']) {
    let n = 0;
    while (manifest[`${k.id}_${g}_${n}`]?.v === VER && fs.existsSync(outOf(`${k.id}_${g}_${n}`))) n++;
    if (n) counts[`${k.id}_${g}`] = n;
  }
  const body = `// Written by scripts/gen-tusi.ts: how many AI-drawn pictures each kind of cultivator has (public/art/tusi/<kind>_<g>_<n>.webp, n from 0). Do not edit by hand.\n`
    + `export const TUSI_ART: Record<string, number> = ${JSON.stringify(counts).replace(/,/g, ', ')};\nexport const TUSI_REV = '${Date.now().toString(36)}';\n`;
  fs.writeFileSync(INDEX, body);
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`lib/tusi-art.ts: ${n} pictures in ${Object.keys(counts).length} kinds and sexes`);
}

// Every character drawn this way put on the sword again (all, or only those not put together yet).
async function frameAll(all: boolean) {
  if (!swordReady()) { if (Object.keys(manifest).some((key) => key !== SWORD && cur(key))) console.log('the flying sword is not drawn yet: the cultivators wait for it'); return; }
  for (const key of Object.keys(manifest)) {
    if (key === SWORD || !cur(key) || (!all && fs.existsSync(outOf(key)))) continue;
    try { await frame(key); console.log(`put together ${key}${manifest[key]?.flip ? ' (mirrored)' : ''}`); } catch (e: any) { console.log(`failed ${key}:`, e?.message || e); }
  }
  save();
}

(async () => {
  const stale = Object.keys(manifest).filter((key) => manifest[key]?.v !== VER).length;
  if (!flag('--dry')) retireOld();
  // free work first: mirror, lay the sword level again, put together again
  if (flips.length || flag('--reframe')) {
    let all = flag('--reframe');
    for (const key of flips) {
      if (!cur(key)) { console.log(`no cut-out of ${key}`); continue; }
      if (key === SWORD) {
        if (!manifest[SWORD].level) await levelSword();
        manifest[SWORD].level.turned = !manifest[SWORD].level.turned;
        all = true;
        continue;
      }
      manifest[key] = { ...manifest[key], flip: !manifest[key].flip };
    }
    save();
    if (cur(SWORD) && (all || !fs.existsSync(LEVEL))) await levelSword();
    if (all) await frameAll(true);
    else for (const key of flips) if (key !== SWORD && cur(key) && swordReady()) { await frame(key); console.log(`put together ${key}${manifest[key]?.flip ? ' (mirrored)' : ''}`); }
    save();
    writeIndex();
    return;
  }
  const kinds = TUSI_KINDS.filter((k) => !only.length || only.includes(k.id));
  const want: Job[] = [];
  for (const k of kinds) for (const g of sexes) for (let n = 0; n < variants; n++) want.push(jobOf(k, g, n));
  for (const key of redo) { const [id, g, n] = key.split('_'), k = TUSI_KINDS.find((x) => x.id === id); if (k && (g === 'f' || g === 'm') && !want.some((j) => j.key === key)) want.push(jobOf(k, g, Number(n) || 0)); }
  const missing = (j: Job) => redo.has(j.key) || flag('--force') || !cur(j.key);
  let todo = want.filter(missing);
  // every picture is an edit of the first of its sex (and the first woman of the first man): those go first, also when only they are missing
  const has = (key: string) => todo.some((j) => j.key === key);
  const wantF = has(ROOT_F) || (todo.some((j) => j.from === ROOT_F) && !cur(ROOT_F));
  const wantM = has(ROOT_M) || ((wantF || todo.some((j) => j.from === ROOT_M)) && !cur(ROOT_M));
  const roots = [...(wantM ? [jobOf(TUSI_KINDS[0], 'm', 0)] : []), ...(wantF ? [jobOf(TUSI_KINDS[0], 'f', 0)] : [])];
  todo = [...roots, ...todo.filter((j) => !roots.some((r) => r.key === j.key))];
  const wantSword = redo.has(SWORD) || flag('--force') || !cur(SWORD);
  const price = todo.reduce((a, j) => a + (j.from ? PRICE.edit : PRICE.draw) + PRICE.cut, 0) + (wantSword ? PRICE.draw + PRICE.cut : 0);
  console.log(`to draw: ${wantSword ? 'the flying sword + ' : ''}${todo.length} cultivators, about ${price.toFixed(2)} USD (cap ${maxUsd})`);
  if (stale) console.log(`${stale} pictures of the first way (sword drawn with the character) ${flag('--dry') ? 'will be' : 'were'} moved to data/tusi/old/ and drawn again`);
  if (flag('--dry')) { if (wantSword) console.log('  sword from the prompt'); todo.forEach((j) => console.log(' ', j.key, j.from ? `edit of ${j.from}` : 'from the prompt')); return; }
  if (!todo.length && !wantSword) { await frameAll(false); writeIndex(); return; }
  if (!process.env.FAL_KEY) { console.log('FAL_KEY is not set (.env.local)'); process.exit(1); }
  fal.config({ credentials: process.env.FAL_KEY });
  const fail = (what: string, e: any) => console.log(`failed ${what}:`, e?.message || e, JSON.stringify(e?.body || '').slice(0, 300));
  let newSword = false;
  if (wantSword) { try { newSword = await makeSword(); } catch (e) { fail('the sword', e); } }
  for (const r of roots) { try { await make(r); } catch (e) { fail(r.key, e); } }
  const rest = todo.slice(roots.length);
  await Promise.all(Array.from({ length: lanes }, async (_, l) => { for (let i = l; i < rest.length; i += lanes) { try { await make(rest[i]); } catch (e) { fail(rest[i].key, e); } } }));
  await frameAll(newSword);
  writeIndex();
  const total = Object.values(manifest).reduce((a: number, m: any) => a + (m.usd || 0), 0);
  console.log(`DONE. this run ${spent.toFixed(2)} USD, the cultivator pictures in the game so far ${total.toFixed(2)} USD. Look at them on /demo/tu-si`);
})();
