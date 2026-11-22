'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_SCENE, MODELS, SCENES, promptProblem, type ModelId, type Res } from '@/lib/anh18';
import { ANGLES, DEFAULT_PICK, EXPRESSIONS, HANDS, LEVELS, STORIES, STYLES, composeScene, randomPick, type Opt, type Pick } from '@/lib/wallpaper';
import { errText } from '@/lib/strings';

// Lab: one button per model. Each press asks the server for one picture of an original, fictional, adult xianxia character and shows it with the time it took.
// Nothing is saved and there is no upload: the owner only types a scene. The owner's key is the one of /admin (kept in the tab only).
const KEY = 'tutien-admin-key';
interface Tile { n: number; model: ModelId; res: Res; st: 'run' | 'ok' | 'filtered' | 'err'; url?: string; ms?: number; w?: number; h?: number; seed?: number | null; msg?: string }
const PROBLEM: Record<string, string> = { minor: 'Mô tả nhắc tới trẻ vị thành niên.', real: 'Mô tả nhắc tới người thật.', explicit: 'Mô tả quá trắng trợn: chỉ vẽ gợi cảm, không khỏa thân.' };
function Chips({ label, opts, value, onPick }: { label: string; opts: Opt[]; value: string; onPick: (id: string) => void }) {
  return <div className="al-row"><span>{label}</span><div className="al-chips">{opts.map((o) => <button key={o.id} className="al-chip" aria-pressed={value === o.id} onClick={() => onPick(o.id)}>{o.label}</button>)}</div></div>;
}
const nameOf = (id: ModelId) => MODELS.find((m) => m.id === id)?.label || id;

