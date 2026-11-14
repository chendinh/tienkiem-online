import type { ReactNode } from 'react';

// Small line icons for the eight elements and the equipment slots. They replace the Chinese characters that were used as marks
// before: the game shows no Chinese writing anywhere. Drawn in the current text colour, so a parent can tint them.
const svg = (size: number, children: ReactNode) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const EL_ICON: Record<string, ReactNode> = {
  Kim: <><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M9 9l3 11M15 9l-3 11" /></>,
  Mộc: <><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z" /><path d="M5 19L14 10" /></>,
  Thủy: <path d="M12 3.5C9 8 6.5 11 6.5 14.5a5.5 5.5 0 0011 0C17.5 11 15 8 12 3.5z" />,
  Hỏa: <path d="M12 3c.6 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 01-11 0c0-2.2 1-3.7 2.5-5 .2 1.8.8 2.8 1.8 3.3C10.5 8.5 10.8 5.5 12 3z" />,
  Thổ: <path d="M2.5 19L9 8l4 6.5 2.5-3.5 6 8z" />,
  Lôi: <path d="M13.5 2.5L5 13.5h6l-1.5 8L19 10h-6.2z" />,
  Âm: <path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" />,
  Dương: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
};

const SLOT_ICON: Record<string, ReactNode> = {
  Weapon: <><path d="M20 4l-9.5 9.5" /><path d="M8.5 11.5l4 4" /><path d="M10.5 13.5l-5 5" /><circle cx="4.7" cy="19.3" r="1.1" /></>,
  Headwear: <><path d="M4 18l1.5-9 4.5 3.5L12 6l2 6.5L18.5 9 20 18z" /><path d="M4 21h16" /></>,
  Robe: <path d="M9 3l3 5 3-5 5 3.5-2.5 3.5L16 9.5V21H8V9.5L6.5 10 4 6.5z" />,
  Footwear: <path d="M9 3h5v9l4.5 2.5c1.5.8 2 1.7 2 3V20H4v-3.5c0-1 .8-1.8 2-2.2L9 13z" />,
  Back: <><path d="M7 4h10l3 16-8-2.5L4 20z" /><circle cx="12" cy="5.5" r="1.2" /></>,
  Accessory: <><path d="M8.5 3L12 9l3.5-6" /><circle cx="12" cy="15" r="6" /><circle cx="12" cy="15" r="2" /></>,
  Ring: <><circle cx="12" cy="15" r="5.5" /><path d="M9.5 6.5L12 3l2.5 3.5L12 9.5z" /></>,
  Talisman: <><path d="M7 3h10v18H7z" /><circle cx="12" cy="11" r="3" /><circle cx="12" cy="11" r=".8" fill="currentColor" /><path d="M12 15.5V18" /></>,
};

export const ElIcon = ({ el, size = 14 }: { el: string; size?: number }) => svg(size, EL_ICON[el] || EL_ICON.Kim);
export const SlotIcon = ({ slot, size = 22 }: { slot: string; size?: number }) => svg(size, SLOT_ICON[slot] || SLOT_ICON.Talisman);
