'use client';
import type { CSSProperties } from 'react';
import * as C from '@/lib/content';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';

// The fight, told as a chronicle: who acted, which technique, who was hit, for how much, and why the number is what it is.
// The server writes each action as a '~{json}' line (see `rec` in lib/game.ts). Older saves hold plain lines such as
// "H1 Ngươi · Kim Quang Trảm: 66 bạo kích (x1.00, cùng hệ)"; those are read back into the same shape, minus what they never recorded.
type Open = { t: 'open'; f: string; fe: string[]; fh: number; ph: number; pm: number; ar?: string };
// w: p = you, b = your Linh Thú, m = the foe, u = unknown (old save)
type Act = { r: number; w: 'p' | 'b' | 'm' | 'u'; u?: number; f?: string; a?: number; ts?: 'p' | 'm'; n: string; k?: string; e?: string; to?: string; d: number; c: number; x: number; am?: number; s: number; h?: number; hm?: number };
type Line = { kind: 'open'; o: Open } | { kind: 'act'; a: Act } | { kind: 'text'; text: string };

const SKILL_EL: Record<string, string> = {};
for (const [el, names] of Object.entries(C.SKILLS)) for (const n of names) SKILL_EL[n] = el;
SKILL_EL[C.NEUTRAL_SKILL] = '';

const RE_P = /^H(\d+) Ngươi · (.+?): (\d+)( bạo kích)? \(x([\d.]+)(, cùng hệ)?\)$/;
const RE_X = /^H(\d+) (.+): (\d+)( bạo kích)? \(x([\d.]+)\)$/;

export function parseLog(log: string[], foe?: string): Line[] {
  return log.map((l): Line => {
    if (l[0] === '~') {
      try {
        const j = JSON.parse(l.slice(1));
        if (j && j.t === 'open') return { kind: 'open', o: j as Open };
        if (j && typeof j.d === 'number') return { kind: 'act', a: j as Act };
      } catch {}
    }
    let m = RE_P.exec(l);
    if (m) return { kind: 'act', a: { r: +m[1], w: 'p', n: 'Ngươi', k: m[2], e: SKILL_EL[m[2]] || undefined, d: +m[3], c: m[4] ? 1 : 0, x: +m[5], s: m[6] ? 1 : 0 } };
    m = RE_X.exec(l);
    if (m) return { kind: 'act', a: { r: +m[1], w: foe ? (m[2] === foe ? 'm' : 'b') : 'u', n: m[2], d: +m[3], c: m[4] ? 1 : 0, x: +m[5], s: 0 } };
    return { kind: 'text', text: l };
  });
}

const elColor = (el?: string) => (el && C.EL[el] ? C.EL[el].color : 'var(--mist-300)');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const num = (n: number) => n.toLocaleString('vi-VN');

// One line for the closed feed row: "3 hiệp · ngươi gây 450 · nhận 120"
export function battleSummary(log: string[], foe?: string): string {
  let rounds = 0, dealt = 0, taken = 0, structured = false;
  for (const l of parseLog(log, foe)) if (l.kind === 'act') { structured = true; rounds = Math.max(rounds, l.a.r); if (l.a.w === 'm') taken += l.a.d; else if (l.a.w !== 'u') dealt += l.a.d; }
  if (!structured) return log.slice(0, 2).join(' · ');
  return `${rounds} hiệp · ngươi gây ${num(dealt)} · nhận ${num(taken)}`;
}

function Hp({ now, max, side }: { now: number; max: number; side: 'you' | 'foe' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (now / max) * 100)) : 0;
  return <div className={`bhp ${side}`}><i style={{ width: `${pct}%` }} /></div>;
}

