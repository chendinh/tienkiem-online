'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointer } from 'react';
import { FEATURE, GALAXIES, galaxyOf, gxPic, type Galaxy as G } from '@/lib/galaxy';
import { Icon } from '@/components/ds/Icon';
import { sfx } from '@/lib/audio';

// Vạn Giới Tinh Đồ. One star chart (the "map") and one close-up scene per galaxy.
// The camera is one transform on the map layer (GPU only): choosing a galaxy flies the camera into it while the close-up fades in over the top;
// choosing another galaxy pans the camera across the chart (with a small pull-back in the middle) and fades the next close-up in at the end.
// Only transform and opacity are animated anywhere on this page, so it stays smooth on a phone.
interface Cam { tx: number; ty: number; z: number }
const FACT_ICON: Record<string, string> = { rank: 'rise', beast: 'paw', weapon: 'atk', board: 'crown', rule: 'taiji' };
const ZOOM = { land: 2.7, port: 3.1 };

function rng(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashOf = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxLevel = () => (typeof document !== 'undefined' && document.documentElement.dataset.fx) || 'mid';

// how many light pieces each galaxy's own effect has (the look of each is in galaxy.css: .fx-<id>)
const FX_PARTS: Record<string, number> = { thienhuyen: 3, huyenminh: 2, xichdiem: 2, thanhde: 4, tutieu: 1, hondon: 2 };

// the living parts of a close-up: specks drifting up, stars that blink, a shooting star now and then, a breathing glow (all CSS, transform and opacity only)
function Air({ g }: { g: G }) {
  const bits = useMemo(() => {
    const r = rng(hashOf(g.id));
    const specks = Array.from({ length: 22 }, () => ({ x: r() * 100, s: 1.5 + r() * 3.5, dx: (r() - 0.5) * 80, dur: 14 + r() * 18, delay: -r() * 30 }));
    const blink = Array.from({ length: 18 }, () => ({ x: r() * 100, y: r() * 70, s: 1.5 + r() * 2.5, dur: 2.5 + r() * 4, delay: -r() * 6 }));
    return { specks, blink };
  }, [g.id]);
  return (
    <div className="gx-air" aria-hidden style={{ '--a': g.accent, '--g': g.glow } as CSSProperties}>
      <div className="gx-breath" data-depth="0.4" />
      <div className="gx-up" data-depth="1">
        {bits.specks.map((k, i) => <i key={i} style={{ left: `${k.x}%`, '--s': `${k.s}px`, '--dx': `${k.dx}px`, animationDuration: `${k.dur}s`, animationDelay: `${k.delay}s` } as CSSProperties} />)}
      </div>
      <div className="gx-blink" data-depth="0.6">
        {bits.blink.map((k, i) => <b key={i} style={{ left: `${k.x}%`, top: `${k.y}%`, '--s': `${k.s}px`, animationDuration: `${k.dur}s`, animationDelay: `${k.delay}s` } as CSSProperties} />)}
      </div>
      <s className="gx-meteor" style={{ animationDelay: `${(hashOf(g.id) % 7) + 2}s` }} />
      <div className={`gx-fx fx-${g.id}`} data-depth="0.7">{Array.from({ length: FX_PARTS[g.id] ?? 0 }, (_, i) => <i key={i} />)}{g.id === 'tutieu' ? <b /> : null}</div>
    </div>
  );
}

// twinkling stars, glints and slow-pulsing galaxy cores for the chart (CSS only; positions are fixed so it does not jump when it re-renders)
const SPARK_COLORS = ['#ffffff', '#ffe9a8', '#bfe3ff', '#d9c4ff'];
function MapSparkle() {
  const bits = useMemo(() => {
    const r = rng(20261120);
    const stars = Array.from({ length: 44 }, () => ({ x: r() * 100, y: r() * 100, s: 1.5 + r() * 2.5, c: SPARK_COLORS[Math.floor(r() * SPARK_COLORS.length)], t: 2.2 + r() * 4, d: -r() * 7 }));
    const glints = Array.from({ length: 10 }, () => ({ x: 4 + r() * 92, y: 4 + r() * 92, g: 16 + r() * 22, t: 4 + r() * 5, d: -r() * 9 }));
    return { stars, glints };
  }, []);
  return (
    <div className="gx-sparkle" aria-hidden>
      {bits.stars.map((k, i) => <i key={i} style={{ left: `${k.x}%`, top: `${k.y}%`, '--s': `${k.s}px`, '--c': k.c, '--t': `${k.t}s`, '--d': `${k.d}s` } as CSSProperties} />)}
      {bits.glints.map((k, i) => <b key={i} style={{ left: `${k.x}%`, top: `${k.y}%`, '--g': `${k.g}px`, '--t': `${k.t}s`, '--d': `${k.d}s` } as CSSProperties} />)}
    </div>
  );
}

function Pic({ name, className, eager }: { name: string; className?: string; eager?: boolean }) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 1/1)" srcSet={gxPic(name, '1k')} />
      <img className={className} src={gxPic(name, '2k')} alt="" draggable={false} decoding="async" fetchPriority={eager ? 'high' : 'auto'} />
    </picture>
  );
}

