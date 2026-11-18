// Server side of the Linh Thú Viên lab (/lab/linh-thu): draws mutated variants of a creature, turns a picture into a looping clip and cuts a clip out of its background.
// Everything is kept in the images table next to the game's own pictures (kind 'animvar' for a variant, 'anim' for a clip, 'animcut' and 'animalpha' for the two
// videos of a cut-out, folder 'lab'), under an id that is a hash of everything that went into it, so asking twice never pays twice.
// Money: the lab has its own ledger and cap (LAB_BUDGET_USD), apart from IMAGE_BUDGET_USD, so a batch of clips cannot use up the pictures players wait for.
import crypto from 'node:crypto';
import { query } from './db';
import { getImage, hasImage, putImage, claimJob, releaseJobs } from './images';
import { falModels, falCost, provider, review } from '../imagegen';
import * as A from '../anim';
import * as P from '../spots';
import * as C from '../content';
import { blobOn, putBlob, readBlob } from './blob';

export type Status = 'ready' | 'pending' | 'failed' | 'limited' | 'disabled' | 'invalid';
export interface Out { status: Status; id?: string; alpha?: string; why?: string; started?: boolean }
interface Done {
  buf: Buffer; ext: string; kind: 'animvar' | 'anim' | 'animcut' | 'animfg' | 'spotpic' | 'spotclip' | 'bgclip'; meta: any;
  more?: { id: string; buf: Buffer; ext: string; kind: 'animalpha'; meta: any }[];   // saved BEFORE the main row, so "main row exists" means "all of it exists"
}

const g = globalThis as any;
const S: { inflight: Set<string>; failed: Map<string, { t: number; why: string }> } = g.__tutienAnim || (g.__tutienAnim = { inflight: new Set(), failed: new Map() });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r4 = (x: number) => Math.round(x * 10000) / 10000;

export const animModel = () => process.env.FAL_ANIM_MODEL || A.DEFAULT_MODEL;
export const cutModel = () => process.env.FAL_CUT_MODEL || A.DEFAULT_CUT_MODEL;
export const animSeconds = () => (process.env.FAL_ANIM_SECONDS === '10' ? 10 : 5);
export const labCap = () => Number(process.env.LAB_BUDGET_USD || 5);
const editCost = () => falCost(falModels().edit, 960, 960);
const falReady = () => { const P = provider(); return P.enabled && P.name === 'fal'; };

// ---- the lab's own spend ledger: one row in the kv table, added to with a single SQL statement
const LEDGER = 'lab.usd';
export async function labSpent(): Promise<number> {
  try { return Number((await query<{ v: number }>(`SELECT (value->>'usd')::float8 AS v FROM kv WHERE key = $1`, [LEDGER])).rows[0]?.v) || 0; } catch { return 0; }
}
async function labAdd(usd: number) {
  if (!(usd > 0)) return;
  try {
    await query(
      `INSERT INTO kv (key, value) VALUES ($1, jsonb_build_object('usd', $2::float8))
       ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('usd', COALESCE((kv.value->>'usd')::float8, 0) + $2::float8)`,
      [LEDGER, usd],
    );
  } catch (e: any) { console.warn('[anim] could not write the lab ledger:', String(e?.message || e).slice(0, 120)); }
}

