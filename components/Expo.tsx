'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import * as C from '@/lib/content';
import * as XP from '@/lib/expo';
import * as WK from '@/lib/work';
import type { GS } from '@/lib/client/types';
import { Icon } from './ds/Icon';
import { BeastArt, Img, ItemCard, ItemIcon, fmt } from './ui';
import { ModalClose, XSeal } from './ds/ModalClose';
import { ReactIcon } from './ReactIcon';
import { shortNum } from '@/lib/shortnum';
import { ExpoScene, heldBack, type HeldMap } from './ExpoScene';
import { dissolveValue, expoView, type Item } from '@/lib/game';
import { useFx } from './fx/FxProvider';
import { sfx } from '@/lib/audio';
import type { Act } from './Panels';

// Triển lãm: the fourth kind of job in Công việc (components/Jobs.tsx), and the only one that is a place to look at. 3 to 6 of the player's own pieces and Linh Thú stand on the clouds
// (ExpoScene draws them and the visitors); this panel is what is around the stage: the line about the state, the box of gifts, the totals of what visitors thought, and the sheet that
// opens when a stand is tapped. The rules are lib/expo.ts (what visitors think and give) and lib/game.ts (expoSet, expoClear, expoCollect, runExpo). All three of the player's moves run on the
// screen at once; nothing pops up when it worked.
const noop = () => {};
const GRADE = ['Hồi Khí Đan', 'Hồi Khí Đan hạng khá', 'Hồi Khí Đan hạng cao'];

// The five faces from the best look to the worst, with how many times each happened, as one strip of five equal cells: the faces on top, a short count under each (1,2k, 12k), so it is one
// short row on any phone however many visitors came, and it never jumps when a count grows. It is always there, the faces that never happened dimmed: that is also how the player learns what each
// face means. The full number is in the title.
function Strip({ tally, label }: { tally: readonly number[]; label: string }) {
  return (
    <div className="xTot" role="group" aria-label={label}>
      {XP.REACTIONS.map((r, i) => <span key={r} className={`xRx${tally[i] ? '' : ' zero'}`} title={`${XP.REACTION_NAME[r]}: ${fmt(tally[i])}`}><ReactIcon r={r} size={26} /><b>{shortNum(tally[i])}</b></span>)}
    </div>
  );
}
const Totals = ({ e }: { e: XP.Expo }) => <Strip tally={XP.talliesOf(e)} label="Khách đã nghĩ gì về các món bày: mê, ngạc nhiên, thích, thất vọng, chê" />;

function BoxView({ b }: { b: XP.Box }) {
  const books = Object.values(b.books).reduce((a, n) => a + n, 0);
  return (
    <div className="xBox">
      {b.stones > 0 && <span className="xChip" title="Linh Thạch"><Icon name="stone" size={16} />{fmt(b.stones)}</span>}
      {b.weapons.length > 0 && <span className="xChip" title="Pháp khí khách tặng"><Icon name="atk" size={16} />{b.weapons.length}<small>pháp khí</small></span>}
      {b.pills.map((n, g) => n > 0 && <span key={g} className="xChip" title={GRADE[g]}><img src={C.shopArt(`hp${g}`)} alt="" draggable={false} />{n}<small>đan</small></span>)}
      {books > 0 && <span className="xChip" title="Bí Công"><Icon name="book" size={16} />{books}<small>Bí Công</small></span>}
      {XP.boxCount(b) === 0 && <small className="xEmpty">Hòm quà đang trống</small>}
    </div>
  );
}

