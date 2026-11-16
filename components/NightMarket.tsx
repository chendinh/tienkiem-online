'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import { levelOf, type Item } from '@/lib/game';
import { holdings, isStack, stackInfo, MAX_QTY, type Stack } from '@/lib/goods';
import { marketGet } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { ModalClose } from './ds/ModalClose';
import { Icon } from './ds/Icon';
import { Seg } from './ds/Seg';
import { askConfirm, Toast } from './ds/Dialog';
import { Img, ItemCard, ItemIcon, fmt, useZoom } from './ui';
import type { Act } from './Panels';

// Chợ Đêm. The idea, in three steps, repeated on every screen so nobody has to guess:
//   1. Bày: put one of your things on a stall and say what you would like in return.
//   2. Đề nghị: another player sends one of THEIR things for it. It is held until you answer.
//   3. Chốt: you accept the offer you like (the two things change hands) or decline.
interface Who { name: string; dao: string; realm: number; sub: number; level: number; g: 'f' | 'm'; av?: string }
interface Want { tier: number; slot: string }
type Goods = Item | Stack;
interface Listing { id: number; item: Goods; want: Want; seller: Who; mine: boolean; expires: number; offers: number; my: { id: number; item: Goods } | null }
interface MyStall { id: number; item: Goods; want: Want; expires: number; offers: { id: number; item: Goods; from: Who; at: number }[] }
interface Sent { id: number; item: Goods; target: Goods; seller: Who }
interface Mail { id: number; item: Goods; kind: 'swap' | 'return'; note: { by?: string; took?: string; why?: string; listing?: string } }
type Tab = 'browse' | 'mine';
type Sel = { id: number } | { key: string; qty: number } | null;

// ---- what a piece of goods looks like, whether it is gear or a counted stack
const view = (g: Goods) => {
  if (isStack(g)) { const i = stackInfo(g.key); return { name: i?.name || 'Vật phẩm', tier: i?.tier || 0, sub: `${i?.sub || ''} · ×${g.qty}`, qty: g.qty, art: i?.art, item: null as Item | null }; }
  return { name: g.name, tier: g.tier, sub: `${C.RARITY[g.tier]} · Lv${g.level} · ${C.SLOT_VI[g.slot]}`, qty: 0, art: undefined, item: g };
};
function GoodsIcon({ g, size = 52 }: { g: Goods; size?: number }) {
  const zoom = useZoom(), v = view(g);
  if (v.item) return <ItemIcon it={v.item} size={size} zoom />;
  return (
    <button type="button" className="nmStackIcon" style={{ width: size, height: size, '--rc': C.RCOLOR[v.tier] } as CSSProperties} title="Bấm để xem ảnh lớn"
      onClick={(e) => { e.stopPropagation(); zoom({ kind: 'prop', src: v.art!, name: v.name, text: v.sub }); }}>
      <Img src={v.art} className="fill" fb={<Icon name="book" size={22} />} /><i>×{v.qty}</i>
    </button>
  );
}
const wantText = (w: Want) => (w.tier === 0 && !w.slot ? 'bất cứ món nào ưng ý' : `${w.tier > 0 ? `từ ${C.RARITY[w.tier]} phẩm` : 'mọi phẩm'}${w.slot ? `, loại ${C.SLOT_VI[w.slot]}` : ''}`);
const left = (expires: number, now: number) => { const h = Math.max(0, Math.floor((expires - now) / 3600000)); return h >= 24 ? `còn ${Math.floor(h / 24)} ngày` : h >= 1 ? `còn ${h} giờ` : 'sắp đóng'; };
const mailText = (m: Mail) => {
  if (m.kind === 'swap') return `${m.note.by || 'Một tu sĩ'} đã nhận đề nghị của ngươi: đây là món ngươi đổi được (ngươi đưa ${m.note.took || 'món đã gửi'}).`;
  switch (m.note.why) {
    case 'declined': return `${m.note.by || 'Chủ quầy'} từ chối đề nghị${m.note.listing ? ` đổi ${m.note.listing}` : ''}. Món của ngươi được trả về.`;
    case 'other': return `${m.note.by || 'Chủ quầy'} đã đổi với người khác. Đề nghị của ngươi được trả về.`;
    case 'closed': return 'Chủ quầy đã dọn quầy. Đề nghị của ngươi được trả về.';
    case 'expired': return 'Quầy hết hạn nên món được trả về.';
    case 'withdrawn': return 'Ngươi đã rút đề nghị này.';
    case 'accepted': return 'Món ngươi nhận được khi chấp nhận đề nghị.';
    default: return 'Món được trả về.';
  }
};
const powerOf = (g: Goods) => (isStack(g) ? null : g.power);
const Delta = ({ a, b }: { a: Goods; b: Goods | null | undefined }) => {
  const pa = powerOf(a), pb = b ? powerOf(b) : null;
  if (pa === null || pb === null || pb === undefined) return null;
  const d = pa - pb;
  return <span className={d > 0 ? 'up' : d < 0 ? 'down' : ''}><Icon name="atk" size={12} /> {d > 0 ? '+' : ''}{fmt(d)}</span>;
};
const WhoLine = ({ w }: { w: Who }) => <>{w.name} · {C.REALMS[w.realm]} · {C.SUBS[w.sub]} (Lv{w.level})</>;

