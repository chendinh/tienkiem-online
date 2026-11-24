'use client';
import { useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as D from '@/lib/daily';
import * as O from '@/lib/orders';
import type { GS } from '@/lib/client/types';
import { dissolveValue, type Item } from '@/lib/game';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';
import { Img, ItemIcon, fmt } from './ui';
import type { Act } from './Panels';

// Khách Cầu Mua: a tab of Phường Thị. Cultivators ask for an item, the player picks the spare ones from the bag and hands them over; the pay is a multiple of what dissolving them would give.
// Everything runs at once on the screen (the same rule as on the server, lib/game.ts fillOrder) and nothing pops up when it worked.
// `isUp`: this item would be an upgrade for the character (the slot is empty or it is stronger than what is worn): it is offered last, so a good item is never the first one picked by mistake.
const isUp = (st: GS, it: Item) => { const w = st.eq[it.slot]; return !w || it.power > w.power; };
// The items of the bag and the stash that can go to an order, spare ones first (weakest first, upgrades last). A set is all of ONE picture: the picture the player holds the most of.
function pool(st: GS, o: O.Order): Item[] {
  let list = [...st.bag, ...st.stash].filter((it) => !it.locked && O.matchesWant(o.want, it));
  if (o.kind === 'set') {
    const g = new Map<string, Item[]>();
    for (const it of list) { const k = O.lookKey(it); const a = g.get(k); if (a) a.push(it); else g.set(k, [it]); }
    list = [...g.values()].sort((a, b) => b.length - a.length)[0] || [];
  }
  return list.sort((a, b) => Number(isUp(st, a)) - Number(isUp(st, b)) || a.power - b.power);
}
/** Today's buyers; none until the first tick of the day has made them. */
export const todaysOrders = (st: GS): O.Order[] => (st.orders && st.orders.day === D.dayKey(st.clock) ? st.orders.list : []);
/** How many buyers could be served right now (shown on the tab). */
export const fillableCount = (st: GS): number => todaysOrders(st).filter((o) => !o.done && pool(st, o).length >= o.need).length;
const times = (m: number) => String(m / 100).replace('.', ',');

export function OrdersPanel({ st, act }: { st: GS; act: Act }) {
  const list = todaysOrders(st);
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [err, setErr] = useState('');
  const start = (o: O.Order) => {
    setErr('');
    if (open === o.id) { setOpen(null); return; }
    setSel(pool(st, o).slice(0, o.need).map((x) => x.id));
    setOpen(o.id);
  };
  const toggle = (o: O.Order, id: number) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-o.need)));
  const give = async (o: O.Order, ids: number[]) => {
    const r = await act('fillOrder', { id: o.id, items: ids });
    if (r.ok) { setOpen(null); setErr(''); } else setErr(r.msg);
  };
  const done = list.filter((o) => o.done).length;
  const wasted = st.set.dissolveMax >= 0 && list.some((o) => !o.done && o.want.tier <= st.set.dissolveMax);
  if (!list.length) return <div className="empty">Khách của hôm nay đang tới Phường Thị, đợi vài giây rồi xem lại.</div>;
  return (
    <div className="ordPanel">
      <div className="hint">Mỗi ngày có khách mới (đổi cùng lúc với nhiệm vụ ngày), đã giao {done}/{list.length}. Khách trả gấp nhiều lần giá phân giải, có khi kèm vật phẩm.</div>
      {wasted && <div className="hint ordWarn">Cài đặt đang tự phân giải đồ hạng {C.RARITY[st.set.dissolveMax]} trở xuống (khi ô đó đã có đồ mặc), nên những món ấy không vào túi. Hạ mức này xuống nếu muốn gom đồ cho khách.</div>}
      {err && <div className="hint ordWarn" role="alert">{err}</div>}
      <div className="ordList">
        {list.map((o) => {
          const p = pool(st, o), have = p.length, can = !o.done && have >= o.need, sample = O.sampleItem(o.want);
          const chosen = p.filter((x) => sel.includes(x.id)), pay = O.payFor(o.mult, chosen.reduce((a, x) => a + dissolveValue(x), 0));
          return (
            <div key={o.id} className={`ordCard k-${o.kind}${o.done ? ' done' : ''}`}>
              <div className="ordHead">
                <Img src={C.buyerArt(o.who.arch, o.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
                <div className="ordWho"><b>{o.who.name}</b><small>{o.who.arch}{o.kind === 'vip' ? ' · khách quý' : o.kind === 'set' ? ' · mua cả lô' : ''}</small></div>
              </div>
              <p className="ordLine">“{O.lineOf(o)}”</p>
              <div className="ordWant">
                {sample ? <ItemIcon it={sample} size={52} /> : <span className="ordRar" style={{ '--rc': C.RCOLOR[o.want.tier] } as CSSProperties}>{o.want.el ? <ElIcon el={o.want.el} size={26} /> : <Icon name="stone" size={24} />}</span>}
                <div className="ordWantTxt"><b>{O.wantText(o)}</b><small>{o.want.tier <= 1 && !o.want.el ? 'Hệ nào cũng được. ' : ''}Trong túi có {fmt(have)}/{o.need}</small></div>
              </div>
              <div className="ordPay">
                <span>Trả <b>gấp {times(o.mult)}</b> giá phân giải</span>
                {o.extra && <span className="ordExtra">và <Img src={O.extraArt(o.extra)} className="ordExImg" fb="✦" /><b>{O.extraName(o.extra)} ×{o.extra.n}</b></span>}
              </div>
              {o.done ? <div className="ordDone"><Icon name="check" size={14} /> Đã giao, nhận {fmt(o.paid || 0)} Linh Thạch</div> : (
                <>
                  {open === o.id && can && (
                    <div className="ordPick" role="group" aria-label="Chọn món để giao">
                      {p.map((it) => (
                        <button key={it.id} type="button" className={`ordIt${sel.includes(it.id) ? ' on' : ''}`} aria-pressed={sel.includes(it.id)} onClick={() => toggle(o, it.id)}>
                          <ItemIcon it={it} size={44} />
                          <small>Lv{it.level} · {it.power}{isUp(st, it) ? ' ▲' : ''}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {open === o.id && can
                    ? <div className="ordBtns"><button type="button" className="btn" onClick={() => setOpen(null)}>Thôi</button><button type="button" className="btn hot" disabled={chosen.length !== o.need} onClick={() => give(o, chosen.map((x) => x.id))}>Giao · +{fmt(pay)} Linh Thạch</button></div>
                    : <button type="button" className="btn" disabled={!can} onClick={() => start(o)}>{can ? 'Chọn món để giao' : 'Chưa đủ món'}</button>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
