'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { FeedEntry } from '@/lib/game';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';
import { Img } from './ui';
import { useFx } from './fx/FxProvider';
import { parseLog } from './Battle';

// A short staged replay of the fight that was just written to the journey: both fighters face each other, whoever acts lunges, the technique
// flies across in its element's colour, the number rises from whoever was hit, and the two health bars follow the log.
// It only reads the log (the result was decided by the server), costs nothing at fx=off, and cannot be skipped.
const MAX_MS = 16000;   // the longest a replay plays (a new fight replaces it at once)
// Every action gets the same time slot, so the techniques come out at a steady rhythm.
const stepOf = (n: number) => Math.max(320, Math.min(520, MAX_MS / Math.max(1, n)));

type Props = { e: FeedEntry; hero?: string; heroEl: string; onDone: () => void };
type Act = { w: 'p' | 'b' | 'm'; n: string; k?: string; e?: string; d: number; c: number; x: number; h?: number; hm?: number };

// A Tu Sĩ has no portrait of its own: it borrows one of the two pre-drawn cultivators, chosen from its name so the same person always looks the same.
const npcArt = (name: string) => C.introArt([...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 2 ? 'f' : 'm');

export function BattleStage({ e, hero, heroEl, onDone }: Props) {
  const fx = useFx();
  const parsed = useMemo(() => parseLog(e.log || [], e.beast?.name), [e.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const open = parsed.find((l) => l.kind === 'open') as { kind: 'open'; o: { f: string; fe: string[]; fh: number; ph: number; pm: number } } | undefined;
  const acts = useMemo(() => parsed.flatMap((l) => (l.kind === 'act' && l.a.w !== 'u' ? [l.a as Act] : [])), [parsed]);
  const verdict = (parsed.find((l) => l.kind === 'text') as { kind: 'text'; text: string } | undefined)?.text;
  const [i, setI] = useState(-1);
  const [hp, setHp] = useState({ you: open?.o.ph ?? 1, foe: open?.o.fh ?? 1 });
  const youRef = useRef<HTMLDivElement>(null), foeRef = useRef<HTMLDivElement>(null), done = useRef(false);
  const finish = useRef(onDone); finish.current = onDone;
  const end = () => { if (!done.current) { done.current = true; finish.current(); } };

  useEffect(() => {
    if (!open || acts.length === 0 || fx.level === 'off') { end(); return; }
    const step = stepOf(acts.length), timers: ReturnType<typeof setTimeout>[] = [];
    const lunge = (el: HTMLElement | null, dir: 1 | -1) => el?.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dir * 26}px) scale(1.06)`, offset: 0.35 }, { transform: 'translateX(0)' }], { duration: step * 0.7, easing: 'ease-out' });
    const hit = (el: HTMLElement | null, crit: boolean) => el?.animate(
      [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: `translateX(${crit ? 10 : 6}px)`, filter: 'brightness(2.2)', offset: 0.2 }, { transform: `translateX(${crit ? -9 : -5}px)`, filter: 'brightness(1.3)', offset: 0.5 }, { transform: 'translateX(0)', filter: 'brightness(1)' }],
      { duration: crit ? 460 : 320 });
    const play = (k: number) => {
      if (k >= acts.length) { setI(acts.length); timers.push(setTimeout(end, 900)); return; }
      const a = acts[k], foeActs = a.w === 'm';
      setI(k);
      lunge(foeActs ? foeRef.current : youRef.current, foeActs ? -1 : 1);
      timers.push(setTimeout(() => {
        const t = (foeActs ? youRef.current : foeRef.current), r = t?.getBoundingClientRect();
        hit(t, !!a.c);
        setHp((h) => (foeActs ? { ...h, you: a.h ?? h.you } : { ...h, foe: a.h ?? h.foe }));
        if (r) fx.burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.45, kind: a.c ? 'gold' : 'spark', color: a.e && C.EL[a.e] ? C.EL[a.e].color : undefined, count: a.c ? 18 : 7 });
      }, step * 0.42));
      timers.push(setTimeout(() => play(k + 1), step));
    };
    timers.push(setTimeout(() => play(0), 350));
    return () => timers.forEach(clearTimeout);
  }, [e.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || acts.length === 0 || fx.level === 'off') return null;
  const cur = i >= 0 && i < acts.length ? acts[i] : null, foeActs = cur?.w === 'm';
  const col = cur?.e && C.EL[cur.e] ? C.EL[cur.e].color : 'var(--gold-300)';
  const foeEl = open.o.fe[0], won = verdict === 'Thắng', lost = verdict === 'Bại';
  const youPct = Math.max(0, Math.min(100, (hp.you / Math.max(1, open.o.pm)) * 100)), foePct = Math.max(0, Math.min(100, (hp.foe / Math.max(1, open.o.fh)) * 100));

  return (
    <div className="stage" role="img" aria-label={`Giao chiến với ${open.o.f}: ${verdict || ''}`}>
      <div className="stSky" /><div className="stGround" />
      {cur && <div key={`k${i}`} className={`stSkill ${foeActs ? 'foe' : ''}`} style={{ '--el': col } as CSSProperties}>{cur.e ? <ElIcon el={cur.e} size={14} /> : <Icon name="atk" size={14} />}<span>{cur.w === 'b' ? `${cur.n} · ` : ''}«{cur.k || 'Đòn đánh'}»</span></div>}

      <div className="stSide you">
        <div className="stBar you"><i style={{ width: `${youPct}%` }} /></div>
        <div ref={youRef} className={`stFig ${hp.you <= 0 ? 'down' : ''}`} style={{ '--el': C.EL[heroEl]?.color } as CSSProperties}>
          {hero ? <Img src={hero} className="stFace" fb={<ElIcon el={heroEl} size={40} />} /> : <span className="stSeal"><ElIcon el={heroEl} size={40} /></span>}
        </div>
        <small>Ngươi</small>
      </div>

      <div className="stSide foe">
        <div className="stBar foe"><i style={{ width: `${foePct}%` }} /></div>
        <div ref={foeRef} className={`stFig foe ${hp.foe <= 0 ? 'down' : ''} ${e.beast?.mut ? 'mut' : ''}`} style={{ '--el': C.EL[foeEl]?.color } as CSSProperties}>
          {e.beast ? <Img src={C.monsterArt(e.beast.sp, e.beast.mut, true)} fb={<ElIcon el={foeEl} size={40} />} />
            : e.kind === 'npc' ? <Img src={npcArt(open.o.f)} className="stFace" fb={<ElIcon el={foeEl} size={40} />} /> : <span className="stSeal"><ElIcon el={foeEl} size={40} /></span>}
        </div>
        <small>{open.o.f}</small>
      </div>

      {cur && <span key={`p${i}`} className={`stProj ${foeActs ? 'l' : 'r'}`} style={{ '--el': col, animationDuration: `${stepOf(acts.length) * 0.5}ms` } as CSSProperties}>{cur.e ? <ElIcon el={cur.e} size={22} /> : <Icon name="atk" size={22} />}</span>}
      {cur && <span key={`d${i}`} className={`stDmg ${foeActs ? 'you' : 'foe'} ${cur.c ? 'crit' : ''}`} style={{ '--el': col } as CSSProperties}>{cur.c ? 'Bạo kích! ' : ''}−{cur.d.toLocaleString('vi-VN')}</span>}
      {i >= acts.length && <div className={`stVerdict ${won ? 'win' : lost ? 'lose' : ''}`}>{won ? 'Đại thắng' : lost ? 'Thua trận' : 'Hòa'}</div>}
    </div>
  );
}