// ---- small helpers around fal
const sha = (...parts: (string | number)[]) => crypto.createHash('sha1').update([A.ANIM_VERSION, ...parts].join('|')).digest('hex').slice(0, 20);
const seedOf = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1073741823) + 1; };
const falHost = (u: string) => { if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(u).hostname)) throw new Error('fal: unexpected host'); };
const withTimeout = <T>(p: Promise<T>, ms: number, what: string): Promise<T> => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`${what}: no answer after ${ms / 1000}s`)), ms);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});
// A finished fal result is already paid for: retry the download instead of letting one stalled connection lose it.
async function download(url: string, tries = 4): Promise<Buffer> {
  falHost(url);
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`download ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { last = e; await sleep(1500 * (i + 1)); }
  }
  throw last;
}
async function upload(fal: any, p: { data: Buffer; ext: string }): Promise<string> {
  const mime = p.ext === 'mp4' ? 'video/mp4' : p.ext === 'png' ? 'image/png' : p.ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const u = await withTimeout<string>(fal.storage.upload(new Blob([new Uint8Array(p.data)], { type: mime })), 90000, 'fal upload');
  falHost(u);
  return u;
}
const isMp4 = (b: Buffer) => b.length > 12 && b.subarray(4, 8).toString() === 'ftyp';
const videoExt = (b: Buffer) => (isMp4(b) ? 'mp4' : b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 ? 'webm' : '');

// A video goes to Blob when it is set up (the row then keeps no bytes, only where the file is); everything else stays in the table.
const VIDEO = new Set(['mp4', 'webm']);
async function store(m: { id: string; kind: string; ext: string; buf: Buffer; meta: any }) {
  if (blobOn() && VIDEO.has(m.ext)) {
    const b = await putBlob(`tienkiem/lab/${m.id}.${m.ext}`, m.buf, m.ext === 'mp4' ? 'video/mp4' : 'video/webm');
    await putImage({ id: m.id, kind: m.kind, folder: 'lab', ext: m.ext, data: Buffer.alloc(0), meta: { ...m.meta, blob: b } });
  } else await putImage({ id: m.id, kind: m.kind, folder: 'lab', ext: m.ext, data: m.buf, meta: m.meta });
}
// The bytes of a picture or clip, wherever they are kept.
async function readImage(id: string): Promise<{ data: Buffer; ext: string } | null> {
  const p = await getImage(id);
  if (!p) return null;
  const u = p.meta?.blob?.url;
  return { data: u ? await readBlob(u) : p.data, ext: p.ext };
}

// ---- one job: claim it, answer "pending" at once, finish in the background (the route keeps the function alive with idle())
async function launch(id: string, cost: number, work: (pay: (usd: number) => Promise<void>) => Promise<Done>): Promise<Out> {
  if (!falReady()) return { status: 'disabled' };
  const hit = await hasImage(id);
  if (hit) return { status: 'ready', id };
  if (S.inflight.has(id)) return { status: 'pending', id };
  const f = S.failed.get(id);
  if (f && Date.now() - f.t < 60000) return { status: 'failed', why: f.why };
  if ((await labSpent()) + cost > labCap()) return { status: 'limited' };
  // Another server instance may already be working on it (the claim is in the database).
  if (!(await claimJob(id))) return { status: 'pending', id };
  const late = await hasImage(id);
  if (late) { await releaseJobs([id]); return { status: 'ready', id }; }
  S.inflight.add(id);
  void (async () => {
    try {
      const d = await work(labAdd), date = new Date().toISOString();
      for (const m of d.more || []) await store({ id: m.id, kind: m.kind, ext: m.ext, buf: m.buf, meta: { ...m.meta, provider: 'fal', date } });
      await store({ id, kind: d.kind, ext: d.ext, buf: d.buf, meta: { ...d.meta, provider: 'fal', date } });
      S.failed.delete(id);
    } catch (e: any) {
      const why = String(e?.message || e).slice(0, 200);
      S.failed.set(id, { t: Date.now(), why });
      console.warn('[anim] failed', id, why, e?.body ? JSON.stringify(e.body).slice(0, 200) : '');
    } finally { S.inflight.delete(id); await releaseJobs([id]); }
  })();
  return { status: 'pending', id, started: true };
}
// Resolves when nothing is being made any more; a serverless route hands this to after() so the function lives until its job is saved.
export async function idle(maxMs = 285000): Promise<void> {
  const end = Date.now() + maxMs;
  while (S.inflight.size > 0 && Date.now() < end) await sleep(500);
}

// ---- a mutated variant of a creature: an edit of its base picture
export async function variant(sp: string, mutId: string, baseId: string): Promise<Out> {
  const m = A.mutationOf(mutId);
  if (!m || !A.isPictureId(baseId)) return { status: 'invalid' };
  const model = falModels().edit, prompt = A.variantPrompt(m), cost = falCost(model, 960, 960);
  const id = sha('variant', sp, m.id, baseId, model, prompt);
  return launch(id, cost, async (pay) => {
    const base = await readImage(baseId);
    if (!base) throw new Error('the base picture is gone');
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, base);
    let seed = seedOf(`${sp}#${m.id}`), out: Buffer | null = null, why = '', spent = 0;
    // The reviewer (Claude, when its key is set) checks it is still the same creature; one redraw with another seed, then the picture is refused.
    for (let n = 0; n < 2 && !out; n++) {
      const res: any = await withTimeout(fal.subscribe(model, { input: { prompt, image_url: url, seed, guidance_scale: 3.5, num_images: 1, output_format: 'jpeg', safety_tolerance: '2' } }), 150000, 'fal ' + model);
      const img = res?.data?.images?.[0];
      if (!img?.url) throw new Error('fal: no image in result');
      const buf = await download(img.url);
      await pay(cost); spent += cost;
      const v = await review('monster', buf, 'jpg', [{ buf: base.data, ext: base.ext }]);
      if (v.ok) out = buf; else { why = v.why; seed += 7919; }
    }
    if (!out) throw new Error('rejected by review: ' + why);
    return { buf: out, ext: 'jpg', kind: 'animvar', meta: { spec: { kind: 'variant', sp, mut: m.id, base: baseId }, model, prompt, seed, cost: r4(spent) } };
  });
}

