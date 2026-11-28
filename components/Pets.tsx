'use client';
// Linh Sủng (lib/pets.ts) on the equipment screen: the slot that was the "Cơ duyên" placeholder, the "Linh Sủng" tab of the bag (next to "Vật phẩm"),
// and the popup of one Linh Sủng. Choosing or resting one is an instant action (lib/intents.ts): it changes at once and nothing is said when it works.
// A Linh Sủng is an ink wash painting (it lives in its master's mind): paper behind every picture. Like the bag, it has nothing to do with Công việc.
import { useState, type CSSProperties, type KeyboardEvent as RKey } from 'react';
import * as PB from '@/lib/pets';
import { levelOf } from '@/lib/game';
import type { GS } from '@/lib/client/types';
import type { Eqx } from './Equip';
import { ModalClose } from './ds/ModalClose';
import { Toast } from './ds/Dialog';
import { Icon } from './ds/Icon';

const keyAct = (fn: () => void) => (e: RKey) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

// The painting of a Linh Sủng in one form, or of the egg. Until `npm run pregen -- --only pets` has painted the set, plain paper with an ink mark stands in.
export function PetPic({ sp, stage, egg, size }: { sp?: string; stage?: number; egg?: boolean; size?: number }) {
  const src = egg ? PB.EGG_ART : PB.petArt(sp || 'tho', stage || 0);
  const [badSrc, setBadSrc] = useState('');   // the picture that failed (another Linh Sủng or form tries its own)
  const box: CSSProperties = size ? { width: size, height: size } : {};
  if (badSrc === src) return <span className={`petPic none ${egg ? 'egg' : ''}`} style={box}>{egg ? <i className="eggShape" /> : <Icon name="paw" size={size ? Math.round(size * 0.42) : 30} />}</span>;
  return <span className="petPic" style={box}><img src={src} alt="" draggable={false} onError={() => setBadSrc(src)} /></span>;
}

