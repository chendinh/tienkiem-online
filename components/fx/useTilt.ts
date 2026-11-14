'use client';
import { useEffect, type RefObject } from 'react';
import { useFx } from './FxProvider';

// Pointer tilt for a card: writes four CSS variables (--rx --ry --mx --my) that app/ds/game.css turns into a 3D lean and a moving glare.
// No React state, so moving the mouse never re-renders anything. Switched off for fx=off/low and for touch.
export function useTilt(ref: RefObject<HTMLElement | null>, max = 5) {
  const { level } = useFx();
  useEffect(() => {
    const el = ref.current; if (!el || (level !== 'mid' && level !== 'high')) return;
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0; const r = el.getBoundingClientRect();
      const nx = (px - r.left) / r.width, ny = (py - r.top) / r.height;
      el.style.setProperty('--rx', `${((nx - 0.5) * 2 * max).toFixed(2)}deg`); el.style.setProperty('--ry', `${(-(ny - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`); el.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
    };
    const move = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; el.classList.add('tilting'); if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { cancelAnimationFrame(raf); raf = 0; el.classList.remove('tilting'); ['--rx', '--ry'].forEach((k) => el.style.setProperty(k, '0deg')); el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '28%'); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); };
  }, [ref, level, max]);
}
