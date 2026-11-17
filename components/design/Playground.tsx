'use client';
import { useState } from 'react';
import { Seg, Tabs } from '../ds/Seg';
import { Icon } from '../ds/Icon';
import { Bar } from '../ui';
import { ElChip } from '../ui';
import { useFx, type FxLevel, type BurstKind } from '../fx/FxProvider';
import { useCue } from '../fx/Cue';
import { sfx, useAudio, getAudio, type Sfx } from '@/lib/audio';

export function Controls() {
  const [speed, setSpeed] = useState(5), [tab, setTab] = useState<'a' | 'b' | 'c'>('a'), [on, setOn] = useState(true), [vol, setVol] = useState(40), [hp, setHp] = useState(72);
  return (
    <div className="ds-stack">
      <div className="glass ds-card"><h4>Nút</h4>
        <div className="ds-row wrap"><button className="btn">Thường</button><button className="btn big" style={{ width: 'auto', marginTop: 0, paddingInline: 28 }}>Chính (vàng)</button><button className="btn hot">Cần chú ý</button><button className="btn ghost">Ẩn nền</button>
          <button className="btn sm">Nhỏ</button><button className="btn icon" aria-label="Âm" title="Nút tròn"><Icon name="music" size={18} /></button><button className="btn" disabled>Vô hiệu</button></div>
        <p className="ds-note">Lướt chuột qua nút để thấy ánh quét; bấm để thấy sóng linh khí lan từ chỗ chạm.</p></div>
      <div className="glass ds-card"><h4>Chọn nhanh và tab</h4>
        <div className="ds-row wrap"><Seg<number> label="Tốc độ" value={speed} onChange={setSpeed} options={[1, 5, 20].map((x) => ({ v: x, label: `×${x}` }))} />
          <label className="tg"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Công tắc ngọc</label>
          <label className="vol" style={{ width: 230, margin: 0 }}><Icon name="volume" size={17} /><input type="range" min={0} max={100} value={vol} style={{ ['--pct' as string]: `${vol}%` }} onChange={(e) => setVol(Number(e.target.value))} /><span className="num">{vol}</span></label></div>
        <Tabs<'a' | 'b' | 'c'> label="Mẫu tab" value={tab} onChange={setTab} options={[{ v: 'a', label: 'Trang bị' }, { v: 'b', label: 'Linh Thú (3)' }, { v: 'c', label: 'Sưu Tập (5/8)' }]} /></div>
      <div className="glass ds-card"><h4>Thanh, chip, chỉ số</h4>
        <label className="vol" style={{ margin: '0 0 8px', width: 300 }}>Sinh lực<input type="range" min={0} max={100} value={hp} style={{ ['--pct' as string]: `${hp}%` }} onChange={(e) => setHp(Number(e.target.value))} /><span className="num">{hp}</span></label>
        <Bar pct={hp} label={`Sinh lực ${hp} / 100`} cls="hp" /><Bar pct={hp} label={hp >= 99 ? 'Bình Cảnh, sẵn sàng đột phá' : `Tu Vi ${hp} / 100`} cls="cp" />
        <p className="ds-note">Kéo thanh trượt xuống: vệt mờ đuổi theo chậm hơn để người chơi cảm được mất mát. Dưới 25% thanh Sinh Lực đập nhịp cảnh báo; đầy thanh Tu Vi thì sáng vàng.</p>
        <div className="chips"><span className="chip">Thường</span><span className="chip gold">Vàng</span>{['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Lôi', 'Âm'].map((e) => <ElChip key={e} el={e} />)}</div>
        <div className="stats" style={{ maxWidth: 420 }}>{[['atk', '128', 'Công'], ['def', '86', 'Thủ'], ['spd', '14', 'Tốc'], ['crit', '8%', 'Bạo'], ['luck', '3', 'Vận'], ['cult', '+11%', 'Tu']].map(([i, v, l]) => <div key={l} className="stat"><Icon name={i} size={20} /><div><b>{v}</b><small>{l}</small></div></div>)}</div></div>
    </div>
  );
}

const EASES: [string, string, string][] = [['--ease-out', 'cubic-bezier(0.16,1,0.3,1)', 'Đến nơi dứt khoát, đáp nhẹ. Mặc định cho mọi thứ xuất hiện.'], ['--ease-io', 'cubic-bezier(0.65,0,0.35,1)', 'Đi và dừng đều. Cho thay đổi lớn, chuyển cảnh.'], ['--ease-drift', 'cubic-bezier(0.37,0,0.63,1)', 'Sin êm. Chỉ cho vòng lặp nền (thở, trôi).'], ['--ease-spring', 'var(--ease-spring)', 'Lò xo, vọt nhẹ rồi lắng. Cho thanh trượt, công tắc, ô trang bị.']];
const DURS: [string, string, string][] = [['--dur-instant', '80ms', 'bấm xuống'], ['--dur-fast', '150ms', 'rê chuột'], ['--dur-base', '260ms', 'đổi trạng thái'], ['--dur-slow', '440ms', 'xuất hiện'], ['--dur-slower', '720ms', 'nhấn mạnh'], ['--dur-ambient', '1200ms', 'đổi cảnh']];

