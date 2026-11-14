'use client';
import { ModalClose } from './ds/ModalClose';
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import * as C from '@/lib/content';
import { SP, type Beast, type Item } from '@/lib/game';
import { itemSpec } from '@/lib/avatarSpec';
import { useGenImage } from '@/lib/useGenImage';
import { ElIcon } from './Icons';
import { Icon } from './ds/Icon';

export const GenCtx = createContext(true);

// Click-to-enlarge popup. Any component can call useZoom()(payload) to show a big picture with details.
export type ZoomItem = { kind: 'item'; it: Item } | { kind: 'beast'; b: Beast } | { kind: 'species'; id: string; mut?: boolean; text?: string };
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

function ZoomView({ z, close }: { z: ZoomItem; close: () => void }) {
  let pic: ReactNode, body: ReactNode, rc = '#e5c07b';
  if (z.kind === 'item') {
    const it = z.it; rc = C.RCOLOR[it.tier];
    pic = <GenImg spec={itemSpec(it)} pri={1} fb={<ElIcon el={it.el} size={80} />} />;
    body = (
      <>
        <h2 style={{ color: rc }}>{it.name}</h2>
        <div className="chips"><span className="chip" style={{ color: rc, borderColor: rc + '88' }}>{C.RARITY[it.tier]}</span><span className="chip">Lv{it.level}</span><span className="chip">{C.SLOT_VI[it.slot]}</span><ElChip el={it.el} /><span className="chip gold"><Icon name="atk" size={13} /> {it.power}</span></div>
        <ul className="itLines big">
          <li>{STAT_VI[it.impl.stat]} +{it.impl.value}</li>
          {it.affixes.map((a, i) => <li key={i} className={a.id.startsWith('tien') ? 'tien' : ''}>{a.label} +{a.value}</li>)}
        </ul>
      </>
    );
  } else if (z.kind === 'beast') {
    const b = z.b, sp = SP(b.sp);
    pic = <Img src={C.monsterArt(b.sp, b.mut)} className="fill" fb={<ElIcon el={sp.el[0]} size={80} />} />;
    body = (
      <>
        <h2>{b.mut && <em className="mutBadge">✦ Dị Biến</em>} {b.name}</h2>
        <div className="chips"><span className="chip">Lv{b.level}</span><ElChip el={sp.el[0]} /><span className="chip">{C.PERS[b.pers].n}</span><span className="chip gold"><Icon name="atk" size={13} /> {b.power}</span>{b.elite && <span className="chip">Tinh Anh</span>}</div>
        <SizeMeter b={b} />
        <ul className="itLines big"><li>Sinh Lực {fmt(b.stats[0])}</li><li>Công Kích {fmt(b.stats[2])}</li><li>Phòng Ngự {fmt(b.stats[3])}</li><li>Thân Pháp {fmt(b.stats[4])}</li></ul>
        {b.skills.length > 0 && <div className="hint">Thần thông: {b.skills.join(', ')}.</div>}
      </>
    );
  } else {
    const sp = SP(z.id);
    pic = <Img src={C.monsterArt(z.id, z.mut)} className="fill" fb={<ElIcon el={sp.el[0]} size={80} />} />;
    body = (
      <>
        <h2>{sp.name}</h2>
        <div className="chips">{sp.el.map((e) => <ElChip key={e} el={e} />)}</div>
        {z.text && <p className="zoomText">{z.text}</p>}
      </>
    );
  }
  return (
    <div className="modal zoom" onClick={close} role="dialog" aria-modal="true">
      <ModalClose onClose={close} />
      <div className="modalBody zoomBody" onClick={(e) => e.stopPropagation()} style={{ '--rc': rc } as CSSProperties}>
        <div className="zoomPic">{pic}</div>
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
  return (
    <div className={`itIcon ${size === 'fit' ? 'fit' : ''} ${zoom ? 'zoomable' : ''}`} title={zoom ? 'Bấm để xem ảnh lớn' : undefined} onClick={zoom ? (e) => { e.stopPropagation(); open({ kind: 'item', it }); } : undefined} style={{ ...box, borderColor: C.RCOLOR[it.tier], boxShadow: `inset 0 0 ${8 + it.tier * 2}px ${col}77, 0 0 ${2 + it.tier * 3}px ${col}66` }}>
      <GenImg spec={itemSpec(it)} pri={equipped ? 1 : 3} size={size === 'fit' || size <= 72 ? 'sm' : undefined} fb={<ElIcon el={it.el} size={22} />} />
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
export function BeastArt({ b, box = 112, onOpen }: { b: Beast; box?: number; onOpen?: () => void }) {
  const zoom = useZoom(), open = onOpen ? () => onOpen() : () => zoom({ kind: 'beast', b });
  const sp = SP(b.sp);
  const [full, setFull] = useState(false);   // the small copy is missing: use the original
  const small = box <= 160 && !full;
  const frac = 0.58 + 0.42 * ((b.size - 0.5) / 1.5);
  return (
    <div className="beastBox zoomable" title="Bấm để xem ảnh lớn" onClick={open} style={{ width: box, height: box }}>
      <div className={`beastArt ${b.mut ? 'mut' : ''}`} style={{ width: box * frac, height: box * frac }}>
        <Img src={C.monsterArt(b.sp, b.mut, small)} className="fill" onBad={small ? () => setFull(true) : undefined} fb={<ElIcon el={sp.el[0]} size={36} />} />
      </div>
    </div>
  );
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
export function Bar({ pct, label, cls = '' }: { pct: number; label: string; cls?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  const low = p < 25 && cls.includes('hp'), full = p >= 99.5 && cls.includes('cp');
  return (
    <div className={`bar ${cls} ${low ? 'low' : ''} ${full ? 'full' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={label}>
      <i className="trail" style={{ width: `${p}%` }} />
      <i className="fill" style={{ width: `${p}%` }} />
      <span>{label}</span>
    </div>
  );
}
