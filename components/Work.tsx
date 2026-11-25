'use client';
import { useEffect, useMemo, useState } from 'react';
import * as C from '@/lib/content';
import * as O from '@/lib/orders';
import * as XP from '@/lib/expo';
import * as WK from '@/lib/work';
import type { GS } from '@/lib/client/types';
import type { Beast } from '@/lib/game';
import { Icon } from './ds/Icon';
import { askConfirm } from './ds/Dialog';
import { ElIcon } from './Icons';
import { BeastArt, Img, fmt } from './ui';
import type { Act } from './Panels';
import { DoneSeal, afterPaint, useFin, type Fin } from './JobDone';
import { useCue } from './fx/Cue';

// Thú đi làm: the sixth kind of Công việc (rules in lib/work.ts and lib/game.ts workSend, workCollect, workDismiss; all three run on the screen at once and nothing pops up when it worked).
// Six postings on a board. A free one shows what it asks, how long it takes and what it pays; one tap opens the creatures that fit and one more tap sends one. A working one shows the creature and the
// time left; when the time is up the same place holds the button that collects the pay, and the seal of Công việc is stamped on the card.

/** The creatures on a stand of Triển Lãm (they cannot go to work). */
const standIds = (st: GS): Set<number> => { const s = new Set<number>(); if (XP.isExpo(st.expo)) for (const x of st.expo.stands) if (x && x.kind === 'beast') s.add(x.id); return s; };
/** How many postings could be done right now: the pay is there to collect, or a free posting has a creature that fits (the dot on the tab). */
export const workReady = (st: GS): number => {
  const list = WK.postsOf(st.work);
  if (!list.length) return 0;
  const booked = WK.bookedIds(st.work), stands = standIds(st);
  return list.filter((p) => { const s = WK.stageOf(p, st.clock); return s === 'ready' || (s === 'free' && st.beasts.some((b) => !booked.has(b.id) && !stands.has(b.id) && WK.fits(p.ask, b))); }).length;
};

