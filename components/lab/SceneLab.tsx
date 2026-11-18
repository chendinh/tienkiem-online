'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import { BASE, MUTATIONS } from '@/lib/anim';
import { errText } from '@/lib/strings';
import { AlphaVideo } from './AlphaVideo';

// Lab scene: cut-out creatures (made in /lab/linh-thu) walk, run and rest on a background picture. The creature plays its walk or run clip while it
// travels and stands on the first frame of the walk (or plays its idle clip) while it rests. Position, size by depth and facing are set on the DOM
// directly each frame: nothing re-renders while a creature moves. Limits: a few creatures at once (each one decodes two videos).
const KEY = 'tutien-admin-key';
const FLIPS = 'tk-lab-flips';   // per species: 1 or -1, whether the clip faces the other way (the models draw it facing either side)
const MAX = 3;
interface Cut { id: string; alpha: string; sp: string; mut: string; motion: string }
interface Def { key: string; sp: string; name: string; clips: Record<string, { id: string; alpha: string }> }
type Mode = 'idle' | 'walk' | 'run';

const ZONE_IDS = ['thanhvan', 'xichviem', 'hannguyet', 'loivan', 'cuuu', 'tinhha'];
const BGS = [...ZONE_IDS.map((id) => ({ id, name: C.ZONES.find((z) => z.id === id)?.name || id })), { id: 'dawn', name: 'Bình minh' }, { id: 'night', name: 'Đêm' }];
const bgUrl = (id: string, portrait: boolean) => (id === 'dawn' || id === 'night' ? `/art/scene/${id}.webp` : `/art/zones/${id}${portrait ? '_v' : ''}.jpg`);

export function SceneLab() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [bg, setBg] = useState('thanhvan');
  const [own, setOwn] = useState('');          // a background the owner picked from the phone
  const [portrait, setPortrait] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [flips, setFlips] = useState<Record<string, number>>({});

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } try { setFlips(JSON.parse(localStorage.getItem(FLIPS) || '{}')); } catch {} }, []);
  useEffect(() => {
    const m = matchMedia('(orientation: portrait)'), f = () => setPortrait(m.matches);
    f(); m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  useEffect(() => () => { if (own) URL.revokeObjectURL(own); }, [own]);

  const load = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/lab/anim?cuts=1', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setCuts(j.cuts as Cut[]);
      setNames(Object.fromEntries((j.species as { id: string; name: string }[]).map((s) => [s.id, s.name])));
    } catch { setErr('Không gọi được máy chủ.'); }
  }, []);
  useEffect(() => { if (key) void load(key); }, [key, load]);

  // one creature (a species, plain or mutated) with all the cut-out clips it has
  const defs = useMemo(() => {
    const out: Record<string, Def> = {};
    for (const c of cuts) {
      const k = `${c.sp}:${c.mut}`;
      const mn = c.mut === BASE ? '' : `${MUTATIONS.find((m) => m.id === c.mut)?.name || c.mut} `;
      (out[k] ||= { key: k, sp: c.sp, name: `${mn}${names[c.sp] || c.sp}`, clips: {} }).clips[c.motion] = { id: c.id, alpha: c.alpha };
    }
    return Object.values(out);
  }, [cuts, names]);
  const picked = defs.filter((d) => chosen.includes(d.key));
  const setFlip = (sp: string) => setFlips((f) => { const n = { ...f, [sp]: (f[sp] || 1) * -1 }; try { localStorage.setItem(FLIPS, JSON.stringify(n)); } catch {} return n; });

  if (key === null) return null;
  if (!key) {
    return (
      <main className="zl">
        <h1>Cảnh thử · Linh Thú</h1>
        <form className="zl-panel" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) setKey(typed.trim()); }}>
          <p className="zl-note">Trang của chủ game: nhập ADMIN_KEY (cùng khóa với trang báo cáo).</p>
          <input className="zl-in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" />
          <button className="zl-btn" type="submit">Mở</button>
          {err && <p className="zl-err">{err}</p>}
        </form>
      </main>
    );
  }
  return (
    <main className="zl">
      <h1>Cảnh thử · Linh Thú</h1>
      <p className="zl-note">Thú trong suốt tự đi, chạy và nghỉ trên nền ảnh. <a className="zl-link" href="/lab/linh-thu">← Về xưởng làm ảnh</a></p>

      <section className="zl-panel">
        <label className="zl-row"><span>Nền</span>
          <select className="zl-in" value={own ? 'own' : bg} onChange={(e) => { if (e.target.value !== 'own') { setOwn(''); setBg(e.target.value); } }}>
            {own && <option value="own">Ảnh của ngươi</option>}
            {BGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="zl-row"><span>Hoặc ảnh nền của ngươi</span>
          <input className="zl-in" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setOwn(URL.createObjectURL(f)); }} />
        </label>
        <div className="zl-row"><span>Thú trong cảnh (tối đa {MAX})</span>
          {defs.length === 0 ? <p className="zl-note">Chưa có thú nào được tách nền. Vào xưởng, bật "Tách nền", tạo chuyển động Đi bộ cho một loài.</p>
            : <div className="zl-chips">{defs.map((d) => <button key={d.key} type="button" className="zl-chip" aria-pressed={chosen.includes(d.key)} onClick={() => setChosen((a) => (a.includes(d.key) ? a.filter((x) => x !== d.key) : [...a, d.key].slice(-MAX)))}>{d.name}{d.clips.walk || d.clips.run ? '' : ' (đứng yên)'}</button>)}</div>}
        </div>
        {picked.length > 0 && <div className="zl-row"><span>Nếu thú đi lùi, lật hướng</span>
          <div className="zl-chips">{picked.map((d) => <button key={d.sp} type="button" className="zl-chip zl-sm" onClick={() => setFlip(d.sp)}>{d.name} ⇄</button>)}</div></div>}
        {err && <p className="zl-err">{err}</p>}
      </section>

      <div className="zl-stage">
        <img className="zl-bg" src={own || bgUrl(bg, portrait)} alt="" />
        <div className="zl-field">{picked.map((d) => <Actor key={d.key} def={d} flip={flips[d.sp] || 1} />)}</div>
      </div>
    </main>
  );
}

