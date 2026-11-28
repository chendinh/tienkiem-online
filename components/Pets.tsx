'use client';
// Linh Sủng (lib/pets.ts) on the equipment screen: the slot that was the "Cơ duyên" placeholder, and its popup.
// Choosing or resting a Linh Sủng is an instant action (lib/intents.ts): the slot changes at once and nothing is said when it works.
// Like the bag, it has nothing to do with Công việc.
import { useState, type CSSProperties, type KeyboardEvent as RKey } from 'react';
import * as PB from '@/lib/pets';
import { levelOf } from '@/lib/game';
import type { GS } from '@/lib/client/types';
import type { Eqx } from './Equip';
import { ModalClose } from './ds/ModalClose';
import { Toast } from './ds/Dialog';
import { Icon } from './ds/Icon';

const keyAct = (fn: () => void) => (e: RKey) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

// The picture of a Linh Sủng in one form, or of the egg. Until `npm run pregen -- --only pets` has drawn the set, a soft glow in the species' colour stands in.
export function PetPic({ sp, stage, egg, size }: { sp?: string; stage?: number; egg?: boolean; size?: number }) {
  const src = egg ? PB.EGG_ART : PB.petArt(sp || 'tho', stage || 0);
  const [badSrc, setBadSrc] = useState('');   // the picture that failed (another Linh Sủng or form tries its own)
  const bad = badSrc === src;
  const hue = egg ? '#f4e3b0' : PB.PSP(sp || 'tho').hue;
  const box: CSSProperties = size ? { width: size, height: size } : {};
  if (bad) return <span className={`petPic none ${egg ? 'egg' : ''}`} style={{ ...box, '--pc': hue } as CSSProperties}>{egg ? <i className="eggShape" /> : <Icon name="paw" size={size ? Math.round(size * 0.42) : 30} />}</span>;
  return <span className="petPic" style={{ ...box, '--pc': hue } as CSSProperties}><img src={src} alt="" draggable={false} onError={() => setBadSrc(src)} /></span>;
}

