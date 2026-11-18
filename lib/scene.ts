// Scene of the lab (/lab/linh-thu/canh): the rules that make a cut-out creature sit INSIDE a background picture instead of lying on it.
// Pure functions, no imports, so they are tested (tests/scene.test.ts) and the page only draws.
// Depth model: the ground is a band on the picture (band[0] far, band[1] near). A creature's size, colour grade, speed and shadow all follow where it is in that band.

export type Mote = 'firefly' | 'wisp' | 'ember' | 'spark' | 'snow' | 'star';
export interface Look {
  ground: boolean;                 // false: the picture has no ground (sky, floating islands): creatures can only stand on the bottom edge
  band: [number, number];          // walkable y range as a share of the picture's height: [far, near]
  xr: [number, number];            // walkable x range
  far: number; near: number;       // creature size at the far and the near edge, 1 = the size set by the stage
  light: number;                   // -1 light comes from the left, 1 from the right, 0 from behind or above: the shadow falls the other way
  tint: { b: number; s: number };  // brightness and saturation that make a creature belong to this picture
  haze: [number, number, number];  // colour a far creature fades into (0..255)
  hazeMax: number;                 // how much of it at the far edge (0..1)
  mist: number;                    // 0..1, how thick the drifting mist is
  mistColor: string;
  motes: Mote;
  grass: string;                   // colour of the drawn grass in front
}

const DEFAULT: Look = { ground: true, band: [0.66, 0.9], xr: [0.08, 0.92], far: 0.55, near: 1.15, light: 0, tint: { b: 1, s: 1 }, haze: [200, 200, 210], hazeMax: 0.3, mist: 0.4, mistColor: 'rgba(220,225,235,0.5)', motes: 'firefly', grass: '#101a14' };
// Bands were read off the pictures in public/art/zones: where there is a path, a bank or rock to stand on. Zones without ground are marked.
const LOOKS: Record<string, Partial<Look>> = {
  thanhvan: { band: [0.7, 0.92], xr: [0.1, 0.9], light: 0, tint: { b: 1.02, s: 1.05 }, haze: [233, 226, 200], hazeMax: 0.35, mist: 0.55, mistColor: 'rgba(240,236,215,0.55)', motes: 'firefly', grass: '#0f2616' },
  hannguyet: { band: [0.77, 0.93], xr: [0.15, 0.72], light: 0, tint: { b: 0.86, s: 0.85 }, haze: [26, 58, 74], hazeMax: 0.4, mist: 0.7, mistColor: 'rgba(160,200,220,0.5)', motes: 'wisp', grass: '#04100f' },
  loivan: { band: [0.78, 0.94], xr: [0.12, 0.88], light: 0, tint: { b: 0.9, s: 0.9 }, haze: [58, 48, 85], hazeMax: 0.4, mist: 0.6, mistColor: 'rgba(150,140,190,0.5)', motes: 'spark', grass: '#0b0912' },
  xichviem: { band: [0.82, 0.95], xr: [0.32, 0.72], light: 0, tint: { b: 0.95, s: 1.1 }, haze: [90, 42, 28], hazeMax: 0.4, mist: 0.35, mistColor: 'rgba(180,90,50,0.4)', motes: 'ember', grass: '#110706' },
  cuuu: { ground: false, band: [0.84, 0.95], xr: [0.3, 0.7], far: 0.8, near: 1, tint: { b: 0.95, s: 1 }, haze: [30, 30, 50], hazeMax: 0.2, mist: 0.3, mistColor: 'rgba(120,110,150,0.4)', motes: 'ember', grass: '#08070c' },
  tinhha: { ground: false, band: [0.84, 0.95], xr: [0.3, 0.7], far: 0.8, near: 1, tint: { b: 0.95, s: 1 }, haze: [40, 30, 80], hazeMax: 0.2, mist: 0.3, mistColor: 'rgba(120,100,180,0.4)', motes: 'star', grass: '#08060f' },
  night: { band: [0.72, 0.92], tint: { b: 0.85, s: 0.85 }, haze: [20, 30, 60], hazeMax: 0.35, mistColor: 'rgba(150,170,210,0.45)', motes: 'wisp', grass: '#05080d' },
};
export const lookOf = (bg: string): Look => ({ ...DEFAULT, ...(LOOKS[bg] || {}) });

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
// 0 at the far edge of the ground, 1 at the near edge
export const depthOf = (l: Look, y: number) => clamp((y - l.band[0]) / Math.max(1e-6, l.band[1] - l.band[0]), 0, 1);
export const scaleAt = (l: Look, y: number) => l.far + (l.near - l.far) * depthOf(l, y);
// What the shader does to a creature at height y: it fades towards the haze colour when far, and has the picture's brightness and saturation.
export const gradeAt = (l: Look, y: number) => ({ haze: l.haze, amt: l.hazeMax * (1 - depthOf(l, y)), bright: l.tint.b, sat: l.tint.s });
// A far creature covers less picture per second, so the same speed is smaller on screen: otherwise the legs slide.
export const speedAt = (base: number, l: Look, y: number) => base * scaleAt(l, y);
// Shadow under the feet: pushed away from the light, darker when near.
export const shadowAt = (l: Look, y: number) => ({ dx: -l.light * 0.18, a: 0.3 + 0.25 * depthOf(l, y) });
export const pickSpot = (l: Look, rnd: () => number) => ({ x: l.xr[0] + rnd() * (l.xr[1] - l.xr[0]), y: l.band[0] + rnd() * (l.band[1] - l.band[0]) });

// Stage widths per second at size 1 (what the owner tunes per creature to stop the feet sliding).
export const SPEED = { walk: 0.075, run: 0.2 } as const;
export const SPEED_RANGE = { min: 0.02, max: 0.4 } as const;

export type Move = 'rest' | 'walk' | 'run' | 'act';
// What a creature does next, from the clips it has. Resting is the most likely; 'act' is a roar or an aura (only if it has one).
export function nextMove(has: { walk: boolean; run: boolean; act: boolean }, rnd: () => number): Move {
  if (!has.walk && !has.run) return has.act && rnd() < 0.5 ? 'act' : 'rest';
  const r = rnd();
  const w = { rest: 0.18, walk: has.walk ? 0.5 : 0, run: has.run ? (has.walk ? 0.17 : 0.6) : 0, act: has.act ? 0.15 : 0 };
  const total = w.rest + w.walk + w.run + w.act;
  let x = r * total;
  for (const k of ['walk', 'run', 'act', 'rest'] as const) { if (x < w[k]) return k; x -= w[k]; }
  return 'rest';
}

// Turning: the facing (+1 or -1) glides to its target instead of jumping, so the creature narrows to a line and widens the other way.
export const turn = (f: number, target: number, dt: number, rate = 8) => (f < target ? Math.min(target, f + rate * dt) : Math.max(target, f - rate * dt));

// Grass blades along the bottom edge of a 1000 x 100 box (as SVG path data), the same every time for the same seed.
export function grassPath(seed: number, count: number, minH: number, maxH: number): string {
  let s = (seed >>> 0) || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = (i + rnd() * 0.8) * (1000 / count) - 10, h = minH + rnd() * (maxH - minH), w = 5 + rnd() * 8, b = (rnd() - 0.5) * 22;
    d += `M${f(x)},100 Q${f(x + b * 0.4)},${f(100 - h * 0.55)} ${f(x + b)},${f(100 - h)} Q${f(x + w * 0.9 + b * 0.3)},${f(100 - h * 0.5)} ${f(x + w)},100Z`;
  }
  return d;
}
