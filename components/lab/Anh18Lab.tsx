'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_SCENE, MODELS, promptProblem, type ModelId, type Res } from '@/lib/anh18';
import { errText } from '@/lib/strings';

// Lab: one button per model. Each press asks the server for one picture of an original, fictional, adult xianxia character and shows it with the time it took.
// Nothing is saved and there is no upload: the owner only types a scene. The owner's key is the one of /admin (kept in the tab only).
const KEY = 'tutien-admin-key';
interface Tile { n: number; model: ModelId; res: Res; st: 'run' | 'ok' | 'filtered' | 'err'; url?: string; ms?: number; w?: number; h?: number; seed?: number | null; msg?: string }
const PROBLEM: Record<string, string> = { minor: 'Mô tả nhắc tới trẻ vị thành niên.', real: 'Mô tả nhắc tới người thật.', explicit: 'Mô tả quá trắng trợn: chỉ vẽ gợi cảm, không khỏa thân.' };
const nameOf = (id: ModelId) => MODELS.find((m) => m.id === id)?.label || id;

export function Anh18Lab() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [adult, setAdult] = useState(false);
  const [scene, setScene] = useState(DEFAULT_SCENE);
  const [res, setRes] = useState<Res>('4k');
  const [tol, setTol] = useState(5);
  const [off, setOff] = useState(false);
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

  async function draw(model: ModelId) {
    if (!key || !adult || problem) return;
    const n = seq + 1; setSeq(n);
    setTiles((t) => [{ n, model, res, st: 'run' }, ...t]);
    try {
      const r = await fetch('/api/lab/anh18', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, scene, res, tol }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { patch(n, { st: 'err', msg: errText(j.code) }); return; }
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
        <div className="al-row"><span>Cảnh vẽ (tiếng Anh cho model hiểu tốt nhất)</span><textarea className="al-in" value={scene} onChange={(e) => setScene(e.target.value)} maxLength={1200} /></div>
        {problem && <p className="al-err">{PROBLEM[problem]}</p>}
        <div className="al-row"><span>Độ phân giải (chỉ Seedream đạt 4K thật; FLUX tối đa khoảng 2K)</span>
          <div className="al-chips">{(['2k', '4k'] as Res[]).map((x) => <button key={x} className="al-chip" aria-pressed={res === x} onClick={() => setRes(x)}>{x.toUpperCase()}</button>)}</div></div>
        <div className="al-row"><span>FLUX: độ thoáng của bộ lọc (1 chặt nhất, 5 thoáng nhất)</span>
          <div className="al-chips">{[1, 2, 3, 4, 5].map((x) => <button key={x} className="al-chip" aria-pressed={tol === x} onClick={() => setTol(x)}>{x}</button>)}</div></div>
        <p className="al-note">Bộ lọc của fal: {off ? 'ĐÃ TẮT (FAL_NSFW_AUTHORIZED=1)' : 'đang bật. Muốn tắt phải được fal cấp quyền cho tài khoản, rồi đặt FAL_NSFW_AUTHORIZED=1.'}</p>
      </div>
      <div className="al-models">
        {MODELS.map((m) => <button key={m.id} className="al-btn" disabled={!adult || !!problem || scene.trim().length < 5} onClick={() => draw(m.id)}><b>Vẽ bằng {m.label}</b><small>{m.note}</small></button>)}
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
