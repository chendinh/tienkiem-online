'use client';
// /gen-ai: the player-facing picture maker. One page, numbered sections, big cards; the description (prompt) is always visible and can be rewritten.
// The page only shows the rules (lib/genai.ts); the server (/api/gen-ai) is the one that enforces them.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errText } from '@/lib/strings';
import { ANGLES, DEFAULT_PICK, EXPRESSIONS, FACELESS_VIEWS, FRAMES, HAIR, HANDS, LEGAL, LEGAL_VERSION, MIN_AGE, SCENE_MAX, STORIES, STYLES, VIEWS, cleanPick, composeScene, isFaceless, sceneProblem, validPoses, type GenPick } from '@/lib/genai';

type Status = { enabled: boolean; user: { email: string; guest: boolean } | null; left: number; limit: number };
type Result = { url: string; ms: number };
const LEGAL_KEY = 'genai-legal';
const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

// A small figure with the part that stays in the picture lit up: shows what "from the waist up" means.
const CUT: Record<string, number> = { close: 30, half: 52, knee: 74, full: 100 };
function FrameArt({ frame }: { frame: string }) {
  const y = CUT[frame] ?? 100, id = `ga-clip-${frame}`;
  const body = (
    <g>
      <circle cx="30" cy="11" r="7" />
      <path d="M26 17 h8 v4 q12 2 12 8 l-3 24 l8 42 h-42 l8 -42 l-3 -24 q0 -6 12 -8 z" />
    </g>
  );
  return (
    <svg className="ga-fig" viewBox="0 0 60 100" aria-hidden="true">
      <defs><clipPath id={id}><rect x="0" y="0" width="60" height={y} /></clipPath></defs>
      <g className="ga-fig-dim">{body}</g>
      <g className="ga-fig-on" clipPath={`url(#${id})`}>{body}</g>
      {y < 100 && <line x1="2" x2="58" y1={y} y2={y} className="ga-fig-cut" />}
    </svg>
  );
}

