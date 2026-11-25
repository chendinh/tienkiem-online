// Phó Bản, the film: the record of the fight (lib/raid.ts Result) turned into a timeline of non-stop fighting, and where every cultivator flies on the stage. Pure numbers, no DOM:
// components/RaidScene.tsx plays it, a test can check it. Every screen builds the same timeline from the same record, so two players watching at the same moment see the same blow
// (the screen starts the film at "now - fight time" while it is still running: the fight is shown live).
//
// The record is in rounds; the film is not. Each round of the record becomes a stretch of fighting (a "segment") in which every cultivator keeps flying and keeps shooting:
// a stream of small qi bolts and, once per segment, its technique (a bigger blow, the one that shows a number). The round's damage of that cultivator is split over those shots,
// so the Dị Thú's Sinh Lực drains bolt by bolt and is exactly the record's at the end. The Dị Thú never stops shooting either: a barrage of bullets in patterns that is only for
// the eye (components/RaidScene.tsx draws it from the time alone), and among them the aimed blows of the record, which land on their targets and take their Sinh Lực.
// Who falls in a round is hit first in that round's blows, so nobody shoots after falling; heals land after the blows of the round before, as in the record.
//
// The stage is a 9:16 box of REF_W x REF_H reference pixels; points are percent of the box. The Dị Thú is part of the picture behind (lib/raid.ts Boss.at says where).
import type { Boss, Fighter, FAct, Round } from './raid';
import { hash32 } from './orders';

export const REF_W = 360, REF_H = 640;
export const SHOWN_MAX = 24;   // cultivators drawn on the stage; the others fight off screen (their bolts come in from below the stage)
export interface Pt { x: number; y: number }

/** Which fighters are drawn: the viewer first, then the strongest, up to SHOWN_MAX. */
export function shownOf(fs: Pick<Fighter, 'power'>[], me: number): number[] {
  const rest = fs.map((_, i) => i).filter((i) => i !== me).sort((a, b) => fs[b].power - fs[a].power || a - b);
  return (me >= 0 && me < fs.length ? [me, ...rest] : rest).slice(0, SHOWN_MAX);
}

// The home spots, best first: a staggered grid of five rows under the Dị Thú (4, 3, 4, 3, 4 across, so no name sits under another), the middle of the front rows first,
// then a few spots in the air beside it. Every Dị Thú stands above 58% of the picture, so the grid never covers it. In the film each cultivator flies loops around its spot.
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

// ---------- flight: every cultivator is always on the move
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const unit = (h: number, shift: number) => ((h >>> shift) % 1000) / 1000;
const TAU = Math.PI * 2;
export const FLY_X = 17, FLY_Y = 9;   // how far a cultivator swings from its spot (percent of the width / height)
/** Where a cultivator flies at film time `t` (ms): its spot plus a loop of two waves on each axis, at its own speeds and phases (from its key), so the crowd never moves in step. */
const flyKeys = new Map<string, [number, number]>();
export function flyAt(home: Pt, key: string, t: number): Pt {
  let hg = flyKeys.get(key);
  if (!hg) { hg = [hash32(`fly|${key}`), hash32(`fly2|${key}`)]; if (flyKeys.size > 2000) flyKeys.clear(); flyKeys.set(key, hg); }
  const [h, g] = hg, s = t / 1000;
  const w1 = TAU / (3.2 + unit(h, 0) * 2.4), w2 = TAU / (1.5 + unit(h, 10) * 1.0), w3 = TAU / (2.7 + unit(g, 0) * 2.2), w4 = TAU / (1.2 + unit(g, 10) * 0.9);
  const x = home.x + FLY_X * (0.72 * Math.sin(w1 * s + unit(h, 20) * TAU) + 0.28 * Math.sin(w2 * s + unit(g, 20) * TAU));
  const y = home.y + FLY_Y * (0.7 * Math.sin(w3 * s + unit(h, 5) * TAU) + 0.3 * Math.sin(w4 * s + unit(g, 5) * TAU));
  return { x: clamp(x, 6, 94), y: clamp(y, 28, 93) };
}

