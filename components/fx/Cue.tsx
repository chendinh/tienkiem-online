'use client';
import { useMemo } from 'react';
import { useFx } from './FxProvider';
import { sfx } from '@/lib/audio';

// Particles and rings are kept for the fight only (BattleStage); the moments below use sound, floating text and flashes.
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
    equip: () => { const p = at('.hero', 0.5); sfx('equip'); },
    redrawn: () => { const p = at('.hero', 0.45); sfx('chime'); },
    levelUp: () => { const p = at('.hero', 0.45); fx.float('Tăng Tiến', { ...p, color: '#f6e2a8' }); sfx('levelup'); },
    // an item dropped: bigger rarity, bigger moment
    drop: (tier: number) => {
      if (tier < 2) return; const p = at('.feed', 0.1);
      if (tier === 2) { sfx('chime'); }
      else if (tier === 3) { sfx('chime'); }
      else if (tier === 4) { sfx('rare'); fx.float('Thiên Phẩm', { ...p, color: '#ffb454' }); }
      else { sfx('gong'); sfx('rare'); fx.flash('gold'); fx.float('Tiên Phẩm', { ...p, color: '#ff9ccb' }); }
    },
    mutant: () => { const p = at('.feed', 0.1); sfx('rare'); },
    tame: () => { const p = at('.feed', 0.1); sfx('tame'); },
    // the tribulation: charge, one lightning strike per wave, then the verdict
    charge: () => { const p = at('.hero', 0.5); sfx('whoosh'); },
    storm: (waves: number) => { fx.lightning({ strikes: waves }); for (let i = 0; i < waves; i++) setTimeout(() => { sfx('thunder'); fx.shake(); }, 80 + i * 420); },
    breakOk: () => { const p = at('.hero', 0.45); fx.flash('gold'); fx.float('Đột Phá Thành Công', { ...p, color: '#f6e2a8' }); sfx('gong'); sfx('levelup'); },
    breakFail: () => { const p = at('.hero', 0.45); fx.vignette('#e85d3d'); fx.float('Đột Phá Thất Bại', { ...p, color: '#ff9c8a' }); sfx('fail'); },
    gain: (text: string, color = '#f6e2a8') => fx.float(text, { ...at('.res', 0.5), color }),
  }), [fx]);
}
export type Cue = ReturnType<typeof useCue>;
