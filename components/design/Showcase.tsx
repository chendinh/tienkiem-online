'use client';
import { useState } from 'react';
import { Atmosphere } from '../fx/Atmosphere';
import { Lockup } from '../Logo';
import { MusicOrb } from '../audio/MusicOrb';
import { Credits } from '../Credits';
import { Section, Principles, Colors, Type, Surfaces, Icons, Tiers } from './Specimens';
import { Controls, Motion, Effects, Sound } from './Playground';

const NAV: [string, string][] = [['nguyen-tac', 'Nguyên tắc'], ['mau', 'Màu'], ['chu', 'Chữ'], ['khung', 'Khung'], ['dieu-khien', 'Điều khiển'], ['bieu-tuong', 'Biểu tượng'], ['pham', 'Phẩm'], ['chuyen-dong', 'Chuyển động'], ['hieu-ung', 'Hiệu ứng'], ['am-thanh', 'Âm thanh']];

// The living style guide: every token and component of the design system, rendered by the real code (docs/design-system.md explains the rules).
export function Showcase() {
  const [credits, setCredits] = useState(false);
  return (
    <div className="app ds-page">
      <Atmosphere scene="night" />
      <header className="top">
        <div className="brand"><a href="/" aria-label="Về game"><Lockup width={150} /></a><small>Bộ quy chuẩn giao diện</small></div>
        <nav className="ds-nav" aria-label="Mục lục">{NAV.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>
        <div className="orbs"><MusicOrb onCredits={() => setCredits(true)} /></div>
      </header>
      <main className="ds-main">
        <div className="ds-hero">
          <div className="eyebrow">Design system</div>
          <h1 className="gold-text">Vân Ngọc</h1>
          <p>Ngôn ngữ giao diện của Tiên Kiếm: kính ngọc bích, dát vàng, mây cuộn và linh khí. Mọi màn hình trong game đều dựng từ những mảnh dưới đây, và trang này dùng chính mã của game.</p>
          <a className="btn big" style={{ width: 'auto', display: 'inline-flex', paddingInline: 28 }} href="/">Vào game</a>
        </div>
        <Section id="nguyen-tac" eyebrow="01" title="Nguyên tắc" intro="Năm điều quyết định mọi lựa chọn. Khi phân vân, hỏi xem phương án nào tĩnh, sống, sâu, đúng chất liệu và đúng phẩm hơn."><Principles /></Section>
        <Section id="mau" eyebrow="02" title="Màu sắc" intro="Dùng vai trò ngữ nghĩa (--accent, --text-2, --line-gold) trong thành phần; chỉ chạm tới thang màu thô khi định nghĩa vai trò mới."><Colors /></Section>
        <Section id="chu" eyebrow="03" title="Chữ" intro="Cormorant Garamond cho tiêu đề và con số lớn, Spectral cho nội dung. Cả hai có đủ dấu tiếng Việt và được lưu cùng game."><Type /></Section>
        <Section id="khung" eyebrow="04" title="Khung và bề mặt" intro="Hai chất liệu: kính ngọc và dát vàng. Khung càng quan trọng càng nhiều hoa văn."><Surfaces /></Section>
        <Section id="dieu-khien" eyebrow="05" title="Điều khiển" intro="Mọi phản hồi dưới 150ms. Nút chính (vàng) mỗi màn hình chỉ một."><Controls /></Section>
        <Section id="bieu-tuong" eyebrow="06" title="Biểu tượng" intro="Một họ biểu tượng duy nhất, lưới 24px, nét 1.7, đầu tròn. Không dùng emoji hay chữ Hán."><Icons /></Section>
        <Section id="pham" eyebrow="07" title="Sáu phẩm" intro="Phẩm càng cao, hiệu ứng càng nhiều, nhưng luôn chỉ làm viền và ánh sáng, không đổi bố cục."><Tiers /></Section>
        <Section id="chuyen-dong" eyebrow="08" title="Chuyển động" intro="Chậm và mềm, một đường cong cho mỗi mục đích."><Motion /></Section>
        <Section id="hieu-ung" eyebrow="09" title="Hiệu ứng" intro="Bấm thử từng hiệu ứng. Trong game chúng được gọi qua useCue(), kèm âm thanh."><Effects /></Section>
        <Section id="am-thanh" eyebrow="10" title="Âm thanh" intro="Nhạc nền không lời, chuông và đàn tổng hợp. Mọi thứ đều tắt được."><Sound /></Section>
      </main>
      <footer className="foot"><div>Vân Ngọc · Tiên Kiếm</div><div className="row"><a className="link" href="/">Về game</a><button className="link" onClick={() => setCredits(true)}>Ghi công</button></div></footer>
      {credits && <Credits onClose={() => setCredits(false)} />}
    </div>
  );
}
