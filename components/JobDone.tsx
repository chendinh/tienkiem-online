'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './ds/Icon';
import { fmt } from './ui';

// The moment a job (Công việc) is handed over in full: a green seal "Hoàn thành" is stamped on the card and says what came of it, for about three seconds.
// It starts in the SAME screen update as the hand-over (the card that asks for it knows the job is complete before the rules answer), and the sound waits for the first paint of it.
// The card of the slot stays where it is (the lists are keyed by slot, not by buyer), so the server's new buyer takes its place under the seal and shows when the seal fades.
// The seal is a plain overlay that only enters, so with motion switched off it simply shows, and the timers below remove it.
export interface Fin { stones: number; gift?: string; rank?: string; leaving?: boolean; n?: number }
const SHOW = 2800, FADE = 500;
const MOTES = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + 0.3, d = 64 + (i % 3) * 18; return { dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d), delay: 0.28 + (i % 3) * 0.05 }; });

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
  /** Change what the seal of a slot says (the real figures came after it started); it does not start over. */
  const patch = useCallback((slot: number, f: Partial<Fin>) => setFin((cur) => (cur[slot] ? { ...cur, [slot]: { ...cur[slot], ...f } } : cur)), []);
  /** Take the seal of a slot away at once (the hand-over was refused after all). */
  const clear = useCallback((slot: number) => setFin((cur) => { if (!cur[slot]) return cur; const c = { ...cur }; delete c[slot]; return c; }), []);
  return { fin, mark, patch, clear };
}
/** A sound and a floating line for something that was just drawn: they wait for the next paint, so the picture is never held back by building audio nodes. */
export const afterPaint = (f: () => void) => { if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => f()); else f(); };

export function DoneSeal({ f }: { f: Fin }) {
  return (
    <div className={`jobSeal${f.leaving ? ' leaving' : ''}`} role="status" aria-live="polite">
      <div className="sealMark"><i className="sealRing" aria-hidden="true" /><Icon name="check" size={22} /><b>Hoàn thành</b></div>
      <div className="sealGain">
        <span><Icon name="stone" size={15} /> +{fmt(f.stones)} Linh Thạch</span>
        {f.gift && <span>+ {f.gift}</span>}
        {f.rank && <span className="sealRank"><Icon name="rise" size={15} /> Lên bậc {f.rank}</span>}
      </div>
      {MOTES.map((m, i) => <i key={i} className="sealMote" aria-hidden="true" style={{ '--dx': `${m.dx}px`, '--dy': `${m.dy}px`, animationDelay: `${m.delay}s` } as CSSProperties} />)}
    </div>
  );
}