// ---- a looping clip made from one picture (the base picture or a variant)
export async function clip(sp: string, mutId: string, motionId: string, srcId: string): Promise<Out> {
  const mv = A.motionOf(motionId);
  if (!mv || !A.isPictureId(srcId) || (mutId !== A.BASE && !A.mutationOf(mutId))) return { status: 'invalid' };
  if (!(await hasImage(srcId))) return { status: 'invalid' };
  const model = animModel(), seconds = animSeconds(), prompt = A.clipPrompt(mv), cost = A.clipCost(model, seconds);
  const id = sha('clip', srcId, mv.id, model, seconds, prompt);
  return launch(id, cost, async (pay) => {
    const src = await readImage(srcId);
    if (!src) throw new Error('the source picture is gone');
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, src);
    const res: any = await withTimeout(fal.subscribe(model, { input: A.clipInput(model, { prompt, imageUrl: url, seconds }) }), 270000, 'fal ' + model);
    const v = res?.data?.video;
    if (!v?.url) throw new Error('fal: no video in result');
    const buf = await download(v.url);
    await pay(cost);
    if (!isMp4(buf)) throw new Error('not an mp4 file');
    return { buf, ext: 'mp4', kind: 'anim', meta: { spec: { kind: 'clip', sp, mut: mutId, motion: mv.id, src: srcId }, model, prompt, seconds, cost, requestId: res?.requestId } };
  });
}

// ---- a clip with its background removed: two videos, the picture (kind 'animcut', the id answered) and its alpha matte (kind 'animalpha', the id in `alpha`)
export async function cut(sp: string, mutId: string, motionId: string, clipId: string): Promise<Out> {
  const mv = A.motionOf(motionId);
  if (!mv || !A.isPictureId(clipId) || (mutId !== A.BASE && !A.mutationOf(mutId))) return { status: 'invalid' };
  const head = (await query<{ ext: string; kind: string; seconds: number | null }>(`SELECT ext, kind, (meta->>'seconds')::int AS seconds FROM images WHERE id = $1`, [clipId])).rows[0];
  if (!head || head.kind !== 'anim' || head.ext !== 'mp4') return { status: 'invalid' };
  const model = cutModel(), cost = A.cutCost(model, Number(head.seconds) || animSeconds());
  const id = sha('cut', clipId, model), alphaId = sha('cutalpha', clipId, model);
  const o = await launch(id, cost, async (pay) => {
    const src = await readImage(clipId);
    if (!src) throw new Error('the clip is gone');
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, src);
    const res: any = await withTimeout(fal.subscribe(model, { input: A.cutInput(model, url) }), 270000, 'fal ' + model);
    const raw = res?.data?.video;
    const files: any[] = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((f: any) => f?.url);
    // H.264 answers with two files: the picture and its alpha matte. The matte is told by its name; without a name the second one is taken.
    if (files.length < 2) throw new Error(`fal: expected two videos (picture and alpha), got ${files.length}: ${files.map((f) => f.content_type).join(',')}`);
    const alphaFile = files.find((f) => /alpha/i.test(String(f.file_name || '') + String(f.url || ''))) || files[1];
    const rgbFile = files.find((f) => f !== alphaFile);
    const rgb = await download(rgbFile.url), alpha = await download(alphaFile.url);
    await pay(cost);
    const re = videoExt(rgb), ae = videoExt(alpha);
    if (!re || !ae) throw new Error('the cut-out is not a video file');
    return {
      buf: rgb, ext: re, kind: 'animcut',
      meta: { spec: { kind: 'cut', sp, mut: mutId, motion: mv.id, src: clipId, alpha: alphaId }, model, cost, seconds: head.seconds, requestId: res?.requestId, names: files.map((f) => f.file_name) },
      more: [{ id: alphaId, buf: alpha, ext: ae, kind: 'animalpha', meta: { spec: { kind: 'alpha', sp, of: id } } }],
    };
  });
  return { ...o, alpha: alphaId };
}

