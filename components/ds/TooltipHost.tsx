'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Turns every native title="" tooltip into the game's own (styles: .tip in controls.css). One listener for the whole app, so no
// component changes. While a tip shows, the title attribute is parked so the browser does not draw its own, then restored.
// It shows for mouse hover and keyboard focus, never for a mouse click, and it is placed after measuring so it stays inside the screen.
export function TooltipHost() {
  const [tip, setTip] = useState<{ text: string; ax: number; ay: number; below: boolean } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const cur = useRef<{ el: HTMLElement; title: string } | null>(null);
  const timer = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hide = () => {
      window.clearTimeout(timer.current); timer.current = 0;
      const c = cur.current; if (c) { c.el.setAttribute('title', c.title); cur.current = null; }
      setTip(null); setPos(null);
    };
    const show = (el: HTMLElement, title: string) => {
      cur.current = { el, title }; el.removeAttribute('title');
      const r = el.getBoundingClientRect(); const below = r.top < 90;
      setTip({ text: title, ax: r.left + r.width / 2, ay: below ? r.bottom + 10 : r.top - 10, below });
    };
    const over = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const el = t?.closest?.('[title]') as HTMLElement | null;
      if (!el || el === cur.current?.el) return;
      if (e.type === 'focusin' && !el.matches(':focus-visible')) return;   // a mouse click focuses a button: no tip for that
      hide();
      const title = el.getAttribute('title'); if (!title) return;
      timer.current = window.setTimeout(() => show(el, title), e.type === 'focusin' ? 0 : 380);
    };
    const out = (e: Event) => {
      const c = cur.current; const t = e.target as HTMLElement | null;
      if (!c && !timer.current) return;
      if (!c || (t && (t === c.el || c.el.contains(t)))) hide();
    };
    document.addEventListener('pointerover', over, true); document.addEventListener('pointerout', out, true);
    document.addEventListener('focusin', over, true); document.addEventListener('focusout', out, true);
    document.addEventListener('pointerdown', hide, true); window.addEventListener('scroll', hide, true); window.addEventListener('blur', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', over, true); document.removeEventListener('pointerout', out, true);
      document.removeEventListener('focusin', over, true); document.removeEventListener('focusout', out, true);
      document.removeEventListener('pointerdown', hide, true); window.removeEventListener('scroll', hide, true); window.removeEventListener('blur', hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tip || !box.current) return;
    const w = box.current.offsetWidth, h = box.current.offsetHeight, vw = window.innerWidth;
    setPos({ left: Math.min(Math.max(8, tip.ax - w / 2), vw - w - 8), top: tip.below ? tip.ay : Math.max(8, tip.ay - h) });
  }, [tip]);

  if (!tip) return null;
  return <div ref={box} className="tip" role="tooltip" style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}>{tip.text}</div>;
}
