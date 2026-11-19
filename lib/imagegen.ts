import path from 'node:path';
import crypto from 'node:crypto';
import { buildPlan, itemObject, STYLE_VERSION, type Plan } from './imageprompt';
import * as C from './content';
import { ask, llmEnabled, parseJson, imageBudget, addImageCost } from './llm';
import { hasImage, getImage, putImage, claimJob, releaseJobs } from './server/images';
import { keyOfSpec, indexImage, lookupKey, wantImage, dropWanted } from './server/imageindex';
import { falBalance } from './server/falbalance';

// Server-side image service: one art direction, a shared picture cache, a small priority queue, spend caps.
// Subjects that must stay identical (outfit changes, mutated monsters) are drawn by EDITING a reference image.
// Generated pictures are kept in the images table (lib/server/images.ts), with the JSON that describes each one next to it.
// The id (a hash of everything that went into the picture) is all a saved game remembers, so /api/img/<id> never has to know where it is kept.
// GEN_ROOT is the old data/gen folder: only the scripts that move old files (gen:organize, db:migrate) still read it.
export const GEN_ROOT = path.join(process.cwd(), 'data', 'gen');
export const GEN_KINDS = ['avatar', 'pose', 'outfit', 'item', 'monster', 'place', 'prop', 'label'] as const;
export const GEN_OTHER = 'other';   // a kind this code does not know, and pictures whose description file is missing
export const kindFolder = (kind: unknown) => ((GEN_KINDS as readonly string[]).includes(kind as string) ? (kind as string) : GEN_OTHER);
// Item icons are the biggest group (hundreds), so they are split again by the slot they are worn in: item/Weapon, item/Robe ...
export const ITEM_MISC = 'Misc';   // not worn: herbs, pills, contracts, talismans sold in the market
let phrases: [string, string][] | null = null;   // "what the prompt says the object is" -> slot, longest phrase first so a short name never hides a longer one
function slotFromPrompt(prompt: unknown): string | null {
  if (typeof prompt !== 'string') return null;
  if (!phrases) phrases = C.SLOTS.flatMap((s) => [...(C.SLOT_BASE[s] || []), ''].map((b) => [itemObject(s, b), s] as [string, string])).sort((a, b) => b[0].length - a[0].length);
  const at = prompt.indexOf('inventory icon of a single ');
  if (at < 0) return null;
  const rest = prompt.slice(at + 'inventory icon of a single '.length);
  return phrases.find(([ph]) => rest.startsWith(ph + ','))?.[1] || null;
}
// The folder (relative to data/gen) a picture belongs in, from its description: { kind, spec?, prompt }.
export function folderFor(meta: { kind?: unknown; spec?: any; prompt?: unknown } | null | undefined): string {
  const k = kindFolder(meta?.kind);
  if (k !== 'item') return k;
  const s = meta?.spec?.slot, slot = typeof s === 'string' && C.SLOTS.includes(s) ? s : slotFromPrompt(meta?.prompt);
  const misc = typeof meta?.prompt === 'string' && meta.prompt.includes('inventory icon of ');
  return path.join('item', slot || (misc ? ITEM_MISC : GEN_OTHER));
}
type Provider = 'pollinations' | 'cloudflare' | 'fal' | 'together' | 'openai' | 'off';
interface Job extends Plan { id: string; t: number; seen: number; attempt: number; refIds?: string[]; spec?: any }
interface Store { locked?: { until: number; reason: string }; queue: Job[]; running: number; inflight: Set<string>; failed: Map<string, number>; started: { t: number; item: boolean }[]; lastStart: number; timer: any }
const g = globalThis as any;
const S: Store = g.__tutienImg || (g.__tutienImg = { queue: [], running: 0, inflight: new Set(), failed: new Map(), started: [], lastStart: 0, timer: null });
// Bump when prompt wording changes: drops queued jobs built from the old wording.
const PROMPT_VERSION = 17;
if (g.__tutienImgVer !== PROMPT_VERSION) { S.queue.length = 0; S.inflight.clear(); S.failed.clear(); S.started = []; S.locked = undefined; g.__tutienImgVer = PROMPT_VERSION; }

