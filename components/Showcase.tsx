'use client';
import type { CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { ShowView } from '@/lib/game';
import { SP } from '@/lib/game';
import { lookOf, variantName } from '@/lib/zoo';
import { useLookPic } from '@/lib/useLookPic';
import { ElIcon } from './Icons';
import { ElChip, Img, ItemIcon } from './ui';
import type { Beast } from '@/lib/game';

// Trưng Bày: the one item or beast a player hangs on the wall of their page, framed like a painting. Others see it when they open the profile from the ranking.
// The frame is plain CSS (a gilded wooden frame, a dark mat, a hanging cord and a brass plaque), so nothing is drawn or loaded for it.
// The creature's own picture fills the whole frame (the small cut-out of BeastArt, sized by its body and sitting low, left empty bands around it).
function BeastPic({ b }: { b: Beast }) {
  const look = useLookPic(b, false);
  return <Img src={look || C.monsterArt(b.sp, b.mut, false)} className="fill" fb={<ElIcon el={SP(b.sp).el[0]} size={64} />} />;
}
export function ShowFrame({ show, size = 190 }: { show: ShowView; size?: number }) {
  if (!show) return null;
  const item = show.kind === 'item' ? show.item : null, beast = show.kind === 'beast' ? show.beast : null;
  const rc = item ? C.RCOLOR[item.tier] : beast && beast.mut ? '#ffd36e' : '#e5c07b';
  const look = beast ? lookOf(beast) : null;
  return (
    <figure className="frame" style={{ '--rc': rc, '--fs': `${size}px` } as CSSProperties}>
      <span className="frCord" aria-hidden="true" />
      <div className="frOut">
        <i className="frCorner tl" aria-hidden="true" /><i className="frCorner tr" aria-hidden="true" /><i className="frCorner bl" aria-hidden="true" /><i className="frCorner br" aria-hidden="true" />
        <div className="frMat">
          <div className="frPic">
            {item && <ItemIcon it={item} size="fit" zoom />}
            {beast && <BeastPic b={beast} />}
          </div>
        </div>
      </div>
      <figcaption className="frPlaque">
        <b style={{ color: rc }}>{item ? item.name : `${beast!.mut ? '✦ ' : ''}${beast!.elite ? 'Tinh Anh ' : ''}${beast!.name}`}</b>
        <span>
          {item && <>{C.RARITY[item.tier]} · {C.SLOT_VI[item.slot]} · Lv{item.level}</>}
          {beast && <>Lv{beast.level}{look ? ` · ${variantName(look)}` : ''} · {C.SIZE_CLASS[beast.cls]}</>}
        </span>
        {item && <ElChip el={item.el} />}
        {beast && <ElChip el={SP(beast.sp).el[0]} />}
      </figcaption>
    </figure>
  );
}
