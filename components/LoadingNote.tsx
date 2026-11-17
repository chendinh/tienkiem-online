'use client';
import { useEffect, useState } from 'react';
import * as C from '@/lib/content';
import { Img } from './ui';

// The little lotus that shows until the AI picture (public/art/ui/loading.jpg, prompt PROP_EN.ui_loading) has been drawn.
function Lotus() {
  const petal = (rot: number, fill: string, len: number) => <ellipse cx="32" cy={46 - len / 2} rx={len / 3.1} ry={len / 2} fill={fill} transform={`rotate(${rot} 32 46)`} />;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="18" cy="49" rx="13" ry="5" fill="#4f9a6b" transform="rotate(-12 18 49)" /><ellipse cx="46" cy="49" rx="13" ry="5" fill="#4f9a6b" transform="rotate(12 46 49)" />
      {petal(-62, '#f4a6c0', 26)}{petal(62, '#f4a6c0', 26)}{petal(-32, '#f7bad0', 30)}{petal(32, '#f7bad0', 30)}{petal(0, '#ffe3ec', 32)}
      <circle cx="32" cy="38" r="4.2" fill="#ffd36b" /><circle cx="32" cy="38" r="2" fill="#fff3c4" />
    </svg>
  );
}

// A small notice from the bottom edge while the game is waiting for the server. It appears only if the wait is longer than 200 ms
// (an action the screen already shows never stays long enough to) and stays a moment after, so it never flashes on and off.
export function LoadingNote({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(active), active ? 200 : 450);
    return () => clearTimeout(t);
  }, [active]);
  if (!show) return null;
  return (
    <div className="loadNote" role="status" aria-live="polite">
      <span className="loadLotus"><Img src={C.uiArt('loading')} fb={<Lotus />} /></span>
      <span>Đang xử lý…</span>
    </div>
  );
}
