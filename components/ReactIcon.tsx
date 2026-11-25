'use client';
import { useState } from 'react';
import * as C from '@/lib/content';
import type { Reaction } from '@/lib/expo';

// The faces a visitor of Triển Lãm makes in front of a stand: love, wow, like, sad, angry (lib/expo.ts). The pictures are drawn once with AI (ui_react_* in lib/content.ts PROP_EN,
// `npm run pregen -- --only shop`), so they are the game's own and not a known set of emoji. The small cut-out copy is tried first, then the drawn picture, and until a file exists the screen draws its own simple round faces below, in the same colours.
const BAD = new Map<string, number>();   // how far a picture got: 0 the cut-out, 1 the drawn one, 2 neither (a picture that failed is not asked for again while the page is open)
// warm and bright for the good looks (pink, amber, green), cool and dark for the bad ones (slate blue, dark plum): never two reds
const DISC: Record<Reaction, string> = { love: '#e5578c', wow: '#d9951b', like: '#2f9d6e', sad: '#5a70ab', angry: '#4b2a55' };
const CREAM = '#fff0cf', INK = '#2b1b17';
const heart = (x: number, y: number, s: number) => `M${x} ${y - 0.45 * s}C${x - 0.9 * s} ${y - 1.35 * s} ${x - 1.7 * s} ${y - 0.1 * s} ${x} ${y + 1.2 * s}C${x + 1.7 * s} ${y - 0.1 * s} ${x + 0.9 * s} ${y - 1.35 * s} ${x} ${y - 0.45 * s}Z`;

function Face({ r }: { r: Reaction }) {
  switch (r) {
    case 'love': return <><circle cx="11" cy="25" r="3" fill="#ff9ab0" opacity="0.55" /><circle cx="29" cy="25" r="3" fill="#ff9ab0" opacity="0.55" /><path d={heart(14, 17, 4.2)} fill={CREAM} /><path d={heart(26, 17, 4.2)} fill={CREAM} /><path d="M13.5 25.5Q20 32.5 26.5 25.5" fill="none" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" /></>;
    case 'wow': return <><path d="M9.5 11Q14 7 18.5 10.5M21.5 10.5Q26 7 30.5 11" fill="none" stroke={CREAM} strokeWidth="1.8" strokeLinecap="round" /><circle cx="14" cy="18" r="4.4" fill={CREAM} /><circle cx="26" cy="18" r="4.4" fill={CREAM} /><circle cx="14.4" cy="18.4" r="2.1" fill={INK} /><circle cx="25.6" cy="18.4" r="2.1" fill={INK} /><ellipse cx="20" cy="29" rx="3" ry="4" fill={INK} /><path d="M32 8l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff" /></>;
    case 'like': return <><path d="M11 20.5h4.5v11H11z" fill="#e8c46a" /><path d="M16.8 21l3.6-8.4c.5-1.7 3.4-1.3 3.4.9v4.8h6.6c1.9 0 3 1.7 2.5 3.4l-2.3 7.8c-.4 1.4-1.6 2.3-3 2.3H16.8z" fill={CREAM} stroke="#7a4a1e" strokeWidth="0.8" strokeLinejoin="round" /></>;
    case 'sad': return <><path d="M9.5 14L17 16.5M30.5 14L23 16.5" stroke={CREAM} strokeWidth="1.8" strokeLinecap="round" /><ellipse cx="14" cy="20" rx="2.5" ry="3" fill={CREAM} /><ellipse cx="26" cy="20" rx="2.5" ry="3" fill={CREAM} /><circle cx="14.4" cy="20.6" r="1.3" fill={INK} /><circle cx="25.6" cy="20.6" r="1.3" fill={INK} /><path d="M14 30Q20 24.5 26 30" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round" /><path d="M29.5 24c1.8 2.6 2.2 4.2.2 5-2-.8-2.2-2.4-.2-5z" fill="#8fd2ff" /></>;
    default: return <><path d="M9.5 11.5L18 16M30.5 11.5L22 16" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" /><ellipse cx="14" cy="20" rx="2.6" ry="2.2" fill={CREAM} /><ellipse cx="26" cy="20" rx="2.6" ry="2.2" fill={CREAM} /><circle cx="14.6" cy="20.3" r="1.3" fill={INK} /><circle cx="25.4" cy="20.3" r="1.3" fill={INK} /><path d="M14 30.2H26M17 30.2v-2M20 30.2v-2M23 30.2v-2" stroke={CREAM} strokeWidth="1.7" strokeLinecap="round" /><circle cx="15" cy="6.5" r="2" fill="#d9d4e4" opacity="0.85" /><circle cx="22" cy="4.8" r="2.6" fill="#d9d4e4" opacity="0.85" /></>;
  }
}
function FaceSvg({ r, size }: { r: Reaction; size: number }) {
  return (
    <svg className="xFace" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="18.2" fill={DISC[r]} stroke="#d9b45e" strokeWidth="2.4" />
      <path d="M7 15Q10 6 21 5.5Q13 8 10.5 17Z" fill="#fff" opacity="0.22" />
      <Face r={r} />
    </svg>
  );
}

/** One reaction as a round picture of `size` pixels. */
export function ReactIcon({ r, size = 28 }: { r: Reaction; size?: number }) {
  const [stage, setStage] = useState(BAD.get(r) || 0);
  if (stage >= 2) return <FaceSvg r={r} size={size} />;
  return <img className="xFace xFaceImg" src={stage === 0 ? C.cutArt(`react_${r}`) : C.reactArt(r)} alt="" width={size} height={size} draggable={false} decoding="async" onError={() => { BAD.set(r, stage + 1); setStage(stage + 1); }} />;
}
