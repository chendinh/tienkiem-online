// Triển Lãm, the flight of one visitor: where a cultivator on a sword goes, when, and which way it faces and leans. Pure numbers, no DOM: components/ExpoScene.tsx turns the plan into
// Web Animations (they run on the compositor, so a visitor costs no React work while it flies) and a test can check the plan without a screen.
//
// The stage is a box of STAGE_W x STAGE_H "reference pixels" (the real box is scaled to the screen); every point is in percent of the real box. Three tiers of cloud, two stands on each,
// the chest of gifts on the lowest cloud. A visitor comes in from the side the visit says, goes to each stand of its route in turn (hovering beside it, on the side it came from, facing
// it), looks for a while, and leaves. A gift flies from the last stand to the chest, Linh Thạch from each stand to the chest.
import type { Reaction, Visit } from './expo';
import { hash32 } from './orders';

export const STAGE_W = 360, STAGE_H = 460;
export interface Pt { x: number; y: number }
/** Where each of the 6 stands is (the centre of the piece on it), percent of the stage. Row by row, left then right. */
export const STAND_AT: Pt[] = [{ x: 27, y: 19 }, { x: 73, y: 19 }, { x: 27, y: 45 }, { x: 73, y: 45 }, { x: 27, y: 71 }, { x: 73, y: 71 }];
/** The chest on the lowest cloud. */
export const CHEST_AT: Pt = { x: 50, y: 90 };
export const HOVER_DX = 16;     // about how far beside the stand a visitor hovers (percent of the width; each visit shifts it a little)
export const HOVER_DY = -3;     // and a little above its centre (percent of the height)
export const ENTRY_X = [-16, 116] as const;   // off the stage on the left (side 0) and on the right (side 1)
export const HOLD_MIN = 950, HOLD_MAX = 1500;   // how long a visitor looks at one stand (each look is its own length)
export const REACT_AT_MS = 380, TURN_MS = 150, SPEED = 0.3 /* reference pixels per ms; each visit is 0.85 to 1.4 times this */, MIN_LEG_MS = 520;

export interface Frame { t: number /* 0..1 of the whole flight */; x: number; y: number; s: 1 | -1 /* facing: 1 right, -1 left (the picture faces right) */; a: number /* lean in degrees, positive: nose up */ }
export interface Stop { slot: number; at: number /* ms when it starts looking */; hold: number /* ms it looks */; hover: Pt; face: 1 | -1; r: Reaction | null; stones: number }
export interface Plan {
  total: number;   // ms for the whole flight
  frames: Frame[];
  stops: Stop[];
  /** the gift (if any): when it leaves the last stand and where from */
  gift: { at: number; from: Pt } | null;
}

const px = (p: Pt) => ({ x: (p.x / 100) * STAGE_W, y: (p.y / 100) * STAGE_H });
const dist = (a: Pt, b: Pt) => Math.hypot(((b.x - a.x) / 100) * STAGE_W, ((b.y - a.y) / 100) * STAGE_H);
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));   // slow in, slow out
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Where to hover to look at a stand: on the side the visitor comes from, facing the stand. `jx` and `jy` (0..1) move the spot a little so no two visits stop on the same pixel. */
export const hoverOf = (slot: number, fromX: number, jx = 0.5, jy = 0.5): { at: Pt; face: 1 | -1 } => {
  const s = STAND_AT[slot], left = fromX < s.x, dx = HOVER_DX + (jx - 0.5) * 5;
  return { at: { x: s.x + (left ? -dx : dx), y: s.y + HOVER_DY + (jy - 0.5) * 3 }, face: left ? 1 : -1 };
};

/** The flight of one visit. Everything that varies (speed, the height it comes in at, a sweep across the stage before it looks, a detour between two stands, how long each look lasts,
 *  the swing of each leg, which way it leaves) is drawn from the visit's number, so a visit always flies the same way but no two visits fly alike. Stands that do not exist are skipped. */