// The three steps, with the one the player is on lit up.
function Steps({ at, labels }: { at: number; labels: [string, string, string] }) {
  return (
    <ol className="nmSteps" aria-label="Các bước">
      {labels.map((l, i) => <li key={l} className={i + 1 === at ? 'on' : i + 1 < at ? 'done' : ''}><b>{i + 1}</b><span>{l}</span></li>)}
    </ol>
  );
}

// ---- the player's own things, in tabs with names under the pictures
type Cat = 'gear' | 'book' | 'mat' | 'pill';
const CATS: { v: Cat; label: string; hint: string }[] = [
  { v: 'gear', label: 'Trang bị', hint: 'Pháp khí và đồ mặc trong túi và kho tạm (không gồm món đang mặc hay đang khóa)' },
  { v: 'book', label: 'Bí kíp', hint: 'Bí kíp và kinh Công Pháp chưa học' },
  { v: 'mat', label: 'Nguyên liệu', hint: 'Nguyên liệu nhặt được khi lịch luyện' },
  { v: 'pill', label: 'Đan & Khế', hint: 'Đan dược, Khế Ước Phù, Phá Cảnh Đan, Độ Kiếp Phù' },
];
function PickBox({ st, value, onChange, title }: { st: GS; value: Sel; onChange: (s: Sel) => void; title: string }) {
  const [cat, setCat] = useState<Cat>('gear');
  const gear = [...st.bag, ...st.stash].sort((a, b) => b.tier - a.tier || b.power - a.power);
  const stacks = holdings(st as any);
  const byCat = (c: Cat) => (c === 'gear' ? gear.length : stacks.filter((s) => s.info.cat === c).length);
  const list = stacks.filter((s) => s.info.cat === cat);
  const cur = value && 'key' in value ? stacks.find((s) => s.key === value.key) : null;
  return (
    <div className="nmPickBox">
      <div className="nmPickHead"><b>{title}</b><small>{CATS.find((c) => c.v === cat)!.hint}</small></div>
      <div className="nmCats" role="tablist" aria-label="Loại đồ">
        {CATS.map((c) => <button key={c.v} type="button" role="tab" aria-selected={cat === c.v} className={`nmCat ${cat === c.v ? 'on' : ''}`} onClick={() => setCat(c.v)}>{c.label}<em>{byCat(c.v)}</em></button>)}
      </div>
      <div className="nmPick" role="listbox" aria-label={title}>
        {cat === 'gear' && gear.map((it) => (
          <button key={it.id} type="button" role="option" aria-selected={!!value && 'id' in value && value.id === it.id} disabled={!!it.locked} className={`nmTile ${value && 'id' in value && value.id === it.id ? 'sel' : ''}`} style={{ '--rc': C.RCOLOR[it.tier] } as CSSProperties}
            title={it.locked ? 'Đang khóa: mở khóa trong túi mới đưa được' : `${it.name}\n${C.RARITY[it.tier]} · Lv${it.level} · ⚔ ${it.power}`} onClick={() => onChange({ id: it.id })}>
            <span className="nmTilePic"><ItemIcon it={it} size="fit" />{it.locked && <em className="lockB"><Icon name="lock" size={11} /></em>}</span>
            <span className="nmTileName">{it.name}</span><small>{C.RARITY[it.tier]} · Lv{it.level}</small>
          </button>
        ))}
        {cat !== 'gear' && list.map((s) => (
          <button key={s.key} type="button" role="option" aria-selected={!!cur && cur.key === s.key} className={`nmTile ${cur && cur.key === s.key ? 'sel' : ''}`} style={{ '--rc': C.RCOLOR[s.info.tier] } as CSSProperties} onClick={() => onChange({ key: s.key, qty: 1 })}>
            <span className="nmTilePic"><Img src={s.info.art} className="fill" fb={<Icon name="book" size={24} />} /><i className="nmQty">×{s.qty}</i></span>
            <span className="nmTileName">{s.info.name}</span><small>{s.info.sub}</small>
          </button>
        ))}
        {((cat === 'gear' && gear.length === 0) || (cat !== 'gear' && list.length === 0)) && <div className="empty nmPickEmpty">{cat === 'gear' ? 'Túi và kho tạm đang trống.' : 'Ngươi chưa có món nào thuộc loại này.'}</div>}
      </div>
      {cur && value && 'key' in value && (
        <div className="nmQtyRow">
          <span>Số lượng đưa ra</span>
          <button type="button" className="btn sm" disabled={value.qty <= 1} onClick={() => onChange({ key: value.key, qty: value.qty - 1 })}>−</button>
          <input className="inp" type="number" min={1} max={Math.min(cur.qty, MAX_QTY)} value={value.qty} aria-label="Số lượng" onChange={(e) => onChange({ key: value.key, qty: Math.max(1, Math.min(cur.qty, MAX_QTY, Math.floor(Number(e.target.value)) || 1)) })} />
          <button type="button" className="btn sm" disabled={value.qty >= Math.min(cur.qty, MAX_QTY)} onClick={() => onChange({ key: value.key, qty: value.qty + 1 })}>+</button>
          {[1, 5, 10].filter((n) => n < Math.min(cur.qty, MAX_QTY)).map((n) => <button key={n} type="button" className="chip qk" onClick={() => onChange({ key: value.key, qty: n })}>{n}</button>)}
          <button type="button" className="chip qk" onClick={() => onChange({ key: value.key, qty: Math.min(cur.qty, MAX_QTY) })}>Tối đa ({Math.min(cur.qty, MAX_QTY)})</button>
        </div>
      )}
    </div>
  );
}
const selGoods = (st: GS, s: Sel): Goods | null => {
  if (!s) return null;
  if ('id' in s) return [...st.bag, ...st.stash].find((x) => x.id === s.id) || null;
  return { stack: true, key: s.key, qty: s.qty };
};

