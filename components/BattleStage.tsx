'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { FeedEntry } from '@/lib/game';
import { fxOf, fxColor } from '@/lib/skillfx';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';
import { Img, useZoom } from './ui';
import { useFx } from './fx/FxProvider';
import { playSkill, warmFx } from './fx/SkillFx';
import { parseLog, FX_LABEL } from './Battle';

// A short staged replay of the fight that was just written to the journey: both fighters face each other, whoever acts gathers and lunges,
// the technique plays its own effect (lib/skillfx.ts, drawn by components/fx/SkillFx.ts), the target flinches and the number rises from whoever was hit.
// It only reads the log (the result was decided by the server), costs nothing at fx=off, and cannot be skipped.
const SLOW = 1.2;   // the whole replay plays this much slower (20%): less to draw per second, easier to follow
const MAX_MS = 16000 * SLOW;   // the longest a replay plays (a new fight replaces it at once)
// Every action gets about the same time slot; a critical hit and the blow that ends the fight get longer, so the rhythm is not flat.
const slotOf = (n: number) => Math.max(360 * SLOW, Math.min(680 * SLOW, MAX_MS / Math.max(1, n)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Props = { e: FeedEntry; hero?: string; heroEl: string; onDone: () => void };
type Act = { w: 'p' | 'b' | 'm'; f?: string; a?: number; ts?: 'p' | 'm'; n: string; k?: string; e?: string; d: number; c: number; x: number; h?: number; hm?: number };

// A Tu Sĩ has no portrait of its own: it borrows one of the two pre-drawn cultivators, chosen from its name so the same person always looks the same.
const npcArt = (name: string) => C.introArt([...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 2 ? 'f' : 'm');

// Who a line lands on: a hit lands on the other side; a heal or a self buff on the one who cast it; a weakening or stun on the other side.
const SELF_FX = new Set(['heal', 'guard', 'atkUp', 'critUp', 'skip']);
const recipientIsFoe = (a: Act) => (a.f ? (SELF_FX.has(a.f) ? a.w === 'm' : a.w !== 'm') : a.w !== 'm');
const colorOf = (a: Act) => fxColor(a.e, a.f);

export function BattleStage({ e, hero, heroEl, onDone }: Props) {
  const fx = useFx(), zoom = useZoom();
  const parsed = useMemo(() => parseLog(e.log || [], e.beast?.name), [e.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const open = parsed.find((l) => l.kind === 'open') as { kind: 'open'; o: { f: string; fe: string[]; fh: number; ph: number; pm: number; ar?: string } } | undefined;
  const acts = useMemo(() => parsed.flatMap((l) => (l.kind === 'act' && l.a.w !== 'u' ? [l.a as Act] : [])), [parsed]);
  const verdict = (parsed.find((l) => l.kind === 'text') as { kind: 'text'; text: string } | undefined)?.text;
  const [i, setI] = useState(-1);
  const [hp, setHp] = useState({ you: open?.o.ph ?? 1, foe: open?.o.fh ?? 1 });
  const youRef = useRef<HTMLDivElement>(null), foeRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null), layerRef = useRef<HTMLDivElement>(null), done = useRef(false);
  // per action, read while rendering: whether the technique plays its own effect (else the plain icon flies) and the length of the slot
  const beat = useRef({ own: false, slot: 520 });
  const finish = useRef(onDone); finish.current = onDone;
  const end = () => { if (!done.current) { done.current = true; finish.current(); } };

  useEffect(() => {
    if (!open || acts.length === 0 || fx.level === 'off') { end(); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let dead = false;
    const low = fx.level === 'low';
    // slot of every action; the whole replay never runs past MAX_MS
    const base = slotOf(acts.length);
    const raw = acts.map((a) => base * (a.c ? 1.25 : a.h !== undefined && a.h <= 0 ? 1.4 : a.f ? 0.9 : 1));
    const squeeze = Math.min(1, MAX_MS / raw.reduce((s, x) => s + x, 0));
    const slots = raw.map((x) => Math.max(300 * SLOW, x * squeeze));

    // the fighter that acts gathers (steps back), then strikes: a melee technique rushes at the target, anything else only leans forward
    const act = (el: HTMLElement | null, dir: 1 | -1, windup: number, reach: number, total: number) => el?.animate([
      { transform: 'translateX(0) scale(1)' },
      { transform: `translateX(${-dir * 8}px) scale(0.96)`, offset: Math.min(0.5, windup / total), easing: 'cubic-bezier(.2,.9,.2,1)' },
      { transform: `translateX(${dir * reach}px) scale(1.07)`, offset: Math.min(0.7, (windup + 90) / total) },
      { transform: 'translateX(0) scale(1)' },
    ], { duration: total, easing: 'ease-out' });
    // the one who is hit freezes for a moment (hit-stop), then is thrown back and settles
    const hit = (el: HTMLElement | null, crit: boolean, dir: 1 | -1) => el?.animate([
      { transform: 'translateX(0)', filter: 'brightness(1)' },
      { transform: 'translateX(0) scale(0.97)', filter: 'brightness(2.4)', offset: 0.16 },
      { transform: `translateX(${dir * (crit ? 20 : 11)}px) rotate(${dir * (crit ? 5 : 2)}deg)`, filter: 'brightness(1.5)', offset: 0.4 },
      { transform: `translateX(${-dir * 3}px)`, filter: 'brightness(1.1)', offset: 0.72 },
      { transform: 'translateX(0)', filter: 'brightness(1)' },
    ], { duration: (crit ? 520 : 380) * SLOW, easing: 'ease-out' });
    const shake = (amp: number) => stageRef.current?.animate([
      { transform: 'translate(0,0)' }, { transform: `translate(${-amp}px, ${amp * 0.5}px)` }, { transform: `translate(${amp}px, ${-amp * 0.4}px)` }, { transform: `translate(${-amp * 0.6}px, ${amp * 0.2}px)` }, { transform: 'translate(0,0)' },
    ], { duration: 280 * SLOW, easing: 'linear' });
    const point = (el: HTMLElement | null, layer: DOMRect) => { const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2 - layer.left, y: r.top + r.height * 0.5 - layer.top } : { x: layer.width / 2, y: layer.height / 2 }; };

    // The number of a blow lives on its own: it rises in an arc, drifts to alternating sides (so two in a row never overlap) and removes itself.
    let seq = 0;
    const pop = (a: Act, color: string, target: HTMLElement | null, toFoe: boolean) => {
      const layer = layerRef.current; if (!layer || !target) return;
      const p = point(target, layer.getBoundingClientRect()), el = document.createElement('span');
      el.className = `stNum ${toFoe ? 'foe' : 'you'}${a.c ? ' crit' : ''}${a.f ? ' fx' : ''}`;
      el.style.setProperty('--el', color); el.style.left = `${p.x}px`; el.style.top = `${p.y - 10}px`;
      el.textContent = a.f ? (FX_LABEL[a.f] || (() => ''))(a.a ?? 0) : `${a.c ? 'Bạo kích! ' : ''}−${a.d.toLocaleString('vi-VN')}`;
      layer.appendChild(el);
      const dx = (seq++ % 2 ? 1 : -1) * (14 + Math.random() * 18), big = a.c ? 1.1 : 1;
      const run = el.animate([
        { opacity: 0, transform: 'translate(-50%, 10px) scale(0.6)' },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.25}px), -14px) scale(${1.2 * big})`, offset: 0.14 },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.7}px), -38px) scale(${big})`, offset: 0.55 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), -22px) scale(${0.95 * big})` },
      ], { duration: (a.c ? 1500 : 1150) * SLOW, easing: 'ease-out' });
      run.onfinish = () => el.remove();
    };

    const play = (k: number) => {
      if (dead) return;
      if (k >= acts.length) { setI(acts.length); timers.push(setTimeout(end, 900 * SLOW)); return; }
      const a = acts[k], foeActs = a.w === 'm', toFoe = recipientIsFoe(a), dirC: 1 | -1 = foeActs ? -1 : 1, dirT: 1 | -1 = toFoe ? 1 : -1;
      const caster = foeActs ? foeRef.current : youRef.current, target = toFoe ? foeRef.current : youRef.current, layer = layerRef.current;
      const rec = fxOf(a.k, a.f, a.e), color = colorOf(a), slot = slots[k], kk = Math.max(0.6, Math.min(1, slot / (640 * SLOW))) * SLOW;
      const lost = a.f === 'skip';   // a lost turn: nothing is cast
      const lr = layer?.getBoundingClientRect(), from = lr ? point(caster, lr) : null, to = lr ? point(target, lr) : null;
      const played = layer && from && to && !lost ? playSkill({ layer, fx: rec, color, from, to, k: kk, level: low ? 'low' : fx.level === 'high' ? 'high' : 'mid', crit: !!a.c }) : null;
      const impacts = played ? played.impacts : [Math.round(slot * 0.42)];
      const windup = played ? played.cast : 100;
      beat.current = { own: !!played, slot };
      setI(k);

      const reach = from && to && (rec.m === 'slash' || rec.m === 'burst') ? Math.min(64, Math.abs(to.x - from.x) * 0.45) : 14;
      if (!lost) act(caster, dirC, windup, caster === target ? 6 : reach, windup + 300 * SLOW);

      impacts.forEach((ti, n) => timers.push(setTimeout(() => {
        if (dead) return;
        if (!a.f) { hit(target, !!a.c, dirT); if (!low && rec.shake) shake((rec.shake === 2 ? 5 : 3) + (a.c ? 2 : 0)); else if (!low && a.c) shake(3); }
        if (n > 0) return;
        pop(a, color, target, toFoe);
        const r = target?.getBoundingClientRect();
        // the health bar that moves is the one the log line describes (`ts`); older logs always meant the one that was hit
        const barIsFoe = a.ts ? a.ts === 'm' : toFoe;
        setHp((h) => (barIsFoe ? { ...h, foe: a.h ?? h.foe } : { ...h, you: a.h ?? h.you }));
        if (r && a.h !== undefined && a.h <= 0 && !a.f) { fx.ring({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: '#cfd6e4', size: 90 }); fx.burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.5, kind: 'qi', color: '#cfd6e4', count: 10 }); }
        if (r) fx.burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.45, kind: a.c ? 'gold' : 'spark', color: a.f ? color : a.e && C.EL[a.e] ? C.EL[a.e].color : undefined, count: a.c ? 9 : a.f ? 3 : 4 });
      }, ti)));
      // the next action waits until the last blow has landed and had a moment to be seen
      const last = impacts[impacts.length - 1];
      timers.push(setTimeout(() => play(k + 1), Math.max(slot, last + 200 * kk)));
    };

    // the technique pictures are tinted once, then the replay starts (a picture that is not ready in time falls back to the plain icon)
    const need = acts.filter((a) => a.f !== 'skip').map((a) => warmFx(fxOf(a.k, a.f, a.e), colorOf(a)));
    Promise.race([Promise.all(need), sleep(2500)]).then(() => { if (!dead) timers.push(setTimeout(() => play(0), 250)); });
    return () => { dead = true; timers.forEach(clearTimeout); };
  }, [e.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || acts.length === 0 || fx.level === 'off') return null;
  const cur = i >= 0 && i < acts.length ? acts[i] : null, foeActs = cur?.w === 'm';
  const col = cur ? colorOf(cur) : 'var(--gold-300)';
  const foeEl = open.o.fe[0], won = verdict === 'Thắng', lost = verdict === 'Bại';
  const over = i >= acts.length;   // the fight is finished: the verdict is on screen
  const arena = C.ARENA(open.o.ar);
  const youPct = Math.max(0, Math.min(100, (hp.you / Math.max(1, open.o.pm)) * 100)), foePct = Math.max(0, Math.min(100, (hp.foe / Math.max(1, open.o.fh)) * 100));

  return (
    <div className="stage" ref={stageRef} role="img" aria-label={`Giao chiến với ${open.o.f}: ${verdict || ''}`}>
      <div className="stSky" style={arena ? { backgroundImage: `linear-gradient(180deg, rgb(4 10 16 / 0.25), rgb(4 10 16 / 0.7)), url(${C.arenaArt(arena.id)})` } : undefined} /><div className="stGround" />
      {arena && <div className="stArena" title={`${arena.note} Tăng: ${arena.boost.join(', ')}. Giảm: ${arena.weaken.join(', ')}.`}><b>{arena.name}</b><span className="up">{arena.boost.map((el) => <ElIcon key={el} el={el} size={12} />)}</span><span className="down">{arena.weaken.map((el) => <ElIcon key={el} el={el} size={12} />)}</span></div>}
      {cur && <div key={`k${i}`} className={`stSkill ${foeActs ? 'foe' : ''}`} style={{ '--el': col } as CSSProperties}>{cur.e ? <ElIcon el={cur.e} size={14} /> : <Icon name="atk" size={14} />}<span>{cur.w === 'b' ? `${cur.n} · ` : ''}«{cur.k || 'Đòn đánh'}»</span></div>}

      <div className="stSide you">
        <div className="stBar you"><i className="lag" style={{ width: `${youPct}%` }} /><i className="cur" style={{ width: `${youPct}%` }} /></div>
        <div ref={youRef} onClick={hero ? () => zoom({ kind: 'avatar', src: hero, name: 'Ngươi' }) : undefined} className={`stFig ${hp.you <= 0 ? 'down' : ''} ${over && won ? 'win' : ''}`} style={{ '--el': C.EL[heroEl]?.color } as CSSProperties}>
          {hero ? <Img src={`${hero}?s=face`} fb={<ElIcon el={heroEl} size={40} />} /> : <span className="stSeal"><ElIcon el={heroEl} size={40} /></span>}
        </div>
        <small>Ngươi</small>
      </div>

      <div className="stSide foe">
        <div className="stBar foe"><i className="lag" style={{ width: `${foePct}%` }} /><i className="cur" style={{ width: `${foePct}%` }} /></div>
        <div ref={foeRef} onClick={e.beast ? () => zoom({ kind: 'beast', b: e.beast! }) : undefined} className={`stFig foe ${hp.foe <= 0 ? 'down' : ''} ${over && lost ? 'win' : ''} ${e.beast?.mut ? 'mut' : ''}`} style={{ '--el': C.EL[foeEl]?.color } as CSSProperties}>
          {e.beast ? <Img src={C.monsterArt(e.beast.sp, e.beast.mut, true)} fb={<ElIcon el={foeEl} size={40} />} />
            : e.kind === 'npc' ? <Img src={npcArt(open.o.f)} className="stFace" fb={<ElIcon el={foeEl} size={40} />} /> : <span className="stSeal"><ElIcon el={foeEl} size={40} /></span>}
        </div>
        <small>{open.o.f}</small>
      </div>

      {/* the effect of the technique is drawn into this layer by components/fx/SkillFx.ts */}
      <div ref={layerRef} className="stFxLayer" aria-hidden="true" />
      {/* a technique whose pictures are not ready keeps the plain flying icon */}
      {cur && !cur.f && !beat.current.own && <span key={`p${i}`} className={`stProj ${foeActs ? 'l' : 'r'}`} style={{ '--el': col, animationDuration: `${beat.current.slot * 0.5}ms` } as CSSProperties}>{cur.e ? <ElIcon el={cur.e} size={22} /> : <Icon name="atk" size={22} />}</span>}
      {over && <div className={`stVerdict ${won ? 'win' : lost ? 'lose' : ''}`}>{won ? 'Đại thắng' : lost ? 'Thua trận' : 'Hòa'}</div>}
    </div>
  );
}