export function Galaxy() {
  const [sel, setSel] = useState<string | null>(null);
  const [instant, setInstant] = useState(true);   // no animation while the first state (maybe a deep link) is put in place
  const [fly, setFly] = useState(0);              // counts the flights; `flying` is true while one is under way
  const [flying, setFlying] = useState(false);
  const [have, setHave] = useState<string[]>([]); // close-ups that are mounted (the one shown and the ones preloaded)
  const [info, setInfo] = useState<'story' | 'facts' | null>(null);   // the text panel is closed until the visitor asks for it
  const [intro, setIntro] = useState(false);
  const [port, setPort] = useState(false);
  const stage = useRef<HTMLDivElement>(null), world = useRef<HTMLDivElement>(null), anim = useRef<Animation | null>(null);
  const dim = useRef({ vw: 0, vh: 0, ww: 0, wh: 0, port: false });
  const selRef = useRef<string | null>(null);
  selRef.current = sel;
  const infoRef = useRef<string | null>(null);
  infoRef.current = info;
  const g = galaxyOf(sel);

  // ---- camera
  const camFor = useCallback((id: string | null): Cam => {
    const { vw, vh, ww, wh, port: p } = dim.current;
    const gx = galaxyOf(id);
    if (!gx) return { tx: (vw - ww) / 2, ty: (vh - wh) / 2, z: 1 };
    const [fx, fy] = p ? gx.posM : gx.pos;
    const z = p ? ZOOM.port : ZOOM.land;
    const cx = vw / 2, cy = p ? vh * 0.42 : vh * 0.47;
    // keep the chart covering the screen (a galaxy near an edge would otherwise pull the edge of the picture into view)
    return { tx: Math.min(0, Math.max(vw - ww * z, cx - fx * ww * z)), ty: Math.min(0, Math.max(vh - wh * z, cy - fy * wh * z)), z };
  }, []);
  const css = (c: Cam) => `translate3d(${c.tx.toFixed(1)}px, ${c.ty.toFixed(1)}px, 0) scale(${c.z.toFixed(4)})`;
  const readCam = (): Cam => {
    const el = world.current!;
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { tx: m.e, ty: m.f, z: m.a || 1 };
  };
  const measure = useCallback(() => {
    const vw = window.innerWidth, vh = window.innerHeight, p = vw / vh <= 1;
    const a = p ? 9 / 16 : 16 / 9;
    const ww = Math.max(vw, vh * a), wh = ww / a;
    dim.current = { vw, vh, ww, wh, port: p };
    setPort(p);
    const el = world.current;
    if (el) { el.style.width = `${ww}px`; el.style.height = `${wh}px`; el.style.setProperty('--m', `${Math.min(ww, wh)}px`); }
  }, []);
  const place = useCallback((id: string | null) => { anim.current?.cancel(); if (world.current) world.current.style.transform = css(camFor(id)); }, [camFor]);
  useLayoutEffect(() => { measure(); place(selRef.current); }, [measure, place]);
  useEffect(() => {
    const on = () => { measure(); place(selRef.current); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [measure, place]);

  const flyTo = useCallback((id: string | null, ms: number, pull: boolean) => {
    const el = world.current; if (!el) return;
    const from = readCam(), to = camFor(id);
    anim.current?.cancel();
    if (reduced() || ms <= 0) { el.style.transform = css(to); setFlying(false); return; }
    // from one galaxy to another the camera pulls back a little in the middle, but never so far that the edge of the chart shows
    const mz = Math.max(1, Math.min(from.z, to.z) * (pull ? 0.6 : 1) + (pull ? 0.4 : 0));
    const clampX = (v: number) => Math.min(0, Math.max(dim.current.vw - dim.current.ww * mz, v)), clampY = (v: number) => Math.min(0, Math.max(dim.current.vh - dim.current.wh * mz, v));
    const mid: Cam = { tx: clampX((from.tx + to.tx) / 2), ty: clampY((from.ty + to.ty) / 2), z: mz };
    const kf: Keyframe[] = [{ transform: css(from) }, ...(pull ? [{ transform: css(mid), offset: 0.5 }] : []), { transform: css(to) }];
    const a = el.animate(kf, { duration: ms, easing: 'cubic-bezier(0.55, 0, 0.2, 1)', fill: 'forwards' });
    anim.current = a;
    setFlying(true);
    const done = () => { if (anim.current !== a) return; el.style.transform = css(to); a.cancel(); setFlying(false); };
    a.onfinish = done;
  }, [camFor]);

  // ---- pictures
  const ensure = useCallback((id: string) => {
    setHave((h) => (h.includes(id) ? h : [...h, id]));
  }, []);
  const go = useCallback((id: string | null) => {
    const cur = selRef.current;
    if (id === cur) return;
    try { sfx(id ? 'whoosh' : 'tick'); } catch { /* sound is optional */ }
    if (id) ensure(id);
    setInstant(false);
    setFly((n) => n + 1);
    setSel(id);
    setInfo(null);
    const ms = cur && id ? 1100 : 1350;
    flyTo(id, ms, !!(cur && id));
    try { const u = new URL(window.location.href); id ? u.searchParams.set('g', id) : u.searchParams.delete('g'); window.history.replaceState(null, '', u); } catch { /* ignore */ }
  }, [ensure, flyTo]);

  // the first state (a deep link ?g=…) and quiet preloading of the other pictures
  useEffect(() => {
    const first = galaxyOf(new URLSearchParams(window.location.search).get('g'));
    if (first) { ensure(first.id); setSel(first.id); selRef.current = first.id; place(first.id); }
    const t0 = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    let n = 0;
    const timers = GALAXIES.map((x) => window.setTimeout(() => ensure(x.id), 1800 + 700 * n++));
    return () => { cancelAnimationFrame(t0); timers.forEach(clearTimeout); };
  }, [ensure, place]);

  // ---- keys, swipe, parallax
  const step = useCallback((d: number) => {
    const i = GALAXIES.findIndex((x) => x.id === selRef.current);
    const n = Math.max(0, Math.min(GALAXIES.length - 1, (i < 0 ? (d > 0 ? -1 : 0) : i) + d));
    go(GALAXIES[n].id);
  }, [go]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (intro) setIntro(false); else if (infoRef.current) setInfo(null); else if (selRef.current) go(null); else window.location.assign('/'); }
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, step, intro]);
  const sw = useRef<{ x: number; y: number; id: number } | null>(null);
  const par = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });
  const down = (e: ReactPointer<HTMLDivElement>) => { if ((e.target as HTMLElement).closest('button, a, .gx-panel, .gx-cap, .gx-intro')) return; sw.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const up = (e: ReactPointer<HTMLDivElement>) => {
    const s = sw.current; sw.current = null; if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (selRef.current && Math.abs(dx) > 70 && Math.abs(dy) < 60) step(dx < 0 ? 1 : -1);
  };
  const move = (e: ReactPointer<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || reduced() || ['off', 'low'].includes(fxLevel())) return;
    const p = par.current;
    p.tx = (e.clientX / window.innerWidth - 0.5) * 2; p.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (p.raf) return;
    const tick = () => {
      p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08;
      stage.current?.querySelectorAll<HTMLElement>('.gx-close[data-on="true"] [data-depth]').forEach((el) => { const d = Number(el.dataset.depth) * 16; el.style.transform = `translate3d(${(-p.x * d).toFixed(2)}px, ${(-p.y * d).toFixed(2)}px, 0)`; });
      p.raf = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.003 ? requestAnimationFrame(tick) : 0;
    };
    p.raf = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(par.current.raf), []);

  const mode = sel ? 'galaxy' : 'map';
  const open = g?.status === 'open';
  const ringD = (x: G) => `${x.size * (port ? 3.1 : 2.3)}`;

  return (
    <div ref={stage} className="gx" data-mode={mode} data-fly={flying ? '1' : '0'} data-instant={instant ? '1' : '0'} data-port={port ? '1' : '0'} onPointerDown={down} onPointerUp={up} onPointerMove={move}>
      {/* the star chart; the camera is its transform */}
      <div ref={world} className="gx-world">
        <Pic name="map" className="gx-mapimg" eager />
        <MapSparkle />
        {GALAXIES.map((x) => {
          const [px, py] = port ? x.posM : x.pos;
          return (
            <button key={x.id} type="button" className={`gx-node ${x.status}`} data-on={sel === x.id} style={{ left: `${px * 100}%`, top: `${py * 100}%`, '--d': ringD(x), '--a': x.accent } as CSSProperties}
              onClick={() => go(x.id)} onPointerEnter={() => ensure(x.id)} onFocus={() => ensure(x.id)} aria-label={`${x.name}${x.status === 'open' ? '' : ', sắp mở'}`}>
              <span className="gx-core" /><span className="gx-ring" /><span className="gx-ring r2" />
              <span className="gx-lab"><b>{x.name}</b>{x.status === 'open' ? <small>Ngươi đang ở đây</small> : null}</span>
            </button>
          );
        })}
      </div>

      {/* one close-up per galaxy, faded in over the chart */}
      {GALAXIES.filter((x) => have.includes(x.id)).map((x) => (
        <div key={x.id} className="gx-close" data-on={sel === x.id} aria-hidden={sel !== x.id}>
          <div className="gx-par" data-depth="0.5"><Pic name={x.id} className="gx-pic" /></div>
          <Air g={x} />
        </div>
      ))}
      <div className="gx-warp" key={fly} data-on={fly > 0 && !instant ? '1' : '0'} />
      <div className="gx-shade" />

      <header className="gx-top">
        <a className="gx-btn" href="/" aria-label="Về game"><Icon name="back" size={20} /></a>
        <div className="gx-title"><b>{FEATURE.name}</b><small>{sel ? 'Chạm tinh hà khác hoặc vuốt ngang để đổi' : 'Chạm vào một tinh hà'}</small></div>
        {sel ? <button type="button" className="gx-btn" onClick={() => go(null)} aria-label="Xem toàn bản đồ"><Icon name="galaxy" size={20} /></button> : null}
        <button type="button" className="gx-btn" onClick={() => setIntro(true)} aria-label="Giới thiệu Tinh Đồ"><Icon name="info" size={20} /></button>
      </header>

      <nav className="gx-dock" aria-label="Các tinh hà">
        {GALAXIES.map((x) => (
          <button key={x.id} type="button" className={`gx-chip ${x.status}`} data-on={sel === x.id} style={{ '--a': x.accent, backgroundImage: `url(${gxPic(x.id, 't')})` } as CSSProperties}
            onClick={() => go(x.id)} onPointerEnter={() => ensure(x.id)} aria-label={x.name} aria-pressed={sel === x.id} title={x.name}>
            {x.status === 'soon' ? <Icon name="lock" size={14} /> : null}
          </button>
        ))}
      </nav>

      {/* a small caption keeps the picture free; the long text opens only when asked for */}
      {g && !info ? (
        <div className="gx-cap" key={g.id} style={{ '--a': g.accent, '--g': g.glow } as CSSProperties}>
          <div className="gx-badge" data-open={open ? '1' : '0'}>{open ? 'Đang mở · ngươi đang ở đây' : 'Sắp mở · ý tưởng dự kiến'}</div>
          <h2>{g.name}</h2>
          <p className="gx-epi">{g.epithet} · {g.element}</p>
          <div className="gx-capbtns">
            <button type="button" className="gx-ghost" onClick={() => setInfo('story')}>Câu chuyện</button>
            <button type="button" className="gx-ghost" onClick={() => setInfo('facts')}>Điểm đặc biệt</button>
          </div>
        </div>
      ) : null}
      {g && info ? (
        <aside className="gx-panel" key={g.id} style={{ '--a': g.accent, '--g': g.glow } as CSSProperties}>
          <button type="button" className="gx-x" onClick={() => setInfo(null)} aria-label="Đóng"><Icon name="close" size={18} /></button>
          <div className="gx-badge" data-open={open ? '1' : '0'}>{open ? 'Đang mở · ngươi đang ở đây' : 'Sắp mở · ý tưởng dự kiến'}</div>
          <h2>{g.name}</h2>
          <p className="gx-epi">{g.epithet} · {g.element}</p>
          <p className="gx-tag">{g.tagline}</p>
          <div className="gx-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={info === 'story'} onClick={() => setInfo('story')}>Câu chuyện</button>
            <button type="button" role="tab" aria-selected={info === 'facts'} onClick={() => setInfo('facts')}>Điểm đặc biệt</button>
          </div>
          {info === 'story'
            ? <div className="gx-body">{g.story.map((t, i) => <p key={i}>{t}</p>)}</div>
            : <div className="gx-body">
                <ul className="gx-facts">{g.facts.map((f) => <li key={f.k}><span className="gx-fi"><Icon name={FACT_ICON[f.k]} size={18} /></span><div><b>{f.title}</b><p>{f.text}</p></div></li>)}</ul>
                {open ? null : <p className="gx-note">Đây là ý tưởng thiết kế, chưa chốt. Khi làm thật, hệ thống có thể khác.</p>}
              </div>}
        </aside>
      ) : null}
      {intro ? (
        <div className="gx-intro" onClick={() => setIntro(false)}>
          <div className="gx-card" role="dialog" aria-label="Giới thiệu Tinh Đồ" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="gx-x" onClick={() => setIntro(false)} aria-label="Đóng" autoFocus><Icon name="close" size={18} /></button>
            <h2>{FEATURE.name}</h2>
            <p className="gx-tag">{FEATURE.tagline}</p>
            {FEATURE.intro.map((t, i) => <p key={i}>{t}</p>)}
            <p className="gx-rule"><Icon name="sparkle" size={16} /> {FEATURE.rule}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
