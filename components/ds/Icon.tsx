import type { ReactNode } from 'react';

// The game's one icon family: 24px grid, 1.7 stroke, round caps, a soft duotone fill on the main shape.
// It replaces the emoji that used to stand in for icons (they look different on every device and clash with the art).
const F = { fill: 'currentColor', fillOpacity: 0.16 } as const;
const P: Record<string, ReactNode> = {
  atk: <><path d="M20 4l-9.5 9.5" /><path d="M8.5 11.5l4 4" /><path d="M10.5 13.5l-5 5" /><circle cx="4.7" cy="19.3" r="1.1" /><path d="M20 4l-.2 4.6L15.4 4z" {...F} /></>,
  def: <><path d="M12 3l7 2.6v5.4c0 4.6-3 8-7 10-4-2-7-5.4-7-10V5.6z" {...F} /><path d="M12 7.5v9" /></>,
  spd: <><path d="M3 9h10.5a2.5 2.5 0 10-2.5-2.5" /><path d="M3 13h14.5a2.5 2.5 0 11-2.5 2.5" /><path d="M3 17h7" /></>,
  crit: <><path d="M12 2.8l2.3 6.2 6.2 2.3-6.2 2.3L12 19.8l-2.3-6.2-6.2-2.3L9.7 9z" {...F} /></>,
  luck: <><path d="M12 12c-2.6-2.4-2.6-5.8 0-7.4 2.6 1.6 2.6 5 0 7.4zM12 12c2.4-2.6 5.8-2.6 7.4 0-1.6 2.6-5 2.6-7.4 0zM12 12c2.6 2.4 2.6 5.8 0 7.4-2.6-1.6-2.6-5 0-7.4zM12 12c-2.4 2.6-5.8 2.6-7.4 0 1.6-2.6 5-2.6 7.4 0z" {...F} /><path d="M12 12l3.2 8.2" /></>,
  cult: <><path d="M12 4.5c-2.2 2.6-2.4 5.6 0 8.5 2.4-2.9 2.2-5.9 0-8.5z" {...F} /><path d="M4.5 8.8c3 .1 5.2 2 5.8 5-2.7.4-5.3-.8-5.8-5zM19.5 8.8c-3 .1-5.2 2-5.8 5 2.7.4 5.3-.8 5.8-5z" /><path d="M4 16.5c3.4 3.6 12.6 3.6 16 0" /></>,
  hp: <path d="M12 20s-7.2-4.4-7.2-10.2A4.1 4.1 0 0112 7.3a4.1 4.1 0 017.2 2.5C19.2 15.6 12 20 12 20z" {...F} />,
  stone: <><path d="M6.5 4h11L21 9l-9 11L3 9z" {...F} /><path d="M3 9h18M9 9l3 11M15 9l-3 11" /></>,
  contract: <><path d="M7 3h10v18H7z" {...F} /><circle cx="12" cy="10.5" r="2.8" /><path d="M12 15v3" /></>,
  bolt: <path d="M13.5 2.5L5 13.5h6l-1.5 8L19 10h-6.2z" {...F} />,
  book: <><path d="M3.5 5.6C6.4 4.6 9.4 4.9 12 6.6c2.6-1.7 5.6-2 8.5-1v12.2c-2.9-1-5.9-.7-8.5 1-2.6-1.7-5.6-2-8.5-1z" {...F} /><path d="M12 6.6v12.2" /></>,
  brush: <><path d="M20.5 3.5l-9.2 9.2" /><path d="M9.3 11l3.7 3.7c0 2.9-1.9 4.8-5.8 4.8.2-1.3.4-2 .8-2.7.4-.7 1-1 1.2-1.9z" {...F} /></>,
  lock: <><path d="M7.5 10.5V8a4.5 4.5 0 019 0v2.5" /><rect x="5" y="10.5" width="14" height="10" rx="2" {...F} /><path d="M12 14.5v2.5" /></>,
  unlock: <><path d="M7.5 10.5V8a4.5 4.5 0 018.6-1.8" /><rect x="5" y="10.5" width="14" height="10" rx="2" {...F} /><path d="M12 14.5v2.5" /></>,
  music: <><path d="M9 17.5V6l10-2v11.5" /><circle cx="6.5" cy="17.5" r="2.5" {...F} /><circle cx="16.5" cy="15.5" r="2.5" {...F} /></>,
  'music-off': <><path d="M9 17.5V6l10-2v8" /><circle cx="6.5" cy="17.5" r="2.5" /><path d="M3.5 3.5l17 17" /></>,
  volume: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" {...F} /><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /></>,
  gear: <><circle cx="12" cy="12" r="3" {...F} /><circle cx="12" cy="12" r="6.6" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  info: <><circle cx="12" cy="12" r="9" {...F} /><path d="M12 11v5.5M12 7.8v.4" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M6.3 17.7l2.4-2.4M15.3 8.7l2.4-2.4" /></>,
  bag: <><path d="M8.5 5.5c1.5 1 5.5 1 7 0l1.2 3c2.8 1.9 3.8 4.9 2.8 7.7-.9 2.4-3.4 3.8-7.5 3.8s-6.6-1.4-7.5-3.8c-1-2.8 0-5.8 2.8-7.7z" {...F} /><path d="M9 5.5L8 3h8l-1 2.5" /></>,
  paw: <><path d="M12 12.5c-3 0-5.2 2.3-5.2 4.3 0 1.7 1.5 2.7 3.2 2.7.8 0 1.3-.3 2-.3s1.2.3 2 .3c1.7 0 3.2-1 3.2-2.7 0-2-2.2-4.3-5.2-4.3z" {...F} /><circle cx="5.6" cy="10.4" r="1.6" /><circle cx="9.6" cy="6.4" r="1.6" /><circle cx="14.4" cy="6.4" r="1.6" /><circle cx="18.4" cy="10.4" r="1.6" /></>,
  clock: <><circle cx="12" cy="12" r="9" {...F} /><path d="M12 7v5.2l3.2 2" /></>,
  play: <path d="M8 5.5v13l11-6.5z" {...F} />,
  pause: <><path d="M8 5.5v13M16 5.5v13" /></>,
  next: <><path d="M6 5.5v13l9-6.5z" {...F} /><path d="M18 5.5v13" /></>,
  prev: <><path d="M18 5.5v13l-9-6.5z" {...F} /><path d="M6 5.5v13" /></>,
  moon: <path d="M19.5 14.6A8 8 0 019.4 4.5a8 8 0 1010.1 10.1z" {...F} />,
  sun: <><circle cx="12" cy="12" r="4" {...F} /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
  lotus: <><path d="M12 4.5c-2.2 2.6-2.4 5.6 0 8.5 2.4-2.9 2.2-5.9 0-8.5z" {...F} /><path d="M4.5 8.8c3 .1 5.2 2 5.8 5-2.7.4-5.3-.8-5.8-5zM19.5 8.8c-3 .1-5.2 2-5.8 5 2.7.4 5.3-.8 5.8-5z" /><path d="M4 16.5c3.4 3.6 12.6 3.6 16 0" /></>,
  rise: <><path d="M7 11l5-5 5 5" /><path d="M7 18l5-5 5 5" /></>,
  taiji: <><circle cx="12" cy="12" r="9" /><path d="M12 3a4.5 4.5 0 010 9 4.5 4.5 0 000 9" {...F} /><circle cx="12" cy="7.5" r=".9" fill="currentColor" /><circle cx="12" cy="16.5" r=".9" fill="currentColor" /></>,
  robe: <path d="M9 3l3 5 3-5 5 3.5-2.5 3.5L16 9.5V21H8V9.5L6.5 10 4 6.5z" {...F} />,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13h9l1-13" {...F} /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...F} /><circle cx="12" cy="12" r="2.6" /></>,
  crown: <><path d="M3.5 8l4.2 4 4.3-6.5 4.3 6.5 4.2-4-1.6 10.5H5.1z" {...F} /><path d="M5.5 20.5h13" /></>,
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  chest: <><rect x="3.5" y="8" width="17" height="11.5" rx="2" {...F} /><path d="M3.5 12.5h17M4.5 8c0-2.4 3-4 7.5-4s7.5 1.6 7.5 4" /><path d="M12 11.2v3.2" /></>,
  back: <path d="M15 6l-6 6 6 6" />,
  scroll: <><path d="M7 4.5h11a2 2 0 012 2v1.5H9V6.5a2 2 0 00-2-2z" {...F} /><path d="M7 4.5a2 2 0 00-2 2V18a2 2 0 002 2h10a2 2 0 002-2V8" /><path d="M9 12h7M9 15.5h5" /></>,
  wind: <><path d="M3 9h10.5a2.5 2.5 0 10-2.5-2.5" /><path d="M3 13h14.5a2.5 2.5 0 11-2.5 2.5" /></>,
  cloud: <><path d="M7 18h10.2a4 4 0 00.5-7.97A6 6 0 006.2 8.7 4.7 4.7 0 007 18z" {...F} /><path d="M9 14.2c.8-1 2-1.4 3-1" /></>,
  flame: <path d="M12 3c.6 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 01-11 0c0-2.2 1-3.7 2.5-5 .2 1.8.8 2.8 1.8 3.3C10.5 8.5 10.8 5.5 12 3z" {...F} />,
};

export type IconName = keyof typeof P;
export function Icon({ name, size = 18, className = '', title }: { name: IconName | string; size?: number; className?: string; title?: string }) {
  return (
    <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {P[name] || P.sparkle}
    </svg>
  );
}
export const ICON_NAMES = Object.keys(P);
