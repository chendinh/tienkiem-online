'use client';
import { useEffect, useRef, useState } from 'react';

// A looping clip that plays only while it is on screen (a phone decodes several videos at once badly), and stays a still picture with
// player controls when the system asks for less motion. Muted and inline: iOS refuses to start any other video by itself.
export function LoopVideo({ src, poster, label }: { src: string; poster?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCalm(still);
    if (still || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); } }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} className="zl-video" src={src} poster={poster} muted loop playsInline preload="metadata" controls={calm} aria-label={label} />;
}