export function planOf(v: Pick<Visit, 'n' | 'side' | 'route' | 'gift'>): Plan {
  const rnd = (k: string) => (hash32(`xf|${v.n}|${k}`) % 1000) / 1000;
  const steps = v.route.filter((s) => s.slot >= 0 && s.slot < STAND_AT.length);
  const first = steps.length ? STAND_AT[steps[0].slot] : { x: 50, y: 40 };
  const speed = SPEED * (0.85 + rnd('sp') * 0.55);
  const raw: { t: number; x: number; y: number; s: 1 | -1; a: number }[] = [];   // t in ms
  const stops: Stop[] = [];
  let at = 0, cur: Pt = { x: ENTRY_X[v.side], y: clamp(first.y - 18 + rnd('ey') * 30, 6, 90) }, face: 1 | -1 = v.side === 0 ? 1 : -1, legs = 0;
  const put = (t: number, p: Pt, s: 1 | -1, a: number) => raw.push({ t, x: p.x, y: p.y, s, a });
  put(0, cur, face, 0);
  // turning round: a quick squash of the picture where it hovers
  const turnTo = (s: 1 | -1) => { if (s !== face) { at += TURN_MS; put(at, cur, s, 0); face = s; } };
  // one leg: from `cur` to `to` as a swoop with a wave in it, leaning into the climb or the dive
  const leg = (to: Pt, ms: number) => {
    const k = legs++, n = Math.max(6, Math.round(ms / 70));
    const arc = -clamp(dist(cur, to) / 30, 0, 8) * (0.4 + rnd(`a${k}`) * 1.2) * (rnd(`d${k}`) < 0.25 ? -1 : 1);   // mostly bulges up, sometimes dips
    const waves = 2 + Math.floor(rnd(`w${k}`) * 3), amp = 0.8 + rnd(`m${k}`) * 1.4;
    const t0 = at;
    let prev = px(cur);
    for (let i = 1; i <= n; i++) {
      const u = i / n, e = ease(u), wave = Math.sin(u * Math.PI * waves) * Math.sin(u * Math.PI) * amp;   // the up and down of the sword, dying away at both ends
      const x = cur.x + (to.x - cur.x) * e, y = cur.y + (to.y - cur.y) * e + Math.sin(e * Math.PI) * arc + wave;
      const q = px({ x, y }), dx = q.x - prev.x, dy = q.y - prev.y;
      put(t0 + (ms * i) / n, { x, y }, face, clamp((Math.atan2(-dy, Math.abs(dx) + 0.0001) * 180) / Math.PI * 0.55, -17, 17));
      prev = q;
    }
    at = t0 + ms; cur = to;
  };
  const flyTo = (to: Pt, mul = 1) => { turnTo(Math.abs(to.x - cur.x) < 3 ? face : to.x > cur.x ? 1 : -1); leg(to, Math.max(MIN_LEG_MS, dist(cur, to) / (speed * mul))); };
  // sometimes it first sweeps right across the stage and comes back, so it flies back and forth
  if (steps.length && rnd('sweep') < 0.5) flyTo({ x: v.side === 0 ? 68 + rnd('vx') * 24 : 32 - rnd('vx') * 24, y: 8 + rnd('vy') * 80 });
  steps.forEach((st, i) => {
    if (i > 0 && rnd(`det${i}`) < 0.3) flyTo({ x: 12 + rnd(`dx${i}`) * 76, y: 8 + rnd(`dy${i}`) * 82 }, 1.1);   // a detour between two stands
    const h = hoverOf(st.slot, cur.x, rnd(`jx${i}`), rnd(`jy${i}`));
    flyTo(h.at);
    const arrive = at, hold = Math.round(HOLD_MIN + rnd(`h${i}`) * (HOLD_MAX - HOLD_MIN));
    turnTo(h.face);   // look at the stand
    stops.push({ slot: st.slot, at: arrive, hold, hover: h.at, face, r: st.r, stones: st.stones });
    const k = 5, end = at + hold;
    for (let j = 1; j <= k; j++) put(at + (hold * j) / k, { x: cur.x, y: cur.y + Math.sin((j / k) * Math.PI * 2) * 0.9 }, face, Math.sin((j / k) * Math.PI * 2) * 3);
    at = end;
  });
  // leave: usually the way it faces, sometimes it turns back and goes out the other side
  turnTo(rnd('ex') < 0.7 ? face : (-face as 1 | -1));
  const out: Pt = { x: face === 1 ? ENTRY_X[1] : ENTRY_X[0], y: clamp(cur.y + (rnd('ey2') - 0.7) * 30, 4, 92) };
  const last = stops[stops.length - 1];
  const gift = v.gift && last ? { at: last.at + last.hold * 0.7, from: { ...last.hover } } : null;
  leg(out, Math.max(MIN_LEG_MS * 1.1, dist(cur, out) / (speed * 1.4)));
  const total = Math.round(at);
  return { total, frames: raw.map((f) => ({ ...f, t: f.t / at })), stops, gift };
}

/** Where a coin or a gift is at `u` (0..1) on its way from `a` to the chest: a high arc. */
export function arcAt(a: Pt, b: Pt, u: number): Pt {
  const e = ease(u), lift = 14 + Math.abs(b.x - a.x) * 0.12;
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * lift };
}
