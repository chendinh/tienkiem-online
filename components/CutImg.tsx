'use client';
import { useState, type ReactNode } from 'react';
import * as C from '@/lib/content';

// A picture of the interface drawn by AI on black and cut out by `npm run thumbs` (public/art/ui/cut/{id}.png, see lib/content.ts cutArt). Until the file exists `fb` is shown, and a file that
// failed once is not asked for again while the page is open.
const BAD = new Set<string>();
export function CutImg({ id, className, fb }: { id: string; className?: string; fb: ReactNode }) {
  const [bad, setBad] = useState(BAD.has(id));
  if (bad) return <>{fb}</>;
  return <img className={className} src={C.cutArt(id)} alt="" draggable={false} decoding="async" onError={() => { BAD.add(id); setBad(true); }} />;
}
