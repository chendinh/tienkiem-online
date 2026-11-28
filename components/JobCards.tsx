'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as J from '@/lib/jobs';
import * as O from '@/lib/orders';
import * as XP from '@/lib/expo';
import * as WK from '@/lib/work';
import type { GS } from '@/lib/client/types';
import { releaseValue, type Beast } from '@/lib/game';
import { Icon } from './ds/Icon';
import { askConfirm } from './ds/Dialog';
import { ElIcon } from './Icons';
import { BeastArt, Img, fmt } from './ui';
import type { Act } from './Panels';
import { DoneSeal, afterPaint, keepInView, useFin, type Fin } from './JobDone';
import { useCue } from './fx/Cue';
import { BeastPeek } from './BeastPeek';

// Tìm thú, Đặt đan and Nguyên liệu: the three kinds of Công việc that ask for a NUMBER of something (the rules are in lib/jobs.ts and lib/game.ts fillJob).
// A buyer stays until all that was asked has been handed over; the player gives what there is, every unit is paid at once, and nothing is lost by stopping half way.
// Beasts are asked by element (1 to 3 elements, any species) and picked on big tiles: the weak spare ones are ready, the Party is never listed (2026-11-28), a tap on a tile picks it or
// puts it in place of the one picked longest ago when there is no room (lib/jobs.ts assignBeasts places a creature of two elements where there is room), a tap on a picked one puts it
// back, and a tap on the picture opens the creature up close. Pills and materials are handed over with one button (as many as there are, up to what is asked).
const times = (m: number) => String(m / 100).replace('.', ',');
const board = (st: GS, t: J.JobType): J.Job[] => J.ofType(st.jobs, t);

// ---- what the player could give right now
// The creatures that are not handed over by themselves: the Party, the framed one, the ones on a stand of Triển Lãm and the ones out at work (Thú đi làm: locked until the pay is collected). Worked out once per screen update and handed to every card (sorting the whole pen once per creature was the slow way).
type Hold = ReadonlySet<number>;
const NOBODY: Hold = new Set();
const holdOf = (st: GS): Hold => {
  const keep = J.partyOf(st.beasts, st.caps.party), f = st.player.showcase;
  if (f && f.kind === 'beast') keep.add(f.id);
  if (XP.isExpo(st.expo)) for (const s of st.expo.stands) if (s && s.kind === 'beast') keep.add(s.id);
  for (const id of WK.bookedIds(st.work)) keep.add(id);
  return keep;
};
/** How many of this pill or material the player has. */
export const stockOf = (st: GS, a: J.Ask): number => (a.t === 'pill' ? st.inv.hp[a.grade] || 0 : a.t === 'mat' ? st.inv.mat[a.id] || 0 : 0);
/** How many buyers of this kind could be given something right now (the badge on the tab). A beast needs a SPARE creature that fits; no sorting, no copies. */
export const readyCount = (st: GS, t: J.JobType): number => {
  const open = board(st, t).filter(J.isOpen);
  if (!open.length) return 0;
  if (t !== 'beast') return open.filter((j) => stockOf(st, j.ask) > 0).length;
  const h = holdOf(st);
  return open.filter((j) => st.beasts.some((b) => J.isSpare(b, h) && J.beastMatches(j.ask, b))).length;
};

