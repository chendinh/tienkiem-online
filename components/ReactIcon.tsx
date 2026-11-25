import type { ReactNode } from 'react';
import type { Reaction } from '@/lib/expo';

// The five looks a visitor of Triển Lãm gives a stand (lib/expo.ts), drawn here as plain emoji so each one is understood at a glance, even at 18 px. There is no picture to draw or to load:
//   love  a pink heart                     (mê)
//   wow   star eyes and a big smile        (mắt sáng rỡ)
//   like  a calm face, a small smile       (bình thường, tạm được)
//   sad   a wince, eyes squeezed shut      (nhăn mặt)
//   angry a red scowling face              (ghét)
// Warm and bright for the good looks (pink, yellow), the one red is only the angry face: pink and red are never mixed up.
const INK = '#4a2a10';
const star = (cx: number, cy: number, R: number, r: number) => Array.from({ length: 10 }, (_, i) => { const a = ((-90 + i * 36) * Math.PI) / 180, d = i % 2 ? r : R; return `${i ? 'L' : 'M'}${(cx + d * Math.cos(a)).toFixed(2)} ${(cy + d * Math.sin(a)).toFixed(2)}`; }).join('') + 'Z';
const HEART = 'M20 35.5C9 28 3.5 21.5 3.5 14C3.5 8.8 7.4 5 12.2 5C15.5 5 18.4 6.8 20 9.6C21.6 6.8 24.5 5 27.8 5C32.6 5 36.5 8.8 36.5 14C36.5 21.5 31 28 20 35.5Z';

/** A round face: a darker disc with a lighter one a little higher, so there is a rim underneath and a shine above, and no gradient to give an id. */
const Round = ({ lo, hi, children }: { lo: string; hi: string; children: ReactNode }) => (
  <>
    <circle cx="20" cy="20" r="18.6" fill={lo} />
    <circle cx="20" cy="19" r="17.4" fill={hi} />
    <ellipse cx="13.5" cy="9.6" rx="6" ry="2.9" fill="#fff" opacity="0.3" transform="rotate(-28 13.5 9.6)" />
    {children}
  </>
);
const YELLOW = { lo: '#f0a521', hi: '#ffd54d' };
const line = { fill: 'none', stroke: INK, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const FACES: Record<Reaction, ReactNode> = {
  love: (
    <>
      <path d={HEART} fill="#d42b7a" transform="translate(0 1.4)" />
      <path d={HEART} fill="#ff6fb0" />
      <ellipse cx="11.6" cy="11.6" rx="4.2" ry="2.3" fill="#fff" opacity="0.5" transform="rotate(-35 11.6 11.6)" />
    </>
  ),
  wow: (
    <Round {...YELLOW}>
      <path d={star(13.4, 16.2, 5.8, 2.5)} fill="#f2561b" stroke="#b83a0a" strokeWidth="0.6" strokeLinejoin="round" />
      <path d={star(26.6, 16.2, 5.8, 2.5)} fill="#f2561b" stroke="#b83a0a" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M11.5 24.2Q20 36.5 28.5 24.2Z" fill={INK} />
      <ellipse cx="20" cy="29" rx="3.7" ry="1.7" fill="#ff7d7d" />
    </Round>
  ),
  like: (
    <Round {...YELLOW}>
      <ellipse cx="14" cy="17.2" rx="2" ry="2.8" fill={INK} />
      <ellipse cx="26" cy="17.2" rx="2" ry="2.8" fill={INK} />
      <path d="M14 25.6Q20 30.4 26 25.6" {...line} strokeWidth="2.3" />
    </Round>
  ),
  sad: (
    <Round {...YELLOW}>
      <path d="M8.8 14.4L16.4 17.8L8.8 21.2" {...line} strokeWidth="2.4" />
      <path d="M31.2 14.4L23.6 17.8L31.2 21.2" {...line} strokeWidth="2.4" />
      <path d="M13 29.4Q16.5 25.4 20 28.4Q23.5 25.4 27 29.4" {...line} strokeWidth="2.3" />
      <path d="M32.2 7.8Q36.2 13 32.2 15.4Q28.2 13 32.2 7.8Z" fill="#7cc8ff" stroke="#3a90d0" strokeWidth="0.7" strokeLinejoin="round" />
    </Round>
  ),
  angry: (
    <Round lo="#b8240f" hi="#f2552c">
      <path d="M8.4 11L17.6 15.6M31.6 11L22.4 15.6" fill="none" stroke="#3b0d05" strokeWidth="3.1" strokeLinecap="round" />
      <ellipse cx="14" cy="20" rx="2.1" ry="2.4" fill="#3b0d05" />
      <ellipse cx="26" cy="20" rx="2.1" ry="2.4" fill="#3b0d05" />
      <path d="M13.4 30Q20 23.2 26.6 30" fill="none" stroke="#3b0d05" strokeWidth="2.7" strokeLinecap="round" />
    </Round>
  ),
};

/** One reaction as an emoji of `size` pixels. */
export function ReactIcon({ r, size = 28 }: { r: Reaction; size?: number }) {
  return <svg className="xFace" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">{FACES[r]}</svg>;
}
