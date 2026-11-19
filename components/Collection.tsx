'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as X from '@/lib/codex';
import type { GS } from '@/lib/client/types';
import { monsterSpec } from '@/lib/avatarSpec';
import { useGenImage } from '@/lib/useGenImage';
import { useLookKeyPic } from '@/lib/useLookPic';
import { LOOK_COLOR, lookOf, variantName } from '@/lib/zoo';
import { Icon } from './ds/Icon';
import { ElIcon, SlotIcon } from './Icons';
import { Img } from './ui';

// Sưu Tập, the three albums beside the Linh Thú Đồ Giám: Dị Biến (every look of every species), Pháp Khí (every kind and element) and the honours (Ấn) earned for them.
// Everything here is read from the save (lib/codex.ts); nothing is drawn for the player: a picture is shown only for what the player owns.

// ---------------------------------------------------------------- Dị Biến
function MutCell({ sp, look, beastId, seen }: { sp: C.Species; look: string; beastId: number; seen: boolean }) {
  const own = !!beastId;
  const pic = useLookKeyPic(own && look !== 'ngusac' ? `${sp.id}:${look}` : '', beastId, true);
  const g = useGenImage(own && look === 'ngusac' ? monsterSpec(sp.id, true) : null, 4);
  const src = own ? (pic || g.url || C.monsterArt(sp.id, look === 'ngusac', true)) : C.monsterArt(sp.id, false, true);
  return (
    <div className={`mcell ${own ? 'own' : 'lock'}`} style={{ '--hue': LOOK_COLOR[look] } as CSSProperties} title={own ? `${sp.name} · ${variantName(look)}` : seen ? sp.name : 'Chưa gặp'}>
      <Img src={src} className="fill" fb={<ElIcon el={sp.el[0]} size={26} />} />
      {!own && <i className="mq">?</i>}
      <span className="mname">{own || seen ? sp.name : '???'}</span>
    </div>
  );
}
export function MutAlbum({ st }: { st: GS }) {
  const owner = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of st.beasts) { const l = lookOf(b); if (l && !m.has(`${b.sp}:${l}`)) m.set(`${b.sp}:${l}`, b.id); }
    return m;
  }, [st.beasts]);
  const per = useMemo(() => { const o: Record<string, number> = {}; for (const k of owner.keys()) { const l = k.slice(k.indexOf(':') + 1); o[l] = (o[l] || 0) + 1; } return o; }, [owner]);
  const firstOwned = X.MUT_LOOKS.find((l) => per[l.id]);
  const [look, setLook] = useState<string>(firstOwned ? firstOwned.id : X.MUT_LOOKS[0].id);
  const kinds = X.MUT_LOOKS.filter((l) => per[l.id]).length;
  return (
    <div className="mut">
      <div className="alHead">
        <div className="alBig"><b>{owner.size}</b><span>Dị Biến đã có · {kinds}/{X.MUT_LOOKS.length} dạng</span></div>
        <p>Mỗi Dị Biến mang một trong mười dạng, tùy loài và số hiệu của nó, nên cùng một loài có thể hiện ra nhiều dạng. Chọn một dạng để xem mọi loài.</p>
      </div>
      <div className="lookRow" role="tablist" aria-label="Dạng Dị Biến">
        {X.MUT_LOOKS.map((l) => (
          <button key={l.id} type="button" role="tab" aria-selected={look === l.id} className={`lookChip ${look === l.id ? 'on' : ''} ${per[l.id] ? '' : 'none'}`} style={{ '--hue': LOOK_COLOR[l.id] } as CSSProperties} onClick={() => setLook(l.id)}>
            <i /><b>{l.name}</b><small>{per[l.id] || 0}/{C.SPECIES.length}</small>
          </button>
        ))}
      </div>
      <div className="mgrid">
        {C.SPECIES.map((s) => <MutCell key={`${look}${s.id}`} sp={s} look={look} beastId={owner.get(`${s.id}:${look}`) || 0} seen={!!(st.best[s.id] && st.best[s.id].seen)} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pháp Khí
function ItemCell({ slot, base, el, packed }: { slot: string; base: string; el: string; packed: number | undefined }) {
  if (packed === undefined) return <div className="icell empty" style={{ '--el': C.EL[el].color } as CSSProperties} title={`${base} · hệ ${el}: chưa có`}><ElIcon el={el} size={14} /></div>;
  const { tier } = X.albumUnpack(packed);
  // no picture: the element of the kind and a small check in the colour of the frame (the best rarity held)
  return (
    <div className="icell own" style={{ '--rar': C.RCOLOR[tier], '--el': C.EL[el].color } as CSSProperties} title={`${base} · hệ ${el} · hạng cao nhất: ${C.RARITY[tier]}`}>
      <ElIcon el={el} size={22} />
      <i className="ick" aria-hidden="true"><Icon name="check" size={11} /></i>
    </div>
  );
}
export function ItemAlbum({ st }: { st: GS }) {
  const album = st.album || {};
  const [slot, setSlot] = useState<string>('Weapon');
  const tiers = useMemo(() => { const t = [0, 0, 0, 0, 0, 0]; for (const v of Object.values(album)) t[X.albumUnpack(v).tier]++; return t; }, [album]);
  const bySlot = useMemo(() => { const o: Record<string, number> = {}; for (const k of Object.keys(album)) { const s = C.SLOTS[Number(k[0])]; if (s) o[s] = (o[s] || 0) + 1; } return o; }, [album]);
  const entries = Object.keys(album).length;
  const bases = C.basesOf(slot);
  return (
    <div className="itemAl">
      <div className="alHead">
        <div className="alBig"><b>{entries}</b><span>/ {X.ALBUM_TOTAL} kiểu pháp khí đã từng cầm</span></div>
        <div className="alTiers">{C.RARITY.map((r, i) => <span key={r} className="tierPill" style={{ '--rar': C.RCOLOR[i] } as CSSProperties} title={`Hạng cao nhất đã đạt của từng kiểu: ${r}`}><i />{r} <b>{tiers[i]}</b></span>)}</div>
        <p>Mỗi ô là một loại pháp khí ở một hệ. Ô có dấu tích là loại ngươi từng cầm; màu khung và dấu tích là hạng cao nhất đã có.</p>
      </div>
      <div className="slotRow" role="tablist" aria-label="Loại pháp khí">
        {C.SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} className={`slotTab ${slot === s ? 'on' : ''}`} onClick={() => setSlot(s)} title={C.SLOT_VI[s]}>
            <SlotIcon slot={s} size={20} /><small>{bySlot[s] || 0}/{C.basesOf(s).length * C.EO.length}</small>
          </button>
        ))}
      </div>
      <h3 className="alSlot">{C.SLOT_VI[slot]} <small>{C.SLOT_HINT[slot]}</small></h3>
      {bases.map((b) => {
        const have = C.EO.filter((e) => album[X.albumKey(slot, b, e) || ''] !== undefined).length;
        return (
          <div key={b} className={`baseRow ${have === C.EO.length ? 'full' : ''}`}>
            <div className="baseHead"><b>{b}</b><small>{have}/{C.EO.length}</small>{have === C.EO.length && <Icon name="check" size={13} />}</div>
            <div className="baseCells">{C.EO.map((e) => <ItemCell key={e} slot={slot} base={b} el={e} packed={album[X.albumKey(slot, b, e) || '']} />)}</div>
          </div>
        );
      })}
    </div>
  );
}
