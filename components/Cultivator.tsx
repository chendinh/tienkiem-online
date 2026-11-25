'use client';
import { useId, type CSSProperties } from 'react';

// A cultivator standing on a flying sword, seen from the side and facing right (the screen flips it with scaleX). Drawn in code: no picture to pay for, and every visitor can have its own
// colours. The cloth that trails behind (hair, sleeve, sash, talismans) sways by CSS (.cuHair, .cuSleeve, .cuSash, .cuTalis in app/ds/expo.css); a still figure is simply this drawing.
export interface Look { arch: string; g: 'f' | 'm'; robe: string; trim: string; glow: string; hair: string; ph: number }
const SKIN = '#f2d0ae', INK = '#2b1b17', GOLD = '#d9b45e';
// the colours of the six kinds of cultivator (lib/content.ts BUYER_EN says what each one wears)
const PALETTE: Record<string, { robe: string; trim: string; glow: string }> = {
  'Tán Tu': { robe: '#6f879c', trim: '#d2dbe3', glow: '#a5d9ff' },
  'Kiếm Tu': { robe: '#24396d', trim: '#cdd6e8', glow: '#86bcff' },
  'Đan Sư': { robe: '#2f8c69', trim: '#f2e8c9', glow: '#a2f2cd' },
  'Phù Sư': { robe: '#59399a', trim: '#f4effc', glow: '#cdaaff' },
  'Thể Tu': { robe: '#b4622d', trim: '#6a4326', glow: '#ffbb7e' },
  'Ma Tu': { robe: '#1d1624', trim: '#c9283f', glow: '#ff6381' },
};
const HAIR = ['#2a2023', '#3b2a22', '#1f2733', '#4a392f'];
export const lookOf = (arch: string, g: 'f' | 'm', h: number): Look => ({ arch, g, ...(PALETTE[arch] || PALETTE['Tán Tu']), hair: HAIR[h % HAIR.length], ph: ((h >>> 3) % 100) / 50 });