// "1 giờ 20 phút", "12 phút", "sắp nở": game time left before an egg opens
export function hatchLeft(st: GS, e: PB.Egg): string {
  const sec = Math.max(0, e.hatch - st.tick) * st.config.tickSec, m = Math.ceil(sec / 60);
  if (m <= 1) return 'sắp nở';
  return m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`;
}

// The slot: the one that follows; an egg being hatched while none follows; or an empty mould in the shape of an egg.
export function PetSlot({ st, eqx }: { st: GS; eqx: Eqx }) {
  const box = st.pets, p = PB.following(box), egg = box && box.eggs.length ? box.eggs[0] : null;
  const s = p ? PB.PSP(p.sp) : null;
  const open = () => eqx.setPetOpen(true);
  const label = p ? `${s!.name}, ${PB.STAGES[PB.stageOf(p.lv)].name}, Lv${p.lv}` : egg ? `Linh Noãn đang ấp, ${hatchLeft(st, egg)}` : 'trống';
  return (
    <div className={`slotTile petSlot ${p ? 'filled' : 'empty'} ${!p && egg ? 'hatching' : ''}`} role="button" tabIndex={0}
      style={p ? ({ '--rc': s!.hue } as CSSProperties) : undefined}
      aria-label={`Linh Sủng: ${label}`} title={`Linh Sủng: ${label}`} onClick={open} onKeyDown={keyAct(open)}>
      {p ? <PetPic sp={p.sp} stage={PB.stageOf(p.lv)} size={56} />
        : egg ? <span className="petEggSlot"><PetPic egg size={56} /><em>{hatchLeft(st, egg)}</em></span>
        : <div className="mold"><i className="eggShape ghost" /></div>}
      <span className="sname">Linh Sủng<small>{p ? `Lv${p.lv}` : egg ? 'đang ấp' : 'Sủng'}</small></span>
    </div>
  );
}

// The popup: who follows and what it gives, how far to the next form, the others to choose from, and the eggs.
export function PetPopup({ st, eqx }: { st: GS; eqx: Eqx }) {
  if (!eqx.petOpen) return null;
  const box = st.pets || PB.newBox(), p = PB.following(box), L = levelOf(st.player);
  const close = () => eqx.setPetOpen(false);
  const s = p ? PB.PSP(p.sp) : null, stage = p ? PB.stageOf(p.lv) : 0, need = p ? PB.xpNeed(p.lv) : 1, capped = !!p && p.lv >= L;
  const next = p && stage < 2 ? PB.STAGES[stage + 1] : null;
  const rest = box.list.filter((x) => x.id !== box.on);
  return (
    <div className="modal zoom" onClick={close} role="dialog" aria-modal="true" aria-label="Linh Sủng">
      <ModalClose onClose={close} />
      <div className="modalBody zoomBody petBody" onClick={(e) => e.stopPropagation()} style={{ '--rc': s ? s.hue : '#e8c77a' } as CSSProperties}>
        <div className="zoomPic petZoom">{p ? <PetPic sp={p.sp} stage={stage} /> : <PetPic egg />}</div>
        <div className="zoomInfo">
          {p ? (
            <>
              <h2 style={{ color: s!.hue }}>{s!.name}</h2>
              <div className="chips">
                <span className="chip" style={{ color: s!.hue, borderColor: s!.hue + '88' }}>{PB.STAGES[stage].name}</span>
                <span className="chip">Lv{p.lv}</span>
                <span className="chip gold"><Icon name={s!.stat === 'hp' ? 'hp' : s!.stat === 'cult' ? 'cult' : 'luck'} size={13} /> {s!.talent}</span>
              </div>
              <p className="petTalent"><b>{s!.talent}:</b> {PB.talentText(p)}</p>
              <div className="petXp" aria-label={`Kinh nghiệm ${p.xp}/${need}`}>
                <i style={{ width: `${Math.min(100, (p.xp / need) * 100)}%` }} />
                <span>{capped ? 'Đã ngang cấp chủ: ngươi đột phá thì nó lớn tiếp' : `${p.xp.toLocaleString('vi-VN')} / ${need.toLocaleString('vi-VN')}`}</span>
              </div>
              <p className="petNote">{next ? `Hóa ${next.name} ở Lv${next.from}.` : 'Đã ở dạng cao nhất.'} Lớn lên sau mỗi trận thắng khi đi theo ngươi.</p>
            </>
          ) : (
            <>
              <h2>Linh Sủng</h2>
              <p className="petNote">{box.eggs.length ? 'Linh Noãn đang được ấp. Nở ra, Linh Sủng sẽ tự đi theo ngươi và giúp ngươi mạnh hơn.' : box.list.length ? 'Không có Linh Sủng nào đang đi theo. Chọn một con bên dưới.' : 'Thắng trận có lúc nhặt được Linh Noãn. Ấp xong sẽ nở ra Linh Sủng.'}</p>
            </>
          )}
          {rest.length > 0 && (
            <div className="petList" role="group" aria-label="Linh Sủng khác">
              <h4>Sủng Các <small>chạm để cho đi theo</small></h4>
              <div className="petRow">
                {rest.map((x) => {
                  const xs = PB.PSP(x.sp);
                  return (
                    <button key={x.id} type="button" className="petPick" style={{ '--pc': xs.hue } as CSSProperties} onClick={() => eqx.petOn(x.id)} title={`${xs.name} · Lv${x.lv} · ${PB.talentText(x)}`}>
                      <PetPic sp={x.sp} stage={PB.stageOf(x.lv)} size={52} />
                      <b>{xs.name}</b><small>Lv{x.lv} · {PB.talentText(x)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {box.eggs.length > 0 && (
            <div className="petList">
              <h4>Linh Noãn <small>{box.eggs.length}/{PB.PET.eggMax}</small></h4>
              <div className="petRow">
                {box.eggs.map((e) => <div key={e.id} className="petPick egg"><PetPic egg size={44} /><small>{hatchLeft(st, e)}</small></div>)}
              </div>
            </div>
          )}
          <Toast msg={eqx.msg} />
        </div>
        <div className="eqAct">
          {p && <button className="btn" onClick={() => eqx.petOff()}>Cho nghỉ</button>}
          <button className="btn ghost" onClick={close}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
