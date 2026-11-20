'use client';
import { useEffect, useState } from 'react';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import { ElChip, Img } from './ui';

// The first minute of a new character: three full-picture story cards, then "Thiên Đạo định đoạt" (the random origin, root and temper turn over
// one by one) while the AI draws the portrait. It replaces the old text-only prologue and sets the same `prologueSeen` flag when it ends.
// Every picture has a fallback (a zone painting that already ships), so the flow works before the new pictures are drawn:
//   npm run pregen -- --only zones     draws onboard_1_v to onboard_3_v into public/art/zones/
const SCENES = [
  { art: 'onboard_1_v', fb: 'thanhvan_v', title: 'Thiên Huyền Đại Lục', line: 'Linh khí rơi xuống đâu, đất ấy nở hoa. Rơi vào lòng người, người ấy nghe được tiếng nói của trời.' },
  { art: 'onboard_2_v', fb: 'hannguyet_v', title: 'Sương Xám', line: 'Nhưng từ vực sâu, một vùng sương xám đang trườn lên: nuốt linh khí, biến linh thú thành bóng ma rỗng. Mỗi mùa trăng, nó lan thêm một dặm.' },
  { art: 'onboard_3_v', fb: 'thanhvan_v', title: 'Vân Mộng Sơn', line: 'Dưới chân núi Vân Mộng, một mầm đạo vừa thức giấc. Linh Thạch trong tay ngươi khẽ ấm lên. Đó là ngươi.' },
];
const TIPS = [
  'Diện mạo này do AI vẽ riêng cho nhân vật của ngươi, không có hai bức giống nhau.',
  'Linh Căn và Tính Cách ngươi vừa nhận ảnh hưởng đến khí chất trong tranh.',
  'Về sau, nút “Vẽ lại” sẽ vẽ ngươi mặc đúng các món đang đeo.',
  'Linh thú Dị Biến ngươi bắt được cũng được vẽ riêng một bức.',
];

const Scene = ({ art, fb }: { art: string; fb: string }) => (
  <Img key={art} src={C.zoneArt(art)} className="wArtImg" fb={<Img src={C.zoneArt(fb)} className="wArtImg" fb="✦" />} />
);

export function Welcome({ st, aiOn, guest, onLink, onDone }: { st: GS; aiOn: boolean; guest: boolean; onLink: () => void; onDone: () => void }) {
  const p = st.player, [step, setStep] = useState(0);
  const reveal = step >= SCENES.length;
  const url = p.avatar?.url;
  const [tip, setTip] = useState(0), [late, setLate] = useState(false);
  useEffect(() => {
    if (!reveal) return;
    const a = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 4500), b = setTimeout(() => setLate(true), 60000);
    return () => { clearInterval(a); clearTimeout(b); };
  }, [reveal]);
  const next = () => setStep((n) => Math.min(SCENES.length, n + 1));

  if (!reveal) {
    const s = SCENES[step];
    return (
      <div className="welcome" role="dialog" aria-modal="true" aria-label="Cốt truyện">
        <div className="wArt" key={step}><Scene art={s.art} fb={s.fb} /></div>
        <div className="wShade" />
        <button type="button" className="wSkip" onClick={() => setStep(SCENES.length)}>Bỏ qua</button>
        <div className="wText" key={`t${step}`}>
          <h2>{s.title}</h2>
          <p>{s.line}</p>
          <div className="wDots" aria-hidden="true">{SCENES.map((_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
          <button type="button" className="btn hot big" onClick={next} autoFocus>{step === SCENES.length - 1 ? 'Nhận lấy đạo duyên' : 'Tiếp'}</button>
        </div>
      </div>
    );
  }

  const origin = C.ORIGINS[p.origin];
  return (
    <div className="welcome reveal" role="dialog" aria-modal="true" aria-label="Thiên Đạo định đoạt">
      <div className="wArt"><Scene art="onboard_3_v" fb="thanhvan_v" /></div>
      <div className="wShade strong" />
      <div className="wBody">
        <h2>Thiên Đạo định đoạt</h2>
        <div className="wCards">
          <div className="wCard" style={{ animationDelay: '0.3s' }}><small>Xuất thân</small><b>{origin.n}</b><span>{origin.note}</span></div>
          <div className="wCard" style={{ animationDelay: '0.9s' }}><small>Linh căn</small><b className="chips">{p.linh.map((e) => <ElChip key={e} el={e} />)}</b><span>Độ thuần {p.purity}</span></div>
          <div className="wCard" style={{ animationDelay: '1.5s' }}><small>Tính cách</small><b>{C.PERS[p.pers].n}</b><span>{C.PERS[p.pers].line}</span></div>
        </div>
        <div className={'wPortrait' + (url ? ' ready' : '')}>
          {url
            ? <img key={url} src={url} alt="Diện mạo của ngươi" style={p.avatar?.crop ? { height: `${100 / (1 - p.avatar.crop)}%` } : undefined} />
            : aiOn
              ? <div className="wDraw"><i /><span>Họa sư Thiên Đạo đang vẽ diện mạo của ngươi…</span></div>
              : <div className="wDraw"><Img src={C.introArt(p.look.g)} className="wFb" fb="✦" /><span>Họa sư đang nghỉ. Ảnh của ngươi sẽ được vẽ khi có thể.</span></div>}
        </div>
        <p className="wTip" aria-live="polite">{url ? (guest ? 'Đây là diện mạo chung cho khách. Liên kết email để họa sư vẽ riêng một bức chỉ của ngươi.' : 'Diện mạo của ngươi đã sẵn sàng.') : late ? 'Họa sư đang bận, ảnh sẽ tự hiện trong khung nhân vật khi xong. Ngươi cứ vào đạo đồ.' : TIPS[tip]}</p>
        <div className="wBtns">
          <button type="button" className="btn hot big" onClick={onDone}>Bước vào đạo đồ</button>
          {guest && url && <button type="button" className="btn" onClick={() => { onDone(); onLink(); }}>Liên kết email để có ảnh riêng</button>}
        </div>
      </div>
    </div>
  );
}