// ---- the foreground layer of a zone's scene: grass, rocks and roots as a PNG with alpha (kind 'animfg')
const isPng = (b: Buffer) => b.length > 8 && b[0] === 0x89 && b.subarray(1, 4).toString() === 'PNG';
export async function fg(zone: string, origin: string): Promise<Out> {
  if (!A.isZoneId(zone)) return { status: 'invalid' };
  const model = falModels().edit, cutM = process.env.FAL_FG_CUT_MODEL || A.DEFAULT_FG_CUT_MODEL, prompt = A.fgPrompt(), cost = A.fgCost(falCost(model, 1376, 768));
  const id = sha('fg', zone, model, cutM, prompt);
  return launch(id, cost, async (pay) => {
    // the background picture is a static file of the site: asked from the site itself (the function's own disk may not hold public/)
    const r = await fetch(new URL(A.bgPath(zone), origin), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`background picture ${zone}: ${r.status}`);
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, { data: Buffer.from(await r.arrayBuffer()), ext: A.bgExt(zone) });
    const e: any = await withTimeout(fal.subscribe(model, { input: { prompt, image_url: url, seed: seedOf('fg#' + zone), guidance_scale: 3.5, num_images: 1, output_format: 'png', safety_tolerance: '2' } }), 150000, 'fal ' + model);
    const ei = e?.data?.images?.[0];
    if (!ei?.url) throw new Error('fal: no image in result');
    const edited = await download(ei.url);
    await pay(falCost(model, 1376, 768));
    const url2 = await upload(fal, { data: edited, ext: 'png' });
    const c: any = await withTimeout(fal.subscribe(cutM, { input: A.fgCutInput(url2) }), 120000, 'fal ' + cutM);
    const ci = c?.data?.image || c?.data?.images?.[0];
    if (!ci?.url) throw new Error('fal: no image from the background removal');
    const out = await download(ci.url);
    await pay(A.FG_CUT_USD);
    if (!isPng(out)) throw new Error('the foreground is not a PNG (no alpha)');
    return { buf: out, ext: 'png', kind: 'animfg', meta: { spec: { kind: 'fg', zone }, model, cutModel: cutM, prompt, cost } };
  });
}
export async function fgsAll() {
  const r = await query<{ id: string; zone: string }>(`SELECT id, meta->'spec'->>'zone' AS zone FROM images WHERE kind = 'animfg' ORDER BY created`);
  return r.rows.filter((x) => x.zone);
}

