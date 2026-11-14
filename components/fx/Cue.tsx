'use client';
import { useMemo } from 'react';
import { useFx } from './FxProvider';
import { sfx } from '@/lib/audio';

// One call per game moment: picks the visual effect and the sound together, so a screen never has to know about either.
const at = (sel: string, fy = 0.5): { x?: number; y?: number } => {
  const el = typeof document !== 'undefined' ? document.querySelector(sel) : null; if (!el) return {};
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * fy };
};

export function useCue() {
  const fx = useFx();
  return useMemo(() => ({
    ui: () => sfx('tick'),
    open: () => sfx('open'),
    equip: () => { const p = at('.hero', 0.5); fx.ring({ ...p, color: '#eed08a', size: 150 }); fx.burst({ ...p, kind: 'qi', count: 18 }); sfx('equip'); },
    redrawn: () => { const p = at('.hero', 0.45); fx.ring({ ...p, color: '#8ee6c8', size: 200 }); fx.burst({ ...p, kind: 'petals', count: 26 }); sfx('chime'); },
    levelUp: () => { const p = at('.hero', 0.45); fx.ring({ ...p, size: 230 }); fx.burst({ ...p, kind: 'gold', count: 42 }); fx.float('Tăng Tiến', { ...p, color: '#f6e2a8' }); sfx('levelup'); },
    // an item dropped: bigger rarity, bigger moment
    drop: (tier: number) => {
      if (tier < 2) return; const p = at('.feed', 0.1);
      if (tier === 2) { sfx('chime'); fx.burst({ ...p, kind: 'qi', count: 10, color: '#5ab0ff' }); }
      else if (tier === 3) { sfx('chime'); fx.burst({ ...p, kind: 'qi', count: 18, color: '#c084fc' }); fx.ring({ ...p, color: '#c084fc', size: 90 }); }
      else if (tier === 4) { sfx('rare'); fx.burst({ ...p, kind: 'gold', count: 38 }); fx.ring({ ...p, color: '#ffb454', size: 140 }); fx.float('Thiên Phẩm', { ...p, color: '#ffb454' }); }
      else { sfx('gong'); sfx('rare'); fx.flash('gold'); fx.burst({ ...p, kind: 'gold', count: 70 }); fx.ring({ ...p, color: '#ff6ea8', size: 220 }); fx.float('Tiên Phẩm', { ...p, color: '#ff9ccb' }); }
    },
    mutant: () => { const p = at('.feed', 0.1); fx.burst({ ...p, kind: 'petals', count: 30 }); fx.ring({ ...p, color: '#ffd36e', size: 120 }); sfx('rare'); },
    tame: () => { const p = at('.feed', 0.1); fx.burst({ ...p, kind: 'petals', count: 16 }); sfx('tame'); },
    // the tribulation: charge, one lightning strike per wave, then the verdict
    charge: () => { const p = at('.hero', 0.5); fx.ring({ ...p, color: '#b78bff', size: 180 }); sfx('whoosh'); },
    storm: (waves: number) => { fx.lightning({ strikes: waves }); for (let i = 0; i < waves; i++) setTimeout(() => { sfx('thunder'); fx.shake(); }, 80 + i * 420); },
    breakOk: () => { const p = at('.hero', 0.45); fx.flash('gold'); fx.burst({ ...p, kind: 'gold', count: 80 }); fx.ring({ ...p, size: 300 }); fx.float('Đột Phá Thành Công', { ...p, color: '#f6e2a8' }); sfx('gong'); sfx('levelup'); },
    breakFail: () => { const p = at('.hero', 0.45); fx.vignette('#e85d3d'); fx.burst({ ...p, kind: 'ember', count: 34 }); fx.float('Đột Phá Thất Bại', { ...p, color: '#ff9c8a' }); sfx('fail'); },
    gain: (text: string, color = '#f6e2a8') => fx.float(text, { ...at('.res', 0.5), color }),
  }), [fx]);
}
export type Cue = ReturnType<typeof useCue>;
