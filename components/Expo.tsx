'use client';
import { useCallback, useMemo, useState } from 'react';
import * as C from '@/lib/content';
import * as XP from '@/lib/expo';
import type { GS } from '@/lib/client/types';
import { Icon } from './ds/Icon';
import { BeastArt, ItemIcon, fmt } from './ui';
import { ReactIcon } from './ReactIcon';
import { ExpoScene } from './ExpoScene';
import { useFx } from './fx/FxProvider';
import { sfx } from '@/lib/audio';
import type { Act } from './Panels';

// Triển lãm: the fourth kind of job in Công việc (components/Jobs.tsx), and the only one that is a place to look at. 3 to 6 of the player's own pieces and Linh Thú stand on the clouds
// (ExpoScene draws them and the visitors); this panel is what is around the stage: the line about the state, the box of gifts, the totals of what visitors thought, and the sheet that
// opens when a stand is tapped. The rules are lib/expo.ts (what visitors think and give) and lib/game.ts (expoSet, expoClear, expoCollect, runExpo). All three of the player's moves run on the
// screen at once; nothing pops up when it worked.
const noop = () => {};
const GRADE = ['Hồi Khí Đan', 'Hồi Khí Đan hạng khá', 'Hồi Khí Đan hạng cao'];

// The five faces from the best look to the worst, with how many times each happened: this row is also how the player learns what each face means (it is always there, the ones that never happened dimmed).
function Totals({ e }: { e: XP.Expo }) {
  const t = XP.talliesOf(e);
  return <div className="xTot" role="group" aria-label="Khách đã nghĩ gì về các món bày: mê, ngạc nhiên, thích, thất vọng, chê">{XP.REACTIONS.map((r, i) => <span key={r} className={`xChip${t[i] ? '' : ' zero'}`} title={XP.REACTION_NAME[r]}><ReactIcon r={r} size={22} />{fmt(t[i])}</span>)}</div>;
}

function BoxView({ b }: { b: XP.Box }) {
  const books = Object.values(b.books).reduce((a, n) => a + n, 0);
  return (
    <div className="xBox">
      {b.stones > 0 && <span className="xChip" title="Linh Thạch"><Icon name="stone" size={16} />{fmt(b.stones)}</span>}
      {b.weapons.length > 0 && <span className="xChip" title="Pháp khí khách tặng"><Icon name="atk" size={16} />{b.weapons.length}<small>pháp khí</small></span>}
      {b.pills.map((n, g) => n > 0 && <span key={g} className="xChip" title={GRADE[g]}><img src={C.shopArt(`hp${g}`)} alt="" draggable={false} />{n}<small>đan</small></span>)}
      {books > 0 && <span className="xChip" title="Bí Kíp"><Icon name="book" size={16} />{books}<small>bí kíp</small></span>}
      {XP.boxCount(b) === 0 && <small className="xEmpty">Hòm quà đang trống</small>}
    </div>
  );
}

