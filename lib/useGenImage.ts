'use client';
import { useEffect, useState } from 'react';

export type GenStatus = 'pending' | 'ready' | 'failed' | 'limited' | 'disabled';
interface Entry { status: GenStatus; url?: string; crop?: number; tries: number; subs: Set<() => void> }
const cache = new Map<string, Entry>();
let cfgP: Promise<{ enabled: boolean; provider?: string }> | null = null;
export const genConfig = () => cfgP || (cfgP = fetch('/api/image').then((r) => r.json()).catch(() => { cfgP = null; return { enabled: false }; }));
const notify = (e: Entry) => e.subs.forEach((f) => f());

async function poll(key: string, spec: any, pri: number) {
  const e = cache.get(key);
  if (!e) return;
  const c = await genConfig();
  if (!c.enabled) { e.status = 'disabled'; return notify(e); }
  try {
    const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...spec, pri }) });
    const j = await r.json();
    if (j.status === 'ready') { e.status = 'ready'; e.url = j.url; e.crop = j.crop; return notify(e); }
    if (j.status === 'pending' && ++e.tries < 120) {
      return void setTimeout(() => {
        if (cache.get(key) !== e) return;
        if (e.subs.size === 0) { cache.delete(key); return; } // nobody is looking any more
        poll(key, spec, pri);
      }, 4000 + Math.random() * 2500);
    }
    e.status = j.status === 'limited' ? 'limited' : 'failed'; notify(e);
  } catch { e.status = 'failed'; notify(e); }
  setTimeout(() => { if (cache.get(key) === e) cache.delete(key); }, 120000);
}

// `nonce` makes a fresh request for the same spec (a new click after a failure); it is not sent to the server.
export function useGenImage(spec: any | null, pri = 2, nonce = 0): { status: 'off' | GenStatus; url?: string; crop?: number } {
  const key = spec ? `${JSON.stringify(spec)}#${nonce}` : '';
  const [, force] = useState(0);
  useEffect(() => {
    if (!key) return;
    let e = cache.get(key);
    if (!e) { e = { status: 'pending', tries: 0, subs: new Set() }; cache.set(key, e); poll(key, spec, pri); }
    const cb = () => force((x) => x + 1);
    e.subs.add(cb);
    if (e.status !== 'pending') cb();
    return () => { e!.subs.delete(cb); };
  }, [key]);
  const e = key ? cache.get(key) : undefined;
  return e ? { status: e.status, url: e.status === 'ready' ? e.url : undefined, crop: e.crop } : { status: key ? 'pending' : 'off' };
}