// ---------- the timeline
export const INTRO_MS = 5200, OUTRO_MS = 6000;
export const SEG_MS = 3400;            // one round of the record, played as a stretch of non-stop fighting
export const ULT_MS = 4400;            // the clip of the great attack (of its 5 seconds): a round with it lasts this much longer
export const SHOT_MS = 430, BIG_MS = 520, BOSS_SHOT_MS = 680, HEAL_MS = 460, OFF_SHOTS = 6;
export const WAVE_MS = 420;            // the Dị Thú's barrage: one wave of bullets this often (components/RaidScene.tsx)

/** A shot of a cultivator at the Dị Thú. i: the fighter (-1: the ones off the stage); t: when it leaves; land: when it hits; k: the technique (big: the technique itself, else a qi bolt). */
export interface Shot { t: number; land: number; i: number; d: number; k: number; big?: 1; c?: 1; q: number /* its number in the film (for the aim) */ }
/** An aimed blow of the Dị Thú (one of the record's): s its technique, j the target, d the damage, h the target's Sinh Lực after. */
export interface BossShot { t: number; land: number; j: number; s: 0 | 1 | 2; d: number; h: number; ko?: 1 }
export type FilmEvent =
  | { k: 'hit'; t: number; i: number; d: number; big?: 1; c?: 1 }        // a shot of a drawn cultivator lands
  | { k: 'off'; t: number; d: number; n: number; sum?: number }          // a bolt of the ones off the stage lands (the last of the round carries their total)
  | { k: 'cast'; t: number; i: number; a: FAct }                          // a support technique (a heal lands HEAL_MS later)
  | { k: 'heal'; t: number; i: number; j: number; h: number }
  | { k: 'hurt'; t: number; j: number; d: number; h: number; s: 0 | 1 | 2; ko?: 1 }
  | { k: 'tele'; t: number; s: 0 | 1 | 2; rage?: 1; g?: 1 }               // the Dị Thú gathers the technique of its blows
  | { k: 'ult'; t: number }                                               // the clip of its great attack starts
  | { k: 'rage'; t: number }
  | { k: 'stun'; t: number };
export interface SegBeat {
  r: number; t0: number; end: number; hp: number /* the Dị Thú's Sinh Lực after the round (the record's) */;
  tele: number | null; ult: number | null; rage: number | null; stun: number | null; hits: [number, number] | null /* when its blows of the round land */;
  off: { t: number; d: number; n: number } | null;
}
export interface Timeline {
  rounds: SegBeat[]; shots: Shot[]; bshots: BossShot[]; events: FilmEvent[];
  pauses: [number, number][];   // the barrage holds its fire (stunned, or gathering its great attack)
  rageAt: number | null;        // from here the barrage is denser
  start: number; outro: number; total: number;
}
const byT = <T extends { t: number }>(a: T, b: T) => a.t - b.t;

