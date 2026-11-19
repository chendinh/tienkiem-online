'use client';
import { ModalClose } from './ds/ModalClose';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as C from '@/lib/content';
import { SP, type Beast, type Item } from '@/lib/game';
import { itemSpec } from '@/lib/avatarSpec';
import { itemMarks } from '@/lib/daily';
import { useGenImage } from '@/lib/useGenImage';
import { useLookPic } from '@/lib/useLookPic';
import { ElIcon } from './Icons';
import { Icon } from './ds/Icon';

export const GenCtx = createContext(true);

// Click-to-enlarge popup. Any component can call useZoom()(payload) to show a big picture with details.
export type ZoomItem = { kind: 'item'; it: Item } | { kind: 'beast'; b: Beast } | { kind: 'species'; id: string; mut?: boolean; text?: string; best?: { seen: number; tamed: number; maxCm: number; minCm: number; mutSeen: number; mutTamed: number } }
  | { kind: 'avatar'; src: string; name: string; sub?: string; crop?: number }   // a character's portrait
  | { kind: 'prop'; src: string; name: string; text?: string };   // a shop good or a material
const ZoomCtx = createContext<(z: ZoomItem) => void>(() => {});
export const useZoom = () => useContext(ZoomCtx);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [z, setZ] = useState<ZoomItem | null>(null);
  useEffect(() => {
    if (!z) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setZ(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [z]);
  return (
    <ZoomCtx.Provider value={setZ}>
      {children}
      {z && <ZoomView z={z} close={() => setZ(null)} />}
    </ZoomCtx.Provider>
  );
}

// The big picture of a popup: pinch, wheel or double-tap to zoom, drag to move. The page itself never zooms or pans (touch-action: none),
// so a pinch on the picture can no longer zoom the whole browser page and break the layout of the fixed popups.
export function PanZoom({ children }: { children: ReactNode }) {
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; cx: number; cy: number } | null>(null);
  const tap = useRef(0);
  const clamp = (k: number, x: number, y: number) => {
    const r = box.current?.getBoundingClientRect(), w = r?.width || 0, h = r?.height || 0;
    const kk = Math.min(5, Math.max(1, k)), mx = (w * (kk - 1)) / 2, my = (h * (kk - 1)) / 2;
    return { k: kk, x: kk === 1 ? 0 : Math.min(mx, Math.max(-mx, x)), y: kk === 1 ? 0 : Math.min(my, Math.max(-my, y)) };
  };
  const zoomAt = (k: number, cx: number, cy: number, cur = t) => {
    const r = box.current!.getBoundingClientRect(), ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2), nk = Math.min(5, Math.max(1, k)), f = nk / cur.k;
    setT(clamp(nk, ox - (ox - cur.x) * f, oy - (oy - cur.y) * f));
  };
  useEffect(() => {
    const el = box.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(t.k * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });
  const dist = () => { const [a, b] = [...ptrs.current.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
  return (
    <div ref={box} className="panZoom" style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.current.size === 2) last.current = dist();
        else if (e.pointerType !== 'mouse' || e.detail === 2) { const n = Date.now(); if (n - tap.current < 320) { t.k > 1 ? setT({ k: 1, x: 0, y: 0 }) : zoomAt(2.5, e.clientX, e.clientY); tap.current = 0; } else tap.current = n; }
      }}
      onPointerMove={(e) => {
        const p = ptrs.current.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.current.size >= 2 && last.current) { const n = dist(); zoomAt(t.k * (n.d / (last.current.d || 1)), n.cx, n.cy); setT((c) => clamp(c.k, c.x + n.cx - last.current!.cx, c.y + n.cy - last.current!.cy)); last.current = n; }
        else if (t.k > 1) setT((c) => clamp(c.k, c.x + dx, c.y + dy));
      }}
      onPointerUp={(e) => { ptrs.current.delete(e.pointerId); last.current = null; }}
      onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); last.current = null; }}
      onDoubleClick={(e) => { t.k > 1 ? setT({ k: 1, x: 0, y: 0 }) : zoomAt(2.5, e.clientX, e.clientY); }}>
      <div className="panZoomIn" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>{children}</div>
      {t.k > 1 && <button type="button" className="btn sm panZoomReset" onClick={() => setT({ k: 1, x: 0, y: 0 })}>Thu về</button>}
    </div>
  );
}

