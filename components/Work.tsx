'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as C from '@/lib/content';
import * as J from '@/lib/jobs';
import * as O from '@/lib/orders';
import * as XP from '@/lib/expo';
import * as WK from '@/lib/work';
import type { GS } from '@/lib/client/types';
import { SP, type Beast } from '@/lib/game';
import { useLookPic } from '@/lib/useLookPic';
import { Icon } from './ds/Icon';
import { ModalClose } from './ds/ModalClose';
import { ElIcon } from './Icons';
import { BeastArt, ElChip, Img, LookTag, PanZoom, SizeMeter, fmt } from './ui';
import type { Act } from './Panels';
import { DoneSeal, afterPaint, keepInView, useFin, type Fin } from './JobDone';
import { useCue } from './fx/Cue';

// Thú đi làm: the sixth kind of Công việc (rules in lib/work.ts and lib/game.ts workSend, workCollect). A posting cannot be sent away and a creature at work cannot be called back: both stay until the work is done and collected. Collecting runs on the screen at once; sending waits for the server.
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

// A creature sent to work waits for the server's answer (lib/intents.ts SERVER_FIRST). What is on its way and the last refusal are kept here, outside the cards, so closing the window or changing
// the tab in the meantime forgets neither: the card shows the creature leaving, and a refusal is told in words instead of the creature just being gone.
const going = new Map<string, number>();
let failed = '', failTimer: ReturnType<typeof setTimeout> | undefined;
const watchers = new Set<() => void>();
const notify = () => watchers.forEach((f) => f());
/** Say why something was refused (it fades after a while); '' clears it. */
const tell = (m: string) => { failed = m; if (failTimer) clearTimeout(failTimer); failTimer = m ? setTimeout(() => tell(''), 10000) : undefined; notify(); };
function useWatch(): void {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); watchers.add(f); return () => { watchers.delete(f); }; }, []);
}

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

/** The creature picked for the player when the list opens: the weakest that fits and is not in the Party (the strong ones fight), a Dị Biến only when nothing else fits
 *  (`cands` comes weakest first, Dị Biến last). The pay does not depend on the creature, so the one that is missed least is the best one to send. */
const bestOf = (cands: Beast[], party: ReadonlySet<number>): Beast | undefined => cands.find((b) => !party.has(b.id)) || cands[0];

