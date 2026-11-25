'use client';
import { useEffect, useState, type ReactNode } from 'react';
import * as C from '@/lib/content';
import { cutOut } from '@/lib/cutbrowser';

// A picture of the interface drawn by AI on black, shown without its black. Two ways to get there, whichever the game has:
//   1. the cut-out file `npm run thumbs` makes for a picture shipped in the build (public/art/ui/cut/{id}.png, see lib/content.ts cutArt), or
//   2. the drawn picture itself (/art/ui/{id}.jpg, which is also what the owner's page makes: the server keeps it in the database and sends it from the same address),
//      cut here in the browser once (lib/cutout.ts) and kept for as long as the page is open.
// Until one of them works `fb` is shown, and a picture that failed both ways is not asked for again.
const BAD = new Set<string>();            // failed both ways
const NOCUT = new Set<string>();          // there is no cut-out file (so the others do not ask for it again)
const MADE = new Map<string, string>();   // id -> the cut-out this page made
const MAKING = new Map<string, Promise<string | null>>();
function make(id: string): Promise<string | null> {
  const had = MAKING.get(id);
  if (had) return had;
  const p = cutOut(C.uiArt(id));
  MAKING.set(id, p);
  p.then((u) => { if (u) MADE.set(id, u); else BAD.add(id); });
  return p;
}

const first = (id: string): string | null => (BAD.has(id) ? null : MADE.get(id) ?? (NOCUT.has(id) ? null : C.cutArt(id)));

export function CutImg({ id, className, fb }: { id: string; className?: string; fb: ReactNode }) {
  const [src, setSrc] = useState<string | null>(() => first(id));
  useEffect(() => {
    if (src || BAD.has(id)) return;
    let live = true;
    make(id).then((u) => { if (live && u) setSrc(u); });
    return () => { live = false; };
  }, [src, id]);
  if (!src) return <>{fb}</>;
  return <img className={className} src={src} alt="" draggable={false} decoding="async" onError={() => { if (src === C.cutArt(id)) NOCUT.add(id); else BAD.add(id); setSrc(null); }} />;
}
