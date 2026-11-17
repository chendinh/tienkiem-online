'use client';
import { ModalClose } from './ds/ModalClose';
import { useEffect, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import type { Beast, Item } from '@/lib/game';
import { rankingGet } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { BeastArt, ElChip, ItemIcon, Img, fmt, useZoom } from './ui';
import { ElIcon, SlotIcon } from './Icons';
import { Icon } from './ds/Icon';
import { Seg } from './ds/Seg';
import { Logo } from './Logo';

type Board = 'cult' | 'power';
interface Row { rank: number; pid: string; name: string; dao: string; g: 'f' | 'm'; realm: number; sub: number; level: number; power: number; el: string[]; me: boolean; t: number; qd?: number; av?: string }
interface Profile {
  pid: string; name: string; dao: string; title?: string; g: 'f' | 'm'; avatar?: string; realm: number; sub: number; level: number; linh: string[]; purity: number; pers: number; origin: number;
  stats: Record<string, number>; power: number; equipment: Record<string, Item | null>; party: Beast[]; beasts: number; species: number; tamedSpecies: number; kills: number; quests?: number;
  rank: { cult: number; power: number }; active: number;
}
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 2 ? 'đang chơi' : m < 60 ? `${m} phút trước` : m < 1440 ? `${Math.round(m / 60)} giờ trước` : `${Math.round(m / 1440)} ngày trước`; };
const STATS: [string, string, string][] = [['maxHp', 'Sinh Lực', 'hp'], ['atk', 'Công Kích', 'atk'], ['def', 'Phòng Ngự', 'def'], ['spd', 'Thân Pháp', 'spd'], ['crit', 'Bạo Kích %', 'crit'], ['critdmg', 'Bạo Thương %', 'crit'], ['luck', 'May Mắn', 'luck'], ['cult', 'Tu Luyện %', 'cult']];
const elColor = (r: Row) => C.EL[r.el[0]]?.color || 'var(--gold-300)';
// The tag of honour for finishing the daily quest, with how many times it was done.
const QuestTag = ({ n, big }: { n?: number; big?: boolean }) => (n && n > 0 ? <span className={`questTag${big ? ' big' : ''}`} title={`Đã hoàn thành nhiệm vụ ngày ${n} lần`}><Icon name="scroll" size={big ? 15 : 12} /> Nhiệm vụ ngày ×{n}</span> : null);
const MEDAL = ['', 'Thiên Bảng', 'Địa Bảng', 'Nhân Bảng'];