// "1 giờ 20 phút", "12 phút", "sắp nở": game time left before the egg in the nest opens
export function hatchLeft(st: GS, e: PB.Egg): string {
  const sec = Math.max(0, e.hatch - st.tick) * st.config.tickSec, m = Math.ceil(sec / 60);
  if (m <= 1) return 'sắp nở';
  return m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`;
}

// Its two stats, as small labelled numbers.
function PetStats({ p, big }: { p: PB.Pet; big?: boolean }) {
  const { luc, man } = PB.petStats(p);
  return (
    <span className={`petStats ${big ? 'big' : ''}`}>
      <span title="Linh Lực: kỹ năng mạnh cỡ nào"><small>Linh Lực</small><b>{luc}</b></span>
      <span title="Linh Mẫn: cơ hội kỹ năng ra tay sau mỗi trận thắng"><small>Linh Mẫn</small><b>{man}%</b></span>
    </span>
  );
}

// The slot: the one that follows; the egg in the nest while none follows; or an empty mould in the shape of an egg.
// Pressing it opens the one that follows, or the "Linh Sủng" tab of the bag when none does.
export function PetSlot({ st, eqx }: { st: GS; eqx: Eqx }) {
  const box = st.pets, p = PB.following(box), egg = box && box.eggs.length ? box.eggs[0] : null;
  const s = p ? PB.PSP(p.sp) : null;
  const open = () => { if (p) eqx.setPetSel(p.id); else eqx.setBagTab('pets'); };
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

// The "Linh Sủng" tab of the bag: the egg in the nest (one at a time), then every Linh Sủng, the one that follows first.
export function PetTab({ st, eqx }: { st: GS; eqx: Eqx }) {
  const box = st.pets || PB.newBox(), egg = box.eggs[0] || null;
  const list = [...box.list].sort((a, b) => (a.id === box.on ? -1 : b.id === box.on ? 1 : b.lv - a.lv || a.id - b.id));
  return (
    <div className="petTab">
      <div className={`petNest ${egg ? 'on' : ''}`}>
        {egg ? <PetPic egg size={52} /> : <span className="petPic none egg" style={{ width: 52, height: 52 }}><i className="eggShape ghost" /></span>}
        <div>
          <b>{egg ? 'Linh Noãn đang ấp' : 'Ổ ấp trống'}</b>
          <small>{egg ? `Còn ${hatchLeft(st, egg)}. Mỗi lần chỉ ấp được một quả.` : 'Thắng trận có lúc nhặt được Linh Noãn. Mỗi lần chỉ ấp được một quả.'}</small>
        </div>
      </div>
      {list.length === 0 ? <div className="hint">Chưa có Linh Sủng nào. Linh Noãn nở ra sẽ tự đi theo ngươi.</div> : (
        <div className="petCards">
          {list.map((p) => {
            const s = PB.PSP(p.sp), on = p.id === box.on;
            return (
              <button key={p.id} type="button" className={`petCard ${on ? 'on' : ''}`} style={{ '--pc': s.hue } as CSSProperties} onClick={() => eqx.setPetSel(p.id)}
                aria-label={`${s.name}, ${PB.STAGES[PB.stageOf(p.lv)].name}, Lv${p.lv}${on ? ', đang đi theo' : ''}`}>
                <PetPic sp={p.sp} stage={PB.stageOf(p.lv)} />
                {on && <span className="petOnTag">Đang đi theo</span>}
                <span className="petCardInfo">
                  <b>{s.name}</b>
                  <small>Lv{p.lv} · {PB.STAGES[PB.stageOf(p.lv)].name}</small>
                  <small className="petSkillName">{s.skill}</small>
                  <PetStats p={p} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The popup of one Linh Sủng: its painting, its own stats and what its skill does, how far to the next form; follow or rest.
export function PetPopup({ st, eqx }: { st: GS; eqx: Eqx }) {
  const box = st.pets, p = eqx.petSel !== null && box ? box.list.find((x) => x.id === eqx.petSel) || null : null;
  if (!p) return null;
  const close = () => eqx.setPetSel(null);
  const s = PB.PSP(p.sp), stage = PB.stageOf(p.lv), need = PB.xpNeed(p.lv), capped = p.lv >= levelOf(st.player), on = box!.on === p.id;
  const next = stage < 2 ? PB.STAGES[stage + 1] : null;
  return (
    <div className="modal zoom" onClick={close} role="dialog" aria-modal="true" aria-label={s.name}>
      <ModalClose onClose={close} />
      <div className="modalBody zoomBody petBody" onClick={(e) => e.stopPropagation()} style={{ '--rc': s.hue } as CSSProperties}>
        <div className="zoomPic petZoom"><PetPic sp={p.sp} stage={stage} /></div>
        <div className="zoomInfo">
          <h2 style={{ color: s.hue }}>{s.name}</h2>
          <div className="chips">
            <span className="chip" style={{ color: s.hue, borderColor: s.hue + '88' }}>{PB.STAGES[stage].name}</span>
            <span className="chip">Lv{p.lv}</span>
            {on && <span className="chip gold">Đang đi theo</span>}
          </div>
          <PetStats p={p} big />
          <p className="petTalent"><b>{s.skill}:</b> {PB.skillText(p)}</p>
          <div className="petXp" aria-label={`Kinh nghiệm ${p.xp}/${need}`}>
            <i style={{ width: `${Math.min(100, (p.xp / need) * 100)}%` }} />
            <span>{capped ? 'Đã ngang cấp chủ: ngươi đột phá thì nó lớn tiếp' : `${p.xp.toLocaleString('vi-VN')} / ${need.toLocaleString('vi-VN')}`}</span>
          </div>
          <p className="petNote">{next ? `Hóa ${next.name} ở Lv${next.from}, chỉ số mạnh hơn.` : 'Đã ở dạng cao nhất.'} Chỉ con đang đi theo mới lớn lên sau mỗi trận thắng. Linh Sủng không cộng vào chỉ số của ngươi, nó giúp bằng kỹ năng.</p>
          <Toast msg={eqx.msg} />
        </div>
        <div className="eqAct">
          {on ? <button className="btn" onClick={() => eqx.petOff()}>Cho nghỉ</button> : <button className="btn hot" onClick={() => eqx.petOn(p.id)}>Cho đi theo</button>}
          <button className="btn ghost" onClick={close}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
