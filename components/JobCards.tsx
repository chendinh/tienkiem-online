'use client';
import { useEffect, useMemo, useState } from 'react';
import * as C from '@/lib/content';
import * as J from '@/lib/jobs';
import * as O from '@/lib/orders';
import * as XP from '@/lib/expo';
import type { GS } from '@/lib/client/types';
import { releaseValue, type Beast } from '@/lib/game';
import { Icon } from './ds/Icon';
import { askConfirm } from './ds/Dialog';
import { ElIcon } from './Icons';
import { BeastArt, Img, fmt } from './ui';
import type { Act } from './Panels';
import { DoneSeal, afterPaint, useFin, type Fin } from './JobDone';
import { useCue } from './fx/Cue';

// Tìm thú, Đặt đan and Nguyên liệu: the three kinds of Công việc that ask for a NUMBER of something (the rules are in lib/jobs.ts and lib/game.ts fillJob).
// A buyer stays until all that was asked has been handed over; the player gives what there is, every unit is paid at once, and nothing is lost by stopping half way.
// Beasts are picked one by one (the weak spare ones are ready, the Party stays unless picked on purpose); pills and materials are handed over with one button (as many as there are, up to what is asked).
const times = (m: number) => String(m / 100).replace('.', ',');
const board = (st: GS, t: J.JobType): J.Job[] => J.ofType(st.jobs, t);

