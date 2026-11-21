'use client';
import { useEffect, useState } from 'react';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import { ElChip, Img } from './ui';

// The first minute of a new character: three full-picture story cards (each says what the world is AND what the player does in it), then
// "Thiên Đạo định đoạt" (the random origin, root and temper turn over one by one) while the AI draws the portrait. It ends by setting the same
// `prologueSeen` flag as the old text prologue; Cài đặt can open it again.
// One root element and one stack of pictures for the whole flow, so a step change is a cross-fade and never loads or remounts a picture.
// Every picture has a fallback (a zone painting that already ships); the new ones come from `npm run pregen -- --only zones`.
const SCENES = [
  { art: 'onboard_1_v', fb: 'thanhvan_v', title: 'Thiên Huyền Đại Lục',
    lore: 'Linh khí rơi xuống đâu, đất ấy nở hoa. Kẻ hợp linh căn có thể ngồi xuống, hấp thu nó và bước lên con đường tu tiên.',
    play: (h: number) => `Nhân vật của ngươi tự tu luyện, đánh yêu thú và nhặt pháp khí, không cần canh. Tắt game vẫn tiếp tục tính, tối đa ${h} giờ.` },
  { art: 'onboard_2_v', fb: 'hannguyet_v', title: 'Sương Xám',
    lore: 'Từ vực sâu, sương xám đang trườn lên, nuốt linh khí và biến linh thú thành bóng ma rỗng. Mỗi mùa trăng nó lan thêm một dặm.',
    play: () => 'Thắng yêu thú để nhận tu vi và linh thạch. Đủ tu vi thì đột phá cảnh giới, mạnh lên để chống lại sương xám.' },
  { art: 'onboard_3_v', fb: 'thanhvan_v', title: 'Vân Mộng Sơn',
    lore: 'Có những linh thú sinh ra đã khác thường, mang hình dáng lạ: người xưa gọi là Dị Biến. Hành trình của ngươi bắt đầu ở chân núi này.',
    play: () => 'Thu phục linh thú bằng Khế Ước Phù, sưu tầm pháp khí và Dị Biến. Mỗi món đều có hình vẽ riêng.' },
];
const TIPS = [
  'Diện mạo này do AI vẽ riêng cho nhân vật của ngươi, không có hai bức giống nhau.',
  'Linh Căn và Tính Cách ngươi vừa nhận ảnh hưởng đến khí chất trong tranh.',
  'Về sau, nút “Vẽ lại” sẽ vẽ ngươi mặc đúng các món đang đeo.',
  'Linh thú Dị Biến ngươi bắt được cũng được vẽ riêng một bức.',
];
const MOTES = Array.from({ length: 14 }, (_, i) => ({ l: (i * 37 + 11) % 100, s: 3 + (i * 5) % 5, d: 9 + (i * 7) % 8, t: -((i * 3) % 11) }));

const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Scene = ({ art, fb }: { art: string; fb: string }) => (
  <Img src={C.zoneArt(art)} className="wArtImg" fb={<Img src={C.zoneArt(fb)} className="wArtImg" fb="✦" />} />
);

export function Welcome({ st, aiOn, guest, onLink, onDone }: { st: GS; aiOn: boolean; guest: boolean; onLink: () => void; onDone: () => void }) {
  const p = st.player, [step, setStep] = useState(0);
  const reveal = step >= SCENES.length;
  const url = p.avatar?.url;
  const [tip, setTip] = useState(0), [late, setLate] = useState(false);
  // warm every picture at once so a step change never waits for the network
  useEffect(() => { for (const s of SCENES) for (const a of [s.art, s.fb]) { const i = new Image(); i.src = C.zoneArt(a); } }, []);
  useEffect(() => {
    if (!reveal) return;
    const a = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 4500), b = setTimeout(() => setLate(true), 60000);
    return () => { clearInterval(a); clearTimeout(b); };
  }, [reveal]);
  const next = () => setStep((n) => Math.min(SCENES.length, n + 1));
  const s = SCENES[Math.min(step, SCENES.length - 1)], origin = C.ORIGINS[p.origin];

  return (
    <div className={'welcome' + (reveal ? ' reveal' : '')} role="dialog" aria-modal="true" aria-label={reveal ? 'Thiên Đạo định đoạt' : 'Cốt truyện'}>
      <div className="wArts" aria-hidden="true">
        {SCENES.map((x, i) => <div key={x.art} className={'wArt' + (i === Math.min(step, SCENES.length - 1) ? ' on' : i < step ? ' past' : '')}><Scene art={x.art} fb={x.fb} /></div>)}
      </div>
      <div className="wShade" />
      <div className="wMotes" aria-hidden="true">{MOTES.map((m, i) => <i key={i} style={{ left: `${m.l}%`, width: m.s, height: m.s, animationDuration: `${m.d}s`, animationDelay: `${m.t}s` }} />)}</div>

      {!reveal && <>
        <button type="button" className="wSkip" onClick={() => setStep(SCENES.length)}>Bỏ qua</button>
        <div className="wText" key={step}>
          <div className="wBar" aria-label={`Bước ${step + 1} trên ${SCENES.length}`}>{SCENES.map((_, i) => <i key={i} className={i < step ? 'done' : i === step ? 'on' : ''} />)}</div>
          <h2 style={{ '--i': 0 } as any}>{s.title}</h2>
          <p className="wLore" style={{ '--i': 1 } as any}>{s.lore}</p>
          <div className="wPlay" style={{ '--i': 2 } as any}><b>Trong game</b><span>{s.play(st.config.offlineCapH)}</span></div>
          <button type="button" className="wBtn primary" style={{ '--i': 3 } as any} onClick={next} autoFocus>{step === SCENES.length - 1 ? 'Xem số mệnh của ta' : 'Tiếp tục'}<Arrow /></button>
        </div>
      </>}

      {reveal && (
        <div className="wBody">
          <h2>Thiên Đạo định đoạt</h2>
          <div className="wCards">
            <div className="wCard" style={{ animationDelay: '0.2s' }}><small>Xuất thân</small><b>{origin.n}</b><span>{origin.note}. Khởi đầu với {origin.stones} linh thạch và {origin.talis} Khế Ước Phù.</span></div>
            <div className="wCard" style={{ animationDelay: '0.7s' }}><small>Linh căn</small><b className="chips">{p.linh.map((e) => <ElChip key={e} el={e} />)}</b><span>Độ thuần {p.purity}: càng cao càng dễ đột phá, nhưng Thiên Kiếp càng nặng.</span></div>
            <div className="wCard" style={{ animationDelay: '1.2s' }}><small>Tính cách</small><b>{C.PERS[p.pers].n}</b><span>Hiện trong khí chất của nhân vật ở ảnh và tiểu sử.</span></div>
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
            <button type="button" className="wBtn primary" onClick={onDone}>Bước vào đạo đồ<Arrow /></button>
            {guest && url && <button type="button" className="wBtn ghost" onClick={() => { onDone(); onLink(); }}>Liên kết email để có ảnh riêng</button>}
          </div>
        </div>
      )}
    </div>
  );
}
