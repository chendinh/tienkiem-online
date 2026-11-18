'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouse, type PointerEvent as ReactPointer } from 'react';
import { ASPECT, DEFAULT_PERCHES, HEIGHT, K_RANGE, frameOf, newUid, sizeOf, snapPerch, type Box } from '@/lib/garden';
import { LOOK_COLOR, ZOO_BGS, etaText, variantName, type Stage, type ZooItem } from '@/lib/zoo';
import { useGenImage } from '@/lib/useGenImage';
import { monsterSpec } from '@/lib/avatarSpec';
import { Icon } from '@/components/ds/Icon';
import { Creature } from '@/components/lab/Creature';

// Linh Thú Viên of a player: the Dị Biến beasts they have tamed, put on one of the game's tall pictures. Drag a beast from the tray (or tap it) and it stands on the nearest
// perch; drag it again to move it; "Lưu" keeps the layout. A beast that has no clip yet is "nhập định" (being made, once for everybody) and shows how long that takes.
interface Cut { id: string; alpha: string; url?: string; alphaUrl?: string }
interface Beast { id: number; sp: string; name: string; level: number; look: string; cut: Cut | null }
interface Making { status: 'making' | 'failed' | 'limited' | 'disabled' | 'wait'; stage?: Stage; eta?: number; why?: string }
const keyOf = (b: { sp: string; look: string }) => `${b.sp}:${b.look}`;
const pc = (n: number) => `${n}%`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const post = (body: object) => fetch('/api/zoo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function Pic({ b }: { b: { sp: string; look: string } }) {
  const g = useGenImage(monsterSpec(b.sp, b.look === 'ngusac'), 3);
  return g.url ? <img src={`${g.url}?s=sm`} alt="" draggable={false} /> : <i />;
}

