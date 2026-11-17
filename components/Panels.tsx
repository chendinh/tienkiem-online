'use client';
import { BattleLog } from './Battle';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BALANCE as B } from '@/lib/balance';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import * as D from '@/lib/daily';
import { allSpecies } from '@/lib/daily';
import type { Report, Beast } from '@/lib/game';
import { releaseValue, upkeepDue, SP } from '@/lib/game';
import { Icon } from './ds/Icon';
import { MultiSelect } from './ds/MultiSelect';
import { MusicPanel } from './audio/MusicOrb';
import { ModalClose } from './ds/ModalClose';
import { askConfirm, Toast } from './ds/Dialog';
import { BeastArt, ElChip, Img, ItemCard, SizeMeter, fmt, useZoom } from './ui';

export type ActRes = { ok: boolean; msg: string; data?: any; code?: string };
export type Act = (type: string, payload?: any) => Promise<ActRes>;

export const pct = (p: number) => (p >= 0.1 ? `${(p * 100).toFixed(1)}%` : p >= 0.001 ? `${(p * 100).toFixed(2)}%` : `${(p * 100).toFixed(4)}%`);
const fmtDur = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`; };
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// ---------- Zone (Requirement 6, 31.4)
export function ZonePicker({ st, act, say }: { st: GS; act: Act; say: (t: string, ok?: boolean) => void }) {
  return (
    <div className="zoneList" role="radiogroup" aria-label="Khu vực lịch luyện">
      {st.zones.map((z) => (
        <button key={z.id} role="radio" aria-checked={st.zone === z.id} className={`zoneRow ${st.zone === z.id ? 'on' : ''}`} disabled={!z.open} style={{ backgroundImage: `url(${C.zoneArt(z.id)})` }}
          onClick={async () => { if (st.zone === z.id) return; const r = await act('zone', { zone: z.id }); say(r.msg, r.ok); }}>
          <b className="zn">{z.name}</b>
          <span className="zs">Lv{z.lv[0]}–{z.lv[1]} · linh khí ×{z.density}</span>
          {!z.open && <span className="zs lock">Cần Lv{z.minLevel} để vào</span>}
          {z.phen && <span className="phenTag" title={z.phen.text}>{z.phen.name}{z.phen.effects.length > 0 && ` · ${z.phen.effects.join(' · ')}`} · đến {hhmm(z.phen.endsAt)}</span>}
          {z.dropEvent && <span className="phenTag drop" title="Sự kiện: tỷ lệ rơi pháp khí Thiên và Tiên tăng trong khu vực này">✦ Rơi Thiên/Tiên +{Math.round(st.events[0]?.bonus * 100) || 1}%</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Phường Thị (Requirement 24)
const owned = (st: GS, s: { kind: string; idx: number }) => (s.kind === 'taming' ? st.inv.taming[s.idx] : s.kind === 'hp' ? st.inv.hp[s.idx] : s.kind === 'bt' ? st.inv.bt[s.idx] : st.inv.trib);
export function ShopPanel({ st, act }: { st: GS; act: Act }) {
  const zoom = useZoom();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const q = (id: string) => qty[id] || 1;
  const set = (id: string, n: number, max: number) => setQty((o) => ({ ...o, [id]: Math.min(Math.max(1, max), Math.max(1, Math.floor(n) || 1)) }));
  const run = async (type: 'buy' | 'sell', item: string, price: number, n = q(item)) => {
    if (type === 'buy' && price * n > st.config.confirmPurchase && !(await askConfirm({ title: 'Xác nhận mua', body: `Mua ${n} món với ${fmt(price * n)} Linh Thạch?`, ok: 'Mua' }))) return;
    const r = await act(type, { item, qty: n });
    setMsg({ t: r.msg, ok: r.ok });
  };
  // quantity: a stepper with the number in the middle, and the usual amounts one tap away
  const qtyBox = (id: string, max: number) => (
    <div className="qtyBox">
      <div className="qtyStep">
        <button type="button" className="btn sm" aria-label="Giảm" disabled={q(id) <= 1} onClick={() => set(id, q(id) - 1, max)}>−</button>
        <input className="inp" type="number" inputMode="numeric" min={1} max={max} value={q(id)} aria-label="Số lượng" onChange={(e) => set(id, Number(e.target.value), max)} />
        <button type="button" className="btn sm" aria-label="Tăng" disabled={q(id) >= max} onClick={() => set(id, q(id) + 1, max)}>+</button>
      </div>
      <div className="qtyQuick" role="group" aria-label="Số lượng nhanh">
        {[1, 2, 5, 10].map((n) => <button key={n} type="button" className={`chip qk ${q(id) === n ? 'on' : ''}`} disabled={n > max} onClick={() => set(id, n, max)}>{n}</button>)}
      </div>
    </div>
  );
  const mats = st.materials.filter((m) => (st.inv.mat[m.id] || 0) > 0);
  return (
    <div>
      <div className="marketWallet" role="status" aria-label={`Linh Thạch hiện có: ${fmt(st.stones)}`}>
        <span className="mwLbl"><Icon name="stone" size={22} /> Linh Thạch</span>
        <b>{fmt(st.stones)}</b>
      </div>
      <div className="marketBanner" style={{ backgroundImage: `url(${C.MARKET_ART})` }}><b>Phường Thị</b><span>Hàng bán không giới hạn, mua bán công khai</span></div>
      <div className="hint">Giá bán lại bằng {Math.round((st.shop[0].sell / st.shop[0].price) * 100)}% giá mua.</div>
      <Toast msg={msg} />
      <div className="shopScroll">
        <div className="shopGrid">
          {st.shop.map((s) => (
            <div key={s.id} className="shopCard">
              <button type="button" className="shopZoom" title="Bấm để xem ảnh lớn" onClick={() => zoom({ kind: 'prop', src: C.shopArt(s.id), name: s.name, text: s.note })}><Img src={C.shopArt(s.id)} className="shopImg" fb={<span>✦</span>} /></button>
              <b className="shopName">{s.name}</b>
              <small className="shopNote">{s.note}</small>
              <div className="shopPrice"><span>Mua <b>{fmt(s.price)}</b></span><span>Bán lại <b>{fmt(s.sell)}</b></span><span>Đang có <b>{fmt(owned(st, s))}</b></span></div>
              {qtyBox(s.id, st.caps.maxQty)}
              <div className="shopBtns">
                <button className="btn hot" onClick={() => run('buy', s.id, s.price)}>Mua {fmt(s.price * q(s.id))}</button>
                <button className="btn" disabled={owned(st, s) <= 0} onClick={() => run('sell', s.id, s.price)}>Bán</button>
              </div>
            </div>
          ))}
        </div>
        <h4>Nguyên liệu</h4>
        {mats.length === 0 && <div className="empty">Chưa có nguyên liệu. Gặp Tài Nguyên khi lịch luyện sẽ nhặt được.</div>}
        <div className="shopGrid">
          {mats.map((m) => (
            <div key={m.id} className="shopCard">
              <button type="button" className="shopZoom" title="Bấm để xem ảnh lớn" onClick={() => zoom({ kind: 'prop', src: C.matArt(m.id), name: m.name })}><Img src={C.matArt(m.id)} className="shopImg" fb={<span>✦</span>} /></button>
              <b className="shopName">{m.name}</b>
              <div className="shopPrice"><span>Bán <b>{fmt(m.price)}</b>/cái</span><span>Đang có <b>{fmt(st.inv.mat[m.id])}</b></span></div>
              {qtyBox(`mat:${m.id}`, st.inv.mat[m.id])}
              <div className="shopBtns">
                <button className="btn" onClick={() => run('sell', `mat:${m.id}`, m.price)}>Bán {fmt(m.price * Math.min(q(`mat:${m.id}`), st.inv.mat[m.id]))}</button>
                <button className="btn" onClick={async () => { const n = st.inv.mat[m.id]; if (!(await askConfirm({ title: 'Bán hết nguyên liệu', body: `Bán toàn bộ ${n} ${m.name}?`, ok: 'Bán hết', danger: true }))) return; const r = await act('sell', { item: `mat:${m.id}`, qty: n }); setMsg({ t: r.msg, ok: r.ok }); }}>Bán hết</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Settings (Requirement 3, 9, 21, 23, 31.5)
const TIERS = C.RARITY.map((n, i) => ({ v: i, n }));
export function SettingsModal({ st, act, onClose, onCredits }: { st: GS; act: Act; onClose: () => void; onCredits?: () => void }) {
  const s = st.set;
  const [ret, setRet] = useState(String(s.retreatPct)), [res, setRes] = useState(String(s.resumePct));
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const patch = async (p: any) => { const r = await act('settings', { patch: p }); setMsg({ t: r.msg, ok: r.ok }); return r.ok; };
  const toggleIn = (arr: number[], v: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cài đặt">
      <ModalClose onClose={onClose} />
      <div className="modalBody" onClick={(e) => e.stopPropagation()}>
        <h2>Cài đặt</h2>
        <Toast msg={msg} />
        <div className="setGrid">
          <h3>Âm nhạc và âm thanh</h3>
          <div className="musicBox"><MusicPanel onCredits={() => { onClose(); onCredits?.(); }} /></div>
          <h3>Nghỉ ngơi</h3>
          <div className="row">
            <label className="field">Nghỉ khi sinh lực dưới (%, từ {B.minRetreatPct})<input type="number" min={B.minRetreatPct} max={99} value={ret} onChange={(e) => setRet(e.target.value)} /></label>
            <label className="field">Quay lại khi hồi tới (%, tối đa 100)<input type="number" min={B.minRetreatPct + 1} max={100} value={res} onChange={(e) => setRes(e.target.value)} /></label>
            <button className="btn" onClick={() => patch({ retreatPct: Number(ret), resumePct: Number(res) })}>Lưu ngưỡng</button>
          </div>
          <div className="row">
            <label className="tg"><input type="checkbox" checked={s.autoPill} onChange={(e) => patch({ autoPill: e.target.checked })} /> Tự dùng Hồi Khí Đan ngay sau mỗi trận, chọn loại vừa đủ cho đến khi đầy sinh lực</label>
          </div>
          <h3>Tự động</h3>
          <div className="row">
            <label className="tg"><input type="checkbox" checked={s.autoEquip} onChange={(e) => patch({ autoEquip: e.target.checked })} /> Tự mặc đồ mạnh hơn (tắt: đồ nhặt được nằm trong túi để ngươi chọn)</label>
            <label className="tg"><input type="checkbox" checked={s.autoBreak} onChange={(e) => patch({ autoBreak: e.target.checked })} /> Tự đột phá khi đủ an toàn</label>
            <label className="tg"><input type="checkbox" checked={s.autoLearn} onChange={(e) => patch({ autoLearn: e.target.checked })} /> Tự học Bí Công khi nhặt được (tắt: Bí Công nằm trong tab Thần Thông để ngươi tự học)</label>
            <label className="tg"><input type="checkbox" checked={s.autoFight} onChange={(e) => patch({ autoFight: e.target.checked })} /> Tự giao chiến với Tu Sĩ</label>
          </div>
          <div className="hint">Tắt tự động thì hành trình dừng lại chờ ngươi chọn: thu phục Linh Thú đáng chú ý, giao chiến hay tránh Tu Sĩ, đột phá khi tới Bình Cảnh. Khi ngươi vắng mặt, hành trình dừng ở câu hỏi đó cho tới khi ngươi quay lại.</div>
          <label className="field">Tự phân giải pháp khí chưa mặc có hạng không cao hơn
            <select value={s.dissolveMax} onChange={(e) => patch({ dissolveMax: Number(e.target.value) })}>
              <option value={-1}>Tắt (không tự phân giải)</option>
              {TIERS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
            </select>
          </label>
          <div className="hint">Mặc định tắt: đồ nhặt được vào túi để ngươi tự quyết định. Khi bật, chỉ phân giải món không khóa khi ô trang bị tương ứng đang có đồ khác.</div>
          <h3>Riêng tư</h3>
          <label className="tg"><input type="checkbox" checked={s.hideRank} onChange={(e) => patch({ hideRank: e.target.checked })} /> Ẩn khỏi Bảng Phong Thần (người khác không thấy tên, trang bị và Linh Thú của ngươi)</label>
          <h3>Tự thu phục</h3>
          <label className="tg"><input type="checkbox" checked={s.autoTame} onChange={(e) => patch({ autoTame: e.target.checked })} /> Bật tự thu phục sau khi thắng</label>
          <label className="tg"><input type="checkbox" checked={s.tame.strong} onChange={(e) => patch({ tame: { strong: e.target.checked } })} /> Chỉ bắt quái mạnh: mạnh hơn con yếu nhất trong đội xuất chiến, hoặc khi đội chưa đủ {st.caps.party} con (thay cho bộ lọc loài và kích cỡ)</label>
          <label className="field">Hạng Khế Ước Phù sẽ dùng
            <select value={s.tame.grade} onChange={(e) => patch({ tame: { grade: Number(e.target.value) } })}>
              {C.GRADES.map((g, i) => <option key={g} value={i}>{g} (đang có {st.inv.taming[i]})</option>)}
            </select>
          </label>
          <div className="row">
            <label className="tg"><input type="checkbox" checked={s.tame.alwaysMut} onChange={(e) => patch({ tame: { alwaysMut: e.target.checked } })} /> Luôn thử với Dị Biến (luôn dùng phù cao nhất đang có)</label>
            <label className="tg"><input type="checkbox" checked={s.tame.newOnly} onChange={(e) => patch({ tame: { newOnly: e.target.checked } })} /> Chỉ loài chưa từng thu phục</label>
          </div>
          <div className="field">
            <span className="fieldLbl">Chỉ thu phục các loài này</span>
            <MultiSelect label="Loài yêu thú muốn thu phục" allText="Tất cả các loài (không lọc)" placeholder="Tìm loài theo tên hoặc hệ…" value={s.tame.species}
              options={allSpecies().slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((sp) => ({ value: sp.id, label: sp.name, hint: sp.el.join('/') }))}
              onChange={(v) => patch({ tame: { species: v } })} />
            <small className="hint">Không chọn loài nào nghĩa là thu phục mọi loài. Chọn vài loài thì chỉ thu phục đúng những loài đó.</small>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Kích thước được phép</legend>
            <div className="chipPick">{C.SIZE_CLASS.map((n, i) => <label key={n}><input type="checkbox" checked={s.tame.sizes.includes(i)} onChange={() => patch({ tame: { sizes: toggleIn(s.tame.sizes, i) } })} />{n}</label>)}</div>
          </fieldset>
        </div>
        <button className="btn big" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}

// ---------- Odds page (Requirement 31.8, 31.9): every number comes from the server
export function OddsModal({ st, onClose }: { st: GS; onClose: () => void }) {
  const o = st.odds;
  const bar = (c: number, soft: number, hard: number) => <div className="bar2" title={`${c}/${hard}`}><i style={{ width: `${Math.min(100, (c / hard) * 100)}%` }} /></div>;
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Xác suất">
      <ModalClose onClose={onClose} />
      <div className="modalBody oddsSect" onClick={(e) => e.stopPropagation()}>
        <h2>Xác suất thật</h2>
        {o.demoRates && <div className="hint warn">Máy chủ đang chạy tỉ lệ thử nghiệm (TUTIEN_RATES=demo): đồ hiếm và Dị Biến ra nhiều hơn bản thật.</div>}
        <div className="hint">Mọi số dưới đây do máy chủ tính ở thời điểm này. Các bảng xác suất cơ bản <b>không gồm Thiên Đạo Bảo Hộ</b>; bộ đếm bảo hộ nằm ở mục riêng bên dưới.</div>

        <h4>Độ hiếm pháp khí mỗi lần rơi (May Mắn hiệu dụng {o.luck})</h4>
        <table className="tbl"><tbody>{C.RARITY.map((n, i) => <tr key={n}><td style={{ color: C.RCOLOR[i] }}>{n}</td><td className="num">{pct(o.tiers[i])}</td></tr>)}</tbody></table>
        <div className="hint">May Mắn đến từ trang bị và Dị Tượng của khu vực; tối đa 100 điểm có tác dụng.</div>

        <h4>Thiên Đạo Bảo Hộ (chống xui)</h4>
        <div>Dị Biến: <b>{o.pity.mut.c}</b> lần liên tiếp không ra. Bắt đầu tăng dần từ {fmt(o.pity.mut.soft)}, chắc chắn ra ở {fmt(o.pity.mut.hard)}.</div>{bar(o.pity.mut.c, o.pity.mut.soft, o.pity.mut.hard)}
        <div style={{ marginTop: 8 }}>Pháp khí Thiên trở lên: <b>{o.pity.item.c}</b> lần rơi liên tiếp không ra. Tăng dần từ {fmt(o.pity.item.soft)}, chắc chắn ở {fmt(o.pity.item.hard)}.</div>{bar(o.pity.item.c, o.pity.item.soft, o.pity.item.hard)}

        <h4>Dị Biến</h4>
        <div>Xác suất cơ bản mỗi Yêu Thú: {pct(o.mutP)} (1 trên {fmt(Math.round(1 / o.mutP))}), cộng thêm 15% chỉ số.</div>

        <h4>Gặp gỡ ở khu vực hiện tại</h4>
        <table className="tbl"><tbody>{o.encounter.map((e) => <tr key={e.n}><td>{e.n}</td><td className="num">{pct(e.p)}</td></tr>)}</tbody></table>
        <h4>Loài Yêu Thú ở khu vực hiện tại</h4>
        <table className="tbl"><tbody>{o.species.filter((x) => x.p > 0).map((e) => <tr key={e.id}><td>{e.n}</td><td className="num">{pct(e.p)}</td></tr>)}</tbody></table>
        <h4>Phần thưởng mỗi lần rơi ({o.dropRolls} lần sau mỗi trận thắng)</h4>
        <table className="tbl"><tbody>{o.drops.map((e, i) => <tr key={i}><td>{{ item: 'Pháp khí', stones: 'Linh Thạch', taming: 'Khế Ước Phù', pill: 'Hồi Khí Đan', material: 'Nguyên liệu', none: 'Không có gì' }[e.kind] || e.kind}</td><td className="num">{pct(e.p)}</td></tr>)}</tbody></table>
        <h4>Kích thước Yêu Thú</h4>
        <table className="tbl"><tbody>{C.SIZE_CLASS.map((n, i) => <tr key={n}><td>{n}</td><td className="num">{pct(o.size[i])}</td></tr>)}</tbody></table>

        <h4>Thu phục</h4>
        <div>Xác suất = {o.taming.base} × hệ số loài × Tính Cách × hệ số hạng Khế Ước Phù × (1 + 5% × chênh lệch cấp), giữ trong khoảng {pct(o.taming.min)} đến {pct(o.taming.max)}. Hệ số hạng Hoàng, Huyền, Địa, Thiên: {o.taming.grades.join(', ')}.</div>

        <h4>Đột phá</h4>
        {o.breakthrough ? <div>Lần tung vào cảnh giới kế tiếp: {pct(o.breakthrough.noPill)} (khi dùng Phá Cảnh Đan: {pct(o.breakthrough.pill)}). Chưa tính các đợt Thiên Kiếp.</div> : <div>Đã tới giới hạn của bản hiện tại.</div>}
        <div>Đốn Ngộ khi Bế Quan: {pct(o.epiphany.p)} mỗi Tick, nhân Tu Vi ×{o.epiphany.mult}. Tâm Ma: Tu Vi ×{o.heartDemon.factor} trong {o.heartDemon.ticks} Tick.</div>

        <h4>Mọi cơ chế ảnh hưởng xác suất</h4>
        <ul>
          <li>May Mắn từ trang bị (tăng độ hiếm pháp khí, có trần).</li>
          <li>Thiên Địa Dị Tượng của khu vực (đổi trọng số gặp gỡ, loài, May Mắn, tốc độ tu luyện).</li>
          <li>Thiên Đạo Bảo Hộ (Dị Biến, pháp khí Thiên trở lên).</li>
          <li>Hạng Khế Ước Phù, Tính Cách và chênh lệch cấp (thu phục).</li>
          <li>Độ thuần Linh Căn, Phá Cảnh Đan (đột phá). Độ Kiếp Phù giảm sát thương Thiên Kiếp, không đổi xác suất tung.</li>
        </ul>
        <button className="btn big" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}

// ---------- Offline_Report (Requirement 4, 31.7)
// The strip above the welcome-back summary: the picture of today's new creature, and tags that are always there (quest, drop event, the phenomenon of the zone the player is in).
// Each tag opens Nhiệm Vụ & Tin Tức.
function ReportTags({ st, onOpen }: { st: GS; onOpen: () => void }) {
  const zoom = useZoom();
  const day = D.dayKey(st.now), pack = D.packOn(day), q = st.quest && st.quest.day === day ? st.quest : null;
  const ev = st.events.find((e) => e.active) || st.events[0], zone = st.zones.find((z) => z.id === st.zone);
  const tags: { key: string; cls: string; icon: string; text: string }[] = [];
  if (pack) {
    const n = q ? Math.min(q.n, q.need) : 0, need = q ? q.need : B.questTame;
    tags.push({ key: 'q', cls: q?.done ? 'done' : 'quest', icon: q?.done ? 'check' : 'scroll', text: q?.done ? `Nhiệm vụ ngày xong · +${fmt(q.reward)} Tu Vi` : `Nhiệm vụ: thu phục ${pack.beast.name} ${n}/${need}` });
  } else tags.push({ key: 'q', cls: 'done', icon: 'scroll', text: 'Nhiệm vụ: hôm nay chưa có' });
  if (ev) {
    const mins = Math.max(0, Math.round(((ev.active ? ev.endsAt : ev.startsAt) - st.now) / 60000));
    tags.push({ key: 'e', cls: ev.active ? 'event on' : 'event', icon: 'luck', text: `${ev.active ? 'Đang diễn ra' : `Sau ${mins} phút`}: rơi Thiên/Tiên +${Math.round(ev.bonus * 100)}% tại ${ev.name}${ev.active ? ` (còn ${mins} phút)` : ''}` });
  } else tags.push({ key: 'e', cls: 'done', icon: 'luck', text: 'Sự kiện rơi Thiên/Tiên: chưa có trong 3 giờ tới' });
  tags.push(zone?.phen
    ? { key: 'p', cls: 'phen', icon: 'lotus', text: `${zone.name}: ${zone.phen.name}${zone.phen.effects.length ? ` · ${zone.phen.effects.join(' · ')}` : ''}` }
    : { key: 'p', cls: 'done', icon: 'lotus', text: `${zone?.name || 'Vùng này'}: linh khí bình thường` });
  const beast = pack?.beast;
  return (
    <div className="repNew">
      {beast && (
        <button type="button" className="repBeast" title={`Yêu thú mới hôm nay: ${beast.name}. Bấm để xem ảnh lớn`} onClick={() => beast.art && zoom({ kind: 'prop', src: beast.art, name: beast.name, text: beast.legend })}>
          {beast.art ? <Img src={beast.art} className="fill" fb={<ElChip el={beast.el[0]} />} /> : <ElChip el={beast.el[0]} />}
          <small>Mới hôm nay</small>
        </button>
      )}
      <div className="repTags" role="group" aria-label="Nhiệm vụ và sự kiện hôm nay">{tags.map((t) => <button key={t.key} type="button" className={`repTag ${t.cls}`} onClick={onOpen}><Icon name={t.icon} size={14} /><span>{t.text}</span></button>)}</div>
    </div>
  );
}
export function ReportModal({ rep, title, onClose, st, onDaily }: { rep: Report; title: string; onClose: () => void; st?: GS; onDaily?: () => void }) {
  const [log, setLog] = useState<{ lines: string[]; foe?: string } | null>(null);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <ModalClose onClose={onClose} />
      <div className="modalBody" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {st && onDaily && <ReportTags st={st} onOpen={() => { onClose(); onDaily(); }} />}
        <p>Ngươi vắng mặt {fmtDur(rep.elapsedSec)}{rep.elapsedSec >= 12 * 3600 ? ' (chỉ tính tối đa 12 giờ)' : ''}. Lúc rời đi: {rep.mode === 'retreat' ? 'Bế Quan' : 'Lịch Luyện'} tại {C.ZONE(rep.zone).name}{rep.recoveryTicks ? `, điều tức ${fmtDur(rep.recoveryTicks * 5)}` : ''}.</p>
        <div className="sum">
          <div><b>{fmt(rep.encounters)}</b><small>chạm trán</small></div>
          <div><b>{rep.wins}/{rep.losses}/{rep.draws}</b><small>thắng/bại/hòa</small></div>
          <div><b>Lv{rep.fromLevel}→{rep.toLevel}</b><small>tu vi</small></div>
          <div><b>{fmt(rep.cp)}</b><small>Tu Vi nhận</small></div>
          <div><b>{fmt(rep.stones)}</b><small>linh thạch</small></div>
          <div><b>{rep.tamed}/{rep.tameTry}</b><small>thu phục</small></div>
          <div><b>{rep.bt.ok}/{rep.bt.fail}</b><small>đột phá ✓/✗</small></div>
          <div><b>{rep.newSpecies.length}</b><small>loài mới</small></div>
        </div>
        <div className="chips">
          {rep.items.map((n, i) => <span key={i} className="chip" style={{ color: C.RCOLOR[i], borderColor: C.RCOLOR[i] + '77' }}>{C.RARITY[i]} ×{n}</span>)}
          <span className="chip">phân giải {rep.dissolved}{rep.dissolvedFull ? ` (${rep.dissolvedFull} vì kho đầy)` : ''}</span><span className="chip">tự mặc {rep.equipped}</span><span className="chip">vào kho tạm {rep.stashed}</span>
        </div>
        <div className="chips">
          <span className="chip">Yêu Thú {rep.enc.monster}</span><span className="chip">Tu Sĩ {rep.enc.npc}</span><span className="chip">Tài Nguyên {rep.enc.resource}</span><span className="chip">Kỳ Ngộ {rep.enc.event}</span>
          {rep.epiphanies > 0 && <span className="chip">Đốn Ngộ {rep.epiphanies}</span>}
          {Object.entries(rep.stonesBy).map(([k, v]) => <span key={k} className="chip gold">{({ victory: 'chiến thắng', drop: 'rơi đồ', event: 'kỳ ngộ', dissolve: 'phân giải' } as Record<string, string>)[k] || k} +{fmt(v)}</span>)}
          {rep.lostStones > 0 && <span className="chip">bỏ do đầy kho: {fmt(rep.lostStones)}</span>}
          {Object.entries(rep.mats).map(([k, v]) => <span key={k} className="chip">{C.MAT(k).name} +{v}</span>)}
          {rep.skipPen > 0 && <span className="chip">bỏ thu phục vì đầy: {rep.skipPen}</span>}
          {rep.skipTalisman > 0 && <span className="chip">bỏ thu phục vì hết Phù: {rep.skipTalisman}</span>}
          <span className="chip">đã dùng Khế Ước {rep.used.taming} · Đan {rep.used.hp} · Độ Kiếp Phù {rep.used.trib} · Phá Cảnh Đan {rep.used.bt}</span>
          {rep.blockedTicks > 0 && <span className="chip">hành trình dừng {fmtDur(rep.blockedTicks * 5)} chờ ngươi quyết định</span>}
          {rep.robbed > 0 && <span className="chip">bị cướp {fmt(rep.robbed)} Linh Thạch</span>}
          {rep.upkeep > 0 && <span className="chip">phí nuôi Linh Thú {fmt(rep.upkeep)}</span>}
          {rep.bt.lostCp > 0 && <span className="chip">mất {fmt(rep.bt.lostCp)} Tu Vi do đột phá thất bại</span>}
          {Object.entries(rep.phen).map(([k, v]) => <span key={k} className="chip">{k}: {v} lượt</span>)}
        </div>
        {rep.beforeTier !== rep.afterTier && <div className="hint">Trang phục đã đổi khi ngươi vắng mặt ({C.RARITY[rep.beforeTier]} ➜ {C.RARITY[rep.afterTier]}). Bấm “Vẽ lại theo trang bị” để cập nhật ảnh nhân vật.</div>}
        <h3>Điểm nhấn</h3>
        <div className="hl">
          {rep.highlights.length === 0 && <div className="empty">Chuyến này yên bình.</div>}
          {rep.highlights.map((h, i) => (
            <div key={i} className="hlRow">
              {h.beast && <BeastArt b={h.beast as Beast} box={88} />}
              <div>{h.text}{h.beast && <SizeMeter b={h.beast as Beast} />}{h.item && <ItemCard it={h.item} />}
                {h.log && h.log.length > 0 && <div><button className="link" onClick={() => setLog({ lines: h.log!, foe: (h.beast as Beast | undefined)?.name })}>Xem diễn biến trận đánh</button></div>}
              </div>
            </div>
          ))}
        </div>
        {log && <BattleLog log={log.lines} foe={log.foe} />}
        <button className="btn big" onClick={onClose}>Tiếp tục tu luyện</button>
      </div>
    </div>
  );
}


// ---------- Zone as a popup (the main screen only shows the name)
// A window of its own for one part of the game (Phường Thị, Linh Thú, Sưu Tập, Thần Thông): a title, the content, and the close seal.
export function Window({ title, icon, sub, wide, onClose, children }: { title: string; icon: string; sub?: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <ModalClose onClose={onClose} label={`Đóng ${title}`} />
      <div className={`modalBody gameWindow ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="winHead"><span className="winSeal"><Icon name={icon} size={22} /></span><div><h2>{title}</h2>{sub && <small>{sub}</small>}</div></div>
        {children}
      </div>
    </div>
  );
}
export function MarketModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  return <Window title="Phường Thị" icon="stone" sub="Mua Khế Ước Phù, Đan Dược; bán nguyên liệu" onClose={onClose}><ShopPanel st={st} act={act} /></Window>;
}
// Luyện Đan: materials become Hồi Khí Đan. Free; only the materials are used.
export function AlchemyModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const have = (m: string) => st.inv.mat[m] || 0;
  const maxOf = (r: C.Recipe) => Math.min(B.stackMax - st.inv.hp[r.grade], ...Object.entries(r.need).map(([m, n]) => Math.floor(have(m) / n)));
  const run = async (id: string, qty: number) => { const r = await act('craft', { id, qty }); setMsg({ t: r.msg, ok: r.ok }); };
  return (
    <Window title="Luyện Đan" icon="lotus" sub="Ghép linh thảo và khoáng vật nhặt được thành Hồi Khí Đan, không tốn Linh Thạch" onClose={onClose}>
      <div className="hint">Đang có Hồi Khí Đan: {st.inv.hp.map((n, i) => `hạng ${i + 1}: ${n}`).join(' · ')}. Đan luyện ra được dùng để hồi sinh lực sau mỗi trận khi bật tự dùng đan.</div>
      {msg && <div className={`eqMsg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.t}</div>}
      <div className="recipes">
        {C.RECIPES.map((r) => {
          const max = Math.max(0, maxOf(r));
          return (
            <div key={r.id} className="recipe">
              <Img src={C.shopArt(r.id)} className="shopImg" fb={<span>✦</span>} />
              <div className="recMain">
                <b>Hồi Khí Đan hạng {r.grade + 1}</b> <small>hồi {Math.round(B.pillRestore[r.grade] * 100)}% sinh lực{r.grade >= B.injuryCurePillGrade ? ', chữa Thương Thế' : ''} · đang có {st.inv.hp[r.grade]}</small>
                <div className="recNeed">{Object.entries(r.need).map(([m, n]) => <span key={m} className={have(m) >= n ? 'ok' : 'lack'}>{C.MAT(m).name} {have(m)}/{n}</span>)}</div>
              </div>
              <div className="recAct">
                <button className="btn sm hot" disabled={max < 1} onClick={() => run(r.id, 1)}>Luyện 1</button>
                <button className="btn sm" disabled={max < 2} onClick={() => run(r.id, max)}>Tối đa ({max})</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hint">Linh thảo hái ở Thanh Vân Sơn Cốc, Thanh Trúc Tinh ở Thanh Vân và Hàn Nguyệt Lâm, Hàn Ngọc Tủy ở Hàn Nguyệt Lâm. Vật liệu không dùng vẫn bán được ở Phường Thị.</div>
    </Window>
  );
}
// Đạo hiệu: what it is and the starting privileges it gave. It belongs to the e-mail address of the account.
export function DaoModal({ dao, email, onClose }: { dao: string; email: string; onClose: () => void }) {
  const info = C.daoInfo(dao);
  return (
    <Window title={info ? `Đạo hiệu: ${info.name}` : 'Đạo hiệu'} icon="crown" sub="Gắn với tài khoản e-mail, không đổi dù ngươi chơi lại" onClose={onClose}>
      {info ? (
        <>
          <p className="tag">{info.blurb}</p>
          <h3>Đặc quyền ban đầu</h3>
          <ul className="itLines big">{C.daoPerkLines(info.perks).map((l) => <li key={l}>{l}</li>)}</ul>
          <div className="hint">Những đặc quyền này được trao một lần, lúc ngươi bước vào đạo đồ. {B.daoShare >= 1 ? ' Hiện mọi tài khoản đều được Thiên Đạo ban một đạo hiệu, sau này sẽ hiếm hơn.' : ' Không phải tài khoản nào cũng có: Thiên Đạo chỉ ban cho một phần.'}</div>
        </>
      ) : (
        <div className="hint">Tài khoản này chưa có đạo hiệu. Thiên Đạo chỉ ban đạo hiệu cho một phần các tài khoản, quyết định theo địa chỉ e-mail và không thay đổi.</div>
      )}
      <div className="hint">Tài khoản: <b>{email}</b></div>
    </Window>
  );
}
// Chức vụ: only a name for now (it gives nothing). It comes and goes when fate puts someone on the road.
export function TitleModal({ title, hist, onClose }: { title?: string; hist?: string[]; onClose: () => void }) {
  const cur = C.titleOf(title), past = (hist || []).map((id) => C.titleOf(id)).filter(Boolean).reverse();
  return (
    <Window title={cur ? `Chức vụ: ${cur.name}` : 'Chức vụ'} icon="scroll" sub="Danh xưng ngươi đang mang, thay đổi theo duyên số" onClose={onClose}>
      {cur ? <p className="tag">{cur.blurb}</p> : <div className="hint">Ngươi chưa mang chức vụ nào. Đi lịch luyện: biết đâu có người định mệnh chặn đường và trao cho ngươi một chức.</div>}
      <div className="hint">Chức vụ hiện chỉ là danh xưng, chưa mang lại lợi ích gì. Nó có thể đổi sang chức khác, hoặc mất đi, khi ngươi gặp người định mệnh trên đường.</div>
      {past.length > 0 && <><h3>Từng giữ</h3><ul className="itLines big">{past.map((t, i) => <li key={i}>{t!.name}</li>)}</ul></>}
    </Window>
  );
}
export function ZoneModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Khu vực">
      <ModalClose onClose={onClose} />
      <div className="modalBody" onClick={(e) => e.stopPropagation()}>
        <h2>Chọn khu vực</h2>
        <Toast msg={msg} />
        <ZonePicker st={st} act={act} say={(t, ok = true) => { setMsg({ t, ok }); if (ok) onClose(); }} />
        {st.zones.filter((z) => z.id === st.zone && z.phen).map((z) => <div key={z.id} className="hint"><b>{z.phen!.name}:</b> {z.phen!.text} {z.phen!.effects.length > 0 && <span className="effRow">{z.phen!.effects.map((e) => <span key={e} className="chip gold">{e}</span>)}</span>}</div>)}
        <button className="btn big" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}

// ---------- Breakthrough: the question, with the odds and what can be spent
export function BreakModal({ st, onBreak, onClose, onLater }: { st: GS; onBreak: (o: { pill: boolean; trib: boolean }) => void; onClose: () => void; onLater?: () => void }) {
  const [pill, setPill] = useState(false), [trib, setTrib] = useState(false);
  const p = st.player, target = p.realm + 1, waves = C.WAVES[target] || 0, o = st.odds.breakthrough, have = st.inv.bt[p.realm] || 0;
  const prob = o ? (pill ? o.pill : o.noPill) : 0;
  const loss = Math.round(0.15 * 100);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Đột phá" onClick={onLater ? undefined : onClose}>
      <ModalClose onClose={onClose} />
      <div className="modalBody" onClick={(e) => e.stopPropagation()}>
        <h2>Đột phá lên {C.REALMS[target]}</h2>
        <p>Ngươi đã tới Bình Cảnh. Xác suất thành công: <b>{pct(prob)}</b>{waves ? `, sau đó vượt ${waves} đợt Thiên Kiếp bằng chính sức chiến đấu của ngươi` : ''}. Thất bại mất {loss}% Tu Vi và bị Tâm Ma {Math.round(720 * 5 / 60)} phút.</p>
        <div className="setGrid">
          <label className="tg"><input type="checkbox" checked={pill} disabled={have <= 0} onChange={(e) => setPill(e.target.checked)} /> Dùng Phá Cảnh Đan (có {have}): +{Math.round(((o?.pill ?? 0) - (o?.noPill ?? 0)) * 100)}% xác suất</label>
          {waves > 0 && <label className="tg"><input type="checkbox" checked={trib} disabled={st.inv.trib <= 0} onChange={(e) => setTrib(e.target.checked)} /> Dùng Độ Kiếp Phù (có {st.inv.trib}): giảm 30% sát thương Thiên Kiếp</label>}
          <div className="hint">Sinh lực hiện tại {fmt(st.player.hp)}. Nên hồi đầy trước khi vượt Thiên Kiếp.</div>
        </div>
        <div className="eqAct">
          <button className="btn big" onClick={() => onBreak({ pill, trib: trib && waves > 0 })}>Đột phá ({pct(prob)})</button>
          <button className="btn" onClick={onLater || onClose}>{onLater ? 'Để sau, tiếp tục hành trình' : 'Đóng'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- the journey waits for an answer (only when the matching auto setting is off).
// A bar at the bottom, not a blocking popup: the player can still open the bag, change gear or buy something before answering.
// Counts down the taming question. The server lets it lapse on its own after the same time; this only shows it and answers 'skip' a moment earlier.
function TameTimer({ id, ms, onExpire }: { id: number; ms: number; onExpire: () => void }) {
  // The length is fixed when the bar appears: the bar then drains in one CSS animation (no state change per frame), so it stays perfectly smooth.
  const total = useMemo(() => Math.max(1, Math.min(ms, B.tameShowSec * 1000)), [id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [secs, setSecs] = useState(Math.ceil(total / 1000));
  const cb = useRef(onExpire); cb.current = onExpire;
  useEffect(() => {
    const end = performance.now() + total;
    const tick = setInterval(() => setSecs(Math.max(0, Math.ceil((end - performance.now()) / 1000))), 200);
    const stop = setTimeout(() => cb.current(), total);
    return () => { clearInterval(tick); clearTimeout(stop); };
  }, [id, total]);
  return (
    <div className="dbTimer" role="timer" aria-label={`Tự bỏ qua sau ${secs} giây`}>
      <div className="dbTrack"><i key={id} style={{ animationDuration: `${total}ms` }} /></div>
      <small>Tự bỏ qua sau {secs} giây</small>
    </div>
  );
}
// What makes this creature worth a Khế Ước: a species the player does not have yet, stronger than the party, or rare.
function tameInfo(st: GS, b: Beast): { t: string; cls: string; tip: string }[] {
  const out: { t: string; cls: string; tip: string }[] = [];
  const have = st.beasts.filter((x) => x.sp === b.sp), sp = SP(b.sp);
  if (have.length === 0) out.push({ t: 'Loài mới', cls: 'new', tip: 'Ngươi chưa có Linh Thú nào thuộc loài này.' });
  else out.push({ t: `Đã có ${have.length}`, cls: '', tip: 'Số Linh Thú cùng loài ngươi đang nuôi.' });
  const party = st.beasts.slice().sort((a, c) => c.power - a.power).slice(0, st.caps.party);
  if (party.length < st.caps.party) out.push({ t: 'Có chỗ xuất chiến', cls: 'up', tip: 'Đội xuất chiến còn trống: con này sẽ ra trận ngay.' });
  else {
    const weakest = party[party.length - 1], best = party[0];
    if (b.power > best.power) out.push({ t: `Mạnh nhất, hơn ${fmt(b.power - best.power)}`, cls: 'up', tip: 'Mạnh hơn cả Linh Thú mạnh nhất đang xuất chiến.' });
    else if (b.power > weakest.power) out.push({ t: `Mạnh hơn đội, +${fmt(b.power - weakest.power)}`, cls: 'up', tip: `Mạnh hơn ${weakest.name} (con yếu nhất đang xuất chiến), sẽ thay vào đội.` });
    else out.push({ t: 'Yếu hơn đội xuất chiến', cls: 'down', tip: 'Không mạnh bằng ba Linh Thú đang xuất chiến, chỉ nuôi để sưu tập.' });
  }
  if (b.mut) out.push({ t: 'Dị Biến', cls: 'rare', tip: 'Biến dị cực hiếm, chỉ số vượt trội.' });
  if (b.elite) out.push({ t: 'Tinh Anh', cls: 'rare', tip: 'Linh Thú tinh anh mạnh hơn cùng loài.' });
  if (b.cls >= 4) out.push({ t: 'Khổng Lồ', cls: 'rare', tip: 'Kích thước thuộc nhóm lớn nhất.' });
  if (sp.tame < 0.7) out.push({ t: 'Khó thu phục', cls: 'rare', tip: 'Loài khó thu phục, tỷ lệ thấp hơn bình thường.' });
  if ((st.best[b.sp]?.tamed || 0) === 0 && have.length > 0) out.push({ t: 'Chưa từng thu phục', cls: '', tip: 'Ngươi giữ con cùng loài từ nguồn khác, chưa tự thu phục.' });
  return out;
}
export function DecisionBar({ st, act, onOpenBreak }: { st: GS; act: Act; onOpenBreak: () => void }) {
  const d = st.decision;
  const [msg, setMsg] = useState('');
  if (!d) return null;
  const go = async (choice: string, extra: any = {}) => { const r = await act('decide', { id: d.id, choice, ...extra }); if (!r.ok) setMsg(r.msg); else setMsg(''); };
  let body: ReactNode;
  if (d.kind === 'break') {
    body = (<>
      <div className="dbText"><b>Đã tới Bình Cảnh</b><small>Đột phá lên {C.REALMS[st.player.realm + 1]}. Hành trình chờ ngươi quyết định.</small></div>
      <div className="dbBtns"><button className="btn hot" onClick={onOpenBreak}>Đột phá…</button><button className="btn" onClick={() => go('later')}>Để sau</button></div>
    </>);
  } else if (d.kind === 'tame') {
    const b = d.beast as Beast;
    const info = tameInfo(st, b);
    body = (<>
      <BeastArt b={b} box={56} onOpen={() => {}} />
      <div className="dbText"><b>{b.mut ? '✦ Dị Biến ' : b.elite ? 'Tinh Anh ' : ''}{b.name} đã gục</b><small>Lv{b.level} · {C.SIZE_CLASS[b.cls]} {b.cm} cm · {C.PERS[b.pers].n} · sức {fmt(b.power)}. Thu phục không?</small>
        <div className="dbTags">{info.map((t) => <span key={t.t} className={`dbTag ${t.cls}`} title={t.tip}>{t.t}</span>)}</div></div>
      <div className="dbBtns">
        {d.grades.map((g) => <button key={g.grade} className="btn hot sm" disabled={g.have <= 0 || d.penFull} title={`Còn ${g.have} Khế Ước ${C.GRADES[g.grade]}`} onClick={() => go('tame', { grade: g.grade })}>{C.GRADES[g.grade]} {pct(g.p)} ({g.have})</button>)}
        <button className="btn sm" onClick={() => go('skip')}>Bỏ qua</button>
      </div>
      {d.penFull && <div className="hint warn">Linh Thú Viên đã đầy: hãy bán bớt Linh Thú.</div>}
      <TameTimer id={d.id} ms={d.msLeft} onExpire={() => { act('decide', { id: d.id, choice: 'skip' }); }} />
    </>);
  } else {
    const n = d.npc, ratio = n.power / Math.max(1, d.mine);
    const verdict = ratio < 0.8 ? ['yếu hơn ngươi', 'up'] : ratio < 1.15 ? ['ngang sức', ''] : ratio < 1.5 ? ['mạnh hơn ngươi', 'down'] : ['rất nguy hiểm', 'down'];
    body = (<>
      <div className="dbText"><b>{n.elite ? 'Tinh Anh ' : ''}{n.name} chặn đường</b><small>Lv{n.level} · {n.el.join('/')} · sức {fmt(n.power)} so với {fmt(d.mine)} của ngươi (<span className={verdict[1]}>{verdict[0]}</span>). Sinh lực {fmt(d.hp)}/{fmt(d.maxHp)}. Thua thì trọng thương và bị cướp ít Linh Thạch.</small></div>
      <div className="dbBtns"><button className="btn hot" onClick={() => go('fight')}>Giao chiến</button><button className="btn" onClick={() => go('avoid')}>Tránh đi</button></div>
    </>);
  }
  return <div className="decisionBar" role="region" aria-label="Hành trình đang chờ ngươi quyết định" aria-live="polite">{body}{msg && <div className="eqMsg err" role="alert">{msg}</div>}</div>;
}

// ---------- Linh Thú Viên: compact tiles, one popup per creature
export function PenPanel({ st, act, say }: { st: GS; act: Act; say: (t: string, ok?: boolean) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const beasts = st.beasts.slice().sort((a, b) => b.power - a.power);
  const party = new Set(beasts.slice(0, st.caps.party).map((b) => b.id));
  const cur = sel === null ? null : beasts.find((b) => b.id === sel) || null;
  const sellOne = async (b: Beast) => {
    if (b.mut && !(await askConfirm({ title: 'Bán Linh Thú Dị Biến', body: `${b.name} là Dị Biến, rất hiếm. Vẫn bán?`, ok: 'Bán', danger: true }))) return;
    const r = await act('release', { id: b.id }); say(r.msg, r.ok); if (r.ok) setSel(null);
  };
  const sellMany = async () => {
    if (!(await askConfirm({ title: 'Bán hàng loạt', body: 'Bán mọi Linh Thú không phải Dị Biến và không nằm trong đội xuất chiến?', ok: 'Bán hết', danger: true }))) return;
    const r = await act('releaseMany'); say(r.msg, r.ok);
  };
  const due = upkeepDue(st);
  return (
    <div>
      <div className="hint">Linh Thú Viên {st.beasts.length}/{st.caps.pen}. Ba Linh Thú mạnh nhất (★) xuất chiến cùng ngươi. Phí nuôi {fmt(due)} Linh Thạch mỗi 10 phút.</div>
      <div className="cleanRow"><button className="btn sm" disabled={beasts.length <= st.caps.party} onClick={sellMany}>Bán nhanh các con dư</button></div>
      {beasts.length === 0 && <div className="empty">Chưa có Linh Thú. Thắng yêu thú rồi dùng Khế Ước Phù, hoặc bật “Tự thu phục” trong Cài đặt.</div>}
      <div className="penGrid">
        {beasts.map((b) => (
          <button key={b.id} className={`penTile ${b.mut ? 'mutc' : ''}`} onClick={() => setSel(b.id)} aria-label={`${b.name} cấp ${b.level}`}>
            <BeastArt b={b} box={72} onOpen={() => setSel(b.id)} />
            <span className="pn">{party.has(b.id) ? '★ ' : ''}{b.mut ? '✦ ' : ''}{b.name}</span>
            <small>Lv{b.level} · {C.SIZE_CLASS[b.cls]}</small>
          </button>
        ))}
      </div>
      {cur && typeof document !== 'undefined' && createPortal(
        <div className="modal zoom" onClick={() => setSel(null)} role="dialog" aria-modal="true" aria-label={cur.name}>
          <ModalClose onClose={() => setSel(null)} />
          <div className="modalBody zoomBody" onClick={(e) => e.stopPropagation()}>
            <div className="zoomPic"><BeastArt b={cur} box={260} onOpen={() => {}} /></div>
            <div className="zoomInfo">
              <h2>{cur.mut && <em className="mutBadge">✦ Dị Biến</em>} {cur.elite ? 'Tinh Anh ' : ''}{cur.name}</h2>
              <div className="chips"><span className="chip">Lv{cur.level}</span><ElChip el={SP(cur.sp).el[0]} /><span className="chip">{C.PERS[cur.pers].n}</span><span className="chip gold"><Icon name="atk" size={13} /> {cur.power}</span>{party.has(cur.id) && <span className="chip">★ xuất chiến</span>}</div>
              <SizeMeter b={cur} />
              <ul className="itLines big"><li>Sinh Lực {cur.stats[0]}</li><li>Công Kích {cur.stats[2]}</li><li>Phòng Ngự {cur.stats[3]}</li><li>Thân Pháp {cur.stats[4]}</li></ul>
              <div className="hint">Thần thông: {cur.skills.join(', ')}. Phí nuôi {Math.ceil(cur.level / 4)} Linh Thạch mỗi 10 phút.</div>
            </div>
            <div className="eqAct">
              <button className="btn hot" onClick={() => sellOne(cur)}>Bán +{fmt(releaseValue(cur))} <Icon name="stone" size={15} /></button>
              <button className="btn ghost" onClick={() => setSel(null)}>Đóng</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