function ZoomView({ z, close }: { z: ZoomItem; close: () => void }) {
  let pic: ReactNode, body: ReactNode, rc = '#e5c07b';
  let tall = 0;   // width / height of a portrait picture: the frame takes this shape so the whole figure shows, not a square crop
  if (z.kind === 'item') {
    const it = z.it; rc = C.RCOLOR[it.tier];
    pic = <GenImg spec={itemSpec(it)} pri={1} fb={<ElIcon el={it.el} size={80} />} />;
    body = (
      <>
        <h2 style={{ color: rc }}>{it.name}</h2>
        <div className="chips"><span className="chip" style={{ color: rc, borderColor: rc + '88' }}>{C.RARITY[it.tier]}</span><span className="chip">Lv{it.level}</span><span className="chip">{C.SLOT_VI[it.slot]}</span><ElChip el={it.el} />{itemMarks(it).isNew && <span className="chip markNew"><Icon name="sparkle" size={13} /> Mới ra mắt</span>}{itemMarks(it).exclusive && <span className={`chip markExcl t${it.tier}`}><Icon name="crown" size={13} /> Độc quyền</span>}<span className="chip gold"><Icon name="atk" size={13} /> {it.power}</span></div>
        <ul className="itLines big">
          <li>{STAT_VI[it.impl.stat]} +{it.impl.value}</li>
          {it.affixes.map((a, i) => <li key={i} className={a.id.startsWith('tien') ? 'tien' : ''}>{a.label} +{a.value}</li>)}
        </ul>
      </>
    );
  } else if (z.kind === 'beast') {
    const b = z.b, sp = SP(b.sp);
    pic = <ZoomBeastPic b={b} />;
    body = (
      <>
        <h2>{b.mut && <em className="mutBadge">✦ Dị Biến</em>} {b.name}</h2>
        <div className="chips"><span className="chip">Lv{b.level}</span><ElChip el={sp.el[0]} /><span className="chip">{C.PERS[b.pers].n}</span><span className="chip gold"><Icon name="atk" size={13} /> {b.power}</span>{b.elite && <span className="chip">Tinh Anh</span>}</div>
        <SizeMeter b={b} />
        <ul className="itLines big beastStats">
          <li>Sinh Lực {fmt(b.stats[0])}</li><li>Linh Lực {fmt(b.stats[1])}</li><li>Công Kích {fmt(b.stats[2])}</li><li>Phòng Ngự {fmt(b.stats[3])}</li><li>Thân Pháp {fmt(b.stats[4])}</li>
          <li>Kích thước {b.cm} cm · {C.SIZE_CLASS[b.cls]}</li>
        </ul>
        {b.apt && b.apt.length === 5 && <div className="aptRow" aria-label="Tư chất">{['Sinh Lực', 'Linh Lực', 'Công', 'Phòng', 'Thân'].map((n, k) => <span key={n} title={`Tư chất ${n}`}><small>{n}</small><b>{b.apt[k].toFixed(2)}</b></span>)}</div>}
        {b.skills.length > 0 && <div className="hint">Thần thông: {b.skills.join(', ')}.</div>}
      </>
    );
  } else if (z.kind === 'avatar') {
    tall = 768 / (1152 * (1 - (z.crop || 0)));
    pic = <Img src={z.src} className="fill" style={z.crop ? { height: `${100 / (1 - z.crop)}%`, objectPosition: 'top' } : undefined} fb={<Icon name="lotus" size={80} />} />;
    body = (<><h2>{z.name}</h2>{z.sub && <p className="zoomText">{z.sub}</p>}</>);
  } else if (z.kind === 'prop') {
    pic = <Img src={z.src} className="fill" fb={<span>✦</span>} />;
    body = (<><h2>{z.name}</h2>{z.text && <p className="zoomText">{z.text}</p>}</>);
  } else {
    const sp = SP(z.id);
    pic = <Img src={C.monsterArt(z.id, z.mut)} className="fill" fb={<ElIcon el={sp.el[0]} size={80} />} />;
    body = (
      <>
        <h2>{sp.name}</h2>
        <div className="chips">{sp.el.map((e) => <ElChip key={e} el={e} />)}</div>
        {z.best && z.best.seen > 0 && (
          <ul className="itLines big">
            <li>Đã gặp {z.best.seen} lần · thu phục {z.best.tamed} lần</li>
            <li>Kích thước {z.best.minCm}–{z.best.maxCm} cm</li>
            {z.best.mutSeen > 0 && <li>✦ Dị Biến: gặp {z.best.mutSeen} · thu {z.best.mutTamed}</li>}
          </ul>
        )}
        {z.text && <p className="zoomText">{z.text}</p>}
      </>
    );
  }
  return (
    <div className="modal zoom" onClick={close} role="dialog" aria-modal="true">
      <ModalClose onClose={close} />
      <div className={`modalBody zoomBody ${tall ? 'avatarZoom' : ''}`} onClick={(e) => e.stopPropagation()} style={{ '--rc': rc, ...(tall ? { '--ar': tall } : {}) } as CSSProperties}>
        <div className={`zoomPic ${tall ? 'tall' : ''}`}><PanZoom>{pic}</PanZoom></div>
        <div className="zoomInfo">{body}</div>
        <button className="btn big" onClick={close}>Đóng</button>
      </div>
    </div>
  );
}
export const STAT_VI: Record<string, string> = { hp: 'Sinh Lực', spirit: 'Linh Lực', atk: 'Công Kích', def: 'Phòng Ngự', spd: 'Thân Pháp', crit: 'Bạo Kích %', critdmg: 'Bạo Thương %', luck: 'May Mắn', cult: 'Tu Luyện %' };
export const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

