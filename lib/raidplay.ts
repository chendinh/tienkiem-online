// Phó Bản, the film: the record of the fight (lib/raid.ts Result) turned into a timeline of beats, and where every cultivator hovers on the stage. Pure numbers, no DOM:
// components/RaidScene.tsx plays it, a test can check it. Every screen builds the same timeline from the same record, so two players watching at the same moment see the same blow
// (the screen starts the film at "now - fight time" while it is still running: the fight is shown live).
//
// The stage is a 9:16 box of REF_W x REF_H reference pixels; points are percent of the box. The Dị Thú is part of the picture behind (lib/raid.ts Boss.at says where);
// the cultivators hover in rings below and beside it, the nearest ring first, the middle of each ring first.
import type { Boss, Fighter, FAct, BAct, Round } from './raid';
import { hash32 } from './orders';

export const REF_W = 360, REF_H = 640;
export const SHOWN_MAX = 24;   // cultivators drawn on the stage; the others fight off screen (their blows are one streak and one number per round)
export interface Pt { x: number; y: number }

/** Which fighters are drawn: the viewer first, then the strongest, up to SHOWN_MAX. */
export function shownOf(fs: Pick<Fighter, 'power'>[], me: number): number[] {
  const rest = fs.map((_, i) => i).filter((i) => i !== me).sort((a, b) => fs[b].power - fs[a].power || a - b);
  return (me >= 0 && me < fs.length ? [me, ...rest] : rest).slice(0, SHOWN_MAX);
}

const toPx = (p: Pt) => ({ x: (p.x / 100) * REF_W, y: (p.y / 100) * REF_H });
const toPct = (x: number, y: number): Pt => ({ x: (x / REF_W) * 100, y: (y / REF_H) * 100 });
// The spots, best first: a staggered grid of five rows under the Dị Thú (4, 3, 4, 3, 4 across, so no name sits under another), the middle of the front rows first,
// then a few spots in the air beside it. Every Dị Thú stands above 58% of the picture, so the grid never covers it.
export const SPOTS: Pt[] = [
  { x: 50, y: 66 }, { x: 38, y: 59 }, { x: 62, y: 59 }, { x: 26, y: 66 }, { x: 74, y: 66 }, { x: 14, y: 59 }, { x: 86, y: 59 }, { x: 50, y: 80 },
  { x: 38, y: 73 }, { x: 62, y: 73 }, { x: 26, y: 80 }, { x: 74, y: 80 }, { x: 11, y: 43 }, { x: 89, y: 43 }, { x: 14, y: 73 }, { x: 86, y: 73 },
  { x: 38, y: 87 }, { x: 62, y: 87 }, { x: 15, y: 51 }, { x: 85, y: 51 }, { x: 50, y: 92 }, { x: 14, y: 87 }, { x: 86, y: 87 }, { x: 10, y: 33 },
];
/** Where the drawn cultivators hover (the first gets the best spot). `keys` (their public ids) move each spot a little, so the rows are not ruled lines. */
export function formation(_boss: Pick<Boss, 'at'>, keys: string[]): Pt[] {
  return keys.map((k, i) => {
    const s = SPOTS[i % SPOTS.length], h = hash32(`rf|${k}`);
    return { x: s.x + (((h % 100) / 100) - 0.5) * 3, y: s.y + ((((h >>> 8) % 100) / 100) - 0.5) * 2 };
  });
}
/** How big a cultivator is drawn (percent of the stage's width): smaller in a crowd. */
export const sizeFor = (n: number) => (n <= 6 ? 20 : n <= 12 ? 17.5 : 15);
/** Where a cultivator with a ranged technique flies to before casting: part of the way to the Dị Thú, a little to one side (`side` -1..1). */
export function castAt(boss: Pick<Boss, 'at'>, from: Pt, side: number): Pt {
  const c = toPx(boss.at), f = toPx(from), dx = c.x - f.x, dy = c.y - f.y, d = Math.hypot(dx, dy) || 1, k = 0.42;
  const x = f.x + dx * k + (-dy / d) * side * 26, y = f.y + dy * k + (dx / d) * side * 26 - 14;
  return toPct(Math.max(18, Math.min(REF_W - 18, x)), Math.max(60, y));
}
/** The keyframes of a flight out to `to` and back to the start (offsets in px from the start): out on one curve, a short hover, back on a wider curve.
 *  `bend` (-1..1) says to which side the curves swing; `lean` tilts the figure into the flight. */
