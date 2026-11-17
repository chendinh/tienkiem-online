'use client';
import { ModalClose } from './ds/ModalClose';
import { askConfirm, Toast } from './ds/Dialog';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent as RKey, type MutableRefObject } from 'react';
import * as C from '@/lib/content';
import type { Item } from '@/lib/game';
import { levelOf, dissolveValue } from '@/lib/game';
import type { GS } from '@/lib/client/types';
import type { Act, ActRes } from './Panels';
import { ElChip, GenImg, ItemIcon, PanZoom, STAT_VI, fmt } from './ui';
import { ElIcon } from './Icons';
import { itemSpec } from '@/lib/avatarSpec';
import { SlotIcon } from './Icons';
import { Icon } from './ds/Icon';
import { SealPick } from './ds/SealPick';

// The item "in hand" while it is dragged to a slot or to the bag. `slot` is the slot it belongs to.
export type Held = { from: 'bag' | 'stash' | 'eq'; id: number; slot: string } | null;
export type Eqx = ReturnType<typeof useEquip>;

// State and actions of the equipment screen. Lives in Game because it is shared by two places:
// the slot molds drawn around the big portrait (left) and the bag (right).
export function useEquip(stRef: MutableRefObject<GS | null>, act: Act, re: () => void) {
  const [held, setHeld] = useState<Held>(null);
  const [hot, setHot] = useState('');            // slot under the mouse: lights its place on the body and the matching items in the bag
  const [dragging, setDragging] = useState(false); // a real drag is under way
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [sel, setSel] = useState<number | null>(null);   // the item whose popup is open
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((t: string, ok = true) => {
    setMsg({ t, ok });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 6000);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setHeld(null); setDragging(false); setSel(null); } };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (timer.current) clearTimeout(timer.current); if (dragTimer.current) clearTimeout(dragTimer.current); };
  }, []);

  // ---- mouse drag. The state change is deferred one tick: restyling the dragged element inside `dragstart` makes Chrome cancel the drag.
  const dragStart = useCallback((e: DragEvent, h: NonNullable<Held>) => {
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(h.id)); } catch {}
    dragTimer.current = setTimeout(() => { setDragging(true); setHeld(h); }, 0);
  }, []);
  const dragEnd = useCallback(() => { if (dragTimer.current) clearTimeout(dragTimer.current); setDragging(false); setHeld(null); }, []);

  // Report the result; a successful change is saved and puts the item down.
  const finish = useCallback((r: ActRes) => {
    say(r.msg, r.ok);
    if (r.ok) { setHeld(null); setDragging(false); setSel(null); }
    re();
    return r.ok;
  }, [say, re]);

  // `target` is the slot the player dropped on; without it the item goes to the slot it belongs to.
  const equipItem = useCallback(async (id: number, target?: string) => {
    const st = stRef.current; if (!st) return false;
    const it = st.bag.find((x) => x.id === id) || st.stash.find((x) => x.id === id);
    if (!it) { say('Món đồ này không còn trong túi.', false); setHeld(null); return false; }
    if (target && target !== it.slot) {
      say(`${it.name} là ${C.SLOT_VI[it.slot]} (${C.SLOT_HINT[it.slot]}), không đặt vào ô ${C.SLOT_VI[target]}. Hãy thả vào ô ${C.SLOT_VI[it.slot]} đang sáng.`, false);
      return false;
    }
    return finish(await act('equip', { id }));
  }, [stRef, say, finish, act]);
  const takeOff = useCallback(async (slot: string) => finish(await act('unequip', { slot })), [finish, act]);
  const moveToBag = useCallback(async (id: number) => finish(await act('unstash', { id })), [finish, act]);
  const lock = useCallback(async (id: number) => { const r = await act('lock', { id }); say(r.msg, r.ok); re(); }, [act, say, re]);
  const dissolve = useCallback(async (id: number) => {
    const st = stRef.current; if (!st) return;
    const it = st.bag.find((x) => x.id === id) || st.stash.find((x) => x.id === id);
    if (it && it.tier >= 3 && !(await askConfirm({ title: 'Phân giải pháp bảo', body: `Phân giải ${it.name} (hạng ${C.RARITY[it.tier]})? Không thể hoàn tác.`, ok: 'Phân giải', danger: true }))) return;
    finish(await act('dissolve', { id }));
  }, [stRef, finish, act]);
  const dissolveMany = useCallback(async (maxTier: number) => {
    if (!(await askConfirm({ title: 'Dọn túi', body: `Phân giải mọi món không khóa, không đang mặc, hạng ${C.RARITY[maxTier]} trở xuống (trong túi và kho tạm)? Không thể hoàn tác.`, ok: 'Dọn túi', danger: true }))) return;
    finish(await act('dissolveMany', { maxTier }));
  }, [finish, act]);
  const open = useCallback((id: number) => setSel(id), []);
  const close = useCallback(() => setSel(null), []);
  return { held, setHeld, hot, setHot, dragging, dragStart, dragEnd, msg, say, equipItem, takeOff, moveToBag, lock, dissolve, dissolveMany, sel, open, close };
}

