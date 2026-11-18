'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import { BASE, MUTATIONS } from '@/lib/anim';
import { SPEED, SPEED_RANGE, grassPath, gradeAt, lookOf, nextMove, pickSpot, scaleAt, shadowAt, speedAt, turn, type Look, type Mote, type Move } from '@/lib/scene';
import { errText } from '@/lib/strings';
import { AlphaVideo, newGrade, type Grade } from './AlphaVideo';

// Lab scene: cut-out creatures (made in /lab/linh-thu) live on a background picture, in layers so they sit INSIDE it:
//   picture (far) -> far motes -> back mist -> creatures -> front mist -> foreground (grass or rocks, over the feet) -> near motes
// The layers slide against each other (parallax) by the phone's tilt, the pointer, or a slow drift. Creature position, size, grade and facing are set on the
// DOM each frame, so nothing re-renders while a creature moves. Limits: a few creatures at once (each one decodes two videos, or four while it changes clip).
const KEY = 'tutien-admin-key';
const FLIPS = 'tk-lab-flips';   // per species: 1 or -1, whether the clip faces the other way (the models draw it facing either side)
const SPEEDS = 'tk-lab-speeds'; // per creature: stage widths per second for walk and run, tuned by eye until the feet stop sliding
const MAX = 3;
const ACT_MS = 5000;            // a roar or an aura clip is 5 s: the creature goes back to rest after it
interface Cut { id: string; alpha: string; sp: string; mut: string; motion: string }
interface Def { key: string; sp: string; name: string; clips: Record<string, { id: string; alpha: string }> }
interface Sel { id: string; alpha: string; hold: boolean }
type Speeds = Record<string, { walk: number; run: number }>;

