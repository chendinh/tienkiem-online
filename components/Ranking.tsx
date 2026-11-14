'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { Beast, Item } from '@/lib/game';
import { rankingGet } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { BeastArt, ElChip, ItemIcon, Img, fmt } from './ui';
import { SlotIcon } from './Icons';
import { Icon } from './ds/Icon';
import { Logo } from './Logo';

type Board = 'cult' | 'power';
interface Row { rank: number; pid: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; power: number; el: string[]; me: boolean; t: number }
interface Profile {
  pid: string; name: string; dao: string; g: 'f' | 'm'; avatar?: string; realm: number; sub: number; level: number; linh: string[]; purity: number; pers: number; origin: number;
  stats: Record<string, number>; power: number; equipment: Record<string, Item | null>; party: Beast[]; beasts: number; species: number; tamedSpecies: number; kills: number;
  rank: { cult: number; power: number }; active: number;
}
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 2 ? 'đang chơi' : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };
const STATS: [string, string, string][] = [['maxHp', 'Sinh Lực', 'hp'], ['atk', 'Công Kích', 'atk'], ['def', 'Phòng Ngự', 'def'], ['spd', 'Thân Pháp', 'spd'], ['crit', 'Bạo Kích %', 'crit'], ['critdmg', 'Bạo Thương %', 'crit'], ['luck', 'May Mắn', 'luck'], ['cult', 'Tu Luyện %', 'cult']];