/** The beats of the film. `shown`: the fighters drawn on the stage (shownOf). */
export function timelineOf(rounds: Round[], shown: number[]): Timeline {
  const drawn = new Set(shown);
  const shots: Shot[] = [], bshots: BossShot[] = [], events: FilmEvent[] = [], segs: SegBeat[] = [], pauses: [number, number][] = [];
  let t = INTRO_MS, q = 0, rageAt: number | null = null;
  for (const r of rounds) {
    const b = r.b, nova = !!b && !b.stun && b.s === 2;
    const len = SEG_MS + (nova ? ULT_MS : 0), t0 = t, t1 = t0 + len;
    const seg: SegBeat = { r: r.r, t0, end: t1, hp: r.hp, tele: null, ult: null, rage: null, stun: null, hits: null, off: null };

    // ---- the Dị Thú's blows of this round (worked out first: who falls, and when, decides how long they shoot)
    const koAt = new Map<number, number>();
    let quiet: [number, number] | null = null;   // the clip of the great attack: the cultivators brace and hold their fire
    if (b && b.stun) {
      seg.stun = t1 - 0.3 * SEG_MS;
      events.push({ k: 'stun', t: seg.stun });
      pauses.push([seg.stun, t1 + 0.25 * SEG_MS]);
    } else if (b) {
      let hitStart: number;
      if (nova) {
        seg.tele = t0 + 0.18 * SEG_MS; seg.ult = seg.tele + 700; hitStart = seg.ult + ULT_MS - 250;
        pauses.push([seg.tele, hitStart + 250]);
        quiet = [seg.ult - 100, hitStart + 200];
      } else {
        hitStart = t1 - 0.15 * SEG_MS; seg.tele = hitStart - BOSS_SHOT_MS - 350;
      }
      if (r.rage) { seg.rage = seg.tele - 60; rageAt = seg.rage; events.push({ k: 'rage', t: seg.rage }); }
      events.push({ k: 'tele', t: seg.tele, s: b.s, ...(r.rage ? { rage: 1 as const } : {}), ...(b.g ? { g: 1 as const } : {}) });
      if (seg.ult !== null) events.push({ k: 'ult', t: seg.ult });
      // the fallen first, then the others, one after another (all at once for the great attack)
      const order = b.t.map((_, n) => n).sort((x, y) => Number(b.ko.includes(b.t[y])) - Number(b.ko.includes(b.t[x])) || x - y);
      const step = nova ? Math.min(30, 700 / Math.max(1, order.length)) : Math.min(170, (0.68 * SEG_MS) / Math.max(1, order.length));
      order.forEach((n, m) => {
        const j = b.t[n], land = Math.round(hitStart + m * step), ko = b.ko.includes(j);
        if (ko) koAt.set(j, land);
        events.push({ k: 'hurt', t: land, j, d: b.d[n], h: b.h[n], s: b.s, ...(ko ? { ko: 1 as const } : {}) });
        if (drawn.has(j)) bshots.push({ t: land - BOSS_SHOT_MS, land, j, s: b.s, d: b.d[n], h: b.h[n], ...(ko ? { ko: 1 as const } : {}) });
      });
      seg.hits = [Math.round(hitStart), Math.round(hitStart + Math.max(0, order.length - 1) * step)];
    }

    // ---- the cultivators: a stream of bolts each, and its technique once
    const held = (x: number, fly: number) => !!quiet && x + fly >= quiet[0] && x <= quiet[1];
    let offD = 0;
    const offWho = new Set<number>();
    for (const a of r.f) {
      if (!drawn.has(a.i)) { offD += a.d; offWho.add(a.i); continue; }
      const h = hash32(`sh|${a.i}|${r.r}`), every = 440 + unit(h, 0) * 220;
      const lastLaunch = Math.min(t1 - 160, (koAt.get(a.i) ?? Infinity) - 90);
      if (a.f) {
        // a support technique: cast late in the stretch (after the blows of the round before have landed), and a few bolts for the look
        const ct = Math.round(t0 + (0.62 + unit(h, 10) * 0.12) * SEG_MS);
        events.push({ k: 'cast', t: ct, i: a.i, a });
        if (a.f === 'heal' && a.t !== undefined && a.h !== undefined) events.push({ k: 'heal', t: ct + HEAL_MS, i: a.i, j: a.t, h: a.h });
        for (let x = t0 + 80 + unit(h, 20) * every; x <= lastLaunch; x += every * 1.5) if (Math.abs(x - ct) > 220 && !held(x, SHOT_MS)) shots.push({ t: Math.round(x), land: Math.round(x) + SHOT_MS, i: a.i, d: 0, k: a.k, q: q++ });
        continue;
      }
      let tb = t0 + (0.18 + unit(h, 10) * 0.4) * len;
      if (tb > lastLaunch - 40) tb = Math.max(t0 + 60, lastLaunch - 200);
      if (quiet && held(tb, BIG_MS)) {
        // not during the clip: after it when there is time (the fallen of the great attack have none), else before it
        const a0 = quiet[1] + 150, a1 = lastLaunch - 200;
        tb = a1 >= a0 ? a0 + unit(h, 15) * (a1 - a0) : Math.max(t0 + 60, Math.min(quiet[0] - BIG_MS - 120, t0 + 200 + unit(h, 15) * Math.max(0, quiet[0] - BIG_MS - 320 - t0)));
      }
      const small: number[] = [];
      for (let x = t0 + 60 + unit(h, 20) * every; x <= lastLaunch; x += every) if (Math.abs(x - tb) > 170 && !held(x, SHOT_MS)) small.push(Math.round(x));
      const st = small.length ? Math.floor(a.d * 0.6) : 0, per = small.length ? Math.floor(st / small.length) : 0, rem = st - per * small.length;
      small.forEach((x, n) => {
        const d = per + (n < rem ? 1 : 0);
        shots.push({ t: x, land: x + SHOT_MS, i: a.i, d, k: a.k, q: q++ });
        events.push({ k: 'hit', t: x + SHOT_MS, i: a.i, d });
      });
      const bt = Math.round(tb), bd = a.d - st;
      shots.push({ t: bt, land: bt + BIG_MS, i: a.i, d: bd, k: a.k, big: 1, ...(a.c ? { c: 1 as const } : {}), q: q++ });
      events.push({ k: 'hit', t: bt + BIG_MS, i: a.i, d: bd, big: 1, ...(a.c ? { c: 1 as const } : {}) });
    }
    // the ones off the stage: their bolts come in from below, a few per stretch, and one number for all of them
    if (offWho.size) {
      const per = Math.floor(offD / OFF_SHOTS);
      // spread over the stretch, the clip of a great attack left out
      const gap = quiet ? quiet[1] - quiet[0] + 900 : 0, span = len - gap, at = (u: number) => { const x = t0 + u * span; return quiet && x + 450 >= quiet[0] ? x + gap : x; };
      for (let n = 0; n < OFF_SHOTS; n++) {
        const land = Math.round(at(((n + 0.7) / OFF_SHOTS) * 0.92)), d = n === OFF_SHOTS - 1 ? offD - per * (OFF_SHOTS - 1) : per;
        shots.push({ t: land - 450, land, i: -1, d, k: 0, q: q++ });
        events.push({ k: 'off', t: land, d, n: offWho.size, ...(n === OFF_SHOTS - 1 ? { sum: offD } : {}) });
        if (n === OFF_SHOTS - 1) seg.off = { t: land, d: offD, n: offWho.size };
      }
    }
    segs.push(seg);
    t = t1;
  }
  shots.sort(byT); bshots.sort(byT); events.sort(byT);
  const lastEv = events.length ? events[events.length - 1].t : t;
  let outro = Math.max(t + 300, lastEv + 900);
  // a win: the Dị Thú dies as its last Sinh Lực goes (the bolts still in the air when it does are not needed)
  const max = maxOf(rounds);
  if (max > 0 && rounds.length && rounds[rounds.length - 1].hp <= 0) {
    let hp = max;
    for (const e of events) if (e.k === 'hit' || e.k === 'off') { hp -= e.d; if (hp <= 0) { outro = e.t + 700; break; } }
  }
  outro = Math.round(outro);
  return { rounds: segs, shots, bshots, events, pauses, rageAt, start: INTRO_MS, outro, total: outro + OUTRO_MS };
}
// The Dị Thú's Sinh Lực at the start, from the record: what was left after the first round plus what that round took (exact unless it died in the first round,
// where the last blow may have gone past zero: then all the damage, a little more than its Sinh Lực).
function maxOf(rounds: Round[]): number {
  if (!rounds.length) return 0;
  const lost = (r: Round) => r.f.reduce((a, x) => a + x.d, 0);
  return rounds[0].hp > 0 ? rounds[0].hp + lost(rounds[0]) : lost(rounds[0]);
}