// ---- one card
const elStyle = (el: string) => ({ '--el': C.EL[el]?.color || 'var(--gold-300)' }) as CSSProperties;
function AskPic({ a, size }: { a: J.Ask; size: number }) {
  const art = J.askArt(a), els = J.wantsOf(a);
  if (art) return <Img src={art} className="jobAskImg" style={{ width: size, height: size }} fb={<Icon name="stone" size={Math.round(size * 0.6)} />} />;
  // beasts: the signs of the elements asked, one big sign or two or three smaller ones
  return (
    <span className={`jobAskImg jobElPic n${els.length}`} style={{ width: size, height: size }}>
      {els.length ? els.map((w) => <i key={w.el} style={elStyle(w.el)}><ElIcon el={w.el} size={Math.round(size * (els.length === 1 ? 0.62 : els.length === 2 ? 0.42 : 0.36))} /></i>) : <Icon name="paw" size={Math.round(size * 0.5)} />}
    </span>
  );
}
/** The elements a beast buyer asks for, each with how many came: a chip per element, green when it is full. */
function ElParts({ a }: { a: J.Ask }) {
  const els = J.wantsOf(a);
  if (!els.length) return null;
  return (
    <div className="jobEls" role="list" aria-label="Các hệ khách cần">
      {els.map((w) => (
        <span key={w.el} role="listitem" className={`jobEl${w.got >= w.n ? ' full' : ''}`} style={elStyle(w.el)}>
          <ElIcon el={w.el} size={13} /> {w.el} <b>{w.got}/{w.n}</b>{w.got >= w.n && <Icon name="check" size={11} />}
        </span>
      ))}
    </div>
  );
}

