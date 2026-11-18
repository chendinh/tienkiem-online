'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointer } from 'react';
import { BASE, MUTATIONS } from '@/lib/anim';
import { HEIGHT, K_RANGE, MAX_ITEMS, PLANE, THEMES, cleanPlane, creatureUsd, frameOf, newUid, parseLayout, snap, themeOf, type Box, type Layout, type Placed, type Plane } from '@/lib/garden';
import { errText } from '@/lib/strings';
import { AlphaVideo } from './AlphaVideo';
import { Ambient } from './Ambient';
import { LoopVideo } from './LoopVideo';

// The Linh Thú Viên garden: every creature has ONE idle clip with its background cut out. The owner drags creatures from the tray onto a background; they snap onto the
// flat ground (the plane) of that background and get smaller the farther back they stand. What is put where is saved on the server, per background.
const KEY = 'tutien-admin-key';
const ASPECT = 16 / 9;
type St = 'pending' | 'ready' | 'failed' | 'limited' | 'disabled' | 'invalid';
interface Cut { id: string; alpha: string; sp: string; mut: string; motion: string; pic?: string; url?: string; alphaUrl?: string }
interface Usd { plane: number; edit: number; clip: number; cut: number; bg: number }
interface Info { enabled: boolean; spent: number; cap: number; blob: { on: boolean; mb: number }; species: { id: string; name: string }[]; cuts: Cut[]; planes: { id: string; theme: string }[]; bgclips: { bg: string; id: string; url?: string }[]; garden: Record<string, unknown>; gardenUsd: Usd }
interface Bg { id: string; name: string; src: string; plane: Plane; river?: boolean }
type Answer = { status: St; id?: string; why?: string };