const ZONE_IDS = ['thanhvan', 'xichviem', 'hannguyet', 'loivan', 'cuuu', 'tinhha'];
const BGS = [...ZONE_IDS.map((id) => ({ id, name: C.ZONES.find((z) => z.id === id)?.name || id })), { id: 'dawn', name: 'Bình minh' }, { id: 'night', name: 'Đêm' }];
const bgUrl = (id: string, portrait: boolean) => (id === 'dawn' || id === 'night' ? `/art/scene/${id}.webp` : `/art/zones/${id}${portrait ? '_v' : ''}.jpg`);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function SceneLab() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [fgs, setFgs] = useState<{ id: string; zone: string }[]>([]);
  const [fgUsd, setFgUsd] = useState(0.06);
  const [names, setNames] = useState<Record<string, string>>({});
  const [bg, setBg] = useState('thanhvan');
  const [own, setOwn] = useState('');          // a background the owner picked from the phone
  const [portrait, setPortrait] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [flips, setFlips] = useState<Record<string, number>>({});
  const [speeds, setSpeeds] = useState<Speeds>({});
  const [front, setFront] = useState<'auto' | 'grass' | 'none'>('auto');
  const [fgBusy, setFgBusy] = useState(false);
  const [tilt, setTilt] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const L = { bg: useRef<HTMLDivElement>(null), mist: useRef<HTMLDivElement>(null), field: useRef<HTMLDivElement>(null), near: useRef<HTMLDivElement>(null), fg: useRef<HTMLDivElement>(null) };
  const tiltV = useRef(0), pointerV = useRef(0), onTilt = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } setFlips(read(FLIPS, {})); setSpeeds(read(SPEEDS, {})); }, []);
  useEffect(() => {
    const m = matchMedia('(orientation: portrait)'), f = () => setPortrait(m.matches);
    f(); m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  useEffect(() => () => { if (own) URL.revokeObjectURL(own); }, [own]);
  useEffect(() => () => { if (onTilt.current) window.removeEventListener('deviceorientation', onTilt.current); }, []);

  const load = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/lab/anim?cuts=1', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setCuts(j.cuts as Cut[]); setFgs((j.fgs || []) as { id: string; zone: string }[]); if (j.fgUsd) setFgUsd(j.fgUsd);
      setNames(Object.fromEntries((j.species as { id: string; name: string }[]).map((s) => [s.id, s.name])));
    } catch { setErr('Không gọi được máy chủ.'); }
  }, []);
  useEffect(() => { if (key) void load(key); }, [key, load]);

  // the layers slide against each other: the farther the layer, the less it moves. Each is sized to the stage and scaled up a little so its edge never shows.
  useEffect(() => {
    if (calm()) return;
    const K: [keyof typeof L, number, number][] = [['bg', 1, 1.05], ['mist', 1.6, 1.06], ['field', 2.4, 1], ['near', 3.2, 1.08], ['fg', 4.5, 1.1]];
    let raf = 0, cam = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      cam += (clamp(Math.sin(t / 9000) * 0.35 + tiltV.current + pointerV.current, -1, 1) - cam) * 0.06;
      for (const [k, d, s] of K) { const el = L[k].current; if (el) el.style.transform = `translate3d(${(-cam * d).toFixed(3)}%,0,0) scale(${s})`; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enableTilt() {
    const D: any = (window as any).DeviceOrientationEvent;
    try { if (D && typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') return; } catch { return; }
    const f = (e: DeviceOrientationEvent) => { tiltV.current = clamp((e.gamma || 0) / 22, -1, 1); };
    onTilt.current = f; window.addEventListener('deviceorientation', f); setTilt(true);
  }

  // the foreground layer of this zone, drawn by fal from the zone's own picture
  const zone = !own && ZONE_IDS.includes(bg) ? bg : '';
  const fgId = zone && !portrait ? fgs.find((f) => f.zone === zone)?.id : undefined;
  async function makeFg() {
    if (!key || !zone) return;
    setFgBusy(true); setErr('');
    try {
      for (let n = 0; n < 90; n++) {
        const r = await fetch('/api/lab/anim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ step: 'fg', zone }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setErr(errText(String(j.code || 'E_SERVER'))); break; }
        if (j.status === 'ready') { await load(key); break; }
        if (j.status !== 'pending') { setErr(j.why || ({ limited: 'Hết hạn mức của lab', disabled: 'fal chưa được bật' } as Record<string, string>)[j.status] || 'Lỗi'); break; }
        await sleep(4000);
      }
    } catch { setErr('Không gọi được máy chủ.'); } finally { setFgBusy(false); }
  }

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
  const look = useMemo(() => lookOf(own ? 'own' : bg), [own, bg]);
  const setFlip = (sp: string) => setFlips((f) => { const n = { ...f, [sp]: (f[sp] || 1) * -1 }; save(FLIPS, n); return n; });
  const setSpeed = (k: string, m: 'walk' | 'run', v: number) => setSpeeds((s) => { const n = { ...s, [k]: { ...{ walk: SPEED.walk, run: SPEED.run }, ...s[k], [m]: v } }; save(SPEEDS, n); return n; });

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
  const showImg = front !== 'none' && front !== 'grass' && !!fgId;
  const showGrass = front === 'grass' || (front === 'auto' && !fgId);
  const mc = { '--mist': String(look.mist), '--mc': look.mistColor } as CSSProperties;
  return (
    <main className="zl">
      <h1>Cảnh thử · Linh Thú</h1>
      <p className="zl-note">Thú trong suốt tự đi, chạy và nghỉ trên nền nhiều lớp. <a className="zl-link" href="/lab/linh-thu">← Về xưởng làm ảnh</a></p>

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
        {!look.ground && <p className="zl-note">Nền này không có mặt đất (đảo trôi, vũ trụ): thú chỉ đứng được ở mép dưới và trông như lơ lửng. Nền hợp nhất: Thanh Vân, Hàn Nguyệt, Lôi Vân.</p>}
        <div className="zl-row"><span>Lớp che phía trước</span>
          <div className="zl-chips">
            {([['auto', 'Tự động'], ['grass', 'Cỏ vẽ sẵn'], ['none', 'Không']] as const).map(([v, n]) => <button key={v} type="button" className="zl-chip zl-sm" aria-pressed={front === v} onClick={() => setFront(v)}>{n}</button>)}
            {zone && !fgId && !portrait && <button type="button" className="zl-chip zl-sm" disabled={fgBusy} onClick={makeFg}>{fgBusy ? 'Đang vẽ lớp che…' : `Vẽ lớp che bằng fal (~$${fgUsd.toFixed(2)})`}</button>}
            {fgId && <span className="zl-note">Đã có lớp che fal cho nền này.</span>}
            {zone && portrait && <span className="zl-note">Lớp che fal chỉ có cho màn ngang; màn dọc dùng cỏ vẽ sẵn.</span>}
          </div>
        </div>
        {typeof DeviceOrientationEvent !== 'undefined' && !tilt && <div className="zl-row"><span>Nghiêng máy</span><button type="button" className="zl-chip zl-sm" onClick={enableTilt}>Bật nghiêng máy để cảnh lệch theo tay</button></div>}
        <div className="zl-row"><span>Thú trong cảnh (tối đa {MAX})</span>
          {defs.length === 0 ? <p className="zl-note">Chưa có thú nào được tách nền. Vào xưởng, bật "Tách nền", tạo chuyển động Đi bộ cho một loài.</p>
            : <div className="zl-chips">{defs.map((d) => <button key={d.key} type="button" className="zl-chip" aria-pressed={chosen.includes(d.key)} onClick={() => setChosen((a) => (a.includes(d.key) ? a.filter((x) => x !== d.key) : [...a, d.key].slice(-MAX)))}>{d.name}{d.clips.walk || d.clips.run ? '' : ' (đứng yên)'}</button>)}</div>}
        </div>
        {picked.map((d) => {
          const sp = { walk: SPEED.walk, run: SPEED.run, ...speeds[d.key] };
          return (
            <div key={d.key} className="zl-row zl-tune"><span>{d.name}</span>
              <button type="button" className="zl-chip zl-sm" onClick={() => setFlip(d.sp)}>Lật hướng ⇄</button>
              {d.clips.walk && <label className="zl-range">Bước đi <input type="range" min={SPEED_RANGE.min} max={SPEED_RANGE.max} step={0.005} value={sp.walk} onChange={(e) => setSpeed(d.key, 'walk', Number(e.target.value))} /></label>}
              {d.clips.run && <label className="zl-range">Bước chạy <input type="range" min={SPEED_RANGE.min} max={SPEED_RANGE.max} step={0.005} value={sp.run} onChange={(e) => setSpeed(d.key, 'run', Number(e.target.value))} /></label>}
            </div>
          );
        })}
        {picked.length > 0 && <p className="zl-note">Chân trượt trên đất: kéo "Bước đi/chạy" nhỏ lại (thú đi chậm hơn) hoặc lớn lên cho tới khi chân bám đất. Thú nghỉ vài giây, đi, chạy, thỉnh thoảng gầm hoặc dâng hào quang nếu có clip đó.</p>}
        {err && <p className="zl-err">{err}</p>}
      </section>

      <div ref={stage} className="zl-stage" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); pointerV.current = (((e.clientX - r.left) / Math.max(1, r.width)) - 0.5) * 1.2; }} onPointerLeave={() => { pointerV.current = 0; }}>
        <div ref={L.bg} className="zl-lay zl-lay-bg"><img className="zl-bg" src={own || bgUrl(bg, portrait)} alt="" /></div>
        <Motes key={`f${bg}${own}`} kind={look.motes} near={false} />
        <div ref={L.mist} className="zl-lay" style={mc}><div className="zl-mist zl-mist-b" /></div>
        <div ref={L.field} className="zl-lay"><div className="zl-field">{picked.map((d) => <Actor key={d.key + bg + own} def={d} flip={flips[d.sp] || 1} look={look} speed={{ walk: SPEED.walk, run: SPEED.run, ...speeds[d.key] }} />)}</div></div>
        <div ref={L.near} className="zl-lay zl-lay-up" style={mc}><div className="zl-mist zl-mist-f" /></div>
        <div ref={L.fg} className="zl-lay zl-lay-up">
          {showImg && <img className="zl-fgimg" src={`/api/img/${fgId}`} alt="" />}
          {showGrass && <Grass color={look.grass} />}
        </div>
        <Motes key={`n${bg}${own}`} kind={look.motes} near />
      </div>
    </main>
  );
}

// ---- foreground drawn in code: two rows of grass blades along the bottom, swaying. Used when no fal foreground exists (or on a phone held upright).
function Grass({ color }: { color: string }) {
  const back = useMemo(() => grassPath(7, 46, 14, 46), []), front = useMemo(() => grassPath(21, 34, 8, 30), []);
  return (
    <div className="zl-grass" style={{ '--g': color } as CSSProperties}>
      <svg className="zl-grass-b" viewBox="0 0 1000 100" preserveAspectRatio="none"><path d={back} /></svg>
      <svg className="zl-grass-f" viewBox="0 0 1000 100" preserveAspectRatio="none"><path d={front} /></svg>
    </div>
  );
}

// ---- drifting lights: fireflies, embers, sparks, snow or stars. The far set is small and slow behind the creatures; the near set is big, blurred and fast in front.
const MOTE_RGB: Record<Mote, string> = { firefly: '240,235,150', wisp: '150,240,230', ember: '255,150,60', spark: '190,170,255', snow: '235,245,255', star: '255,235,200' };
function Motes({ kind, near }: { kind: Mote; near: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx || calm()) return;
    const rgb = MOTE_RGB[kind], k = near ? 2 : 1;
    const P = Array.from({ length: near ? 9 : 26 }, () => ({ x: Math.random(), y: Math.random(), r: (near ? 2.8 : 1.2) * (0.6 + Math.random() * 0.8), ph: Math.random() * 6.28, sp: 0.5 + Math.random() }));
    const rise = kind === 'ember' ? -1 : kind === 'snow' ? 1 : 0;
    let w = 1, h = 1, d = 1, raf = 0, last = performance.now();
    const size = () => { const r = cv.getBoundingClientRect(); d = Math.min(1.5, window.devicePixelRatio || 1); w = cv.width = Math.max(1, Math.round(r.width * d)); h = cv.height = Math.max(1, Math.round(r.height * d)); };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = kind === 'snow' ? 'source-over' : 'lighter';
      for (const p of P) {
        p.ph += dt * p.sp * (kind === 'spark' ? 5 : 1.6);
        p.x += Math.sin(p.ph) * 0.02 * k * dt + (kind === 'snow' ? 0.004 * k * dt : 0);
        p.y += (rise ? rise * 0.05 * p.sp * k : Math.cos(p.ph * 0.7) * 0.012 * k) * dt;
        if (p.x < -0.05) p.x = 1.05; else if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05; else if (p.y > 1.05) p.y = -0.05;
        const a = (kind === 'spark' ? (Math.sin(p.ph * 3) > 0.8 ? 1 : 0.2) : kind === 'ember' || kind === 'snow' ? 0.8 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph * 2))) * (near ? 0.6 : 1);
        const x = p.x * w, y = p.y * h, r = p.r * d;
        ctx.fillStyle = `rgba(${rgb},${(a * 0.14).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, near]);
  return <canvas ref={ref} className={`zl-motes ${near ? 'zl-motes-n' : ''}`} aria-hidden="true" />;
}

// ---- a creature. It rests, then picks something to do: walk or run to a spot (turning towards it), or roar. Everything it looks like follows where it stands in the ground band.
function Actor({ def, flip, look, speed }: { def: Def; flip: number; look: Look; speed: { walk: number; run: number } }) {
  const root = useRef<HTMLDivElement>(null), shadow = useRef<HTMLDivElement>(null);
  const grade = useRef<Grade>(newGrade());
  const spd = useRef(speed); spd.current = speed;
  const c = def.clips;
  const has = { walk: !!c.walk, run: !!c.run, act: !!(c.roar || c.aura) };
  const [mode, setMode] = useState<Move>('rest');

  useEffect(() => {
    const el = root.current, field = el?.parentElement;
    if (!el || !field) return;
    const sp0 = pickSpot(look, Math.random);
    let x = sp0.x, y = sp0.y, tx = x, ty = y, dir = Math.random() < 0.5 ? 1 : -1, face = dir;
    let m: Move = 'rest', until = performance.now() + 600 + Math.random() * 1800, last = performance.now(), puffAt = 0, lastY = -1, raf = 0;
    const set = (next: Move) => { if (m !== next) { m = next; setMode(next); } };
    const put = () => {
      el.style.left = `${x * 100}%`; el.style.top = `${y * 100}%`; el.style.zIndex = String(Math.round(y * 100));
      el.style.setProperty('--s', scaleAt(look, y).toFixed(3)); el.style.setProperty('--f', face.toFixed(3));
      if (Math.abs(y - lastY) > 0.002) {
        lastY = y;
        const g = gradeAt(look, y), sh = shadowAt(look, y), G = grade.current;
        G.haze = g.haze; G.amt = g.amt; G.bright = g.bright; G.sat = g.sat; G.v++;
        el.style.setProperty('--sx', sh.dx.toFixed(3)); el.style.setProperty('--sa', sh.a.toFixed(3));
      }
    };
    const puff = () => {
      const d = document.createElement('i'); d.className = 'zl-puff';
      d.style.left = `${(x - dir * 0.012) * 100}%`; d.style.top = `${y * 100}%`; d.style.zIndex = String(Math.round(y * 100) - 1);
      d.style.setProperty('--s', scaleAt(look, y).toFixed(3)); d.style.setProperty('--pc', `rgb(${look.haze.map((v) => Math.min(255, v + 40)).join(',')})`);
      d.addEventListener('animationend', () => d.remove()); field.appendChild(d);
    };
    const decide = (now: number) => {
      const next = nextMove(has, Math.random);
      if (next === 'walk' || next === 'run') {
        const t = pickSpot(look, Math.random); tx = t.x; ty = t.y; dir = tx >= x ? 1 : -1; set(next);
      } else if (next === 'act') { until = now + ACT_MS; set('act'); }
      else { until = now + 2500 + Math.random() * 4000; set('rest'); }
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      face = turn(face, dir, dt);
      if (m === 'rest' || m === 'act') { if (now >= until) decide(now); }
      else {
        const w = field.clientWidth || 1, h = field.clientHeight || 1;
        const dx = (tx - x) * w, dy = (ty - y) * h, d = Math.hypot(dx, dy), step = speedAt(m === 'run' ? spd.current.run : spd.current.walk, look, y) * w * dt;
        if (d <= step) { x = tx; y = ty; until = now + 2000 + Math.random() * 4000; set('rest'); }
        else {
          x += (dx / d) * step / w; y += (dy / d) * step / h;
          if (m === 'run' && !calm() && now - puffAt > 170) { puffAt = now; puff(); }
        }
      }
      put();
    };
    put(); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, look, has.walk, has.run, has.act]);

  // which clip shows for the mode; a creature with no rest clip stands on the first frame of its walk (the standing pose)
  const sel: Sel | null = useMemo(() => {
    const pick = (k: string | undefined, hold = false) => (k && c[k] ? { ...c[k], hold } : null);
    const rest = pick('idle') || pick('walk', true) || pick('run', true) || pick('roar', true) || pick('aura', true);
    if (mode === 'walk') return pick('walk') || pick('run') || rest;
    if (mode === 'run') return pick('run') || pick('walk') || rest;
    if (mode === 'act') return pick('roar') || pick('aura') || rest;
    return rest;
  }, [mode, c]);
  // when the clip changes, the old one fades out while the new one fades in (a plain cut would jump)
  const [shown, setShown] = useState<{ cur: Sel | null; prev: Sel | null }>({ cur: sel, prev: null });
  useEffect(() => {
    setShown((s) => (s.cur?.id === sel?.id ? { cur: sel, prev: s.prev } : { cur: sel, prev: s.cur }));
    const t = setTimeout(() => setShown((s) => (s.prev ? { cur: s.cur, prev: null } : s)), 320);
    return () => clearTimeout(t);
  }, [sel]);

  const layers: { s: Sel; out: boolean }[] = [];
  if (shown.prev) layers.push({ s: shown.prev, out: true });
  if (shown.cur) layers.push({ s: shown.cur, out: false });
  return (
    <div ref={root} className="zl-actor" style={{ '--flip': flip } as CSSProperties}>
      <div ref={shadow} className="zl-shadow" />
      <div className="zl-fig">
        {/* keyed by clip, not by role: a clip that goes from "new" to "old" keeps playing instead of restarting */}
        {layers.map(({ s, out }) => <div key={s.id} className={`zl-xf ${out ? 'zl-xf-out' : 'zl-xf-in'}`}><AlphaVideo rgb={`/api/lab/media/${s.id}`} alpha={`/api/lab/media/${s.alpha}`} playing={!s.hold} grade={grade} /></div>)}
      </div>
    </div>
  );
}