export function provider(): { name: Provider; enabled: boolean; concurrency: number; minIntervalMs: number; crop: number; paid: boolean } {
  const e = process.env;
  let name = (e.IMAGE_PROVIDER || '') as Provider;
  if (!name) name = e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_API_TOKEN ? 'cloudflare' : e.FAL_KEY ? 'fal' : e.TOGETHER_API_KEY ? 'together' : e.OPENAI_API_KEY ? 'openai' : 'pollinations';
  if (name === 'off') return { name, enabled: false, concurrency: 0, minIntervalMs: 0, crop: 0, paid: false };
  if (name === 'pollinations') return { name, enabled: true, concurrency: 1, minIntervalMs: 46000, crop: 0.07, paid: false };
  return { name, enabled: true, concurrency: name === 'fal' ? 1 : name === 'openai' ? 2 : 3, minIntervalMs: 0, crop: 0, paid: name !== 'cloudflare' };
}
// t2i draws new pictures, edit changes ONE picture (monster variants), item draws the small icons, outfit redraws the character
// from its base picture plus the icon of every worn item (needs a model that accepts several pictures: `image_urls`).
export const falModels = () => ({ t2i: process.env.FAL_MODEL || 'fal-ai/flux/dev', edit: process.env.FAL_EDIT_MODEL || 'fal-ai/flux-pro/kontext', item: process.env.FAL_ITEM_MODEL || 'fal-ai/flux/schnell', outfit: process.env.FAL_OUTFIT_MODEL || 'google/nano-banana-2.1/edit', outfitRes: process.env.FAL_OUTFIT_RES || '1K', avatar: process.env.FAL_AVATAR_MODEL || 'google/nano-banana-2.1', avatarRes: process.env.FAL_AVATAR_RES || '1K', creature: process.env.FAL_CREATURE_MODEL || 'google/nano-banana-2.1', creatureRes: process.env.FAL_CREATURE_RES || '1K' });
// Cache key part: item icons depend only on the icon model, outfits and standing poses (both edits of the character's picture) only on the outfit model, everything else on the t2i and edit models.
const modelTag = (kind: string) => { const m = falModels(); return JSON.stringify(kind === 'item' ? { item: m.item } : kind === 'outfit' || kind === 'pose' ? { outfit: m.outfit, res: m.outfitRes } : kind === 'avatar' ? { avatar: m.avatar, res: m.avatarRes } : kind === 'monster' || kind === 'place' || kind === 'label' ? { creature: m.creature, res: m.creatureRes, edit: m.edit } : { t2i: m.t2i, edit: m.edit }); };
// Prices as published on fal.ai (USD). Per-megapixel prices are rounded up to whole megapixels, so the ledger errs high.
// The Nano Banana 2 / 2.1 and FLUX.2 pro entries are rounded-up estimates: check fal.ai before using them as FAL_OUTFIT_MODEL.
const FAL_FLAT: Record<string, number> = { 'fal-ai/flux-pro/kontext': 0.04, 'fal-ai/nano-banana/edit': 0.04, 'fal-ai/nano-banana-pro/edit': 0.15, 'fal-ai/nano-banana-2/edit': 0.08, 'google/nano-banana-2.1/edit': 0.07, 'fal-ai/flux-2-pro/edit': 0.08 };
const FAL_MP: Record<string, number> = { 'fal-ai/flux/dev': 0.025, 'fal-ai/flux/schnell': 0.003, 'fal-ai/flux-kontext/dev': 0.025 };
// Nano Banana 2.1 is billed per token (about 0.04 / 0.06 / 0.13 USD for a 1K / 2K / 4K picture, plus about 0.02 for seven input pictures);
// Nano Banana 2 and Pro are priced per picture by resolution. Rounded up, so the ledger errs high.
const FAL_RES: Record<string, Record<string, number>> = {
  'google/nano-banana-2.1/edit': { '1K': 0.07, '2K': 0.09, '4K': 0.17 },
  'fal-ai/nano-banana-2/edit': { '1K': 0.08, '2K': 0.12, '4K': 0.16 },
  'fal-ai/nano-banana-pro/edit': { '1K': 0.15, '2K': 0.15, '4K': 0.3 },
  'google/nano-banana-2.1': { '1K': 0.05, '2K': 0.07, '4K': 0.14 },
  'fal-ai/nano-banana-2': { '1K': 0.08, '2K': 0.12, '4K': 0.16 },
  'fal-ai/nano-banana-pro': { '1K': 0.15, '2K': 0.15, '4K': 0.3 },
};
export const falCost = (m: string, w: number, h: number, res = '') => FAL_RES[m]?.[res] ?? FAL_FLAT[m] ?? Math.ceil((w * h) / 1e6) * (FAL_MP[m] ?? 0.04);

// Rough price of drawing the picture a spec asks for (what the ledger would record), for dry runs.
export function estimateCost(spec: any): number {
  const plan = buildPlan(spec), m = falModels();
  if (plan.refs && plan.refs.length) return plan.editor === 'multi' ? falCost(m.outfit, plan.width, plan.height, m.outfitRes) : falCost(m.edit, plan.width, plan.height);
  if (plan.kind === 'item') return falCost(m.item, plan.width, plan.height);
  if (plan.kind === 'monster' || plan.kind === 'place' || plan.kind === 'label') return falCost(m.creature, plan.width, plan.height, /nano-banana/.test(m.creature) ? m.creatureRes : '');
  return plan.kind === 'avatar' ? falCost(m.avatar, plan.width, plan.height, /nano-banana/.test(m.avatar) ? m.avatarRes : '') : falCost(m.t2i, plan.width, plan.height);
}
const sniff = (b: Buffer) => (b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b[0] === 0x89 && b[1] === 0x50 ? 'png' : b.slice(0, 4).toString() === 'RIFF' ? 'webp' : '');
const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };
async function fetchBytes(url: string, init?: RequestInit, timeoutMs = 170000): Promise<Buffer> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status} ${(await r.text()).slice(0, 160)}`);
  return Buffer.from(await r.arrayBuffer());
}
// A finished fal image is already paid for: retry the download instead of letting one stalled connection lose it.
async function fetchRetry(url: string, tries = 4, timeoutMs = 30000): Promise<Buffer> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fetchBytes(url, undefined, timeoutMs); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}
const withTimeout = <T>(p: Promise<T>, ms: number, what: string): Promise<T> => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`${what}: no answer after ${ms / 1000}s`)), ms);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});
async function postJson(url: string, headers: Record<string, string>, body: any): Promise<any> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(170000) });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status} ${txt.slice(0, 160)}`);
  return JSON.parse(txt);
}

