'use client';
import { useState, type CSSProperties } from 'react';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';
import { ElChip, Img } from './ui';
import * as C from '@/lib/content';

// Chủ Đề Tuần (lib/weekly.ts): what this week favours, how long is left, and the two weeks that follow.
export interface WeekV { id: string; name: string; short: string; text: string; icon: string; el?: string; effects: string[]; startsAt: number; endsAt: number }
const dur = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m % 60} phút` : `${m} phút`; };
const dayOf = (ms: number) => new Date(ms).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });

export function WeekIcon({ w, size = 28 }: { w: Pick<WeekV, 'icon' | 'el'>; size?: number }) {
  return w.el ? <ElIcon el={w.el} size={size} /> : <Icon name={w.icon} size={size} />;
}

export function WeekCard({ cur, next, now }: { cur: WeekV; next: WeekV[]; now: number }) {
  const left = cur.endsAt - now, [pic, setPic] = useState(true);   // the banner is drawn once and shipped; until then (or if it is missing) the CSS backdrop alone is shown
  return (
    <div className="wkBox">
      <article className={`wkCur ${cur.el ? `wk-${C.slug(cur.el)}` : `wk-${cur.id}`}`} style={(cur.el ? { '--wk': C.EL[cur.el]?.color || 'var(--gold-300)' } : undefined) as CSSProperties | undefined}>
        {cur.el && pic && <span className="wkImg" aria-hidden="true"><Img src={C.weekArt(cur.el)} className="fill" onBad={() => setPic(false)} /></span>}
        <div className="wkInfo">
          <small className="wkKicker">Chủ đề tuần này · còn {dur(left)}</small>
          <h4>{cur.name} {cur.el ? <ElChip el={cur.el} /> : <span className="chip"><Icon name={cur.icon} size={13} /> {cur.short}</span>}</h4>
          <p>{cur.text}</p>
          <div className="chips">{cur.effects.map((e) => <span key={e} className="chip gold">{e}</span>)}</div>
        </div>
      </article>
      <div className="wkNext" aria-label="Hai tuần tới">
        {next.map((n) => (
          <div key={n.startsAt} className="wkMini" title={`${n.name}: ${n.effects.join(' · ')}`}>
            <WeekIcon w={n} size={18} />
            <span><b>{n.name}</b><small>từ {dayOf(n.startsAt)}</small></span>
          </div>
        ))}
      </div>
    </div>
  );
}