// ---- a creature standing at a spot of the background: its picture (the spot's window of the background with the creature drawn into it) and its clip
const picInput = (model: string, prompt: string, urls: string[], seed: number, res: string) => ({
  prompt, image_urls: urls, seed, output_format: 'jpeg', aspect_ratio: '1:1', num_images: 1,
  ...(/nano-banana-(2|pro)/.test(model) ? { resolution: res } : {}), ...(/nano-banana-2\.1/.test(model) ? { thinking_level: process.env.FAL_THINKING || 'medium' } : {}),
});
const okMut = (m: string) => m === A.BASE || !!A.mutationOf(m);
export async function spotPic(sp: string, mutId: string, spotId: string, srcId: string, origin: string): Promise<Out> {
  const spot = P.spotOf(spotId);
  if (!spot || !A.isPictureId(srcId) || !okMut(mutId) || !(await hasImage(srcId))) return { status: 'invalid' };
  const m = falModels(), model = m.outfit, res = m.outfitRes, cost = falCost(model, 1024, 1024, res);
  const prompt = P.spotPicPrompt(C.SPECIES_EN[sp] || 'a fantasy creature', spot);
  const id = sha('spotpic', sp, mutId, spot.id, srcId, model, res, prompt);
  return launch(id, cost, async (pay) => {
    const creature = await readImage(srcId);
    if (!creature) throw new Error('the creature picture is gone');
    // the window of the background: asked from the site itself (its disk may not hold public/), cut to the square of the spot
    const r = await fetch(new URL(A.bgPath(P.BG.id), origin), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`background ${P.BG.id}: ${r.status}`);
    const sharp = (await import('sharp')).default;
    const win = await sharp(Buffer.from(await r.arrayBuffer())).extract(P.cropBox(spot)).jpeg({ quality: 92 }).toBuffer();
    const { fal } = await import('@fal-ai/client');
    const urls = [await upload(fal, { data: win, ext: 'jpg' }), await upload(fal, creature)];
    const seed = seedOf(`${sp}#${mutId}#${spot.id}`);
    const res2: any = await withTimeout(fal.subscribe(model, { input: picInput(model, prompt, urls, seed, res) }), 150000, 'fal ' + model);
    const img = res2?.data?.images?.[0];
    if (!img?.url) throw new Error('fal: no image in result');
    const buf = await download(img.url);
    await pay(cost);
    return { buf, ext: 'jpg', kind: 'spotpic', meta: { spec: { kind: 'spotpic', sp, mut: mutId, spot: spot.id, src: srcId }, model, prompt, seed, cost } };
  });
}
export async function spotClip(sp: string, mutId: string, spotId: string, picId: string): Promise<Out> {
  const spot = P.spotOf(spotId);
  if (!spot || !A.isPictureId(picId) || !okMut(mutId) || !(await hasImage(picId))) return { status: 'invalid' };
  const model = animModel(), seconds = animSeconds(), prompt = P.spotClipPrompt(spot), cost = A.clipCost(model, seconds);
  const id = sha('spotclip', picId, model, seconds, prompt);
  return launch(id, cost, async (pay) => {
    const pic = await readImage(picId);
    if (!pic) throw new Error('the spot picture is gone');
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, pic);
    const res: any = await withTimeout(fal.subscribe(model, { input: A.clipInput(model, { prompt, imageUrl: url, seconds }) }), 270000, 'fal ' + model);
    const v = res?.data?.video;
    if (!v?.url) throw new Error('fal: no video in result');
    const buf = await download(v.url);
    await pay(cost);
    if (!isMp4(buf)) throw new Error('not an mp4 file');
    return { buf, ext: 'mp4', kind: 'spotclip', meta: { spec: { kind: 'spotclip', sp, mut: mutId, spot: spot.id, src: picId }, model, prompt, seconds, cost, requestId: res?.requestId } };
  });
}
// The background's own clip (kind 'bgclip'): the whole picture moving, once for all.
const bgSeconds = () => (process.env.FAL_BG_SECONDS === '5' ? 5 : P.BG_SECONDS);
export async function bgClip(origin: string): Promise<Out> {
  const model = animModel(), seconds = bgSeconds(), prompt = P.bgClipPrompt(), cost = A.clipCost(model, seconds);
  const id = sha('bgclip', P.BG.id, model, seconds, prompt);
  return launch(id, cost, async (pay) => {
    const r = await fetch(new URL(A.bgPath(P.BG.id), origin), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`background ${P.BG.id}: ${r.status}`);
    const { fal } = await import('@fal-ai/client');
    const url = await upload(fal, { data: Buffer.from(await r.arrayBuffer()), ext: A.bgExt(P.BG.id) });
    const res: any = await withTimeout(fal.subscribe(model, { input: A.clipInput(model, { prompt, imageUrl: url, seconds }) }), 270000, 'fal ' + model);
    const v = res?.data?.video;
    if (!v?.url) throw new Error('fal: no video in result');
    const buf = await download(v.url);
    await pay(cost);
    if (!isMp4(buf)) throw new Error('not an mp4 file');
    return { buf, ext: 'mp4', kind: 'bgclip', meta: { spec: { kind: 'bgclip', bg: P.BG.id }, model, prompt, seconds, cost, requestId: res?.requestId } };
  });
}
export async function bgClipOf(): Promise<{ id: string; url?: string } | null> {
  const r = (await query<{ id: string; url: string | null }>(`SELECT id, meta->'blob'->>'url' AS url FROM images WHERE kind = 'bgclip' AND meta->'spec'->>'bg' = $1 ORDER BY created DESC LIMIT 1`, [P.BG.id])).rows[0];
  return r ? { id: r.id, ...(r.url ? { url: r.url } : {}) } : null;
}
export interface SpotAsset { id: string; kind: 'spotpic' | 'spotclip'; sp: string; mut: string; spot: string; src: string; url?: string }
export async function spotsAll(): Promise<SpotAsset[]> {
  const r = await query<{ id: string; kind: 'spotpic' | 'spotclip'; spec: any; url: string | null }>(
    `SELECT id, kind, meta->'spec' AS spec, meta->'blob'->>'url' AS url FROM images WHERE kind IN ('spotpic', 'spotclip') ORDER BY created`);
  return r.rows.filter((x) => x.spec?.sp && x.spec?.spot).map((x) => ({ id: x.id, kind: x.kind, sp: String(x.spec.sp), mut: String(x.spec.mut || A.BASE), spot: String(x.spec.spot), src: String(x.spec.src || ''), ...(x.url ? { url: x.url } : {}) }));
}
export const spotUsd = () => ({ pic: falCost(falModels().outfit, 1024, 1024, falModels().outfitRes), clip: A.clipCost(animModel(), animSeconds()), bg: A.clipCost(animModel(), bgSeconds()) });

