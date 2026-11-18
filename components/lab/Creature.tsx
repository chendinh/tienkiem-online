'use client';
import { useEffect, useRef, useState } from 'react';
import { ASPECT, frameOf, type Box, type Placed } from '@/lib/garden';
import { AlphaVideo } from './AlphaVideo';

export const mediaUrl = (id: string, url?: string) => url || `/api/lab/media/${id}`;
const pc = (n: number) => `${n}%`;

// alive: the picture also breathes and sways a little on the page (AlphaVideo's `breathe`), on top of what the video does.
// One creature on the stage: its cut-out video, played only while it is on the screen. Its box is measured from the first picture, so that its FEET (not the empty
// margin of its picture) stand on the point it was dropped on; until then it is invisible.
export function Creature({ c, it, size, box, onBox, onFail, z, paused = false, alive = false }: { c: { id: string; alpha: string; url?: string; alphaUrl?: string }; it: Pick<Placed, 'x' | 'y' | 'flip'>; size: number; box?: Box; onBox: (b: Box) => void; onFail: () => void; z: number; paused?: boolean; alive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(true), [ever, setEver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setEver(true); return; }
    const io = new IntersectionObserver(([e]) => { setSeen(e.isIntersecting); if (e.isIntersecting) setEver(true); }, { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const f = frameOf(box || { x0: 0.1, y0: 0.05, x1: 0.9, y1: 1 }, it, size, ASPECT);
  return (
    <>
      {box && <div className="zs-shadow" style={{ left: pc(f.shadow.left), top: pc(f.shadow.top), width: pc(f.shadow.width), height: pc(f.shadow.height), zIndex: z }} />}
      <div ref={ref} className="zs-cr" style={{ left: pc(f.left), top: pc(f.top), width: pc(f.width), height: pc(f.height), zIndex: z + 1, opacity: box ? 1 : 0, transform: it.flip ? 'scaleX(-1)' : undefined, transformOrigin: `${f.pivot}% 50%` }}>
        {ever && <AlphaVideo rgb={mediaUrl(c.id, c.url)} alpha={mediaUrl(c.alpha, c.alphaUrl)} playing={seen && !paused} onBox={box ? undefined : onBox} onFail={onFail} breathe={alive && box ? { x: (box.x0 + box.x1) / 2, y: box.y1 } : undefined} />}
      </div>
    </>
  );
}

