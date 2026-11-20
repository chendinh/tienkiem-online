// Draws the pictures of Vạn Giới Tinh Đồ again with the image model and saves them straight into public/art/galaxy (the same files the game ships with).
// Run it where the disk can be written: on your own machine (`npm run dev` then /admin → Ảnh Tinh Hà, or `npm run gen:galaxy`), then commit the files.
// On Vercel the disk is read-only, so there the tool says so instead of drawing. Needs FAL_KEY.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ApiError } from './auth';
import { addImageCost } from '../llm';
import { falModels } from '../imagegen';
import { galaxyPrompt, mapPrompt, GX_ART_NAMES } from '../galaxyArt';

export type Sizes = '2k' | '1k';
export const GX_DIR = path.join(process.cwd(), 'public', 'art', 'galaxy');

export async function writable(): Promise<boolean> {
  if (process.env.VERCEL) return false;
  try { await fs.access(GX_DIR, fs.constants.W_OK); return true; } catch { return false; }
}
// when each file was last written (ms), for the previews
export async function stamps(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try { for (const f of await fs.readdir(GX_DIR)) if (f.endsWith('.webp')) out[f.replace(/\.webp$/, '')] = Math.round((await fs.stat(path.join(GX_DIR, f))).mtimeMs); } catch { /* no folder yet */ }
  return out;
}

const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };
const PRICE: Record<string, number> = { '1K': 0.07, '2K': 0.09, '4K': 0.17 };   // rounded up, same spirit as lib/imagegen.ts

// Draw one picture: name = 'map' or a galaxy id, size = '2k' (PC, wide) or '1k' (phone, tall). The file is replaced in place.
export async function draw(name: string, size: Sizes): Promise<{ cost: number; files: string[] }> {
  if (!GX_ART_NAMES.includes(name) || (size !== '2k' && size !== '1k')) throw new ApiError('E_BAD_REQUEST', 400);
  if (!process.env.FAL_KEY) throw new ApiError('E_NO_FAL', 503);
  if (!(await writable())) throw new ApiError('E_READONLY', 503);
  const portrait = size === '1k';
  const { fal } = await import('@fal-ai/client');
  const res = process.env.FAL_GALAXY_RES || (portrait ? '2K' : '4K');
  const gen = process.env.FAL_GALAXY_MODEL || 'google/nano-banana-2.1';
  const edit = process.env.FAL_GALAXY_EDIT_MODEL || falModels().outfit;
  const think = { thinking_level: process.env.FAL_THINKING || 'high' };
  const ratio = portrait ? '9:16' : '16:9';
  let model = gen, input: any;
  if (name === 'map') {
    // the chart on disk goes up as the picture to repaint, so the galaxies stay where the page's buttons are
    const png = await sharp(path.join(GX_DIR, `map_${size}.webp`)).png().toBuffer();
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
  try { await addImageCost(cost); } catch { /* no database on a bare checkout: the cost is only a ledger */ }

  const [w, h] = portrait ? [1080, 1920] : [2560, 1440];
  const files = [`${name}_${size}.webp`];
  await fs.writeFile(path.join(GX_DIR, files[0]), await sharp(raw).resize(w, h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).webp({ quality: portrait ? 86 : 90, effort: 5 }).toBuffer());
  if (name !== 'map' && size === '2k') {   // the round thumbnail of the dock is cut from the wide picture
    const { width = 1, height = 1 } = await sharp(raw).metadata();
    const s = Math.round(height * 0.9);
    files.push(`${name}_t.webp`);
    await fs.writeFile(path.join(GX_DIR, files[1]), await sharp(raw).extract({ left: Math.max(0, Math.round(width / 2 - s / 2)), top: Math.round(height * 0.05), width: Math.min(s, width), height: s }).resize(192, 192).webp({ quality: 84 }).toBuffer());
  }
  return { cost, files };
}
