'use client';
import type { CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { ShowView } from '@/lib/game';
import { SP } from '@/lib/game';
import { useLookPic } from '@/lib/useLookPic';
import { ElIcon } from './Icons';
import { Img, ItemIcon, useZoom } from './ui';
import type { Beast } from '@/lib/game';

// Trưng Bày: the one item or beast a player hangs on the wall of their page, framed like a painting. Others see it when they open the profile from the ranking.
// The frame is plain CSS (a gilded wooden frame, a dark mat and a hanging cord; the item or beast opens its popup on a click), so nothing is drawn or loaded for it.
// The creature's own picture fills the whole frame (the small cut-out of BeastArt, sized by its body and sitting low, left empty bands around it).
function BeastPic({ b }: { b: Beast }) {
  const look = useLookPic(b, false), zoom = useZoom();
  return <div className="fill zoomable" title="Bấm để xem chi tiết" onClick={() => zoom({ kind: 'beast', b })}><Img src={look || C.monsterArt(b.sp, b.mut, false)} className="fill" fb={<ElIcon el={SP(b.sp).el[0]} size={64} />} /></div>;
}
export function ShowFrame({ show, size = 190 }: { show: ShowView; size?: number }) {
  if (!show) return null;
  const item = show.kind === 'item' ? show.item : null, beast = show.kind === 'beast' ? show.beast : null;
  const rc = item ? C.RCOLOR[item.tier] : beast && beast.mut ? '#ffd36e' : '#e5c07b';
  return (
    <figure className="frame" style={{ '--rc': rc, '--fs': `${size}px` } as CSSProperties}>
      <span className="frCord" aria-hidden="true" />
      <div className="frOut">
        <i className="frCorner tl" aria-hidden="true" /><i className="frCorner tr" aria-hidden="true" /><i className="frCorner bl" aria-hidden="true" /><i className="frCorner br" aria-hidden="true" />
        <div className="frMat">
          <div className="frPic">
            {item && <ItemIcon it={item} size="fit" zoom full />}
            {beast && <BeastPic b={beast} />}
          </div>
        </div>
      </div>
    </figure>
  );
}
