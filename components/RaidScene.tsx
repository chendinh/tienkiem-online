'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as R from '@/lib/raid';
import * as P from '@/lib/raidplay';
import { fxOf, fxColor, type SkillFx } from '@/lib/skillfx';
import { sfx } from '@/lib/audio';
import { shortNum } from '@/lib/shortnum';
import { Cultivator, lookOf } from './Cultivator';
import { ElIcon } from './Icons';
import { useFx } from './fx/FxProvider';
import { playSkill, warmFx } from './fx/SkillFx';

// Phó Bản, the stage: the Dị Thú alive in its lair (a looping clip drawn by AI, scripts/gen-raid.ts), the cultivators who signed up hovering on their swords around it, each with
// their name under the sword, and the film of the fight (lib/raidplay.ts): they dash in and strike, the techniques play their own effects (components/fx/SkillFx.ts), the Dị Thú's
// Sinh Lực drains, it answers with its own blows, its great attack is a clip of its own that fills the stage, the fallen drop and fade, and at the end it dies (the clip dissolves
// into the empty lair) or flees into the mist. Nothing here decides anything: the record came from the server. Everything that moves is a Web Animation or a DOM node that removes
// itself; React only draws the cast and the banners.
export interface FilmView { day: string; boss: string; at: number; win: boolean; max: number; fighters: R.Fighter[]; rounds: R.Round[]; dmg: number[]; ko: number[]; mvp: number; me: number }
type Props =
  | { mode: 'lobby'; boss: R.Boss; crowd: R.Fighter[]; meId: string | null; caption: string }
  | { mode: 'film'; boss: R.Boss; film: FilmView; from: number /* ms into the film to start at */; live: boolean; onEnd: () => void };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MELEE = new Set(['slash', 'burst']);
const fxOfSkill = (f: R.Fighter, k: number): { fx: SkillFx; color: string; s: ReturnType<typeof R.skillOfFighter> } => {
  const s = R.skillOfFighter(f, k);
  return { fx: fxOf(s.name, s.fx?.kind, s.el || f.el), color: fxColor(s.el || f.el, s.fx?.kind), s };
};
const lookFor = (f: R.Fighter) => lookOf(f.arch, f.g, f.hair);

/** Whether the clip of a Dị Thú can be played (the file exists and the browser can decode it). */
function useClip(src: string): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(false);
    const v = document.createElement('video');
    v.muted = true; v.preload = 'metadata'; v.src = src;
    const on = () => setOk(true), off = () => setOk(false);
    v.addEventListener('loadedmetadata', on); v.addEventListener('error', off);
    return () => { v.removeAttribute('src'); v.load(); };
  }, [src]);
  return ok;
}

