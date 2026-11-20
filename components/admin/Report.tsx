'use client';
// Báo Cáo Thiên Cơ: the owner's report page (data from /api/admin/report, see lib/server/report.ts). Charts are plain SVG, no library.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Report } from '@/lib/server/report';
import { Atmosphere } from '@/components/fx/Atmosphere';

const KEY = 'tutien-admin-key';
const nf = new Intl.NumberFormat('vi-VN');
const num = (n: number) => nf.format(Math.round(n));
const dec = (n: number, d = 1) => n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: d });
const usd = (n: number, d = 2) => `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const hrs = (h: number) => (h < 1 ? `${Math.round(h * 60)} phút` : `${dec(h, 1)} giờ`);
const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const ago = (ms: number) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 90 ? `${s} giây trước` : s < 5400 ? `${Math.round(s / 60)} phút trước` : s < 129600 ? `${Math.round(s / 3600)} giờ trước` : `${Math.round(s / 86400)} ngày trước`; };

// ---------- small pieces
function Card({ id, title, sub, children, wide }: { id?: string; title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return <section id={id} className={`glass rp-card ${wide ? 'wide' : ''}`}><header><h3>{title}</h3>{sub && <small>{sub}</small>}</header>{children}</section>;
}
function Kpi({ label, value, unit, sub, tone }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: 'gold' | 'jade' | 'warn' | 'bad' }) {
  return <div className={`rp-kpi ${tone || ''}`}><small>{label}</small><b className="num">{value}{unit && <i>{unit}</i>}</b>{sub && <span>{sub}</span>}</div>;
}
function Meter({ pct, label, right }: { pct: number; label: string; right: string }) {
  const tone = pct >= 90 ? 'bad' : pct >= 65 ? 'warn' : 'ok';
  return (
    <div className="rp-meter" role="img" aria-label={`${label}: ${pct}%`}>
      <div className="rp-meter-top"><span>{label}</span><b className="num">{right}</b></div>
      <div className="rp-meter-bar"><i className={tone} style={{ width: `${Math.max(1.5, Math.min(100, pct))}%` }} /><span style={{ left: '65%' }} /><span style={{ left: '90%' }} /></div>
      <div className="rp-meter-scale"><span>0</span><span>{dec(pct, 1)}%</span><span>100%</span></div>
    </div>
  );
}
type Bar = { label: string; v: number; tip: string; est?: boolean };
// Columns with a dashed average line. Every column has a tooltip (the browser shows <title>).
function Columns({ data, avg, h = 170, color = 'var(--gold-400)', fmt, every }: { data: Bar[]; avg?: number; h?: number; color?: string; fmt: (n: number) => string; every?: number }) {
  const W = 640, pad = { l: 44, r: 8, t: 10, b: 24 }, iw = W - pad.l - pad.r, ih = h - pad.t - pad.b;
  const top = Math.max(1e-9, ...data.map((d) => d.v), avg || 0), max = top * 1.12, bw = iw / data.length;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, top / 2, top];
  const gid = useMemo(() => `h${Math.random().toString(36).slice(2, 7)}`, []);
  return (
    <svg className="rp-svg" viewBox={`0 0 ${W} ${h}`} role="img">
      <defs><pattern id={gid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={color} opacity=".35" /><rect width="3" height="6" fill={color} opacity=".75" /></pattern></defs>
      {ticks.map((t, i) => <g key={i}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="rp-grid" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="rp-ax">{fmt(t)}</text></g>)}
      {data.map((d, i) => {
        const x = pad.l + i * bw + bw * 0.14, w = bw * 0.72, top = y(d.v);
        return <g key={i}><rect x={x} y={top} width={w} height={Math.max(d.v > 0 ? 1.5 : 0, pad.t + ih - top)} rx={2.5} fill={d.est ? `url(#${gid})` : color} className="rp-col"><title>{d.tip}</title></rect>
          {(every ? i % every === 0 : data.length <= 16 || i % 5 === 0 || i === data.length - 1) && <text x={x + w / 2} y={h - 7} textAnchor="middle" className="rp-ax">{d.label}</text>}</g>;
      })}
      {avg !== undefined && avg > 0 && <g><line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} className="rp-avg" /><text x={W - pad.r} y={y(avg) - 4} textAnchor="end" className="rp-avgt">trung bình {fmt(avg)}</text></g>}
    </svg>
  );
}
function HBars({ rows, color = 'var(--jade-400)', fmt = num, empty = 'Chưa có số liệu.' }: { rows: { label: string; v: number; note?: string; color?: string }[]; color?: string; fmt?: (n: number) => string; empty?: string }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.v));
  if (!rows.length) return <p className="rp-empty">{empty}</p>;
  return <ul className="rp-hb">{rows.map((r) => <li key={r.label}><span className="l">{r.label}</span><span className="t"><i style={{ width: `${Math.max(1.2, (r.v / max) * 100)}%`, background: r.color || color }} /></span><b className="num">{fmt(r.v)}</b>{r.note && <small>{r.note}</small>}</li>)}</ul>;
}
function Donut({ parts, center }: { parts: { label: string; v: number; color: string }[]; center: ReactNode }) {
  const tot = parts.reduce((a, p) => a + p.v, 0), R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="rp-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Tỉ lệ theo độ hiếm">
        <circle cx="70" cy="70" r={R} className="rp-ring" />
        {tot > 0 && parts.map((p) => { const len = (p.v / tot) * C, el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="15" strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"><title>{`${p.label}: ${num(p.v)} (${dec((p.v / tot) * 100)}%)`}</title></circle>; off += len; return el; })}
      </svg>
      <div className="mid">{center}</div>
    </div>
  );
}
// Days (rows) by hour (columns); the more different players in that hour, the brighter the cell.
function Heat({ rows }: { rows: { day: string; cells: number[] }[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  return (
    <div className="rp-heat" role="img" aria-label="Số người online theo ngày và giờ">
      <div className="rp-heat-row head"><span />{Array.from({ length: 24 }, (_, h) => <i key={h}>{h % 3 === 0 ? h : ''}</i>)}</div>
      {rows.map((r) => (
        <div className="rp-heat-row" key={r.day}>
          <span>{dm(r.day)}</span>
          {r.cells.map((n, h) => <i key={h} className={n ? 'on' : ''} style={n ? { background: `color-mix(in srgb, var(--jade-300) ${Math.round(18 + (n / max) * 82)}%, transparent)` } : undefined} title={`${dm(r.day)}, ${h}h đến ${h + 1}h: ${n} người`} />)}
        </div>
      ))}
      <div className="rp-heat-key"><small>ít</small><b style={{ background: 'color-mix(in srgb, var(--jade-300) 18%, transparent)' }} /><b style={{ background: 'color-mix(in srgb, var(--jade-300) 55%, transparent)' }} /><b style={{ background: 'var(--jade-300)' }} /><small>nhiều (tối đa {max} người)</small></div>
    </div>
  );
}
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return <div className="rp-tw"><table className="rp-t"><thead><tr>{head.map((h, i) => <th key={h} className={i ? 'r' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'r num' : ''}>{c}</td>)}</tr>)}</tbody></table></div>;
}

// ---------- the page
export function ReportPage() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } return () => { alive.current = false; }; }, []);
  const load = useCallback(async (k: string, fresh = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/report${fresh ? '?fresh=1' : ''}`, { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!alive.current) return;
      if (r.ok && j.ok) { setData(j.report); setErr(''); try { sessionStorage.setItem(KEY, k); } catch {} setKey(k); }
      else {
        setData(null);
        setErr(j.code === 'E_NO_ADMIN_KEY' ? 'Máy chủ chưa đặt ADMIN_KEY (hoặc CRON_SECRET) nên trang này đang đóng.' : j.code === 'E_RATE_LIMIT' ? 'Nhập sai nhiều lần. Chờ một lát rồi thử lại.' : r.status === 401 ? 'Khóa không đúng.' : 'Không đọc được báo cáo. Thử lại sau.');
        if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); }
      }
    } catch { if (alive.current) setErr('Mất kết nối tới máy chủ.'); }
    finally { if (alive.current) setBusy(false); }
  }, []);
  const boot = useRef(false);
  useEffect(() => { if (key && !boot.current) { boot.current = true; load(key); } }, [key, load]);   // a key kept from earlier in this tab
  useEffect(() => { if (!auto || !key || !data) return; const t = setInterval(() => load(key), 60_000); return () => clearInterval(t); }, [auto, key, data, load]);

  if (key === null) return <div className="app rp"><Atmosphere scene="night" /></div>;
  if (!data) {
    return (
      <div className="app rp">
        <Atmosphere scene="night" />
        <form className="glass rp-gate" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) load(typed.trim()); }}>
          <div className="eyebrow">Chỉ dành cho chủ game</div>
          <h1 className="gold-text">Báo Cáo Thiên Cơ</h1>
          <p className="muted">Nhập khóa quản trị (ADMIN_KEY) để xem chi phí và số liệu của game.</p>
          <input className="inp" type="password" autoComplete="off" placeholder="Khóa quản trị" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          {err && <p className="formErr" role="alert">{err}</p>}
          <button className="btn big" disabled={busy || !typed.trim()}>{busy ? 'Đang mở…' : 'Mở báo cáo'}</button>
          <a className="link" href="/">Về game</a>
        </form>
      </div>
    );
  }
  return <ReportView r={data} busy={busy} auto={auto} setAuto={setAuto} reload={() => load(key!, true)} out={() => { try { sessionStorage.removeItem(KEY); } catch {} setData(null); setKey(''); }} adminKey={key!} />;
}

const NAV: [string, string][] = [['ai', 'Chi phí AI'], ['players', 'Người chơi'], ['online', 'Online'], ['items', 'Vật phẩm'], ['beasts', 'Linh thú'], ['quest', 'Nhiệm vụ'], ['dibien', 'Ảnh Dị Biến'], ['tinhha', 'Ảnh Tinh Hà']];

// The owner's button to draw the Dị Biến pictures again: it makes the game forget the saved pictures of a look, and each is drawn again (with the current model) the next time a
// creature of that look needs it. Two taps: the first asks, the second does it.
interface LookStat { id: string; name: string; pictures: number; stills: number }
function Redraw({ adminKey }: { adminKey: string }) {
  const [looks, setLooks] = useState<LookStat[] | null>(null), [items, setItems] = useState<{ tier: number; name: string; pictures: number }[]>([]);
  const [sure, setSure] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const hdr = { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' };
  const load = useCallback(async () => {
    try { const r = await fetch('/api/admin/variants', { headers: hdr, cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (r.ok && j.ok) { setLooks(j.looks); setItems(j.items || []); setErr(''); } else setErr('Không đọc được danh sách ảnh.'); } catch { setErr('Không đọc được danh sách ảnh.'); }
  }, [adminKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function go(look: string) {
    if (sure !== look) { setSure(look); setMsg(''); return; }
    const tier = look.startsWith('item') ? Number(look.slice(4)) : 0;
    setBusy(true); setSure(''); setErr('');
    try {
      const r = await fetch('/api/admin/variants', { method: 'POST', headers: hdr, body: JSON.stringify(tier ? { items: tier } : { look }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) setMsg(`Đã xóa ${j.removed} ảnh. Ảnh được vẽ lại khi người chơi cần tới (thú: vào Linh Thú Viên hoặc trang chi tiết; đồ: khi đồ hiện ra trong túi).`); else setErr('Không làm được. Thử lại.');
    } catch { setErr('Không làm được. Thử lại.'); }
    setBusy(false); void load();
  }
  const total = (looks || []).reduce((a, l) => a + l.pictures + l.stills, 0);
  return (
    <Card id="dibien" title="Ảnh thú Dị Biến" sub="bấm để vẽ lại; ảnh chỉ được vẽ lại khi có người cần, nên chỉ tốn tiền cho thú đang có người nuôi">
      {err && <p className="formErr" role="alert">{err}</p>}
      {msg && <p className="muted" role="status">{msg}</p>}
      {!looks ? <p className="rp-empty">Đang đọc…</p> : (
        <>
          <Table head={['Kiểu', 'Ảnh thú', 'Ảnh tách nền', '']} rows={looks.map((l) => [l.name, num(l.pictures), num(l.stills),
            <button key={l.id} className="btn" disabled={busy || (l.pictures + l.stills === 0)} onClick={() => go(l.id)}>{sure === l.id ? 'Bấm lần nữa để vẽ lại' : 'Vẽ lại'}</button>])} />
          <h4>Biểu tượng đồ</h4>
          <Table head={['Hạng', 'Ảnh', '']} rows={items.map((x) => [x.name, num(x.pictures), <button key={x.tier} className="btn" disabled={busy || x.pictures === 0} onClick={() => go(`item${x.tier}`)}>{sure === `item${x.tier}` ? 'Bấm lần nữa để vẽ lại' : 'Vẽ lại'}</button>])} />
          <p><button className="btn big" disabled={busy || total === 0} onClick={() => go('all')}>{sure === 'all' ? `Bấm lần nữa: vẽ lại cả ${num(total)} ảnh` : 'Vẽ lại tất cả'}</button></p>
          <small className="muted">Mỗi ảnh thú vẽ lại tốn khoảng 0.07 USD, mỗi ảnh tách nền thêm 0.02 USD, tính vào ngân sách phòng thí nghiệm (LAB_BUDGET_USD). Mỗi biểu tượng đồ khoảng 0.05 USD, tính vào ngân sách ảnh (IMAGE_BUDGET_USD); hạng Thiên chỉ được vẽ khi bật DRAW_THIEN_ART=1.</small>
        </>
      )}
    </Card>
  );
}

// Ảnh Tinh Hà: the owner's button to draw the pictures of Vạn Giới Tinh Đồ again with the image model. Big for PC (2560 wide) and a smaller tall one for phones (1080x1920).
// Drawing takes up to two minutes and costs money, so every button asks twice. The star chart is repainted from the bundled chart (so the galaxies stay where the buttons are).
function GalaxyArt({ adminKey }: { adminKey: string }) {
  const [art, setArt] = useState<Record<string, string>>({}), [names, setNames] = useState<[string, string][]>([]);
  const [sure, setSure] = useState(''), [busy, setBusy] = useState(''), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const hdr = { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' };
  const load = useCallback(async () => {
    try {
      const [a, g] = await Promise.all([fetch('/api/admin/galaxy', { headers: hdr, cache: 'no-store' }).then((r) => r.json()), import('@/lib/galaxyArt')]);
      if (a?.ok) { setArt(a.art || {}); setNames((a.names as string[]).map((n) => [n, g.GX_ART_LABEL[n] || n])); setErr(''); } else setErr('Không đọc được danh sách ảnh.');
    } catch { setErr('Không đọc được danh sách ảnh.'); }
  }, [adminKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const ERR: Record<string, string> = { E_NO_FAL: 'Chưa có FAL_KEY trong môi trường.', E_NO_BLOB: 'Chưa nối Vercel Blob (BLOB_READ_WRITE_TOKEN), nên chưa lưu được ảnh vẽ lại.' };
  async function go(name: string, what: '2k' | '1k' | 'reset') {
    const id = `${name}:${what}`;
    if (sure !== id) { setSure(id); setMsg(''); return; }
    setSure(''); setBusy(id); setErr(''); setMsg(what === 'reset' ? '' : 'Đang vẽ, mất khoảng 30 đến 120 giây. Đừng đóng trang.');
    try {
      const r = await fetch('/api/admin/galaxy', { method: 'POST', headers: hdr, body: JSON.stringify(what === 'reset' ? { name, reset: true } : { name, size: what }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setArt(j.art || {}); setMsg(what === 'reset' ? 'Đã quay về ảnh gốc của game.' : `Đã vẽ xong${j.cost ? ` (khoảng ${j.cost} USD)` : ''}. Trang Tinh Đồ tự lấy ảnh mới trong vòng một phút.`); }
      else { setMsg(''); setErr(ERR[j?.code] || 'Không vẽ được. Thử lại.'); }
    } catch { setMsg(''); setErr('Không vẽ được (quá thời gian?). Thử lại.'); }
    setBusy('');
  }
  const cell = (name: string, size: '2k' | '1k') => {
    const url = art[`${name}_${size}`], id = `${name}:${size}`;
    return (
      <div key={id} className="rp-gx">
        {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" loading="lazy" width={size === '2k' ? 120 : 52} height={size === '2k' ? 68 : 92} style={{ objectFit: 'cover', borderRadius: 6 }} /></a> : <small className="muted">ảnh gốc</small>}
        <button className="btn sm" disabled={!!busy} onClick={() => go(name, size)}>{busy === id ? 'Đang vẽ…' : sure === id ? `Bấm lần nữa (~${size === '2k' ? '0.17' : '0.09'} USD)` : 'Vẽ lại'}</button>
      </div>
    );
  };
  return (
    <Card id="tinhha" title="Ảnh Tinh Hà" sub="vẽ lại bằng AI, bản lớn cho máy tính và bản nhỏ cho điện thoại; ảnh mới thay ngay trên trang Tinh Đồ">
      {err && <p className="formErr" role="alert">{err}</p>}
      {msg && <p className="muted" role="status">{msg}</p>}
      <Table head={['Ảnh', 'Máy tính (2560×1440)', 'Điện thoại (1080×1920)', '']} rows={names.map(([n, label]) => [label, cell(n, '2k'), cell(n, '1k'),
        <button key={n} className="btn sm ghost" disabled={!!busy || !Object.keys(art).some((k) => k.startsWith(`${n}_`))} onClick={() => go(n, 'reset')}>{sure === `${n}:reset` ? 'Bấm lần nữa' : 'Về ảnh gốc'}</button>])} />
      <small className="muted">Bản đồ tổng được vẽ lại từ bản đồ gốc nên các tinh hà giữ nguyên vị trí. Cần FAL_KEY và Vercel Blob. Đổi mô hình bằng FAL_GALAXY_MODEL, độ phân giải bằng FAL_GALAXY_RES (mặc định 4K cho máy tính, 2K cho điện thoại). Ảnh vẽ lại nào chưa ưng thì bấm "Về ảnh gốc".</small>
    </Card>
  );
}

export function ReportView({ r, busy, auto, setAuto, reload, out, adminKey }: { r: Report; busy: boolean; auto: boolean; setAuto: (b: boolean) => void; reload: () => void; out: () => void; adminKey?: string }) {
  const a = r.ai, p = r.players, o = r.online, it = r.items, b = r.beasts, q = r.quest;
  const imgTone = a.image.pct >= 90 ? 'bad' : a.image.pct >= 65 ? 'warn' : 'jade';
  const totDrop = it.dropped.reduce((x, y) => x + y, 0), totHeld = it.held.reduce((x, y) => x + y, 0);
  const rate = q.activeToday ? Math.round((q.done / q.activeToday) * 100) : 0;
  return (
    <div className="app rp">
      <Atmosphere scene="night" />
      <header className="rp-top glass">
        <div><div className="eyebrow">Tiên Kiếm · chủ game</div><h1 className="gold-text">Báo Cáo Thiên Cơ</h1></div>
        <nav aria-label="Mục lục">{NAV.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>
        <div className="rp-act">
          <small>{busy ? 'Đang đọc…' : `Cập nhật ${ago(r.at)}`}</small>
          <label className="tg"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /><span>Tự làm mới</span></label>
          <button className="btn sm" onClick={reload} disabled={busy}>Làm mới</button>
          <button className="btn sm ghost" onClick={out}>Khóa lại</button>
          <a className="btn sm ghost" href="/">Về game</a>
        </div>
      </header>

      <main className="rp-main">
        <div className="rp-hero">
          <Kpi label="Người chơi thật" value={num(p.real)} sub={`${num(p.registered)} đã đăng ký · ${num(p.guests)} khách`} />
          <Kpi label="Hoạt động 24 giờ" value={num(p.active24h)} sub={`${num(p.active7d)} người trong 7 ngày`} tone="jade" />
          <Kpi label="Tiền ảnh AI đã dùng" value={usd(a.image.spent)} sub={`còn ${usd(a.image.remaining)} / hạn mức ${usd(a.image.cap, 0)}`} tone={imgTone === 'jade' ? 'gold' : imgTone} />
          <Kpi label="Online trung bình" value={hrs(o.avgHoursPerPlayer)} sub="mỗi người, cộng dồn" />
          <Kpi label="Linh thú đang có" value={num(b.total)} sub={`${dec(b.avgPerPlayer)} con mỗi người`} />
          <Kpi label="Xong nhiệm vụ hôm nay" value={num(q.done)} sub={`${num(q.activeToday)} người hoạt động hôm nay`} tone="jade" />
        </div>

        <Card id="ai" title="Chi phí AI vẽ ảnh" sub={`${a.provider || 'chưa bật'}${a.enabled ? '' : ' (tắt)'}${a.locked ? ' · tạm khóa' : ''}${a.running || a.queued ? ` · đang vẽ ${a.running}, chờ ${a.queued}` : ''}`} wide>
          <div className="rp-grid2">
            <div>
              {a.fal && (
                <div className={`rp-fal ${a.fal.balance === null ? 'off' : ''}`}>
                  <small>Số dư thật trong tài khoản fal</small>
                  {a.fal.balance !== null
                    ? <><b className="num">{a.fal.currency === 'USD' ? usd(a.fal.balance) : `${dec(a.fal.balance, 2)} ${a.fal.currency}`}</b><span>{a.fal.daysLeft === null ? 'chưa tính được số ngày' : `đủ dùng khoảng ${num(a.fal.daysLeft)} ngày theo mức 7 ngày gần nhất`} · đọc {ago(a.fal.at)}</span></>
                    : <span>{a.fal.configured ? a.fal.error : 'Chưa có khóa fal để đọc số dư (đặt FAL_BILLING_KEY).'}</span>}
                </div>
              )}
              {a.fal?.usage && (a.fal.usage.ok
                ? <div className="rp-fal"><small>Fal đã tính tiền thật, từ {dm(a.fal.usage.from)} đến nay</small><b className="num">{usd(a.fal.usage.total)}</b><span>Sổ của game ghi {usd(a.image.spent)} từ đầu{Math.abs(a.fal.usage.total - a.image.spent) >= 0.01 ? `, chênh ${usd(Math.abs(a.fal.usage.total - a.image.spent))} (${a.fal.usage.total > a.image.spent ? 'fal tính nhiều hơn' : 'sổ game ghi nhiều hơn'})` : ', khớp với fal'}</span></div>
                : a.fal.usage.error && <div className="rp-fal off"><small>Mức dùng thật từ fal</small><span>{a.fal.usage.error}</span></div>)}
              <Meter pct={a.image.pct} label="Đã dùng so với hạn mức tự đặt (IMAGE_BUDGET_USD)" right={`${usd(a.image.spent)} / ${usd(a.image.cap)}`} />
              <div className="rp-kpis">
                <Kpi label="Đã dùng" value={usd(a.image.spent)} tone="gold" />
                <Kpi label="Còn lại" value={usd(a.image.remaining)} tone={imgTone === 'jade' ? 'jade' : imgTone} />
                <Kpi label="Hạn mức" value={usd(a.image.cap)} />
                <Kpi label="Trung bình mỗi ngày" value={usd(a.avgPerDay)} sub={a.firstDay ? `từ ${dm(a.firstDay)}` : undefined} />
                <Kpi label="7 ngày gần nhất" value={usd(a.avg7)} sub="mỗi ngày" />
                <Kpi label="Đủ dùng thêm" value={a.daysLeft === null ? '—' : num(a.daysLeft)} unit={a.daysLeft === null ? '' : ' ngày'} sub="theo mức 7 ngày" tone={a.daysLeft !== null && a.daysLeft < 5 ? 'bad' : undefined} />
              </div>
              <p className="rp-sub">Hôm nay đã dùng <b>{usd(a.spentToday)}</b>. Chi phí chữ (Claude viết truyện, ngày mới): <b>{usd(a.text.spent)}</b> / {usd(a.text.cap)} (còn {usd(a.text.remaining)}).</p>
            </div>
            <div>
              <h4>Chi phí 30 ngày <small>{a.source === 'fal' ? 'số liệu thật của fal' : 'số liệu của game, chưa đối chiếu với fal'}</small></h4>
              <Columns data={a.days.map((d) => ({ label: dm(d.day), v: d.image, est: d.estimated, tip: `${dm(d.day)}: ${usd(d.image, 3)}${d.estimated ? ' (ước tính từ giá ghi trên ảnh)' : ''}` }))} avg={a.avgPerDay} fmt={(n) => usd(n, n < 1 ? 2 : 1)} />
              <p className="rp-sub">{a.source === 'fal' ? 'Mỗi cột là số tiền fal tính trong ngày (giờ UTC).' : 'Cột sọc là ngày chưa có sổ theo ngày, ước tính từ giá ghi trên các ảnh đã lưu.'}</p>
            </div>
          </div>
          {a.fal?.usage?.ok && a.fal.usage.byModel.length > 0 && (<>
            <h4>Theo model <small>fal tính tiền thật</small></h4>
            <Table head={['Model', 'Số lượng', 'Tiền']} rows={a.fal.usage.byModel.map((m) => [m.endpoint, `${num(m.qty)} ${m.unit}`, usd(m.usd, 3)])} />
          </>)}
          <h4>Theo loại ảnh <small>{num(a.pictures)} ảnh · {usd(a.storedCost)} theo giá ghi trên ảnh</small></h4>
          <Table head={['Loại ảnh', 'Số ảnh', 'Tổng giá', 'Mỗi ảnh']} rows={a.byKind.map((k) => [KIND[k.kind] || k.kind, num(k.n), usd(k.cost), usd(k.n ? k.cost / k.n : 0, 3)])} />
        </Card>

        <Card id="players" title="Người chơi" sub={`${num(p.withCharacter)} người đã có nhân vật`}>
          <div className="rp-kpis">
            <Kpi label="Đã đăng ký" value={num(p.registered)} /><Kpi label="Khách" value={num(p.guests)} />
            <Kpi label="24 giờ qua" value={num(p.active24h)} tone="jade" /><Kpi label="7 ngày qua" value={num(p.active7d)} />
          </div>
          <h4>Người mới 14 ngày</h4>
          <Columns h={130} color="var(--jade-400)" data={p.newByDay.map((d) => ({ label: dm(d.day), v: d.n, tip: `${dm(d.day)}: ${d.n} người mới` }))} fmt={(n) => String(Math.round(n))} />
          <h4>Phân bố cấp độ</h4>
          <Columns h={130} color="var(--gold-400)" data={p.levels.map((n, i) => ({ label: `${i + 1}`, v: n, tip: `Lv${i + 1}: ${n} người` }))} fmt={(n) => String(Math.round(n))} />
          <div className="rp-cols">
            <div><h4>Cảnh giới</h4><HBars rows={p.realms.map((x) => ({ label: x.name, v: x.n }))} /></div>
            <div><h4>Vùng đang ở</h4><HBars rows={p.zones.map((x) => ({ label: x.name, v: x.n }))} color="var(--gold-400)" /></div>
          </div>
          <h4>Cài đặt tự động đang bật</h4>
          <HBars fmt={(n) => `${num(n)} người`} rows={[{ label: 'Tự thu phục', v: p.auto.autoTame }, { label: 'Tự đánh Tu Sĩ', v: p.auto.autoFight }, { label: 'Tự đột phá', v: p.auto.autoBreak }, { label: 'Đang bế quan', v: p.auto.retreat }]} />
        </Card>

        <Card id="online" title="Thời gian online thật" sub={o.since ? `ghi từ ${dm(o.since)}` : 'chưa có số liệu'}>
          <div className="rp-kpis">
            <Kpi label="Tổng cộng" value={hrs(o.totalHours)} tone="gold" />
            <Kpi label="Trung bình mỗi người" value={hrs(o.avgHoursPerPlayer)} sub={`${num(o.players)} người có ghi nhận`} />
            <Kpi label="Mỗi ngày có chơi" value={`${num(o.avgMinPerActiveDay)}`} unit=" phút" sub="trung bình mỗi người" />
            <Kpi label="Hôm nay" value={hrs(o.todayHours)} sub={`${num(o.todayPlayers)} người`} tone="jade" />
          </div>
          <h4>Số giờ mỗi ngày, 14 ngày</h4>
          <Columns h={150} color="var(--jade-400)" data={o.byDay.map((d) => ({ label: dm(d.day), v: d.hours, tip: `${dm(d.day)}: ${hrs(d.hours)} · ${d.players} người` }))} fmt={(n) => (n < 10 ? dec(n, 1) : String(Math.round(n)))} />
          <h4>Người online theo giờ trong ngày <small>{o.tz} · trung bình mỗi ngày, {num(o.daysCounted)} ngày có số liệu</small></h4>
          <Columns h={160} color="var(--jade-400)" every={3} data={o.hours.map((x) => ({ label: `${x.hour}h`, v: x.players, tip: `${x.hour}h đến ${x.hour + 1}h: trung bình ${dec(x.players, 2)} người, nhiều nhất ${x.peak} người trong một ngày, tổng ${num(x.minutes)} phút` }))} fmt={(n) => dec(n, n < 10 ? 1 : 0)} />
          <p className="rp-sub">{o.peak.length ? <>Đông nhất: {o.peak.map((x) => `${x.hour}h đến ${x.hour + 1}h (${dec(x.players, 1)} người)`).join(', ')}.</> : 'Chưa có số liệu theo giờ.'}</p>
          <h4>Bản đồ nhiệt 14 ngày <small>mỗi ô là một giờ, sáng hơn là nhiều người hơn</small></h4>
          <Heat rows={o.heat} />
          <div className="rp-cols">
            <div><h4>Mỗi người đã online</h4><HBars rows={o.buckets.map((x) => ({ label: x.label, v: x.n }))} fmt={(n) => `${num(n)} người`} color="var(--gold-400)" /></div>
            <div><h4>Chơi nhiều nhất</h4><Table head={['Người chơi', 'Giờ', 'Ngày']} rows={o.top.map((t) => [<span key={t.name}>{t.name}<small className="rp-mute"> {t.kind} · {t.email}</small></span>, hrs(t.hours), String(t.days)])} /></div>
          </div>
        </Card>

        <Card id="items" title="Vật phẩm theo độ hiếm" sub={`đã rơi tính từ ${it.since} · đang giữ là số thật hiện nay`}>
          <div className="rp-grid2">
            <Donut parts={it.names.map((n, i) => ({ label: n, v: it.dropped[i], color: it.colors[i] }))} center={<><b className="num">{num(totDrop)}</b><small>đã rơi</small></>} />
            <div>
              <Table head={['Độ hiếm', 'Đã rơi', 'Tỉ lệ', 'Đang giữ']} rows={it.names.map((n, i) => [
                <span key={n} className="rp-dot"><i style={{ background: it.colors[i] }} />{n}</span>, num(it.dropped[i]), totDrop ? `${dec((it.dropped[i] / totDrop) * 100)}%` : '—', num(it.held[i]),
              ])} />
              <p className="rp-sub">Đang giữ tổng cộng {num(totHeld)} món trong túi, kho tạm và đang mặc của {num(it.accountsCounted)} người chơi thật.</p>
            </div>
          </div>
        </Card>

        <Card id="itemsDay" title="Vật phẩm người chơi nhặt được mỗi ngày" sub={it.trackedSince ? `người chơi thật, theo ngày UTC · đếm từ ${dm(it.trackedSince)}, các ngày trước đó chưa có số liệu` : 'chưa có số liệu: sẽ có sau khi người chơi nhặt món đầu tiên'}>
          <Columns h={150} color="var(--gold-400)" every={3} data={it.byDay.map((d) => { const n = d.n.reduce((a, b) => a + b, 0); return { label: dm(d.day), v: n, est: !it.trackedSince || d.day < it.trackedSince, tip: `${dm(d.day)}: ${num(n)} món (${it.names.map((nm, i) => `${nm} ${num(d.n[i])}`).join(', ')})` }; })} fmt={(n) => num(n)} />
          <p className="rp-sub">Cột là số món rơi trong ngày (mọi độ hiếm); rê vào cột để xem chi tiết từng độ hiếm. Cột gạch chéo là ngày chưa được đếm.</p>
          <Table head={['Ngày', ...it.names, 'Tổng']} rows={it.byDay.slice(-7).reverse().map((d) => [dm(d.day), ...d.n.map((n) => num(n)), num(d.n.reduce((a, b) => a + b, 0))])} />
        </Card>

        <Card id="contentDay" title="Nội dung mới game ra mỗi ngày" sub="linh thú mới, vũ khí mới và số ảnh AI đã vẽ trong ngày (UTC)">
          <h4>Ảnh mới được vẽ mỗi ngày</h4>
          <Columns h={130} color="var(--jade-400)" every={3} data={it.content.map((d) => ({ label: dm(d.day), v: d.pictures, tip: `${dm(d.day)}: ${num(d.pictures)} ảnh mới` }))} fmt={(n) => num(n)} />
          <Table head={['Ngày', 'Linh thú mới', 'Vũ khí mới', 'Ảnh mới']} rows={it.content.slice(-7).reverse().map((d) => [dm(d.day), num(d.beasts), num(d.weapons), num(d.pictures)])} />
        </Card>

        <Card id="beasts" title="Linh thú" sub={`${num(b.speciesTamed)} / ${num(b.speciesInGame)} loài đã có người thu phục`}>
          <div className="rp-kpis">
            <Kpi label="Đang có" value={num(b.total)} tone="gold" sub="trong Chuồng Linh Thú người thật" />
            <Kpi label="Mỗi người" value={dec(b.avgPerPlayer)} sub={`nhiều nhất ${num(b.maxPerPlayer)}`} />
            <Kpi label="Dị Biến" value={num(b.mutants)} tone="jade" />
            <Kpi label="Đã thu phục từ đầu" value={num(b.tamedEver)} sub={`${num(b.mutTamedEver)} Dị Biến`} />
          </div>
          <div className="rp-cols">
            <div><h4>Theo cỡ</h4><HBars rows={b.sizes.map((x) => ({ label: x.name, v: x.n }))} color="var(--gold-400)" /></div>
            <div><h4>Loài nhiều nhất</h4><HBars rows={b.species.map((x) => ({ label: x.name, v: x.n }))} /></div>
          </div>
        </Card>

        <Card id="quest" title="Nhiệm vụ hằng ngày" sub={q.creature ? `hôm nay: thu phục ${q.need} ${q.creature}` : 'hôm nay không có linh thú mới: mỗi người làm với một linh thú cũ'}>
          <div className="rp-kpis">
            <Kpi label="Đã làm xong hôm nay" value={num(q.done)} tone="gold" sub={q.activeToday ? `${rate}% số người hoạt động` : undefined} />
            <Kpi label="Đang làm dở" value={num(q.inProgress)} />
            <Kpi label="Chưa làm" value={num(q.notStarted)} />
            <Kpi label="Người hoạt động hôm nay" value={num(q.activeToday)} tone="jade" />
            <Kpi label="Từng làm xong" value={num(q.everDone)} sub="ít nhất một lần" />
          </div>
          <h4>Số người làm xong, 14 ngày</h4>
          <Columns h={140} color="var(--gold-400)" data={q.byDay.map((d) => ({ label: dm(d.day), v: d.done, tip: `${dm(d.day)}: ${d.done} người` }))} fmt={(n) => String(Math.round(n))} />
        </Card>


        {adminKey && <Redraw adminKey={adminKey} />}
        {adminKey && <GalaxyArt adminKey={adminKey} />}

        <footer className="rp-note"><h4>Cách đọc số liệu</h4><ul>{r.note.map((n) => <li key={n}>{n}</li>)}</ul></footer>
      </main>
    </div>
  );
}

const KIND: Record<string, string> = { item: 'Biểu tượng pháp khí', monster: 'Linh thú', avatar: 'Chân dung', outfit: 'Chân dung mặc đồ', pose: 'Dáng đứng', place: 'Cảnh vùng đất', label: 'Biển hiệu nút', prop: 'Đồ vật', book: 'Sách' };
