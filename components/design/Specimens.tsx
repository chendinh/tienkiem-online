'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import * as C from '@/lib/content';
import { Icon, ICON_NAMES } from '../ds/Icon';
import { ElIcon, SlotIcon } from '../Icons';

export const Section = ({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: ReactNode }) => (
  <section id={id} className="ds-sec">
    <div className="eyebrow">{eyebrow}</div>
    <h2>{title}</h2>
    {intro && <p className="ds-intro">{intro}</p>}
    <div className="ds-body">{children}</div>
  </section>
);

const PRINCIPLES = [
  ['lotus', 'Thanh tịnh', 'Nhiều khoảng thở, chuyển động chậm và mềm. Chỉ khoảnh khắc lớn (đột phá, đồ hiếm) mới được bùng lên.'],
  ['sparkle', 'Linh khí', 'Mọi thứ có một chút ánh sáng sống: ngọc phát quang, hạt linh khí bay, nút tỏa sóng khi chạm.'],
  ['mountain', 'Thủy mặc', 'Chiều sâu từ phong cảnh nhiều lớp, sương trôi, vignette tối ở viền. Không bao giờ phẳng.'],
  ['stone', 'Ngọc và Kim', 'Hai chất liệu duy nhất: kính ngọc bích trong mờ và dát vàng. Tiêu đề, viền, nút chính là vàng; sự sống là ngọc.'],
  ['taiji', 'Tám hệ, sáu phẩm', 'Màu hệ chỉ làm điểm nhấn, độ hiếm quyết định mức hiệu ứng: càng hiếm, càng sáng và càng động.'],
];

export function Principles() {
  return <div className="ds-grid p5">{PRINCIPLES.map(([ic, t, d]) => <div key={t} className="glass ds-card"><div className="ds-ic"><Icon name={ic === 'mountain' ? 'cloud' : ic} size={22} /></div><h4>{t}</h4><p>{d}</p></div>)}</div>;
}

function Swatch({ name, label }: { name: string; label?: string }) {
  const [hex, setHex] = useState('');
  useEffect(() => { setHex(getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()); }, [name]);
  return <div className="sw" title={`--${name}`}><i style={{ background: `var(--${name})` }} /><b>{label || name}</b><small>{hex}</small></div>;
}
const range = (p: string, steps: string[]) => steps.map((s) => <Swatch key={s} name={`${p}-${s}`} label={s} />);

export function Colors() {
  return (
    <div className="ds-stack">
      <div><h4>Ink: màn đêm của thế giới</h4><div className="sws">{range('ink', ['950', '900', '850', '800', '700', '600', '500', '400'])}</div></div>
      <div><h4>Mist: chữ và ánh sáng nhạt</h4><div className="sws">{range('mist', ['50', '100', '200', '300', '400', '500'])}</div></div>
      <div><h4>Jade: sự sống, qi, hành động phụ</h4><div className="sws">{range('jade', ['200', '300', '400', '500', '600', '700', '800'])}</div></div>
      <div><h4>Gold: dát vàng, tiêu đề, hành động chính</h4><div className="sws">{range('gold', ['100', '200', '300', '400', '500', '600', '700'])}</div></div>
      <div><h4>Điểm nhấn</h4><div className="sws"><Swatch name="cinnabar-400" label="cinnabar" /><Swatch name="azure-400" label="azure" /><Swatch name="violet-400" label="violet" /><Swatch name="rose-400" label="rose" /></div></div>
      <div><h4>Tám hệ</h4>
        <div className="sws">{C.EO.map((e, i) => <div key={e} className="sw" style={{ color: C.EL[e].color }}><i style={{ background: C.EL[e].color }} /><b><ElIcon el={e} size={14} /> {e}</b><small>{C.EL[e].color}</small></div>)}</div></div>
      <div><h4>Sáu phẩm</h4>
        <div className="sws">{C.RARITY.map((r, i) => <div key={r} className="sw" style={{ color: C.RCOLOR[i] }}><i style={{ background: C.RCOLOR[i] }} /><b>{r}</b><small>{C.RCOLOR[i]}</small></div>)}</div></div>
    </div>
  );
}

