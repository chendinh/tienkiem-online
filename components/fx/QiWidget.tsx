'use client';
import { useEffect, useRef } from 'react';
import { useFx } from './FxProvider';
// The drifting qi and the slow waves, as a small fixed ornament in the corner of the header instead of a full-screen layer.
// A full-screen canvas (and large animated mist layers) repainted a surface the size of the window many times a second and was the main cost of the page;
// this one is about 100 x 40 pixels. It stops when the tab is hidden, when the window is not visible, and at fx=off.
type Mote = { x: number; y: number; vy: number; ph: number; tw: number; r: number; col: number };
const W = 104, H = 40;
export function QiWidget({ aura = '#62cfae' }: { aura?: string }) {
  const { level } = useFx();
  const cv = useRef<HTMLCanvasElement>(null), auraRef = useRef(aura);
  useEffect(() => { auraRef.current = aura; }, [aura]);
  useEffect(() => {
    const c = cv.current; if (!c || level === 'off') return;
    const g = c.getContext('2d'); if (!g) return;
    const dpr = 1;
    c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = level === 'low' ? 6 : level === 'mid' ? 11 : 16, fps = level === 'low' ? 10 : level === 'mid' ? 24 : 30;
    const motes: Mote[] = Array.from({ length: n }, (_, i) => ({ x: (i * 0.618) % 1, y: (i * 0.414 + 0.2) % 1, vy: 0.05 + ((i * 7) % 11) / 11 * 0.08, ph: i * 1.7, tw: 0.8 + (i % 4) * 0.5, r: 1.4 + (i % 3) * 0.6, col: i % 3 }));
    let raf = 0, last = 0, t0 = performance.now(), visible = true;
    const draw = (now: number, dt: number) => {
      const t = (now - t0) / 1000, pal = ['#eed08a', '#8ee6c8', auraRef.current];
      g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      // three slow waves
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let x = 0; x <= W; x += 4) { const y = H * (0.7 - k * 0.12) + Math.sin(x * 0.075 + t * (0.8 + k * 0.35) + k * 2) * (3.2 - k * 0.7); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = pal[k]; g.globalAlpha = 0.5 - k * 0.12; g.lineWidth = 1.4; g.stroke();
      }
      // motes rising out of the waves
      for (const m of motes) {
        m.y -= m.vy * dt; if (m.y < -0.05) { m.y = 1.02; m.x = (m.x + 0.37) % 1; }
        g.globalAlpha = 0.25 + 0.6 * Math.pow(Math.sin(t * m.tw + m.ph), 2);
        g.fillStyle = pal[m.col]; g.beginPath(); g.arc(m.x * W + Math.sin(t * 0.7 + m.ph) * 3, m.y * H, m.r, 0, 6.2832); g.fill();
      }
      g.globalAlpha = 1;
    };
    // The loop used to ask for an animation frame on every refresh of the screen (120 a second on a ProMotion phone) only to skip most of them, so the page never
    // went idle. Now a timer wakes it at the drawing rate and a frame is requested only when there is something to draw; hidden or off screen it checks twice a second.
    let timer = 0;
    const tick = () => {
      timer = 0;
      if (document.hidden || !visible) { last = performance.now(); timer = window.setTimeout(tick, 500); return; }
      raf = requestAnimationFrame((now) => { raf = 0; const dt = Math.min(0.2, (now - last) / 1000); last = now; draw(now, dt); timer = window.setTimeout(tick, 1000 / fps); });
    };
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((e) => { visible = e[0].isIntersecting; }) : null;
    io?.observe(c);
    last = performance.now();
    draw(last, 0);
    timer = window.setTimeout(tick, 1000 / fps);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); io?.disconnect(); };
  }, [level]);
  if (level === 'off') return null;
  return <canvas ref={cv} className="qiWidget" width={W} height={H} aria-hidden="true" />;
}