// ---- what the player could give right now
// The creatures that are not handed over by themselves: the Party, the framed one and the ones on a stand of Triển Lãm. Worked out once per screen update and handed to every card (sorting the whole pen once per creature was the slow way).
type Hold = ReadonlySet<number>;
const NOBODY: Hold = new Set();
const holdOf = (st: GS): Hold => {
  const keep = J.partyOf(st.beasts, st.caps.party), f = st.player.showcase;
  if (f && f.kind === 'beast') keep.add(f.id);
  if (XP.isExpo(st.expo)) for (const s of st.expo.stands) if (s && s.kind === 'beast') keep.add(s.id);
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
function AskPic({ a, size }: { a: J.Ask; size: number }) {
  const art = J.askArt(a);
  return art
    ? <Img src={art} className="jobAskImg" style={{ width: size, height: size }} fb={a.t === 'beast' && a.sp ? <ElIcon el={J.speciesEl(a.sp) || 'Kim'} size={Math.round(size * 0.6)} /> : <Icon name="stone" size={Math.round(size * 0.6)} />} />
    : <span className="jobAskImg" style={{ width: size, height: size }}>{a.t === 'beast' && a.el ? <ElIcon el={a.el} size={Math.round(size * 0.65)} /> : <Icon name="stone" size={Math.round(size * 0.5)} />}</span>;
}

// What a card tells its list about a hand-over that finishes the job: `done` starts the seal at once, `sure` brings the real figures, `undo` takes the seal away.
type Finish = { done: (stones: number, card: Element | null, rankUp?: number) => void; sure: (stones: number, rankUp?: number) => void; undo: () => void };
function JobCard({ st, act, j, hold, fin, finish, onErr }: { st: GS; act: Act; j: J.Job; hold: Hold; fin?: Fin; finish: Finish; onErr: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => { setOpen(false); setSel([]); }, [j.id]);   // the card belongs to a slot: when a new buyer takes the place, the picker starts closed
  const gone = !J.isOpen(j), left = J.left(j), a = j.ask;
  const spare = (b: Beast) => J.isSpare(b, hold);
  const cands = useMemo(() => (j.type === 'beast' ? J.beastCands(j, st.beasts, hold) : []), [j, st.beasts, hold]);
  const have = j.type === 'beast' ? cands.length : stockOf(st, a), take = j.type === 'beast' ? sel.length : Math.min(have, left);
  const unit = a.t === 'beast' ? 0 : J.unitValue(a);
  const payUnit = (b?: Beast) => J.payFor(j.mult, b ? releaseValue(b) : unit);
  const chosen = cands.filter((b) => sel.includes(b.id));
  const full = take > 0 && take >= left;
  const sumNow = j.type === 'beast' ? chosen.reduce((s, b) => s + releaseValue(b), 0) : take * unit;
  const pay = (j.type === 'beast' ? chosen.reduce((s, b) => s + payUnit(b), 0) : take * payUnit()) + (full ? J.payFor(j.bonus, j.sum + sumNow) : 0);

  const start = () => {
    onErr('');
    if (open) { setOpen(false); return; }
    setSel(cands.filter(spare).slice(0, left).map((b) => b.id));   // the spare ones are ready; the Party is never put forward by itself
    setOpen(true);
  };
  const toggle = (id: number) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < left ? [...cur, id] : cur));
  const give = async (card: Element | null) => {
    // This hand-over finishes the job: the seal starts in the same screen update as the new numbers (waiting for the answer put it one whole redraw late)
    const closing = full, rankNow = J.RANKED.includes(j.type) && J.rankOf(J.doneOf(st.jobs, j.type) + 1) > J.rankOf(J.doneOf(st.jobs, j.type)) ? J.rankOf(J.doneOf(st.jobs, j.type) + 1) : undefined;
    if (closing) finish.done(pay, card, rankNow);
    const r = await act('fillJob', j.type === 'beast' ? { id: j.id, ids: sel } : { id: j.id, n: take });
    if (!r.ok) { if (closing) finish.undo(); onErr(r.msg); return; }
    setOpen(false); onErr('');
    if (r.data && r.data.done) { if (closing) finish.sure(r.data.stones, r.data.rankUp); else finish.done(r.data.stones, card, r.data.rankUp); }
  };
  const sendAway = async () => {
    if (j.got > 0 && !(await askConfirm({ title: 'Tiễn khách', body: `${j.who.name} đã nhận ${j.got} từ ngươi. Tiễn đi thì mất phần thưởng đủ hàng và quà. Tiền phần đã giao vẫn là của ngươi.`, ok: 'Tiễn đi' }))) return;
    setOpen(false);
    const r = await act('dismissJob', { id: j.id });
    if (!r.ok) onErr(r.msg);
  };
  // a beast the player wants to hand over but that is in the Party or framed asks a second time
  const giveBeasts = async (card: Element | null) => {
    const risky = chosen.filter((b) => !spare(b));
    if (risky.length && !(await askConfirm({ title: 'Giao Linh Thú đang xuất chiến', body: `${risky.map((b) => b.name).join(', ')} đang ở trong đội xuất chiến, trong khung trưng bày hoặc trên bệ Triển Lãm. Giao đi thì không lấy lại được.`, ok: 'Vẫn giao', danger: true }))) return;
    await give(card);
  };

  return (
    <div className={`ordCard jobCard t-${j.type}${gone ? ' done' : ''}${fin ? ' sealed' : ''}`}>
      {fin && <DoneSeal f={fin} />}
      <div className="ordHead">
        <Img src={C.buyerArt(j.who.arch, j.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
        <div className="ordWho"><b>{j.who.name}</b><small>{j.who.arch}{J.RANKED.includes(j.type) ? ` · Đơn bậc ${(j.rank ?? 0) + 1}` : ''}</small></div>
        {!gone && <button type="button" className="ordX" aria-label={`Tiễn ${j.who.name}`} title="Tiễn khách" onClick={sendAway}><Icon name="close" size={14} /></button>}
      </div>
      <p className="ordLine">“{J.lineOf(j)}”</p>
      <div className="jobAsk">
        <AskPic a={a} size={52} />
        <div className="jobAskTx"><b>{J.askText(j)}</b><small>Đã giao {j.got}/{j.need}</small></div>
      </div>
      <div className="jobBar" role="progressbar" aria-valuemin={0} aria-valuemax={j.need} aria-valuenow={j.got}><i style={{ width: `${Math.min(100, Math.round((100 * j.got) / j.need))}%` }} /></div>
      <div className="ordPay">
        {a.t === 'beast'
          ? <span>Mỗi con trả <b>gấp {times(j.mult)}</b> giá bán{j.bonus > 0 && <>, đủ hàng thưởng thêm <b>gấp {times(j.bonus)}</b></>}</span>
          : <span>Mỗi {a.t === 'pill' ? 'viên' : 'cái'} trả <b>{fmt(payUnit())}</b> <Icon name="stone" size={13} />{j.bonus > 0 && <>, đủ hàng thưởng thêm <b>{Math.round(j.bonus)}%</b></>}</span>}
        {j.extra && <span className="ordExtra">{j.bonus > 0 || j.need > 1 ? 'Đủ hàng tặng' : 'Tặng'} <Img src={O.extraArt(j.extra)} className="ordExImg" fb="✦" /><b>{O.extraName(j.extra)} ×{j.extra.n}</b></span>}
      </div>
      {j.paid > 0 && <div className="ordDone"><Icon name="stone" size={13} /> Đã nhận {fmt(j.paid)} Linh Thạch từ khách này</div>}
      {gone ? <div className="ordDone"><Icon name="check" size={14} /> {j.done ? 'Khách đã đủ hàng, đang có khách mới tới' : 'Khách đã rời đi'}</div> : (
        <>
          {open && j.type === 'beast' && (
            <div className="ordPick jobBeasts" role="group" aria-label="Chọn Linh Thú để giao">
              {cands.map((b) => (
                <button key={b.id} type="button" className={`ordIt jobBeast${sel.includes(b.id) ? ' on' : ''}`} aria-pressed={sel.includes(b.id)} onClick={() => toggle(b.id)}>
                  <BeastArt b={b} box={48} />
                  <small>{spare(b) ? '' : '★ '}Lv{b.level} · {C.SIZE_CLASS[b.cls]}</small>
                  <small>+{fmt(payUnit(b))}</small>
                </button>
              ))}
            </div>
          )}
          {open && j.type === 'beast'
            ? <div className="ordBtns"><button type="button" className="btn" onClick={() => setOpen(false)}>Thôi</button><button type="button" className="btn hot" disabled={sel.length === 0} onClick={(e) => giveBeasts(e.currentTarget.closest('.ordCard'))}>Giao {sel.length} con · +{fmt(pay)} <Icon name="stone" size={14} /></button></div>
            : j.type === 'beast'
              ? <button type="button" className="btn" disabled={have === 0} onClick={start}>{have > 0 ? `Giao nộp (${have} con hợp)` : 'Chưa có con nào hợp'}</button>
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
  const hold = useMemo(() => (type === 'beast' ? holdOf(st) : NOBODY), [type, st.beasts, st.caps.party, st.player.showcase, st.expo]);
  const rankName = (r?: number) => (r === undefined ? undefined : J.RANK_NAME[r]);
  const finishOf = (slot: number, j: J.Job): Finish => ({
    done: (stones, card, rankUp) => {   // the seal now, the sound and the floating line on the next paint
      const rank = rankName(rankUp);
      mark(slot, { stones, gift: j.extra ? `${j.extra.n} ${O.extraName(j.extra)}` : undefined, rank });
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
          <JobCard key={slot} st={st} act={act} j={j} hold={hold} fin={fin[slot]} onErr={setErr} finish={finishOf(slot, j)} />
        ))}
      </div>
    </div>
  );
}
export const BeastJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="beast" hint="Khách ở lại đến khi ngươi giao đủ. Mỗi con giao được trả ngay gấp đôi giá bán, giao đủ thì thưởng thêm. Linh Thú Dị Biến không giao được, và các con dư được chọn sẵn, đội xuất chiến thì ngươi tự chọn." />;
export const PillJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="pill" hint="Khách thu đan của ngươi giá cao hơn giá thu mua của tiệm. Giao bao nhiêu có bấy nhiêu, đủ thì có thêm nguyên liệu. Làm xong càng nhiều việc, bậc càng cao: đơn lớn hơn, đan hạng cao hơn, nguyên liệu tặng hiếm hơn." />;
export const MatJobs = ({ st, act }: { st: GS; act: Act }) => <JobList st={st} act={act} type="mat" hint="Khách thu nguyên liệu gấp đôi giá tiệm trở lên. Gom đủ số khách cần thì thưởng thêm và có quà. Làm xong càng nhiều việc, bậc càng cao: đơn lớn hơn, nguyên liệu hiếm hơn, thưởng hậu hơn." />;
