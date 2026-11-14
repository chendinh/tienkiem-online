'use client';
import { ModalClose } from './ds/ModalClose';
import { useAudio } from '@/lib/audio';

// Credits window. Creative Commons BY music must be credited where players can find it; this is that place (footer and music panel open it).
export function Credits({ onClose }: { onClose: () => void }) {
  const a = useAudio();
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Ghi công">
      <ModalClose onClose={onClose} />
      <div className="modalBody credits" onClick={(e) => e.stopPropagation()}>
        <h2>Ghi công</h2>
        <p>Những người và công cụ đã góp mặt trong Tiên Kiếm.</p>
        <h3>Âm nhạc</h3>
        {a.tracks.length === 0 && <p className="muted">Chưa có bài nhạc nào.</p>}
        {a.tracks.map((t) => (
          <div key={t.id} className="credit">
            <b>{t.title}</b> <small>{t.artist} · {t.license}</small>
            <p>{t.credit || `${t.title}, ${t.artist}.`}</p>
          </div>
        ))}
        <h3>Phông chữ</h3>
        <p>Cormorant Garamond (Christian Thalmann) và Spectral (Production Type), theo giấy phép SIL Open Font License 1.1.</p>
        <h3>Hình ảnh</h3>
        <p>Logo, phong cảnh, chân dung, pháp khí và linh thú do AI vẽ (Google Gemini, FLUX), chưa kiểm tra giấy phép thương mại. Biểu tượng giao diện và hoa văn khung được vẽ riêng cho game.</p>
        <h3>Âm thanh giao diện</h3>
        <p>Chuông, đàn, chiêng và sấm được tổng hợp ngay trong trình duyệt bằng Web Audio, không dùng tệp âm thanh có sẵn.</p>
        <button className="btn big" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