// The asking price of a piece on a stand: the base (lib/expo.ts basePrice) and what the player adds with the buttons (round sums that fit the rarity, priceSteps), up to the base again.
// The line under it says how many buyers still ask at that price, so the player sees what adding costs.
const fmtX = (k: number) => `x${(Math.round(k * 100) / 100).toLocaleString('vi-VN')}`;
function Price({ it, extra, set }: { it: Item; extra: number; set: (extra: number) => void }) {
  const base = XP.basePrice(dissolveValue(it)), max = XP.maxExtra(base), add = Math.min(extra, max), pc = XP.buyChance(base, add) / 100, chance = pc >= 10 ? Math.round(pc) : Math.round(pc * 10) / 10;
  return (
    <div className="xPrice" role="group" aria-label="Giá bán cho khách hỏi mua">
      <div className="xPriceSum">
        <span><small>Giá gốc</small><b><Icon name="stone" size={13} />{fmt(base)}</b></span>
        <i aria-hidden="true">+</i>
        <span className={add ? 'up' : ''}><small>Cộng thêm</small><b><Icon name="stone" size={13} />{fmt(add)}</b></span>
        <i aria-hidden="true">=</i>
        <span className="tot"><small>Giá bán</small><b><Icon name="stone" size={13} />{fmt(base + add)}</b></span>
      </div>
      <div className="xPriceBtns">
        {XP.priceSteps(base).map((s) => <button key={s} type="button" className="btn sm" disabled={add >= max} onClick={() => set(Math.min(max, add + s))}>+{fmt(s)}</button>)}
        <button type="button" className="btn sm ghost" disabled={!add} onClick={() => set(0)}>Về giá gốc</button>
      </div>
      <small className={`xPriceNote${chance < 60 ? ' warn' : ''}`}>{add ? `Giá gấp ${fmtX((base + add) / base)} giá gốc: còn khoảng ${chance}% số khách chịu giá này.${add >= base ? ' Từ x2 trở lên hầu như không ai mua.' : ''}` : 'Giá gốc bằng giá phân giải. Cộng thêm một ít thì bán được giá hơn, tối đa gấp 3, nhưng càng đắt càng ít khách mua.'}</small>
    </div>
  );
}