// Bảng Phong Thần: a stele of the strongest cultivators. The first three stand on a podium, the rest follow in a list,
// and the right-hand page shows the chosen one (stats, worn items, Linh Thú in battle). On a narrow screen the page replaces the list.
export function RankingModal({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<Board>('cult');
  const [data, setData] = useState<{ rows: Row[]; total: number; me: Row | null } | null>(null);
  const [pid, setPid] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; setData(null); setErr('');
    rankingGet(`board=${board}`).then((j) => {
      if (!alive) return;
      if (!j.ok) { setErr(errText(j.code)); return; }
      setData(j);
      // with room for two panes, open the first page at once
      if (window.matchMedia('(min-width: 900px)').matches) setPid((cur) => cur ?? j.me?.pid ?? j.rows[0]?.pid ?? null);
    }).catch(() => alive && setErr(errText('E_SERVER')));
    return () => { alive = false; };
  }, [board]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  const rows = data?.rows || [];
  const top = rows.slice(0, 3), rest = rows.slice(3);
  const maxPow = Math.max(1, ...rows.map((r) => r.power)), maxLv = Math.max(1, ...rows.map((r) => r.level));
  const metric = (r: Row) => board === 'power' ? <><Icon name="atk" size={14} /> {fmt(r.power)}</> : <><Icon name="rise" size={14} /> Lv{r.level}</>;
  const pct = (r: Row) => Math.max(4, Math.round((board === 'power' ? r.power / maxPow : r.level / maxLv) * 100));
  const who = (r: Row) => r.dao || (r.g === 'f' ? 'Nữ tu' : 'Nam tu');

  const pod = (r: Row | undefined, i: number) => {
    if (!r) return <div key={`e${i}`} className="pod empty" aria-hidden="true" />;
    const k = r.rank <= 3 ? r.rank : 3;
    return (
      <button key={r.pid} type="button" className={`pod r${k} ${r.me ? 'me' : ''} ${pid === r.pid ? 'sel' : ''}`} style={{ '--el': elColor(r) } as CSSProperties} onClick={() => setPid(r.pid)} aria-label={`Hạng ${r.rank}, ${r.name}`}>
        {k === 1 && <span className="podCrown"><Icon name="crown" size={26} /></span>}
        <span className={`podSeal ${r.av ? 'face' : ''}`}>{r.av ? <Img src={`${r.av}?s=face`} className="faceImg" fb={<ElIcon el={r.el[0] || 'Kim'} size={k === 1 ? 32 : 26} />} /> : <ElIcon el={r.el[0] || 'Kim'} size={k === 1 ? 32 : 26} />}</span>
        <b className="podName">{r.name}</b>
        <small className="podDao">{who(r)}{r.me ? ' · ngươi' : ''}</small>
        <QuestTag n={r.qd} />
        <span className="podRealm">{C.REALMS[r.realm]} · {C.SUBS[r.sub]}</span>
        <span className="podMetric">{metric(r)}</span>
        <span className="podStand"><i>{r.rank}</i><em>{MEDAL[k]}</em></span>
      </button>
    );
  };

  const rowEl = (r: Row) => (
    <button key={r.pid} type="button" className={`rkRow ${r.me ? 'me' : ''} ${pid === r.pid ? 'sel' : ''}`} style={{ '--el': elColor(r), '--pct': `${pct(r)}%` } as CSSProperties} onClick={() => setPid(r.pid)} aria-label={`Hạng ${r.rank}, ${r.name}`}>
      <span className="rkNum">{r.rank}</span>
      <span className={`rkEl ${r.av ? 'face' : ''}`}>{r.av ? <Img src={`${r.av}?s=face`} className="faceImg" fb={<ElIcon el={r.el[0] || 'Kim'} size={18} />} /> : <ElIcon el={r.el[0] || 'Kim'} size={18} />}</span>
      <span className="rkWho"><b>{r.name}</b><small>{who(r)}{r.me ? ' · ngươi' : ''}</small><QuestTag n={r.qd} /></span>
      <span className="rkRealm">{C.REALMS[r.realm]} · {C.SUBS[r.sub]}<small>Lv{r.level}</small></span>
      <span className="rkMetric">{metric(r)}</span>
      <i className="rkBar" aria-hidden="true" />
    </button>
  );

  return (
    <div className="modal rkModal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Bảng Phong Thần">
      <ModalClose onClose={onClose} />
      <div className={`modalBody rkShell ${pid ? 'viewing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="rkBanner">
          <div className="rkTitle">
            <span className="rkSeal"><Icon name="crown" size={22} /></span>
            <div><h2>Bảng Phong Thần</h2><small>{data ? `${data.total} tu sĩ đã ghi danh` : 'Thiên Đạo đang xếp hạng…'}</small></div>
          </div>
          <Seg<Board> label="Bảng" value={board} onChange={setBoard} options={[
            { v: 'cult' as const, label: <><Icon name="lotus" size={15} /><span>Tu Vi</span></>, title: 'Xếp theo cảnh giới' },
            { v: 'power' as const, label: <><Icon name="atk" size={15} /><span>Chiến Lực</span></>, title: 'Xếp theo sức mạnh chiến đấu' },
          ]} />
        </header>

        <div className="rkBody">
          <section className="rkBoard" aria-label="Danh sách">
            {err && <div className="eqMsg err" role="alert">{err}</div>}
            {!data && !err && <div className="rkSkel" aria-busy="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>}
            {data && rows.length === 0 && <div className="empty">Chưa có ai trên bảng.</div>}
            {data && rows.length > 0 && (
              <>
                <div className="rkPodium">{[1, 0, 2].map((i) => pod(top[i], i))}</div>
                {rest.length > 0 && <div className="rkList">{rest.map(rowEl)}</div>}
              </>
            )}
            {data && (
              <div className="rkMe">
                {data.me ? <><span className="rkMeLbl">Hạng của ngươi <b>{data.me.rank}</b> / {data.total}</span>{rowEl(data.me)}</> : <span className="rkMeLbl">Ngươi đang ẩn khỏi bảng. Bật lại trong Cài đặt.</span>}
              </div>
            )}
          </section>

          <aside className="rkDetail" aria-label="Chi tiết">
            {pid ? <ProfileView key={pid} pid={pid} onBack={() => setPid(null)} /> : <div className="rkHintBox"><Icon name="scroll" size={34} /><p>Bấm vào một tu sĩ để xem chỉ số, trang bị và Linh Thú xuất chiến.</p></div>}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ pid, onBack }: { pid: string; onBack: () => void }) {
  const zoom = useZoom();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; setP(null); setErr('');
    rankingGet(`pid=${pid}`).then((j) => { if (!alive) return; if (j.ok) setP(j.profile); else setErr(errText(j.code)); }).catch(() => alive && setErr(errText('E_SERVER')));
    return () => { alive = false; };
  }, [pid]);
  const back = <button type="button" className="btn sm ghost rkBack" onClick={onBack}><Icon name="back" size={15} /> Về bảng</button>;
  if (err) return <>{back}<div className="eqMsg err" role="alert">{err}</div></>;
  if (!p) return <>{back}<div className="empty">Đang xem…</div></>;
  return (
    <div className="rankProfile">
      {back}
      <div className="rkHead">
        <div className="rkPic">{p.avatar ? <Img src={p.avatar} className="fill" fb={<Logo size={48} />} /> : <Logo size={48} />}</div>
        <div className="rkWhoBig">
          <h2>{p.name}</h2>
          {p.dao && <div className="dao">{p.dao}</div>}
          {p.title && <div className="titleChip static">{p.title}</div>}
          <QuestTag n={p.quests} big />
          <div className="realm">{C.REALMS[p.realm]} · {C.SUBS[p.sub]} <small>(Lv{p.level})</small></div>
          <div className="chips">
            {p.linh.map((e) => <ElChip key={e} el={e} />)}<span className="chip">Độ thuần {p.purity}</span><span className="chip">{C.PERS[p.pers].n}</span><span className="chip">{C.ORIGINS[p.origin].n}</span>
          </div>
        </div>
      </div>
      <div className="rkRanks">
        <div><small>Hạng Tu Vi</small><b>{p.rank.cult || '–'}</b></div>
        <div><small>Hạng Chiến Lực</small><b>{p.rank.power || '–'}</b></div>
        <div><small>Chiến Lực</small><b><Icon name="atk" size={15} /> {fmt(p.power)}</b></div>
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
    </div>
  );
}