// What a card tells its list about a hand-over that finishes the job: `done` starts the seal at once, `sure` brings the real figures, `undo` takes the seal away.
type Finish = { done: (stones: number, card: Element | null, rankUp?: number) => void; sure: (stones: number, rankUp?: number) => void; undo: () => void };
function JobCard({ st, act, j, hold, party, fin, finish, onErr }: { st: GS; act: Act; j: J.Job; hold: Hold; party: Hold; fin?: Fin; finish: Finish; onErr: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<number[]>([]), [peek, setPeek] = useState<Beast | null>(null);
  useEffect(() => { setOpen(false); setSel([]); setPeek(null); }, [j.id]);   // the card belongs to a slot: when a new buyer takes the place, the picker starts closed
  const gone = !J.isOpen(j), left = J.left(j), a = j.ask;
  const spare = (b: Beast) => J.isSpare(b, hold);
  // the Party is never listed: the creatures that fight are not handed over from here. A creature at work is not in the pen (a save from before still has it there,
  // locked). A framed creature or one on a stand comes last and is never put forward.
  const cands = useMemo(() => { if (j.type !== 'beast') return []; const working = WK.bookedIds(st.work); return J.beastCands(j, st.beasts.filter((b) => !working.has(b.id) && !party.has(b.id)), hold); }, [j, st.beasts, st.work, hold, party]);
  const byId = useMemo(() => new Map(cands.map((b) => [b.id, b])), [cands]);
  const have = j.type === 'beast' ? cands.length : stockOf(st, a), take = j.type === 'beast' ? sel.length : Math.min(have, left);
  const spareN = j.type === 'beast' ? cands.filter((b) => J.isSpare(b, hold)).length : 0;
  const unit = a.t === 'beast' ? 0 : J.unitValue(a);
  const payUnit = (b?: Beast) => J.payFor(j.mult, b ? releaseValue(b) : unit);
  const chosen = cands.filter((b) => sel.includes(b.id));
  const full = take > 0 && take >= left;
  const sumNow = j.type === 'beast' ? chosen.reduce((s, b) => s + releaseValue(b), 0) : take * unit;
  const pay = (j.type === 'beast' ? chosen.reduce((s, b) => s + payUnit(b), 0) : take * payUnit()) + (full ? J.payFor(j.bonus, j.sum + sumNow) : 0);

  // which creatures a tap can pick: added to the ones chosen, or put in place of one of them (every element asked has room for so many, a creature of two elements goes where there is room)
  const takes = useMemo(() => {
    if (j.type !== 'beast') return new Set<number>();
    return new Set(cands.filter((b) => !sel.includes(b.id) && J.tapPick(a, byId, sel, b) !== sel).map((b) => b.id));
  }, [j.type, a, cands, byId, sel]);
  const start = () => {
    onErr('');
    if (open) { setOpen(false); return; }
    const pickd: Beast[] = [];   // the spare ones are ready, the weakest first, as many as fit; the Party is never put forward by itself
    for (const b of cands) if (pickd.length < left && spare(b) && J.canAdd(a, pickd, b)) pickd.push(b);
    setSel(pickd.map((b) => b.id));
    setOpen(true);
  };
  const pick = (b: Beast) => setSel((cur) => J.tapPick(a, byId, cur, b));
  const give = async (card: Element | null) => {
    // This hand-over finishes the job: the seal starts in the same screen update as the new numbers (waiting for the answer put it one whole redraw late)
    keepInView(card);   // the picker folds and the new buyer comes: the card stays in view
    const closing = full, rankNow = J.RANKED.includes(j.type) && J.rankOf(J.doneOf(st.jobs, j.type) + 1) > J.rankOf(J.doneOf(st.jobs, j.type)) ? J.rankOf(J.doneOf(st.jobs, j.type) + 1) : undefined;
    if (closing) finish.done(pay, card, rankNow);
    const r = await act('fillJob', j.type === 'beast' ? { id: j.id, ids: sel } : { id: j.id, n: take });
    if (!r.ok) { if (closing) finish.undo(); onErr(r.msg); return; }
    setOpen(false); onErr('');
    if (r.data && r.data.done) { if (closing) finish.sure(r.data.stones, r.data.rankUp); else finish.done(r.data.stones, card, r.data.rankUp); }
  };
  // a beast the player wants to hand over but that is framed or on a stand asks a second time
  const giveBeasts = async (card: Element | null) => {
    const risky = chosen.filter((b) => !spare(b));
    if (risky.length && !(await askConfirm({ title: 'Giao Linh Thú đang trưng bày', body: `${risky.map((b) => b.name).join(', ')} đang trong khung trưng bày hoặc trên bệ Triển Lãm. Giao đi thì không lấy lại được.`, ok: 'Vẫn giao', danger: true }))) return;
    await give(card);
  };

  return (
    <div className={`ordCard jobCard t-${j.type}${gone ? ' done' : ''}${fin ? ' sealed' : ''}`}>
      {fin && <DoneSeal f={fin} />}
      <div className="ordHead">
        <Img src={C.buyerArt(j.who.arch, j.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
        <div className="ordWho"><b>{j.who.name}</b><small>{j.who.arch}{J.RANKED.includes(j.type) ? ` · Đơn bậc ${(j.rank ?? 0) + 1}` : ''}</small></div>
      </div>
      <p className="ordLine">“{J.lineOf(j)}”</p>
      <div className="jobAsk">
        <AskPic a={a} size={52} />
        <div className="jobAskTx">
          {a.t === 'beast' ? <><b>Cần {j.need} linh thú theo hệ</b><small>Loài nào cũng được · đã giao {j.got}/{j.need}</small></> : <><b>{J.askText(j)}</b><small>Đã giao {j.got}/{j.need}</small></>}
        </div>
      </div>
      <ElParts a={a} />
      <div className="jobBar" role="progressbar" aria-valuemin={0} aria-valuemax={j.need} aria-valuenow={j.got}><i style={{ width: `${Math.min(100, Math.round((100 * j.got) / j.need))}%` }} /></div>
      <div className="ordPay">
        {a.t === 'beast'
          ? <span>Mỗi con trả <b>gấp {times(j.mult)}</b> giá bán{j.bonus > 0 && <>, đủ hàng thưởng thêm <b>gấp {times(j.bonus)}</b></>}</span>
          : <span>Mỗi {a.t === 'pill' ? 'viên' : 'cái'} trả <b>{fmt(payUnit())}</b> <Icon name="stone" size={13} />{j.bonus > 0 && <>, đủ hàng thưởng thêm <b>{Math.round(j.bonus)}%</b></>}</span>}
        {J.giftsOf(j).length > 0 && (
          <span className="ordExtra ordGifts">{j.bonus > 0 || j.need > 1 ? 'Đủ hàng tặng' : 'Tặng'}
            {J.giftsOf(j).map((x, i) => <span key={i} className="ordGift"><Img src={O.extraArt(x)} className="ordExImg" fb="✦" /><b>{O.extraName(x)} ×{x.n}</b></span>)}
          </span>
        )}
      </div>
      {j.paid > 0 && <div className="ordDone"><Icon name="stone" size={13} /> Đã nhận {fmt(j.paid)} Linh Thạch từ khách này</div>}
      {gone ? <div className="ordDone"><Icon name="check" size={14} /> {j.done ? 'Khách đã đủ hàng, đang có khách mới tới' : 'Khách đã rời đi'}</div> : (
        <>
          {open && j.type === 'beast' && (
            <>
              <div className="hint wkPickHint">Đã chọn sẵn những con yếu nhất hợp yêu cầu. Bấm vào ô để chọn hoặc đổi con, bấm lại con đã chọn để bỏ, bấm vào ảnh để xem kỹ. Con đang xuất chiến không có trong danh sách.</div>
              <div className="ordPick jobBeasts" role="group" aria-label="Chọn Linh Thú để giao">
                {cands.map((b) => {
                  const on = sel.includes(b.id), off = !on && !takes.has(b.id);
                  return (
                    <div key={b.id} role="checkbox" aria-checked={on} aria-disabled={off} tabIndex={off ? -1 : 0} className={`ordIt jobBeast${on ? ' on' : ''}${off ? ' off' : ''}`}
                      onClick={() => { if (!off) pick(b); }} onKeyDown={(e) => { if (!off && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(b); } }}>
                      {on && <i className="jobBeastMark" aria-hidden="true"><Icon name="check" size={12} /></i>}
                      {!spare(b) && <em className="jobBeastHeld">Đang trưng</em>}
                      <span className="jobBeastPic" onClick={(e) => e.stopPropagation()}><BeastArt b={b} box={76} mine onOpen={() => setPeek(b)} /></span>
                      <b className="jobBeastNm">{b.name}</b>
                      <small className="jobBeastEl">{J.speciesEls(b.sp).map((el) => <i key={el} style={elStyle(el)}><ElIcon el={el} size={12} /></i>)} Lv{b.level}</small>
                      <small className="jobBeastPay">+{fmt(payUnit(b))} <Icon name="stone" size={11} /></small>
                    </div>
                  );
                })}
              </div>
              {peek && (
                <BeastPeek b={peek} picked={sel.includes(peek.id)} undo can={takes.has(peek.id)} why="Hệ này đã đủ"
                  note={`Giao con này khách trả +${fmt(payUnit(peek))} Linh Thạch. Giao rồi thì không lấy lại được.${spare(peek) ? '' : ' Con này đang được trưng bày.'}`}
                  onPick={() => { pick(peek); setPeek(null); }} onClose={() => setPeek(null)} />
              )}
            </>
          )}
          {open && j.type === 'beast'
            ? <div className="ordBtns"><button type="button" className="btn" onClick={() => setOpen(false)}>Thôi</button><button type="button" className="btn hot" disabled={sel.length === 0} onClick={(e) => giveBeasts(e.currentTarget.closest('.ordCard'))}>Giao {sel.length} con · +{fmt(pay)} <Icon name="stone" size={14} /></button></div>
            : j.type === 'beast'
              ? <button type="button" className={`btn${spareN > 0 || have === 0 ? '' : ' ghost'}`} disabled={have === 0} onClick={start}>{spareN > 0 ? `Giao nộp (${spareN} con hợp)` : have > 0 ? `Chỉ con đang trưng bày hợp (${have})` : 'Chưa có con nào hợp'}</button>
              : <button type="button" className="btn" disabled={have === 0} onClick={(e) => give(e.currentTarget.closest('.ordCard'))}>{have > 0 ? `Giao ${take}${have < left ? ` (ngươi có ${have})` : ''} · +${fmt(pay)}` : `Chưa có ${a.t === 'pill' ? 'viên đan' : 'nguyên liệu'} nào`}</button>}
          {j.type !== 'beast' && have === 0 && <div className="hint">{a.t === 'pill' ? 'Luyện Hồi Khí Đan bằng nguyên liệu thu được khi đi thám hiểm.' : 'Nguyên liệu rơi ra khi thám hiểm, mỗi vùng một loại.'}</div>}
        </>
      )}
    </div>
  );
}

// The bậc of this kind of job: how many have been finished, and how many more it takes to reach the next one.
function RankBar({ done }: { done: number }) {
  const rk = J.rankOf(done), next = J.toNext(done), lo = J.RANK_AT[rk], hi = J.RANK_AT[rk + 1];
  return (
    <div className="jobRank" role="group" aria-label="Bậc công việc">
      <div className="jobRankHd"><b><Icon name="rise" size={14} /> Bậc {rk + 1} · {J.RANK_NAME[rk]}</b><small>{next === null ? 'Bậc cao nhất' : `Còn ${next} việc nữa lên bậc ${J.RANK_NAME[rk + 1]}`}</small></div>
      <div className="jobBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={next === null ? 100 : Math.round((100 * (done - lo)) / (hi - lo))}><i style={{ width: `${next === null ? 100 : Math.round((100 * (done - lo)) / (hi - lo))}%` }} /></div>
    </div>
  );
}

function JobList({ st, act, type, hint }: { st: GS; act: Act; type: J.JobType; hint: string }) {
  const list = board(st, type), [err, setErr] = useState('');
  const { fin, mark, patch, clear } = useFin(), cue = useCue();
  const hold = useMemo(() => (type === 'beast' ? holdOf(st) : NOBODY), [type, st.beasts, st.caps.party, st.player.showcase, st.expo, st.work]);
  const party = useMemo(() => (type === 'beast' ? J.partyOf(st.beasts, st.caps.party) : NOBODY), [type, st.beasts, st.caps.party]);   // never listed
  const rankName = (r?: number) => (r === undefined ? undefined : J.RANK_NAME[r]);
  const finishOf = (slot: number, j: J.Job): Finish => ({
    done: (stones, card, rankUp) => {   // the seal now, the sound and the floating line on the next paint
      const rank = rankName(rankUp);
      mark(slot, { stones, gift: J.giftsText(j) || undefined, rank });
      afterPaint(() => cue.jobDone(card, `+${fmt(stones)} Linh Thạch${rank ? ` · Lên bậc ${rank}` : ''}`));
    },
    sure: (stones, rankUp) => patch(slot, { stones, rank: rankName(rankUp) }),
    undo: () => clear(slot),
  });
  if (!list.length) return <div className="empty">Khách đang tới Phường Thị, đợi vài giây rồi xem lại.</div>;
  return (
    <div className="ordPanel">
      <div className="hint">{hint}</div>
      {J.RANKED.includes(type) && <RankBar done={J.doneOf(st.jobs, type)} />}
      {err && <div className="hint ordWarn" role="alert">{err}</div>}
      <div className="ordList">
        {list.map((j, slot) => (
          <JobCard key={slot} st={st} act={act} j={j} hold={hold} party={party} fin={fin[slot]} onErr={setErr} finish={finishOf(slot, j)} />
        ))}
      </div>
    </div>
  );
}
export const BeastJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="beast" hint="Khách cần linh thú theo hệ, loài nào cũng được. Mỗi con giao được trả ngay gấp ba giá bán; giao đủ thì thưởng thêm gấp đôi, tặng Khế Ước Phù hạng Huyền trở lên và Hồi Khí Đan. Linh Thú Dị Biến không giao được; các con dư được chọn sẵn, đội xuất chiến thì ngươi tự chọn." />;
export const PillJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="pill" hint="Khách thu đan của ngươi giá cao hơn giá thu mua của tiệm. Giao bao nhiêu có bấy nhiêu, đủ thì có thêm nguyên liệu. Làm xong càng nhiều việc, bậc càng cao: đơn lớn hơn, đan hạng cao hơn, nguyên liệu tặng hiếm hơn." />;
export const MatJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="mat" hint="Khách thu nguyên liệu gấp đôi giá tiệm trở lên. Gom đủ số khách cần thì thưởng thêm và có quà. Làm xong càng nhiều việc, bậc càng cao: đơn lớn hơn, nguyên liệu hiếm hơn, thưởng hậu hơn." />;
