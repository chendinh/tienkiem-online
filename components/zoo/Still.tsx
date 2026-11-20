'use client';
import { ASPECT, frameOf, type Box, type Placed } from '@/lib/garden';

const pc = (n: number) => `${n}%`;
export interface StillPic { id: string; url: string; box: Box }

// One creature of the pen shown as a still cut-out picture (the "tĩnh" option): the same place, size, shadow and mirror as a clip (components/lab/Creature.tsx), but the picture
// only breathes a little on the page, stretching up from its feet. Its box was measured when it was made, so there is nothing to wait for.
export function StillCreature({ s, it, size, z, paused = false }: { s: StillPic; it: Pick<Placed, 'x' | 'y' | 'flip'>; size: number; z: number; paused?: boolean }) {
  const f = frameOf(s.box, it, size, ASPECT), b = s.box;
  return (
    <>
      <div className="zs-shadow" style={{ left: pc(f.shadow.left), top: pc(f.shadow.top), width: pc(f.shadow.width), height: pc(f.shadow.height), zIndex: z }} />
      <div className="zs-cr" style={{ left: pc(f.left), top: pc(f.top), width: pc(f.width), height: pc(f.height), zIndex: z + 1, transform: it.flip ? 'scaleX(-1)' : undefined, transformOrigin: `${f.pivot}% 50%` }}>
        <img className="zs-still" src={s.url} alt="" draggable={false}
          style={{ transformOrigin: `${pc(((b.x0 + b.x1) / 2) * 100)} ${pc(b.y1 * 100)}`, animationPlayState: paused ? 'paused' : 'running', animationDelay: `${-(s.id.charCodeAt(0) % 7)}s` }} />
      </div>
    </>
  );
}
