'use client';
import { useState, type CSSProperties } from 'react';
import { TUSI_KINDS, TUSI_LOOKS } from '@/lib/tusi';
import { TUSI_ART } from '@/lib/tusi-art';
import { Cultivator, lookOf } from '../Cultivator';

// The cultivators drawn by AI (scripts/gen-tusi.ts), all of them, to look over (app/demo/tu-si): every kind of weapon, woman and man, every outfit, with its file name
// (the one to pass to --redo or --flip). Large, or at the size of the Phó Bản stage; facing right as drawn, or turned to the left as the stage turns those on its right.
// A kind not drawn yet shows the figure drawn in code, marked so.
const SIZES: [string, string][] = [['lg', 'Lớn'], ['sm', 'Như trong trận']];

export function TusiGallery() {
  const [size, setSize] = useState('lg'), [flip, setFlip] = useState(false), [g, setG] = useState<'all' | 'f' | 'm'>('all');
  const total = Object.values(TUSI_ART).reduce((a, b) => a + b, 0), most = Math.max(1, ...Object.values(TUSI_ART));
  const sexes = (g === 'all' ? ['f', 'm'] : [g]) as ('f' | 'm')[];
  return (
    <main className={`tsGal ${size}${flip ? ' flip' : ''}`}>
      <header className="tsBar">
        <div><h1>Tạo hình tu sĩ</h1><small>{total ? `${total} hình AI · ${Object.keys(TUSI_ART).length}/${TUSI_KINDS.length * 2} kiểu đã vẽ` : 'Chưa có hình AI nào: chạy npm run gen:tusi'}</small></div>
        <a className="btn ghost sm" href="/demo/pho-ban">Phó Bản demo</a>
      </header>
      <div className="tsCtl">
        <div className="seg">{SIZES.map(([k, l]) => <button key={k} className={size === k ? 'on' : ''} onClick={() => setSize(k)}>{l}</button>)}</div>
        <div className="seg">{([['all', 'Cả hai'], ['f', 'Nữ'], ['m', 'Nam']] as const).map(([k, l]) => <button key={k} className={g === k ? 'on' : ''} onClick={() => setG(k)}>{l}</button>)}</div>
        <button className={`btn ghost sm${flip ? ' on' : ''}`} onClick={() => setFlip(!flip)}>{flip ? 'Quay trái' : 'Quay phải'}</button>
      </div>
      {TUSI_KINDS.map((k) => (
        <section key={k.id} className="tsKind">
          <h2>{k.name} <small>{k.id}</small></h2>
          {sexes.map((sx) => {
            const n = TUSI_ART[`${k.id}_${sx}`] || 0;
            return (
              <div key={sx} className="tsRow">
                <span className="tsSex">{sx === 'f' ? 'Nữ' : 'Nam'}</span>
                {(n ? Array.from({ length: n }, (_, v) => v) : [0]).map((v) => (
                  <figure key={v} className={`tsFig${n ? '' : ' none'}`} style={{ '--w': `${100 / Math.min(most, TUSI_LOOKS.length)}%` } as CSSProperties}>
                    <div className="tsBox"><Cultivator look={{ ...lookOf('Tán Tu', sx, v, k.id), h: v }} /></div>
                    <figcaption>{n ? `${k.id}_${sx}_${v}` : 'chưa vẽ (hình code)'}</figcaption>
                  </figure>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