export function Type() {
  return (
    <div className="ds-stack">
      <div className="glass ds-card"><div className="eyebrow">Display · Cormorant Garamond 600 / 700</div>
        <div className="display gold-text" style={{ fontSize: 'var(--fs-4xl)', lineHeight: 1.05 }}>Tiên Kiếm</div>
        <div className="display" style={{ fontSize: 'var(--fs-3xl)' }}>Đột Phá Thành Công</div>
        <div className="display" style={{ fontSize: 'var(--fs-2xl)', color: 'var(--gold-300)' }}>Thiên Huyền Đại Lục</div>
        <div className="display" style={{ fontSize: 'var(--fs-xl)', color: 'var(--jade-300)' }}>Luyện Khí · Đỉnh Phong</div>
        <div className="display" style={{ fontSize: 'var(--fs-lg)', fontStyle: 'italic', color: 'var(--text-2)' }}>Vạn kiếp tu hành, một niệm thành tiên.</div>
      </div>
      <div className="glass ds-card"><div className="eyebrow">Text · Spectral 400 / 500 / 600</div>
        <p style={{ fontSize: 'var(--fs-lg)' }}>Ngươi hái được vài cây linh dược quý, luyện thành Khế Ước Phù. Linh khí đang rối loạn, thú lạ đổi sắc.</p>
        <p>Thân pháp +2, Công Kích +6, Tu Luyện +8%. Ngọc Bội Huyền cấp 12 tỏa ánh lục nhạt.</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>Cỡ nhỏ 13px dùng cho mô tả phụ, vẫn đọc rõ dấu tiếng Việt chồng (ế, ổ, ữ).</p>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Cỡ 12px chỉ dùng cho nhãn, chú thích, số liệu phụ.</p>
      </div>
      <div className="glass ds-card ds-row"><div><div className="eyebrow">Số liệu</div><div className="display num" style={{ fontSize: 'var(--fs-3xl)', color: 'var(--gold-200)' }}>1.248.600</div><small>lining + tabular: số thẳng hàng, không nhảy khi đổi</small></div>
        <div><div className="eyebrow">Eyebrow</div><div className="eyebrow">Bản thử nghiệm</div></div></div>
    </div>
  );
}

export function Surfaces() {
  return (
    <div className="ds-grid p3">
      <div className="glass ds-card"><h4>.glass</h4><p>Kính ngọc phẳng. Dùng cho hàng danh sách, ô nhỏ, nơi cần nhẹ.</p></div>
      <div className="panel"><div className="phead"><h3>.panel</h3><small>Khung chính có góc mây cuộn</small></div><p>Kính ngọc, viền vàng, hai lớp viền. Dùng cho mỗi khối nội dung lớn.</p></div>
      <div className="shrine"><div className="phead"><h3>.shrine</h3><small>Khung thần điện</small></div><p>Viền đậm, góc lớn, hào quang vàng. Dành cho khoảnh khắc trọng tâm.</p></div>
      <div className="divider" style={{ gridColumn: '1 / -1' }}><span /></div>
    </div>
  );
}

export function Icons() {
  return (
    <div className="ds-stack">
      <div className="icons">{ICON_NAMES.map((n) => <div key={n} className="ic" title={n}><Icon name={n} size={24} /><small>{n}</small></div>)}</div>
      <h4>Tám hệ và tám ô trang bị</h4>
      <div className="icons">{C.EO.map((e) => <div key={e} className="ic" style={{ color: C.EL[e].color }}><ElIcon el={e} size={24} /><small>{e}</small></div>)}{C.SLOTS.map((s) => <div key={s} className="ic"><SlotIcon slot={s} size={24} /><small>{s}</small></div>)}</div>
    </div>
  );
}

export function Tiers() {
  const fx = ['', '', 'Sáng viền nhẹ', 'Cung sáng chạy quanh viền', 'Cung sáng + quầng vàng', 'Cầu vồng chạy trong tên + quầng'];
  return (
    <div className="ds-grid p2">{C.RARITY.map((r, i) => (
      <div key={r} className={`item t${i}`} style={{ '--rc': C.RCOLOR[i] } as CSSProperties}>
        <div className="itIcon" style={{ width: 52, height: 52, borderColor: C.RCOLOR[i], display: 'grid', placeItems: 'center', color: C.RCOLOR[i] }}><SlotIcon slot={C.SLOTS[i]} size={26} /></div>
        <div className="itBody"><div className="itName">Phẩm {r}</div><div className="itSub">{C.SLOTS[i]} · Lv{i * 6 + 1}</div><div className="itSub">{fx[i] || (i ? 'Viền màu phẩm' : 'Không hiệu ứng')}</div></div>
      </div>))}
    </div>
  );
}
