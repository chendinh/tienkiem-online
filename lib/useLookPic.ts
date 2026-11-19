'use client';
import { useEffect, useState } from 'react';
import { lookOf } from './zoo';

// The picture of a Dị Biến beast's look (Ngọc Bích, Hỏa Linh ...), drawn once for everybody. undefined: use the game's own picture (an ordinary beast, Ngũ Sắc, or not drawn yet).
// Pictures that exist are fetched in one batch (a pen may show many beasts). `mine`: the beast is the player's own, so a missing picture is ordered and waited for.
interface Entry { url?: string; looked: boolean; ordering: boolean; tries: number; subs: Set<() => void> }
const cache = new Map<string, Entry>();
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
const note = (e: Entry) => e.subs.forEach((f) => f());
// A picture is used only once it has really loaded; otherwise the game's own picture stays (a broken address must never blank a beast).
const verify = (u: string) => new Promise<boolean>((res) => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = u; });

function flush() {
  timer = null;
  const keys = [...queue].slice(0, 60); keys.forEach((k) => queue.delete(k));
  if (queue.size) timer = setTimeout(flush, 30);
  fetch(`/api/zoo?pics=${encodeURIComponent(keys.join(','))}`, { cache: 'no-store' }).then((r) => r.json()).then((j) => {
    return Promise.all(keys.map(async (k) => { const e = cache.get(k); if (!e) return; const u = j?.ok && j.pics?.[k]; if (u && (await verify(u))) e.url = u; e.looked = true; note(e); }));
  }).catch(() => keys.forEach((k) => { const e = cache.get(k); if (e) { e.looked = true; note(e); } }));
}

async function order(k: string, beast: number) {
  const e = cache.get(k);
  if (!e || e.ordering) return;
  e.ordering = true;
  try {
    while (!e.url && e.tries++ < 60 && e.subs.size > 0) {
      const r = await fetch('/api/zoo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'portrait', beast }) });
      const j = await r.json().catch(() => ({}));
      if (j.status === 'ready') { if (j.url && (await verify(j.url))) { e.url = j.url; note(e); } break; }
      if (j.status !== 'making') break;   // failed, limited, disabled: the game's own picture stays
      await new Promise((res) => setTimeout(res, 6000));
    }
  } catch { /* the game's own picture stays */ }
  e.ordering = false;
}

export function useLookPic(b: { sp: string; id: number; mut?: boolean } | null | undefined, mine = false): string | undefined {
  const look = lookOf(b), key = look && look !== 'ngusac' ? `${b!.sp}:${look}` : '';
  const [, force] = useState(0);
  useEffect(() => {
    if (!key) return;
    let e = cache.get(key);
    if (!e) { e = { looked: false, ordering: false, tries: 0, subs: new Set() }; cache.set(key, e); }
    const cb = () => force((x) => x + 1);
    e.subs.add(cb);
    if (!e.looked && !e.url) { queue.add(key); if (!timer) timer = setTimeout(flush, 30); }
    if (e.looked && !e.url && mine) void order(key, b!.id);
    if (!e.looked && mine) { const t = setInterval(() => { const x = cache.get(key); if (x?.looked) { clearInterval(t); if (!x.url) void order(key, b!.id); } }, 400); return () => { clearInterval(t); e!.subs.delete(cb); }; }
    return () => { e!.subs.delete(cb); };
  }, [key, mine]);   // eslint-disable-line react-hooks/exhaustive-deps
  return key ? cache.get(key)?.url : undefined;
}
