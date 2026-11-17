'use client';
import { useMemo, useState } from 'react';
import { Icon } from './Icon';
// Choose several of many (the creatures to tame, ...). A bar shows what is chosen; pressing it opens a panel in the flow of the page (not a floating layer, so a
// scrolling window never clips it) with a search box, a checklist and quick actions. Empty selection means "all", said in `allText`.
export interface MultiOpt { value: string; label: string; hint?: string }
export function MultiSelect({ options, value, onChange, label, allText, placeholder = 'Tìm…' }: { options: MultiOpt[]; value: string[]; onChange: (v: string[]) => void; label: string; allText: string; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const shown = useMemo(() => { const k = norm(q.trim()); return k ? options.filter((o) => norm(o.label).includes(k) || (o.hint && norm(o.hint).includes(k))) : options; }, [options, q]);
  const set = new Set(value), chosen = options.filter((o) => set.has(o.value));
  const toggle = (v: string) => onChange(set.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={`msel ${open ? 'open' : ''}`}>
      <button type="button" className="mselBar" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <span className="mselText">{chosen.length === 0 ? allText : `${chosen.length} đã chọn`}</span>
        <Icon name="rise" size={14} />
      </button>
      {chosen.length > 0 && (
        <div className="mselChips">
          {chosen.slice(0, 8).map((o) => <button key={o.value} type="button" className="mselChip" title={`Bỏ ${o.label}`} onClick={() => toggle(o.value)}>{o.label}<Icon name="close" size={11} /></button>)}
          {chosen.length > 8 && <span className="mselMore">+{chosen.length - 8}</span>}
        </div>
      )}
      {open && (
        <div className="mselPanel">
          <input className="inp mselSearch" type="search" value={q} placeholder={placeholder} aria-label={`Tìm trong ${label}`} onChange={(e) => setQ(e.target.value)} />
          <div className="mselActs">
            <button type="button" className="btn sm ghost" onClick={() => onChange([...new Set([...value, ...shown.map((o) => o.value)])])}>Chọn {q ? 'các kết quả' : 'tất cả'}</button>
            <button type="button" className="btn sm ghost" disabled={value.length === 0} onClick={() => onChange([])}>Bỏ chọn hết</button>
            <button type="button" className="btn sm" onClick={() => { setOpen(false); setQ(''); }}>Xong</button>
          </div>
          <div className="mselList" role="listbox" aria-multiselectable="true" aria-label={label}>
            {shown.length === 0 && <div className="empty">Không có kết quả.</div>}
            {shown.map((o) => (
              <label key={o.value} role="option" aria-selected={set.has(o.value)} className={`mselOpt ${set.has(o.value) ? 'on' : ''}`}>
                <input type="checkbox" checked={set.has(o.value)} onChange={() => toggle(o.value)} />
                <span className="mselBox" aria-hidden="true">{set.has(o.value) && <Icon name="check" size={12} />}</span>
                <span className="mselLbl">{o.label}</span>{o.hint && <small>{o.hint}</small>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
