'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

// Visual effects bus. One fixed canvas draws every burst, ring and bolt; floating numbers, flashes and the screen shake are plain
// DOM nodes removed when their animation ends. The loop only runs while something is alive, so an idle page costs nothing.
export type FxLevel = 'off' | 'low' | 'mid' | 'high';
export type BurstKind = 'qi' | 'gold' | 'petals' | 'ember' | 'spark';
type At = { x?: number; y?: number };
export interface Fx {
  level: FxLevel;
  setLevel: (l: FxLevel) => void;
  burst: (o?: At & { kind?: BurstKind; color?: string; count?: number }) => void;
  ring: (o?: At & { color?: string; size?: number }) => void;
  lightning: (o?: { strikes?: number; color?: string }) => void;
  flash: (kind?: 'violet' | 'gold') => void;
  float: (text: string, o?: At & { color?: string; sub?: string }) => void;
  shake: () => void;
  vignette: (color?: string) => void;
}
const NOOP: Fx = { level: 'mid', setLevel() {}, burst() {}, ring() {}, lightning() {}, flash() {}, float() {}, shake() {}, vignette() {} };
const FxCtx = createContext<Fx>(NOOP);
export const useFx = () => useContext(FxCtx);

const K: Record<FxLevel, number> = { off: 0, low: 0.35, mid: 1, high: 1.7 };
const STORE = 'tutien-fx';
type Part = { x: number; y: number; vx: number; vy: number; g: number; drag: number; life: number; max: number; size: number; sp: HTMLCanvasElement; kind: BurstKind; sway: number; ph: number };
type Ring = { x: number; y: number; r0: number; r1: number; life: number; max: number; color: string; lw: number };
type Bolt = { pts: [number, number][]; branches: [number, number][][]; life: number; max: number; color: string };

