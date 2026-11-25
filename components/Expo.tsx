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
import { ExpoScene, useCalm, useHeld } from './ExpoScene';
import { dissolveValue, expoView, releaseValue, type Beast, type Item, type StandView } from '@/lib/game';
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
/** What a stand's piece is worth to a buyer before anything is added: what it dissolves for, or what the pen pays for the creature. */
const worthOf = (v: StandView): number => (!v ? 0 : v.kind === 'item' ? dissolveValue(v.item) : releaseValue(v.beast));
function Price({ v, extra, set }: { v: StandView; extra: number; set: (extra: number) => void }) {
  const base = XP.basePrice(worthOf(v)), max = XP.maxExtra(base), add = Math.min(extra, max), pc = XP.buyChance(base, add) / 100, chance = pc >= 10 ? Math.round(pc) : Math.round(pc * 10) / 10;
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
      <small className={`xPriceNote${chance < 60 ? ' warn' : ''}`}>{add ? `Giá gấp ${fmtX((base + add) / base)} giá gốc: còn khoảng ${chance}% số khách chịu giá này.${add >= base ? ' Từ x2 trở lên hầu như không ai mua.' : ''}` : `Giá gốc bằng ${v && v.kind === 'beast' ? 'giá bán ở chuồng' : 'giá phân giải'}. Cộng thêm một ít thì bán được giá hơn, tối đa gấp 3, nhưng càng đắt càng ít khách mua.`}</small>
    </div>
  );
}