const keyAct = (fn: () => void) => (e: RKey) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
// What the held item is, if it is still there (the game may have dissolved it meanwhile).
function heldItemOf(st: GS, held: Held): Item | undefined {
  if (!held) return undefined;
  return held.from === 'bag' ? st.bag.find((x) => x.id === held.id) : held.from === 'stash' ? st.stash.find((x) => x.id === held.id) : st.eq[held.slot] || undefined;
}

// One slot mold: an empty engraved template, or the worn item's picture. Drop a bag item here to wear it.
function SlotMold({ st, eqx, slot, tall }: { st: GS; eqx: Eqx; slot: string; tall?: boolean }) {
  const { held, setHeld } = eqx;
  const [over, setOver] = useState(false);
  const it = st.eq[slot];
  const hold = heldItemOf(st, held) ? held : null;
  const fromBag = !!hold && hold.from !== 'eq';
  const mine = fromBag && hold!.slot === slot, wrong = fromBag && hold!.slot !== slot, sel = !!hold && hold.from === 'eq' && hold.slot === slot;
  const click = () => {
    if (hold && hold.from !== 'eq') { eqx.equipItem(hold.id, slot); return; }
    if (it) { eqx.open(it.id); return; }
    eqx.say(`Ô ${C.SLOT_VI[slot]} (${C.SLOT_HINT[slot]}) đang trống. Kéo một món ${C.SLOT_VI[slot]} từ túi vào đây.`, true);
  };
  return (
    <div data-slot={slot} className={`slotTile ${it ? `filled t${it.tier}` : 'empty'} ${mine ? 'ok' : ''} ${wrong ? 'no' : ''} ${over ? 'over' : ''} ${sel ? 'sel' : ''} ${tall ? 'tall' : ''}`}
      role="button" tabIndex={0} draggable={!!it} style={it ? ({ '--rc': C.RCOLOR[it.tier] } as CSSProperties) : undefined}
      aria-label={`${C.SLOT_VI[slot]}, ${C.SLOT_HINT[slot]}: ${it ? it.name : 'trống'}`}
      title={`${C.SLOT_VI[slot]}: ${C.SLOT_HINT[slot]}${it ? `\n${it.name}` : '\n(trống)'}`}
      onDragStart={(e) => (it ? eqx.dragStart(e, { from: 'eq', id: it.id, slot }) : e.preventDefault())} onDragEnd={eqx.dragEnd}
      onDragEnter={(e) => { if (fromBag) { e.preventDefault(); setOver(true); } }}
      onDragOver={(e) => { if (fromBag) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); if (hold && hold.from !== 'eq') eqx.equipItem(hold.id, slot); else setHeld(null); }}
      onMouseEnter={() => eqx.setHot(slot)} onMouseLeave={() => eqx.setHot('')}
      onClick={click} onKeyDown={keyAct(click)}>
      {it ? <ItemIcon it={it} size={50} equipped /> : <div className="mold"><b><SlotIcon slot={slot} size={26} /></b></div>}
      <span className="sname">{C.SLOT_VI[slot]}<small>{C.SLOT_SHORT[slot]}</small></span>
      {it && it.locked && <em className="lockB"><Icon name="lock" size={11} /></em>}
    </div>
  );
}

