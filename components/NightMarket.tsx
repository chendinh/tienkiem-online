'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import { levelOf, type Item } from '@/lib/game';
import { marketGet } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { ModalClose } from './ds/ModalClose';
import { Icon } from './ds/Icon';
import { Seg } from './ds/Seg';
import { askConfirm, Toast } from './ds/Dialog';
import { Img, ItemCard, ItemIcon, fmt } from './ui';
import type { Act } from './Panels';

interface Who { name: string; dao: string; realm: number; sub: number; level: number; g: 'f' | 'm'; av?: string }
interface Want { tier: number; slot: string }
interface Listing { id: number; item: Item; want: Want; seller: Who; mine: boolean; expires: number; offers: number; my: { id: number; item: Item } | null }
interface MyStall { id: number; item: Item; want: Want; expires: number; offers: { id: number; item: Item; from: Who; at: number }[] }
interface Sent { id: number; item: Item; target: Item; seller: Who }
interface Mail { id: number; item: Item; kind: 'swap' | 'return'; note: { by?: string; took?: string; why?: string; listing?: string } }
type Tab = 'browse' | 'mine';

const wantText = (w: Want) => (w.tier === 0 && !w.slot ? 'món nào cũng được xem' : `${w.tier > 0 ? `${C.RARITY[w.tier]} phẩm trở lên` : 'mọi phẩm'}, ${w.slot ? C.SLOT_VI[w.slot] : 'mọi loại'}`);
const left = (expires: number, now: number) => { const h = Math.max(0, Math.floor((expires - now) / 3600000)); return h >= 24 ? `còn ${Math.floor(h / 24)} ngày` : h >= 1 ? `còn ${h} giờ` : 'sắp đóng'; };
const mailText = (m: Mail) => {
  if (m.kind === 'swap') return `${m.note.by || 'Một tu sĩ'} nhận đề nghị của ngươi và đổi cho ngươi món này (lấy ${m.note.took || 'món ngươi đưa'}).`;
  switch (m.note.why) {
    case 'declined': return `${m.note.by || 'Chủ quầy'} từ chối đề nghị${m.note.listing ? ` đổi ${m.note.listing}` : ''}. Món của ngươi được trả về.`;
    case 'other': return `${m.note.by || 'Chủ quầy'} đã đổi với người khác. Đề nghị của ngươi được trả về.`;
    case 'closed': return 'Chủ quầy đã dọn quầy. Đề nghị của ngươi được trả về.';
    case 'expired': return 'Quầy đã hết hạn. Món được trả về.';
    case 'withdrawn': return 'Ngươi đã rút đề nghị này.';
    case 'accepted': return 'Món nhận được từ cuộc đổi mà ngươi đã chấp nhận.';
    default: return 'Món được trả về.';
  }
};
const delta = (a: Item, b: Item | null | undefined) => (b ? a.power - b.power : null);
const Delta = ({ d }: { d: number | null }) => (d === null ? null : <span className={d > 0 ? 'up' : d < 0 ? 'down' : ''}><Icon name="atk" size={13} /> {d > 0 ? '+' : ''}{fmt(d)}</span>);
const WhoLine = ({ w }: { w: Who }) => <>{w.name} · {C.REALMS[w.realm]} · {C.SUBS[w.sub]} (Lv{w.level})</>;

// A grid of the player's own gear to choose from. Locked pieces are shown but cannot be chosen.
function Pick({ items, value, onPick }: { items: Item[]; value: number | null; onPick: (id: number) => void }) {
  if (!items.length) return <div className="empty">Túi và kho đang trống.</div>;
  return (
    <div className="nmPick" role="listbox" aria-label="Chọn món trong túi">
      {items.map((it) => (
        <button key={it.id} type="button" role="option" aria-selected={value === it.id} disabled={!!it.locked} className={`nmTile t${it.tier} ${value === it.id ? 'sel' : ''}`} style={{ '--rc': C.RCOLOR[it.tier] } as CSSProperties}
          title={`${it.name}\n${C.RARITY[it.tier]} · Lv${it.level} · ${C.SLOT_VI[it.slot]} · ⚔ ${it.power}${it.locked ? '\nĐang khóa, mở khóa trong túi mới đưa được' : ''}`} onClick={() => onPick(it.id)}>
          <ItemIcon it={it} size="fit" />
          {it.locked && <em className="lockB"><Icon name="lock" size={11} /></em>}
        </button>
      ))}
    </div>
  );
}