// Closest aspect-ratio name accepted by the Gemini-based editors.
const aspect = (w: number, h: number) => {
  const r = w / h;
  const opts: [string, number][] = [['1:1', 1], ['2:3', 2 / 3], ['3:4', 3 / 4], ['3:2', 3 / 2], ['4:3', 4 / 3], ['9:16', 9 / 16], ['16:9', 16 / 9]];
  return opts.reduce((a, b) => (Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a))[0];
};
// Input of the multi-picture editors: the pictures are image 1, 2, 3 ... of the prompt, in the order of `urls`.
// Nano Banana takes an aspect ratio; FLUX.2 takes an explicit size.
function multiEditInput(model: string, j: Job, urls: string[], res: string) {
  const common = { prompt: j.editPrompt, image_urls: urls, seed: j.seed, output_format: 'jpeg' };
  if (/flux-2/.test(model)) return { ...common, image_size: { width: j.width, height: j.height }, safety_tolerance: '2' };
  // Nano Banana 2.1 / 2 / Pro draw at 1K, 2K or 4K (the first generation, nano-banana/edit, has no such option); 2.1 also thinks before it draws.
  const hires = /nano-banana-(2|pro)/.test(model) ? { resolution: res } : {};
  const think = /nano-banana-2\.1/.test(model) ? { thinking_level: process.env.FAL_THINKING || 'medium' } : {};
  return { ...common, aspect_ratio: aspect(j.width, j.height), num_images: 1, ...hires, ...think };
}

