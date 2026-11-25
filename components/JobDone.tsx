'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './ds/Icon';
import { fmt } from './ui';

// The moment a job (Công việc) is handed over in full: a red seal "Hoàn thành" is stamped on the card and says what came of it, for about three seconds.
// The card of the slot stays where it is (the lists are keyed by slot, not by buyer), so the server's new buyer takes its place under the seal and shows when the seal fades.
// The seal is a plain overlay that only enters, so with motion switched off it simply shows, and the timers below remove it.
export interface Fin { stones: number; gift?: string; leaving?: boolean; n?: number }
const SHOW = 2800, FADE = 500;
const MOTES = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + 0.3, d = 62 + (i % 3) * 18; return { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d), delay: 0.28 + (i % 4) * 0.04 }; });

/** The finished slots of a list: `mark(slot, fin)` starts the seal on that slot, `fin[slot]` is what to show (a second mark on the same slot starts it over). */
export function useFin() {
  const [fin, setFin] = useState<Record<number, Fin>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = useRef(0);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const mark = useCallback((slot: number, f: Fin) => {
    const n = ++seq.current;
    setFin((cur) => ({ ...cur, [slot]: { ...f, n } }));
    timers.current.push(
      setTimeout(() => setFin((cur) => (cur[slot]?.n === n ? { ...cur, [slot]: { ...cur[slot], leaving: true } } : cur)), SHOW),
      setTimeout(() => setFin((cur) => { if (cur[slot]?.n !== n) return cur; const c = { ...cur }; delete c[slot]; return c; }), SHOW + FADE),
    );
  }, []);
  return { fin, mark };
}

export function DoneSeal({ f }: { f: Fin }) {
  return (
    <div className={`jobSeal${f.leaving ? ' leaving' : ''}`} role="status" aria-live="polite">
      <div className="sealMark"><i className="sealRing" aria-hidden="true" /><Icon name="check" size={22} /><b>Hoàn thành</b></div>
      <div className="sealGain">
        <span><Icon name="stone" size={15} /> +{fmt(f.stones)} Linh Thạch</span>
        {f.gift && <span>+ {f.gift}</span>}
      </div>
      {MOTES.map((m, i) => <i key={i} className="sealMote" aria-hidden="true" style={{ '--dx': `${m.dx}px`, '--dy': `${m.dy}px`, animationDelay: `${m.delay}s` } as CSSProperties} />)}
    </div>
  );
}
