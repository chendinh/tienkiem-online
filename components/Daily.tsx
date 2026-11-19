'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as D from '@/lib/daily';
import * as A from '@/lib/arts';
import { BALANCE as B, cultThreshold } from '@/lib/balance';
import { levelOf, SP } from '@/lib/game';
import type { GS } from '@/lib/client/types';
import { ModalClose } from './ds/ModalClose';
import { Icon } from './ds/Icon';
import { Seg } from './ds/Seg';
import { ElIcon } from './Icons';
import { ElChip, Img, GenImg, fmt, useZoom } from './ui';

// Nhiệm Vụ & Tin Tức: what is worth doing today (the daily quest and its reward) and what is going on in the world (the day's chronicle, the creature and
// weapon that are new, the Thiên/Tiên drop windows that are coming, and what every zone's phenomenon does in numbers).
type Tab = 'quest' | 'news';
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dur = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60 ? `${m % 60} phút` : ''}`.trim() : `${m} phút`; };
const nextDay = (ms: number) => Date.parse(D.dayKey(ms) + 'T00:00:00Z') + 86400e3;

export function DailyModal({ st, onClose, onLore }: { st: GS; onClose: () => void; onLore: () => void }) {
  const [tab, setTab] = useState<Tab>('quest');
  const zoom = useZoom();
  const [now, setNow] = useState(st.now);
  useEffect(() => { const t0 = Date.now(), base = st.now; const t = setInterval(() => setNow(base + (Date.now() - t0)), 15000); return () => clearInterval(t); }, [st.now]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  const day = D.dayKey(now), pack = D.packOn(day);
  const q = st.quest && st.quest.day === day ? st.quest : null;
  const need = q ? q.need : B.questTame, n = q ? Math.min(q.n, need) : 0, done = !!q?.done;
  const reward = q?.done ? q.reward : Math.round(cultThreshold(levelOf(st.player)) * B.questCultPct);
  const beast = pack?.beast;   // the creature that is NEW today (none when the daily job had no picture credit)
  const qsp = q ? SP(q.sp) : beast || null;   // the creature of today's quest: the new one, or an old one
  const old = !!q?.old;
  const isNew = !old && !!beast && !!qsp && qsp.id === beast.id;
  const zones = beast ? beast.zones.map((id) => C.ZONE(id).name) : [];
  const qZones = qsp ? C.ZONES.filter((z) => (z.species[qsp.id] || 0) > 0 && z.minLevel <= levelOf(st.player)).map((z) => z.name) : [];
  const pct = Math.round((n / need) * 100);
  const claimedCount = done ? 1 : 0, total = 1;

  const pic = (sp: { id: string; name: string; el: string[] }, art?: string, text?: string) => (
    <button type="button" className="dqPic" title="Bấm để xem ảnh lớn" onClick={() => zoom({ kind: 'prop', src: art || C.monsterArt(sp.id), name: sp.name, text })}>
      <Img src={art || C.monsterArt(sp.id, false, true)} className="fill" fb={<ElIcon el={sp.el[0]} size={44} />} />
    </button>
  );
  const beastPic = beast ? pic(beast, beast.art, beast.legend) : null;

  return (
    <div className="modal dqModal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nhiệm vụ và tin tức">
      <ModalClose onClose={onClose} />
      <div className="modalBody dqShell" onClick={(e) => e.stopPropagation()}>
        <header className="dqHead">
          <div><h2>Nhiệm Vụ &amp; Tin Tức</h2><small>Ngày {day.split('-').reverse().join('/')} · làm mới sau {dur(nextDay(now) - now)}</small></div>
          <Seg<Tab> label="Mục" value={tab} onChange={setTab} options={[
            { v: 'quest' as const, label: <><Icon name="scroll" size={15} /><span>Nhiệm vụ{!done && qsp ? ' (1)' : ''}</span></>, title: 'Việc cần làm hôm nay' },
            { v: 'news' as const, label: <><Icon name="luck" size={15} /><span>Tin tức</span></>, title: 'Yêu thú mới, sự kiện, linh khí từng vùng' },
          ]} />
        </header>

        {tab === 'quest' && (
          <div className="dqBody">
            <div className="dqSum"><span><b>{claimedCount}/{total}</b> nhiệm vụ hoàn thành hôm nay</span><i style={{ '--p': `${claimedCount / total * 100}%` } as CSSProperties} /></div>
            {!qsp && <div className="empty">Thiên Đạo chưa ban nhiệm vụ hôm nay. Quay lại sau ít phút.</div>}
            {qsp && (
              <article className={`dqCard ${done ? 'done' : ''}`}>
                <div className="dqTop">
                  {isNew && beast ? beastPic : pic(qsp)}
                  <div className="dqInfo">
                    <small className="dqKicker">{isNew ? 'Nhiệm vụ ngày · Yêu thú mới' : 'Nhiệm vụ ngày · Linh thú quen'}</small>
                    <h3>Thu phục {need} con {qsp.name}</h3>
                    <div className="chips"><ElChip el={qsp.el[0]} />{qsp.el.slice(1).map((e) => <ElChip key={e} el={e} />)}</div>
                    {isNew && beast && beast.legend && <p className="dqLegend">{beast.legend}</p>}
                  </div>
                </div>
                <div className="dqProg" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={n} aria-label="Tiến độ">
                  <div className="dqBar"><i style={{ width: `${pct}%` }} /></div>
                  <b>{n}/{need}</b>
                </div>
                <div className={`dqReward ${done ? 'got' : ''}`}>
                  <Icon name="lotus" size={22} />
                  <div>
                    <b>{done ? `Đã nhận +${fmt(reward)} Tu Vi` : `Thưởng: +${fmt(reward)} Tu Vi`}{old ? (done ? ' và 1 pháp khí hạng Địa' : ' và 1 pháp khí hạng Địa') : ''}</b>
                    <small>{done ? `Phần thưởng đã cộng vào tu vi của ngươi${old && q?.gift ? `, kèm ${q.gift}` : ''}.` : `Bằng ${Math.round(B.questCultPct * 100)}% Tu Vi cần cho cấp hiện tại (Lv${levelOf(st.player)}), cấp càng cao thưởng càng lớn.${old ? ` Kèm một pháp khí hạng Địa cùng cấp với ngươi (Lv${levelOf(st.player)}), chỉ số ngẫu nhiên.` : ''} Nhận ngay khi thu phục con cuối.`}</small>
                  </div>
                </div>
                {!done && (
                  <ul className="dqTips">
                    <li><Icon name="paw" size={14} /> Gặp ở: <b>{(isNew ? zones : qZones).join(', ') || 'mọi vùng'}</b>{(isNew && beast ? beast.zones.includes(st.zone) : (qsp && (C.ZONES.find((z) => z.id === st.zone)?.species[qsp.id] || 0) > 0)) ? ' (vùng ngươi đang lịch luyện có loài này)' : ''}.</li>
                    <li><Icon name="stone" size={14} /> {isNew ? `Hôm nay loài này xuất hiện nhiều gấp ${D.TODAY_BOOST} lần. ` : ''}Cần Khế Ước Phù để thu phục.</li>
                    <li><Icon name="gear" size={14} /> Bật “Tự thu phục” trong Cài đặt để máy tự thử khi gặp.</li>
                  </ul>
                )}
                {done && <div className="dqDone"><Icon name="check" size={16} /> Hoàn thành. Mai sẽ có nhiệm vụ mới.</div>}
              </article>
            )}
          </div>
        )}

        {tab === 'news' && (
          <div className="dqBody">
            <section className="dqSec">
              <h3>Hôm nay</h3>
              {pack ? (
                <div className="dqNews">
                  <div className="dqNewsRow"><b>{pack.title}</b><small>Chương mới của Nhật Ký Thiên Hạ.</small><button type="button" className="btn sm" onClick={() => { onClose(); onLore(); }}>Đọc nhật ký</button></div>
                  {beast && <div className="dqNewsRow">{beastPic}<span><b>Yêu thú mới: {beast.name}</b><small>Xuất hiện ở {zones.join(', ')}. Nhiều gấp {D.TODAY_BOOST} trong ngày đầu.</small></span></div>}
                  {pack.weapon && (
                    <div className="dqNewsRow"><span className="dqPic sm"><GenImg spec={{ kind: 'item', slot: 'Weapon', base: pack.weapon.base, tier: Math.min(...pack.weapon.tiers), e: '' }} pri={3} fb={<Icon name="atk" size={26} />} /></span>
                      <span><b>Pháp khí mới: {pack.weapon.base}</b><small>{A.ART(pack.weapon.cls)?.name || pack.weapon.cls}. Có thể rơi từ nay về sau.</small>
                        <span className="chips">{[...pack.weapon.tiers].sort((a, b) => a - b).map((t) => <span key={t} className="chip" style={{ color: C.RCOLOR[t], borderColor: C.RCOLOR[t] + '77' }}>{C.RARITY[t]}</span>)}</span></span></div>
                  )}
                </div>
              ) : <div className="empty">Chưa có tin hôm nay.</div>}
            </section>

            <section className="dqSec">
              <h3>Sự kiện rơi pháp khí Thiên / Tiên</h3>
              <p className="dqNote">Mỗi lần một vùng, kéo dài 15 phút: tỷ lệ mỗi món rơi ra là Thiên hoặc Tiên được <b>cộng thêm {Math.round(B.dropEventBonus * 100)}%</b> (cộng thẳng vào xác suất). Trong vùng đó, tỷ lệ gặp Linh Thú cũng tăng thêm <b>{Math.round((B.dropEventMonsterMult - 1) * 100)}%</b>, gặp Tu Sĩ và kỳ ngộ ít đi. Tin được báo trước ở đây.</p>
              {st.events.length === 0 && <div className="empty">Hai giờ tới chưa có sự kiện nào. Quay lại sau.</div>}
              <div className="dqEvents">
                {st.events.map((e) => (
                  <div key={e.startsAt} className={`dqEvent ${e.active ? 'on' : ''}`}>
                    <Img src={C.zoneArt(e.zone)} className="dqEvImg" fb={<span>✦</span>} />
                    <span><b>{e.name}</b><small>{e.active ? `Đang diễn ra, còn ${dur(e.endsAt - now)}` : `Bắt đầu ${hhmm(e.startsAt)} (sau ${dur(e.startsAt - now)}), kéo dài 15 phút`}</small></span>
                    <em className="chip gold">+{Math.round(e.bonus * 100)}% Thiên/Tiên</em>
                    {e.active && st.zone !== e.zone && <small className="dqHintTxt">Đổi sang vùng này để hưởng.</small>}
                    {e.active && st.zone === e.zone && <small className="dqHintTxt up">Ngươi đang ở vùng này.</small>}
                  </div>
                ))}
              </div>
            </section>

            <section className="dqSec">
              <h3>Linh khí từng vùng</h3>
              <p className="dqNote">Mỗi vùng đổi hiện tượng mỗi {Math.round(B.phenomenonSlotSec / 3600)} giờ. Số % là mức thay đổi thật.</p>
              <div className="dqZones">
                {st.zones.map((z) => (
                  <div key={z.id} className="dqZone" style={{ backgroundImage: `linear-gradient(90deg, rgb(4 10 16 / 0.92), rgb(4 10 16 / 0.55)), url(${C.zoneArt(z.id)})` }}>
                    <b>{z.name}</b>
                    {z.phen
                      ? <><span className="dqPhen">{z.phen.name} <small>đến {hhmm(z.phen.endsAt)}</small></span><span className="effRow">{z.phen.effects.map((e) => <span key={e} className={`chip ${/−/.test(e) ? 'bad' : 'gold'}`}>{e}</span>)}</span><small>{z.phen.text}</small></>
                      : <small>Linh khí bình thường, không có hiện tượng.</small>}
                    {z.next && <small className="dqNext">Tiếp theo ({hhmm(z.next.startsAt)}): {z.next.name}{z.next.effects.length ? ` · ${z.next.effects.join(' · ')}` : ''}</small>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
