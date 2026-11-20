'use client';
import { useCallback, useEffect, useState } from 'react';

// Developer buttons. Add new tools as sections here. The first one draws the pictures of Vạn Giới Tinh Đồ again with the image model and
// saves them into public/art/galaxy (big for PC, smaller tall one for phones); then you look at them and commit. Every button asks twice (it costs money).
const ERR: Record<string, string> = { E_NO_FAL: 'Chưa có FAL_KEY trong .env.local.', E_READONLY: 'Không ghi được vào thư mục public/art/galaxy.' };

function GalaxyArt() {
  const [names, setNames] = useState<[string, string][]>([]), [stamps, setStamps] = useState<Record<string, number>>({}), [ok, setOk] = useState(true);
  const [sure, setSure] = useState(''), [busy, setBusy] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const [a, g] = await Promise.all([fetch('/api/dev/galaxy', { cache: 'no-store' }).then((r) => r.json()), import('@/lib/galaxyArt')]);
      if (a?.ok) { setStamps(a.stamps || {}); setOk(!!a.writable); setNames((a.names as string[]).map((n) => [n, g.GX_ART_LABEL[n] || n])); setErr(''); } else setErr('Không đọc được danh sách ảnh.');
    } catch { setErr('Không đọc được danh sách ảnh.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function go(name: string, size: '2k' | '1k') {
    const id = `${name}:${size}`;
    if (sure !== id) { setSure(id); setMsg(''); return; }
    setSure(''); setBusy(id); setErr(''); setMsg('Đang vẽ, mất khoảng 30 đến 120 giây. Đừng đóng trang.');
    try {
      const r = await fetch('/api/dev/galaxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, size }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setStamps(j.stamps || {}); setMsg(`Đã vẽ xong và lưu vào public/art/galaxy (${(j.files || []).join(', ')}), khoảng ${j.cost} USD. Xem ảnh rồi commit.`); }
      else { setMsg(''); setErr(ERR[j?.code] || j?.message || 'Không vẽ được. Thử lại.'); }
    } catch { setMsg(''); setErr('Không vẽ được (quá thời gian?). Thử lại.'); }
    setBusy('');
  }
  const cell = (name: string, size: '2k' | '1k') => {
    const id = `${name}:${size}`, t = stamps[`${name}_${size}`];
    return (
      <td style={{ padding: 8, verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {t ? <a href={`/art/galaxy/${name}_${size}.webp?t=${t}`} target="_blank" rel="noreferrer"><img src={`/art/galaxy/${name}_${size}.webp?t=${t}`} alt="" loading="lazy" width={size === '2k' ? 120 : 52} height={size === '2k' ? 68 : 92} style={{ objectFit: 'cover', borderRadius: 6 }} /></a> : null}
          <button disabled={!!busy || !ok} onClick={() => go(name, size)}>{busy === id ? 'Đang vẽ…' : sure === id ? `Bấm lần nữa (~${size === '2k' ? '0.17' : '0.09'} USD)` : 'Vẽ lại'}</button>
        </div>
      </td>
    );
  };
  return (
    <section>
      <h2>Ảnh Tinh Hà</h2>
      <p>Vẽ lại bằng AI và lưu thẳng vào <code>public/art/galaxy</code>. Bản lớn cho máy tính, bản nhỏ cho điện thoại. Cần FAL_KEY trong <code>.env.local</code>.</p>
      {err && <p role="alert" style={{ color: '#e5604d' }}>{err}</p>}
      {msg && <p role="status">{msg}</p>}
      {!ok && <p>Không ghi được vào thư mục public/art/galaxy.</p>}
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Ảnh</th><th align="left">Máy tính (2560×1440)</th><th align="left">Điện thoại (1080×1920)</th></tr></thead>
        <tbody>{names.map(([n, label]) => <tr key={n}><td style={{ padding: 8 }}>{label}</td>{cell(n, '2k')}{cell(n, '1k')}</tr>)}</tbody>
      </table>
      <small>Bản đồ tổng được vẽ lại từ bản đồ đang có nên các tinh hà giữ nguyên vị trí. Đổi mô hình bằng FAL_GALAXY_MODEL, độ phân giải bằng FAL_GALAXY_RES (mặc định 4K cho máy tính, 2K cho điện thoại). Ảnh chưa ưng thì bỏ thay đổi bằng <code>git checkout public/art/galaxy</code>.</small>
    </section>
  );
}

export function DevTools() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', color: '#e8e4da', background: '#14121a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Công cụ dev</h1>
      <p>Chỉ có ở máy bạn (<code>npm run dev</code>), không cần database hay khóa admin. Trên Vercel trang này không tồn tại.</p>
      <GalaxyArt />
    </main>
  );
}