function Card(p: { on: boolean; onClick: () => void; icon?: ReactNode; title: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" className="ga-card" aria-pressed={p.on} disabled={p.disabled} onClick={p.onClick}>
      {p.icon != null && <span className="ga-card-icon">{p.icon}</span>}
      <b>{p.title}</b>
      {p.hint && <small>{p.hint}</small>}
      {p.on && <i className="ga-tick" aria-hidden="true">✓</i>}
    </button>
  );
}
const Section = ({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) => (
  <section className="ga-sec">
    <h2><span>{n}</span>{title}</h2>
    {sub && <p className="ga-sub">{sub}</p>}
    {children}
  </section>
);
const Label = ({ children }: { children: ReactNode }) => <div className="ga-lab">{children}</div>;

export function GenAi() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [legalOk, setLegalOk] = useState(true);   // starts true so the popup does not flash on the server render; the effect below decides
  const [legalTick, setLegalTick] = useState(false);
  const [tab, setTab] = useState<'f' | 'm'>('f');
  const [photo, setPhoto] = useState('');
  const [noFace, setNoFace] = useState(false);
  const [pick, setPick] = useState<GenPick>(DEFAULT_PICK);
  const [custom, setCustom] = useState<string | null>(null);   // null = the description follows the choices
  const [confirm, setConfirm] = useState(false);
  const [tickPersonal, setTickPersonal] = useState(false);
  const [tickAdult, setTickAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const resRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setLegalOk(sessionStorage.getItem(LEGAL_KEY) === LEGAL_VERSION); } catch { setLegalOk(false); }
    fetch('/api/gen-ai', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (j?.ok) setStatus({ enabled: !!j.enabled, user: j.user || null, left: Number(j.left) || 0, limit: Number(j.limit) || 0 }); else setLoadErr(errText(j?.code || 'E_SERVER'));
    }).catch(() => setLoadErr('Không kết nối được máy chủ.'));
  }, []);
  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now(), t = setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);
  // while the legal popup is open, the page behind it does not scroll
  useEffect(() => { document.body.style.overflow = !legalOk || confirm || busy ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [legalOk, confirm, busy]);

  const set = (patch: Partial<GenPick>, nf = noFace) => setPick((p) => cleanPick({ ...p, ...patch }, nf));
  const views = noFace ? VIEWS.filter((v) => FACELESS_VIEWS.includes(v.id)) : VIEWS;
  const poses = validPoses(pick.frame, pick.view);
  const faceless = isFaceless(pick.view);
  const auto = useMemo(() => composeScene(cleanPick(pick, noFace)), [pick, noFace]);
  const shown = custom ?? auto;
  const bad = sceneProblem(shown);
  const badText = bad === 'short' ? 'Mô tả quá ngắn.' : bad ? errText('E_PROMPT_BLOCKED') : '';

  const user = status?.user, canUse = !!status && status.enabled && !!user && !user.guest;
  const why = !photo ? 'Hãy chọn ảnh của bạn ở bước 1.' : bad ? 'Hãy sửa lại mô tả ở bước 7.' : status && status.left <= 0 ? 'Hôm nay bạn đã dùng hết lượt.' : '';

  function pickFile(f?: File) {
    if (!f) return;
    setErr('');
    const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => {   // shrunk to about 1280 px in the browser: the request stays small and nothing is stored by the page
      const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      setPhoto(c.toDataURL('image/jpeg', 0.88)); URL.revokeObjectURL(u);
    };
    img.onerror = () => { URL.revokeObjectURL(u); setErr(errText('E_GENAI_PHOTO')); };
    img.src = u;
  }
  function dice() {
    const v = rnd(views.filter((x) => !isFaceless(x.id) || noFace));
    setPick((p) => cleanPick({ ...p, story: rnd(STORIES).id, frame: rnd(FRAMES).id, angle: rnd(ANGLES).id, view: v.id, hands: rnd(HANDS).id, hair: rnd(HAIR).id, expr: rnd(EXPRESSIONS).id, pose: 'auto' }, noFace));
    setCustom(null);
  }
  function agree() { try { sessionStorage.setItem(LEGAL_KEY, LEGAL_VERSION); } catch { /* private mode: asked again next time */ } setLegalOk(true); }

  async function generate() {
    setConfirm(false); setErr(''); setBusy(true); setSecs(0);
    try {
      const r = await fetch('/api/gen-ai', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: { personal: true, adult: true, terms: LEGAL_VERSION }, photo, noFace, pick: cleanPick(pick, noFace), scene: custom ?? undefined }),
      });
      const j = await r.json().catch(() => ({ ok: false, code: 'E_SERVER' }));
      if (j?.ok && j.url) {
        setResult({ url: j.url, ms: j.ms || 0 });
        setStatus((s) => (s ? { ...s, left: Number(j.left) || 0 } : s));
        setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      } else {
        setErr(errText(j?.code || 'E_SERVER'));
        if (j?.code === 'E_GENAI_LIMIT') setStatus((s) => (s ? { ...s, left: 0 } : s));
      }
    } catch { setErr('Mất kết nối khi đang vẽ. Hãy kiểm tra mạng rồi thử lại; nếu ảnh đã vẽ xong thì lượt vẫn bị trừ.'); }
    setBusy(false); setTickPersonal(false); setTickAdult(false);
  }
  async function save() {
    if (!result) return;
    try {
      const b = await (await fetch(result.url)).blob(), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'tien-kiem-chan-dung.jpg'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { window.open(result.url, '_blank', 'noopener'); }
  }

  return (
    <main className="ga">
      <header className="ga-head">
        <a href="/" className="ga-back">← Về game</a>
        <h1>Chân dung tu tiên của bạn</h1>
        <p>Tải ảnh của chính bạn, chọn bối cảnh, AI vẽ bạn thành tiên nhân trong tranh. Khuôn mặt thon gọn, thanh lịch hơn ảnh gốc một chút.</p>
        <div className="ga-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'f'} onClick={() => setTab('f')}>👸 Nhân vật nữ</button>
          <button type="button" role="tab" aria-selected={tab === 'm'} onClick={() => setTab('m')}>🧙 Nhân vật nam</button>
        </div>
      </header>

      {loadErr && <p className="ga-err">{loadErr}</p>}
      {status && !status.enabled && <p className="ga-warn">{errText('E_GENAI_OFF')}</p>}
      {status && status.enabled && !user && <div className="ga-gate"><b>Bạn cần đăng nhập</b><p>Hãy vào game, đăng nhập tài khoản rồi quay lại trang này.</p><a className="ga-go" href="/">Về game để đăng nhập</a></div>}
      {status && status.enabled && user?.guest && <div className="ga-gate"><b>Cần liên kết email</b><p>Tài khoản khách chưa dùng được tính năng này. Hãy liên kết email trong game rồi quay lại.</p><a className="ga-go" href="/">Về game để liên kết email</a></div>}

      {tab === 'm' && (
        <div className="ga-soon"><b>Nhân vật nam sắp ra mắt</b><p>Đang chuẩn bị tư thế và bối cảnh riêng cho nam tu tiên. Trong lúc chờ, bạn có thể dùng tab Nhân vật nữ.</p></div>
      )}

      {tab === 'f' && (
        <>
          <Section n={1} title="Ảnh của bạn" sub="Chỉ dùng ảnh của chính bạn. Ảnh rõ mặt, nhìn thẳng, đủ sáng sẽ giống nhất.">
            <label className={`ga-drop${photo ? ' has' : ''}`}>
              {photo ? <img src={photo} alt="Ảnh bạn đã chọn" /> : <span><b>＋ Chọn ảnh</b><small>JPG, PNG hoặc WebP</small></span>}
              <input type="file" accept="image/*" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {photo && <button type="button" className="ga-link" onClick={() => setPhoto('')}>Bỏ ảnh này</button>}
            <label className="ga-check">
              <input type="checkbox" checked={noFace} onChange={(e) => { setNoFace(e.target.checked); setPick((p) => cleanPick(p, e.target.checked)); }} />
              <span>Ảnh của tôi không thấy mặt<small>Chỉ lấy tóc và dáng; ảnh vẽ sẽ nhìn từ sau lưng, góc nghiêng hoặc che mặt.</small></span>
            </label>
          </Section>

          <Section n={2} title="Chủ đề và phong cách">
            <div className="ga-row"><Label>Phong cách</Label>
              <div className="ga-seg">{STYLES.map((s) => <button key={s.id} type="button" aria-pressed={pick.style === s.id} onClick={() => set({ style: s.id })}>{s.label}</button>)}</div>
            </div>
            <div className="ga-row"><Label>Câu chuyện trong tranh</Label>
              <div className="ga-grid2">{STORIES.map((s) => <Card key={s.id} on={pick.story === s.id} onClick={() => set({ story: s.id })} title={s.label} hint={s.mood} />)}</div>
            </div>
            <button type="button" className="ga-dice" onClick={dice}>🎲 Chọn ngẫu nhiên cho tôi</button>
          </Section>

          <Section n={3} title="Khung hình và góc máy">
            <div className="ga-row"><Label>Lấy bao nhiêu người trong tranh?</Label>
              <div className="ga-grid4">{FRAMES.map((f) => <Card key={f.id} on={pick.frame === f.id} onClick={() => set({ frame: f.id })} icon={<FrameArt frame={f.id} />} title={({ close: 'Cận mặt', half: 'Nửa người', knee: 'Gần toàn thân', full: 'Toàn thân' } as Record<string, string>)[f.id]} hint={({ close: 'Từ ngực lên', half: 'Từ eo lên', knee: 'Từ đầu gối lên', full: 'Thấy hết bối cảnh' } as Record<string, string>)[f.id]} />)}</div>
            </div>
            <div className="ga-row"><Label>Máy ảnh đặt ở đâu?</Label>
              <div className="ga-grid2">{ANGLES.map((a) => <Card key={a.id} on={pick.angle === a.id} onClick={() => set({ angle: a.id })} icon={a.icon} title={a.label} hint={a.hint} />)}</div>
            </div>
            <div className="ga-row"><Label>Nhân vật quay về hướng nào?</Label>
              <div className="ga-grid2">{views.map((v) => <Card key={v.id} on={pick.view === v.id} onClick={() => set({ view: v.id })} title={v.label} />)}</div>
            </div>
          </Section>

          <Section n={4} title="Dáng người và đôi tay">
            <div className="ga-row"><Label>Dáng đứng, ngồi</Label>
              <div className="ga-chips">
                <button type="button" aria-pressed={pick.pose === 'auto'} onClick={() => set({ pose: 'auto' })}>Tự động hợp chủ đề</button>
                {poses.map((x) => <button key={x.id} type="button" aria-pressed={pick.pose === x.id} onClick={() => set({ pose: x.id })}>{x.label}</button>)}
              </div>
            </div>
            <div className="ga-row"><Label>Đôi tay</Label>
              <div className="ga-grid2">{HANDS.map((h) => <Card key={h.id} on={pick.hands === h.id} onClick={() => set({ hands: h.id })} icon={h.icon} title={h.label} hint={h.hint} disabled={pick.view === 'back' && h.id !== 'natural' && h.id !== 'hidden'} />)}</div>
              {pick.view === 'back' && <p className="ga-sub">Nhìn từ sau lưng thì không thấy tay.</p>}
            </div>
          </Section>

          <Section n={5} title="Biểu cảm" sub={faceless ? 'Ảnh không lộ mặt nên không có biểu cảm.' : 'Chọn một cảm xúc, AI sẽ vẽ rõ trên gương mặt.'}>
            <div className="ga-grid2">{EXPRESSIONS.map((x) => <Card key={x.id} on={!faceless && pick.expr === x.id} onClick={() => set({ expr: x.id })} icon={x.icon} title={x.label} hint={x.hint} disabled={faceless} />)}</div>
          </Section>

          <Section n={6} title="Kiểu tóc">
            <div className="ga-chips">{HAIR.map((h) => <button key={h.id} type="button" aria-pressed={pick.hair === h.id} onClick={() => set({ hair: h.id })}>{h.label}</button>)}</div>
          </Section>

          <Section n={7} title="Mô tả gửi cho AI (prompt)" sub="Đây là phần mô tả được tạo từ các lựa chọn của bạn. Muốn tự viết thì sửa thẳng vào ô dưới (viết tiếng Anh sẽ chính xác hơn).">
            <textarea className="ga-in" value={shown} maxLength={SCENE_MAX} onChange={(e) => setCustom(e.target.value)} spellCheck={false} />
            <div className="ga-prompt-foot">
              <span>{shown.length}/{SCENE_MAX}</span>
              {custom !== null && <button type="button" className="ga-link" onClick={() => setCustom(null)}>Dùng lại mô tả theo lựa chọn</button>}
            </div>
            {custom !== null && <p className="ga-sub">Bạn đã tự sửa mô tả, nên các lựa chọn ở trên không còn đổi mô tả nữa.</p>}
            {badText && <p className="ga-err">{badText}</p>}
            <p className="ga-sub">Hệ thống luôn tự thêm: lấy khuôn mặt từ ảnh của bạn, trang phục thanh lịch kín đáo. Mô tả vi phạm điều khoản sẽ bị từ chối.</p>
          </Section>
        </>
      )}

      {result && (
        <div className="ga-result" ref={resRef}>
          <h2>Ảnh của bạn</h2>
          <img src={result.url} alt="Ảnh chân dung tu tiên đã vẽ" />
          <div className="ga-actions">
            <button type="button" className="ga-go" onClick={save}>⬇ Tải ảnh về</button>
            <button type="button" className="ga-ghost" onClick={() => setResult(null)}>Đóng</button>
          </div>
          <p className="ga-sub">Tiên Kiếm không lưu ảnh này. Hãy tải về ngay (trên iPhone: nhấn giữ ảnh rồi chọn Lưu vào Ảnh).</p>
        </div>
      )}

      {tab === 'f' && (
        <div className="ga-bar">
          {err && <p className="ga-err">{err}</p>}
          <div className="ga-bar-row">
            <span className="ga-left">{status && user && !user.guest ? `Còn ${status.left}/${status.limit} lượt hôm nay` : ''}</span>
            <button type="button" className="ga-go" disabled={!canUse || !!why || busy} onClick={() => { setErr(''); setConfirm(true); }}>✨ Tạo ảnh</button>
          </div>
          {canUse && why && <small className="ga-why">{why}</small>}
        </div>
      )}

      {!legalOk && (
        <div className="ga-modal" role="dialog" aria-modal="true" aria-labelledby="ga-legal-t">
          <div className="ga-sheet">
            <h2 id="ga-legal-t">Điều khoản sử dụng</h2>
            <p className="ga-sub">Vui lòng đọc kỹ trước khi dùng tính năng vẽ chân dung bằng ảnh của bạn.</p>
            <ol className="ga-legal">{LEGAL.map((x) => <li key={x.h}><b>{x.h}.</b> {x.p}</li>)}</ol>
            <label className="ga-check"><input type="checkbox" checked={legalTick} onChange={(e) => setLegalTick(e.target.checked)} /><span>Tôi đã đọc và đồng ý các điều khoản trên. Tôi từ đủ {MIN_AGE} tuổi và chỉ dùng ảnh cá nhân của chính mình.</span></label>
            <div className="ga-actions">
              <button type="button" className="ga-go" disabled={!legalTick} onClick={agree}>Đồng ý và vào</button>
              <a className="ga-ghost" href="/">Quay lại game</a>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="ga-modal" role="dialog" aria-modal="true" aria-labelledby="ga-conf-t">
          <div className="ga-sheet">
            <h2 id="ga-conf-t">Xác nhận trước khi vẽ</h2>
            <label className="ga-check"><input type="checkbox" checked={tickPersonal} onChange={(e) => setTickPersonal(e.target.checked)} /><span>Ảnh tôi tải lên là ảnh cá nhân của chính tôi, không phải ảnh của người khác. Tôi cho phép dùng ảnh này để vẽ ảnh chân dung cho tôi, dù ảnh không được lưu lại.</span></label>
            <label className="ga-check"><input type="checkbox" checked={tickAdult} onChange={(e) => setTickAdult(e.target.checked)} /><span>Tôi từ đủ {MIN_AGE} tuổi và đồng ý <button type="button" className="ga-link" onClick={() => { setConfirm(false); setLegalOk(false); setLegalTick(false); }}>điều khoản sử dụng</button>.</span></label>
            <div className="ga-actions">
              <button type="button" className="ga-go" disabled={!tickPersonal || !tickAdult} onClick={generate}>Vẽ ảnh (tốn 1 lượt)</button>
              <button type="button" className="ga-ghost" onClick={() => setConfirm(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="ga-modal ga-busy" role="status" aria-live="polite">
          <div className="ga-sheet"><div className="ga-spin" aria-hidden="true" /><h2>Đang vẽ ảnh của bạn…</h2><p className="ga-sub">Thường mất 30–90 giây. Xin đừng đóng trang. Đã {secs} giây.</p></div>
        </div>
      )}
    </main>
  );
}
