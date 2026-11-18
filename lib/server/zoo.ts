// Server side of Linh Thú Viên for players: which Dị Biến beasts a player has, which of them already have a cut-out idle clip, making the missing ones
// (once for everybody: the picture and the clip depend only on the species and the look), and the player's own layout.
import { query } from './db';
import { mutantsOf } from './service';
import { clip, cut, idle, variant, type Out } from './anim';
import { request, idFromUrl, idle as imageIdle } from '../imagegen';
import * as C from '../content';
import * as D from '../daily';
import * as A from '../anim';
import { ETA_MIN, parseZoo, variantOf, type Stage, type ZooLayout } from '../zoo';

export interface ZooBeast { id: number; sp: string; name: string; level: number; look: string }
export interface ZooCut { id: string; alpha: string; url?: string; alphaUrl?: string }
export type SummonStatus = 'ready' | 'making' | 'failed' | 'limited' | 'disabled' | 'invalid';
export interface Summon { status: SummonStatus; stage?: Stage; eta?: number; cut?: ZooCut; why?: string; started?: boolean; imgStarted?: boolean }

// the player's Dị Biến beasts, each with its look; kept for a few seconds because the page asks again and again while a clip is being made
const mem = new Map<string, { t: number; beasts: ZooBeast[] }>();
export async function beastsOf(acc: string, fresh = false): Promise<ZooBeast[] | null> {
  const hit = mem.get(acc);
  if (!fresh && hit && Date.now() - hit.t < 15000) return hit.beasts;
  const list = await mutantsOf(acc);
  if (!list) return null;
  const beasts = list.filter((b) => C.SPECIES_EN[b.sp]).map((b) => ({ id: b.id, sp: b.sp, name: b.name, level: b.level, look: variantOf(b.sp, b.id) }));
  mem.set(acc, { t: Date.now(), beasts });
  if (mem.size > 500) mem.delete(mem.keys().next().value as string);
  return beasts;
}

// the newest finished idle cut-out of each (species, look) among those asked for
export async function cutsFor(keys: { sp: string; look: string }[]): Promise<Map<string, ZooCut>> {
  const out = new Map<string, ZooCut>();
  const sps = [...new Set(keys.map((k) => k.sp))];
  if (!sps.length) return out;
  const r = await query<{ id: string; spec: any; url: string | null; aurl: string | null }>(
    `SELECT i.id, i.meta->'spec' AS spec, i.meta->'blob'->>'url' AS url, (SELECT a.meta->'blob'->>'url' FROM images a WHERE a.id = i.meta->'spec'->>'alpha') AS aurl
       FROM images i WHERE i.kind = 'animcut' AND i.meta->'spec'->>'motion' = 'idle' AND i.meta->'spec'->>'sp' = ANY($1::text[]) ORDER BY i.created`, [sps]);
  for (const x of r.rows) if (x.spec?.alpha) out.set(`${x.spec.sp}:${x.spec.mut}`, { id: x.id, alpha: String(x.spec.alpha), ...(x.url ? { url: x.url } : {}), ...(x.aurl ? { alphaUrl: x.aurl } : {}) });
  return out;
}

const speciesOk = (sp: string) => D.allSpecies().some((s) => s.id === sp) && !!C.SPECIES_EN[sp];
const why = (o: { status: string; why?: string }): Summon => (o.status === 'limited' ? { status: 'limited' } : o.status === 'disabled' ? { status: 'disabled' } : { status: 'failed', why: o.why });

// One step forward for a creature that has no cut-out yet: whichever step is missing is started (or found already running) and its stage is answered.
// The page asks again every few seconds until the answer is 'ready'; every step is saved under an id made from what went into it, so nothing is made or paid for twice.
export async function summon(sp: string, look: string): Promise<Summon> {
  if (!speciesOk(sp) || !A.mutationOf(look)) return { status: 'invalid' };
  const known = (await cutsFor([{ sp, look }])).get(`${sp}:${look}`);
  if (known) return { status: 'ready', cut: known };
  const base = await request({ kind: 'monster', sp });
  if (base.status === 'pending') return { status: 'making', stage: 'base', eta: ETA_MIN.base, imgStarted: true };
  if (base.status !== 'ready' || !base.url) return why(base);
  const baseId = idFromUrl(base.url);
  let src: string;
  if (look === 'ngusac') {
    // the rainbow look is the one the game already draws for its Dị Biến
    const r = await request({ kind: 'monster', sp, mut: true });
    if (r.status === 'pending') return { status: 'making', stage: 'variant', eta: ETA_MIN.variant, imgStarted: true };
    if (r.status !== 'ready' || !r.url) return why(r);
    src = idFromUrl(r.url);
  } else {
    const v: Out = await variant(sp, look, baseId);
    if (v.status === 'pending') return { status: 'making', stage: 'variant', eta: ETA_MIN.variant, started: !!v.started };
    if (v.status !== 'ready' || !v.id) return why(v);
    src = v.id;
  }
  const c: Out = await clip(sp, look, 'idle', src);
  if (c.status === 'pending') return { status: 'making', stage: 'clip', eta: ETA_MIN.clip, started: !!c.started };
  if (c.status !== 'ready' || !c.id) return why(c);
  const x: Out = await cut(sp, look, 'idle', c.id);
  if (x.status === 'pending') return { status: 'making', stage: 'cut', eta: ETA_MIN.cut, started: !!x.started };
  if (x.status !== 'ready' || !x.id || !x.alpha) return why(x);
  const done = (await cutsFor([{ sp, look }])).get(`${sp}:${look}`);
  return done ? { status: 'ready', cut: done } : { status: 'making', stage: 'cut', eta: 1 };
}

// ---- the player's own layout: one row of the kv table per player
const key = (acc: string) => `zoo.${acc}`;
export async function loadZoo(acc: string, own: ReadonlySet<number>): Promise<ZooLayout> {
  let raw: unknown = null;
  try { raw = (await query<{ v: unknown }>(`SELECT value AS v FROM kv WHERE key = $1`, [key(acc)])).rows[0]?.v; } catch { /* no row: an empty zoo */ }
  return parseZoo(raw, own);
}
export async function saveZoo(acc: string, raw: unknown, own: ReadonlySet<number>): Promise<ZooLayout> {
  const z = parseZoo(raw, own);
  await query(`INSERT INTO kv (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key(acc), JSON.stringify(z)]);
  return z;
}

// Run in the background after the answer is sent, by the call that started a step: when the step is done, start the next one at once, in the same function, instead of
// waiting for the page to ask again (the page asks every few seconds, and may be closed). It stops when something is not ours to wait for or the function's time is up.
export async function carryOn(sp: string, look: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await imageIdle();
    await idle();
    const o = await summon(sp, look);
    if (o.status !== 'making') return;
    if (!o.started && !o.imgStarted) return;   // another function is making it: it will carry on itself, or the page's next question will
  }
}
