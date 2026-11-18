'use client';
import { useEffect, useRef } from 'react';

// Living details drawn over the background picture of the Linh Thú Viên, in code (so they cost nothing and loop for ever): spirit cranes crossing the sky,
// dragonflies that hover and dart over the stream, butterflies, petals and leaves blown by the breeze, spirit lights, and glints on the water.
// Two canvases of the same size as the stage: 'back' goes under the creatures, 'front' over them. Sizes follow the stage's height (the picture is 768 px high).
// Positions are shares of the stage (0..1). Places named below (the river, the sun) belong to public/art/zones/thanhvan.jpg.
type Layer = 'back' | 'front';
interface Env { w: number; h: number; u: number; t: number; dt: number }
type Sim = (c: CanvasRenderingContext2D, e: Env) => void;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

// the river of Thanh Vân: from (0.53, 0.72) to (0.60, 0.96), widening towards the viewer
const river = (t: number) => ({ x: 0.53 + 0.07 * t, y: 0.72 + 0.24 * t, half: 0.04 + 0.12 * t });

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  c.fillStyle = `rgba(${rgb},${(a * 0.14).toFixed(3)})`; c.beginPath(); c.arc(x, y, r * 4, 0, TAU); c.fill();
  c.fillStyle = `rgba(${rgb},${a.toFixed(3)})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

// ---- spirit cranes: white, high in the sky, crossing from right to left; flap for a few seconds, then glide
function cranes(): Sim {
  const K = [0, 1].map((i) => ({ x: 1.1, y: 0.14 + i * 0.07, v: 0.017 + i * 0.004, s: 0.85 - i * 0.2, ph: rnd(0, TAU), delay: 3 + i * 11, flap: 0 }));
  return (c, { w, h, u, t, dt }) => {
    for (const k of K) {
      if (k.delay > 0) { k.delay -= dt; continue; }
      k.x -= k.v * dt;
      if (k.x < -0.1) { k.x = 1.1; k.y = rnd(0.1, 0.26); k.delay = rnd(12, 30); continue; }
      const gliding = ((t + k.ph * 3) % 5.5) > 3.4;
      k.flap += dt * (gliding ? 0.6 : 4.6);
      const wv = gliding ? 0.2 : Math.sin(k.flap);
      c.save(); c.translate(k.x * w, (k.y + Math.sin(t * 0.35 + k.ph) * 0.008) * h); c.scale(-k.s * u, k.s * u);   // flies towards the left
      c.globalAlpha = 0.9;
      c.fillStyle = 'rgba(255,255,250,0.92)'; c.strokeStyle = 'rgba(255,255,250,0.92)'; c.lineCap = 'round';
      for (const [dx, a] of [[-3, 0.55], [0, 1]] as const) {   // far wing, near wing
        c.globalAlpha = 0.9 * a;
        c.beginPath(); c.moveTo(dx, 0); c.quadraticCurveTo(dx - 9, -17 * wv - 3, dx - 34, -25 * wv); c.quadraticCurveTo(dx - 17, -4 * wv + 3, dx + 2, 3); c.fill();
      }
      c.globalAlpha = 0.95;
      c.beginPath(); c.ellipse(0, 0.5, 11, 3.6, 0, 0, TAU); c.fill();                                  // body
      c.lineWidth = 2; c.beginPath(); c.moveTo(9, -1); c.quadraticCurveTo(16, -9, 21, -5); c.stroke();     // neck
      c.beginPath(); c.arc(21.5, -5.2, 1.7, 0, TAU); c.fill();
      c.fillStyle = 'rgba(214,60,50,0.95)'; c.beginPath(); c.arc(21, -6.4, 0.9, 0, TAU); c.fill();         // crest
      c.strokeStyle = 'rgba(70,70,70,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, 2); c.lineTo(-26, 4); c.stroke();   // legs
      c.restore();
    }
  };
}

// ---- spirit lights: they pulse and drift slowly upward
function lights(n: number, size: number, rgbs: string[]): Sim {
  const P = Array.from({ length: n }, () => ({ x: rnd(), y: rnd(0.2, 1), r: size * rnd(0.6, 1.4), ph: rnd(0, TAU), sp: rnd(0.5, 1.2), rgb: rgbs[(Math.random() * rgbs.length) | 0] }));
  return (c, { w, h, u, dt }) => {
    c.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.ph += dt * p.sp * 1.6;
      p.x += Math.sin(p.ph * 0.7) * 0.012 * dt; p.y -= (0.006 + 0.01 * p.sp) * dt;
      if (p.y < -0.03) { p.y = 1.03; p.x = rnd(); }
      glow(c, p.x * w, p.y * h, p.r * u, p.rgb, 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph * 2)));
    }
    c.globalCompositeOperation = 'source-over';
  };
}

// ---- petals and leaves blown by a breeze that comes and goes
function petals(n: number): Sim {
  const C = ['255,214,226', '255,246,250', '255,200,215', '170,214,120', '196,228,150'];
  const P = Array.from({ length: n }, (_, i) => ({ x: rnd(-0.1, 1), y: rnd(), vy: rnd(0.02, 0.05), rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), s: rnd(2.6, 5), ph: rnd(0, TAU), rgb: C[i % C.length], leaf: i % 5 >= 3 }));
  return (c, { w, h, u, t, dt }) => {
    const wind = 0.03 + 0.025 * Math.sin(t / 3.1) + 0.015 * Math.sin(t / 1.3);
    for (const p of P) {
      p.ph += dt; p.rot += p.vr * dt;
      p.x += (wind + Math.sin(p.ph * 1.3) * 0.012) * dt; p.y += (p.vy + Math.cos(p.ph * 0.9) * 0.008) * dt;
      if (p.y > 1.04 || p.x > 1.08) { p.y = rnd(-0.08, 0.0); p.x = rnd(-0.15, 0.9); }
      c.save(); c.translate(p.x * w, p.y * h); c.rotate(p.rot); c.scale(1, Math.abs(Math.cos(p.ph * 1.7)) * 0.8 + 0.2);
      c.fillStyle = `rgba(${p.rgb},${p.leaf ? 0.8 : 0.88})`;
      c.beginPath(); c.ellipse(0, 0, p.s * u * (p.leaf ? 1.5 : 1), p.s * u * (p.leaf ? 0.7 : 1.1), 0, 0, TAU); c.fill();
      c.restore();
    }
  };
}

// ---- dragonflies: hover on the spot, then dart to another, mostly over the stream
function dragonflies(n: number, byRiver: boolean): Sim {
  const body = ['#3fd7c4', '#e8553a', '#5d8cff'];
  const D = Array.from({ length: n }, (_, i) => ({ x: rnd(0.3, 0.7), y: rnd(0.6, 0.85), tx: 0, ty: 0, hover: rnd(0.2, 1), ang: rnd(0, TAU), ph: rnd(0, TAU), col: body[i % body.length] }));
  const pick = (d: (typeof D)[number]) => { if (byRiver && Math.random() < 0.7) { const r = river(Math.random()); d.tx = r.x + rnd(-r.half, r.half); d.ty = r.y - rnd(0.02, 0.1); } else { d.tx = rnd(0.1, 0.9); d.ty = rnd(0.35, 0.85); } };
  return (c, { w, h, u, t, dt }) => {
    for (const d of D) {
      if (d.hover > 0) { d.hover -= dt; d.x += rnd(-1, 1) * 0.0007; d.y += rnd(-1, 1) * 0.0007; if (d.hover <= 0) pick(d); }
      else {
        const dx = (d.tx - d.x) * w, dy = (d.ty - d.y) * h, dist = Math.hypot(dx, dy);
        if (dist < 3) d.hover = rnd(0.5, 1.8);
        else { d.ang = Math.atan2(dy, dx); const step = Math.min(dist, w * 0.5 * dt * (0.35 + Math.min(1, dist / (w * 0.2)))); d.x += (dx / dist) * step / w; d.y += (dy / dist) * step / h; }
      }
      const s = u * 1.05, f = Math.sin(t * 55 + d.ph);
      c.save(); c.translate(d.x * w, d.y * h); c.rotate(d.ang);
      c.fillStyle = 'rgba(225,255,250,0.34)'; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.6 * s;
      for (const ox of [3.2, -1.2]) for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(ox * s, sg * 8 * s, 3 * s, 8.5 * s * (0.62 + 0.38 * Math.abs(f)), 0, 0, TAU); c.fill(); c.stroke(); }
      c.strokeStyle = d.col; c.lineWidth = 2.2 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(-13 * s, 0); c.lineTo(8 * s, 0); c.stroke();
      c.fillStyle = d.col; c.beginPath(); c.arc(9.5 * s, 0, 2.5 * s, 0, TAU); c.fill();
      c.restore();
    }
  };
}

// ---- butterflies drifting across, bobbing as they go
function butterflies(n: number): Sim {
  const C = ['255,205,225', '255,238,170', '200,225,255', '255,255,255'];
  const B = Array.from({ length: n }, (_, i) => ({ x: rnd(), y: rnd(0.45, 0.85), vx: rnd(0.012, 0.03) * (Math.random() < 0.5 ? 1 : -1), ph: rnd(0, TAU), rgb: C[i % C.length] }));
  return (c, { w, h, u, dt }) => {
    for (const b of B) {
      b.ph += dt; b.x += b.vx * dt + Math.sin(b.ph * 0.8) * 0.006 * dt; b.y += Math.sin(b.ph * 1.9) * 0.012 * dt;
      if (b.x > 1.05) b.x = -0.05; else if (b.x < -0.05) b.x = 1.05;
      if (b.y < 0.3) b.y = 0.3; else if (b.y > 0.9) b.y = 0.9;
      const wing = 0.25 + 0.75 * Math.abs(Math.sin(b.ph * 9)), s = u * 1.1;
      c.save(); c.translate(b.x * w, b.y * h); c.rotate(b.vx > 0 ? 0.3 : -0.3);
      c.fillStyle = `rgba(${b.rgb},0.85)`;
      for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * 4.5 * s * wing, -2 * s, 5 * s * wing, 6.5 * s, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(sg * 3.5 * s * wing, 4 * s, 3.6 * s * wing, 4.5 * s, 0, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(60,50,50,0.9)'; c.beginPath(); c.ellipse(0, 0.5 * s, 0.9 * s, 5 * s, 0, 0, TAU); c.fill();
      c.restore();
    }
  };
}

// ---- glints on the river: tiny four-pointed stars that flash and fade
function glints(): Sim {
  const G: { x: number; y: number; life: number; max: number; r: number }[] = [];
  let acc = 0;
  return (c, { w, h, u, dt }) => {
    acc += dt * 7;
    while (acc >= 1) { acc -= 1; const r = river(Math.random()); G.push({ x: r.x + rnd(-r.half, r.half), y: r.y, life: 0, max: rnd(0.5, 1.1), r: rnd(2.5, 5) }); }
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,250,225,1)'; c.lineCap = 'round';
    for (let i = G.length - 1; i >= 0; i--) {
      const g = G[i]; g.life += dt;
      if (g.life >= g.max) { G.splice(i, 1); continue; }
      const k = Math.sin((g.life / g.max) * Math.PI), a = k * k, L = g.r * u * (0.5 + k), x = g.x * w, y = g.y * h;
      c.globalAlpha = a; c.lineWidth = 1.1 * u;
      c.beginPath(); c.moveTo(x - L, y); c.lineTo(x + L, y); c.moveTo(x, y - L * 0.8); c.lineTo(x, y + L * 0.8); c.stroke();
      c.fillStyle = 'rgba(255,250,225,0.9)'; c.beginPath(); c.arc(x, y, 0.9 * u, 0, TAU); c.fill();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
}

// `river`: the background has the river of Thanh Vân, so glints and dragonflies keep to it; on any other background they roam the whole ground.
export function Ambient({ layer, river: rv = false }: { layer: Layer; river?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, c = cv?.getContext('2d');
    if (!cv || !c || calm()) return;
    const sims: Sim[] = layer === 'back' ? [cranes(), lights(14, 1.1, ['255,236,170', '190,255,235'])] : [...(rv ? [glints()] : []), petals(20), lights(18, 1.8, ['255,224,130', '170,255,225', '255,255,235']), butterflies(3), dragonflies(3, rv)];
    const e: Env = { w: 1, h: 1, u: 1, t: 0, dt: 0 };
    const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(1.25, window.devicePixelRatio || 1); e.w = cv.width = Math.max(1, Math.round(r.width * d)); e.h = cv.height = Math.max(1, Math.round(r.height * d)); e.u = e.h / 768; };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      e.dt = Math.min(0.1, (now - last) / 1000); last = now; e.t += e.dt;
      c.clearRect(0, 0, e.w, e.h);
      for (const s of sims) s(c, e);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [layer, rv]);
  return <canvas ref={ref} className="zs-fx" aria-hidden="true" />;
}