// What the multiplier means, in words
function why(a: Act): { cls: string; text: string; tip: string }[] {
  const out: { cls: string; text: string; tip: string }[] = [];
  if (a.x > 1) out.push({ cls: 'strong', text: `Khắc chế ×${a.x.toFixed(2)}`, tip: 'Hệ của chiêu thức khắc hệ của người bị đánh: sát thương tăng.' });
  else if (a.x < 1) out.push({ cls: 'weak', text: `Bị chế ×${a.x.toFixed(2)}`, tip: 'Hệ của chiêu thức bị hệ của người bị đánh chế ngự: sát thương giảm.' });
  if (a.am && a.am > 1) out.push({ cls: 'strong', text: `Chiến trường ×${a.am.toFixed(2)}`, tip: 'Chiến trường này tăng sức mạnh cho hệ của chiêu thức.' });
  else if (a.am && a.am < 1) out.push({ cls: 'weak', text: `Chiến trường ×${a.am.toFixed(2)}`, tip: 'Chiến trường này làm yếu hệ của chiêu thức.' });
  if (a.u && a.u > 1) out.push({ cls: 'same', text: `${a.u} đòn`, tip: 'Chiêu này bắn nhiều đòn trong một lượt; sát thương là tổng các đòn.' });
  if (a.s) out.push({ cls: 'same', text: 'Bản mệnh ×1.2', tip: 'Chiêu thức cùng hệ với Linh Căn của ngươi: sát thương tăng thêm 20%.' });
  if (a.c) out.push({ cls: 'crit', text: 'Bạo kích', tip: 'Đòn đánh trúng chỗ hiểm: sát thương nhân lên theo Bạo Thương.' });
  return out;
}

// A support skill (heal, guard, buff, weakening, stun) or a lost turn, instead of a hit: what the log line says and the short label on the right.
export const FX_LABEL: Record<string, (a: number) => string> = {
  heal: (a) => `+${num(a)} sinh lực`, guard: (a) => `Hộ thể −${a}%`, atkUp: (a) => `Công +${a}%`, critUp: (a) => `Bạo kích +${a}%`,
  atkDown: (a) => `Địch yếu −${a}%`, defDown: (a) => `Phá giáp −${a}%`, stun: (a) => `Choáng ${a} lượt`, skip: () => 'Mất lượt',
};
const FX_TIP: Record<string, string> = {
  heal: 'Hồi sinh lực cho bản thân.', guard: 'Giảm sát thương nhận vào trong vài hiệp.', atkUp: 'Tăng công kích trong vài hiệp.', critUp: 'Tăng tỉ lệ bạo kích trong vài hiệp.',
  atkDown: 'Làm địch đánh yếu đi trong vài hiệp.', defDown: 'Làm giáp của địch mỏng đi trong vài hiệp.', stun: 'Địch bị choáng, mất lượt đánh.', skip: 'Bị choáng nên mất lượt này.',
};
const ROLE = { p: 'Ngươi', b: 'Linh Thú', m: 'Đối thủ', u: '' } as const;