export function Anh18Lab() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [adult, setAdult] = useState(false);
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [res, setRes] = useState<Res>('4k');
  const [tol, setTol] = useState(5);
  const [off, setOff] = useState(false);
  const [face, setFace] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [pk, setPk] = useState<Pick>(DEFAULT_PICK);
  const setP = (k: keyof Pick) => (id: string) => { const n = { ...pk, [k]: id }; setPk(n); setScene(composeScene(n)); };
  const dice = () => { const n = randomPick({ style: pk.style, level: pk.level }); setPk(n); setScene(composeScene(n)); };
  const [err, setErr] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [seq, setSeq] = useState(0);

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } }, []);
  useEffect(() => {
    if (!key) return;
    fetch('/api/lab/anh18', { headers: { Authorization: `Bearer ${key}` } }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(errText(j.code)); setKey(''); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } return; }
      setOff(!!j.checkerOff); setErr('');
    }).catch(() => setErr('Không kết nối được máy chủ.'));
  }, [key]);

  const problem = promptProblem(scene);
  const patch = (n: number, p: Partial<Tile>) => setTiles((t) => t.map((x) => (x.n === n ? { ...x, ...p } : x)));

  // Shrinks the photo in the browser (about 1280 px, JPEG) so the request stays small; nothing is stored by the page.
  function pickFile(f?: File) {
    if (!f) return;
    const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      setFace(c.toDataURL('image/jpeg', 0.88)); URL.revokeObjectURL(u);
    };
    img.onerror = () => { URL.revokeObjectURL(u); setErr('Không đọc được ảnh này.'); };
    img.src = u;
  }

  async function draw(model: ModelId) {
    const isFace = !!MODELS.find((m) => m.id === model)?.face;
    if (!key || !adult || (!isFace && problem) || (isFace && (!face || !own))) return;
    const n = seq + 1; setSeq(n);
    setTiles((t) => [{ n, model, res, st: 'run' }, ...t]);
    try {
      const r = await fetch('/api/lab/anh18', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(isFace ? { model, pick: pk, res, consent: own, face } : { model, scene, res, tol }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { patch(n, { st: 'err', msg: errText(j.code) + (j.detail ? ` [${j.status ?? ''}] ${j.detail}` : '') }); return; }
      patch(n, j.url ? { st: 'ok', url: j.url, ms: j.ms, w: j.w, h: j.h, seed: j.seed } : { st: 'filtered', ms: j.ms, msg: 'fal đã lọc ảnh này (bộ lọc an toàn đang bật).' });
    } catch { patch(n, { st: 'err', msg: 'Không kết nối được máy chủ.' }); }
  }

  if (key === null) return <main className="al" />;
  if (!key) return (
    <main className="al">
      <h1>Ảnh 18+ · thử model</h1>
      <p className="al-note">Trang của chủ game. Nhập ADMIN_KEY (cùng khóa với /admin).</p>
      <div className="al-panel">
        <input className="al-in" type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" aria-label="ADMIN_KEY" />
        <button className="al-btn" disabled={!typed} onClick={() => { try { sessionStorage.setItem(KEY, typed); } catch { /* ignore */ } setKey(typed); }}><b>Vào</b></button>
        {err && <p className="al-err">{err}</p>}
      </div>
    </main>
  );

  return (
    <main className="al">
      <h1>Ảnh 18+ · thử model</h1>
      <p className="al-note">Chỉ vẽ nhân vật hư cấu, trưởng thành, gợi cảm nhưng không khỏa thân. Không có chỗ tải ảnh lên, nên không dùng được mặt người thật. Ảnh không được lưu lại.</p>
      <div className="al-panel">
        <label className="al-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> <span>Tôi đủ 18 tuổi và hiểu đây là ảnh người lớn, chỉ để thử.</span></label>
        <Chips label="Wallpaper · phong cách" opts={STYLES} value={pk.style} onPick={setP('style')} />
        <Chips label="Nội dung (câu chuyện + bối cảnh)" opts={STORIES} value={pk.story} onPick={setP('story')} />
        <Chips label="Góc máy" opts={ANGLES} value={pk.angle} onPick={setP('angle')} />
        <Chips label="Tay (tay hay bị lỗi nhất: nên giấu hoặc đặt tư thế đơn giản)" opts={HANDS} value={pk.hands} onPick={setP('hands')} />
        <Chips label="Biểu cảm" opts={EXPRESSIONS} value={pk.expr} onPick={setP('expr')} />
        <Chips label="Độ quyến rũ (vẫn mặc đồ; fal có thể từ chối mức cao)" opts={LEVELS} value={pk.level} onPick={setP('level')} />
        <div className="al-chips"><button className="al-chip" onClick={() => setScene(composeScene(pk))}>Dựng cảnh từ lựa chọn</button><button className="al-chip" onClick={dice}>🎲 Ngẫu nhiên (giữ phong cách và mức)</button></div>
        <div className="al-row"><span>Mẫu có sẵn (từ nhẹ tới táo bạo, vẫn mặc đồ)</span>
          <div className="al-chips">{SCENES.map((x) => <button key={x.id} className="al-chip" aria-pressed={scene === x.text} onClick={() => setScene(x.text)}>{x.label}</button>)}</div></div>
        <div className="al-row"><span>Cảnh vẽ (tiếng Anh cho model hiểu tốt nhất)</span><textarea className="al-in" value={scene} onChange={(e) => setScene(e.target.value)} maxLength={2000} /></div>
        {problem && <p className="al-err">{PROBLEM[problem]}</p>}
        <div className="al-row"><span>Độ phân giải (chỉ Seedream đạt 4K thật; các model khác tối đa khoảng 2K)</span>
          <div className="al-chips">{(['2k', '4k'] as Res[]).map((x) => <button key={x} className="al-chip" aria-pressed={res === x} onClick={() => setRes(x)}>{x.toUpperCase()}</button>)}</div></div>
        <div className="al-row"><span>FLUX.2 Pro/Max: độ thoáng của bộ lọc (1 chặt nhất, 5 thoáng nhất)</span>
          <div className="al-chips">{[1, 2, 3, 4, 5].map((x) => <button key={x} className="al-chip" aria-pressed={tol === x} onClick={() => setTol(x)}>{x}</button>)}</div></div>
        <p className="al-note">Bộ lọc của fal: {off ? 'ĐÃ TẮT (FAL_NSFW_AUTHORIZED=1)' : 'đang bật. Muốn tắt phải được fal cấp quyền cho tài khoản, rồi đặt FAL_NSFW_AUTHORIZED=1.'}</p>
      </div>
      <div className="al-models">
        {MODELS.filter((m) => !m.face).map((m) => <button key={m.id} className="al-btn" disabled={!adult || !!problem || scene.trim().length < 5} onClick={() => draw(m.id)}><b>Vẽ bằng {m.label}</b><small>{m.note}</small></button>)}
      </div>
      <div className="al-panel">
        <div className="al-row"><span>Vẽ bằng gương mặt của tôi</span>
          <p className="al-note">Tải ảnh chân dung rõ mặt của CHÍNH BẠN. Gương mặt được chỉnh nhẹ cho thon và đẹp hơn nhưng vẫn là bạn. Chế độ này luôn ở mức thanh lịch, mặc kín đáo (mức quyến rũ cao không dùng với mặt người thật). Ảnh không được lưu; nó chỉ được gửi cho fal để vẽ. Hiện chỉnh cho nhân vật nữ.</p>
          <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0])} aria-label="Ảnh chân dung của bạn" />
          {face && <img src={face} alt="Ảnh của bạn" style={{ width: 120, borderRadius: 'var(--r-sm)' }} />}</div>
        <label className="al-check"><input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> <span>Đây là ảnh của chính tôi, tôi đủ 18 tuổi, và tôi không dùng ảnh của người khác.</span></label>
        {MODELS.filter((m) => m.face).map((m) => <button key={m.id} className="al-btn" disabled={!adult || !face || !own} onClick={() => draw(m.id)}><b>Vẽ bằng {m.label}</b><small>{m.note}</small></button>)}
      </div>
      {err && <p className="al-err">{err}</p>}
      <div className="al-grid" style={{ marginTop: 'var(--sp-5)' }}>
        {tiles.map((t) => (
          <figure className="al-tile" key={t.n}>
            <div className="al-art">
              {t.st === 'run' && <span>Đang vẽ bằng {nameOf(t.model)}… (thường 20–90 giây)</span>}
              {(t.st === 'err' || t.st === 'filtered') && <span>{t.msg}</span>}
              {t.st === 'ok' && t.url && <img src={t.url} alt={`Ảnh vẽ bằng ${nameOf(t.model)}`} loading="lazy" />}
            </div>
            <figcaption className="al-cap">
              <b>{nameOf(t.model)} · {t.res.toUpperCase()}</b>
              {t.st === 'ok' && <span>{t.w}×{t.h} · {((t.ms || 0) / 1000).toFixed(0)} giây · seed {t.seed ?? '-'}</span>}
              {t.st === 'ok' && t.url && <a href={t.url} target="_blank" rel="noreferrer">Mở ảnh gốc</a>}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