export function FxProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<FxLevel>('mid');
  const lv = useRef<FxLevel>('mid');
  const cv = useRef<HTMLCanvasElement>(null);
  const world = useRef({ parts: [] as Part[], rings: [] as Ring[], bolts: [] as Bolt[], raf: 0, last: 0, w: 0, h: 0, dpr: 1, dirty: null as [number, number, number, number] | null, sprites: new Map<string, HTMLCanvasElement>() });

  useEffect(() => {
    let v: FxLevel = 'mid';
    try { const s = localStorage.getItem(STORE) as FxLevel | null; if (s && s in K) v = s; else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) v = 'off'; else { const n = navigator as Navigator & { deviceMemory?: number }; if ((n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4) v = 'low'; } } catch {}
    lv.current = v; setLevelState(v); document.documentElement.dataset.fx = v;
  }, []);
  const setLevel = useCallback((l: FxLevel) => {
    lv.current = l; setLevelState(l); document.documentElement.dataset.fx = l;
    try { localStorage.setItem(STORE, l); } catch {}
  }, []);

  // ---- canvas plumbing
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const W = world.current;
    const fit = () => { W.dpr = 1; W.dirty = null; /* soft glows do not need retina pixels */ W.w = window.innerWidth; W.h = window.innerHeight; c.width = Math.round(W.w * W.dpr); c.height = Math.round(W.h * W.dpr); };
    fit(); window.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); cancelAnimationFrame(W.raf); W.raf = 0; };
  }, []);

  const sprite = (color: string) => {
    const W = world.current; let s = W.sprites.get(color);
    if (!s) {
      s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d')!; const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, color); r.addColorStop(0.55, color + '66'); r.addColorStop(1, color + '00');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64); W.sprites.set(color, s);
    }
    return s;
  };

  const loop = useCallback((now: number) => {
    const W = world.current, c = cv.current; if (!c) return;
    const g = c.getContext('2d')!; const dt = Math.max(0, Math.min(0.05, (now - W.last) / 1000 || 0.016)); W.last = now;
    g.setTransform(W.dpr, 0, 0, W.dpr, 0, 0);
    // only the area drawn on the previous frame is cleared (effects cover a small part of the screen), not the whole canvas
    const D = W.dirty;
    if (D) g.clearRect(D[0], D[1], D[2] - D[0], D[3] - D[1]); else g.clearRect(0, 0, W.w, W.h);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const ext = (x: number, y: number, r: number) => { if (x - r < x0) x0 = x - r; if (y - r < y0) y0 = y - r; if (x + r > x1) x1 = x + r; if (y + r > y1) y1 = y + r; };
    g.globalCompositeOperation = 'lighter';
    for (let i = W.parts.length - 1; i >= 0; i--) {
      const p = W.parts[i]; p.life -= dt;
      if (p.life <= 0) { W.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += (p.vx + Math.sin(p.ph + p.life * 4) * p.sway) * dt; p.y += p.vy * dt;
      const t = p.life / p.max, a = Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 8 + 0.15);
      g.globalAlpha = Math.max(0, a);
      ext(p.x, p.y, p.size + (p.kind === 'spark' ? 12 : 2));
      if (p.kind === 'spark') {   // a short streak is enough; the glow sprite is skipped
        g.strokeStyle = '#fff6d8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); g.stroke();
      } else g.drawImage(p.sp, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    for (let i = W.rings.length - 1; i >= 0; i--) {
      const r = W.rings[i]; r.life -= dt; if (r.life <= 0) { W.rings.splice(i, 1); continue; }
      const t = 1 - r.life / r.max, e = 1 - Math.pow(1 - t, 3), rad = Math.max(0.5, r.r0 + (r.r1 - r.r0) * e);
      g.globalAlpha = (1 - t) * 0.9; g.strokeStyle = r.color; g.lineWidth = r.lw * (1 - t * 0.7);
      ext(r.x, r.y, rad + r.lw + 2);
      g.beginPath(); g.arc(r.x, r.y, rad, 0, Math.PI * 2); g.stroke();
    }
    for (let i = W.bolts.length - 1; i >= 0; i--) {
      const b = W.bolts[i]; b.life -= dt; if (b.life <= 0) { W.bolts.splice(i, 1); continue; }
      for (const [bx, by] of b.pts) ext(bx, by, 16); b.branches.forEach((br) => br.forEach(([bx, by]) => ext(bx, by, 16)));
      const t = b.life / b.max, flick = t > 0.6 ? 1 : 0.35 + 0.65 * Math.random();
      const draw = (pts: [number, number][], k: number) => {
        for (const [w, a, col] of [[12 * k, 0.1, b.color], [5 * k, 0.32, b.color], [1.8 * k, 1, '#ffffff']] as [number, number, string][]) {
          g.globalAlpha = a * flick * Math.min(1, t * 3); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
          g.beginPath(); pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        }
      };
      draw(b.pts, 1); b.branches.forEach((br) => draw(br, 0.55));
    }
    g.globalAlpha = 1;
    W.dirty = x1 > x0 ? [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.min(W.w, Math.ceil(x1)), Math.min(W.h, Math.ceil(y1))] : null;
    if (W.parts.length || W.rings.length || W.bolts.length) W.raf = requestAnimationFrame(loop);
    else { W.raf = 0; g.clearRect(0, 0, W.w, W.h); W.dirty = null; }
  }, []);
  const wake = useCallback(() => { const W = world.current; if (!W.raf) { W.last = performance.now(); W.raf = requestAnimationFrame(loop); } }, [loop]);
  useEffect(() => { document.addEventListener('visibilitychange', () => { if (document.hidden) { const W = world.current; cancelAnimationFrame(W.raf); W.raf = 0; W.parts.length = 0; W.rings.length = 0; W.bolts.length = 0; W.dirty = null; } }); }, []);

  const fx = useMemo<Fx>(() => {
    const W = world.current;
    const center = (o?: At) => ({ x: o?.x ?? W.w / 2, y: o?.y ?? W.h * 0.42 });
    // a busy game (fast speed) must not bury the screen: each effect kind has a minimum gap, longer when the game runs faster
    const seen: Record<string, number> = {};
    const gate = (key: string, ms: number) => { const sp = Number(document.documentElement.dataset.speed || 1); const t = performance.now(); if (t - (seen[key] || 0) < ms * (sp >= 20 ? 3.2 : sp >= 5 ? 1.8 : 1)) return false; seen[key] = t; return true; };
    const dom = (cls: string, ms: number, set?: (el: HTMLElement) => void) => {
      const el = document.createElement('div'); el.className = cls; set?.(el); document.body.appendChild(el); setTimeout(() => el.remove(), ms); return el;
    };
    return {
      level, setLevel,
      burst(o = {}) {
        const k = K[lv.current]; if (!k || W.parts.length > 320 || !gate('burst', 700)) return;
        const { x, y } = center(o); const kind = o.kind || 'qi'; const n = Math.round((o.count ?? { qi: 22, gold: 46, petals: 18, ember: 26, spark: 30 }[kind]) * k);
        const pal: Record<BurstKind, string[]> = { qi: ['#8ee6c8', '#62cfae', '#eed08a'], gold: ['#f6e2a8', '#e5c07b', '#ffffff', '#ffd36e'], petals: ['#8ee6c8', '#ffd6e8', '#b8f2de'], ember: ['#ff8566', '#ffb454', '#e85d3d'], spark: ['#fff6d8', '#f6e2a8'] };
        for (let i = 0; i < n; i++) {
          const col = o.color || pal[kind][i % pal[kind].length]; const ang = kind === 'qi' || kind === 'petals' ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2;
          const sp = kind === 'gold' || kind === 'spark' ? 120 + Math.random() * 300 : kind === 'ember' ? 60 + Math.random() * 160 : 24 + Math.random() * 90;
          const max = kind === 'qi' || kind === 'petals' ? 1.1 + Math.random() * 1.1 : 0.8 + Math.random() * 1.1;
          W.parts.push({ x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: kind === 'gold' ? 260 : kind === 'ember' ? 180 : kind === 'petals' ? 12 : -10, drag: kind === 'gold' || kind === 'spark' ? 1.6 : 0.5, life: max, max, size: kind === 'spark' ? 10 : 8 + Math.random() * (kind === 'gold' ? 14 : 12), sp: sprite(col), kind, sway: kind === 'petals' || kind === 'qi' ? 18 : 0, ph: Math.random() * 6.28 });
        }
        wake();
      },
      ring(o = {}) {
        const k = K[lv.current]; if (!k || !gate('ring', 600)) return; const { x, y } = center(o);
        W.rings.push({ x, y, r0: 8, r1: o.size ?? 120, life: 0.85, max: 0.85, color: o.color || '#f6e2a8', lw: 3 });
        if (k > 1.2) W.rings.push({ x, y, r0: 4, r1: (o.size ?? 120) * 0.62, life: 0.6, max: 0.6, color: '#ffffff', lw: 1.6 });
        wake();
      },
      lightning(o = {}) {
        const k = K[lv.current]; if (!k) return;
        const n = o.strikes ?? 1;
        for (let s = 0; s < n; s++) setTimeout(() => {
          const x0 = W.w * (0.2 + Math.random() * 0.6), x1 = x0 + (Math.random() - 0.5) * 220, y1 = W.h * (0.5 + Math.random() * 0.25);
          const gen = (ax: number, ay: number, bx: number, by: number, rough: number, depth: number): [number, number][] => {
            if (depth === 0) return [[ax, ay], [bx, by]];
            const mx = (ax + bx) / 2 + (Math.random() - 0.5) * rough, my = (ay + by) / 2 + (Math.random() - 0.5) * rough * 0.4;
            return [...gen(ax, ay, mx, my, rough / 2, depth - 1).slice(0, -1), ...gen(mx, my, bx, by, rough / 2, depth - 1)];
          };
          const pts = gen(x0, -10, x1, y1, 150, 6); const branches: [number, number][][] = [];
          for (let i = 6; i < pts.length - 4; i += 9 + Math.floor(Math.random() * 6)) { const [bx, by] = pts[i]; branches.push(gen(bx, by, bx + (Math.random() - 0.5) * 260, by + 110 + Math.random() * 190, 70, 4)); }
          W.bolts.push({ pts, branches, life: 0.55, max: 0.55, color: o.color || '#b78bff' });
          wake();
          if (lv.current !== 'off') dom('fx-flash', 1200);
        }, s * 420);
      },
      flash(kind = 'violet') { if (!K[lv.current] || !gate('flash', 2200)) return; dom(`fx-flash ${kind === 'gold' ? 'gold' : ''}`, 1500); },
      float(text, o = {}) {
        if (!K[lv.current] || !gate('float', 1100)) return; const { x, y } = center(o);
        dom('fx-float', 1800, (el) => { el.style.left = `${x}px`; el.style.top = `${y}px`; if (o.color) el.style.setProperty('--c', o.color); el.textContent = text; if (o.sub) { const s = document.createElement('small'); s.textContent = o.sub; el.appendChild(s); } });
      },
      shake() { if (K[lv.current] < 1) return; const h = document.documentElement; h.classList.remove('fx-shake'); void h.offsetWidth; h.classList.add('fx-shake'); setTimeout(() => h.classList.remove('fx-shake'), 520); },
      vignette(color) { if (!K[lv.current]) return; dom('fx-vignette', 1500, (el) => { if (color) el.style.setProperty('--vc', color); }); },
    };
  }, [level, setLevel, wake]);

  // click ripple on every .btn: one listener for the whole app
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!K[lv.current]) return;
      const b = (e.target as HTMLElement | null)?.closest?.('.btn') as HTMLElement | null; if (!b) return;
      const r = b.getBoundingClientRect(); b.style.setProperty('--rx', `${e.clientX - r.left}px`); b.style.setProperty('--ry', `${e.clientY - r.top}px`);
      b.classList.remove('rip'); void b.offsetWidth; b.classList.add('rip'); setTimeout(() => b.classList.remove('rip'), 700);
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // qi trail behind the mouse (fx=high only)
  useEffect(() => {
    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (lv.current !== 'high' || e.pointerType !== 'mouse') return;
      const t = performance.now(); if (t - last < 38) return; last = t;
      const W = world.current; const col = Math.random() < 0.5 ? '#8ee6c8' : '#eed08a';
      W.parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 24, vy: -10 - Math.random() * 22, g: -6, drag: 0.8, life: 0.7, max: 0.7, size: 7 + Math.random() * 8, sp: sprite(col), kind: 'qi', sway: 6, ph: Math.random() * 6 });
      wake();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [wake]);

  return (
    <FxCtx.Provider value={fx}>
      {children}
      <canvas ref={cv} className="fx-canvas" aria-hidden="true" />
    </FxCtx.Provider>
  );
}