interface Gen { buf: Buffer; model: string; requestId?: string; cost?: number }
type Pic = { buf: Buffer; ext: string };
// refs: the reference pictures of an edit, in the order of j.refIds
async function generate(name: Provider, j: Job, refs: Pic[]): Promise<Gen> {
  const e = process.env;
  switch (name) {
    case 'pollinations':
      return { model: 'flux', buf: await fetchBytes(`https://image.pollinations.ai/prompt/${encodeURIComponent(j.prompt)}?width=${j.width}&height=${j.height}&seed=${j.seed}&model=flux&nologo=true&private=true`) };
    case 'cloudflare': {
      const r = await postJson(`https://api.cloudflare.com/client/v4/accounts/${e.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { Authorization: `Bearer ${e.CLOUDFLARE_API_TOKEN}` }, { prompt: j.prompt, steps: 6, seed: j.seed });
      if (!r.success || !r.result?.image) throw new Error('cloudflare ' + JSON.stringify(r.errors || r).slice(0, 160));
      return { model: 'flux-1-schnell', buf: Buffer.from(r.result.image, 'base64') };
    }
    case 'fal': {
      // official client, server side only (FAL_KEY comes from the environment); subscribe() handles queue + polling
      const { fal } = await import('@fal-ai/client');
      const m = falModels();
      let model = j.kind === 'item' ? m.item : j.kind === 'avatar' ? m.avatar : j.kind === 'monster' || j.kind === 'place' || j.kind === 'label' ? m.creature : m.t2i, input: any, qual = '';
      if (refs.length && j.editPrompt) {
        // every reference picture goes up first, all at once
        const urls = await withTimeout(Promise.all(refs.map(async (p) => {
          const mime = p.ext === 'png' ? 'image/png' : p.ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const u = await fal.storage.upload(new Blob([new Uint8Array(p.buf)], { type: mime }));
          falHost(u);
          return u;
        })), 90000, 'fal upload');
        if (j.editor === 'multi') { model = m.outfit; qual = m.outfitRes; input = multiEditInput(model, j, urls, qual); }
        else { model = m.edit; input = { prompt: j.editPrompt, image_url: urls[0], seed: j.seed, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg', safety_tolerance: '2' }; }
      } else if (/nano-banana/.test(model)) {
        // Gemini-based text-to-image (the character's base picture, and creatures): aspect ratio and resolution instead of a pixel size
        qual = j.kind === 'avatar' ? m.avatarRes : j.kind === 'monster' || j.kind === 'place' || j.kind === 'label' ? m.creatureRes : '1K';
        input = { prompt: j.prompt, aspect_ratio: aspect(j.width, j.height), resolution: qual, seed: j.seed, num_images: 1, output_format: 'jpeg', ...(/nano-banana-2\.1/.test(model) ? { thinking_level: process.env.FAL_THINKING || 'medium' } : {}) };
      } else {
        input = { prompt: j.prompt, image_size: { width: j.width, height: j.height }, seed: j.seed, num_images: 1, output_format: 'jpeg', enable_safety_checker: true };
        if (model.endsWith('/schnell')) input.num_inference_steps = 4;
      }
      const res: any = await withTimeout(fal.subscribe(model, { input }), 150000, 'fal ' + model);
      const img = res?.data?.images?.[0];
      if (!img?.url) throw new Error('fal: no image in result');
      falHost(img.url);
      const cost = falCost(model, j.width, j.height, qual);
      await addImageCost(cost);
      console.log('[imagegen] fal', model, 'request', res.requestId);
      return { model, requestId: res.requestId, cost, buf: await fetchRetry(img.url) };
    }
    case 'together': {
      const r = await postJson('https://api.together.xyz/v1/images/generations', { Authorization: `Bearer ${e.TOGETHER_API_KEY}` }, { model: e.IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell', prompt: j.prompt, width: j.width, height: j.height, steps: 4, seed: j.seed, n: 1, response_format: 'b64_json' });
      return { model: e.IMAGE_MODEL || 'FLUX.1-schnell', buf: Buffer.from(r.data[0].b64_json, 'base64') };
    }
    case 'openai': {
      const size = j.width === j.height ? '1024x1024' : '1024x1536';
      const r = await postJson((e.IMAGE_API_BASE || 'https://api.openai.com/v1') + '/images/generations', { Authorization: `Bearer ${e.OPENAI_API_KEY}` }, { model: e.IMAGE_MODEL || 'gpt-image-1', prompt: j.prompt, size, n: 1, quality: 'low' });
      return { model: e.IMAGE_MODEL || 'gpt-image-1', buf: Buffer.from(r.data[0].b64_json, 'base64') };
    }
  }
  throw new Error('provider off');
}

// Is there a picture with this id? (the extension and the crop, not the picture)
export async function fileFor(id: string) { return /^[a-f0-9]{20}$/.test(id) ? hasImage(id) : null; }
export const idFromUrl = (u: string) => u.split('/').pop() || '';

// Claude (vision) checks that the picture matches what was asked, so bad results are redrawn instead of shown.
// Edits (an outfit change, a mutated monster) are also compared with the picture they were made from.
const QA: Record<string, string> = {
  label: 'Is this ONE flat, ornate game-interface button plaque (no person and no scene; carved ornaments such as dragons, phoenixes and flowers ON the plaque are fine) whose words are clearly readable, without garbled or extra letters? Stylized brush calligraphy is fine as long as the words are legible.',
  item: 'Is this a single inanimate object (a weapon, clothing, jewelry, talisman, bound manual book or similar item) shown on its own, with NO person, face or hands visible?',
  monster: 'Does this show a creature (an animal or mythical beast) with NO human person in it?',
  avatar: 'Is this ONE person standing, drawn as a high-quality fantasy illustration or a realistic 3D game render (a realistic look is wanted; not pixel art, not a collage, not a snapshot of a real person in modern clothes), with the whole body visible from head to feet, the face turned toward the viewer (front or three-quarter view, not in strict profile, not from behind), and natural balanced adult body proportions (not chibi, no oversized head, no very short legs)?',
  outfit: 'Is this ONE person in East Asian fantasy clothing, drawn as a high-quality fantasy illustration or a realistic 3D game render (a realistic look is wanted; not pixel art, not a collage, not a snapshot of a real person in modern clothes), with the face visible and natural balanced adult body proportions (not chibi, no oversized head, no very short legs)?',
};
QA.place = 'Is this a scenic fantasy landscape or town view with no person in the foreground, drawn as a high-quality fantasy illustration or realistic 3D game render (not pixel art, not a collage, not a photo of the real world)?';
QA.pose = QA.avatar; // a standing pose drawn without its base picture (a provider that cannot edit) is judged like a base picture
const QA_SAME: Record<string, string> = {
  monster: 'Image 2 should show the SAME creature as image 1, recolored with a glowing rainbow-like look. Differences in color, glow and lighting are expected: ignore them. Answer false ONLY if image 2 is clearly a different kind of animal, or has a human in it.',
  // The standing pose is an edit of the base picture: same person and clothes, but a clearly different, graceful pose.
  pose: 'Image 2 should show the SAME person as image 1 (same face, hair, clothes and background), redrawn in a different graceful standing pose. Differences in pose, wind, hair and sleeve movement and lighting are expected: ignore them. Answer false ONLY if one of these is clearly true: (a) image 2 shows a clearly different person than image 1 (different gender, clearly different hair color, eye color or age) or more than one person; (b) image 2 is not one high-quality fantasy illustration or realistic 3D game render of the whole body from head to feet (the head or the feet are cut off, or it is a collage); (c) the body is distorted or childlike (chibi, oversized head, very short legs), or the person has more than two arms or more than two hands (a third arm), or the face is turned away or hidden; (d) the pose is practically the same stiff straight-on stance as image 1 with the arms hanging at the sides.',
};
// Outfit: the result must show the same person AND every worn item as its own picture shows it (the avatar is copied from the icons).
const qaOutfit = (labels: string[]) => `Image 1 is the original character. ${labels.map((l, i) => `Image ${i + 2} is the character's ${l}`).join('; ')}. The LAST image is the RESULT to check: the character should now wear or hold those items. Answer false ONLY if one of these is clearly true: (a) the result shows a clearly different person than image 1 (different gender, clearly different hair color, eye color or age) or more than one person; (b) the result is not one high-quality fantasy illustration or realistic 3D game render of the whole body from head to feet (a realistic look is wanted; pixel art, a collage or a snapshot of a real person in modern clothes counts as not); (c) the body is distorted or childlike (chibi, oversized head, very short legs) instead of natural balanced adult proportions; (d) one of the listed items is missing from the result, or is clearly a different kind of object, or has a clearly different main color than its picture; (e) the result is a collage or contains the item pictures themselves. Small differences in detail, size, lighting or background are fine. In "why", name the item that is wrong.`;
// Outfit check, item by item. A single "answer false ONLY if clearly..." question let a picture without the waist pendant through, and the
// model also wrote its reasoning first, ran out of tokens and the answer could not be read (which used to count as "fine").
// Here the verdict is one entry per item, and the JSON comes first.
const qaOutfitItems = (labels: string[]) => `Image 1 is the original character. ${labels.map((l, i) => `Image ${i + 2} is the character's ${l}`).join('; ')}. The LAST image is the RESULT to check.
For EACH of images 2 to ${labels.length + 1}, look carefully at the result and decide whether that exact item (the same kind of object with the same shape and main colors) is clearly visible, worn or held by the character. Small items such as a hanging pendant, a hairpin or a tassel must be searched for one by one: check the head, the hands, the waist and the feet. Do not assume an item is there because it is plausible.
Also decide: person_ok = false only if the result clearly shows a different person than image 1 (different gender, clearly different hair color, eye color or age) or more than one person. format_ok = false if the result is not one high-quality fantasy illustration or realistic 3D game render of the whole body from head to feet, if the body is distorted or childlike (chibi, oversized head, very short legs), or if it is a collage or shows the item pictures themselves. text_ok = false only for readable text outside the items, such as a signature, a watermark or letters in the sky or on the ground (ornamental carving on a jewel does not count).
Also count the limbs of the person in the RESULT: arms = the number of distinct human arms visible (each one ends in a hand; sleeves, ribbons, capes and swords are not arms), hands = the number of distinct human hands visible (a hand holding a sword counts once). A normal person has exactly 2 arms and 2 hands, so a count above 2 means a drawing error (a third arm). Count carefully, one by one.
A plain, small or much simpler stand-in is NOT the item: a tiny hairpin is not a large ornate golden crown, and a plain white robe is not an embroidered robe with feathered shoulders. The item in the result must have the same size, richness and main details as in its picture.
Start your answer directly with the JSON object and write nothing before it. For each item first write in "seen" what you actually see in the result for that item (a few words, or "nothing"), then the verdict. Format: {"items":[{"image":2,"item":"robe","seen":"...","visible":true|false}, ...one entry per item...],"arms":<number>,"hands":<number>,"person_ok":true|false,"format_ok":true|false,"text_ok":true|false,"why":"short reason naming what is wrong"}`;
// No picture of this game may contain writing. Icons get the stricter wording: icon models like to invent fake characters or rune-like bands
// on medallions, rings, crowns and shoes, and the avatar would copy them.
const NOTEXT = ' Also answer false if any readable text, letters, calligraphy, a seal stamp, a signature or a watermark is visible anywhere in the picture.';
const NOTEXT_ITEM = ' Also answer false if the item or its surroundings show anything that looks like writing, even small, faint or decorative: Chinese characters, rune-like or glyph-like marks, calligraphy, letters, numbers, a seal stamp, a signature or a watermark.';
const imageBlock = (buf: Buffer, ext: string) => ({ type: 'image', source: { type: 'base64', media_type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg', data: buf.toString('base64') } });
// refs: the pictures an edit was made from (original first). labels: what refs[1..] show (outfit only).
export async function review(kind: string, buf: Buffer, ext: string, refs?: Pic[], labels?: string[]): Promise<{ ok: boolean; why: string }> {
  const multi = kind === 'outfit' && !!refs && refs.length > 1 && !!labels && labels.length === refs.length - 1;
  const base = refs && refs.length ? (multi ? qaOutfit(labels!) : QA_SAME[kind]) : QA[kind];
  const q = base && base + (kind === 'item' ? NOTEXT_ITEM : kind === 'label' ? '' : NOTEXT);   // a label is the one picture that is meant to carry words
  if (!llmEnabled() || process.env.IMAGE_QA === '0' || !q) return { ok: true, why: 'skipped' };
  try {
    const pics: any[] = [];
    if (multi) {
      refs!.forEach((r, i) => pics.push({ type: 'text', text: i === 0 ? 'Image 1 (original character):' : `Image ${i + 1} (${labels![i - 1]}):` }, imageBlock(r.buf, r.ext)));
      pics.push({ type: 'text', text: 'LAST image (the result to check):' }, imageBlock(buf, ext));
    } else if (refs && refs.length) pics.push({ type: 'text', text: 'Image 1 (original):' }, imageBlock(refs[0].buf, refs[0].ext), { type: 'text', text: 'Image 2 (edited):' }, imageBlock(buf, ext));
    else pics.push(imageBlock(buf, ext));
    if (multi) {
      // per-item verdict; one retry when the answer cannot be read, and a visible warning when it still cannot
      for (let k = 0; k < 2; k++) {
        try {
          const o = parseJson(await ask({ model: process.env.QA_MODEL || 'claude-haiku-5-5', maxTokens: 700, tag: 'qa', maxPerHour: Number(process.env.QA_MAX_PER_HOUR || 200), content: [...pics, { type: 'text', text: qaOutfitItems(labels!) }] }));
          const miss = (Array.isArray(o.items) ? o.items : []).filter((x: any) => x && x.visible !== true).map((x: any) => `${String(x.item || '?')}${x.seen ? ` (saw: ${String(x.seen).slice(0, 40)})` : ''}`);
          const bad = [...(miss.length ? [`missing: ${miss.join(', ')}`] : []), ...(Number(o.arms) > 2 || Number(o.hands) > 2 ? [`extra arm or hand (arms ${o.arms}, hands ${o.hands})`] : []), ...(o.person_ok === false ? ['different person'] : []), ...(o.format_ok === false ? ['bad format or proportions'] : []), ...(o.text_ok === false ? ['text or watermark'] : [])];
          return { ok: bad.length === 0, why: (bad.join('; ') + (o.why ? ` | ${o.why}` : '')).slice(0, 300) };
        } catch (e: any) { if (/budget|rate|no-key/.test(String(e?.message))) return { ok: true, why: 'review unavailable: ' + e.message }; }
      }
      console.warn('[imagegen] WARNING: the outfit review could not be read twice, the picture is accepted unreviewed');
      return { ok: true, why: 'review unreadable' };
    }
    // Pictures of a person are also checked for a third arm: the reviewer counts arms and hands (a number is harder to wave through than a yes).
    const people = kind === 'avatar' || kind === 'pose' || kind === 'outfit';
    const fmt = people ? '{"arms":<number of distinct human arms visible in the picture to check>,"hands":<number of distinct human hands visible>,"ok":true|false,"why":"short reason"}' : '{"ok":true|false,"why":"short reason"}';
    const count = people ? ' Count the arms and hands of the person in the picture to check (image 2 when there are two images): each arm ends in a hand, sleeves, ribbons and swords are not arms, a normal person has exactly 2 arms and 2 hands, and a count above 2 is a drawing error.' : '';
    const out = await ask({
      model: process.env.QA_MODEL || 'claude-haiku-5-5', maxTokens: 200, tag: 'qa', maxPerHour: Number(process.env.QA_MAX_PER_HOUR || 200),
      content: [...pics, { type: 'text', text: `${q}${count}${provider().name === 'pollinations' ? ' Ignore any small watermark text at the bottom edge.' : ''} Answer with JSON only: ${fmt}` }],
    });
    const j = parseJson(out);
    const limbs = people && (Number(j.arms) > 2 || Number(j.hands) > 2);
    return { ok: j.ok === true && !limbs, why: limbs ? `extra arm or hand (arms ${j.arms}, hands ${j.hands})` : String(j.why || '').slice(0, 300) };
  } catch { return { ok: true, why: 'review unavailable' }; }
}

async function run(j: Job) {
  const P = provider();
  let requeued = false;
  try {
    if (P.paid) { const ib = await imageBudget(); if (ib.spentUsd >= ib.capUsd) { console.warn('[imagegen] image budget reached, not drawing', j.id); return; } }
    // The pictures this one is edited from (the character's base picture, item icons ...), read once from the database.
    const refPics: Pic[] = [];
    for (const rid of j.refIds || []) {
      const im = await getImage(rid);
      if (!im) throw new Error('reference picture is gone: ' + rid);
      refPics.push({ buf: im.data, ext: im.ext });
    }
    // Transient failures (network, fal hiccups, a non-image answer) are retried here so the player does not see them.
    // A 403 is not transient (balance or key): it goes straight to the lock below.
    let out!: Gen, ext = '';
    for (let n = 0; ; n++) {
      try {
        out = await generate(P.name, j, refPics);
        ext = sniff(out.buf);
        if (!ext) throw new Error('not an image');
        break;
      } catch (e: any) {
        if (e?.status === 403 || n >= 2) throw e;
        console.warn('[imagegen] retry', j.id, String(e?.message || e).slice(0, 120));
        await new Promise((r) => setTimeout(r, 2000 * (n + 1)));
      }
    }
    const v = await review(j.kind, out.buf, ext, refPics.length ? refPics : undefined, j.refLabels);
    if (!v.ok && j.attempt < (refPics.length ? 1 : j.kind === 'item' ? 3 : 2)) {
      console.warn('[imagegen] rejected', j.kind, j.id, v.why);
      requeued = true;
      S.queue.push({ ...j, seed: j.seed + 7919 * (j.attempt + 1), attempt: j.attempt + 1, t: Date.now(), seen: Date.now() });
      return;
    }
    // After the last redraw the picture is kept even if the reviewer still dislikes it. An icon is only a reference for the
    // avatar, and a slightly imperfect icon is better than an avatar that can never be redrawn. Monsters keep the glyph tile.
    if (!v.ok && j.kind === 'monster') throw new Error('rejected by review: ' + v.why);
    if (!v.ok) console.warn('[imagegen] kept after review', j.kind, j.id, v.why);
    const folder = folderFor({ kind: j.kind, spec: j.spec, prompt: j.prompt });
    await putImage({
      id: j.id, kind: kindFolder(j.kind), folder, ext, data: out.buf,
      meta: { crop: P.crop, spec: j.spec, provider: P.name, model: out.model, kind: j.kind, prompt: j.prompt, editPrompt: j.editPrompt, ref: j.refIds ? j.refIds.join(',') : undefined, seed: j.seed, requestId: out.requestId, cost: out.cost, attempt: j.attempt, date: new Date().toISOString() },
    });
    const ik = keyOfSpec(j.spec);
    // the picture is already saved: a failure of the index must not turn it into a failed job (the backfill script adds missing rows)
    if (ik) { try { await indexImage(ik, j.id, STYLE_VERSION); await dropWanted(ik); } catch (e: any) { console.warn('[imagegen] could not index', j.id, String(e?.message || e).slice(0, 100)); } }
  } catch (err: any) {
    S.failed.set(j.id, Date.now());
    const detail = err?.body ? JSON.stringify(err.body).slice(0, 240) : '';
    console.warn('[imagegen] failed', j.id, String(err?.message || err).slice(0, 200), detail);
    // 403 from the provider (for example an exhausted balance): stop sending billable jobs, do not retry
    if (err?.status === 403) {
      S.locked = { until: Date.now() + 15 * 60e3, reason: detail || 'Forbidden' };
      await releaseJobs(S.queue.map((q) => q.id));
      S.queue.length = 0; S.inflight.clear();
    }
  } finally {
    if (!requeued) { S.inflight.delete(j.id); await releaseJobs([j.id]); }
  }
}

// Resolves when nothing is drawing or waiting any more. A serverless route hands this to after(), so the function stays alive until its pictures are saved.
export async function idle(maxMs = 280000): Promise<void> {
  const end = Date.now() + maxMs;
  while ((S.running > 0 || S.queue.length > 0) && Date.now() < end) await new Promise((r) => setTimeout(r, 400));
}

function pump() {
  const P = provider();
  if (!P.enabled) return;
  // drop jobs nobody has asked about for 90 s (their component is gone), then order by priority
  const now0 = Date.now(), dropped: string[] = [];
  S.queue = S.queue.filter((j) => (now0 - j.seen < 90000 ? true : (S.inflight.delete(j.id), dropped.push(j.id), false)));
  if (dropped.length) void releaseJobs(dropped);
  S.queue.sort((a, b) => a.pri - b.pri || a.t - b.t);
  while (S.running < P.concurrency && S.queue.length) {
    const wait = S.lastStart + P.minIntervalMs - Date.now();
    if (wait > 0) { if (!S.timer) S.timer = setTimeout(() => { S.timer = null; pump(); }, wait + 50); return; }
    const job = S.queue.shift() as Job;
    S.running++; S.lastStart = Date.now(); S.started.push({ t: S.lastStart, item: job.kind === 'item' });
    run(job).finally(() => { S.running--; pump(); });
  }
}

export type Result = { status: 'ready' | 'pending' | 'failed' | 'limited' | 'disabled' | 'invalid'; url?: string; crop?: number };
// When several reference pictures are not ready, the client is told the most serious state (a failed icon must not look like "still drawing").
const RANK: Record<string, number> = { pending: 1, failed: 2, limited: 3, disabled: 4, invalid: 4 };
const worse = (a: string, b: string) => ((RANK[b] || 0) > (RANK[a] || 0) ? b : a);
// One reference picture of an edit: a file that already exists (the character's own base picture) or a spec that is looked up or drawn like any other picture.
async function refPicture(r: any, pri: number): Promise<{ status: Result['status']; id?: string }> {
  if (r && r.kind === 'file') {
    const f = typeof r.id === 'string' ? await fileFor(r.id) : null;
    if (f) return { status: 'ready', id: r.id };
    // The character's old base picture is gone: draw the base again from the look instead of failing for ever.
    if (r.fallback) return refPicture({ ...r.fallback, pri }, pri);
    return { status: 'failed' };
  }
  const rr = await request({ ...r, pri });
  if (rr.status !== 'ready') return { status: rr.status };
  const id = idFromUrl(rr.url!);
  return (await hasImage(id)) ? { status: 'ready', id } : { status: 'pending' };
}
export async function request(spec: any): Promise<Result> {
  const P = provider();
  let plan: Plan;
  try { plan = buildPlan(spec); } catch { return { status: 'invalid' }; }
  // Item icons are found by their look (never by prompt), so they keep showing when the AI is off or the prompt was reworded.
  // A look that has no picture yet is noted in image_wanted and drawn later.
  const key = keyOfSpec(spec);
  const found = (f: { id: string; crop: number }): Result => ({ status: 'ready', url: `/api/img/${f.id}`, crop: f.crop });
  const limited = async (): Promise<Result> => { if (key) await wantImage(key, spec); return { status: 'limited' }; };
  if (!P.enabled) {
    if (key) { const f = await lookupKey(key); if (f) return found(f); await wantImage(key, spec); }
    return { status: 'disabled' };
  }
  // An edit needs all its reference pictures first (only the fal provider can edit; others redraw from the full text).
  // Every reference is requested before answering, so the missing ones are drawn one after another without extra round trips.
  const refIds: string[] = [];
  if (plan.refs && plan.refs.length && P.name === 'fal') {
    let worst = '';
    for (const r of plan.refs) {
      const x = await refPicture(r, plan.pri);
      if (x.status === 'ready') refIds.push(x.id!); else worst = worse(worst, x.status);
    }
    if (worst) return { status: worst as Result['status'] };
  }
  const tag = P.name === 'fal' ? modelTag(plan.kind) : '';
  // The id of a picture must stay exactly what it was in the file version: saved games remember it.
  const id = crypto.createHash('sha1').update(`${STYLE_VERSION}|${P.name}|${tag}|${plan.prompt}|${refIds.length ? plan.editPrompt : ''}|${refIds.join(',')}|${plan.width}x${plan.height}|${plan.seed}`).digest('hex').slice(0, 20);
  const hit = await hasImage(id);
  if (hit) return { status: 'ready', url: `/api/img/${id}`, crop: hit.crop };
  // Same look drawn under an older prompt or style: it is still a valid picture of this item, so show it instead of paying for a new one.
  if (key) { const f = await lookupKey(key); if (f) return found(f); }
  if (S.inflight.has(id)) { const q = S.queue.find((x) => x.id === id); if (q) q.seen = Date.now(); return { status: 'pending' }; }
  const f = S.failed.get(id);
  if (f && Date.now() - f < 45 * 1000) return { status: 'failed' };
  // Thiên pictures are shared by every player and no new ones are drawn until DRAW_THIEN_ART=1 is set (the look is noted in image_wanted for later)
  if (spec && spec.kind === 'item' && Number(spec.tier) === 4 && process.env.DRAW_THIEN_ART !== '1') return limited();
  // pictures that already exist are always served; only NEW paid drawings stop while the provider is locked or the budget is used up
  if (S.locked && S.locked.until > Date.now()) return limited();
  if (P.paid) { const ib = await imageBudget(); if (ib.spentUsd >= ib.capUsd) return limited(); }
  const hourAgo = Date.now() - 3600 * 1000;
  S.started = S.started.filter((x) => x.t > hourAgo);
  const isItem = plan.kind === 'item';
  const max = Number(isItem ? process.env.IMAGE_ITEM_MAX_PER_HOUR || (P.paid ? 150 : 200) : process.env.IMAGE_MAX_PER_HOUR || (P.paid ? 40 : 200));
  if (S.started.filter((x) => x.item === isItem).length + S.queue.filter((x) => (x.kind === 'item') === isItem).length >= max) return limited();
  // Another server instance may already be drawing this picture (the claim is in the database): then it is simply "pending" here too.
  if (!(await claimJob(id))) return { status: 'pending' };
  // The picture may have been finished and its claim released between the first look and the claim: never pay for it twice.
  const late = await hasImage(id);
  if (late) { await releaseJobs([id]); return { status: 'ready', url: `/api/img/${id}`, crop: late.crop }; }
  if (S.inflight.has(id)) return { status: 'pending' };   // another request of this instance queued it meanwhile
  S.inflight.add(id);
  S.queue.push({ ...plan, id, t: Date.now(), seen: Date.now(), attempt: 0, refIds: refIds.length ? refIds : undefined, spec });
  pump();
  return { status: 'pending' };
}
// Is there credit to draw NEW pictures right now? The daily job asks before it invents a new creature and weapon: without credit it writes the story only (the daily quest then uses
// an old creature). False when drawing is off or locked, when the spend cap leaves less than DAILY_MIN_USD, or (when fal's balance can be read, see FAL_BILLING_KEY) when the account is below it.
export async function canDraw(): Promise<boolean> {
  const P = provider();
  if (!P.enabled || (S.locked && S.locked.until > Date.now())) return false;
  if (!P.paid) return true;
  const need = Number(process.env.DAILY_MIN_USD || 0.5);
  const ib = await imageBudget();
  if (ib.capUsd - ib.spentUsd < need) return false;
  if (P.name === 'fal') { const b = await falBalance().catch(() => null); if (b && b.balance !== null && b.balance < need) return false; }
  return true;
}
export async function info() {
  const P = provider();
  return { enabled: P.enabled, provider: P.name, ...(P.name === 'fal' ? falModels() : {}), ...(S.locked && S.locked.until > Date.now() ? { locked: S.locked.reason } : {}), ...(P.paid ? { budget: await imageBudget() } : {}), queued: S.queue.length, running: S.running, minIntervalSec: P.minIntervalMs / 1000 };
}
