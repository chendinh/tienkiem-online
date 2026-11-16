'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useFx } from './FxProvider';

// The world behind the interface (styles in app/ds/atmosphere.css): a painted scene that follows the mode (dawn while wandering,
// night while in seclusion), an aura tint from the hero's element, drifting mist, and a canvas of qi motes.
// The pointer moves the scene a few pixels (parallax). Everything stops when the tab is hidden and at fx=off.
const COUNT = { off: 0, low: 14, mid: 44, high: 78 } as const;
type Mote = { x: number; y: number; vy: number; amp: number; ph: number; tw: number; size: number; col: number };

const ZONE_IDS = ['thanhvan', 'hannguyet', 'xichviem', 'loivan', 'cuuu'] as const;

export function Atmosphere({ scene = 'night', aura = '#62cfae', zone }: { scene?: 'night' | 'dawn'; aura?: string; zone?: string }) {
  const { level } = useFx();
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const auraRef = useRef(aura);
  useEffect(() => { auraRef.current = aura; }, [aura]);

  // pointer parallax: write two CSS variables, the stylesheet does the moving
  useEffect(() => {
    const el = root.current; if (!el || (level !== 'mid' && level !== 'high')) { el?.style.setProperty('--px', '0'); el?.style.setProperty('--py', '0'); return; }
    let raf = 0, nx = 0, ny = 0;
    const apply = () => { raf = 0; el.style.setProperty('--px', nx.toFixed(3)); el.style.setProperty('--py', ny.toFixed(3)); };
    const move = (e: PointerEvent) => { nx = (e.clientX / window.innerWidth - 0.5) * 2; ny = (e.clientY / window.innerHeight - 0.5) * 2; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [level]);

  // qi motes
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const n = COUNT[level]; const g = c.getContext('2d'); if (!g) return;
    let w = 0, h = 0, raf = 0, last = 0, acc = 0; const step = level === 'high' ? 0 : level === 'mid' ? 1000 / 30 : 1000 / 12;
    const fit = () => { w = c.width = Math.round(window.innerWidth * 0.75); h = c.height = Math.round(window.innerHeight * 0.75); };
    fit(); window.addEventListener('resize', fit);
    const sprites = new Map<string, HTMLCanvasElement>();
    const spr = (col: string) => {
      let s = sprites.get(col);
      if (!s) { s = document.createElement('canvas'); s.width = s.height = 32; const x = s.getContext('2d')!; const r = x.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(0.2, col); r.addColorStop(0.6, col + '55'); r.addColorStop(1, col + '00'); x.fillStyle = r; x.fillRect(0, 0, 32, 32); sprites.set(col, s); }
      return s;
    };
    const motes: Mote[] = Array.from({ length: n }, (_, i) => ({ x: ((i * 0.6180339) % 1), y: ((i * 0.4142135 + 0.2) % 1), vy: 0.012 + ((i * 7) % 11) / 11 * 0.03, amp: 6 + (i % 5) * 5, ph: i * 1.7, tw: 0.8 + (i % 4) * 0.5, size: 5 + (i % 6) * 2.4, col: i % 3 }));
    const pal = () => ['#eed08a', '#8ee6c8', auraRef.current];
    const draw = (t: number, dt: number) => {
      g.clearRect(0, 0, w, h); g.globalCompositeOperation = 'lighter'; const p = pal();
      for (const m of motes) {
        m.y -= m.vy * dt; if (m.y < -0.05) { m.y = 1.05; m.x = (m.x + 0.37) % 1; }
        const a = 0.18 + 0.5 * Math.pow(Math.sin(t * 0.001 * m.tw + m.ph), 2);
        g.globalAlpha = a; const s = m.size * (w / 1100 + 0.5);
        g.drawImage(spr(p[m.col]), m.x * w + Math.sin(t * 0.0006 + m.ph) * m.amp - s / 2, m.y * h - s / 2, s, s);
      }
      g.globalAlpha = 1;
    };
    if (!n) { g.clearRect(0, 0, w, h); return () => window.removeEventListener('resize', fit); }
    if (level === 'low') draw(0, 0);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.1, (now - last) / 1000 || 0.016); acc += now - last; last = now;
      if (level === 'low') { if (acc < step) return; acc = 0; draw(now, dt * 5); return; }
      if (step && acc < step) return; acc = 0; draw(now, dt);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); };
  }, [level]);

  return (
    <div ref={root} className="atmo" style={{ '--aura': aura } as CSSProperties} aria-hidden="true">
      <div className={`atmo-scene night ${!zone && scene === 'night' ? 'on' : ''}`} />
      <div className={`atmo-scene dawn ${!zone && scene === 'dawn' ? 'on' : ''}`} />
      {ZONE_IDS.map((id) => <div key={id} className={`atmo-scene zone z-${id} ${scene} ${zone === id ? 'on' : ''}`} />)}
      <div className="atmo-tint" />
      <div className="atmo-mist a" />
      <div className="atmo-mist b" />
      <canvas ref={cv} className="atmo-motes" />
      <div className="atmo-vignette" />
      <div className="atmo-grain" />
    </div>
  );
}
