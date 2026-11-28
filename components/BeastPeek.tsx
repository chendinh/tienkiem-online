'use client';
import { createPortal } from 'react-dom';
import * as C from '@/lib/content';
import { SP, type Beast } from '@/lib/game';
import { useLookPic } from '@/lib/useLookPic';
import { Icon } from './ds/Icon';
import { ModalClose } from './ds/ModalClose';
import { ElIcon } from './Icons';
import { ElChip, Img, LookTag, PanZoom, SizeMeter, fmt } from './ui';

/** A creature seen up close before it is picked (Thú đi làm, Tìm thú): its picture, Level, Chiến Lực and numbers, and the button that picks it.
 *  `undo`: a creature already picked can be put back from here (a list where several are picked); else the button just says it is picked.
 *  `can`: it can be picked now (false: the button is off and says why, `why`). */
export function BeastPeek({ b, picked, onPick, onClose, note, undo = false, can = true, why = 'Không chọn được' }: {
  b: Beast; picked: boolean; onPick: () => void; onClose: () => void; note?: string; undo?: boolean; can?: boolean; why?: string;
}) {
  const look = useLookPic(b, true), sp = SP(b.sp);
  if (typeof document === 'undefined') return null;
  const off = picked ? !undo : !can;
  return createPortal(
    <div className="modal zoom" onClick={onClose} role="dialog" aria-modal="true" aria-label={b.name}>
      <ModalClose onClose={onClose} />
      <div className="modalBody zoomBody" onClick={(e) => e.stopPropagation()}>
        <div className="zoomPic"><PanZoom><Img src={look || C.monsterArt(b.sp, b.mut)} className="fill" fb={<ElIcon el={sp.el[0]} size={80} />} /></PanZoom></div>
        <div className="zoomInfo">
          <h2>{b.mut && <em className="mutBadge">✦ Dị Biến</em>}<LookTag b={b} /> {b.elite ? 'Tinh Anh ' : ''}{b.name}</h2>
          <div className="chips"><span className="chip">Lv{b.level}</span>{sp.el.map((el) => <ElChip key={el} el={el} />)}<span className="chip">{C.PERS[b.pers].n}</span><span className="chip gold"><Icon name="atk" size={13} /> {fmt(b.power)}</span></div>
          <SizeMeter b={b} />
          <ul className="itLines big"><li>Sinh Lực {b.stats[0]}</li><li>Công Kích {b.stats[2]}</li><li>Phòng Ngự {b.stats[3]}</li><li>Thân Pháp {b.stats[4]}</li></ul>
          {note && <div className="hint">{note}</div>}
        </div>
        <div className="eqAct">
          <button type="button" className={`btn${picked ? '' : ' hot'}`} disabled={off} onClick={onPick}>
            <Icon name={picked && undo ? 'close' : 'check'} size={15} /> {picked ? (undo ? 'Bỏ chọn' : 'Đã chọn') : can ? 'Chọn con này' : why}
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