export function Cultivator({ look, className = '' }: { look: Look; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ''), { robe, trim, glow, hair, arch, g } = look;
  const bare = arch === 'Thể Tu', dark = 'rgb(0 0 0 / 0.16)';
  return (
    <svg className={`cu ${className}`} viewBox="0 0 128 96" aria-hidden="true" style={{ '--ph': look.ph } as CSSProperties}>
      <defs>
        <radialGradient id={`${id}g`}><stop offset="0" stopColor={glow} stopOpacity="0.7" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}a`}><stop offset="0" stopColor="#8a3cff" stopOpacity="0.4" /><stop offset="1" stopColor="#8a3cff" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}b`} x1="0" x2="1"><stop offset="0" stopColor="#cfdbe8" /><stop offset="0.7" stopColor="#ffffff" /><stop offset="1" stopColor={glow} /></linearGradient>
      </defs>
      {arch === 'Ma Tu' && <ellipse cx="62" cy="46" rx="32" ry="38" fill={`url(#${id}a)`} />}
      <ellipse cx="68" cy="85" rx="52" ry="5.5" fill={`url(#${id}g)`} />
      {/* the sword: hilt behind, blade forward */}
      <path d="M13 79.6Q70 76 127 78.4Q70 83.4 13 81.8Z" fill={`url(#${id}b)`} stroke={glow} strokeWidth="0.5" strokeOpacity="0.7" />
      <path d="M20 80.7Q70 79 118 79.2" fill="none" stroke={glow} strokeWidth="0.7" opacity="0.8" />
      <rect x="12.5" y="75.6" width="3.2" height="9.6" rx="1.4" fill={GOLD} />
      <rect x="3.5" y="78.6" width="9.6" height="3.4" rx="1.6" fill="#5a3d2b" />
      <circle cx="3.2" cy="80.3" r="2.3" fill={GOLD} />
      <path d="M3 82.4Q0 89 4 94" fill="none" stroke={trim} strokeWidth="1.4" strokeLinecap="round" />
      {/* what hangs behind the shoulders */}
      {arch === 'Tán Tu' && <path d="M47 31L55 21L58.5 33Z" fill="#d8c08a" stroke="#8a6b3a" strokeWidth="0.6" />}
      {arch === 'Kiếm Tu' && <g transform="rotate(-24 52 27)"><rect x="50.7" y="20" width="2.6" height="12" rx="1.1" fill="#5a3d2b" /><rect x="47.8" y="25" width="8.4" height="2" rx="1" fill={GOLD} /></g>}
      <path className="cuSleeve" d="M60 31C50 30 38 34 26 42C24 46 28 47.4 33 45.4C44 42 53 40 61 38Z" fill={robe} stroke={trim} strokeWidth="0.9" strokeLinejoin="round" />
      {/* hair streaming back */}
      <path className="cuHair" d="M56 17.5C48 17.5 42 21 35 19.5" fill="none" stroke={hair} strokeWidth={g === 'f' ? 4.4 : 3.4} strokeLinecap="round" />
      {g === 'f' && <path className="cuHair cuHair2" d="M57 21C48 24 40 33 29 35" fill="none" stroke={hair} strokeWidth="3.6" strokeLinecap="round" />}
      {/* legs and boots */}
      <path d="M57 50L51.5 65L53.5 76.6" fill="none" stroke="#3a3040" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 76.4Q53 74.4 57 77.1V78.8H49.6Z" fill="#2b2224" />
      <path d="M63 50L67 64.5L71 76.4" fill="none" stroke="#3a3040" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M69 76.2Q73 74.8 77.6 77V78.8H69Z" fill="#2b2224" />
      {/* the robe */}
      <path d="M53.5 46.5H69.5L79 67.5Q62 72.4 44 67.5Z" fill={robe} stroke={trim} strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M62 47L70 68Q66 70.4 62 70.2Z" fill={dark} />
      <path d="M44 67.5Q62 72.4 79 67.5" fill="none" stroke={trim} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M53.5 47H69.5L68 31Q61.5 26.5 55.5 31Z" fill={robe} stroke={trim} strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M57 29.8L62 38.6L67 29.8" fill="none" stroke={trim} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="cuSash" d="M53 46.4C44 43 34 51 19 44" fill="none" stroke={trim} strokeWidth="2.8" strokeLinecap="round" />
      <rect x="53" y="44.6" width="17" height="3.4" rx="1" fill={trim} />
      <circle cx="62" cy="46.3" r="1.8" fill={GOLD} />
      {arch === 'Đan Sư' && <><path d="M52 48.4Q49 49.4 49.6 53Q51 55.6 53.6 54.2Q55.2 51.4 52 48.4Z" fill="#d9a03a" /><circle cx="51.6" cy="47.6" r="1" fill="#5a3d2b" /></>}
      {/* head */}
      <circle cx="61.5" cy="20" r="7.4" fill={hair} />
      <circle cx="58.4" cy="12.6" r="3.6" fill={hair} />
      <path d="M55 12.6L62 10.8" stroke={GOLD} strokeWidth="1.1" strokeLinecap="round" />
      {g === 'f' && <circle cx="64.2" cy="12.8" r="1.7" fill={arch === 'Ma Tu' ? '#c9283f' : glow} />}
      <ellipse cx="65.2" cy="21.2" rx="3.8" ry="5.2" fill={SKIN} />
      <circle cx="67.6" cy="20.4" r="0.9" fill={INK} />
      <path d="M65.4 18.2L69 18" stroke={INK} strokeWidth="0.7" strokeLinecap="round" />
      <path d="M66 24.4Q67.2 25.1 68.3 24.4" fill="none" stroke="#b5654f" strokeWidth="0.6" strokeLinecap="round" />
      {/* the arm that points ahead (a sword-finger sign) */}
      {bare
        ? <><path d="M61.5 31C66 30.6 71 31.6 75 34L74 39.6C69 38.4 65 38.4 61.5 38.4Z" fill={robe} stroke={trim} strokeWidth="0.9" /><path d="M72.5 35.4L90 41.6" fill="none" stroke={SKIN} strokeWidth="5.4" strokeLinecap="round" /><path d="M81.5 38.6L86 40.4" fill="none" stroke="#5a3a22" strokeWidth="6.4" strokeLinecap="round" /></>
        : <><path d="M61.5 31C70 30.5 80 33 90 39.5L88.6 45.2C78 42 70 41 61.5 38.6Z" fill={robe} stroke={trim} strokeWidth="0.9" strokeLinejoin="round" /><path d="M86.4 38.4L91.2 41.6L88.8 46.4L84.4 43.4Z" fill={trim} /></>}
      <circle cx="92.4" cy="43.4" r="2.5" fill={SKIN} />
      <path d="M93.2 42.4L99.4 40.6" fill="none" stroke={SKIN} strokeWidth="1.7" strokeLinecap="round" />
      {arch === 'Phù Sư' && <g className="cuTalis">{[0, 1, 2].map((i) => <rect key={i} x={100 + i * 4.4} y={32 + i * 3} width="4.6" height="8.6" rx="0.8" fill="#f6efd0" stroke="#c0392b" strokeWidth="0.5" transform={`rotate(${12 + i * 8} ${102 + i * 4.4} ${36 + i * 3})`} />)}</g>}
    </svg>
  );
}
