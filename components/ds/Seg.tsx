'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// Segmented control and tabs whose highlight slides to the chosen button with a spring (styles in app/ds/controls.css).
// Before the first measurement the plain .on style shows, so there is no flash.
type Opt<T> = { v: T; label: ReactNode; title?: string };

function useIndicator(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const measure = () => { const el = ref.current?.querySelector('button.on') as HTMLElement | null; if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth }); };
  useLayoutEffect(measure, [dep]);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const ro = new ResizeObserver(measure); ro.observe(node);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);
  return { ref, ind };
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label?: string }) {
  const { ref, ind } = useIndicator(value);
  return (
    <div ref={ref} className={`seg ${ind ? 'has-ind' : ''}`} role="group" aria-label={label} style={ind ? ({ '--x': `${ind.x}px`, '--w': `${ind.w}px` } as CSSProperties) : undefined}>
      {ind && <i className="seg-ind" />}
      {options.map((o) => <button key={String(o.v)} type="button" className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} title={o.title} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; label?: string }) {
  const { ref, ind } = useIndicator(value);
  return (
    <div ref={ref} className={`tabs ${ind ? 'has-ind' : ''}`} role="tablist" aria-label={label} style={ind ? ({ '--x': `${ind.x}px`, '--w': `${ind.w}px` } as CSSProperties) : undefined}>
      {options.map((o) => <button key={o.v} type="button" role="tab" aria-selected={o.v === value} className={o.v === value ? 'on' : ''} title={o.title} onClick={() => onChange(o.v)}>{o.label}</button>)}
      {ind && <i className="tab-ind" />}
    </div>
  );
}
