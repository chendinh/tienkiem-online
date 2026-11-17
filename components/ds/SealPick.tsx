'use client';
import type { CSSProperties } from 'react';
// Pick one step of a scale by pressing a lacquer seal (rarity, level of a filter...). With `upTo` the seals up to the chosen one light together,
// which reads as "everything up to here": the bag cleaning uses it for "dissolve up to this rarity".
export interface SealOpt { v: number; label: string; color: string; hint?: string }
export function SealPick({ options, value, onChange, label, upTo = false }: { options: SealOpt[]; value: number; onChange: (v: number) => void; label: string; upTo?: boolean }) {
  const at = options.findIndex((o) => o.v === value);
  return (
    <div className="sealPick" role="radiogroup" aria-label={label}>
      <i className="sealLine" aria-hidden="true" style={{ '--p': `${options.length > 1 ? (Math.max(0, at) / (options.length - 1)) * 100 : 0}%` } as CSSProperties} />
      {options.map((o, i) => (
        <button key={o.v} type="button" role="radio" aria-checked={o.v === value} title={o.hint} className={`seal ${o.v === value ? 'on' : ''} ${upTo && i < at ? 'in' : ''}`} style={{ '--sc': o.color } as CSSProperties} onClick={() => onChange(o.v)}>
          <span className="sealDisc" aria-hidden="true" />
          <span className="sealLbl">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