/** The game clock now: the clock of the last state from the server, counted on with the phone's own clock (never compared with it, so a wrong phone clock changes nothing). Moves every few seconds only while something is working. */
function useGameNow(clock: number, live: boolean): number {
  const at = useMemo(() => Date.now(), [clock]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  useEffect(() => { if (!live) return; const t = setInterval(() => tick((n) => n + 1), 4000); return () => clearInterval(t); }, [live]);
  return clock + (Date.now() - at);
}

function AskPic({ a, size }: { a: WK.Ask; size: number }) {
  const art = WK.askArt(a);
  return art
    ? <Img src={art} className="jobAskImg" style={{ width: size, height: size }} fb={<ElIcon el={WK.elOf(a)} size={Math.round(size * 0.6)} />} />
    : <span className="jobAskImg" style={{ width: size, height: size }}><ElIcon el={WK.elOf(a)} size={Math.round(size * 0.65)} /></span>;
}
const stars = (t: WK.Tier) => (t === 3 ? '✦' : '★'.repeat(t + 1));

type Finish = { done: (stones: number, gift: string, card: Element | null) => void; sure: (stones: number) => void; undo: () => void };
function PostCard({ st, act, p, now, cands, fin, finish, onErr }: { st: GS; act: Act; p: WK.Post; now: number; cands: Beast[]; fin?: Fin; finish: Finish; onErr: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [p.id]);   // the card belongs to a place: when a new posting takes it, the list of creatures starts closed
  const stage = WK.stageOf(p, st.clock), worker = p.beast !== undefined ? st.beasts.find((b) => b.id === p.beast) : undefined;
  const total = p.secs * 1000, left = Math.max(0, (p.end ?? 0) - now), pct = p.start !== undefined && p.end !== undefined ? Math.min(100, Math.round((100 * (now - p.start)) / total)) : 0;
  const gone = stage === 'gone';

  const send = async (b: Beast) => {
    setOpen(false); onErr('');
    const r = await act('workSend', { id: p.id, beast: b.id });
    if (!r.ok) onErr(r.msg);
  };
  const collect = async (card: Element | null) => {
    onErr('');
    finish.done(p.stones, WK.goodsText(p), card);   // the seal is stamped in the same screen update; the real figure follows
    const r = await act('workCollect', { id: p.id });
    if (!r.ok) { finish.undo(); onErr(r.msg); return; }
    finish.sure(r.data && r.data.stones != null ? r.data.stones : p.stones);
  };
  const dismiss = async () => {
    if (stage === 'run' && !(await askConfirm({ title: 'Gọi Linh Thú về', body: `${worker ? worker.name : 'Linh Thú'} đang làm việc cho ${p.who.name}. Gọi về giữa chừng thì không nhận được gì.`, ok: 'Gọi về' }))) return;
    setOpen(false);
    const r = await act('workDismiss', { id: p.id });
    if (!r.ok) onErr(r.msg);
  };

  return (
    <div className={`ordCard jobCard wkCard w-${p.tier}${gone ? ' done' : ''}${fin ? ' sealed' : ''}${stage === 'ready' ? ' ready' : ''}`}>
      {fin && <DoneSeal f={fin} />}
      <div className="ordHead">
        <Img src={C.buyerArt(p.who.arch, p.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
        <div className="ordWho"><b>{p.who.name}</b><small>{p.who.arch} <span className={`wkTier t${p.tier}`} title={`Việc ${WK.TIER_NAME[p.tier].toLowerCase()}`}>{stars(p.tier)} {WK.TIER_NAME[p.tier]}</span></small></div>
        {(stage === 'free' || stage === 'run') && <button type="button" className="ordX" aria-label={stage === 'run' ? 'Gọi Linh Thú về' : 'Từ chối việc này'} title={stage === 'run' ? 'Gọi Linh Thú về' : 'Từ chối việc này'} onClick={dismiss}><Icon name="close" size={14} /></button>}
      </div>
      <p className="ordLine"><b className="wkJob">{p.job}</b> “{WK.lineOf(p)}”</p>
      <div className="jobAsk">
        <AskPic a={p.ask} size={52} />
        <div className="jobAskTx"><b>{WK.askText(p.ask)}</b><small>{p.ask.mut ? 'Chỉ Linh Thú Dị Biến mới làm được' : 'Làm xong thú vẫn là của ngươi'}</small></div>
      </div>
      <div className="ordPay wkPay">
        <span><Icon name="clock" size={13} /> <b>{WK.durText(p.secs)}</b></span>
        <span><Icon name="stone" size={13} /> <b>{fmt(p.stones)}</b></span>
        {(p.extra || []).map((x, i) => <span key={i} className="ordExtra"><Img src={O.extraArt(x)} className="ordExImg" fb="✦" /><b>{O.extraName(x)} ×{x.n}</b></span>)}
      </div>
      {stage === 'free' && (
        <>
          {open && (
            <div className="ordPick jobBeasts" role="group" aria-label="Chọn Linh Thú đi làm">
              {cands.map((b) => (
                <button key={b.id} type="button" className="ordIt jobBeast" onClick={() => send(b)}>
                  <BeastArt b={b} box={48} />
                  <small>{b.mut ? '✦ ' : ''}Lv{b.level} · {C.SIZE_CLASS[b.cls]}</small>
                </button>
              ))}
            </div>
          )}
          {open
            ? <button type="button" className="btn" onClick={() => setOpen(false)}>Thôi</button>
            : <button type="button" className="btn" disabled={cands.length === 0} onClick={() => { onErr(''); setOpen(true); }}>{cands.length > 0 ? `Cử Linh Thú đi làm (${cands.length} con hợp)` : p.ask.mut ? 'Chưa có Dị Biến nào hợp' : 'Chưa có con nào hợp'}</button>}
        </>
      )}
      {(stage === 'run' || stage === 'ready') && (
        <>
          <div className="wkWorker">
            {worker ? <BeastArt b={worker} box={44} /> : <ElIcon el={WK.elOf(p.ask)} size={30} />}
            <div className="wkWorkerTx"><b>{worker ? worker.name : 'Linh Thú'}</b><small>{stage === 'ready' ? 'Làm xong rồi' : left > 0 ? `Đang làm · còn ${WK.durText(left / 1000)}` : 'Sắp xong…'}</small></div>
          </div>
          <div className="jobBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stage === 'ready' ? 100 : pct}><i style={{ width: `${stage === 'ready' ? 100 : pct}%` }} /></div>
          {stage === 'ready' && <button type="button" className="btn hot" onClick={(e) => collect(e.currentTarget.closest('.ordCard'))}>Nhận thưởng · +{fmt(p.stones)}</button>}
        </>
      )}
      {gone && <div className="ordDone"><Icon name="check" size={14} /> {p.done ? 'Đã nhận thưởng, đang có việc mới' : 'Đã từ chối, đang có việc mới'}</div>}
    </div>
  );
}

export function WorkPanel({ st, act }: { st: GS; act: Act }) {
  const list = WK.postsOf(st.work), [err, setErr] = useState('');
  const { fin, mark, patch, clear } = useFin(), cue = useCue();
  const now = useGameNow(st.clock, list.some((p) => WK.stageOf(p, st.clock) === 'run'));
  const booked = useMemo(() => WK.bookedIds(st.work), [st.work]);
  const stands = useMemo(() => standIds(st), [st.expo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const finishOf = (slot: number): Finish => ({
    done: (stones, gift, card) => { mark(slot, { stones, gift: gift || undefined }); afterPaint(() => cue.jobDone(card, `+${fmt(stones)} Linh Thạch`)); },
    sure: (stones) => patch(slot, { stones }),
    undo: () => clear(slot),
  });
  if (!list.length) return <div className="empty">Việc đang được đưa lên bảng, đợi vài giây rồi xem lại.</div>;
  return (
    <div className="ordPanel">
      <div className="hint">Cử Linh Thú hợp yêu cầu đi làm, xong thì nhận thưởng. Thú làm cả lúc ngươi không mở game, vẫn ra trận, chỉ không bán, giao hay bày được cho đến khi nhận thưởng. Việc Đặc biệt chỉ Linh Thú Dị Biến làm được, thưởng rất hậu.</div>
      {err && <div className="hint ordWarn" role="alert">{err}</div>}
      <div className="ordList">
        {list.map((p, slot) => (
          <PostCard key={slot} st={st} act={act} p={p} now={now} fin={fin[slot]} onErr={setErr} finish={finishOf(slot)}
            cands={WK.stageOf(p, st.clock) === 'free' ? WK.candidates(p, st.beasts, booked, stands) : []} />
        ))}
      </div>
    </div>
  );
}