export function Img({ src, className = '', style, fb, onBad }: { src?: string; className?: string; style?: CSSProperties; fb?: ReactNode; onBad?: () => void }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (!src || bad) return <div className={`imgfb ${className}`} style={style}>{fb || '✦'}</div>;
  return <img src={src} alt="" className={className} style={style} onError={() => { setBad(true); onBad?.(); }} draggable={false} loading="lazy" decoding="async" />;
}

// AI-generated picture when ready (cached on the server), otherwise the glyph tile.
// `size="sm"` asks the server for the small copy used in lists; without it the full original picture is shown (popups).
export function GenImg({ spec, pri = 2, fb, size }: { spec: any; pri?: number; fb?: ReactNode; size?: 'sm' }) {
  const on = useContext(GenCtx);
  const g = useGenImage(on ? spec : null, pri);
  if (g.url) return <Img key={g.url} src={size ? `${g.url}?s=${size}` : g.url} className="fill genimg" style={g.crop ? { height: `${100 / (1 - g.crop)}%`, objectPosition: 'top' } : undefined} fb={fb} />;
  return <Img className="fill" fb={fb} />;
}

export function ElChip({ el }: { el: string }) {
  return <span className="chip el" style={{ '--el': C.EL[el].color } as CSSProperties}><ElIcon el={el} /> {el}</span>;
}

// The picture only depends on (slot, base, tier); the element is shown as a glow around it.
// size 'fit' fills its (square, positioned) parent instead of using a fixed number of pixels.
export function ItemIcon({ it, equipped = false, size = 46, zoom = false }: { it: Item; equipped?: boolean; size?: number | 'fit'; zoom?: boolean }) {
  const open = useZoom();
  const col = C.EL[it.el].color;
  const box = size === 'fit' ? {} : { width: size, height: size };
  const mk = itemMarks(it);
  return (
    <div className={`itIcon ${size === 'fit' ? 'fit' : ''} ${zoom ? 'zoomable' : ''}`} title={zoom ? 'Bấm để xem ảnh lớn' : undefined} onClick={zoom ? (e) => { e.stopPropagation(); open({ kind: 'item', it }); } : undefined} style={{ ...box, borderColor: C.RCOLOR[it.tier], boxShadow: `inset 0 0 ${8 + it.tier * 2}px ${col}77, 0 0 ${2 + it.tier * 3}px ${col}66` }}>
      <GenImg spec={itemSpec(it)} pri={equipped ? 1 : 3} size={size === 'fit' || size <= 72 ? 'sm' : undefined} fb={<ElIcon el={it.el} size={22} />} />
      {mk.isNew && <i className="itMark isNew" title="Loại pháp khí mới ra mắt"><Icon name="sparkle" size={11} /></i>}
      {mk.exclusive && <i className={`itMark excl t${it.tier}`} title="Pháp khí Tiên: mỗi món một dáng riêng"><Icon name="crown" size={11} /></i>}
    </div>
  );
}

