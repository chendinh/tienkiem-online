'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// A round header button that opens a small floating panel (settings, music). Closes on outside press and Escape.
export function Popover({ icon, label, active = false, width = 320, children }: { icon: ReactNode; label: string; active?: boolean; width?: number; children: ReactNode | ((close: () => void) => ReactNode) }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div ref={ref} className="pop">
      <button type="button" className={`btn icon orb ${open ? 'open' : ''} ${active ? 'active' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((o) => !o)}>{icon}</button>
      {open && <div className="pop-body" role="dialog" aria-label={label} style={{ width }}>{typeof children === 'function' ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}