// The eight slots laid out as a paper doll (grid areas in game.css: .eqDoll). Drag a bag item into its slot; the portrait is for looking only.
const DOLL: { slot: string; area: string; tall?: boolean }[] = [
  { slot: 'Talisman', area: 'tal' }, { slot: 'Headwear', area: 'head' },
  { slot: 'Weapon', area: 'wpn', tall: true }, { slot: 'Accessory', area: 'acc' }, { slot: 'Robe', area: 'robe', tall: true }, { slot: 'Back', area: 'back', tall: true },
  { slot: 'Ring', area: 'ring' }, { slot: 'Footwear', area: 'foot' },
];
function EquipDoll({ st, eqx }: { st: GS; eqx: Eqx }) {
  return (
    <div className="eqDoll">
      {DOLL.map((d) => <div key={d.slot} className="dollCell" style={{ gridArea: d.area }}><SlotMold st={st} eqx={eqx} slot={d.slot} tall={d.tall} /></div>)}
    </div>
  );
}

// The popup for one item: big picture, numbers and every action, so the main screen stays quiet.
export function ItemPopup({ st, eqx }: { st: GS; eqx: Eqx }) {
  const id = eqx.sel;
  const found = id === null ? null
    : st.bag.find((x) => x.id === id) ? { it: st.bag.find((x) => x.id === id)!, where: 'bag' as const }
    : st.stash.find((x) => x.id === id) ? { it: st.stash.find((x) => x.id === id)!, where: 'stash' as const }
    : Object.values(st.eq).find((x) => x && x.id === id) ? { it: Object.values(st.eq).find((x) => x && x.id === id)!, where: 'eq' as const } : null;
  useEffect(() => { if (id !== null && !found) eqx.close(); });
  if (!found) return null;
  const { it, where } = found, L = levelOf(st.player), rc = C.RCOLOR[it.tier], cur = where === 'eq' ? null : st.eq[it.slot];
  const delta = cur ? it.power - cur.power : null;
  const tooHigh = it.level > L;
  return (
    <div className="modal zoom" onClick={eqx.close} role="dialog" aria-modal="true" aria-label={it.name}>
      <ModalClose onClose={eqx.close} />
      <div className="modalBody zoomBody" onClick={(e) => e.stopPropagation()} style={{ '--rc': rc } as CSSProperties}>
        <div className="zoomPic"><PanZoom><GenImg spec={itemSpec(it)} pri={1} fb={<ElIcon el={it.el} size={80} />} /></PanZoom></div>
        <div className="zoomInfo">
          <h2 style={{ color: rc }}>{it.name}</h2>
          <div className="chips">
            <span className="chip" style={{ color: rc, borderColor: rc + '88' }}>{C.RARITY[it.tier]}</span><span className="chip">Lv{it.level}</span><span className="chip">{C.SLOT_VI[it.slot]}</span>
            <ElChip el={it.el} /><span className="chip gold"><Icon name="atk" size={13} /> {fmt(it.power)}</span>
            {where === 'eq' && <span className="chip">đang mặc</span>}{where === 'stash' && <span className="chip">kho tạm</span>}{it.locked && <span className="chip"><Icon name="lock" size={11} /> khóa</span>}
          </div>
          <ul className="itLines big">
            <li>{STAT_VI[it.impl.stat]} +{it.impl.value}</li>
            {it.affixes.map((a, i) => <li key={i} className={a.id.startsWith('tien') ? 'tien' : ''}>{a.label} +{a.value}</li>)}
          </ul>
          {where !== 'eq' && (
            <div className="cmp">
              {delta === null ? <>Ô {C.SLOT_VI[it.slot]} đang trống: mặc vào là có thêm <Icon name="atk" size={13} /> {fmt(it.power)}.</>
                : <>So với <b>{cur!.name}</b> đang mặc: <span className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}><Icon name="atk" size={13} /> {delta > 0 ? '+' : ''}{fmt(delta)}</span>.</>}
              {tooHigh && <div className="down">Cần Lv{it.level} mới mặc được (ngươi đang Lv{L}).</div>}
            </div>
          )}
          <Toast msg={eqx.msg} />
        </div>
        <div className="eqAct">
          {where === 'eq'
            ? <button className="btn hot" onClick={() => eqx.takeOff(it.slot)}>Tháo về túi</button>
            : <button className="btn hot" disabled={tooHigh} onClick={() => eqx.equipItem(it.id)}>Mặc vào ô {C.SLOT_VI[it.slot]}</button>}
          {where === 'stash' && <button className="btn" onClick={() => eqx.moveToBag(it.id)}>Chuyển vào túi</button>}
          <button className="btn" title="Món đã khóa: game không tự thay và không tự phân giải" onClick={() => eqx.lock(it.id)}><Icon name={it.locked ? 'unlock' : 'lock'} size={15} /> {it.locked ? 'Mở khóa' : 'Khóa'}</button>
          {where !== 'eq' && <button className="btn" disabled={!!it.locked} title={it.locked ? 'Mở khóa trước khi phân giải' : 'Đổi món này thành Linh Thạch'} onClick={() => eqx.dissolve(it.id)}>Phân giải +{fmt(dissolveValue(it))} <Icon name="stone" size={15} /></button>}
          <button className="btn ghost" onClick={eqx.close}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

export function EquipPanel({ st, eqx }: { st: GS; eqx: Eqx }) {
  const L = levelOf(st.player);
  const { held, setHeld, hot, dragging } = eqx;
  const [over, setOver] = useState(false);       // a worn item is dragged over the bag
  const [clean, setClean] = useState(1);         // "Dọn túi": rarity up to which everything not locked is dissolved
  const [cleaning, setCleaning] = useState(false);
  // what the cleaning would do, the same rule as the server (lib/game.ts dissolveMany): an upgrade (stronger than what is worn there, or an empty slot) is always kept
  const plan = [...st.bag, ...st.stash].reduce((p, it) => {
    if (it.locked) { p.locked++; return p; }
    if (it.tier > clean) return p;
    const cur = st.eq[it.slot];
    if (!cur || it.power > cur.power) { p.kept++; return p; }
    p.n++; p.stones += dissolveValue(it); return p;
  }, { n: 0, kept: 0, locked: 0, stones: 0 });
  const fromEq = !!held && held.from === 'eq';
  const tile = (it: Item, from: 'bag' | 'stash') => {
    const cur = st.eq[it.slot], d = cur ? it.power - cur.power : null, tooHigh = it.level > L;
    const mark = d === null ? '+' : d > 0 ? '▲' : d < 0 ? '▼' : '=', cls = d === null || d > 0 ? 'up' : d < 0 ? 'down' : '';
    return (
      <div key={it.id} className={`bagTile t${it.tier} ${hot && hot === it.slot ? 'match' : ''} ${tooHigh ? 'toohigh' : ''}`}
        role="button" tabIndex={0} draggable style={{ '--rc': C.RCOLOR[it.tier] } as CSSProperties}
        aria-label={`${it.name}, ${C.RARITY[it.tier]}, ${C.SLOT_VI[it.slot]}`}
        title={`${it.name}\n${C.RARITY[it.tier]} · Lv${it.level} · ${C.SLOT_VI[it.slot]} · ⚔ ${it.power}`}
        onDragStart={(e) => eqx.dragStart(e, { from, id: it.id, slot: it.slot })} onDragEnd={eqx.dragEnd}
        onMouseEnter={() => eqx.setHot(it.slot)} onMouseLeave={() => eqx.setHot('')}
        onClick={() => eqx.open(it.id)} onKeyDown={keyAct(() => eqx.open(it.id))}>
        <ItemIcon it={it} size="fit" />
        <b className={`cmpb ${cls}`}>{mark}</b>
        {tooHigh && <u className="lvb">Lv{it.level}</u>}
        {it.locked && <em className="lockB"><Icon name="lock" size={11} /></em>}
      </div>
    );
  };
  const cells = Math.max(12, Math.ceil(st.bag.length / 6) * 6);
  return (
    <div className="eqPanel">
      <h4 className="eqTitle">Trang bị pháp bảo</h4>
      <div className="hint">Kéo món từ túi thả vào ô trang bị để mặc. Bấm vào ô để tháo hoặc xem thông tin.</div>
      <EquipDoll st={st} eqx={eqx} />
      {!eqx.sel && <Toast msg={eqx.msg} />}
      <div className="bagHead">
        <h4>Túi Càn Khôn <small>{st.bag.length}/{st.caps.bag}</small></h4>
        <button type="button" className={`btn sm ${cleaning ? 'on' : ''}`} aria-expanded={cleaning} onClick={() => setCleaning((o) => !o)}><Icon name="trash" size={14} /> Dọn túi</button>
      </div>
      {cleaning && (
        <div className="cleanBox" role="group" aria-label="Dọn túi">
          <div className="cleanHead"><b>Dọn túi</b><small>Phân giải ra Linh Thạch mọi món không khóa, tới hạng ngươi chọn.</small></div>
          <SealPick label="Phân giải tới hạng" upTo value={clean} onChange={setClean} options={C.RARITY.slice(0, 4).map((n, i) => ({ v: i, label: n, color: C.RCOLOR[i], hint: `Phân giải mọi món từ hạng Phàm tới hạng ${n}` }))} />
          <div className="cleanSum">
            <span className="cs go"><b>{plan.n}</b> món sẽ phân giải{plan.n > 0 && <> · <Icon name="stone" size={12} /> ≈ {fmt(plan.stones)} Linh Thạch</>}</span>
            <span className="cs keep" title="Mạnh hơn món đang mặc ở cùng ô, hoặc ô còn trống: luôn được giữ để ngươi tự quyết"><b>{plan.kept}</b> món mũi tên xanh được giữ lại</span>
            {plan.locked > 0 && <span className="cs lock"><Icon name="lock" size={11} /> {plan.locked} món đã khóa được giữ</span>}
          </div>
          <div className="cleanAct">
            <button type="button" className="btn ghost sm" onClick={() => setCleaning(false)}>Đóng</button>
            <button type="button" className="btn hot sm" disabled={plan.n === 0} onClick={async () => { if (await askConfirm({ title: 'Dọn túi', body: `Phân giải ${plan.n} món tới hạng ${C.RARITY[clean]}, nhận khoảng ${fmt(plan.stones)} Linh Thạch? Không hoàn lại được.`, ok: 'Phân giải', danger: true })) eqx.dissolveMany(clean); }}>Phân giải {plan.n} món</button>
          </div>
        </div>
      )}
      <div className="bagWrap">
        <div className={`bagGrid ${over ? 'over' : ''} ${fromEq ? 'dropme' : ''}`}
          onDragEnter={(e) => { if (fromEq) { e.preventDefault(); setOver(true); } }}
          onDragOver={(e) => { if (fromEq) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); } }}
          onDragLeave={(e) => { const to = e.relatedTarget as Node | null; if (!to || !e.currentTarget.contains(to)) setOver(false); }}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (held && held.from === 'eq') eqx.takeOff(held.slot); else setHeld(null); }}>
          {st.bag.map((it) => tile(it, 'bag'))}
          {Array.from({ length: cells - st.bag.length }, (_, i) => <div key={`c${i}`} className="bagCell" />)}
        </div>
        {fromEq && dragging && <div className="dropHint">Thả vào túi để tháo</div>}
      </div>
      {st.bag.length === 0 && <div className="hint">Túi trống. Đồ nhặt được nằm ở đây cho ngươi tự quyết định.</div>}
      {st.stash.length > 0 && (
        <>
          <div className="bagHead stashHead"><h4>Kho Tạm <small>{st.stash.length}/{st.caps.stash}</small></h4></div>
          <div className="hint">Túi đầy thì đồ mới vào đây. Khi cả hai đầy, món yếu nhất không khóa bị phân giải.</div>
          <div className="bagGrid">{st.stash.map((it) => tile(it, 'stash'))}</div>
        </>
      )}
    </div>
  );
}
