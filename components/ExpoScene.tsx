'use client';
import { Fragment, memo, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import * as C from '@/lib/content';
import * as XP from '@/lib/expo';
import * as FL from '@/lib/expofly';
import { hash32 } from '@/lib/orders';
import { expoView, type StandView } from '@/lib/game';
import { sfx } from '@/lib/audio';
import type { GS } from '@/lib/client/types';
import { Icon } from './ds/Icon';
import { BeastArt, ItemIcon, fmt } from './ui';
import { ReactIcon } from './ReactIcon';
import { shortNum } from '@/lib/shortnum';
import { Cultivator, lookOf } from './Cultivator';
import { CutImg } from './CutImg';
import { useFx } from './fx/FxProvider';

// The stage of Triển lãm: three tiers of cloud, six stands, the chest of gifts, and the visitors. A visitor is a cultivator standing on a flying sword (components/Cultivator.tsx) that follows the
// plan of lib/expofly.ts: it flies in, hovers beside each stand it looks at (the sword rocks up and down), a round face pops over its head (no words: love, wow, like, sad, angry), a ring and some
// sparks answer on the stand, Linh Thạch coins and the gift arc into the chest, and it leaves. Everything that moves is a Web Animation on transform and opacity, made once when the visitor appears:
// React does not draw a single frame of it. A page that wants calm (prefers-reduced-motion, effects off) gets the still stage and no visitors; the tallies under each stand and the chest still tell what happened.
const RCOL: Record<XP.Reaction, string> = { love: '#ff6fb0', wow: '#ffb02e', like: '#ffd95a', sad: '#9aa6d6', angry: '#ef4a2a' };   // the colour of each emoji (components/ReactIcon.tsx): the glow and sparks of a look match its face
const GIFT_COL = { weapon: '#ff9a4a', pill: '#5fe0a4', book: '#b58cff' } as const;
const MAX_LIVE = 4;   // visitors on the stage at once (one comes about every 5 seconds and a visit lasts 3 to 10, so two or three at a time is usual)

/** True when the page asks for calm: no flights are made. */
export function useCalm(): boolean {
  const fx = useFx();
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setRm(m.matches);
    f(); m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return rm || fx.level === 'off' || (typeof document !== 'undefined' && document.documentElement.dataset.fx === 'off');
}
const canFly = () => typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
type Els = MutableRefObject<(HTMLElement | null)[]>;
const coinsOf = (stones: number) => (stones <= 0 ? 0 : stones < 40 ? 1 : stones < 400 ? 2 : stones < 4000 ? 3 : 4);

/** Small sparks that fly out of a point of the stage and fade (a reaction on a stand, the chest opening). */
function Sparks({ at, delay, color, count, seed }: { at: FL.Pt; delay: number; color: string; count: number; seed: number }) {
  const els = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const first = els.current[0];
    if (!first || !canFly() || !first.parentElement) return;
    const W = first.parentElement.clientWidth, H = first.parentElement.clientHeight, x = (at.x / 100) * W - 3.5, y = (at.y / 100) * H - 3.5;
    const run: Animation[] = [];
    els.current.forEach((el, i) => {
      if (!el) return;
      const ang = ((i + (hash32(`sa|${seed}|${i}`) % 100) / 100) / count) * Math.PI * 2, d = 24 + (hash32(`sd|${seed}|${i}`) % 24);
      run.push(el.animate([
        { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` },
        { opacity: 0, transform: `translate(${x + Math.cos(ang) * d}px, ${y + Math.sin(ang) * d - 10}px) scale(0.2)` },
      ], { duration: 700 + (i % 3) * 150, delay, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' }));
    });
    return () => run.forEach((a) => a.cancel());
  }, []);
  return <>{Array.from({ length: count }, (_, i) => <i key={i} ref={(el) => { els.current[i] = el; }} className="xSpark" style={{ '--c': color } as CSSProperties} />)}</>;
}

// ---- what is still on its way: the server adds a visit's Linh Thạch, gift and reactions the moment it makes the visit, but on the screen the visitor has yet to fly in and look.
// Each part of a new visit is held back (left out of the numbers shown) until its moment in the flight: a reaction when its face pops up, the Linh Thạch when the last coin lands
// in the chest, the gift when it lands. Ids are `${visit n}|...`, so a whole visit can be let go at once.
export type Held = { slot: number; ri: number } | { stones: number } | { gift: XP.Gift };
export type HeldMap = Record<string, Held>;
export type Hold = Dispatch<SetStateAction<HeldMap>>;
const heldOf = (v: XP.Visit): HeldMap => {
  const m: HeldMap = {};
  v.route.forEach((s, i) => {
    if (s.r) m[`${v.n}|r${i}`] = { slot: s.slot, ri: XP.REACTIONS.indexOf(s.r) };
    if (s.stones > 0) m[`${v.n}|c${i}`] = { stones: s.stones };
  });
  if (v.gift) m[`${v.n}|g`] = { gift: v.gift };
  return m;
};
const letGo = (hold: Hold, pred: (id: string) => boolean) => hold((m) => {
  const ids = Object.keys(m).filter(pred);
  if (!ids.length) return m;
  const n = { ...m }; for (const id of ids) delete n[id];
  return n;
});
/** The expo as the screen should show it: what the server says, less what is still held back. */
export function heldBack(e: XP.Expo | null, m: HeldMap): XP.Expo | null {
  const parts = Object.values(m);
  if (!e || !parts.length) return e;
  const stands = e.stands.map((s) => (s ? { ...s, tally: [...s.tally] as XP.Tally } : s));
  const box: XP.Box = { stones: e.box.stones, weapons: [...e.box.weapons], pills: [...e.box.pills], books: { ...e.box.books } };
  let weapons = 0;
  for (const p of parts) {
    if ('ri' in p) { const t = stands[p.slot]?.tally; if (t && p.ri >= 0) t[p.ri] = Math.max(0, t[p.ri] - 1); }
    else if ('stones' in p) box.stones = Math.max(0, box.stones - p.stones);
    else if (p.gift.kind === 'weapon') weapons++;
    else if (p.gift.kind === 'pill') box.pills[p.gift.grade] = Math.max(0, (box.pills[p.gift.grade] || 0) - p.gift.n);
    else if (box.books[p.gift.name]) { box.books[p.gift.name]--; if (box.books[p.gift.name] <= 0) delete box.books[p.gift.name]; }
  }
  if (weapons) box.weapons = box.weapons.slice(0, Math.max(0, box.weapons.length - weapons));
  return { ...e, stands, box };
}

type FlightT = { key: string; v: XP.Visit; delay: number; held?: boolean };
const Flight = memo(function Flight({ f, pieces, chest, onDone, hold }: { f: FlightT; pieces: Els; chest: RefObject<HTMLElement | null>; onDone: (key: string) => void; hold: Hold }) {
  const v = f.v;
  const plan = useMemo(() => FL.planOf(v), [v]);
  const look = useMemo(() => lookOf(v.who.arch, v.who.g, hash32(`${v.who.name}|${v.n}`)), [v]);
  const fly = useRef<HTMLDivElement>(null);
  const bub = useRef<(HTMLElement | null)[]>([]), ring = useRef<(HTMLElement | null)[]>([]), coin = useRef<(HTMLElement | null)[]>([]), gift = useRef<HTMLDivElement>(null);
  const coinN = plan.stops.map((s) => coinsOf(s.stones));
  useEffect(() => {
    const el = fly.current, stage = el?.parentElement;
    if (!el || !stage || !canFly()) { onDone(f.key); return; }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // let a held part of this visit show, at `when` ms into the flight (only a visit that was held: the replays of old visits were already counted)
    const release = (id: string, when: number) => { if (f.held) timers.push(setTimeout(() => letGo(hold, (k) => k === id), Math.max(0, f.delay + when))); };
    const W = stage.clientWidth, H = stage.clientHeight, w = el.offsetWidth, h = el.offsetHeight;
    const at = (p: FL.Pt, ox: number, oy: number) => `translate(${(p.x / 100) * W - ox}px, ${(p.y / 100) * H - oy}px)`;
    const run: Animation[] = [];
    const go = (e: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      if (!e) return null;
      const a = e.animate(kf, { fill: 'forwards', ...o, delay: f.delay + (Number(o.delay) || 0) });
      run.push(a); return a;
    };
    const bump = (when: number, k: number) => go(chest.current, [{ transform: 'scale(1)' }, { transform: `scale(${k})`, offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300, delay: when, easing: 'ease-out' });
    // the visitor: the whole route in one animation
    go(el, plan.frames.map((fr) => ({ offset: Math.min(1, Math.max(0, fr.t)), opacity: 1, transform: `${at(fr, w / 2, h * 0.62)} scaleX(${fr.s}) rotate(${-fr.a}deg)` })), { duration: plan.total, easing: 'linear' });
    let ci = 0;
    plan.stops.forEach((s, i) => {
      if (!s.r) return;
      // the bubble starts above the visitor and rises 32 px: kept inside the stage, so over the top row it is not cut off by the edge
      const t0 = s.at + FL.REACT_AT_MS, sp = FL.STAND_AT[s.slot], base = `translate(${Math.min(W - 36, Math.max(2, (s.hover.x / 100) * W - 17))}px, ${Math.max(38, (s.hover.y / 100) * H - 61)}px)`;
      go(bub.current[i], [
        { opacity: 0, transform: `${base} translateY(10px) scale(0.2)` },
        { opacity: 1, transform: `${base} translateY(-3px) scale(1.3)`, offset: 0.16 },
        { opacity: 1, transform: `${base} translateY(-8px) scale(1)`, offset: 0.3 },
        { opacity: 1, transform: `${base} translateY(-20px) scale(1)`, offset: 0.78 },
        { opacity: 0, transform: `${base} translateY(-32px) scale(0.9)` },
      ], { duration: 1500, delay: t0 });
      const ringAt = at(sp, 32, 32);
      release(`${v.n}|r${i}`, t0 + 200);
      go(ring.current[i], [{ opacity: 0.9, transform: `${ringAt} scale(0.35)` }, { opacity: 0, transform: `${ringAt} scale(${s.r === 'sad' ? 1.3 : 1.8})` }], { duration: s.r === 'sad' ? 950 : 700, delay: t0, easing: 'ease-out' });
      const pic = pieces.current[s.slot]?.firstElementChild;
      if (s.r === 'love' || s.r === 'wow') go(pic, [{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 520, delay: t0, easing: 'ease-out' });
      else if (s.r === 'like') go(pic, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420, delay: t0, easing: 'ease-out' });
      else go(pic, [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)', offset: 0.2 }, { transform: 'translateX(3px)', offset: 0.45 }, { transform: 'translateX(-2px)', offset: 0.7 }, { transform: 'translateX(0)' }], { duration: s.r === 'angry' ? 420 : 620, delay: t0 });
      // Linh Thạch: a few coins arc to the chest, the chest nods as each lands
      for (let k = 0; k < coinN[i]; k++) {
        const d0 = t0 + 260 + k * 130, dur = 850;
        const kf: Keyframe[] = [];
        for (let u = 0; u <= 8; u++) { const q = FL.arcAt(sp, FL.CHEST_AT, u / 8); kf.push({ offset: u / 8, opacity: u === 0 ? 0 : u >= 8 ? 0 : 1, transform: `${at(q, 6, 6)} scale(${(1 - 0.35 * (u / 8)).toFixed(2)})` }); }
        go(coin.current[ci++], kf, { duration: dur, delay: d0, easing: 'linear' });
        bump(d0 + dur - 120, 1.1);
        if (k === coinN[i] - 1) release(`${v.n}|c${i}`, d0 + dur - 120);
      }
    });
    // the gift: a round token that spins to the chest
    if (plan.gift && v.gift) {
      const g0 = plan.gift.at, kf: Keyframe[] = [];
      for (let u = 0; u <= 12; u++) { const q = FL.arcAt(plan.gift.from, FL.CHEST_AT, u / 12); kf.push({ offset: u / 12, opacity: u >= 12 ? 0 : 1, transform: `${at(q, 15, 15)} scale(${(0.4 + 0.8 * Math.sin((u / 12) * Math.PI * 0.9)).toFixed(2)}) rotate(${u * 40}deg)` }); }
      const a = go(gift.current, kf, { duration: 1150, delay: g0, easing: 'linear' });
      if (a) a.onfinish = () => { if (alive) sfx('chime'); };
      bump(g0 + 1000, 1.28);
      release(`${v.n}|g`, g0 + 1000);
    }
    Promise.allSettled(run.map((a) => a.finished)).then(() => { if (alive) onDone(f.key); });
    return () => { alive = false; timers.forEach(clearTimeout); run.forEach((a) => a.cancel()); };
  }, []);
  const gk = v.gift ? v.gift.kind : null, gc = gk ? GIFT_COL[gk] : '#ffd36b';
  let ck = 0;
  return (
    <>
      <div ref={fly} className="xFly" style={{ '--ph': look.ph, '--glow': look.glow } as CSSProperties}><div className="xRock"><Cultivator look={look} /></div></div>
      {plan.stops.map((s, i) => s.r && (
        <Fragment key={`b${i}`}>
          <div ref={(el) => { bub.current[i] = el; }} className="xBub"><ReactIcon r={s.r} size={34} /></div>
          <div ref={(el) => { ring.current[i] = el; }} className="xRing" style={{ '--c': RCOL[s.r] } as CSSProperties} />
          {(s.r === 'love' || s.r === 'wow' || s.r === 'like') && <Sparks at={FL.STAND_AT[s.slot]} delay={f.delay + s.at + FL.REACT_AT_MS} color={RCOL[s.r]} count={s.r === 'love' ? 9 : s.r === 'wow' ? 7 : 5} seed={v.n * 11 + i} />}
          {Array.from({ length: coinN[i] }, () => { const k = ck++; return <div key={`c${k}`} ref={(el) => { coin.current[k] = el; }} className="xCoin" />; })}
        </Fragment>
      ))}
      {plan.gift && v.gift && (
        <>
          <div ref={gift} className="xGift" style={{ '--c': gc } as CSSProperties}>
            {v.gift.kind === 'pill' ? <img src={C.shopArt(`hp${v.gift.grade}`)} alt="" draggable={false} /> : <Icon name={v.gift.kind === 'book' ? 'book' : 'atk'} size={16} />}
          </div>
          <Sparks at={FL.CHEST_AT} delay={f.delay + plan.gift.at + 1050} color={gc} count={10} seed={v.n * 13} />
        </>
      )}
    </>
  );
}, (a, b) => a.f.key === b.f.key && a.hold === b.hold);   // a visitor is made once and then runs by itself: the screen updating around it does not touch it

// ---- the stands
const standSig = (v: StandView) => (v ? `${v.kind}:${v.kind === 'item' ? `${v.item.id}:${v.item.level}:${v.item.tier}` : `${v.beast.id}:${v.beast.level}:${v.beast.mut}`}` : 'x');
const nameOf = (v: StandView) => (v ? (v.kind === 'item' ? v.item.name : v.beast.name) : '');
interface StandProps { i: number; v: StandView; sig: string; onStand: (i: number) => void; pieces: Els }
const Stand = memo(function Stand({ i, v, onStand, pieces }: StandProps) {
  const p = FL.STAND_AT[i];
  const tier = v ? (v.kind === 'item' ? v.item.tier : XP.beastTier(v.beast.cls, v.beast.mut)) : 0;
  const key = v ? `${v.kind}${v.kind === 'item' ? v.item.id : v.beast.id}` : 'e';
  return (
    <div className={`xStand${v ? ' on' : ' empty'}`} role="button" tabIndex={0} aria-label={v ? `Bệ ${i + 1}: ${nameOf(v)}` : `Bệ ${i + 1}, còn trống`} style={{ left: `${p.x}%`, top: `${p.y}%`, '--rc': C.RCOLOR[tier] } as CSSProperties}
      onClick={() => onStand(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStand(i); } }}>
      {v && <i className="xAura" style={{ '--dl': `${-(i * 0.9)}s` } as CSSProperties} />}
      <span className="xPed"><i className="xPuff" /><CutImg id="expo_slab" className="xPedImg" fb={<i className="xStone" />} /></span>
      <div key={key} ref={(el) => { pieces.current[i] = el; }} className={`xPiece${v ? '' : ' empty'}`} style={{ '--pd': `${i * 0.07}s` } as CSSProperties}>
        {v ? (v.kind === 'item' ? <ItemIcon it={v.item} size={56} /> : <BeastArt b={v.beast} box={64} mine onOpen={() => onStand(i)} />) : <Icon name="plus" size={20} />}
      </div>
    </div>
  );
}, (a, b) => a.sig === b.sig && a.onStand === b.onStand && a.i === b.i);

// ---- the sky
const WISPS = [{ top: 8, d: 44, dl: -10 }, { top: 33, d: 52, dl: -31 }, { top: 58, d: 40, dl: -4 }, { top: 82, d: 58, dl: -22 }];
const QI = Array.from({ length: 10 }, (_, i) => ({ l: 6 + ((i * 37) % 88), d: 8 + (i % 4) * 2.2, dl: -((i * 1.7) % 9), sw: ((i % 5) - 2) * 9 }));
// Far visitors that only pass by (no reaction, no gift). They are made at random when the stage shows (never on the server, so the page and the screen agree), each one with its own
// height, size, speed and direction, and they are quick: a trip across the stage is 6 to 16 seconds.
interface Amb { y: number; w: number; d: number; dl: number; rev: boolean; op: number; look: ReturnType<typeof lookOf>; ph: number }
const makeAmb = (n: number): Amb[] => Array.from({ length: n }, (_, i) => {
  const r = Math.random, arch = C.NPC_TITLES[Math.floor(r() * C.NPC_TITLES.length)], w = 13 + r() * 12;
  return { y: 6 + r() * 86, w, d: 6 + r() * 10, dl: -r() * 16, rev: r() < 0.5, op: 0.3 + r() * 0.3, look: lookOf(arch, r() < 0.5 ? 'f' : 'm', Math.floor(r() * 1000) + i), ph: r() * 2 };
});

export interface SceneProps { st: GS; onStand: (slot: number) => void; onChest: () => void; held: HeldMap; hold: Hold }
export function ExpoScene({ st, onStand, onChest, held, hold }: SceneProps) {
  const real = XP.isExpo(st.expo) ? st.expo : null;
  const e = useMemo(() => heldBack(real, held), [real, held]);   // the numbers shown: without what the visitors on their way have not given yet
  const views = useMemo(() => expoView(st), [st.expo, st.bag, st.stash, st.beasts]);
  const calm = useCalm();
  const [flights, setFlights] = useState<FlightT[]>([]);
  const [burst, setBurst] = useState(0);
  const [amb, setAmb] = useState<Amb[]>([]);
  useEffect(() => { if (!calm) setAmb(makeAmb(5 + Math.floor(Math.random() * 3))); else setAmb([]); }, [calm]);
  const pieces = useRef<(HTMLElement | null)[]>([]), chest = useRef<HTMLButtonElement>(null), seen = useRef<number | null>(null), had = useRef(false);
  const top = e && e.log.length ? e.log[e.log.length - 1].n : 0, has = !!real && XP.boxCount(real.box) > 0, shows = !!e && XP.boxCount(e.box) > 0;
  // what the chest says without opening it: how many Linh Thạch, and how many gifts besides (weapons, pills, books)
  const stones = e ? e.box.stones : 0, gifts = e ? e.box.weapons.length + e.box.pills.reduce((a, n) => a + n, 0) + Object.values(e.box.books).reduce((a, n) => a + n, 0) : 0;
  const tapChest = () => {
    if (has) { onChest(); return; }
    if (canFly()) chest.current?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 260 });   // empty: the chest only shakes a little
  };
  // new visitors the server made: the first look replays the latest three so the stage is busy at once; after that each new one flies in, a moment apart when several came together
  useEffect(() => {
    if (calm || !e || !canFly()) return;
    const log = e.log;
    if (seen.current === null) {
      seen.current = top;
      setFlights(log.slice(-3).map((x, k) => ({ key: `r${x.n}`, v: x, delay: 400 + k * 1700 })));
      return;
    }
    if (top > seen.current) {
      const from = seen.current, fresh = log.filter((x) => x.n > from).slice(-3);
      seen.current = top;
      setFlights((cur) => {
        // only the visitors that will really fly are held back; the rest (too many at once) count at once
        const take = fresh.slice(0, Math.max(0, MAX_LIVE - cur.length));
        if (take.length) hold((m) => Object.assign({}, m, ...take.map(heldOf)));
        return [...cur, ...take.map((x, k) => ({ key: `n${x.n}`, v: x, delay: 150 + k * 1500, held: true }))];
      });
    }
  }, [top, calm, !!e]);
  // the box was emptied (collected): the chest opens
  useEffect(() => {
    if (had.current && !has && !calm && canFly()) {
      setBurst((b) => b + 1);
      chest.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22) rotate(-4deg)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 460, easing: 'ease-out' });
    }
    had.current = has;
  }, [has, calm]);
  // a visitor that has gone lets go of whatever of it is still held (its timers may have been cut short)
  const done = useMemo(() => (key: string) => {
    setFlights((cur) => cur.filter((x) => x.key !== key));
    if (key[0] === 'n') { const n = key.slice(1); letGo(hold, (id) => id.startsWith(`${n}|`)); }
  }, [hold]);
  // leaving the stage (or calm turned on): nothing is held any more
  useEffect(() => () => hold({}), [hold]);
  useEffect(() => { if (calm) hold({}); }, [calm, hold]);
  return (
    <div className="xStage" role="group" aria-label="Triển lãm trên mây">
      <div className="xSky" />
      {WISPS.map((w, i) => <i key={i} className="xWisp" style={{ top: `${w.top}%`, '--d': `${w.d}s`, '--dl': `${w.dl}s` } as CSSProperties} />)}
      {QI.map((q, i) => <i key={i} className="xQi" style={{ left: `${q.l}%`, '--d': `${q.d}s`, '--dl': `${q.dl}s`, '--sw': `${q.sw}px` } as CSSProperties} />)}
      {[0, 1, 2, 3].map((i) => <div key={i} className={`xTier t${i}`} />)}
      {amb.map((a, i) => <div key={i} className={`xAmb${a.rev ? ' rev' : ''}`} style={{ top: `${a.y}%`, width: `${a.w}%`, opacity: a.op, '--a': a.rev ? `${Math.round(10000 / a.w) + 10}%` : '-115%', '--b': a.rev ? '-115%' : `${Math.round(10000 / a.w) + 10}%`, '--d': `${a.d}s`, '--dl': `${a.dl}s`, '--ph': a.ph, '--glow': a.look.glow } as CSSProperties}><div className="xRock"><Cultivator look={a.look} /></div></div>)}
      {FL.STAND_AT.map((_, i) => <Stand key={i} i={i} v={views[i]} sig={standSig(views[i])} onStand={onStand} pieces={pieces} />)}
      {/* under each stone: only what most visitors felt, as one small pill (the whole row of five is on the sheet of the stand). Drawn here, above the stands, the chest and the visitors */}
      {FL.STAND_AT.map((p, i) => {
        const top = e && e.stands[i] ? XP.topReaction(e.stands[i]!.tally) : null;
        return top ? <div key={`t${i}`} className="xTally" style={{ left: `${p.x}%`, top: `${p.y}%` }} title={`${XP.REACTION_NAME[top.r]}: ${top.n}`}><span><ReactIcon r={top.r} size={18} />{shortNum(top.n)}</span></div> : null;
      })}
      <button type="button" ref={chest} className={`xChest${shows ? ' full' : ''}`} onClick={tapChest} aria-label={has ? `Thu quà khách để lại: ${fmt(stones)} Linh Thạch, ${gifts} món quà` : 'Hòm quà của khách, đang trống'}>
        <span className="xChestIn"><CutImg id="expo_chest" className="xChestImg" fb={<span className="xChestPlate"><Icon name="chest" size={30} /></span>} /></span>
        {gifts > 0 && <i className="xChestN">{gifts > 99 ? '99+' : gifts}</i>}
        {stones > 0 && <span className="xChestTx"><Icon name="stone" size={11} />{fmt(stones)}</span>}
      </button>
      {flights.map((f) => <Flight key={f.key} f={f} pieces={pieces} chest={chest} onDone={done} hold={hold} />)}
      {burst > 0 && <Sparks key={burst} at={FL.CHEST_AT} delay={0} color="#ffd36b" count={12} seed={burst} />}
    </div>
  );
}