/** A creature seen up close before it is sent: its picture, Level, Chiến Lực and numbers, and the button that picks it. */
function BeastPeek({ b, inParty, picked, onPick, onClose }: { b: Beast; inParty: boolean; picked: boolean; onPick: () => void; onClose: () => void }) {
  const look = useLookPic(b, true), sp = SP(b.sp);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal zoom" onClick={onClose} role="dialog" aria-modal="true" aria-label={b.name}>
      <ModalClose onClose={onClose} />
      <div className="modalBody zoomBody" onClick={(e) => e.stopPropagation()}>
        <div className="zoomPic"><PanZoom><Img src={look || C.monsterArt(b.sp, b.mut)} className="fill" fb={<ElIcon el={sp.el[0]} size={80} />} /></PanZoom></div>
        <div className="zoomInfo">
          <h2>{b.mut && <em className="mutBadge">✦ Dị Biến</em>}<LookTag b={b} /> {b.elite ? 'Tinh Anh ' : ''}{b.name}</h2>
          <div className="chips"><span className="chip">Lv{b.level}</span><ElChip el={sp.el[0]} /><span className="chip">{C.PERS[b.pers].n}</span><span className="chip gold"><Icon name="atk" size={13} /> {fmt(b.power)}</span>{inParty && <span className="chip">★ xuất chiến</span>}</div>
          <SizeMeter b={b} />
          <ul className="itLines big"><li>Sinh Lực {b.stats[0]}</li><li>Công Kích {b.stats[2]}</li><li>Phòng Ngự {b.stats[3]}</li><li>Thân Pháp {b.stats[4]}</li></ul>
          {inParty && <div className="hint">Con này đang trong đội xuất chiến. Đi làm vẫn ra trận bình thường, chỉ không bán hay giao được đến khi nhận thưởng.</div>}
        </div>
        <div className="eqAct">
          <button type="button" className="btn hot" disabled={picked} onClick={onPick}><Icon name="check" size={15} /> {picked ? 'Đã chọn' : 'Chọn con này'}</button>
          <button type="button" className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Finish = { done: (stones: number, gift: string, card: Element | null) => void; sure: (stones: number) => void; undo: () => void };
function PostCard({ st, act, p, now, cands, party, fin, finish, onErr }: { st: GS; act: Act; p: WK.Post; now: number; cands: Beast[]; party: ReadonlySet<number>; fin?: Fin; finish: Finish; onErr: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pickId, setPickId] = useState<number | null>(null), [peek, setPeek] = useState<Beast | null>(null);
  useWatch();
  useEffect(() => { setOpen(false); setPeek(null); }, [p.id]);   // the card belongs to a place: when a new posting takes it, the list of creatures starts closed
  // the creature picked: the player's own choice while it still fits, else the best one (so the button below is ready the moment the list opens)
  const picked = cands.find((b) => b.id === pickId) || bestOf(cands, party);
  const sent = going.get(p.id), real = WK.stageOf(p, st.clock), leaving = real === 'free' && sent !== undefined ? st.beasts.find((b) => b.id === sent) : undefined;
  const stage = leaving ? 'run' : real, worker = leaving || (p.beast !== undefined ? st.beasts.find((b) => b.id === p.beast) : undefined);
  const total = p.secs * 1000, left = Math.max(0, (p.end ?? 0) - now), pct = leaving ? 0 : p.start !== undefined && p.end !== undefined ? Math.min(100, Math.round((100 * (now - p.start)) / total)) : 0;
  const gone = stage === 'gone';

  const send = async (b: Beast) => {
    setOpen(false); onErr('');
    going.set(p.id, b.id); notify();   // the card shows the creature leaving at once; the server's answer follows
    const t0 = Date.now(), done = () => { going.delete(p.id); notify(); };
    let r: Awaited<ReturnType<Act>>;
    try { r = await act('workSend', { id: p.id, beast: b.id }); } catch { r = { ok: false, msg: 'Không gửi được, thử lại.' }; }
    if (r.ok) setTimeout(done, Math.max(0, 900 - (Date.now() - t0)));   // the step-in and the ring are seen even when the answer is quick
    else { done(); onErr(r.msg); }
  };
  const collect = async (card: Element | null) => {
    onErr(''); keepInView(card);   // the card turns into the next posting: it stays in view
    finish.done(p.stones, WK.goodsText(p), card);   // the seal is stamped in the same screen update; the real figure follows
    const r = await act('workCollect', { id: p.id });
    if (!r.ok) { finish.undo(); onErr(r.msg); return; }
    finish.sure(r.data && r.data.stones != null ? r.data.stones : p.stones);
  };
  return (
    <div className={`ordCard jobCard wkCard w-${p.tier}${gone ? ' done' : ''}${fin ? ' sealed' : ''}${stage === 'ready' ? ' ready' : ''}${stage === 'run' ? ' run' : ''}`}>
      {fin && <DoneSeal f={fin} />}
      <div className="ordHead">
        <Img src={C.buyerArt(p.who.arch, p.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
        <div className="ordWho"><b>{p.who.name}</b><small>{p.who.arch} <span className={`wkTier t${p.tier}`} title={`Việc ${WK.TIER_NAME[p.tier].toLowerCase()}`}>{stars(p.tier)} {WK.TIER_NAME[p.tier]}</span></small></div>
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
            <>
              <div className="hint wkPickHint">Đã chọn sẵn con hợp nhất (con yếu nhất hợp việc, để dành con mạnh cho đội xuất chiến). Bấm vào ảnh để xem kỹ, bấm vào ô để đổi con khác.</div>
              <div className="ordPick wkPick" role="radiogroup" aria-label="Chọn Linh Thú đi làm">
                {cands.map((b) => {
                  const on = picked?.id === b.id;
                  return (
                    <div key={b.id} role="radio" aria-checked={on} tabIndex={0} className={`ordIt wkPickIt${on ? ' on' : ''}`} onClick={() => setPickId(b.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPickId(b.id); } }}>
                      {on && <i className="wkPickMark" aria-hidden="true"><Icon name="check" size={12} /></i>}
                      <span className="wkPickPic" onClick={(e) => e.stopPropagation()}><BeastArt b={b} box={84} mine onOpen={() => setPeek(b)} /></span>
                      <b className="wkPickNm">{party.has(b.id) ? '★ ' : ''}{b.mut ? '✦ ' : ''}{b.name}</b>
                      <small>Lv{b.level} · <Icon name="atk" size={11} /> {fmt(b.power)}</small>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {open
            ? (
              <div className="wkPickAct">
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Thôi</button>
                <button type="button" className="btn hot" disabled={!picked} onClick={() => picked && send(picked)}>{picked ? `Cử ${picked.name} đi làm` : 'Chọn một con'}</button>
              </div>
            )
            : <button type="button" className="btn" disabled={cands.length === 0} onClick={() => { onErr(''); setPickId(null); setOpen(true); }}>{cands.length > 0 ? `Cử Linh Thú đi làm (${cands.length} con hợp)` : p.ask.mut ? 'Chưa có Dị Biến nào hợp' : 'Chưa có con nào hợp'}</button>}
          {peek && <BeastPeek b={peek} inParty={party.has(peek.id)} picked={picked?.id === peek.id} onPick={() => { setPickId(peek.id); setPeek(null); }} onClose={() => setPeek(null)} />}
        </>
      )}
      {(stage === 'run' || stage === 'ready') && (
        <>
          <div className={`wkWorker${sent !== undefined ? ' go' : ''}`}>
            <span className="wkBob">{worker ? <BeastArt b={worker} box={44} /> : <ElIcon el={WK.elOf(p.ask)} size={30} />}</span>
            <div className="wkWorkerTx"><b>{worker ? worker.name : 'Linh Thú'}</b><small>{stage === 'ready' ? 'Làm xong rồi' : leaving ? 'Đang lên đường…' : left > 0 ? `Đang làm · còn ${WK.durText(left / 1000)}` : 'Sắp xong…'}</small></div>
          </div>
          <div className="jobBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stage === 'ready' ? 100 : pct}><i style={{ width: `${stage === 'ready' ? 100 : pct}%` }} /></div>
          {stage === 'ready' && <button type="button" className="btn hot" onClick={(e) => collect(e.currentTarget.closest('.ordCard'))}>Nhận thưởng · +{fmt(p.stones)}</button>}
        </>
      )}
      {gone && <div className="ordDone"><Icon name="check" size={14} /> {p.done ? 'Đã nhận thưởng, đang có việc mới' : 'Việc đã đóng, đang có việc mới'}</div>}
    </div>
  );
}

export function WorkPanel({ st, act }: { st: GS; act: Act }) {
  const list = WK.postsOf(st.work);
  useWatch();
  const err = failed, setErr = tell;
  const { fin, mark, patch, clear } = useFin(), cue = useCue();
  const now = useGameNow(st.clock, list.some((p) => WK.stageOf(p, st.clock) === 'run'));
  const booked = useMemo(() => WK.bookedIds(st.work), [st.work]);
  const stands = useMemo(() => standIds(st), [st.expo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const party = useMemo(() => J.partyOf(st.beasts, st.caps.party), [st.beasts, st.caps.party]);
  const finishOf = (slot: number): Finish => ({
    done: (stones, gift, card) => { mark(slot, { stones, gift: gift || undefined }); afterPaint(() => cue.jobDone(card, `+${fmt(stones)} Linh Thạch`)); },
    sure: (stones) => patch(slot, { stones }),
    undo: () => clear(slot),
  });
  if (!list.length) return <div className="empty">Việc đang được đưa lên bảng, đợi vài giây rồi xem lại.</div>;
  return (
    <div className="ordPanel">
      <div className="hint">Cử Linh Thú hợp yêu cầu đi làm: đã cử là làm đến xong, không gọi về được, việc cũng không bỏ qua được. Thú làm cả lúc ngươi không mở game, vẫn ra trận, chỉ không bán, giao hay bày được cho đến khi nhận thưởng. Việc Đặc biệt chỉ Linh Thú Dị Biến làm được, thưởng rất hậu.</div>
      {err && <div className="hint ordWarn" role="alert">{err}</div>}
      <div className="ordList">
        {list.map((p, slot) => (
          <PostCard key={slot} st={st} act={act} p={p} now={now} party={party} fin={fin[slot]} onErr={setErr} finish={finishOf(slot)}
            cands={WK.stageOf(p, st.clock) === 'free' ? WK.candidates(p, st.beasts, booked, stands) : []} />
        ))}
      </div>
    </div>
  );
}
