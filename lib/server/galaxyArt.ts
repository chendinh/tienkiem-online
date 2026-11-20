// The owner's tool to redraw the pictures of Vạn Giới Tinh Đồ with the image model (/admin → Ảnh Tinh Hà).
// A picture is drawn big (PC: 2560 wide, or a phone: 1080x1920) and saved in Vercel Blob under a new address each time (no browser keeps an old copy); the page reads the list of
// addresses from /api/galaxy and falls back to the pictures that ship with the game. Needs FAL_KEY and BLOB_READ_WRITE_TOKEN.
import sharp from 'sharp';
import { query } from './db';
import { blobOn, putBlob } from './blob';
import { ApiError } from './auth';
import { addImageCost } from '../llm';
import { falModels } from '../imagegen';
import { galaxyPrompt, mapPrompt, GX_ART_NAMES } from '../galaxyArt';

const KEY = 'galaxy.art';
export type Sizes = '2k' | '1k';
export type Manifest = Record<string, string>;   // "<name>_<2k|1k|t>" -> url

export async function manifest(): Promise<Manifest> {
  try { return (await query<{ v: Manifest }>(`SELECT value AS v FROM kv WHERE key = $1`, [KEY])).rows[0]?.v || {}; } catch { return {}; }
}
async function save(m: Manifest) {
  await query(`INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`, [KEY, JSON.stringify(m)]);
}
export async function reset(name: string) {
  if (!GX_ART_NAMES.includes(name)) throw new ApiError('E_BAD_REQUEST', 400);
  const m = await manifest();
  for (const k of Object.keys(m)) if (k.startsWith(`${name}_`)) delete m[k];
  await save(m);
}

const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };
const PRICE: Record<string, number> = { '1K': 0.07, '2K': 0.09, '4K': 0.17 };   // rounded up, same spirit as lib/imagegen.ts

// Draw one picture: name = 'map' or a galaxy id, size = '2k' (PC, wide) or '1k' (phone, tall). Returns the new addresses.
export async function draw(name: string, size: Sizes, origin: string): Promise<{ urls: Manifest; cost: number }> {
  if (!GX_ART_NAMES.includes(name) || (size !== '2k' && size !== '1k')) throw new ApiError('E_BAD_REQUEST', 400);
  if (!process.env.FAL_KEY) throw new ApiError('E_NO_FAL', 503);
  if (!blobOn()) throw new ApiError('E_NO_BLOB', 503);
  const portrait = size === '1k';
  const { fal } = await import('@fal-ai/client');
  const res = process.env.FAL_GALAXY_RES || (portrait ? '2K' : '4K');
  const gen = process.env.FAL_GALAXY_MODEL || 'google/nano-banana-2.1';
  const edit = process.env.FAL_GALAXY_EDIT_MODEL || falModels().outfit;
  const think = { thinking_level: process.env.FAL_THINKING || 'high' };
  const ratio = portrait ? '9:16' : '16:9';
  let model = gen, input: any;
  if (name === 'map') {
    // the bundled chart goes up as the picture to repaint
    const src = await fetch(`${origin}/art/galaxy/map_${size}.webp`, { signal: AbortSignal.timeout(30000) });
    if (!src.ok) throw new Error('bundled chart not found');
    const png = await sharp(Buffer.from(await src.arrayBuffer())).png().toBuffer();
    const url = await fal.storage.upload(new Blob([new Uint8Array(png)], { type: 'image/png' }));
    falHost(url);
    model = edit;
    input = { prompt: mapPrompt(portrait), image_urls: [url], aspect_ratio: ratio, resolution: res, num_images: 1, output_format: 'png', ...(/nano-banana-2\.1/.test(model) ? think : {}) };
  } else {
    input = { prompt: galaxyPrompt(name, portrait), aspect_ratio: ratio, resolution: res, num_images: 1, output_format: 'png', ...(/nano-banana-2\.1/.test(model) ? think : {}) };
  }
  const out: any = await fal.subscribe(model, { input });
  const img = out?.data?.images?.[0];
  if (!img?.url) throw new Error('fal: no image in result');
  falHost(img.url);
  const r = await fetch(img.url, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error('fal download ' + r.status);
  const raw = Buffer.from(await r.arrayBuffer());
  const cost = PRICE[res] ?? 0.17;
  await addImageCost(cost);

  const [w, h] = portrait ? [1080, 1920] : [2560, 1440];
  const main = await sharp(raw).resize(w, h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).webp({ quality: portrait ? 86 : 90, effort: 5 }).toBuffer();
  const stamp = Date.now().toString(36);
  const m = await manifest();
  const put = await putBlob(`galaxy/${name}_${size}_${stamp}.webp`, main, 'image/webp');
  m[`${name}_${size}`] = put.url;
  if (name !== 'map' && size === '2k') {   // the round thumbnail of the dock is cut from the wide picture
    const t = await sharp(raw).extract(await cropBox(raw)).resize(192, 192).webp({ quality: 84 }).toBuffer();
    m[`${name}_t`] = (await putBlob(`galaxy/${name}_t_${stamp}.webp`, t, 'image/webp')).url;
  }
  await save(m);
  return { urls: m, cost };
}
async function cropBox(raw: Buffer) {
  const { width = 1, height = 1 } = await sharp(raw).metadata();
  const s = Math.round(height * 0.9);
  return { left: Math.max(0, Math.round(width / 2 - s / 2)), top: Math.round(height * 0.05), width: Math.min(s, width), height: s };
}