export function NightMarketModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('browse');
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [mine, setMine] = useState<{ open: MyStall[]; sent: Sent[]; inbox: Mail[]; max: number; maxOffers: number } | null>(null);
  const [count, setCount] = useState({ inbox: 0, offersIn: 0 });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [give, setGive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rev, setRev] = useState(0);
  const [offerItem, setOfferItem] = useState<number | null>(null);
  const [wTier, setWTier] = useState(0), [wSlot, setWSlot] = useState('');

  const mineItems = [...st.bag, ...st.stash];
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
    if (!sel || give === null) return;
    const it = mineItems.find((x) => x.id === give);
    if (!it) return;
    if (!(await askConfirm({ title: 'Gửi đề nghị', body: `Đề nghị ${it.name} (${C.RARITY[it.tier]}, Lv${it.level}) để đổi lấy ${sel.item.name}? Món của ngươi được giữ lại cho tới khi chủ quầy trả lời. Ngươi rút về được bất cứ lúc nào trước đó.`, ok: 'Gửi đề nghị' }))) return;
    await run('market_offer', { listing: sel.id, give }, () => setGive(null));
  };
  const doAccept = async (s: MyStall, o: MyStall['offers'][number]) => {
    if (!(await askConfirm({ title: 'Chấp nhận đề nghị', body: `Đưa ${s.item.name} cho ${o.from.name} để lấy ${o.item.name} (${C.RARITY[o.item.tier]}, Lv${o.item.level})? Các đề nghị khác trên quầy này sẽ được trả về cho người gửi. Không đổi lại được.`, ok: 'Chấp nhận' }))) return;
    await run('market_accept', { offer: o.id });
  };
  const doList = async () => {
    const it = mineItems.find((x) => x.id === offerItem);
    if (!it) return;
    if (!(await askConfirm({ title: 'Bày lên quầy', body: `Bày ${it.name} lên Chợ Đêm? Món này rời khỏi túi cho tới khi ngươi nhận một đề nghị hoặc rút về. Quầy mở 3 ngày.`, ok: 'Bày' }))) return;
    await run('market_list', { id: it.id, want: { tier: wTier, slot: wSlot } }, () => setOfferItem(null));
  };

  const cur = sel ? st.eq[sel.item.slot] : null;
  const card = (l: Listing) => {
    const rc = C.RCOLOR[l.item.tier];
    return (
      <button key={l.id} type="button" className={`nmCard t${l.item.tier} ${selId === l.id ? 'sel' : ''}`} style={{ '--rc': rc } as CSSProperties} onClick={() => { setSelId(l.id); setGive(null); }} aria-label={`${l.item.name}, ${C.RARITY[l.item.tier]}`}>
        {l.my && <span className="nmTag mine">Đã đề nghị</span>}
        {!l.my && l.mine && <span className="nmTag">Quầy của ngươi</span>}
        <span className="nmPic"><ItemIcon it={l.item} size="fit" /></span>
        <b className="nmName" style={{ color: rc }}>{l.item.name}</b>
        <small>{C.RARITY[l.item.tier]} · Lv{l.item.level} · {C.SLOT_VI[l.item.slot]}</small>
        <span className="nmWant"><Icon name="scroll" size={12} /> Mong: {wantText(l.want)}</span>
        <small className="nmBy">{l.mine ? 'Quầy của ngươi' : `${l.seller.name} · ${C.REALMS[l.seller.realm]}`} · {l.offers} đề nghị · {left(l.expires, st.now)}</small>
      </button>
    );
  };

  const badge = count.inbox + count.offersIn;
  return (
    <div className="modal nmModal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Chợ Đêm">
      <ModalClose onClose={onClose} />
      <div className={`modalBody nmShell ${sel && tab === 'browse' ? 'viewing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="nmBanner" style={{ backgroundImage: `linear-gradient(90deg, rgb(8 6 20 / 0.9), rgb(8 6 20 / 0.35)), url(${C.NIGHT_ART})` }}>
          <div className="nmTitle"><h2>Chợ Đêm</h2><small>Canh ba, đèn lồng đỏ. Bày món mình muốn đổi, xem các đề nghị, chọn cái ưng ý. Không bán không mua.</small></div>
          <Seg<Tab> label="Mục" value={tab} onChange={(t) => { setTab(t); setSelId(null); }} options={[
            { v: 'browse' as const, label: <><Icon name="chest" size={15} /><span>Quầy hàng</span></>, title: 'Xem món người khác bày và gửi đề nghị' },
            { v: 'mine' as const, label: <><Icon name="scroll" size={15} /><span>Của ta{badge > 0 ? ` (${badge})` : ''}</span></>, title: 'Quầy của ngươi, đề nghị nhận được, hòm thư' },
          ]} />
        </header>
        <Toast msg={msg} />
        {err && <div className="eqMsg err" role="alert">{err}</div>}

        {tab === 'browse' && (
          <div className="nmBody">
            <section className="nmList" aria-label="Quầy hàng">
              {!rows && !err && <div className="empty" aria-busy="true">Đang đi dạo chợ…</div>}
              {rows && rows.length === 0 && <div className="nmEmpty"><Img src={C.NIGHT_EMPTY_ART} className="nmEmptyImg" fb={<Icon name="chest" size={40} />} /><p>Chưa có quầy nào. Hãy là người bày đầu tiên ở mục “Của ta”.</p></div>}
              {rows && rows.length > 0 && <div className="nmGrid">{rows.map(card)}</div>}
            </section>
            <aside className="nmDetail" aria-label="Chi tiết">
              {!sel && <div className="nmHint"><Icon name="scroll" size={34} /><p>Bấm vào một món để xem kỹ. Thấy ưng thì chọn một món trong túi ngươi gửi làm đề nghị, chủ quầy sẽ trả lời.</p></div>}
              {sel && (
                <div className="nmDetailIn">
                  <button type="button" className="btn sm ghost nmBack" onClick={() => setSelId(null)}><Icon name="back" size={15} /> Về quầy</button>
                  <ItemCard it={sel.item} />
                  <div className="cmp">
                    {cur ? <>So với <b>{cur.name}</b> đang mặc: <Delta d={delta(sel.item, cur)} /></> : <>Ô {C.SLOT_VI[sel.item.slot]} của ngươi đang trống.</>}
                    {sel.item.level > levelOf(st.player) && <div className="down">Cần Lv{sel.item.level} mới mặc được.</div>}
                  </div>
                  <div className="nmSeller"><b>{sel.mine ? 'Quầy của ngươi' : sel.seller.name}</b>{!sel.mine && <small>{sel.seller.dao ? `${sel.seller.dao} · ` : ''}<WhoLine w={sel.seller} /></small>}</div>
                  <div className="hint"><b>Chủ quầy mong:</b> {wantText(sel.want)}. Đây chỉ là gợi ý, chủ quầy tự chọn đề nghị ưng ý. Hiện có {sel.offers} đề nghị.</div>
                  {sel.mine && <div className="hint">Xem đề nghị và trả lời ở mục “Của ta”.</div>}
                  {!sel.mine && sel.my && (
                    <>
                      <h4>Đề nghị của ngươi</h4>
                      <div className="nmMailRow"><ItemIcon it={sel.my.item} size={52} zoom /><span><b>{sel.my.item.name}</b><small>{C.RARITY[sel.my.item.tier]} · Lv{sel.my.item.level} · <Delta d={delta(sel.my.item, sel.item)} /> so với món này. Đang chờ chủ quầy trả lời.</small></span></div>
                      <div className="eqAct"><button type="button" className="btn" disabled={busy} onClick={() => run('market_withdraw', { offer: sel.my!.id })}>Rút đề nghị về túi</button></div>
                    </>
                  )}
                  {!sel.mine && !sel.my && (
                    <>
                      <h4>Chọn món trong túi để đề nghị</h4>
                      <Pick items={mineItems} value={give} onPick={setGive} />
                      {give !== null && (() => { const g = mineItems.find((x) => x.id === give); return g ? <div className="hint"><b>{g.name}</b> · {C.RARITY[g.tier]} · Lv{g.level} · <Icon name="atk" size={12} /> {fmt(g.power)}</div> : null; })()}
                      <div className="eqAct"><button type="button" className="btn hot" disabled={busy || give === null} onClick={doOffer}>Gửi đề nghị</button></div>
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
              <h3>Quầy của ta {mine && <small>({mine.open.length}/{mine.max})</small>}</h3>
              {!mine && !err && <div className="empty">Đang xem…</div>}
              {mine && mine.open.length === 0 && <div className="empty">Ngươi chưa bày món nào. Bày ở khung phía dưới.</div>}
              {mine && mine.open.map((s) => (
                <div key={s.id} className="nmStall" style={{ '--rc': C.RCOLOR[s.item.tier] } as CSSProperties}>
                  <div className="nmMailRow"><ItemIcon it={s.item} size={52} zoom /><span><b style={{ color: C.RCOLOR[s.item.tier] }}>{s.item.name}</b><small>{C.RARITY[s.item.tier]} · Lv{s.item.level} · mong {wantText(s.want)} · {left(s.expires, st.now)}</small></span>
                    <button type="button" className="btn sm" disabled={busy} title="Dọn quầy, các đề nghị được trả về người gửi" onClick={() => run('market_cancel', { listing: s.id })}>Rút quầy</button></div>
                  {s.offers.length === 0 && <div className="nmNone">Chưa có đề nghị nào.</div>}
                  {s.offers.map((o) => (
                    <div key={o.id} className="nmOffer">
                      <ItemIcon it={o.item} size={44} zoom />
                      <span className="nmOfferTxt"><b style={{ color: C.RCOLOR[o.item.tier] }}>{o.item.name}</b>
                        <small>{C.RARITY[o.item.tier]} · Lv{o.item.level} · {C.SLOT_VI[o.item.slot]} · <Icon name="atk" size={11} /> {fmt(o.item.power)} · <Delta d={delta(o.item, s.item)} /> so với món bày</small>
                        <small>Từ {o.from.name} · {C.REALMS[o.from.realm]} (Lv{o.from.level})</small></span>
                      <button type="button" className="btn sm hot" disabled={busy} onClick={() => doAccept(s, o)}>Chấp nhận</button>
                      <button type="button" className="btn sm" disabled={busy} onClick={() => run('market_decline', { offer: o.id })}>Từ chối</button>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="nmBox">
              <h3>Hòm thư {mine && mine.inbox.length > 0 && <small>({mine.inbox.length} món)</small>}</h3>
              {mine && mine.inbox.length === 0 && <div className="empty">Hòm thư trống. Món được đổi hoặc trả về sẽ nằm đây.</div>}
              {mine && mine.inbox.length > 0 && (
                <>
                  <div className="nmMail">{mine.inbox.map((m) => (
                    <div key={m.id} className="nmMailRow"><ItemIcon it={m.item} size={44} zoom /><span><b>{m.item.name}</b><small>{mailText(m)}</small></span></div>
                  ))}</div>
                  <button type="button" className="btn hot" disabled={busy} onClick={() => run('market_claim', {})}>Nhận về túi</button>
                </>
              )}
            </section>

            <section className="nmBox">
              <h3>Đề nghị ta đã gửi {mine && <small>({mine.sent.length}/{mine.maxOffers})</small>}</h3>
              {mine && mine.sent.length === 0 && <div className="empty">Ngươi chưa gửi đề nghị nào. Sang “Quầy hàng” để xem.</div>}
              {mine && mine.sent.map((o) => (
                <div key={o.id} className="nmMailRow"><ItemIcon it={o.item} size={44} zoom /><span><b>{o.item.name}</b><small>Đề nghị đổi {o.target.name} của {o.seller.name}. Đang chờ trả lời.</small></span>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => run('market_withdraw', { offer: o.id })}>Rút về</button></div>
              ))}
            </section>

            <section className="nmBox wide">
              <h3>Bày món mới</h3>
              <div className="hint">Chọn một món trong túi để bày. Món bày rời khỏi túi, người khác gửi đề nghị, ngươi chọn cái ưng. Quầy mở 3 ngày, hết hạn thì món và các đề nghị về lại chủ cũ.</div>
              <Pick items={mineItems} value={offerItem} onPick={setOfferItem} />
              <div className="nmForm">
                <label>Ngươi mong nhận phẩm từ <select className="inp" value={wTier} onChange={(e) => setWTier(Number(e.target.value))}>{C.RARITY.map((r, i) => <option key={r} value={i}>{i === 0 ? 'Phàm (tuỳ ý)' : r}</option>)}</select></label>
                <label>Loại <select className="inp" value={wSlot} onChange={(e) => setWSlot(e.target.value)}><option value="">Tuỳ ý</option>{C.SLOTS.map((s) => <option key={s} value={s}>{C.SLOT_VI[s]}</option>)}</select></label>
                <button type="button" className="btn hot" disabled={busy || offerItem === null || (mine ? mine.open.length >= mine.max : false)} onClick={doList}>Bày lên quầy</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