export function NightMarketModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('browse');
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [mine, setMine] = useState<{ open: MyStall[]; sent: Sent[]; inbox: Mail[]; max: number; maxOffers: number } | null>(null);
  const [count, setCount] = useState({ inbox: 0, offersIn: 0 });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [give, setGive] = useState<Sel>(null);
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const [offerItem, setOfferItem] = useState<Sel>(null);
  const [wTier, setWTier] = useState(0), [wSlot, setWSlot] = useState('');

  const sel = rows?.find((r) => r.id === selId) || null;   // looked up again after every refresh, so a stall that closed simply disappears
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) setRev((n) => n + 1); }, 20000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let alive = true;
    marketGet(tab === 'mine' ? 'view=mine' : '').then((j) => {
      if (!alive) return;
      if (!j.ok) { setErr(errText(j.code)); return; }
      setErr('');
      if (tab === 'mine') { setMine(j); setCount({ inbox: j.inbox.length, offersIn: j.open.reduce((a: number, s: MyStall) => a + s.offers.length, 0) }); }
      else { setRows(j.rows); setCount({ inbox: j.inbox, offersIn: j.offersIn }); }
    }).catch(() => alive && setErr(errText('E_SERVER')));
    return () => { alive = false; };
  }, [tab, rev]);

  const run = async (type: string, payload: any, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await act(type, payload);
      setMsg({ t: r.ok ? r.msg : errText(r.code || 'E_SERVER'), ok: r.ok });
      if (r.ok) after?.();
      setRev((n) => n + 1);   // the stall may have changed under us whatever the answer was
    } finally { setBusy(false); }
  };

  const doOffer = async () => {
    const g = selGoods(st, give);
    if (!sel || !give || !g) return;
    const a = view(g), b = view(sel.item);
    if (!(await askConfirm({ title: 'Gửi đề nghị', body: `Đề nghị ${isStack(g) ? `${g.qty} ${a.name}` : a.name} để đổi lấy ${isStack(sel.item) ? `${sel.item.qty} ${b.name}` : b.name}? Món của ngươi được giữ lại cho tới khi chủ quầy trả lời. Trước đó ngươi rút về được bất cứ lúc nào.`, ok: 'Gửi đề nghị' }))) return;
    await run('market_offer', { listing: sel.id, ...('id' in give ? { give: give.id } : { giveKey: give.key, giveQty: give.qty }) }, () => setGive(null));
  };
  const doAccept = async (s: MyStall, o: MyStall['offers'][number]) => {
    const a = view(s.item), b = view(o.item);
    if (!(await askConfirm({ title: 'Chấp nhận đề nghị', body: `Đưa ${a.name} cho ${o.from.name} để lấy ${isStack(o.item) ? `${o.item.qty} ${b.name}` : b.name}? Các đề nghị khác trên quầy này sẽ được trả về cho người gửi. Không đổi lại được.`, ok: 'Chấp nhận' }))) return;
    await run('market_accept', { offer: o.id });
  };
  const doList = async () => {
    const g = selGoods(st, offerItem);
    if (!offerItem || !g) return;
    const v = view(g);
    if (!(await askConfirm({ title: 'Bày lên quầy', body: `Bày ${isStack(g) ? `${g.qty} ${v.name}` : v.name} lên Chợ Đêm? Món này rời khỏi túi cho tới khi ngươi nhận một đề nghị hoặc rút về. Quầy mở 3 ngày.`, ok: 'Bày' }))) return;
    await run('market_list', { ...('id' in offerItem ? { id: offerItem.id } : { key: offerItem.key, qty: offerItem.qty }), want: { tier: wTier, slot: wSlot } }, () => setOfferItem(null));
  };

  const card = (l: Listing) => {
    const v = view(l.item), rc = C.RCOLOR[v.tier];
    return (
      <button key={l.id} type="button" className={`nmCard ${selId === l.id ? 'sel' : ''}`} style={{ '--rc': rc } as CSSProperties} onClick={() => { setSelId(l.id); setGive(null); }} aria-label={`${v.name}, ${v.sub}`}>
        {l.my && <span className="nmTag mine">Ngươi đã gửi đề nghị</span>}
        {!l.my && l.mine && <span className="nmTag">Quầy của ngươi</span>}
        <span className="nmPic"><GoodsIcon g={l.item} size={72} /></span>
        <b className="nmName" style={{ color: rc }}>{v.name}</b>
        <small>{v.sub}</small>
        <span className="nmWant"><Icon name="scroll" size={12} /> Muốn đổi lấy: {wantText(l.want)}</span>
        <small className="nmBy">{l.mine ? 'Quầy của ngươi' : l.seller.name} · {l.offers} đề nghị · {left(l.expires, st.now)}</small>
      </button>
    );
  };
  const badge = count.inbox + count.offersIn;
  const selV = sel ? view(sel.item) : null;
  const cur = sel && !isStack(sel.item) ? st.eq[sel.item.slot] : null;
  const step = !sel ? 1 : sel.my ? 3 : give ? 3 : 2;

  return (
    <div className="modal nmModal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Chợ Đêm">
      <ModalClose onClose={onClose} />
      <div className={`modalBody nmShell ${sel && tab === 'browse' ? 'viewing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="nmBanner" style={{ backgroundImage: `linear-gradient(90deg, rgb(8 6 20 / 0.92), rgb(8 6 20 / 0.4)), url(${C.NIGHT_ART})` }}>
          <div className="nmTitle"><h2>Chợ Đêm</h2><small>Nơi tu sĩ đổi đồ cho nhau. Không bán, không mua: ngươi đưa một món, người kia đưa một món.</small></div>
          <Seg<Tab> label="Mục" value={tab} onChange={(t) => { setTab(t); setSelId(null); }} options={[
            { v: 'browse' as const, label: <><Icon name="chest" size={15} /><span>Xem quầy</span></>, title: 'Xem đồ người khác bày và gửi đề nghị' },
            { v: 'mine' as const, label: <><Icon name="scroll" size={15} /><span>Của ta{badge > 0 ? ` (${badge})` : ''}</span></>, title: 'Quầy của ngươi, đề nghị nhận được, hòm thư' },
          ]} />
        </header>
        <Toast msg={msg} />
        {err && <div className="eqMsg err" role="alert">{err}</div>}

        {tab === 'browse' && (
          <div className="nmBody">
            <section className="nmList" aria-label="Quầy hàng">
              <Steps at={step} labels={['Chọn một quầy', 'Chọn món của ngươi để đổi', 'Chờ chủ quầy trả lời']} />
              {!rows && !err && <div className="empty" aria-busy="true">Đang đi dạo chợ…</div>}
              {rows && rows.length === 0 && <div className="nmEmpty"><Img src={C.NIGHT_EMPTY_ART} className="nmEmptyImg" fb={<Icon name="chest" size={40} />} /><p>Chưa có quầy nào. Hãy là người đầu tiên: sang mục “Của ta” để bày một món.</p></div>}
              {rows && rows.length > 0 && <div className="nmGrid">{rows.map(card)}</div>}
            </section>
            <aside className="nmDetail" aria-label="Chi tiết">
              {!sel && <div className="nmHint"><Icon name="scroll" size={34} /><p>Bấm vào một quầy bên trái để xem món đó. Thấy ưng thì chọn một món trong túi của ngươi gửi làm đề nghị.</p></div>}
              {sel && selV && (
                <div className="nmDetailIn">
                  <button type="button" className="btn sm ghost nmBack" onClick={() => setSelId(null)}><Icon name="back" size={15} /> Về danh sách quầy</button>
                  <h4 className="nmSec">Món được bày</h4>
                  {isStack(sel.item)
                    ? <div className="nmStackCard"><GoodsIcon g={sel.item} size={72} /><div><b style={{ color: C.RCOLOR[selV.tier] }}>{selV.name}</b><small>{selV.sub}</small></div></div>
                    : <ItemCard it={sel.item} />}
                  {!isStack(sel.item) && (
                    <div className="cmp">
                      {cur ? <>So với <b>{cur.name}</b> ngươi đang mặc: <Delta a={sel.item} b={cur} /></> : <>Ô {C.SLOT_VI[sel.item.slot]} của ngươi đang trống.</>}
                      {sel.item.level > levelOf(st.player) && <div className="down">Cần Lv{sel.item.level} mới mặc được.</div>}
                    </div>
                  )}
                  <div className="nmSeller"><span>Chủ quầy</span><b>{sel.mine ? 'Là ngươi' : sel.seller.name}</b>{!sel.mine && <small>{sel.seller.dao ? `${sel.seller.dao} · ` : ''}<WhoLine w={sel.seller} /></small>}</div>
                  <div className="hint"><b>Chủ quầy muốn đổi lấy:</b> {wantText(sel.want)}. Chỉ là gợi ý, chủ quầy tự chọn đề nghị ưng ý nhất. Quầy đang có {sel.offers} đề nghị, {left(sel.expires, st.now)}.</div>
                  {sel.mine && <div className="hint">Đây là quầy của ngươi. Xem đề nghị và trả lời ở mục “Của ta”.</div>}
                  {!sel.mine && sel.my && (
                    <>
                      <h4 className="nmSec">Đề nghị của ngươi (đang chờ chủ quầy)</h4>
                      <div className="nmMailRow"><GoodsIcon g={sel.my.item} size={52} /><span><b>{view(sel.my.item).name}</b><small>{view(sel.my.item).sub} · <Delta a={sel.my.item} b={sel.item} /></small></span></div>
                      <div className="eqAct"><button type="button" className="btn" disabled={busy} onClick={() => run('market_withdraw', { offer: sel.my!.id })}>Rút đề nghị về túi</button></div>
                    </>
                  )}
                  {!sel.mine && !sel.my && (
                    <>
                      <h4 className="nmSec">Đề nghị của ngươi</h4>
                      <PickBox st={st} value={give} onChange={setGive} title="Chọn món trong túi của ngươi để đưa" />
                      {(() => { const g = selGoods(st, give); if (!g) return <div className="hint">Chưa chọn món nào.</div>; const v = view(g); return <div className="nmChosen"><GoodsIcon g={g} size={44} /><span><b>{isStack(g) ? `${g.qty} ${v.name}` : v.name}</b><small>{v.sub}</small></span><span className="nmArrow">⇄</span><GoodsIcon g={sel.item} size={44} /></div>; })()}
                      <div className="eqAct"><button type="button" className="btn hot" disabled={busy || !give} onClick={doOffer}>Gửi đề nghị này</button></div>
                    </>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === 'mine' && (
          <div className="nmMine">
            <section className="nmBox wide">
              <Steps at={mine && mine.open.some((s) => s.offers.length) ? 3 : mine && mine.open.length ? 2 : 1} labels={['Bày một món lên quầy', 'Chờ người khác gửi đề nghị', 'Chọn đề nghị ưng ý']} />
              <h3>Quầy của ta {mine && <small>({mine.open.length}/{mine.max})</small>}</h3>
              {!mine && !err && <div className="empty">Đang xem…</div>}
              {mine && mine.open.length === 0 && <div className="empty">Ngươi chưa bày món nào. Bày ở khung “Bày món mới” phía dưới.</div>}
              {mine && mine.open.map((s) => { const v = view(s.item); return (
                <div key={s.id} className="nmStall" style={{ '--rc': C.RCOLOR[v.tier] } as CSSProperties}>
                  <div className="nmMailRow"><GoodsIcon g={s.item} size={56} /><span><b style={{ color: C.RCOLOR[v.tier] }}>{v.name}</b><small>{v.sub} · muốn đổi lấy {wantText(s.want)} · {left(s.expires, st.now)}</small></span>
                    <button type="button" className="btn sm" disabled={busy} title="Dọn quầy: món về túi, các đề nghị được trả về người gửi" onClick={() => run('market_cancel', { listing: s.id })}>Dọn quầy</button></div>
                  {s.offers.length === 0 && <div className="nmNone">Chưa có ai gửi đề nghị. Quầy tự đóng sau {left(s.expires, st.now).replace('còn ', '')}.</div>}
                  {s.offers.map((o) => { const ov = view(o.item); return (
                    <div key={o.id} className="nmOffer">
                      <GoodsIcon g={o.item} size={46} />
                      <span className="nmOfferTxt"><b style={{ color: C.RCOLOR[ov.tier] }}>{isStack(o.item) ? `${o.item.qty} ${ov.name}` : ov.name}</b>
                        <small>{ov.sub}{!isStack(o.item) && <> · <Icon name="atk" size={11} /> {fmt(o.item.power)} · <Delta a={o.item} b={s.item} /> so với món ngươi bày</>}</small>
                        <small>Người gửi: {o.from.name} · {C.REALMS[o.from.realm]} (Lv{o.from.level})</small></span>
                      <button type="button" className="btn sm hot" disabled={busy} onClick={() => doAccept(s, o)}>Chấp nhận</button>
                      <button type="button" className="btn sm" disabled={busy} onClick={() => run('market_decline', { offer: o.id })}>Từ chối</button>
                    </div>
                  ); })}
                </div>
              ); })}
            </section>

            <section className="nmBox wide">
              <h3>Bày món mới</h3>
              <Steps at={offerItem ? 2 : 1} labels={['Chọn món muốn đổi đi', 'Ghi điều ngươi mong', 'Bày lên quầy']} />
              <PickBox st={st} value={offerItem} onChange={setOfferItem} title="Chọn món trong túi để bày" />
              <div className="nmForm">
                <label>Ngươi mong nhận phẩm từ <select className="inp" value={wTier} onChange={(e) => setWTier(Number(e.target.value))}>{C.RARITY.map((r, i) => <option key={r} value={i}>{i === 0 ? 'Phàm (tuỳ ý)' : r}</option>)}</select></label>
                <label>Loại trang bị <select className="inp" value={wSlot} onChange={(e) => setWSlot(e.target.value)}><option value="">Tuỳ ý</option>{C.SLOTS.map((s) => <option key={s} value={s}>{C.SLOT_VI[s]}</option>)}</select></label>
                <button type="button" className="btn hot" disabled={busy || !offerItem || (mine ? mine.open.length >= mine.max : false)} onClick={doList}>Bày lên quầy</button>
              </div>
              <div className="hint">Phần “mong” chỉ là lời nhắn cho người xem. Món bày rời khỏi túi tới khi ngươi nhận đề nghị hoặc dọn quầy (quầy tự đóng sau 3 ngày, món về hòm thư).</div>
            </section>

            <section className="nmBox">
              <h3>Đề nghị ta đã gửi {mine && <small>({mine.sent.length}/{mine.maxOffers})</small>}</h3>
              {mine && mine.sent.length === 0 && <div className="empty">Ngươi chưa gửi đề nghị nào. Sang “Xem quầy” để chọn.</div>}
              {mine && mine.sent.map((o) => (
                <div key={o.id} className="nmMailRow"><GoodsIcon g={o.item} size={44} /><span><b>{isStack(o.item) ? `${o.item.qty} ${view(o.item).name}` : view(o.item).name}</b><small>Để đổi {view(o.target).name} của {o.seller.name}. Đang chờ trả lời.</small></span>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => run('market_withdraw', { offer: o.id })}>Rút về</button></div>
              ))}
            </section>

            <section className="nmBox">
              <h3>Hòm thư {mine && mine.inbox.length > 0 && <small>({mine.inbox.length} món)</small>}</h3>
              {mine && mine.inbox.length === 0 && <div className="empty">Hòm thư trống. Món đổi được và món được trả về sẽ nằm đây.</div>}
              {mine && mine.inbox.length > 0 && (
                <>
                  <div className="nmMail">{mine.inbox.map((m) => (
                    <div key={m.id} className="nmMailRow"><GoodsIcon g={m.item} size={44} /><span><b>{isStack(m.item) ? `${m.item.qty} ${view(m.item).name}` : view(m.item).name}</b><small>{mailText(m)}</small></span></div>
                  ))}</div>
                  <button type="button" className="btn hot" disabled={busy} onClick={() => run('market_claim', {})}>Nhận hết về túi</button>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