export function BattleLog({ log, foe }: { log: string[]; foe?: string }) {
  const lines = parseLog(log, foe);
  const open = lines.find((l) => l.kind === 'open') as Extract<Line, { kind: 'open' }> | undefined;
  const foeName = open?.o.f || foe;
  let round = 0;
  return (
    <div className="battle" role="log">
      {open && (
        <div className="bvs">
          <div className="bside you">
            <span className="bseal you"><Icon name="atk" size={18} /></span>
            <div><b>Ngươi</b><Hp now={open.o.ph} max={open.o.pm} side="you" /><small>Khí huyết {num(open.o.ph)}/{num(open.o.pm)}</small></div>
          </div>
          <span className="bvsMark">đối</span>
          <div className="bside foe">
            <div><b>{open.o.f}</b><Hp now={open.o.fh} max={open.o.fh} side="foe" /><small>Khí huyết {num(open.o.fh)}/{num(open.o.fh)}</small></div>
            <span className="bseal foe" style={{ '--el': elColor(open.o.fe[0]) } as CSSProperties}><ElIcon el={open.o.fe[0]} size={18} /></span>
          </div>
        </div>
      )}
      {open && C.ARENA(open.o.ar) && (() => { const ar = C.ARENA(open.o.ar)!; return <div className="barena" title={ar.note}><b>{ar.name}</b> · tăng <span className="up">{ar.boost.join(', ')}</span> · giảm <span className="down">{ar.weaken.join(', ')}</span></div>; })()}
      {lines.map((l, i) => {
        if (l.kind === 'open') return null;
        if (l.kind === 'text') {
          const win = l.text === 'Thắng', lose = l.text === 'Bại';
          return <div key={i} className={`bres ${win ? 'win' : lose ? 'lose' : ''}`}>{win ? 'Đại thắng' : lose ? 'Thua trận' : l.text}</div>;
        }
        const a = l.a, head = a.r !== round; round = a.r;
        const tags = why(a), me = a.w === 'p', foeSide = a.w === 'm';
        const target = a.to || (foeSide ? 'Ngươi' : a.w === 'u' ? '' : foeName || 'đối thủ');
        return (
          <div key={i}>
            {head && <div className="bround"><span>Hiệp {ROMAN[a.r] || a.r}</span></div>}
            <div className={`bact ${a.w} ${a.c ? 'crit' : ''}`} style={{ '--el': elColor(a.e) } as CSSProperties}>
              <span className="bseal" title={a.e ? `Hệ ${a.e}` : 'Không thuộc hệ nào'}>{a.e ? <ElIcon el={a.e} size={18} /> : <Icon name={a.f ? (a.f === 'heal' ? 'lotus' : 'sparkle') : me ? 'atk' : a.w === 'b' ? 'paw' : 'flame'} size={18} />}</span>
              <div className="bmain">
                <div className="bsay">
                  <b className="bname">{a.n}</b>
                  {ROLE[a.w] && !me && <span className="brole">{ROLE[a.w]}</span>}
                  {a.f === 'skip' ? <> bị choáng, mất lượt</> : a.k ? <> thi triển <span className="bskill">«{a.k}»</span></> : ' ra đòn'}
                  {a.f && a.f !== 'skip' ? (target && target !== a.n ? <> lên <b className="bname">{target}</b></> : null) : target && <> trúng <b className="bname">{target}</b></>}
                </div>
                {a.f && FX_TIP[a.f] && <div className="btags"><em className={`btag ${a.f === 'heal' || a.f === 'guard' || a.f === 'atkUp' || a.f === 'critUp' ? 'strong' : 'weak'}`} title={FX_TIP[a.f]}>{FX_TIP[a.f]}</em></div>}
                {tags.length > 0 && <div className="btags">{tags.map((t) => <em key={t.cls} className={`btag ${t.cls}`} title={t.tip}>{t.text}</em>)}</div>}
                {a.h != null && a.hm ? (() => { const sideYou = a.ts ? a.ts === 'p' : foeSide, who = a.ts ? (a.ts === 'p' ? 'Ngươi' : foeName || 'đối thủ') : target; return <div className="bleft"><Hp now={a.h} max={a.hm} side={sideYou ? 'you' : 'foe'} /><small>{a.h > 0 ? `${who} còn ${num(a.h)}/${num(a.hm)}` : `${who} gục ngã`}</small></div>; })() : null}
              </div>
              {a.f ? <span className="bdmg fx" title={FX_TIP[a.f]}>{(FX_LABEL[a.f] || (() => ''))(a.a ?? 0)}</span> : <span className="bdmg" title={`Sát thương gây ra${a.x !== 1 ? ` (đã nhân ×${a.x.toFixed(2)} theo hệ)` : ''}`}>{a.c ? <i className="bstamp">Bạo</i> : null}−{num(a.d)}</span>}
            </div>
          </div>
        );
      })}
      <div className="blegend">
        <b>Cách đọc:</b> mỗi dòng là một đòn đánh. Ấn hệ bên trái là hệ của chiêu thức. Con số bên phải là sát thương.
        <em className="strong">Khắc chế ×1.50</em> nghĩa là hệ chiêu thắng hệ đối phương; <em className="weak">Bị chế ×0.67</em> là ngược lại.
      </div>
    </div>
  );
}
