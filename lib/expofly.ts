// Triển Lãm, the flight of one visitor: where a cultivator on a sword goes, when, and which way it faces and leans. Pure numbers, no DOM: components/ExpoScene.tsx turns the plan into
// Web Animations (they run on the compositor, so a visitor costs no React work while it flies) and a test can check the plan without a screen.
//
// The stage is a box of STAGE_W x STAGE_H "reference pixels" (the real box is scaled to the screen); every point is in percent of the real box. Three tiers of cloud, two stands on each,
// the chest of gifts on the lowest cloud. A visitor comes in from the side the visit says, goes to each stand of its route in turn (hovering beside it, on the side it came from, facing
// it), looks for HOLD_MS, and leaves towards the side it was facing. A gift flies from the last stand to the chest, Linh Thạch from each stand to the chest.
import type { Reaction, Visit } from './expo';

export const STAGE_W = 360, STAGE_H = 460;
export interface Pt { x: number; y: number }
/** Where each of the 6 stands is (the centre of the piece on it), percent of the stage. Row by row, left then right. */
export const STAND_AT: Pt[] = [{ x: 27, y: 19 }, { x: 73, y: 19 }, { x: 27, y: 45 }, { x: 73, y: 45 }, { x: 27, y: 71 }, { x: 73, y: 71 }];
/** The chest on the lowest cloud. */
export const CHEST_AT: Pt = { x: 50, y: 90 };
export const HOVER_DX = 17;     // how far beside the stand a visitor hovers (percent of the width)
export const HOVER_DY = -3;     // and a little above its centre (percent of the height)
export const ENTRY_X = [-16, 116] as const;   // off the stage on the left (side 0) and on the right (side 1)
export const HOLD_MS = 1750, REACT_AT_MS = 480, TURN_MS = 170, SPEED = 0.15 /* reference pixels per ms */, MIN_LEG_MS = 950;

export interface Frame { t: number /* 0..1 of the whole flight */; x: number; y: number; s: 1 | -1 /* facing: 1 right, -1 left (the picture faces right) */; a: number /* lean in degrees, positive: nose up */ }
export interface Stop { slot: number; at: number /* ms when it starts looking */; hover: Pt; face: 1 | -1; r: Reaction | null; stones: number }
export interface Plan {
  total: number;   // ms for the whole flight
  frames: Frame[];
  stops: Stop[];
  /** the gift (if any): when it leaves the last stand, where from, and when it lands */
  gift: { at: number; from: Pt } | null;
}

const px = (p: Pt) => ({ x: (p.x / 100) * STAGE_W, y: (p.y / 100) * STAGE_H });
const dist = (a: Pt, b: Pt) => Math.hypot(((b.x - a.x) / 100) * STAGE_W, ((b.y - a.y) / 100) * STAGE_H);
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));   // slow in, slow out
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const hoverOf = (slot: number, fromX: number): { at: Pt; face: 1 | -1 } => {
  const s = STAND_AT[slot], left = fromX < s.x;
  return { at: { x: s.x + (left ? -HOVER_DX : HOVER_DX), y: s.y + HOVER_DY }, face: left ? 1 : -1 };
};

/** The flight of one visit. Pieces of the route that name a stand which does not exist are skipped. */
export function planOf(v: Pick<Visit, 'side' | 'route' | 'gift'>): Plan {
  const steps = v.route.filter((s) => s.slot >= 0 && s.slot < STAND_AT.length);
  const first = steps.length ? STAND_AT[steps[0].slot] : { x: 50, y: 40 };
  const raw: { t: number; x: number; y: number; s: 1 | -1; a: number }[] = [];   // t in ms
  const stops: Stop[] = [];
  let at = 0, cur: Pt = { x: ENTRY_X[v.side], y: first.y - 12 }, face: 1 | -1 = v.side === 0 ? 1 : -1;
  const put = (t: number, p: Pt, s: 1 | -1, a: number) => raw.push({ t, x: p.x, y: p.y, s, a });
  put(0, cur, face, 0);
  // one leg: from `cur` to `to` as a gentle arc with a little wave in it, leaning into the climb or the dive
  const leg = (to: Pt, s: 1 | -1, ms: number, tilt: boolean): number => {
    const n = Math.max(6, Math.round(ms / 90)), arc = -clamp(dist(cur, to) / 30, 0, 8);   // the middle of a leg bulges upwards a little: a swoop, not a straight line
    const t0 = at;
    let prev = px(cur);
    for (let i = 1; i <= n; i++) {
      const u = i / n, e = ease(u), wave = Math.sin(u * Math.PI * 3) * Math.sin(u * Math.PI) * 1.1;   // the up and down of the sword, dying away at both ends
      const x = cur.x + (to.x - cur.x) * e, y = cur.y + (to.y - cur.y) * e + Math.sin(e * Math.PI) * arc + wave;
      const q = px({ x, y }), dx = q.x - prev.x, dy = q.y - prev.y;
      const lean = tilt ? clamp((Math.atan2(-dy, Math.max(0.0001, Math.abs(dx) + 0.0001)) * 180) / Math.PI * 0.55, -17, 17) : 0;
      put(t0 + (ms * i) / n, { x, y }, s, lean);
      prev = q;
    }
    at = t0 + ms; cur = to;
    return at;
  };
  for (const st of steps) {
    const h = hoverOf(st.slot, cur.x);
    const toward: 1 | -1 = Math.abs(h.at.x - cur.x) < 3 ? face : h.at.x > cur.x ? 1 : -1;   // facing where it moves
    // fly to the hover point
    leg(h.at, toward, Math.max(MIN_LEG_MS, dist(cur, h.at) / SPEED), true);
    face = toward;
    // turn to look at the stand if it is on the other side (a quick squash of the picture), then hold and bob
    const arrive = at;
    if (face !== h.face) { put(at + TURN_MS, cur, h.face, 0); at += TURN_MS; face = h.face; }
    stops.push({ slot: st.slot, at: arrive, hover: h.at, face, r: st.r, stones: st.stones });
    const k = 6;
    for (let j = 1; j <= k; j++) put(at + (HOLD_MS * j) / k, { x: cur.x, y: cur.y + Math.sin((j / k) * Math.PI * 2) * 0.9 }, face, Math.sin((j / k) * Math.PI * 2) * 3);
    at += HOLD_MS;
  }
  // leave towards the side it faces
  const out: Pt = { x: face === 1 ? ENTRY_X[1] : ENTRY_X[0], y: cur.y - 9 };
  const last = stops[stops.length - 1];
  const gift = v.gift && last ? { at: last.at + HOLD_MS * 0.7, from: { ...last.hover } } : null;
  leg(out, face, Math.max(MIN_LEG_MS * 1.2, dist(cur, out) / (SPEED * 1.25)), true);
  const total = Math.round(at);
  return { total, frames: raw.map((f) => ({ ...f, t: f.t / at })), stops, gift };
}

/** Where a coin or a gift is at `u` (0..1) on its way from `a` to the chest: a high arc. */
export function arcAt(a: Pt, b: Pt, u: number): Pt {
  const e = ease(u), lift = 14 + Math.abs(b.x - a.x) * 0.12;
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * lift };
}