// A creature: it rests for a few seconds, picks a spot, walks or runs there (turning towards it), rests again.
// Depth: the lower on the picture, the nearer and the larger, and the nearer one is drawn over the farther.
function Actor({ def, flip }: { def: Def; flip: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const c = def.clips, canMove = !!(c.walk || c.run);

  useEffect(() => {
    const el = root.current, stage = el?.parentElement?.parentElement;
    if (!el || !stage) return;
    let x = 0.2 + Math.random() * 0.6, y = 0.66 + Math.random() * 0.2, tx = x, ty = y, dir = Math.random() < 0.5 ? 1 : -1;
    let m: Mode = 'idle', speed = 0, until = performance.now() + 600 + Math.random() * 1800, last = performance.now(), raf = 0;
    const put = () => {
      const s = 0.55 + 0.6 * ((y - 0.62) / 0.3);
      el.style.left = `${x * 100}%`; el.style.top = `${y * 100}%`; el.style.zIndex = String(Math.round(y * 100));
      el.style.setProperty('--s', s.toFixed(3)); el.style.setProperty('--f', String(dir));
    };
    const to = (next: Mode) => { if (m !== next) { m = next; setMode(next); } };
    const plan = (now: number) => {
      if (!canMove) { until = now + 4000; return; }
      tx = 0.1 + Math.random() * 0.8; ty = 0.64 + Math.random() * 0.24;
      const run = !!c.run && (!c.walk || Math.random() < 0.25);
      speed = run ? 0.2 : 0.075;   // stage widths per second
      dir = tx >= x ? 1 : -1;
      to(run ? 'run' : 'walk');
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (m === 'idle') { if (now >= until) plan(now); }
      else {
        const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
        const dx = (tx - x) * w, dy = (ty - y) * h, d = Math.hypot(dx, dy), step = speed * w * dt;
        if (d <= step) { x = tx; y = ty; until = now + 2000 + Math.random() * 4000; to('idle'); }
        else { x += (dx / d) * step / w; y += (dy / d) * step / h; }
      }
      put();
    };
    put(); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [def, canMove, c.run, c.walk]);

  const moving = mode !== 'idle';
  const clip = moving ? (mode === 'run' ? c.run || c.walk : c.walk || c.run) : c.idle || c.walk || c.run;
  const hold = !moving && !c.idle;   // no idle clip: stand on the first frame of the walk, which is the standing picture
  return (
    <div ref={root} className="zl-actor" style={{ '--flip': flip } as CSSProperties}>
      <div className="zl-shadow" />
      <div className="zl-fig">{clip && <AlphaVideo rgb={`/api/lab/media/${clip.id}`} alpha={`/api/lab/media/${clip.alpha}`} playing={!hold} />}</div>
    </div>
  );
}