// Bảng Phong Thần: the ranking of players, and a page for each one (stats, worn items, Linh Thú in battle).
export function RankingModal({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<Board>('cult');
  const [data, setData] = useState<{ rows: Row[]; total: number; me: Row | null } | null>(null);
  const [pid, setPid] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; setData(null); setErr('');
    rankingGet(`board=${board}`).then((j) => { if (!alive) return; if (j.ok) setData(j); else setErr(errText(j.code)); }).catch(() => alive && setErr(errText('E_SERVER')));
    return () => { alive = false; };
  }, [board]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pid) onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose, pid]);

  const rowEl = (r: Row) => (
    <button key={r.pid} className={`rankRow ${r.me ? 'me' : ''}`} onClick={() => setPid(r.pid)} aria-label={`Hạng ${r.rank}, ${r.name}`}>
      <span className={`rankNum r${r.rank <= 3 ? r.rank : 0}`}>{r.rank}</span>
      <span className="rankName"><b>{r.name}</b><small>{r.dao || (r.g === 'f' ? 'Nữ tu' : 'Nam tu')}{r.me ? ' · ngươi' : ''}</small></span>
      <span className="rankRealm">{C.REALMS[r.realm]} · {C.SUBS[r.sub]}<small>Lv{r.level}</small></span>
      <span className="rankPow" title="Chiến Lực"><Icon name="atk" size={14} /> {fmt(r.power)}</span>
    </button>
  );

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bảng Phong Thần">
      <div className="modalBody rankBody" onClick={(e) => e.stopPropagation()}>
        {pid ? <ProfileView pid={pid} onBack={() => setPid(null)} /> : (
          <>
            <h2>Bảng Phong Thần</h2>
            <p className="hint">Danh sách những tu sĩ đứng đầu. Bấm vào một người để xem trang bị, Linh Thú xuất chiến và chỉ số. Ngươi có thể ẩn mình trong Cài đặt.</p>
            <div className="chipPick" role="tablist" aria-label="Bảng">
              {([['cult', 'Tu Vi (cảnh giới)'], ['power', 'Chiến Lực']] as const).map(([v, label]) => (
                <label key={v}><input type="radio" name="board" checked={board === v} onChange={() => setBoard(v)} />{label}</label>
              ))}
            </div>
            {err && <div className="eqMsg err" role="alert">{err}</div>}
            {!data && !err && <div className="empty">Đang xếp hạng…</div>}
            {data && (
              <>
                {data.me ? <div className="rankMe">Hạng của ngươi: <b>{data.me.rank}</b> / {data.total}</div> : <div className="rankMe">Ngươi đang ẩn khỏi bảng.</div>}
                <div className="rankList">{data.rows.map(rowEl)}</div>
                {data.me && data.me.rank > data.rows.length && <div className="rankList">{rowEl(data.me)}</div>}
                {data.rows.length === 0 && <div className="empty">Chưa có ai trên bảng.</div>}
              </>
            )}
            <button className="btn big" onClick={onClose}>Đóng</button>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileView({ pid, onBack }: { pid: string; onBack: () => void }) {
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    rankingGet(`pid=${pid}`).then((j) => { if (!alive) return; if (j.ok) setP(j.profile); else setErr(errText(j.code)); }).catch(() => alive && setErr(errText('E_SERVER')));
    return () => { alive = false; };
  }, [pid]);
  if (err) return <><div className="eqMsg err" role="alert">{err}</div><button className="btn big" onClick={onBack}>Quay lại bảng</button></>;
  if (!p) return <div className="empty">Đang xem…</div>;
  return (
    <div className="rankProfile">
      <div className="rkHead">
        <div className="rkPic">{p.avatar ? <Img src={p.avatar} className="fill" fb={<Logo size={48} />} /> : <Logo size={48} />}</div>
        <div>
          <h2>{p.name}</h2>
          {p.dao && <div className="dao">{p.dao}</div>}
          <div className="realm">{C.REALMS[p.realm]} · {C.SUBS[p.sub]} <small>(Lv{p.level})</small></div>
          <div className="chips">
            {p.linh.map((e) => <ElChip key={e} el={e} />)}<span className="chip">Độ thuần {p.purity}</span><span className="chip">{C.PERS[p.pers].n}</span><span className="chip">{C.ORIGINS[p.origin].n}</span>
          </div>
          <div className="chips">
            <span className="chip gold">Hạng Tu Vi {p.rank.cult || '–'}</span><span className="chip gold">Hạng Chiến Lực {p.rank.power || '–'}</span><span className="chip"><Icon name="atk" size={13} /> {fmt(p.power)}</span>
          </div>
        </div>
      </div>

      <h3>Chỉ số</h3>
      <div className="rkStats">{STATS.map(([k, label, icon]) => <div key={k} className="rkStat"><Icon name={icon} size={16} /><span>{label}</span><b>{fmt(p.stats[k])}</b></div>)}</div>

      <h3>Trang bị đang mặc</h3>
      <div className="rkSlots">
        {C.SLOTS.map((s) => {
          const it = p.equipment[s];
          return (
            <div key={s} className="rkSlot" style={it ? { '--rc': C.RCOLOR[it.tier] } as CSSProperties : undefined}>
              {it ? <ItemIcon it={it} size={54} zoom /> : <div className="mold"><b><SlotIcon slot={s} size={24} /></b></div>}
              <span className="rkSlotName">{it ? it.name : C.SLOT_VI[s]}</span>
              {it && <small style={{ color: C.RCOLOR[it.tier] }}>{C.RARITY[it.tier]} · Lv{it.level}</small>}
            </div>
          );
        })}
      </div>

      <h3>Linh Thú xuất chiến</h3>
      {p.party.length === 0 ? <div className="empty">Chưa có Linh Thú.</div> : (
        <div className="rkParty">
          {p.party.map((b) => (
            <div key={b.id} className={`rkBeast ${b.mut ? 'mutc' : ''}`}>
              <BeastArt b={b} box={96} />
              <b>{b.mut ? '✦ ' : ''}{b.elite ? 'Tinh Anh ' : ''}{b.name}</b>
              <small>Lv{b.level} · {C.PERS[b.pers].n} · <Icon name="atk" size={12} /> {b.power}</small>
              <small>{b.cm} cm · {C.SIZE_CLASS[b.cls]}</small>
            </div>
          ))}
        </div>
      )}
      <div className="hint">Đã thu phục {fmt(p.beasts)} Linh Thú ({p.tamedSpecies} loài), từng gặp {p.species}/{C.SPECIES.length} loài, hạ {fmt(p.kills)} đối thủ. Hoạt động: {ago(p.active)}.</div>
      <button className="btn big" onClick={onBack}>Quay lại bảng</button>
    </div>
  );
}