// The sheet for one stand: what stands there, what the visitors thought of it, and what could stand there instead (the bag, the stash, the pen). It sticks to the bottom of the window.
function Pick({ st, e, slot, act, onClose, onErr }: { st: GS; e: XP.Expo | null; slot: number; act: Act; onClose: () => void; onErr: (m: string) => void }) {
  const cur = e ? e.stands[slot] : null;
  const curView = useMemo(() => (cur ? expoView(st)[slot] : null), [cur, st.bag, st.stash, st.beasts, slot]);   // eslint-disable-line react-hooks/exhaustive-deps
  const priced = curView && !(curView.kind === 'beast' && curView.beast.mut) ? curView : null;   // a Dị Biến is never sold: no price
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
      {priced && cur && <Price v={priced} extra={cur.extra || 0} set={(extra) => void act('expoPrice', { slot, extra }).then((r) => { if (!r.ok) onErr(r.msg); })} />}
      {curView && curView.kind === 'beast' && curView.beast.mut && <p className="xMutNote">✦ Dị Biến không bán. Khách mê nó chỉ có thể đổi lấy một món <b>Thiên</b> ngang cấp ngươi, chỉ số cao hơn món Thiên thường.</p>}
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

// A visitor asks for the piece they liked best (lib/expo.ts offers): a card in the bar under the stage. The top line says who asks (face, name, school); under it the trade itself,
// always as two sides with an arrow: what the player gives (the piece on its stand, with how it stands against what is worn in that slot) and what comes back (the Linh Thạch and how the
// price stands against the base, the Bí Công, or a "?" for a random piece or creature, which is only known once the deal is done). It shows for 25 seconds and goes by itself; the seal
// sends the visitor away. Only the visitors that came while this panel was open can ask, and only once their flight has shown what they thought.
const pct = (price: number, base: number) => Math.round(((price - base) / Math.max(1, base)) * 100);
type Eq = Record<string, Item | null>;
/** How a piece stands against what is worn in its slot, in one short line. */
function VsWorn({ it, eq }: { it: Item; eq: Eq }) {
  const w = eq[it.slot];
  if (!w) return <small className="xVs up">Ô {C.SLOT_VI[it.slot] ?? it.slot} đang trống</small>;
  const d = it.power - w.power;
  return <small className={`xVs ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`} title={`Đang mặc: ${w.name} (lực ${fmt(w.power)})`}>{d > 0 ? `▲ Mạnh hơn đồ đang mặc +${fmt(d)}` : d < 0 ? `▼ Yếu hơn đồ đang mặc ${fmt(d)}` : 'Ngang đồ đang mặc'}</small>;
}
function Give({ v, eq }: { v: StandView; eq: Eq }) {
  if (!v) return null;
  if (v.kind === 'item') return (
    <div className="xSide" title={v.item.name}>
      <ItemIcon it={v.item} size={46} />
      <div className="xSideTx"><b style={{ color: C.RCOLOR[v.item.tier] }}>{C.RARITY[v.item.tier]} · lực {fmt(v.item.power)}</b><VsWorn it={v.item} eq={eq} /></div>
    </div>
  );
  const b = v.beast;
  return (
    <div className="xSide" title={b.name}>
      <BeastArt b={b} box={46} onOpen={noop} />
      <div className="xSideTx"><b>{b.mut ? '✦ Dị Biến · ' : ''}{C.SIZE_CLASS[b.cls]} · Lv{b.level}</b><small>Lực chiến {fmt(b.power)}</small></div>
    </div>
  );
}
function Get({ o, v }: { o: XP.Offer; v: StandView }) {
  const baseName = o.beast ? 'giá bán ở chuồng' : 'giá phân giải';
  if (o.kind === 'buy') {
    const d = o.base ? pct(o.price || 0, o.base) : 0;
    return (
      <div className="xSide get">
        <span className="xSidePic stone"><Icon name="stone" size={28} /></span>
        <div className="xSideTx"><b className="gold">{fmt(o.price || 0)} Linh Thạch</b><small className={`xVs ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? `▲ Cao hơn ${baseName} ${d}%` : d < 0 ? `▼ Thấp hơn ${baseName} ${-d}%` : `Bằng ${baseName}`}</small><small>Vào hòm quà, bấm Thu quà để nhận</small></div>
      </div>
    );
  }
  if (o.kind === 'book') return (
    <div className="xSide get">
      <span className="xSidePic book"><Icon name="book" size={26} /></span>
      <div className="xSideTx"><b>{o.book}</b><small>Bí Công hạng {o.tier >= 4 ? 'Thiên' : 'Địa'}, vào kho Bí Công</small></div>
    </div>
  );
  // a random piece or creature: only known once the deal is done
  const what = o.kind === 'gear' ? <>Món <b style={{ color: C.RCOLOR[4] }}>{C.RARITY[4]}</b> ngẫu nhiên</>
    : o.beast ? <>Linh Thú ngẫu nhiên</>
    : <>Món <b style={{ color: C.RCOLOR[o.tier] }}>{C.RARITY[o.tier]}</b> ngẫu nhiên</>;
  const note = o.kind === 'gear' ? 'Ngang cấp ngươi, chỉ số cao hơn món Thiên thường'
    : o.beast ? `Cùng cỡ ${v && v.kind === 'beast' ? C.SIZE_CLASS[v.beast.cls] : ''}, lực chiến chắc chắn cao hơn`
    : `Cùng loại ${v && v.kind === 'item' ? (C.SLOT_VI[v.item.slot] ?? v.item.slot).toLowerCase() : ''}, đổi xong mới biết chỉ số`;
  return (
    <div className="xSide get">
      <span className="xSidePic ask" style={{ '--rc': C.RCOLOR[o.kind === 'gear' ? 4 : o.tier] } as CSSProperties}>?</span>
      <div className="xSideTx"><b>{what}</b><small>{note}</small></div>
    </div>
  );
}
function OfferCard({ o, v, eq, onGone, onYes }: { o: XP.Offer; v: StandView; eq: Eq; onGone: (n: number) => void; onYes: (o: XP.Offer) => void }) {
  useEffect(() => { const t = setTimeout(() => onGone(o.n), XP.OFFER_SHOW_MS); return () => clearTimeout(t); }, [o.n, onGone]);
  const ask = o.kind === 'buy' ? 'muốn mua' : 'muốn đổi', thing = o.beast ? 'Linh Thú' : 'món';
  return (
    <div className="xOffer" role="alertdialog" aria-label={`${o.who.name} ${ask} ${thing} của ngươi`} style={{ '--ms': `${XP.OFFER_SHOW_MS}ms` } as CSSProperties}>
      <div className="xOfferHead">
        <Img src={C.buyerArt(o.who.arch, o.who.g)} className="xOfferFace" fb={<Icon name="scroll" size={18} />} />
        <p className="xOfferWho"><b>{o.who.name}</b> · {o.who.arch} · {ask} {thing} ngươi đang bày</p>
        <button type="button" className="xClose static" aria-label="Từ chối" title="Từ chối" onClick={() => onGone(o.n)}><XSeal size={28} /></button>
      </div>
      <div className="xTrade">
        <div className="xTradeCol"><small className="xTradeLbl">Ngươi đưa</small><Give v={v} eq={eq} /></div>
        <span className="xTradeArrow" aria-hidden="true">⇄</span>
        <div className="xTradeCol"><small className="xTradeLbl">Ngươi nhận</small><Get o={o} v={v} /></div>
      </div>
      <div className="xOfferBtns">
        <button type="button" className="btn hot" onClick={() => onYes(o)}>{o.kind === 'buy' ? `Bán lấy ${fmt(o.price || 0)} Linh Thạch` : 'Đồng ý đổi'}</button>
        <button type="button" className="btn ghost" onClick={() => onGone(o.n)}>Từ chối</button>
      </div>
      <i className="xOfferTime" aria-hidden="true" />
    </div>
  );
}

// What the player got from a swap: the new piece or creature with its picture and every number (it is in the bag, the stash or the pen now), or the Bí Công.
// A sale shows nothing: the Linh Thạch are in the chest, collected with the gifts.
type Got = { kind: 'item'; item: Item; old: string; where: string } | { kind: 'beast'; beast: Beast; old: string } | { kind: 'book'; name: string };
function GotModal({ g, eq, onClose }: { g: Got; eq: Eq; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Giao dịch xong">
      <ModalClose onClose={onClose} />
      <div className="modalBody xGot" onClick={(e) => e.stopPropagation()}>
        <h3>Giao dịch xong</h3>
        {g.kind === 'item' && <>
          <p>Đã đổi <b>{g.old}</b> lấy món mới. Món này đã nằm trong {g.where === 'stash' ? 'kho' : 'túi'}.</p>
          <ItemCard it={g.item} />
          <VsWorn it={g.item} eq={eq} />
        </>}
        {g.kind === 'beast' && <>
          <p>Đã đổi <b>{g.old}</b> lấy Linh Thú mới. Con này đã vào chuồng.</p>
          <div className="xGotBeast">
            <BeastArt b={g.beast} box={120} />
            <div>
              <b>{g.beast.name}</b>
              <small>Lv{g.beast.level} · {C.SIZE_CLASS[g.beast.cls]} · {g.beast.cm} cm</small>
              <span className="xGotPw"><Icon name="atk" size={14} /> Lực chiến {fmt(g.beast.power)}</span>
              <ul><li>Sinh Lực {g.beast.stats[0]}</li><li>Công Kích {g.beast.stats[2]}</li><li>Phòng Ngự {g.beast.stats[3]}</li><li>Thân Pháp {g.beast.stats[4]}</li></ul>
              <small>Thần thông: {g.beast.skills.join(', ')}</small>
            </div>
          </div>
        </>}
        {g.kind === 'book' && <p>Nhận Bí Công <b>{g.name}</b>. Xem ở mục Bí Công.</p>}
        <button type="button" className="btn hot" onClick={onClose}>Nhận</button>
      </div>
    </div>, document.body);
}

export function ExpoPanel({ st, act }: { st: GS; act: Act }) {
  const e = XP.isExpo(st.expo) ? st.expo : null;
  // what the visitors still to fly have not given yet is held back (ExpoScene lets each part go as its reaction, coin or gift lands): the box and the totals show the rest
  const calm = useCalm(), h = useHeld(e, calm), shown = h.shown;
  const [pick, setPick] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const openedAt = useRef(e ? e.n : 0), [gone, setGone] = useState<number[]>([]);
  // an offer waits until its visitor has flown by and shown what it thought
  const flying = useMemo(() => new Set(Object.keys(h.held).map((k) => Number(k.split('|')[0]))), [h.held]);
  const offer = XP.liveOffer(e, openedAt.current, [...gone, ...flying]);
  const offerView = useMemo(() => { const v = offer ? expoView(st)[offer.slot] : null; return v && (v.kind === 'item' ? v.item.id : v.beast.id) === offer!.id ? v : null; }, [offer, st.expo, st.bag, st.stash, st.beasts]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [got, setGot] = useState<Got | null>(null);
  const onGone = useCallback((n: number) => setGone((g) => (g.includes(n) ? g : [...g, n])), []);
  // a deal waits for the server (lib/intents.ts SERVER_FIRST), so what the popup shows is what the save got; meanwhile the bar says it is on its way
  const [dealing, setDealing] = useState<string | null>(null);
  const onYes = useCallback((o: XP.Offer) => {
    setGone((g) => [...g, o.n]); setDealing(o.who.name); setNote('');
    void act('expoDeal', { n: o.n }).then((r) => {
      setDealing(null);
      if (!r.ok) { setNote(r.msg); return; }
      const d = (r.data || {}) as { kind?: string; item?: Item; beast?: Beast; old?: string; where?: string; name?: string };
      if ((d.kind === 'swap' || d.kind === 'gear') && d.item) setGot({ kind: 'item', item: d.item, old: d.old || '', where: d.where || 'bag' });
      else if (d.kind === 'beast' && d.beast) setGot({ kind: 'beast', beast: d.beast, old: d.old || '' });
      else if (d.kind === 'book' && d.name) setGot({ kind: 'book', name: d.name });
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
    h.release(Object.keys(h.held).filter((k) => /\|[cg]/.test(k)));   // the whole box was taken, the Linh Thạch and gifts still on their way too
    const d = (r.data || {}) as { stones?: number; weapons?: number; pills?: number; books?: number; left?: number };
    const parts = [d.stones ? `+${fmt(d.stones)} Linh Thạch` : '', d.weapons ? `${d.weapons} pháp khí` : '', d.pills ? `${d.pills} đan` : '', d.books ? `${d.books} Bí Công` : ''].filter(Boolean);
    const rc = document.querySelector('.xChest')?.getBoundingClientRect();
    fx.float(parts[0] || 'Đã thu', { ...(rc ? { x: rc.left + rc.width / 2, y: rc.top } : {}), color: '#f6e2a8', sub: parts.slice(1).join(' · ') || undefined });
    sfx('chime');
    setNote(d.left ? 'Còn một phần chưa nhận vì túi hoặc kho đã đầy. Dọn chỗ rồi thu tiếp.' : '');
  }, [act, fx, has, h]);
  return (
    <div className="xpo">
      <ExpoScene st={st} onStand={onStand} onChest={collect} h={h} calm={calm} />
      <div className="xBar">
        {/* a visitor's deal takes the place of the line of words under the stage, where nothing covers it; the line itself only says what is missing to open */}
        {dealing
          ? <p className="xState">Đang giao dịch với <b>{dealing}</b>…</p>
          : offer && offerView
          ? <OfferCard key={offer.n} o={offer} v={offerView} eq={st.eq} onGone={onGone} onYes={onYes} />
          : n < XP.MIN_OPEN
            ? <p className="xState warn">Bày thêm <b>{XP.MIN_OPEN - n}</b> món nữa thì mở cửa đón khách (cần {XP.MIN_OPEN} đến {XP.STANDS} món).</p>
            : <p className="xState">Treo máy ở màn Triển Lãm này thì khách mới hỏi mua, hỏi đổi món ngươi bày. Đóng màn này thì khách chỉ xem và tặng quà.</p>}
        {shown && <BoxView b={shown.box} />}
        <button type="button" className="btn hot" disabled={!has} onClick={collect}>Thu quà</button>
      </div>
      {note && <div className="hint ordWarn" role="status">{note}</div>}
      {shown && <Totals e={shown} />}
      {got && <GotModal g={got} eq={st.eq} onClose={() => setGot(null)} />}
      {pick !== null && <Pick key={pick} st={st} e={shown} slot={pick} act={act} onClose={closePick} onErr={setNote} />}
    </div>
  );
}