export function ItemCard({ it, compact = false, equipped = false }: { it: Item; compact?: boolean; equipped?: boolean }) {
  return (
    <div className={`item t${it.tier}`} style={{ '--rc': C.RCOLOR[it.tier] } as CSSProperties}>
      <ItemIcon it={it} equipped={equipped} zoom />
      <div className="itBody">
        <div className="itName">{it.name}</div>
        <div className="itSub">
          {C.RARITY[it.tier]} · Lv{it.level} · {C.SLOT_VI[it.slot]} · <span style={{ color: C.EL[it.el].color }}><ElIcon el={it.el} size={13} /></span> · <Icon name="atk" size={13} /> {it.power}
        </div>
        {!compact && (
          <ul className="itLines">
            <li>{STAT_VI[it.impl.stat]} +{it.impl.value}</li>
            {it.affixes.map((a, i) => <li key={i} className={a.id.startsWith('tien') ? 'tien' : ''}>{a.label} +{a.value}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// Every creature of a species uses the same two pictures (normal and mutated), so it always looks the same.
// Size is shown by scaling the art inside a fixed box (monotone, bounded), with a mutation aura.
// A Dị Biến beast is drawn in its own look (Ngọc Bích ...) once that picture exists; `mine`: it is the player's own, so a missing picture is ordered (once for everybody).
export function BeastArt({ b, box = 112, onOpen, mine = false }: { b: Beast; box?: number; onOpen?: () => void; mine?: boolean }) {
  const zoom = useZoom(), open = onOpen ? () => onOpen() : () => zoom({ kind: 'beast', b }), look = useLookPic(b, mine);
  const sp = SP(b.sp);
  const [full, setFull] = useState(false);   // the small copy is missing: use the original
  const small = box <= 160 && !full;
  const frac = 0.58 + 0.42 * ((b.size - 0.5) / 1.5);
  return (
    <div className="beastBox zoomable" title="Bấm để xem ảnh lớn" onClick={open} style={{ width: box, height: box }}>
      <div className={`beastArt ${b.mut ? 'mut' : ''}`} style={{ width: box * frac, height: box * frac }}>
        <Img src={look || C.monsterArt(b.sp, b.mut, small)} className="fill" onBad={small ? () => setFull(true) : undefined} fb={<ElIcon el={sp.el[0]} size={36} />} />
      </div>
    </div>
  );
}

// The big picture of a creature: the look it has (a Dị Biến has its own picture once one is drawn), else the species picture.
function ZoomBeastPic({ b }: { b: Beast }) {
  const look = useLookPic(b, false);
  return <Img src={look || C.monsterArt(b.sp, b.mut)} className="fill" fb={<ElIcon el={SP(b.sp).el[0]} size={80} />} />;
}

export function SizeMeter({ b }: { b: Beast }) {
  const pos = ((b.size - 0.5) / 1.5) * 100;
  return (
    <div className="sizeMeter" title={`${b.cm} cm`}>
      <i style={{ left: `${pos}%` }} />
      <span>{b.cm} cm · {C.SIZE_CLASS[b.cls]}</span>
    </div>
  );
}

// A bar keeps a pale "trail" that catches up slowly when the value drops, so a loss is felt. hp turns urgent under a quarter, cp glows when full.
// A fine gold end piece for the bars: a hairline arc that follows the rounded end of the bar, with a small cloud curl pointing outward and a tiny diamond at each tip.
// The right one is the same drawing mirrored by the stylesheet.
function BarCap({ side }: { side: 'l' | 'r' }) {
  return (
    <svg className={`barCap ${side}`} viewBox="9 0 25 30" width="25" height="30" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30.5 2.4C23.5 2.4 19 7.8 19 15s4.5 12.6 11.5 12.6" strokeWidth="0.9" />
        <path d="M19 15H13.4C10.9 15 9.9 12.7 11.3 11.3 12.5 10.2 14.3 11.1 14 12.7" strokeWidth="0.85" />
      </g>
      <path d="M31.6 1.5l1.4.9-1.4.9-1.4-.9zM31.6 26.7l1.4.9-1.4.9-1.4-.9z" fill="currentColor" />
    </svg>
  );
}
export function Bar({ pct, label, cls = '' }: { pct: number; label: string; cls?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  const low = p < 25 && cls.includes('hp'), full = p >= 99.5 && cls.includes('cp');
  return (
    <div className="barWrap">
      <BarCap side="l" />
      <div className={`bar ${cls} ${low ? 'low' : ''} ${full ? 'full' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={label}>
        <i className="trail" style={{ width: `${p}%` }} />
        <i className="fill" style={{ width: `${p}%` }} />
        <span>{label}</span>
      </div>
      <BarCap side="r" />
    </div>
  );
}