export function Motion() {
  const [n, setN] = useState(0), [run, setRun] = useState(false);
  const go = () => { setRun(false); requestAnimationFrame(() => requestAnimationFrame(() => setRun(true))); };
  return (
    <div className="ds-stack">
      <div className="glass ds-card"><h4>Đường cong chuyển động</h4>
        <button className="btn sm" onClick={go}><Icon name="play" size={14} /> Chạy thử</button>
        <div className="eases">{EASES.map(([name, css, note]) => (
          <div key={name} className="ease"><div className="ease-meta"><code>{name}</code><small>{note}</small></div>
            <div className="ease-track"><i style={{ transform: run ? 'translateX(var(--run))' : 'none', transition: run ? `transform 1.1s ${css}` : 'none' }} /></div></div>))}</div></div>
      <div className="glass ds-card"><h4>Thời lượng</h4><div className="durs">{DURS.map(([k, v, u]) => <div key={k}><b className="num">{v}</b><small>{u}</small><code>{k}</code></div>)}</div></div>
      <div className="glass ds-card"><h4>Xuất hiện lần lượt (stagger 45ms)</h4>
        <button className="btn sm" onClick={() => setN((x) => x + 1)}><Icon name="play" size={14} /> Phát lại</button>
        <div key={n} className="stag">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="glass reveal" style={{ ['--i' as string]: i }}><Icon name={['atk', 'def', 'spd', 'crit', 'luck', 'cult'][i]} size={22} /></div>)}</div></div>
      <div className="glass ds-card"><h4>Chuyển động nền (thở, trôi, xoay)</h4>
        <div className="amb"><div className="amb-orb" /><div className="amb-ring" /><div className="amb-float"><Icon name="lotus" size={30} /></div></div>
        <p className="ds-note">Mọi vòng lặp nền dùng đường cong sin và tạm dừng ở mức hiệu ứng Nhẹ.</p></div>
    </div>
  );
}

const BURSTS: [BurstKind, string][] = [['qi', 'Linh khí'], ['gold', 'Kim quang'], ['petals', 'Cánh hoa'], ['ember', 'Tàn lửa'], ['spark', 'Tia sáng']];
const SFX: [Sfx, string][] = [['tick', 'Chạm'], ['open', 'Mở'], ['chime', 'Chuông'], ['tame', 'Thu phục'], ['equip', 'Mặc đồ'], ['levelup', 'Tăng cấp'], ['rare', 'Đồ hiếm'], ['gong', 'Chiêng'], ['whoosh', 'Gió'], ['thunder', 'Sấm'], ['fail', 'Thất bại']];

export function Effects() {
  const fx = useFx(), cue = useCue();
  const at = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  return (
    <div className="ds-stack">
      <div className="glass ds-card"><h4>Mức hiệu ứng</h4>
        <Seg<FxLevel> label="Mức hiệu ứng" value={fx.level} onChange={fx.setLevel} options={[{ v: 'low', label: 'Nhẹ' }, { v: 'mid', label: 'Vừa' }, { v: 'high', label: 'Nhiều' }]} />
        <p className="ds-note">Nhẹ: chỉ phản hồi khi bấm. Vừa: thêm nghiêng chân dung. Hạt và sóng chỉ xuất hiện trong trận đánh; ở đây là để thử. Lưu theo trình duyệt.</p></div>
      <div className="glass ds-card"><h4>Hạt và sóng</h4>
        <div className="ds-row wrap">{BURSTS.map(([k, t]) => <button key={k} className="btn" onClick={(e) => fx.burst({ ...at(e), kind: k, count: 40 })}>{t}</button>)}
          <button className="btn" onClick={(e) => fx.ring({ ...at(e), size: 160 })}>Sóng vòng</button>
          <button className="btn" onClick={(e) => fx.float('+18 Linh Thạch', { ...at(e), color: '#f6e2a8' })}>Số bay</button></div></div>
      <div className="glass ds-card"><h4>Khoảnh khắc lớn</h4>
        <div className="ds-row wrap"><button className="btn" onClick={() => { fx.lightning({ strikes: 3 }); }}>Thiên Kiếp (3 đợt sấm)</button>
          <button className="btn" onClick={() => fx.flash('gold')}>Chớp vàng</button><button className="btn" onClick={() => fx.shake()}>Rung màn hình</button><button className="btn" onClick={() => fx.vignette('#e85d3d')}>Viền đỏ (thất bại)</button>
          <button className="btn big" style={{ width: 'auto', marginTop: 0, paddingInline: 24 }} onClick={() => cue.breakOk()}>Đột Phá Thành Công</button>
          <button className="btn" onClick={() => cue.drop(5)}>Đồ hạng Tiên rơi</button><button className="btn" onClick={() => cue.drop(3)}>Đồ hạng Địa</button></div></div>
    </div>
  );
}

export function Sound() {
  const a = useAudio(); const eng = getAudio();
  return (
    <div className="ds-stack">
      <div className="glass ds-card"><h4>Âm thanh giao diện (tổng hợp, không dùng tệp)</h4>
        <div className="ds-row wrap">{SFX.map(([k, t]) => <button key={k} className="btn" onClick={() => { eng?.unlock(); if (!a.sfx) eng?.setSfx(true); sfx(k); }}>{t}</button>)}</div>
        <p className="ds-note">Cần bật “Âm thanh giao diện” ở nút nhạc trên đầu trang. Chuông, đàn, chiêng, sấm được dựng bằng Web Audio nên không phải xin giấy phép.</p></div>
      <div className="glass ds-card"><h4>Nhạc nền</h4>
        <div className="ds-row wrap"><button className="btn" onClick={() => eng?.setMusic(!a.music)}><Icon name={a.music ? 'music' : 'music-off'} size={16} /> {a.music ? 'Đang bật' : 'Đang tắt'}</button><button className="btn" onClick={() => eng?.next()}><Icon name="next" size={16} /> Bài khác</button>
          <span className="muted">{a.track ? `${a.track.title} · ${a.track.artist}` : 'Chưa có bài nhạc'}</span></div>
        <p className="ds-note">Danh sách bài ở public/audio/playlist.json. Hai bài mẫu thuộc giấy phép CC BY 4.0, cần ghi công (đã có trong cửa sổ Ghi công).</p></div>
    </div>
  );
}