// ---- what the lab page needs
export interface Asset { id: string; kind: 'animvar' | 'anim' | 'animcut'; mut?: string; motion?: string; src?: string; alpha?: string }
export async function assetsOf(sp: string): Promise<Asset[]> {
  const r = await query<{ id: string; kind: 'animvar' | 'anim' | 'animcut'; spec: any }>(
    `SELECT id, kind, meta->'spec' AS spec FROM images WHERE kind IN ('animvar', 'anim', 'animcut') AND meta->'spec'->>'sp' = $1 ORDER BY created`, [sp]);
  return r.rows.map((x) => ({ id: x.id, kind: x.kind, mut: x.spec?.mut, motion: x.spec?.motion, src: x.spec?.src || x.spec?.base, alpha: x.spec?.alpha }));
}
// Every cut-out creature of every species, for the scene page.
export async function cutsAll() {
  const r = await query<{ id: string; spec: any }>(`SELECT id, meta->'spec' AS spec FROM images WHERE kind = 'animcut' ORDER BY created`);
  return r.rows.filter((x) => x.spec?.alpha && x.spec?.sp).map((x) => ({ id: x.id, alpha: String(x.spec.alpha), sp: String(x.spec.sp), mut: String(x.spec.mut || A.BASE), motion: String(x.spec.motion || '') }));
}
// how much of the lab's video is in Blob (the free plan holds 1 GB)
async function blobMb(): Promise<number> {
  try { return Math.round(Number((await query<{ n: number }>(`SELECT COALESCE(SUM((meta->'blob'->>'size')::bigint), 0)::float8 AS n FROM images WHERE meta ? 'blob'`)).rows[0]?.n || 0) / 1048576 * 10) / 10; } catch { return 0; }
}
export async function info() {
  return { blob: { on: blobOn(), mb: await blobMb() }, enabled: falReady(), provider: provider().name, model: animModel(), cutModel: cutModel(), seconds: animSeconds(), editUsd: editCost(), spent: r4(await labSpent()), cap: labCap() };
}