export function RaidScene(p: Props) {
  const fx = useFx(), boss = p.boss;
  const calm = fx.level === 'off';
  const stage = useRef<HTMLDivElement>(null), layer = useRef<HTMLDivElement>(null), loop = useRef<HTMLVideoElement>(null), ult = useRef<HTMLVideoElement>(null);
  const bossBar = useRef<HTMLElement>(null), bossLag = useRef<HTMLElement>(null), bossNum = useRef<HTMLElement>(null), glow = useRef<HTMLDivElement>(null), tint = useRef<HTMLDivElement>(null);
  const loopOk = useClip(R.raidArt(boss.id, 'loop')), ultOk = useClip(R.raidArt(boss.id, 'ult'));
  const ultReady = useRef(false); ultReady.current = ultOk;   // read when the great attack comes, so a clip that loads late does not restart the film
  const [banner, setBanner] = useState<{ k: number; text: string; sub?: string; cls: string } | null>(null);
  const [round, setRound] = useState(0);
  const [title, setTitle] = useState(false);
  const [rage, setRage] = useState(false);
  const [over, setOver] = useState<null | 'win' | 'flee'>(null);

  // the cast: who is drawn, where each one hovers
  const fighters = p.mode === 'film' ? p.film.fighters : p.crowd;
  const me = p.mode === 'film' ? p.film.me : p.crowd.findIndex((f) => f.pid === p.meId);
  const shown = useMemo(() => P.shownOf(fighters, me), [fighters, me]);
  const home = useMemo(() => P.formation(boss, shown.map((i) => fighters[i].pid)), [boss, shown, fighters]);
  const slotOf = useMemo(() => { const m = new Map<number, number>(); shown.forEach((i, s) => m.set(i, s)); return m; }, [shown]);
  const body = useRef<(HTMLDivElement | null)[]>([]), hpBar = useRef<(HTMLElement | null)[]>([]), card = useRef<(HTMLDivElement | null)[]>([]);

  // ---- the film
  useEffect(() => {
    if (p.mode !== 'film') return;
    const film = p.film, from = Math.max(0, p.from);
    const tl = P.timelineOf(film.rounds, shown);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let dead = false;
    const at = (t: number, f: () => void) => { if (t < from) return; timers.push(setTimeout(() => { if (!dead) f(); }, t - from)); };
    const low = fx.level === 'low', crowd = shown.length > 14;
    const W = () => stage.current?.clientWidth || P.REF_W, H = () => stage.current?.clientHeight || P.REF_H;
    const px = (q: P.Pt) => ({ x: (q.x / 100) * W(), y: (q.y / 100) * H() });
    const anchor = () => px(boss.at);
    const fp = (i: number) => { const s = slotOf.get(i); return s === undefined ? null : px(home[s]); };

    // where the film starts: every number as it is at that moment
    const s0 = P.stateAt(film.max, film.fighters, tl, from);
    let hp = s0.hp;
    const fhp = s0.fhp.slice(), down = s0.down.slice();
    const setBoss = (v: number, instant = false) => {
      hp = Math.max(0, v);
      const pct = `${(hp / Math.max(1, film.max)) * 100}%`;
      if (bossBar.current) bossBar.current.style.width = pct;
      if (bossLag.current) { bossLag.current.style.transitionDelay = instant ? '0s' : '0.35s'; bossLag.current.style.width = pct; }
      if (bossNum.current) bossNum.current.textContent = `${shortNum(hp)} / ${shortNum(film.max)}`;
    };
    const setF = (i: number, v: number) => {
      fhp[i] = Math.max(0, v);
      const s = slotOf.get(i); if (s === undefined) return;
      const el = hpBar.current[s]; if (el) el.style.width = `${(fhp[i] / Math.max(1, film.fighters[i].hp)) * 100}%`;
    };
    setBoss(hp, true);
    film.fighters.forEach((_, i) => setF(i, fhp[i]));
    shown.forEach((i, s) => { const c = card.current[s]; if (c) c.classList.toggle('ko', down[i]); });
    setRage(s0.rage); setRound(s0.round); setOver(null); setTitle(from < P.INTRO_MS - 800);
    if (loop.current) { loop.current.style.opacity = ''; loop.current.style.filter = ''; }

    const shake = (amp: number, ms = 320) => { if (low) return; stage.current?.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-amp}px,${amp * 0.6}px)` }, { transform: `translate(${amp}px,${-amp * 0.5}px)` }, { transform: `translate(${-amp * 0.5}px,${amp * 0.3}px)` }, { transform: 'translate(0,0)' }], { duration: ms, easing: 'linear' }); };
    const pop = (text: string, q: { x: number; y: number }, cls: string, color: string) => {
      const l = layer.current; if (!l) return;
      const el = document.createElement('span');
      el.className = `rdNum ${cls}`; el.textContent = text; el.style.left = `${q.x}px`; el.style.top = `${q.y}px`; el.style.setProperty('--c', color);
      l.appendChild(el);
      const dx = (Math.random() - 0.5) * 40, big = cls.includes('crit') ? 1.25 : cls.includes('big') ? 1.4 : 1;
      const a = el.animate([
        { opacity: 0, transform: 'translate(-50%, 6px) scale(0.5)' },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.2}px), -12px) scale(${1.15 * big})`, offset: 0.15 },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.7}px), -34px) scale(${big})`, offset: 0.62 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), -48px) scale(${0.9 * big})` },
      ], { duration: cls.includes('big') ? 1900 : 1150, easing: 'ease-out' });
      a.onfinish = () => el.remove(); a.oncancel = () => el.remove();
    };
    const bossHit = (color: string, crit: boolean) => {
      const g = glow.current; if (!g) return;
      g.style.setProperty('--c', color);
      g.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.6)' }, { opacity: crit ? 0.9 : 0.55, transform: 'translate(-50%,-50%) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.25)' }], { duration: 420, easing: 'ease-out' });
      if (loop.current && !low) loop.current.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${crit ? 4 : 2}px,-1px)` }, { transform: 'translate(0,0)' }], { duration: 140 });
    };
    // a straight streak of light (a blow from someone off the stage, or a cheap blow when the stage is crowded)
    const streak = (a: { x: number; y: number }, b: { x: number; y: number }, color: string, delay = 0) => {
      const l = layer.current; if (!l) return;
      const el = document.createElement('i'), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      el.className = 'rdStreak'; el.style.left = `${a.x}px`; el.style.top = `${a.y}px`; el.style.width = `${len}px`; el.style.setProperty('--c', color);
      el.style.transform = `rotate(${Math.atan2(dy, dx)}rad) scaleX(0)`;
      l.appendChild(el);
      const r = `rotate(${Math.atan2(dy, dx)}rad)`;
      const an = el.animate([{ transform: `${r} scaleX(0)`, opacity: 1 }, { transform: `${r} scaleX(1)`, opacity: 1, offset: 0.55 }, { transform: `${r} scaleX(1) translateX(${len * 0.4}px)`, opacity: 0 }], { duration: 420, delay, easing: 'ease-in', fill: 'both' });
      an.onfinish = () => el.remove(); an.oncancel = () => el.remove();
    };
    const knock = (i: number, from: { x: number; y: number }, hard: boolean) => {
      const s = slotOf.get(i); if (s === undefined) return;
      const el = body.current[s], q = fp(i); if (!el || !q) return;
      const dx = q.x - from.x, dy = q.y - from.y, d = Math.hypot(dx, dy) || 1, k = hard ? 26 : 16;
      el.animate([
        { transform: 'translate(0,0) rotate(0)', filter: 'brightness(1)' },
        { transform: 'translate(0,0) scale(0.96)', filter: 'brightness(2.6) saturate(0.4)', offset: 0.12 },
        { transform: `translate(${(dx / d) * k}px, ${(dy / d) * k}px) rotate(${dx > 0 ? 14 : -14}deg)`, filter: 'brightness(1.3)', offset: 0.42 },
        { transform: 'translate(0,0) rotate(0)', filter: 'brightness(1)' },
      ], { duration: 640, easing: 'ease-out' });
    };
    const fall = (i: number) => {
      const s = slotOf.get(i); if (s === undefined) return;
      const el = body.current[s], c = card.current[s]; if (!el || !c) return;
      c.classList.add('ko');
      el.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(6px, 30px) rotate(38deg)', opacity: 0.7, offset: 0.5 }, { transform: 'translate(10px, 46px) rotate(62deg)', opacity: 0.38 }], { duration: 1100, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    };
    const say = (text: string, cls: string, sub?: string) => setBanner({ k: Math.random(), text, cls, sub });

    // ---- intro: the dark lifts, the name of the Dị Thú, the cultivators fly in from below
    at(0, () => { sfx('gong'); setTitle(true); });
    at(P.INTRO_MS - 900, () => setTitle(false));
    shown.forEach((i, s) => at(1300 + s * Math.min(70, 1800 / shown.length), () => {
      const el = body.current[s]; if (!el) return;
      el.animate([{ transform: `translate(${(home[s].x < 50 ? -1 : 1) * 40}px, ${H() * 0.6}px) scale(0.6)`, opacity: 0 }, { transform: 'translate(0,-10px) scale(1.04)', opacity: 1, offset: 0.75 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 950, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      if (s % 6 === 0) sfx('whoosh');
    }));
    if (from > 1300) shown.forEach((_, s) => { const el = body.current[s]; el?.getAnimations().forEach((a) => a.cancel()); });

    // ---- the rounds
    for (const rb of tl.rounds) {
      at(rb.t0, () => setRound(rb.r));
      let shownN = 0;
      for (const ab of rb.acts) {
        if (!ab.shown) continue;
        const f = film.fighters[ab.a.i], { fx: rec, color, s } = fxOfSkill(f, ab.a.k), slot = slotOf.get(ab.a.i)!;
        const cheap = (low || crowd) && ab.a.i !== film.me && (shownN++ % (low ? 3 : 2) === 1);
        at(ab.t, () => {
          const el = body.current[slot], q = fp(ab.a.i), l = layer.current; if (!el || !q || !l || down[ab.a.i]) return;
          const card0 = card.current[slot]; card0?.classList.add('act'); setTimeout(() => card0?.classList.remove('act'), P.ACT_MS);
          if (ab.a.f) {
            // a support technique: on an ally (a heal) or on the caster (a buff for everyone, a curse on the Dị Thú)
            const tgt = ab.a.t !== undefined ? fp(ab.a.t) || q : ab.a.f === 'stun' || ab.a.f === 'atkDown' || ab.a.f === 'defDown' ? anchor() : q;
            el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(0,-8px) scale(1.06)', offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: 600, easing: 'ease-out' });
            if (!cheap) playSkill({ layer: l, fx: rec, color, from: q, to: tgt, k: 1, level: low ? 'low' : fx.level === 'high' ? 'high' : 'mid', crit: false });
            setTimeout(() => {
              if (dead) return;
              if (ab.a.f === 'heal' && ab.a.t !== undefined && ab.a.h !== undefined) { const gain = ab.a.h - fhp[ab.a.t]; setF(ab.a.t, ab.a.h); if (gain > 0) pop(`+${shortNum(gain)}`, tgt, 'heal', '#8ee6a8'); }
              else pop(s.name, tgt, 'buff', color);
            }, P.HIT_MS);
            return;
          }
          // every action is a flight: a melee technique flies into the Dị Thú's body, a ranged one to a point part of the way; the blow is struck there and the
          // cultivator swings back to its place on another curve (so the air is always full of people flying back and forth)
          const melee = MELEE.has(rec.m), aim = anchor(), hv = (f.hair % 7) / 3 - 1;
          const to = melee ? px(P.strikeAt(boss, home[slot])) : px(P.castAt(boss, home[slot], hv));
          const fr = P.flightFrames(to.x - q.x, to.y - q.y, hv >= 0 ? 1 : -1, melee ? 0.4 : 0.34, melee ? 0.56 : 0.5);
          el.animate(fr.map((k) => ({ offset: k.offset, transform: `translate(${k.x}px, ${k.y}px) rotate(${k.r}deg) scale(${k.s})` })), { duration: P.ACT_MS, easing: 'linear' });
          const strikeT = Math.round(P.ACT_MS * (melee ? 0.4 : 0.34));
          setTimeout(() => {
            if (dead || !layer.current) return;
            if (cheap) streak(to, aim, color, 0);
            else playSkill({ layer: layer.current, fx: rec, color, from: to, to: aim, k: 0.7, level: low ? 'low' : fx.level === 'high' ? 'high' : 'mid', crit: !!ab.a.c });
          }, strikeT);
        });
        at(ab.t + P.HIT_MS, () => {
          if (down[ab.a.i] || ab.a.f) return;
          setBoss(hp - ab.a.d);
          const aim = anchor(), j = { x: aim.x + (Math.random() - 0.5) * W() * 0.22, y: aim.y + (Math.random() - 0.5) * H() * 0.08 };
          pop(ab.a.c ? `Bạo kích ${shortNum(ab.a.d)}` : shortNum(ab.a.d), j, `${ab.a.c ? 'crit ' : ''}${ab.a.i === film.me ? 'mine' : ''}`, ab.a.i === film.me ? '#ffe08a' : color);
          bossHit(color, !!ab.a.c);
          if (ab.a.c) shake(3);
        });
      }
      // the cultivators off the stage: streaks from below and one number for all of them
      if (rb.off) {
        const off = rb.off;
        at(off.t - P.HIT_MS, () => { const aim = anchor(); for (let k = 0; k < Math.min(10, off.n); k++) streak({ x: W() * (0.08 + Math.random() * 0.84), y: H() * 1.02 }, aim, '#f1e3b0', k * 40); });
        at(off.t, () => { setBoss(hp - off.d); const aim = anchor(); pop(`${off.n} tu sĩ khác  ${shortNum(off.d)}`, { x: aim.x, y: aim.y + H() * 0.12 }, 'off', '#f1e3b0'); bossHit('#f1e3b0', false); });
      }
      if (rb.rage !== null) at(rb.rage, () => { setRage(true); say(`${boss.name} cuồng nộ!`, 'rage', 'Sát thương tăng mạnh'); sfx('thunder'); shake(7, 700); fx.flash('violet'); });
      // the Dị Thú answers
      if (rb.boss) {
        const bb = rb.boss, sk = boss.skills[bb.b.s], color = C.EL[boss.el]?.color || '#ffd36e';
        if (bb.b.stun) {
          at(bb.t, () => { say(`${boss.name} choáng váng`, 'stun', 'Mất một lượt'); const l = layer.current; if (l) playSkill({ layer: l, fx: { m: 'aura', tex: 'swirl', size: 160 }, color: '#ffe27a', from: anchor(), to: anchor(), k: 1.2, level: 'mid', crit: false }); });
          continue;
        }
        at(bb.t, () => {
          say(sk.name, bb.b.s === 2 ? 'ult' : 'skill');
          const g = glow.current;
          if (g) { g.style.setProperty('--c', color); g.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.4)' }, { opacity: 0.85, transform: 'translate(-50%,-50%) scale(1.15)', offset: 0.85 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.4)' }], { duration: P.TELE_MS + 150, easing: 'ease-in' }); }
          tint.current?.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.7 }, { opacity: 0 }], { duration: P.TELE_MS + 500, easing: 'ease-in-out' });
          sfx(bb.b.s === 2 ? 'thunder' : 'whoosh');
        });
        // the great attack: its own clip over the whole stage (it starts on the very picture of the loop, so the cut is invisible), the blow lands as it ends.
        // Whether the clip can play is asked at that moment (it is still loading when the film starts); without it, a flash and a hard shake.
        if (bb.b.s === 2) at(bb.t + P.TELE_MS - 200, () => {
          const v = ult.current;
          if (!v || !ultReady.current || low) { fx.flash('gold'); shake(6, 600); return; }
          v.currentTime = 0; void v.play().catch(() => {});
          v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.92 }, { opacity: 0 }], { duration: P.ULT_MS + 400, fill: 'both' });
        });
        const castAt = bb.hit - (bb.b.s === 2 ? 200 : 380);
        at(castAt, () => {
          const l = layer.current; if (!l) return;
          const a = anchor();
          bb.b.t.forEach((j, n) => {
            const q = fp(j); if (!q) return;
            if (bb.b.s === 2 && n > 8) return;   // the great attack: a few effects are enough, everyone is hit anyway
            setTimeout(() => { if (!dead && layer.current) playSkill({ layer: layer.current, fx: sk.fx, color, from: a, to: q, k: 0.9, level: low ? 'low' : 'mid', crit: bb.b.s === 0 }); }, bb.b.s === 1 ? n * 90 : 0);
          });
        });
        bb.b.t.forEach((j, n) => at(P.sweepHit(bb, n), () => {
          setF(j, bb.b.h[n]);
          const q = fp(j);
          if (q) { knock(j, anchor(), bb.b.s !== 1); pop(shortNum(bb.b.d[n]), { x: q.x, y: q.y - 34 }, `hurt${j === film.me ? ' mine' : ''}`, '#ff6a5c'); }
          if (bb.b.ko.includes(j)) { down[j] = true; setTimeout(() => { if (!dead) fall(j); }, 420); }
        }));
        at(bb.hit, () => { shake(bb.b.s === 2 ? 9 : bb.b.s === 1 ? 5 : 4, bb.b.s === 2 ? 700 : 380); if (bb.b.s === 2) fx.flash('gold'); if (bb.b.g) pop('Hộ thể', anchor(), 'buff', '#9ad0ff'); });
      }
    }
    // ---- the end: it dies (the clip burns white and dissolves into the empty lair) or it flees into the mist
    at(tl.outro, () => {
      const v = loop.current;
      if (film.win) {
        setBoss(0); sfx('levelup'); shake(10, 1200);
        const a = anchor(), sr = stage.current?.getBoundingClientRect();
        if (sr) { const x = sr.left + a.x, y = sr.top + a.y; fx.ring({ x, y, color: '#fff3c4', size: 200 }); fx.burst({ x, y, kind: 'gold', count: 40 }); setTimeout(() => fx.burst({ x, y, kind: 'qi', color: C.EL[boss.el]?.color, count: 30 }), 600); }
        v?.animate([{ filter: 'brightness(1) blur(0)', opacity: 1 }, { filter: 'brightness(2.6) blur(0)', opacity: 1, offset: 0.35 }, { filter: 'brightness(3.2) blur(6px)', opacity: 0 }], { duration: 2600, easing: 'ease-in', fill: 'forwards' });
        shown.forEach((i, s) => { if (!down[i]) body.current[s]?.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(0,-16px) scale(1.08)', offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: 900, delay: 900 + s * 40, easing: 'ease-out' }); });
        setTimeout(() => { if (!dead) { setOver('win'); say('Đại thắng', 'win', `${boss.name} đã bị trảm`); } }, 1400);
      } else {
        sfx('fail');
        v?.animate([{ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-6%) scale(0.92)', filter: 'blur(8px)' }], { duration: 2800, easing: 'ease-in', fill: 'forwards' });
        setTimeout(() => { if (!dead) { setOver('flee'); say(`${boss.name} trốn thoát`, 'flee', 'Hẹn trận sau'); } }, 1200);
      }
    });
    if (from >= tl.outro && loop.current) { loop.current.style.opacity = '0'; }
    at(tl.total, () => p.onEnd());
    if (from >= tl.total) timers.push(setTimeout(() => { if (!dead) p.onEnd(); }, 0));

    // the pictures of every technique are tinted before the first blow (one that is late falls back to a streak)
    const recs = new Map<string, Promise<unknown>>();
    for (const f of film.fighters) f.skills.forEach((_, k) => { const { fx: r, color } = fxOfSkill(f, k); const key = `${r.tex}|${color}`; if (!recs.has(key)) recs.set(key, warmFx(r, color)); });
    boss.skills.forEach((s) => recs.set(`b${s.name}`, warmFx(s.fx, C.EL[boss.el]?.color || '#ffd36e')));
    void Promise.race([Promise.all(recs.values()), sleep(2500)]);

    // the tab was hidden: the timers were held back, so the film is out of step with the clock. Coming back restarts it at the right moment.
    return () => {
      dead = true; timers.forEach(clearTimeout);
      layer.current?.replaceChildren();
      body.current.forEach((el) => el?.getAnimations().forEach((a) => a.cancel()));
      loop.current?.getAnimations().forEach((a) => a.cancel());
      setBanner(null);
    };
  }, [p.mode === 'film' ? `${p.film.day}|${p.from}` : 'lobby', shown.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  // in the lobby: the boss bar is full, and a cultivator who has just signed up flies in
  const prevCrowd = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (p.mode !== 'lobby') return;
    if (bossBar.current) bossBar.current.style.width = '100%';
    if (bossLag.current) bossLag.current.style.width = '100%';
    const before = prevCrowd.current, now = new Set(p.crowd.map((f) => f.pid));
    if (before.size || p.crowd.length) shown.forEach((i, s) => {
      const f = p.crowd[i]; if (!f || before.has(f.pid) || !before.size && f.pid !== p.meId) return;
      const el = body.current[s]; if (!el) return;
      el.animate([{ transform: `translate(0, ${(stage.current?.clientHeight || 600) * 0.5}px) scale(0.5)`, opacity: 0 }, { transform: 'translate(0,-12px) scale(1.1)', opacity: 1, offset: 0.7 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      if (f.pid === p.meId) { sfx('whoosh'); const r = el.getBoundingClientRect(); setTimeout(() => fx.ring({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: '#ffe08a', size: 90 }), 900); }
    });
    prevCrowd.current = now;
  }, [p.mode === 'lobby' ? p.crowd.map((f) => f.pid).join(',') : '']);   // eslint-disable-line react-hooks/exhaustive-deps

  const elColor = C.EL[boss.el]?.color || '#ffd36e';
  const film = p.mode === 'film' ? p.film : null;
  return (
    <div className={`rdStage${rage ? ' rage' : ''}${over ? ` over ${over}` : ''}${calm ? ' calm' : ''}`} ref={stage} style={{ '--el': elColor, '--fw': `${P.sizeFor(shown.length)}cqw` } as CSSProperties} role="img" aria-label={film ? `Trận ${boss.name}: ${film.win ? 'thắng' : 'Dị Thú trốn thoát'}` : `${boss.name} đang chờ khai chiến`}>
      <img className="rdBg" src={R.raidArt(boss.id, 'bg')} alt="" draggable={false} />
      {loopOk && !calm
        ? <video ref={loop} className="rdLoop" src={R.raidArt(boss.id, 'loop')} poster={R.raidArt(boss.id, 'boss')} muted loop autoPlay playsInline preload="auto" aria-hidden="true" />
        : <img ref={loop as any} className="rdLoop still" src={R.raidArt(boss.id, 'boss')} alt="" draggable={false} />}
      <div className="rdTint" ref={tint} />
      <div className="rdGlow" ref={glow} style={{ left: `${boss.at.x}%`, top: `${boss.at.y}%`, width: `${boss.at.r * 2.4}%` }} />
      <div className="rdMist" aria-hidden="true"><i /><i /></div>

      <div className="rdCast">
        {shown.map((i, s) => {
          const f = fighters[i], h = home[s], mine = i === me, face = h.x < boss.at.x ? 1 : -1;
          return (
            <div key={f.pid} ref={(el) => { card.current[s] = el; }} className={`rdF${mine ? ' me' : ''}${i === film?.mvp && film && over ? ' mvp' : ''}`} style={{ left: `${h.x}%`, top: `${h.y}%`, '--fc': C.EL[f.el]?.color || '#f1e3b0', '--ph': `${-((f.hair % 97) / 97) * 4}s`, '--dur': `${3.2 + (f.hair % 13) / 7}s`, zIndex: Math.round(h.y) } as CSSProperties}>
              <div className="rdFbody" ref={(el) => { body.current[s] = el; }}>
                <div className="rdFbob">
                  <i className="rdFhp"><b ref={(el) => { hpBar.current[s] = el; }} /></i>
                  <div className="rdFfig" style={{ transform: face < 0 ? 'scaleX(-1)' : undefined }}><Cultivator look={lookFor(f)} /></div>
                </div>
              </div>
              <span className="rdFname" title={`${f.name} · cấp ${f.level}`}>{f.name}</span>
            </div>
          );
        })}
      </div>

      <div className="rdFx" ref={layer} aria-hidden="true" />
      {film && <video ref={ult} className="rdUlt" src={R.raidArt(boss.id, 'ult')} muted playsInline preload="auto" aria-hidden="true" />}

      <div className="rdHud">
        <div className="rdBoss">
          <div className="rdBossNm"><ElIcon el={boss.el} size={14} /><b>{boss.name}</b>{film && round > 0 && <span className="rdRound">Hiệp {round}</span>}{p.mode === 'film' && p.live && !over && <span className="rdLive">Trực tiếp</span>}</div>
          <div className="rdBossBar"><i className="lag" ref={bossLag} /><i className="cur" ref={bossBar} /></div>
          <small className="rdBossNum" ref={bossNum}>{p.mode === 'lobby' ? p.caption : ''}</small>
        </div>
      </div>
      {title && <div className="rdTitle" key="title"><small>{boss.title}</small><h3>{boss.name}</h3><span>{fighters.length} tu sĩ xuất chiến</span></div>}
      {banner && <div key={banner.k} className={`rdBanner ${banner.cls}`}><b>{banner.text}</b>{banner.sub && <small>{banner.sub}</small>}</div>}
    </div>
  );
}
