'use client';
// /admin/gen-ai: how many pictures each account has drawn, how many turns it still has, and a form to grant more turns.
import { useCallback, useEffect, useRef, useState } from 'react';
import { errText } from '@/lib/strings';

const KEY = 'tutien-admin-key';   // the same key the report page keeps for this tab
type Row = { acc: string; email: string; total: number; today: number; free: number; bonus: number; left: number | null; last: number; unlimited: boolean };
type Data = { limit: number; budget: number; spent: number; users: Row[] };
const when = (t: number) => (t ? new Date(t).toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

export function GenAiAdmin() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [add, setAdd] = useState('5');
  const alive = useRef(true);

  useEffect(() => { alive.current = true; try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } return () => { alive.current = false; }; }, []);
  const load = useCallback(async (k: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/gen-ai', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!alive.current) return;
      if (r.ok && j.ok) { setData(j); setErr(''); try { sessionStorage.setItem(KEY, k); } catch { /* kept only for this tab */ } setKey(k); }
      else { setData(null); setErr(j.code === 'E_AUTH' ? 'Khóa không đúng.' : errText(j.code || 'E_SERVER')); if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setKey(''); } }
    } catch { if (alive.current) setErr('Mất kết nối tới máy chủ.'); }
    finally { if (alive.current) setBusy(false); }
  }, []);
  const boot = useRef(false);
  useEffect(() => { if (key && !boot.current) { boot.current = true; load(key); } }, [key, load]);

  async function grant(to: string, n: number) {
    if (!key || busy) return;
    setBusy(true); setNote(''); setErr('');
    try {
      const r = await fetch('/api/admin/gen-ai', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: to, add: n }), cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { setNote(`${j.email}: ${n > 0 ? 'cấp thêm' : 'trừ'} ${Math.abs(n)} lượt. Lượt thưởng còn ${j.bonus}, tổng còn ${j.left}.`); await load(key); }
      else setErr(errText(j.code || 'E_SERVER'));
    } catch { setErr('Mất kết nối tới máy chủ.'); }
    setBusy(false);
  }

  if (key === null) return <main className="gx" />;
  if (!data) {
    return (
      <main className="gx">
        <form className="gx-card" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) load(typed.trim()); }}>
          <h1>Quản lý Tiên Dung Họa Quán</h1>
          <p>Nhập khóa quản trị (ADMIN_KEY) để xem số lần vẽ và cấp thêm lượt.</p>
          <input className="gx-in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" />
          <button type="submit" className="gx-go" disabled={busy || !typed.trim()}>Vào</button>
          {err && <p className="gx-err">{err}</p>}
        </form>
      </main>
    );
  }
  const total = data.users.reduce((a, u) => a + u.total, 0);
  return (
    <main className="gx">
      <a className="gx-back" href="/admin">← Báo cáo</a>
      <h1>Quản lý Tiên Dung Họa Quán</h1>
      <p className="gx-sub">{data.users.length} tài khoản đã vẽ · {total} ảnh · mỗi ngày mỗi người {data.limit} lượt miễn phí · hôm nay đã chi ${data.spent.toFixed(2)} / ${data.budget.toFixed(2)}</p>

      <form className="gx-card" onSubmit={(e) => { e.preventDefault(); const n = Number(add); if (email.trim() && Number.isInteger(n) && n !== 0) grant(email.trim(), n); }}>
        <h2>Cấp thêm lượt</h2>
        <p className="gx-sub">Nhập email của tài khoản đã liên kết email. Lượt thưởng được dùng sau khi hết lượt miễn phí trong ngày, không hết hạn. Nhập số âm để trừ.</p>
        <div className="gx-form">
          <input className="gx-in" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vi-du.com" />
          <input className="gx-in gx-n" type="number" step={1} min={-1000} max={1000} value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Số lượt" />
          <button type="submit" className="gx-go" disabled={busy || !email.trim()}>Cấp</button>
        </div>
        {note && <p className="gx-ok">{note}</p>}
        {err && <p className="gx-err">{err}</p>}
      </form>

      <div className="gx-tw">
        <table className="gx-t">
          <thead><tr><th>Email</th><th className="r">Đã vẽ</th><th className="r">Hôm nay</th><th className="r">Thưởng</th><th className="r">Còn lại</th><th>Lần cuối</th><th /></tr></thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.acc}>
                <td>{u.email || u.acc.slice(0, 8)}{u.unlimited && <i className="gx-tag">không giới hạn</i>}</td>
                <td className="r">{u.total}</td>
                <td className="r">{u.today}/{data.limit}</td>
                <td className="r">{u.bonus}</td>
                <td className="r"><b>{u.left === null ? '∞' : u.left}</b></td>
                <td>{when(u.last)}</td>
                <td className="r">{u.email && <span className="gx-btns">{[5, 10].map((n) => <button key={n} type="button" disabled={busy} onClick={() => grant(u.email, n)}>+{n}</button>)}</span>}</td>
              </tr>
            ))}
            {!data.users.length && <tr><td colSpan={7} className="gx-empty">Chưa có ai vẽ ảnh.</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" className="gx-ghost" disabled={busy} onClick={() => key && load(key)}>Tải lại</button>
    </main>
  );
}
