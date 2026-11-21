'use client';
import { useEffect, useState } from 'react';
import * as C from '@/lib/content';
import type { GS } from '@/lib/client/types';
import { ElChip, Img } from './ui';
import { BALANCE as B } from '@/lib/balance';
import { STARTER, rewardText } from '@/lib/starter';
import { TOPICS, TOUR_IDS, fill } from '@/lib/tour';
import { ModalClose } from './ds/ModalClose';

// Freeze the page behind a full-screen overlay. iOS Safari ignores overflow:hidden on the body, so the page is pinned in place instead and put back at the same spot.
function useLockScroll() {
  useEffect(() => {
    const y = window.scrollY, b = document.body, prev = { position: b.style.position, top: b.style.top, width: b.style.width, overflow: b.style.overflow };
    b.style.position = 'fixed'; b.style.top = `-${y}px`; b.style.width = '100%'; b.style.overflow = 'hidden';
    return () => { b.style.position = prev.position; b.style.top = prev.top; b.style.width = prev.width; b.style.overflow = prev.overflow; window.scrollTo(0, y); };
  }, []);
}

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

// A character whose e-mail was just linked comes straight to the reveal (the story was told before).
const p0 = (st: GS) => !!st.player.fresh && !!st.player.prologueSeen;

export function Welcome({ st, aiOn, guest, onLink, onDone }: { st: GS; aiOn: boolean; guest: boolean; onLink: () => void; onDone: () => void }) {
  useLockScroll();
  const p = st.player, [step, setStep] = useState(() => (p0(st) ? SCENES.length : 0));
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
  const gDefault = guest && !!p.guestFate, fresh = !!p.fresh && !guest;
  const next = () => setStep((n) => Math.min(SCENES.length, n + 1));
  const s = SCENES[Math.min(step, SCENES.length - 1)], origin = C.ORIGINS[p.origin];

  return (
    <div className={'welcome' + (reveal ? ' reveal' : '')} role="dialog" aria-modal="true" aria-label={reveal ? (gDefault ? 'Số mệnh của khách' : 'Thiên Đạo định đoạt') : 'Cốt truyện'}>
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
          <h2>{gDefault ? 'Số mệnh của khách' : 'Thiên Đạo định đoạt'}</h2>
          <div className="wRows">
            <div className="wRow" style={{ animationDelay: '0.2s' }}><small>Xuất thân</small><b>{origin.n}</b></div>
            <div className="wRow" style={{ animationDelay: '0.6s' }}><small>Linh căn</small><b>{p.linh.map((e) => <ElChip key={e} el={e} />)}</b></div>
            <div className="wRow" style={{ animationDelay: '1s' }}><small>Tính cách</small><b>{C.PERS[p.pers].n}</b></div>
          </div>
          <div className={'wPortrait' + (url ? ' ready' : '')}>
            {url
              ? <img key={url} src={url} alt="Diện mạo của ngươi" style={p.avatar?.crop ? { height: `${100 / (1 - p.avatar.crop)}%`, objectFit: 'cover' } : undefined} />
              : aiOn
                ? <div className="wDraw"><i /><span>Họa sư Thiên Đạo đang vẽ diện mạo của ngươi…</span></div>
                : <div className="wDraw"><Img src={C.introArt(p.look.g)} className="wFb" fb="✦" /><span>Họa sư đang nghỉ. Ảnh của ngươi sẽ được vẽ khi có thể.</span></div>}
          </div>
          <p className="wTip" aria-live="polite">{gDefault ? 'Khách dùng xuất thân, linh căn, tính cách mặc định. Liên kết email để Thiên Đạo định đoạt riêng và họa sư vẽ ảnh riêng cho ngươi.' : url ? (fresh ? 'Số mệnh riêng của ngươi đã định. Họa sư đã vẽ ảnh mới.' : 'Diện mạo của ngươi đã sẵn sàng.') : late ? 'Họa sư đang bận, ảnh sẽ tự hiện trong khung nhân vật khi xong. Ngươi cứ vào đạo đồ.' : TIPS[tip]}</p>
          <div className="wBtns">
            <button type="button" className="wBtn primary" onClick={onDone}>Bước vào đạo đồ<Arrow /></button>
            {gDefault && <button type="button" className="wBtn ghost" onClick={() => { onDone(); onLink(); }}>Liên kết email để nhận số mệnh riêng</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- after the story: Nhập Môn bar, one-time hints, and the Cẩm nang

const tourVars = (st: GS) => ({ offline: st.config.offlineCapH, tameSec: B.tameDecisionSec, bag: st.caps.bag, stash: st.caps.stash, pen: st.caps.pen });

// The topic worth showing now, or null: the first one that applies and that the player has not read yet.
export function pickHint(st: GS, seen: string[]): string | null {
  const d = st.decision, items = st.bag.length + Object.values(st.eq).filter(Boolean).length;
  const rules: [string, boolean][] = [
    ['mut', !!d && d.kind === 'tame' && !!d.beast.mut],
    ['tame', !!d && d.kind === 'tame'],
    ['npc', !!d && d.kind === 'npc'],
    ['break', !!d && d.kind === 'break'],
    ['recovery', st.recovery],
    ['item', items > 0],
    ['bag', st.bag.length >= st.caps.bag - 5],
    ['pen', st.beasts.length >= st.caps.pen - 5],
  ];
  for (const [id, on] of rules) if (on && !seen.includes(id)) return id;
  return null;
}
export const ALL_HINTS = TOUR_IDS;

export function HintCard({ st, id, onDone, onOff, onBook }: { st: GS; id: string; onDone: () => void; onOff: () => void; onBook: () => void }) {
  const t = TOPICS.find((x) => x.id === id);
  if (!t || !t.hint) return null;
  return (
    <div className="hintCard" role="status" key={id}>
      <b>{t.title}</b>
      <p>{fill(t.hint, tourVars(st))}</p>
      <div className="hintBtns">
        <button type="button" className="btn hot sm" onClick={onDone} autoFocus>Đã hiểu</button>
        <button type="button" className="btn sm ghost" onClick={onBook}>Cẩm nang</button>
        <button type="button" className="btn sm ghost" onClick={onOff}>Tắt gợi ý</button>
      </div>
    </div>
  );
}

// A slim bar under the header while Nhập Môn is open: the next job, its pay, and (tapped) how to do it and the whole list.
export function StarterBar({ st, onBook }: { st: GS; onBook: () => void }) {
  const [open, setOpen] = useState(false);
  const done = st.starter?.done ?? [];
  if (!st.starter || done.length >= STARTER.length) return null;
  const next = STARTER.find((x) => !done.includes(x.id))!;
  return (
    <div className="starter" role="region" aria-label="Nhập Môn">
      <button type="button" className="starterHead" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="stBadge">Nhập Môn {done.length}/{STARTER.length}</span>
        <b>{next.title}</b>
        <span className="stReward">+{rewardText(next.reward)}</span>
        <i className={'stChev' + (open ? ' open' : '')} aria-hidden="true" />
      </button>
      <div className="stBar" aria-hidden="true">{STARTER.map((x) => <i key={x.id} className={done.includes(x.id) ? 'on' : ''} />)}</div>
      {open && (
        <div className="starterBody">
          <p><b>Cách làm:</b> {next.how}</p>
          <ol>{STARTER.map((x) => <li key={x.id} className={done.includes(x.id) ? 'ok' : x === next ? 'now' : ''}><span>{x.title}</span><small>+{rewardText(x.reward)}</small></li>)}</ol>
          <button type="button" className="btn sm" onClick={onBook}>Mở Cẩm nang</button>
        </div>
      )}
    </div>
  );
}

export function GuideModal({ st, onClose }: { st: GS; onClose: () => void }) {
  const v = tourVars(st);
  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Cẩm nang hướng dẫn">
      <ModalClose onClose={onClose} />
      <div className="modalBody guideBook" onClick={(e) => e.stopPropagation()}>
        <h2>Cẩm nang hướng dẫn</h2>
        <p className="hint">Mọi điều cần biết để chơi, bấm vào một mục để mở.</p>
        <details className="guideItem" open>
          <summary>Nhập Môn: sáu việc đầu tiên</summary>
          <ol>{STARTER.map((x) => <li key={x.id}><b>{x.title}</b> (+{rewardText(x.reward)})<br />{x.how}</li>)}</ol>
        </details>
        {TOPICS.map((t) => <details key={t.id} className="guideItem"><summary>{t.title}</summary><p>{fill(t.guide, v)}</p></details>)}
      </div>
    </div>
  );
}
