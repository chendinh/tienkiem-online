'use client';
import { useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as O from '@/lib/orders';
import type { GS } from '@/lib/client/types';
import { dissolveValue, type Item } from '@/lib/game';
import { Icon } from './ds/Icon';
import { askConfirm } from './ds/Dialog';
import { ElIcon, SlotIcon } from './Icons';
import { Img, ItemIcon, fmt } from './ui';
import type { Act } from './Panels';

// Khách Cầu Mua: a tab of Phường Thị. A buyer stays until everything asked has been handed over, and the player gives what there is ("có bao nhiêu đưa bấy nhiêu").
// Every piece is paid at once, so nothing is lost by stopping half way. Everything runs on the screen at once (the same rule as on the server, lib/game.ts fillOrder) and
// nothing pops up when it worked. `isUp`: the piece would be an upgrade (the slot is empty or it is stronger than what is worn), so it is never put forward by itself.
const isUp = (st: GS, it: Item) => { const w = st.eq[it.slot]; return !w || it.power > w.power; };
type Cand = { part: number; items: Item[] };
// For each part still open, the pieces of the bag and the stash that fit it: spare ones first (weakest first), upgrades last.
export function candidates(st: GS, o: O.Order): Cand[] {
  const held = [...st.bag, ...st.stash].filter((it) => !it.locked);
  return o.parts.flatMap((p, part) => (p.got ? [] : [{ part, items: held.filter((it) => O.matchesWant(p.want, it)).sort((a, b) => Number(isUp(st, a)) - Number(isUp(st, b)) || a.power - b.power) }]));
}
/** The buyers of the board (none until the first tick has made them). */
export const buyers = (st: GS): O.Order[] => (O.isBoard(st.orders) ? st.orders.list : []);
/** How many buyers could be given something right now (shown on the tab). */
export const fillableCount = (st: GS): number => buyers(st).filter((o) => O.isOpen(o) && candidates(st, o).some((c) => c.items.length)).length;
const times = (m: number) => String(m / 100).replace('.', ',');

// What one part looks like on a card: the picture of the kind asked for if there is one, otherwise the slot in the colour of the rarity.
function PartPic({ w, size }: { w: O.Want; size: number }) {
  const s = O.sampleItem(w);
  if (s) return <ItemIcon it={s} size={size} />;
  return <span className="ordRar" style={{ '--rc': C.RCOLOR[w.tier], width: size, height: size } as CSSProperties}>{w.slot ? <SlotIcon slot={w.slot} size={Math.round(size * 0.5)} /> : <Icon name="stone" size={Math.round(size * 0.5)} />}{w.el && <i className="ordEl"><ElIcon el={w.el} size={14} /></i>}</span>;
}

export function OrdersPanel({ st, act }: { st: GS; act: Act }) {
  const list = buyers(st);
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<number, number>>({});   // part index -> item id chosen for it
  const [err, setErr] = useState('');
  const start = (o: O.Order) => {
    setErr('');
    if (open === o.id) { setOpen(null); return; }
    const pick: Record<number, number> = {};
    for (const c of candidates(st, o)) if (c.items.length && !isUp(st, c.items[0])) pick[c.part] = c.items[0].id;   // spare pieces are ready; an upgrade has to be chosen on purpose
    setSel(pick); setOpen(o.id);
  };
  const choose = (part: number, id: number) => setSel((cur) => { const n = { ...cur }; if (n[part] === id) delete n[part]; else n[part] = id; return n; });
  const give = async (o: O.Order, ids: number[]) => {
    const r = await act('fillOrder', { id: o.id, items: ids });
    if (r.ok) { setOpen(null); setErr(''); } else setErr(r.msg);
  };
  const sendAway = async (o: O.Order) => {
    const { got } = O.progress(o);
    if (got > 0 && !(await askConfirm({ title: 'Tiễn khách', body: `${o.who.name} đã nhận ${got} món từ ngươi. Tiễn đi thì mất phần thưởng đủ bộ và quà. Tiền các món đã giao vẫn là của ngươi.`, ok: 'Tiễn khách', danger: true }))) return;
    if (open === o.id) setOpen(null);
    const r = await act('dismissOrder', { id: o.id });
    if (!r.ok) setErr(r.msg);
  };
  const wasted = st.set.dissolveMax >= 0 && list.some((o) => O.isOpen(o) && o.parts.some((p) => !p.got && p.want.tier <= st.set.dissolveMax));
  if (!list.length) return <div className="empty">Khách đang tới Phường Thị, đợi vài giây rồi xem lại.</div>;
  return (
    <div className="ordPanel">
      <div className="hint">Khách ở lại đến khi ngươi giao đủ, có món nào đưa món đó, mỗi món được trả ngay gấp nhiều lần giá phân giải. Giao đủ thì thưởng thêm và có khách mới tới. Món nào khách cần sẽ có nhãn <Icon name="scroll" size={12} /> trong túi, và Dọn túi hay tự phân giải sẽ chừa lại một món cho mỗi phần khách cần.</div>
      {wasted && <div className="hint ordWarn">Ngươi đang cài tự phân giải đồ hạng {C.RARITY[st.set.dissolveMax]} trở xuống. Món khách đang cần vẫn được chừa lại một cái cho mỗi phần, nhưng các món thừa khác thì mất.</div>}
      {err && <div className="hint ordWarn" role="alert">{err}</div>}
      <div className="ordList">
        {list.map((o) => {
          const { got, total } = O.progress(o), cs = candidates(st, o), have = cs.reduce((a, c) => a + (c.items.length ? 1 : 0), 0);
          const chosen = cs.flatMap((c) => c.items.filter((x) => sel[c.part] === x.id));
          const sum = chosen.reduce((a, x) => a + dissolveValue(x), 0), full = got + chosen.length === total && chosen.length > 0;
          const pay = chosen.reduce((a, x) => a + O.payFor(o.mult, dissolveValue(x)), 0) + (full ? O.payFor(o.bonus, o.sum + sum) : 0);
          const gone = !O.isOpen(o);
          return (
            <div key={o.id} className={`ordCard k-${o.kind}${gone ? ' done' : ''}`}>
              <div className="ordHead">
                <Img src={C.buyerArt(o.who.arch, o.who.g)} className="ordFace" fb={<Icon name="scroll" size={26} />} />
                <div className="ordWho"><b>{o.who.name}</b><small>{o.who.arch}{o.kind === 'vip' ? ' · khách quý' : o.kind === 'set' ? ' · gom cả bộ' : ''}</small></div>
                {!gone && <button type="button" className="ordX" aria-label={`Tiễn ${o.who.name}`} title="Tiễn khách" onClick={() => sendAway(o)}><Icon name="close" size={14} /></button>}
              </div>
              <p className="ordLine">“{O.lineOf(o)}”</p>
              <div className="ordWant"><b>{O.wantText(o)}</b>{o.parts.length > 1 && <small>Đã giao {got}/{total}</small>}</div>
              <div className={`ordParts n${total}`}>
                {o.parts.map((p, j) => {
                  const c = cs.find((x) => x.part === j), n = c ? c.items.length : 0;
                  return (
                    <div key={j} className={`ordPart${p.got ? ' got' : n ? ' has' : ''}`} title={O.partText(p.want)}>
                      <PartPic w={p.want} size={total > 1 ? 44 : 56} />
                      <small>{O.partShort(p.want)}</small>
                      {p.got ? <i className="ordTick"><Icon name="check" size={12} /></i> : n > 0 ? <i className="ordCnt">{n}</i> : null}
                    </div>
                  );
                })}
              </div>
              <div className="ordPay">
                <span>Mỗi món trả <b>gấp {times(o.mult)}</b> giá phân giải{o.bonus > 0 && <>, đủ bộ thưởng thêm <b>gấp {times(o.bonus)}</b></>}</span>
                {o.extra && <span className="ordExtra">{o.bonus > 0 || o.parts.length > 1 ? 'Đủ bộ tặng' : 'Tặng'} <Img src={O.extraArt(o.extra)} className="ordExImg" fb="✦" /><b>{O.extraName(o.extra)} ×{o.extra.n}</b></span>}
              </div>
              {o.paid > 0 && <div className="ordDone"><Icon name="stone" size={13} /> Đã nhận {fmt(o.paid)} Linh Thạch từ khách này</div>}
              {gone ? <div className="ordDone"><Icon name="check" size={14} /> {o.done ? 'Khách đã đủ đồ, đang có khách mới tới' : 'Khách đã rời đi'}</div> : (
                <>
                  {open === o.id && have > 0 && (
                    <div className="ordPick" role="group" aria-label="Chọn món để giao">
                      {cs.filter((c) => c.items.length).map((c) => (
                        <div key={c.part} className="ordRow">
                          <span className="ordRowLb">{O.partShort(o.parts[c.part].want)}</span>
                          <div className="ordRowIts">
                            {c.items.map((it) => (
                              <button key={it.id} type="button" className={`ordIt${sel[c.part] === it.id ? ' on' : ''}`} aria-pressed={sel[c.part] === it.id} onClick={() => choose(c.part, it.id)}>
                                <ItemIcon it={it} size={42} />
                                <small>Lv{it.level} · {it.power}{isUp(st, it) ? ' ▲' : ''}</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {open === o.id && have > 0
                    ? <div className="ordBtns"><button type="button" className="btn" onClick={() => setOpen(null)}>Thôi</button><button type="button" className="btn hot" disabled={chosen.length === 0} onClick={() => give(o, chosen.map((x) => x.id))}>Giao {chosen.length} món · +{fmt(pay)} Linh Thạch</button></div>
                    : <button type="button" className="btn" disabled={have === 0} onClick={() => start(o)}>{have > 0 ? `Giao nộp (${cs.reduce((a, c) => a + c.items.length, 0)} món hợp)` : 'Chưa có món nào hợp'}</button>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