/** Whether the barrage holds its fire at film time t. */
export const pausedAt = (tl: Pick<Timeline, 'pauses'>, t: number) => tl.pauses.some(([a, b]) => t >= a && t < b);
/** The clips of the great attack: from the clip's start to when its blows land (the cultivators brace, are battered, then thrown back). */
export const novasOf = (tl: Pick<Timeline, 'rounds'>): [number, number][] => tl.rounds.filter((r) => r.ult !== null && r.hits).map((r) => [r.ult!, r.hits![0]]);

/** Everything the screen shows at a moment of the film: the Dị Thú's Sinh Lực, every fighter's Sinh Lực, who has fallen, the round. Used to start the film in the middle. */
export function stateAt(max: number, fs: Pick<Fighter, 'hp'>[], tl: Timeline, t: number) {
  let hp = max, round = 0, rage = false;
  const fhp = fs.map((f) => f.hp), down = fs.map(() => false);
  for (const s of tl.rounds) { if (s.t0 > t) break; round = s.r; }
  for (const e of tl.events) {
    if (e.t > t) break;
    if (e.k === 'hit' || e.k === 'off') hp = Math.max(0, hp - e.d);
    else if (e.k === 'heal') fhp[e.j] = e.h;
    else if (e.k === 'hurt') { fhp[e.j] = e.h; if (e.ko) down[e.j] = true; }
    else if (e.k === 'rage') rage = true;
  }
  return { hp, fhp, down, round, rage };
}