// The sheet for one stand: what stands there, what the visitors thought of it, and what could stand there instead (the bag, the stash, the pen). It sticks to the bottom of the window.
function Pick({ st, e, slot, act, onClose, onErr }: { st: GS; e: XP.Expo | null; slot: number; act: Act; onClose: () => void; onErr: (m: string) => void }) {
  const cur = e ? e.stands[slot] : null;
  const curItem = useMemo(() => { const v = cur && cur.kind === 'item' ? expoView(st)[slot] : null; return v && v.kind === 'item' ? v.item : null; }, [cur, st.bag, st.stash, slot]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<'item' | 'beast'>(cur ? cur.kind : 'item');
  const used = useMemo(() => new Set(e ? e.stands.flatMap((s, i) => (s && i !== slot ? [`${s.kind}${s.id}`] : [])) : []), [e, slot]);   // what stands on another stand
  const items = useMemo(() => [...st.bag, ...st.stash].filter((it) => !used.has(`item${it.id}`)).sort((a, b) => b.tier - a.tier || b.power - a.power).slice(0, 80), [st.bag, st.stash, used]);
  const working = useMemo(() => WK.bookedIds(st.work), [st.work]);   // out at work (Thú đi làm): locked until the pay is collected
  const beasts = useMemo(() => st.beasts.filter((b) => !used.has(`beast${b.id}`) && !working.has(b.id)).sort((a, b) => XP.beastTier(b.cls, b.mut) - XP.beastTier(a.cls, a.mut) || b.power - a.power).slice(0, 80), [st.beasts, used, working]);
  const go = (type: string, payload: object) => { onClose(); void act(type, payload).then((r) => { if (!r.ok) onErr(r.msg); }); };
  const place = (kind: 'item' | 'beast', id: number) => go('expoSet', { slot, kind, id });
  return (
    <div className="xPick" role="dialog" aria-label={`Chọn món cho bệ ${slot + 1}`}>
      <div className="xPickHead">
        <b>Bệ {slot + 1}</b>
        <small>{cur ? 'Đổi món khác hoặc gỡ xuống' : 'Chọn món bày lên'}</small>
        <button type="button" className="xClose static" aria-label="Đóng" title="Đóng" onClick={onClose}><XSeal size={34} /></button>
      </div>
      {cur && cur.tally.some((n) => n > 0) && <Strip tally={cur.tally} label={`Khách nghĩ gì về món ở bệ ${slot + 1}`} />}
      {curItem && cur && <Price it={curItem} extra={cur.extra || 0} set={(extra) => void act('expoPrice', { slot, extra }).then((r) => { if (!r.ok) onErr(r.msg); })} />}
      <div className="xPickTabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'item'} className={tab === 'item' ? 'on' : ''} onClick={() => setTab('item')}>Pháp khí ({items.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'beast'} className={tab === 'beast' ? 'on' : ''} onClick={() => setTab('beast')}>Linh Thú ({beasts.length})</button>
      </div>
      {tab === 'item'
        ? (items.length
          ? <div className="xList">{items.map((it) => (
            <div key={it.id} role="button" tabIndex={0} className={`xCand${cur && cur.kind === 'item' && cur.id === it.id ? ' cur' : ''}`} onClick={() => place('item', it.id)} onKeyDown={(k) => { if (k.key === 'Enter') place('item', it.id); }}>
              <ItemIcon it={it} size={52} />
              <small>Lv{it.level} · {it.power}</small>
              {it.locked && <i className="xLk"><Icon name="lock" size={11} /></i>}
            </div>
          ))}</div>
          : <p className="xNone">Túi và kho không còn món nào để bày.</p>)
        : (beasts.length
          ? <div className="xList">{beasts.map((b) => (
            <div key={b.id} role="button" tabIndex={0} className={`xCand${cur && cur.kind === 'beast' && cur.id === b.id ? ' cur' : ''}`} onClick={() => place('beast', b.id)} onKeyDown={(k) => { if (k.key === 'Enter') place('beast', b.id); }}>
              <BeastArt b={b} box={56} onOpen={noop} />
              <small>Lv{b.level} · {C.SIZE_CLASS[b.cls]}</small>
            </div>
          ))}</div>
          : <p className="xNone">Chuồng không còn Linh Thú nào để bày.</p>)}
      {cur && <div className="xPickBtns"><button type="button" className="btn" onClick={() => go('expoClear', { slot })}>Gỡ xuống</button></div>}
    </div>
  );
}

// A visitor asks for the piece they liked best (lib/expo.ts offers): one thin card at the top of the stage, over the empty sky, with the deal in a line and one button. It shows for 25 seconds
// and goes by itself; the close button sends the visitor away. Only the visitors that came while this panel was open can ask (the panel notes the visit number it opened on), so with the window
// closed there are no deals, and a piece that is no longer on its stand takes its deal with it.
function OfferCard({ o, it, onGone, onYes }: { o: XP.Offer; it: Item; onGone: (n: number) => void; onYes: (o: XP.Offer) => void }) {
  useEffect(() => { const t = setTimeout(() => onGone(o.n), XP.OFFER_SHOW_MS); return () => clearTimeout(t); }, [o.n, onGone]);
  const ask = o.kind === 'buy' ? 'hỏi mua' : 'muốn đổi';
  const what = o.kind === 'buy' ? <>Trả <b><Icon name="stone" size={13} />{fmt(o.price || 0)}</b></>
    : o.kind === 'swap' ? <>Đổi lấy một món <b style={{ color: C.RCOLOR[o.tier] }}>{C.RARITY[o.tier]}</b> cùng loại</>
    : <>Đổi lấy Bí Công <b>{o.book}</b></>;
  return (
    <div className="xOffer" role="alertdialog" aria-label={`${o.who.name} ${ask} ${it.name}`} style={{ '--ms': `${XP.OFFER_SHOW_MS}ms` } as CSSProperties}>
      <Img src={C.buyerArt(o.who.arch, o.who.g)} className="xOfferFace" fb={<Icon name="scroll" size={22} />} />
      <div className="xOfferTx">
        <small><b>{o.who.name}</b> · {o.who.arch} {ask}</small>
        <span className="xOfferIt"><ItemIcon it={it} size={26} /><em style={{ color: C.RCOLOR[it.tier] }}>{it.name}</em></span>
        <span className="xOfferDeal">{what}</span>
      </div>
      <button type="button" className="btn hot sm" onClick={() => onYes(o)}>{o.kind === 'buy' ? 'Bán' : 'Đồng ý'}</button>
      <button type="button" className="xClose static" aria-label="Từ chối" title="Từ chối" onClick={() => onGone(o.n)}><XSeal size={30} /></button>
      <i className="xOfferTime" aria-hidden="true" />
    </div>
  );
}

// What the player got from a deal: for a swap the new piece with its picture and every number (it is in the bag now), for a Bí Công its name, for a sale the Linh Thạch.
type Got = { kind: 'swap'; item: Item; old: string; where: string } | { kind: 'book'; name: string } | { kind: 'buy'; stones: number };
function GotModal({ g, onClose }: { g: Got; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Giao dịch xong">
      <ModalClose onClose={onClose} />
      <div className="modalBody xGot" onClick={(e) => e.stopPropagation()}>
        <h3>Giao dịch xong</h3>
        {g.kind === 'swap' && <>
          <p>Đã đổi <b>{g.old}</b> lấy món mới. Món này đã nằm trong {g.where === 'stash' ? 'kho' : 'túi'}.</p>
          <ItemCard it={g.item} />
        </>}
        {g.kind === 'book' && <p>Nhận Bí Công <b>{g.name}</b>. Xem ở mục Bí Công.</p>}
        {g.kind === 'buy' && <p className="xGotSum"><Icon name="stone" size={22} /> +{fmt(g.stones)} Linh Thạch</p>}
        <button type="button" className="btn hot" onClick={onClose}>Nhận</button>
      </div>
    </div>, document.body);
}

export function ExpoPanel({ st, act }: { st: GS; act: Act }) {
  const e = XP.isExpo(st.expo) ? st.expo : null;
  // what the visitors still flying have not given yet (ExpoScene holds it back until each reaction, coin and gift lands): the box and the totals below show the rest
  const [held, setHeld] = useState<HeldMap>({});
  const shown = useMemo(() => heldBack(e, held), [e, held]);
  const [pick, setPick] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const openedAt = useRef(e ? e.n : 0), [gone, setGone] = useState<number[]>([]);
  const offer = XP.liveOffer(e, openedAt.current, gone);
  const offerItem = useMemo(() => { const v = offer ? expoView(st)[offer.slot] : null; return v && v.kind === 'item' ? v.item : null; }, [offer, st.expo, st.bag, st.stash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [got, setGot] = useState<Got | null>(null);
  const onGone = useCallback((n: number) => setGone((g) => (g.includes(n) ? g : [...g, n])), []);
  const onYes = useCallback((o: XP.Offer) => {
    setGone((g) => [...g, o.n]);
    void act('expoDeal', { n: o.n }).then((r) => {
      if (!r.ok) { setNote(r.msg); return; }
      const d = (r.data || {}) as { kind?: string; item?: Item; old?: string; where?: string; name?: string; stones?: number };
      if (d.kind === 'swap' && d.item) setGot({ kind: 'swap', item: d.item, old: d.old || '', where: d.where || 'bag' });
      else if (d.kind === 'book' && d.name) setGot({ kind: 'book', name: d.name });
      else if (d.kind === 'buy') setGot({ kind: 'buy', stones: d.stones || 0 });
      sfx('chime');
    });
  }, [act]);
  const fx = useFx();
  const n = e ? XP.filled(e) : 0, has = !!e && XP.boxCount(e.box) > 0;
  const onStand = useCallback((slot: number) => { setNote(''); setPick((p) => (p === slot ? null : slot)); }, []);
  const closePick = useCallback(() => setPick(null), []);
  // the chest: what is in the box goes to the bag and the stocks at once; a float of the main thing over the chest
  const collect = useCallback(async () => {
    if (!has) return;
    const r = await act('expoCollect');
    if (!r.ok) { setNote(r.msg); return; }
    setHeld({});   // the whole box was taken, what was on its way too
    const d = (r.data || {}) as { stones?: number; weapons?: number; pills?: number; books?: number; left?: number };
    const parts = [d.stones ? `+${fmt(d.stones)} Linh Thạch` : '', d.weapons ? `${d.weapons} pháp khí` : '', d.pills ? `${d.pills} đan` : '', d.books ? `${d.books} Bí Công` : ''].filter(Boolean);
    const rc = document.querySelector('.xChest')?.getBoundingClientRect();
    fx.float(parts[0] || 'Đã thu', { ...(rc ? { x: rc.left + rc.width / 2, y: rc.top } : {}), color: '#f6e2a8', sub: parts.slice(1).join(' · ') || undefined });
    sfx('chime');
    setNote(d.left ? 'Còn một phần chưa nhận vì túi hoặc kho đã đầy. Dọn chỗ rồi thu tiếp.' : '');
  }, [act, fx, has]);
  return (
    <div className="xpo">
      <ExpoScene st={st} onStand={onStand} onChest={collect} held={held} hold={setHeld} />
      <div className="xBar">
        {/* a visitor's deal takes the place of the line of words under the stage, where nothing covers it; the line itself only says what is missing to open */}
        {offer && offerItem
          ? <OfferCard key={offer.n} o={offer} it={offerItem} onGone={onGone} onYes={onYes} />
          : n < XP.MIN_OPEN && <p className="xState warn">Bày thêm <b>{XP.MIN_OPEN - n}</b> món nữa thì mở cửa đón khách (cần {XP.MIN_OPEN} đến {XP.STANDS} món).</p>}
        {shown && <BoxView b={shown.box} />}
        <button type="button" className="btn hot" disabled={!has} onClick={collect}>Thu quà</button>
      </div>
      {note && <div className="hint ordWarn" role="status">{note}</div>}
      {shown && <Totals e={shown} />}
      {got && <GotModal g={got} onClose={() => setGot(null)} />}
      {pick !== null && <Pick key={pick} st={st} e={shown} slot={pick} act={act} onClose={closePick} onErr={setNote} />}
    </div>
  );
}
