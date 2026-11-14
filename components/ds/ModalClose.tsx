'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// The close seal of every window: a jade and gold seal (an AI picture) with a brushed cross, pinned to the top-right corner of the window.
// The window body scrolls, so the seal is NOT inside it: it lives in the dark overlay next to the body and follows the body's corner, which keeps it
// in reach however far the content is scrolled. Esc closes the window on top (only the last one that is open).
export function XSeal({ size = 40 }: { size?: number }) {
  // the jade and gold disc behind it is a picture (public/art/ui/cut/seal_a.png, set in game.css); this draws the brushed cross on it
  return (
    <svg className="xSeal" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs><linearGradient id="xg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1c8" /><stop offset="0.5" stopColor="#e2b85a" /><stop offset="1" stopColor="#9a6a18" /></linearGradient></defs>
      <path d="M13 13c2.4 2.2 4.8 4.6 7 6.8s4.8 4.6 7 6.8" fill="none" stroke="#0a1e1c" strokeOpacity="0.7" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M27 13c-2.2 2.4-4.6 4.8-6.8 7s-4.6 4.8-6.8 7" fill="none" stroke="#0a1e1c" strokeOpacity="0.7" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M13 13c2.4 2.2 4.8 4.6 7 6.8s4.8 4.6 7 6.8" fill="none" stroke="url(#xg)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M27 13c-2.2 2.4-4.6 4.8-6.8 7s-4.6 4.8-6.8 7" fill="none" stroke="url(#xg)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.6" fill="#fff1c8" />
    </svg>
  );
}

const open: symbol[] = [];   // the windows that are open now, the last one is on top

export function ModalClose({ onClose, label = 'Đóng' }: { onClose: () => void; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ l: number; t: number } | null>(null);
  const cb = useRef(onClose); cb.current = onClose;
  useLayoutEffect(() => {
    const btn = ref.current, overlay = btn && btn.parentElement, body = overlay && overlay.querySelector<HTMLElement>('.modalBody');
    if (!btn || !overlay || !body) { setPos({ l: 0, t: 0 }); return; }
    // layout offsets, not bounding boxes: the window grows in with a scale animation and the seal must not follow that
    const place = () => setPos({ l: Math.max(8, Math.min(body.offsetLeft + body.offsetWidth - 26, overlay.clientWidth - 50)), t: Math.max(6, body.offsetTop - 16) });
    place();
    const ro = new ResizeObserver(place); ro.observe(body); ro.observe(overlay);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const id = Symbol('window'); open.push(id);
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && open[open.length - 1] === id) { e.stopPropagation(); cb.current(); } };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); const i = open.indexOf(id); if (i >= 0) open.splice(i, 1); };
  }, []);
  return (
    <button ref={ref} type="button" className="xClose" style={pos ? { left: pos.l, top: pos.t } : { visibility: 'hidden' }} aria-label={label} title={`${label} (Esc)`} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <XSeal />
    </button>
  );
}