export function flightFrames(dx: number, dy: number, bend: number, outEnd = 0.4, holdEnd = 0.58): { offset: number; x: number; y: number; r: number; s: number }[] {
  const d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, out: { offset: number; x: number; y: number; r: number; s: number }[] = [];
  const curve = (u: number, sw: number) => ({ x: dx * u + nx * Math.sin(Math.PI * u) * sw, y: dy * u + ny * Math.sin(Math.PI * u) * sw - Math.sin(Math.PI * u) * 10 });
  const ease = (u: number) => 1 - Math.pow(1 - u, 2.2);
  const lean = Math.max(-22, Math.min(22, (dx / d) * 18));
  out.push({ offset: 0, x: 0, y: 0, r: 0, s: 1 });
  out.push({ offset: 0.06, x: -dx * 0.04, y: -dy * 0.04 + 4, r: -lean * 0.3, s: 0.94 });   // gathers
  for (let i = 1; i <= 5; i++) { const u = ease(i / 5), p = curve(u, bend * Math.min(60, d * 0.35)); out.push({ offset: 0.06 + (outEnd - 0.06) * (i / 5), x: p.x, y: p.y, r: lean * (1 - u * 0.5), s: 1 + 0.12 * u }); }
  out.push({ offset: holdEnd, x: dx, y: dy - 3, r: lean * 0.3, s: 1.1 });
  for (let i = 1; i <= 5; i++) { const u = i / 5, p = curve(1 - u, -bend * Math.min(80, d * 0.5)); out.push({ offset: holdEnd + (1 - holdEnd) * (i / 5), x: p.x, y: p.y, r: -lean * 0.4 * Math.sin(Math.PI * u), s: 1.1 - 0.1 * u }); }
  return out;
}
/** Where a melee blow is struck from: on the edge of the Dị Thú, on the side the cultivator comes from. */
export function strikeAt(boss: Pick<Boss, 'at'>, from: Pt): Pt {
  const c = toPx(boss.at), f = toPx(from), R = (boss.at.r / 100) * REF_W * 0.62;
  const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1;
  return toPct(c.x + (dx / d) * R, c.y + (dy / d) * R * 0.8 + 10);
}

// ---------- the timeline
export const INTRO_MS = 5600, OUTRO_MS = 6000, ROUND_GAP = 300;
export const ACT_MS = 1350, HIT_MS = 560;           // a cultivator's flight (out, strike, back) and when its blow lands
export const TELE_MS = 1100, RAGE_MS = 2000, STUN_MS = 1500;
export const ULT_MS = 4400;                          // the clip of the great attack (of its 5 seconds); the blow lands at its end
export const BOSS_END_MS = 1200;                     // after the Dị Thú's blow, before the next round
export interface ActBeat { t: number; a: FAct; shown: boolean }
export interface BossBeat { t: number; hit: number /* absolute ms of the (first) blow */; b: BAct }
export interface RoundBeat { r: number; t0: number; acts: ActBeat[]; off: { t: number; d: number; n: number } | null; rage: number | null; boss: BossBeat | null; end: number; hp: number }
export interface Timeline { rounds: RoundBeat[]; outro: number; total: number }

/** The beats of the film. `shown`: the fighters drawn on the stage (shownOf). */
export function timelineOf(rounds: Round[], shown: number[]): Timeline {
  const drawn = new Set(shown);
  let t = INTRO_MS;
  const out: RoundBeat[] = [];
  for (const r of rounds) {
    const t0 = t, vis = r.f.filter((a) => drawn.has(a.i)), hid = r.f.filter((a) => !drawn.has(a.i));
    const gap = Math.max(110, Math.min(480, 2600 / Math.max(1, vis.length)));
    let k = 0;
    const acts: ActBeat[] = r.f.map((a) => (drawn.has(a.i) ? { t: t0 + (k++) * gap, a, shown: true } : { t: t0 + 1100, a, shown: false }));
    const lastStart = vis.length ? t0 + (vis.length - 1) * gap : t0 + 600;
    const off = hid.length ? { t: t0 + 1100 + HIT_MS, d: hid.reduce((s, a) => s + a.d, 0), n: new Set(hid.map((a) => a.i)).size } : null;
    t = Math.max(lastStart + ACT_MS, off ? off.t + 600 : 0);
    let rage: number | null = null;
    if (r.rage) { rage = t + 200; t = rage + RAGE_MS; }
    let boss: BossBeat | null = null;
    if (r.b) {
      const b = r.b, start = t + 250;
      const hit = b.stun ? start + 300 : start + TELE_MS + (b.s === 2 ? ULT_MS : b.s === 1 ? 450 : 380);
      boss = { t: start, hit, b };
      t = b.stun ? start + STUN_MS : hit + BOSS_END_MS + (b.s === 1 ? b.t.length * 90 : 0);
    }
    out.push({ r: r.r, t0, acts, off, rage, boss, end: t, hp: r.hp });
    t += ROUND_GAP;
  }
  return { rounds: out, outro: t, total: t + OUTRO_MS };
}
/** When the i-th target of a sweep is hit (they are hit one after another). */
export const sweepHit = (bb: BossBeat, i: number) => bb.hit + (bb.b.s === 1 ? i * 90 : 0);

/** Everything the screen shows at a moment of the film: the Dị Thú's Sinh Lực, every fighter's Sinh Lực, who has fallen, and the round. Used to start the film in the middle. */
export function stateAt(max: number, fs: Pick<Fighter, 'hp'>[], tl: Timeline, t: number) {
  let hp = max, round = 0, rage = false;
  const fhp = fs.map((f) => f.hp), down = fs.map(() => false);
  for (const rb of tl.rounds) {
    if (rb.t0 > t) break;
    round = rb.r;
    for (const ab of rb.acts) {
      const at = ab.shown ? ab.t + HIT_MS : rb.off ? rb.off.t : ab.t;
      if (at > t) continue;
      hp = Math.max(0, hp - ab.a.d);
      if (ab.a.t !== undefined && ab.a.h !== undefined) fhp[ab.a.t] = ab.a.h;
    }
    if (rb.rage !== null && rb.rage <= t) rage = true;
    if (rb.boss && !rb.boss.b.stun) rb.boss.b.t.forEach((j, i) => { if (sweepHit(rb.boss!, i) <= t) { fhp[j] = rb.boss!.b.h[i]; if (rb.boss!.b.ko.includes(j)) down[j] = true; } });
  }
  return { hp, fhp, down, round, rage };
}