// The sheet for one stand: what stands there, what the visitors thought of it, and what could stand there instead (the bag, the stash, the pen). It sticks to the bottom of the window.
function Pick({ st, e, slot, act, onClose, onErr }: { st: GS; e: XP.Expo | null; slot: number; act: Act; onClose: () => void; onErr: (m: string) => void }) {
  const cur = e ? e.stands[slot] : null;
  const [tab, setTab] = useState<'item' | 'beast'>(cur ? cur.kind : 'item');
  const used = useMemo(() => new Set(e ? e.stands.flatMap((s, i) => (s && i !== slot ? [`${s.kind}${s.id}`] : [])) : []), [e, slot]);   // what stands on another stand
  const items = useMemo(() => [...st.bag, ...st.stash].filter((it) => !used.has(`item${it.id}`)).sort((a, b) => b.tier - a.tier || b.power - a.power).slice(0, 80), [st.bag, st.stash, used]);
  const beasts = useMemo(() => st.beasts.filter((b) => !used.has(`beast${b.id}`)).sort((a, b) => XP.beastTier(b.cls, b.mut) - XP.beastTier(a.cls, a.mut) || b.power - a.power).slice(0, 80), [st.beasts, used]);
  const go = (type: string, payload: object) => { onClose(); void act(type, payload).then((r) => { if (!r.ok) onErr(r.msg); }); };
  const place = (kind: 'item' | 'beast', id: number) => go('expoSet', { slot, kind, id });
  const views = useMemo(() => (cur ? XP.REACTIONS.map((r, i) => ({ r, n: cur.tally[i] })).filter((x) => x.n > 0) : []), [cur]);
  return (
    <div className="xPick" role="dialog" aria-label={`Chọn món cho bệ ${slot + 1}`}>
      <div className="xPickHead">
        <b>Bệ {slot + 1}</b>
        <small>{cur ? 'Đổi món khác hoặc gỡ xuống' : 'Chọn món bày lên'}</small>
        <button type="button" className="xClose" aria-label="Đóng" onClick={onClose}><Icon name="close" size={16} /></button>
      </div>
      {views.length > 0 && <div className="xTot">{views.map((x) => <span key={x.r} className="xChip" title={XP.REACTION_NAME[x.r]}><ReactIcon r={x.r} size={20} />{fmt(x.n)}</span>)}</div>}
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

export function ExpoPanel({ st, act }: { st: GS; act: Act }) {
  const e = XP.isExpo(st.expo) ? st.expo : null;
  const [pick, setPick] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const fx = useFx();
  const n = e ? XP.filled(e) : 0, has = !!e && XP.boxCount(e.box) > 0;
  const onStand = useCallback((slot: number) => { setNote(''); setPick((p) => (p === slot ? null : slot)); }, []);
  const closePick = useCallback(() => setPick(null), []);
  // the chest: what is in the box goes to the bag and the stocks at once; a float of the main thing over the chest
  const collect = useCallback(async () => {
    if (!has) return;
    const r = await act('expoCollect');
    if (!r.ok) { setNote(r.msg); return; }
    const d = (r.data || {}) as { stones?: number; weapons?: number; pills?: number; books?: number; left?: number };
    const parts = [d.stones ? `+${fmt(d.stones)} Linh Thạch` : '', d.weapons ? `${d.weapons} pháp khí` : '', d.pills ? `${d.pills} đan` : '', d.books ? `${d.books} bí kíp` : ''].filter(Boolean);
    const rc = document.querySelector('.xChest')?.getBoundingClientRect();
    fx.float(parts[0] || 'Đã thu', { ...(rc ? { x: rc.left + rc.width / 2, y: rc.top } : {}), color: '#f6e2a8', sub: parts.slice(1).join(' · ') || undefined });
    sfx('chime');
    setNote(d.left ? 'Còn một phần chưa nhận vì túi hoặc kho đã đầy. Dọn chỗ rồi thu tiếp.' : '');
  }, [act, fx, has]);
  return (
    <div className="xpo">
      <ExpoScene st={st} onStand={onStand} onChest={collect} />
      <div className="xBar">
        <p className={`xState${n < XP.MIN_OPEN ? ' warn' : ''}`}>
          {n < XP.MIN_OPEN
            ? <>Bày thêm <b>{XP.MIN_OPEN - n}</b> món nữa thì mở cửa đón khách (cần {XP.MIN_OPEN} đến {XP.STANDS} món).</>
            : <>Đang mở cửa với <b>{n}</b> món. Cứ khoảng {Math.round(XP.INTERVAL_SEC[n])} giây lại có khách ghé, có lúc vài người cùng đến.</>}
        </p>
        {e && <BoxView b={e.box} />}
        <button type="button" className="btn hot" disabled={!has} onClick={collect}>Thu quà</button>
      </div>
      {note && <div className="hint ordWarn" role="status">{note}</div>}
      {e && <Totals e={e} />}
      {pick !== null && <Pick key={pick} st={st} e={e} slot={pick} act={act} onClose={closePick} onErr={setNote} />}
    </div>
  );
}