export function Zoo() {
  const [beasts, setBeasts] = useState<Beast[] | null>(null);
  const [bg, setBg] = useState(ZOO_BGS[0].id);
  const [lay, setLay] = useState<Record<string, ZooItem[]>>({});
  const [cuts, setCuts] = useState<Record<string, Cut>>({});
  const [making, setMaking] = useState<Record<string, Making>>({});
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ b: Beast; x: number; y: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const [editing, setEditing] = useState(false);   // the page opens as a picture to look at; "Sửa" opens the tray and the tools
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState('');
  const [vis, setVis] = useState(true);
  const stage = useRef<HTMLDivElement>(null), drag = useRef<string | null>(null), alive = useRef(true), loops = useRef(new Set<string>());
  const cutsRef = useRef(cuts); cutsRef.current = cuts;
  const saved = useRef<{ bg: string; lay: Record<string, ZooItem[]> }>({ bg: ZOO_BGS[0].id, lay: {} });
  const bgInfo = ZOO_BGS.find((x) => x.id === bg) || ZOO_BGS[0];
  const perches = DEFAULT_PERCHES[bg] || [];
  const items = lay[bg] || [];
  const byId = useMemo(() => new Map((beasts || []).map((b) => [b.id, b])), [beasts]);

  // ---- making what is missing: ask the server every few seconds; it starts the next step and says which one it is at
  const run = useCallback(async (b: Beast) => {
    const k = keyOf(b);
    if (loops.current.has(k) || cutsRef.current[k]) return;
    loops.current.add(k);
    try {
      while (alive.current) {
        let r: Response, j: any;
        try { r = await post({ step: 'summon', beast: b.id }); j = await r.json().catch(() => ({})); } catch { setMaking((m) => ({ ...m, [k]: { status: 'wait' } })); await sleep(8000); continue; }
        if (r.status === 401) { window.location.assign('/'); return; }
        if (j.status === 'ready' && j.cut) { setCuts((c) => ({ ...c, [k]: j.cut })); setMaking((m) => { const n = { ...m }; delete n[k]; return n; }); return; }
        if (j.status === 'making') setMaking((m) => ({ ...m, [k]: { status: 'making', stage: j.stage, eta: j.eta } }));
        else { setMaking((m) => ({ ...m, [k]: { status: j.status === 'limited' || j.status === 'disabled' ? j.status : 'failed', why: j.why } })); return; }
        await sleep(4000);
      }
    } finally { loops.current.delete(k); }
  }, []);

  // ---- loading, leaving, visibility
  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const r = await fetch('/api/zoo', { cache: 'no-store' });
        if (r.status === 401) { window.location.assign('/'); return; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) { setErr('Không mở được Linh Thú Viên. Thử tải lại trang.'); setBeasts([]); return; }
        const list = j.beasts as Beast[];
        setBeasts(list); setBg(j.zoo.bg); setLay(j.zoo.lay || {});
        const c: Record<string, Cut> = {};
        for (const b of list) if (b.cut) c[keyOf(b)] = b.cut;
        setCuts(c); cutsRef.current = c;
        saved.current = { bg: j.zoo.bg, lay: j.zoo.lay || {} };
        // a beast that was put down earlier and has no clip yet carries on being made
        for (const it of (j.zoo.lay?.[j.zoo.bg] || []) as ZooItem[]) { const b = list.find((x) => x.id === it.beast); if (b && !c[keyOf(b)]) void run(b); }
      } catch { setErr('Không gọi được máy chủ.'); setBeasts([]); }
    })();
    const onVis = () => setVis(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => { alive.current = false; document.removeEventListener('visibilitychange', onVis); };
  }, [run]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  useEffect(() => { if (!beasts) return; for (const it of items) { const b = byId.get(it.beast); if (b && !cuts[keyOf(b)]) void run(b); } }, [bg, beasts]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the layout
  const edit = (fn: (l: ZooItem[]) => ZooItem[]) => { setLay((l) => ({ ...l, [bg]: fn(l[bg] || []) })); setDirty(true); setSavedAt(0); };
  const patch = (uid: string, f: (i: ZooItem) => ZooItem) => edit((l) => l.map((i) => (i.uid === uid ? f(i) : i)));
  function add(b: Beast, x: number, y: number) {
    const here = items.find((i) => i.beast === b.id);
    if (here) { setSel(here.uid); return; }
    if (items.length >= 8) { setErr('Mỗi nền đặt tối đa 8 thú để máy không bị giật. Gỡ bớt một con.'); return; }
    const s = snapPerch(perches, x, y, ASPECT);
    if (!s) return;
    setErr('');
    const uid = newUid();
    edit((l) => [...l, { uid, beast: b.id, perch: s.perch.id, x: s.x, y: s.y, flip: false, k: 1 }]);
    setSel(uid);
    if (!cutsRef.current[keyOf(b)]) void run(b);
  }
  // pulled from the tray: dropped on the stage it goes to the nearest perch; a plain tap puts it on the perch with the fewest creatures
  function pull(b: Beast, e: ReactPointer) {
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const mv = (ev: PointerEvent) => { if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) { moved = true; setMoving(true); } if (moved) setGhost({ b, x: ev.clientX, y: ev.clientY }); };
    const end = (ev: PointerEvent, ok: boolean) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      setGhost(null); setMoving(false);
      if (!ok) return;
      const r = stage.current?.getBoundingClientRect();
      if (!moved) { const p = [...perches].sort((a, c) => items.filter((i) => i.perch === a.id).length - items.filter((i) => i.perch === c.id).length)[0]; if (p) add(b, p.x, p.y); }
      else if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom) add(b, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    };
    const up = (ev: PointerEvent) => end(ev, true), cancel = (ev: PointerEvent) => end(ev, false);
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  }
  function grab(uid: string, e: ReactPointer) { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = uid; setSel(uid); setMoving(true); }
  function carry(e: ReactPointer) {
    const uid = drag.current, r = stage.current?.getBoundingClientRect();
    if (!uid || !r) return;
    const s = snapPerch(perches, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, ASPECT);
    if (!s) return;
    setLay((l) => ({ ...l, [bg]: (l[bg] || []).map((i) => (i.uid === uid && (i.perch !== s.perch.id || i.x !== s.x || i.y !== s.y) ? { ...i, perch: s.perch.id, x: s.x, y: s.y } : i)) }));
    setDirty(true); setSavedAt(0);
  }
  const drop = () => { drag.current = null; setMoving(false); };

  async function save() {
    if (saving) return;
    setSaving(true); setErr('');
    try {
      const r = await post({ step: 'save', bg, lay });
      if (r.status === 401) { window.location.assign('/'); return; }
      if (!r.ok) throw new Error('save');
      saved.current = { bg, lay }; setDirty(false); setSavedAt(Date.now()); setEditing(false); setSel(null);
    } catch { setErr('Chưa lưu được, thử lại.'); } finally { setSaving(false); }
  }
  const cancel = () => { setBg(saved.current.bg); setLay(saved.current.lay); setDirty(false); setSel(null); setErr(''); setEditing(false); };
  useEffect(() => { if (editing) requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight })); }, [editing]);   // the perches are in the lower part of the picture
  const leave = (e: ReactMouse) => { if (dirty && !window.confirm('Chưa lưu thay đổi. Rời đi vẫn bỏ chúng?')) e.preventDefault(); };

  const selItem = items.find((i) => i.uid === sel);
  const placed = new Set(items.map((i) => i.beast));
  const eta = (b: Beast) => { const m = making[keyOf(b)]; return etaText(m?.stage); };

  if (beasts === null) return <main className="zv"><p className="zv-note">Đang mở Linh Thú Viên…</p></main>;
  return (
    <main className={`zv ${editing ? 'edit' : 'view'}`}>
      <header className="zv-top">
        {editing
          ? <button type="button" className="zv-btn" onClick={cancel}>{dirty ? 'Hủy' : 'Xong'}</button>
          : <a className="zv-btn" href="/" onClick={leave} aria-label="Về game"><Icon name="back" size={20} /></a>}
        {editing && selItem
          ? (
            <div className="zv-tools" role="toolbar" aria-label="Chỉnh Dị Thú đang chọn">
              <button type="button" onClick={() => patch(selItem.uid, (i) => ({ ...i, flip: !i.flip }))} aria-label="Quay mặt">⇋<span>Quay</span></button>
              <button type="button" onClick={() => patch(selItem.uid, (i) => ({ ...i, k: Math.max(K_RANGE.min, Math.round((i.k - 0.15) * 100) / 100) }))} aria-label="Nhỏ lại">−<span>Nhỏ</span></button>
              <button type="button" onClick={() => patch(selItem.uid, (i) => ({ ...i, k: Math.min(K_RANGE.max, Math.round((i.k + 0.15) * 100) / 100) }))} aria-label="To lên">+<span>To</span></button>
              <button type="button" onClick={() => { edit((l) => l.filter((i) => i.uid !== selItem.uid)); setSel(null); }} aria-label="Gỡ khỏi nền">✕<span>Gỡ</span></button>
            </div>
          )
          : <h1>Linh Thú Viên</h1>}
        {editing
          ? <button type="button" className={`zv-btn ${dirty ? 'hot' : ''}`} disabled={!dirty || saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          : <button type="button" className="zv-btn" onClick={() => setEditing(true)} aria-label="Bày trí"><Icon name="brush" size={17} /> Bày trí</button>}
      </header>
      {editing && <nav className="zv-bgs" aria-label="Chọn nền">
        {ZOO_BGS.map((x) => <button key={x.id} type="button" className="zv-chip" aria-pressed={x.id === bg} onClick={() => { setBg(x.id); setSel(null); setDirty(true); }}>{x.name}</button>)}
      </nav>}
      {err && <p className="zv-err" role="alert">{err}</p>}

      <div className="zv-main">
        <div ref={stage} className="zv-stage" onPointerDown={() => setSel(null)}>
          <img className="zv-bg" src={bgInfo.src} alt="" draggable={false} />
          <div className="zv-items">
            {items.map((it) => {
              const b = byId.get(it.beast), pr = perches.find((p) => p.id === it.perch);
              if (!b || !pr) return null;
              const k = keyOf(b), c = cuts[k], z = 10 + Math.round(it.y * 1000) * 2, size = sizeOf(pr, it.k), m = making[k];
              if (c) {
                const box = boxes[c.id], f = box ? frameOf(box, it, size, ASPECT) : null;
                return (
                  <Fragment key={it.uid}>
                    <Creature c={c} it={it} size={size} box={box} z={z} paused={!vis} onBox={(bx) => setBoxes((o) => ({ ...o, [c.id]: bx }))} onFail={() => setErr('Máy này chưa vẽ được thú tách nền.')} />
                    {editing && f && box && (
                      <div className={`zv-hit${sel === it.uid ? ' on' : ''}`} style={{ left: pc(f.left + box.x0 * f.width), top: pc(f.top + box.y0 * f.height), width: pc((box.x1 - box.x0) * f.width), height: pc((box.y1 - box.y0) * f.height), zIndex: z + 2 }}
                        onPointerDown={(e) => grab(it.uid, e)} onPointerMove={carry} onPointerUp={drop} onPointerCancel={drop} />
                    )}
                  </Fragment>
                );
              }
              // not made yet: the beast sits in meditation on its perch
              const down = m && m.status !== 'making' && m.status !== 'wait';
              return (
                <div key={it.uid} data-side={it.x > 0.66 ? 'r' : it.x < 0.34 ? 'l' : 'c'} className={`zv-med${editing && sel === it.uid ? ' on' : ''}${down ? ' down' : ''}${editing ? '' : ' still'}`} style={{ left: pc(it.x * 100), top: pc(it.y * 100), height: pc(HEIGHT * size * 100 * 0.8), zIndex: z + 2, ['--hue' as string]: LOOK_COLOR[b.look] }}
                  onPointerDown={editing ? (e) => grab(it.uid, e) : undefined} onPointerMove={editing ? carry : undefined} onPointerUp={editing ? drop : undefined} onPointerCancel={editing ? drop : undefined}>
                  <span className="zv-medtag">{!m || m.status === 'making' || m.status === 'wait' ? `Nhập định · ${eta(b)}` : m.status === 'limited' ? 'Tạm nghỉ, chạm để thử lại' : m.status === 'disabled' ? 'Chưa mở' : 'Chưa xong, chạm để thử lại'}</span>
                  <Pic b={b} />
                  {down && <button type="button" className="zv-retry" aria-label="Thử lại" onPointerDown={(e) => e.stopPropagation()} onClick={() => run(b)}><Icon name="rise" size={16} /></button>}
                </div>
              );
            })}
          </div>
          {(moving || ghost) && perches.map((p) => <i key={p.id} className="zv-perch" style={{ left: pc((p.x - p.w / 2) * 100), top: pc(p.y * 100), width: pc(p.w * 100) }} />)}
          {items.length === 0 && beasts.length > 0 && <p className="zv-hint">{editing ? 'Kéo một Dị Thú từ khay xuống, hoặc chạm vào nó.' : 'Vườn còn trống. Bấm Bày trí để đặt Dị Thú vào.'}</p>}
        </div>
      </div>

      {editing && <section className="zv-dock" aria-label="Khay Dị Thú">
        {beasts.length === 0
          ? <p className="zv-note">Bạn chưa có Linh Thú Dị Biến nào. Dị Biến hiếm gặp khi đi Lịch Luyện; thu phục được là đưa vào đây được.</p>
          : <div className="zv-tray">
              {beasts.map((b) => {
                const k = keyOf(b), ready = !!cuts[k], on = placed.has(b.id);
                return (
                  <div key={b.id} className={`zv-tile${on ? ' on' : ''}`} style={{ ['--hue' as string]: LOOK_COLOR[b.look] }} onPointerDown={(e) => pull(b, e)}>
                    <Pic b={b} />
                    <span>{b.name}</span>
                    <em>{variantName(b.look)}</em>
                    <small>{on ? 'Đã đặt' : ready ? 'Sẵn sàng' : `Nhập định ${eta(b)}`}</small>
                  </div>
                );
              })}
            </div>}
      </section>}
      {ghost && <div className="zv-ghost" style={{ left: ghost.x, top: ghost.y }}><Pic b={ghost.b} /></div>}
    </main>
  );
}