const BUILTIN: Bg[] = [
  { id: 'dawn', name: 'Biển mây (sáng)', src: '/art/scene/dawn.webp', plane: { y0: 0.72, y1: 0.93 } },
  { id: 'night', name: 'Biển mây (đêm)', src: '/art/scene/night.webp', plane: { y0: 0.72, y1: 0.93 } },
  { id: 'thanhvan', name: 'Thanh Vân (có suối)', src: '/art/zones/thanhvan.jpg', plane: { y0: 0.7, y1: 0.92 }, river: true },
];
const WHY: Record<string, string> = { limited: 'Hết hạn mức của lab', disabled: 'fal chưa được bật', invalid: 'Yêu cầu không hợp lệ' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const usd = (x: number) => `$${x.toFixed(2)}`;
const pc = (n: number) => `${n}%`;
const mediaUrl = (id: string, url?: string) => url || `/api/lab/media/${id}`;
const mutName = (m: string) => (m === BASE ? 'Nguyên bản' : MUTATIONS.find((x) => x.id === m)?.name || m);

// One creature on the stage: its cut-out video, played only while it is on the screen. Its box is measured from the first picture, so that its FEET (not the empty
// margin of its picture) stand on the point it was dropped on; until then it is invisible.
function Creature({ c, it, plane, box, onBox, onFail, z }: { c: Cut; it: Placed; plane: Plane; box?: Box; onBox: (b: Box) => void; onFail: () => void; z: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(true), [ever, setEver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setEver(true); return; }
    const io = new IntersectionObserver(([e]) => { setSeen(e.isIntersecting); if (e.isIntersecting) setEver(true); }, { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const f = frameOf(plane, box || { x0: 0.1, y0: 0.05, x1: 0.9, y1: 1 }, it, ASPECT);
  return (
    <>
      {box && <div className="zs-shadow" style={{ left: pc(f.shadow.left), top: pc(f.shadow.top), width: pc(f.shadow.width), height: pc(f.shadow.height), zIndex: z }} />}
      <div ref={ref} className="zs-cr" style={{ left: pc(f.left), top: pc(f.top), width: pc(f.width), height: pc(f.height), zIndex: z + 1, opacity: box ? 1 : 0, transform: it.flip ? 'scaleX(-1)' : undefined, transformOrigin: `${f.pivot}% 50%` }}>
        {ever && <AlphaVideo rgb={mediaUrl(c.id, c.url)} alpha={mediaUrl(c.alpha, c.alphaUrl)} playing={seen} onBox={box ? undefined : onBox} onFail={onFail} />}
      </div>
    </>
  );
}

export function Garden() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [bgId, setBgId] = useState('dawn');
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ c: Cut; x: number; y: number } | null>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [fx, setFx] = useState(true);
  const [adjust, setAdjust] = useState(false);
  const [busy, setBusy] = useState('');                       // what is being made right now (a background, a clip of one)
  const [sp, setSp] = useState('');
  const [mut, setMut] = useState<string>(BASE);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const stage = useRef<HTMLDivElement>(null), init = useRef(false), stop = useRef(false), timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const layRef = useRef<Record<string, Layout>>({});
  const drag = useRef<{ uid: string } | null>(null);
  const keyRef = useRef<string | null>(null);
  keyRef.current = key;

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } }, []);

  const bgs = useMemo<Bg[]>(() => [...(info?.planes || []).map((p) => ({ id: p.id, name: themeOf(p.theme)?.name || 'Nền mới', src: `/api/img/${p.id}`, plane: PLANE })), ...BUILTIN], [info?.planes]);
  const bg = bgs.find((b) => b.id === bgId) || bgs[0];
  const lay: Layout = layouts[bg.id] || { plane: bg.plane, items: [] };
  const clip = info?.bgclips.find((c) => c.bg === bg.id);

  const load = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/lab/anim?garden=1', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setInfo(j as Info);
      if (!init.current) {   // later answers must not undo what was just moved
        init.current = true;
        const g = (j.garden || {}) as Record<string, unknown>, out: Record<string, Layout> = {};
        for (const id of Object.keys(g)) out[id] = parseLayout(g[id], BUILTIN.find((b) => b.id === id)?.plane || PLANE);
        layRef.current = out; setLayouts(out);
        const first = (j.planes as { id: string }[])[0];
        if (first) setBgId(first.id);
        setSp((s) => s || (j.species as { id: string }[])[0]?.id || '');
      }
    } catch { setErr('Không gọi được máy chủ.'); }
  }, []);
  useEffect(() => { if (key) void load(key); }, [key, load]);

  // ---- changing and saving the layout of the background on show
  const save = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const k = keyRef.current, l = layRef.current[id];
      if (!k || !l) return;
      try {
        const r = await fetch('/api/lab/anim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }, body: JSON.stringify({ step: 'garden', bg: id, plane: l.plane, items: l.items }) });
        if (!r.ok) setErr('Không lưu được chỗ đặt thú.');
      } catch { setErr('Không lưu được chỗ đặt thú.'); }
    }, 600);
  }, []);
  const upd = useCallback((fn: (l: Layout) => Layout) => {
    const id = bg.id, cur = layRef.current[id] || { plane: bg.plane, items: [] }, next = fn(cur);
    layRef.current = { ...layRef.current, [id]: next };
    setLayouts(layRef.current); save(id);
  }, [bg.id, bg.plane, save]);

  const cuts = useMemo(() => {
    const m = new Map<string, Cut>();   // the newest idle clip of each creature (and mutation)
    for (const c of info?.cuts || []) if (c.motion === 'idle') m.set(`${c.sp}:${c.mut}`, c);
    return [...m.values()];
  }, [info?.cuts]);
  const cutById = useMemo(() => new Map((info?.cuts || []).map((c) => [c.id, c])), [info?.cuts]);
  const spName = useCallback((id: string) => info?.species.find((s) => s.id === id)?.name || id, [info?.species]);

  function add(c: Cut, x: number, y: number) {
    if (lay.items.length >= MAX_ITEMS) { setErr(`Mỗi nền đặt tối đa ${MAX_ITEMS} thú (mỗi thú là hai video, nhiều hơn điện thoại sẽ giật).`); return; }
    setErr('');
    const p = snap(lay.plane, x, y), uid = newUid();
    upd((l) => ({ ...l, items: [...l.items, { uid, cut: c.id, x: p.x, y: p.y, flip: false, k: 1 }] }));
    setSel(uid);
  }
  // pull a creature from the tray: a drop on the stage puts it there (feet at the pointer), a plain tap puts it in the middle of the ground
  function pull(c: Cut, e: ReactPointer) {
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    setGhost({ c, x: x0, y: y0 });
    const mv = (ev: PointerEvent) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) moved = true; setGhost({ c, x: ev.clientX, y: ev.clientY }); };
    const end = (ev: PointerEvent, ok: boolean) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      setGhost(null);
      if (!ok) return;
      const r = stage.current?.getBoundingClientRect();
      if (!moved) add(c, 0.35 + Math.random() * 0.3, (lay.plane.y0 + lay.plane.y1) / 2);
      else if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) add(c, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
    };
    const up = (ev: PointerEvent) => end(ev, true), cancel = (ev: PointerEvent) => end(ev, false);
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  }
  // move one that is already on the stage
  function grab(uid: string, e: ReactPointer) {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { uid }; setSel(uid);
  }
  function carry(e: ReactPointer) {
    const d = drag.current, r = stage.current?.getBoundingClientRect();
    if (!d || !r) return;
    const p = snap(lay.plane, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    upd((l) => ({ ...l, items: l.items.map((i) => (i.uid === d.uid ? { ...i, ...p } : i)) }));
  }
  const drop = () => { drag.current = null; };
  const patch = (uid: string, f: (i: Placed) => Placed) => upd((l) => ({ ...l, items: l.items.map((i) => (i.uid === uid ? f(i) : i)) }));
  const setPlane = (p: Plane) => upd((l) => { const pl = cleanPlane(p, l.plane); return { plane: pl, items: l.items.map((i) => ({ ...i, ...snap(pl, i.x, i.y) })) }; });

  // ---- making things: ask until the server stops saying "pending"
  const until = useCallback(async (k: string, body: object): Promise<Answer> => {
    const t0 = Date.now();
    for (;;) {
      const r = await fetch('/api/lab/anim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { status: 'failed', why: String(j.code || r.status) };
      if (j.status !== 'pending') return j;
      if (stop.current || Date.now() - t0 > 6 * 60e3) return { status: 'failed', why: stop.current ? 'Đã dừng' : 'Quá hạn' };
      await sleep(4000);
    }
  }, []);
  async function make(what: string, body: object, after?: (id: string) => void) {
    if (!key || busy) return;
    setBusy(what); setErr(''); stop.current = false;
    try {
      const a = await until(key, body);
      if (a.status !== 'ready') setErr(a.why || WHY[a.status] || 'Lỗi');
      else { await load(key); if (a.id) after?.(a.id); }
    } catch { setErr('Mất kết nối giữa chừng.'); } finally { setBusy(''); }
  }
  // a new creature: its picture (and mutation), ONE idle clip, and the cut-out of the clip
  async function newCreature() {
    if (!key || running || !sp) return;
    stop.current = false; setRunning(true); setErr('');
    try {
      setNote('Chuẩn bị ảnh thú…');
      const base = await until(key, { step: 'base', sp });
      if (base.status !== 'ready' || !base.id) { setNote(`✕ ${base.why || WHY[base.status] || 'Lỗi'}`); return; }
      let src = base.id;
      if (mut !== BASE) {
        setNote('Vẽ dị biến…');
        const v = await until(key, { step: 'variant', sp, mut });
        if (v.status !== 'ready' || !v.id) { setNote(`✕ ${v.why || WHY[v.status] || 'Lỗi'}`); return; }
        src = v.id;
      }
      setNote('Làm hoạt ảnh đứng yên (1–3 phút)…');
      const c = await until(key, { step: 'clip', sp, mut, motion: 'idle', src });
      if (c.status !== 'ready' || !c.id) { setNote(`✕ ${c.why || WHY[c.status] || 'Lỗi'}`); return; }
      setNote('Tách nền…');
      const x = await until(key, { step: 'cut', sp, mut, motion: 'idle', src: c.id });
      if (x.status !== 'ready') { setNote(`✕ ${x.why || WHY[x.status] || 'Lỗi'}`); return; }
      setNote('Xong: thú đã vào khay.');
      await load(key);
    } catch { setErr('Mất kết nối giữa chừng. Những gì đã làm xong vẫn được giữ.'); } finally { setRunning(false); }
  }

  const have = cuts.some((c) => c.sp === sp && c.mut === mut);
  const need = info ? creatureUsd(info.gardenUsd, mut !== BASE) : 0;
  const over = !!info && info.spent + need > info.cap;
  const selItem = lay.items.find((i) => i.uid === sel);
  const selCut = selItem && cutById.get(selItem.cut);

  if (key === null) return null;
  if (!key) {
    return (
      <main className="zl">
        <h1>Linh Thú Viên · vườn thú</h1>
        <form className="zl-panel" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) setKey(typed.trim()); }}>
          <p className="zl-note">Trang của chủ game: nhập ADMIN_KEY (cùng khóa với trang báo cáo). Trang này tốn tiền fal.</p>
          <input className="zl-in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" />
          <button className="zl-btn" type="submit">Mở</button>
          {err && <p className="zl-err">{err}</p>}
        </form>
      </main>
    );
  }
  return (
    <main className="zl">
      <h1>Linh Thú Viên · vườn thú</h1>
      <p className="zl-note">Mỗi thú chỉ cần một clip đứng yên đã tách nền. Kéo thú từ khay xuống nền (hoặc chạm để thả vào giữa); thú tự đứng lên mặt phẳng ngang của nền và nhỏ dần khi lùi xa. <a className="zl-link" href="/lab/linh-thu">← Xưởng</a></p>

      <section className="zl-panel">
        <div className="zl-row"><span>Nền</span>
          <div className="zl-chips">
            {bgs.map((b) => <button key={b.id} type="button" className="zl-chip" aria-pressed={b.id === bg.id} onClick={() => { setBgId(b.id); setSel(null); }}>{b.name}</button>)}
          </div>
        </div>
        <div className="zl-row"><span>Nền mới có mặt phẳng ngang{info ? ` (${usd(info.gardenUsd.plane)} một nền)` : ''}</span>
          <div className="zl-chips">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className="zl-chip" disabled={!!busy || !info?.enabled || (info?.planes || []).some((p) => p.theme === t.id)} onClick={() => make(`plane-${t.id}`, { step: 'plane', theme: t.id }, (id) => setBgId(id))}>
                {busy === `plane-${t.id}` ? 'Đang vẽ…' : (info?.planes || []).some((p) => p.theme === t.id) ? `✓ ${t.name}` : t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="zl-row"><span>Nền này</span>
          <div className="zl-chips">
            <button type="button" className="zl-chip" aria-pressed={adjust} onClick={() => setAdjust((v) => !v)}>Chỉnh mặt phẳng đứng</button>
            <button type="button" className="zl-chip" aria-pressed={fx} onClick={() => setFx((v) => !v)}>Hiệu ứng: hạc, bướm, cánh hoa</button>
            <button type="button" className="zl-chip" disabled={!!busy || !info?.enabled || !!clip} onClick={() => make(`bg-${bg.id}`, { step: 'bgclip', bg: bg.id })}>
              {clip ? 'Đã có nền động' : busy === `bg-${bg.id}` ? 'Đang làm nền động (1–4 phút)…' : `Làm nền động (~${usd(info?.gardenUsd.bg || 0.7)}, một lần)`}
            </button>
          </div>
        </div>
        {adjust && (
          <div className="zl-row"><span>Mặt phẳng: thú chỉ đứng trong dải này</span>
            <label className="zl-range">Mép xa (nhỏ) {Math.round(lay.plane.y0 * 100)}%<input type="range" min={30} max={95} value={Math.round(lay.plane.y0 * 100)} onChange={(e) => setPlane({ y0: Number(e.target.value) / 100, y1: lay.plane.y1 })} /></label>
            <label className="zl-range">Mép gần (to) {Math.round(lay.plane.y1 * 100)}%<input type="range" min={34} max={99} value={Math.round(lay.plane.y1 * 100)} onChange={(e) => setPlane({ y0: lay.plane.y0, y1: Number(e.target.value) / 100 })} /></label>
            <p className="zl-note">Dải vàng trên tranh là chỗ chân thú được đứng. Kéo cho khớp với mặt đất phẳng của nền.</p>
          </div>
        )}
        {err && <p className="zl-err">{err}</p>}
      </section>

      <div className="zs-scroll">
        <div ref={stage} className="zs-stage" style={{ aspectRatio: '16 / 9' }} onPointerDown={() => setSel(null)}>
          <img className="zs-bg" src={bg.src} alt="" />
          {clip && <div className="zs-bgvid"><LoopVideo src={mediaUrl(clip.id, clip.url)} poster={bg.src} label="Nền chuyển động" /></div>}
          {fx && <Ambient layer="back" river={!!bg.river} />}
          <div className="zs-fog zs-fog-b" aria-hidden="true"><div className="zl-mist zl-mist-b" /></div>
          <div className="zs-items">
            {lay.items.map((it) => {
              const c = cutById.get(it.cut);
              if (!c) return null;
              const box = boxes[c.id], z = 10 + Math.round(it.y * 1000) * 2;
              const f = box ? frameOf(lay.plane, box, it, ASPECT) : null;
              return (
                <Fragment key={it.uid}>
                  <Creature c={c} it={it} plane={lay.plane} box={box} z={z} onBox={(b) => setBoxes((o) => ({ ...o, [c.id]: b }))} onFail={() => setErr('Thiết bị này không vẽ được thú tách nền (video cần cho phép CORS).')} />
                  {f && box && (
                    <div className={`zs-hit${sel === it.uid ? ' on' : ''}`} style={{ left: pc(f.left + box.x0 * f.width), top: pc(f.top + box.y0 * f.height), width: pc((box.x1 - box.x0) * f.width), height: pc((box.y1 - box.y0) * f.height), zIndex: z + 2 }}
                      onPointerDown={(e) => grab(it.uid, e)} onPointerMove={carry} onPointerUp={drop} onPointerCancel={drop} />
                  )}
                </Fragment>
              );
            })}
          </div>
          <div className="zs-fog zs-fog-f" style={{ ['--mist' as string]: 0.16 }} aria-hidden="true"><div className="zl-mist zl-mist-f" /></div>
          {fx && <Ambient layer="front" river={!!bg.river} />}
          {adjust && <div className="zs-plane" style={{ top: pc(lay.plane.y0 * 100), height: pc((lay.plane.y1 - lay.plane.y0) * 100) }}><b>xa</b><b>gần</b></div>}
        </div>
      </div>

      {selItem && selCut && (
        <section className="zl-panel zs-sel">
          <div className="zl-row"><span>Đã chọn: {spName(selCut.sp)} · {mutName(selCut.mut)}</span>
            <div className="zl-chips">
              <button type="button" className="zl-chip" onClick={() => patch(selItem.uid, (i) => ({ ...i, flip: !i.flip }))}>Quay mặt</button>
              <button type="button" className="zl-chip" onClick={() => { upd((l) => ({ ...l, items: l.items.filter((i) => i.uid !== selItem.uid) })); setSel(null); }}>Xóa khỏi nền</button>
            </div>
            <label className="zl-range">Cỡ ×{selItem.k.toFixed(2)}<input type="range" min={K_RANGE.min * 100} max={K_RANGE.max * 100} value={Math.round(selItem.k * 100)} onChange={(e) => patch(selItem.uid, (i) => ({ ...i, k: Number(e.target.value) / 100 }))} /></label>
          </div>
        </section>
      )}

      <section className="zl-panel">
        <div className="zl-row"><span>Khay thú ({cuts.length}) · {lay.items.length}/{MAX_ITEMS} trên nền này</span>
          <div className="zs-tray">
            {cuts.length === 0 && <p className="zl-note">Chưa có thú nào có clip đứng yên đã tách nền. Làm ở khung bên dưới.</p>}
            {cuts.map((c) => (
              <div key={c.id} className="zs-tile-t" onPointerDown={(e) => pull(c, e)}>
                {c.pic ? <img src={`/api/img/${c.pic}?s=sm`} alt="" draggable={false} /> : <i />}
                <span>{spName(c.sp)}</span><em>{mutName(c.mut)}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="zl-panel">
        <div className="zl-row"><span>Thêm thú vào khay</span>
          <div className="zs-pick">
            <select className="zl-in" value={sp} disabled={running} onChange={(e) => setSp(e.target.value)}>
              {(info?.species || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select className="zl-in" value={mut} disabled={running} onChange={(e) => setMut(e.target.value)}>
              <option value={BASE}>Nguyên bản</option>
              {MUTATIONS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {info && <p className="zl-note">{have ? 'Thú này đã có trong khay.' : `Một clip đứng yên 5 giây + tách nền ≈ ${usd(need)} (${mut !== BASE ? `${usd(info.gardenUsd.edit)} vẽ dị biến + ` : ''}${usd(info.gardenUsd.clip)} clip + ${usd(info.gardenUsd.cut)} tách nền), dùng cho mọi nền. Đã dùng ${usd(info.spent)} / ${usd(info.cap)}.`}{!info.enabled && ' fal chưa bật: cần FAL_KEY (IMAGE_PROVIDER=fal).'}{over && ' Vượt hạn mức.'}</p>}
          {note && <p className="zl-note">{note}</p>}
        </div>
        {info && <p className="zl-note">{info.blob.on ? `Video lưu ở Blob: đã dùng ${info.blob.mb} MB (gói Hobby có 1024 MB).` : 'Blob chưa bật (thiếu BLOB_READ_WRITE_TOKEN): video đang lưu trong database, mỗi lần xem tốn transfer Neon.'}</p>}
        <div className="zl-actions">
          <button className="zl-btn" type="button" onClick={newCreature} disabled={running || !info?.enabled || !sp || have || over}>{running ? 'Đang làm…' : 'Tạo thú'}</button>
          {running && <button className="zl-btn zl-ghost" type="button" onClick={() => { stop.current = true; }}>Dừng</button>}
        </div>
      </section>

      {ghost && <div className="zs-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.c.pic ? <img src={`/api/img/${ghost.c.pic}?s=sm`} alt="" draggable={false} /> : <i />}</div>}
    </main>
  );
}
