'use client';
import { useEffect, useRef } from 'react';

// The moving background. The clip is made WITHOUT pinning its last frame to the first (pinned, the video model barely moves anything), so it does not loop by itself.
// Two copies of the same video play half a clip apart; the one on top fades in and out (sin², so the two always add up to a whole picture) and its jump back to the start
// happens while it is invisible. Plays only while on screen, muted and inline for iOS, and not at all when the system asks for less motion.
export function BgLoop({ src, label }: { src: string; label?: string }) {
  const top = useRef<HTMLVideoElement>(null), under = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const a = top.current, b = under.current;
    if (!a || !b) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, seeded = false;
    const frame = () => {
      const d = a.duration;
      if (d > 0 && b.readyState >= 1) {
        if (!seeded) { b.currentTime = d / 2; seeded = true; }
        else {
          const want = (a.currentTime + d / 2) % d, gap = Math.abs(b.currentTime - want);
          if (Math.min(gap, d - gap) > 0.35) b.currentTime = want;   // keep them half a clip apart
        }
        const s = Math.sin((Math.PI * a.currentTime) / d);
        a.style.opacity = String(Math.min(1, s * s));
      }
      raf = requestAnimationFrame(frame);
    };
    const go = () => { a.play().catch(() => {}); b.play().catch(() => {}); if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { a.pause(); b.pause(); cancelAnimationFrame(raf); raf = 0; };
    if (typeof IntersectionObserver === 'undefined') { go(); return stop; }
    const io = new IntersectionObserver((es) => { for (const e of es) (e.isIntersecting ? go : stop)(); }, { threshold: 0.25 });
    io.observe(a);
    return () => { io.disconnect(); stop(); };
  }, [src]);
  return (
    <>
      <video ref={under} src={src} muted loop playsInline preload="auto" aria-hidden="true" />
      <video ref={top} src={src} muted loop playsInline preload="auto" aria-label={label} style={{ opacity: 0 }} />
    </>
  );
}
