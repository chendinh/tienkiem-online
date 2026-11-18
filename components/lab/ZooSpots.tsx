'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASE, MUTATIONS } from '@/lib/anim';
import { BG, SPOTS, tileRect, spotRunUsd } from '@/lib/spots';
import { errText } from '@/lib/strings';
import { Ambient } from './Ambient';
import { LoopVideo } from './LoopVideo';

// Demo of the Linh Thú Viên: one background (Thanh Vân), four spots. For each spot the owner picks a creature (and a mutation); the page asks the server for
// the creature's picture drawn INTO the spot's window of the background, then for a looping clip of it, and lays the clip back over that window with soft edges.
const KEY = 'tutien-admin-key';
type St = 'pending' | 'ready' | 'failed' | 'limited' | 'disabled' | 'invalid';
interface Asset { id: string; kind: 'spotpic' | 'spotclip'; sp: string; mut: string; spot: string; src: string; url?: string }
interface Info { enabled: boolean; model: string; seconds: number; spent: number; cap: number; blob: { on: boolean; mb: number }; species: { id: string; name: string }[]; spots: Asset[]; spotUsd: { pic: number; clip: number; bg: number }; bg: { id: string; url?: string; current: boolean } | null }
interface Pick { sp: string; mut: string }
type Answer = { status: St; id?: string; why?: string };

const WHY: Record<string, string> = { limited: 'Hết hạn mức của lab', disabled: 'fal chưa được bật', invalid: 'Yêu cầu không hợp lệ' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const usd = (x: number) => `$${x.toFixed(2)}`;

export function ZooSpots() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<Record<string, Pick>>({});
  const [note, setNote] = useState<Record<string, string>>({});   // what each spot is doing right now
  const [running, setRunning] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [fx, setFx] = useState(true);   // the drawn details (cranes, dragonflies, petals ...): off for a slow phone
  const stop = useRef(false);

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } }, []);
  const load = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/lab/anim?spots=1', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setInfo(j as Info);
      // the first time: show what was made last at each spot, so a reload still shows the demo
      setPick((p) => {
        if (Object.keys(p).length) return p;
        const n: Record<string, Pick> = {};
        for (const a of [...(j.spots as Asset[])].reverse()) if (!n[a.spot]) n[a.spot] = { sp: a.sp, mut: a.mut };
        return n;
      });
    } catch { setErr('Không gọi được máy chủ.'); }
  }, []);
  useEffect(() => { if (key) void load(key); }, [key, load]);

  // the clip and the picture to show at each spot, for the creature picked there
  const shown = useMemo(() => {
    const out: Record<string, { pic?: Asset; clip?: Asset }> = {};
    for (const s of SPOTS) {
      const p = pick[s.id];
      if (!p || !info) { out[s.id] = {}; continue; }
      const mine = info.spots.filter((a) => a.spot === s.id && a.sp === p.sp && a.mut === p.mut);
      const pic = mine.filter((a) => a.kind === 'spotpic').slice(-1)[0];
      out[s.id] = { pic, clip: mine.filter((a) => a.kind === 'spotclip' && (!pic || a.src === pic.id)).slice(-1)[0] };
    }
    return out;
  }, [pick, info]);

  const until = useCallback(async (k: string, body: object): Promise<Answer> => {
    const t0 = Date.now();
    for (;;) {
      const r = await fetch('/api/lab/anim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { status: 'failed', why: String(j.code || r.status) };
      if (j.status !== 'pending') return j;
      if (stop.current || Date.now() - t0 > 6 * 60e3) return { status: 'failed', why: stop.current ? 'Đã dừng' : 'Quá hạn' };
      await sleep(4000);
    }
  }, []);

  async function run() {
    if (!key || running) return;
    stop.current = false; setRunning(true); setErr('');
    const jobs = SPOTS.filter((s) => pick[s.id]?.sp);
    const say = (id: string, t: string) => setNote((n) => ({ ...n, [id]: t }));
    const fail = (id: string, a: Answer) => say(id, `✕ ${a.why || WHY[a.status] || 'Lỗi'}`);
    try {
      let i = 0;
      await Promise.all(Array.from({ length: Math.min(2, jobs.length) }, async () => {
        while (i < jobs.length && !stop.current) {
          const s = jobs[i++], { sp, mut } = pick[s.id];
          say(s.id, 'Chuẩn bị ảnh thú…');
          const base = await until(key, { step: 'base', sp });
          if (base.status !== 'ready' || !base.id) { fail(s.id, base); continue; }
          let src = base.id;
          if (mut !== BASE) {
            say(s.id, 'Vẽ dị biến…');
            const v = await until(key, { step: 'variant', sp, mut });
            if (v.status !== 'ready' || !v.id) { fail(s.id, v); continue; }
            src = v.id;
          }
          say(s.id, 'Vẽ thú vào chỗ đứng…');
          const pic = await until(key, { step: 'spotpic', sp, mut, spot: s.id, src });
          if (pic.status !== 'ready' || !pic.id) { fail(s.id, pic); continue; }
          await load(key);
          say(s.id, 'Làm hoạt ảnh (1–3 phút)…');
          const clip = await until(key, { step: 'spotclip', sp, mut, spot: s.id, src: pic.id });
          if (clip.status !== 'ready') { fail(s.id, clip); continue; }
          say(s.id, 'Xong');
          await load(key);
        }
      }));
    } catch { setErr('Mất kết nối giữa chừng. Những gì đã làm xong vẫn được giữ.'); }
    finally { setRunning(false); await load(key); }
  }

  // the background's own moving clip (once for all, shared)
  async function makeBg() {
    if (!key || bgBusy) return;
    setBgBusy(true); setErr('');
    try {
      const a = await until(key, { step: 'bgclip' });
      if (a.status !== 'ready') setErr(a.why || WHY[a.status] || 'Lỗi');
      await load(key);
    } catch { setErr('Mất kết nối giữa chừng.'); } finally { setBgBusy(false); }
  }

  const todo = SPOTS.filter((s) => pick[s.id]?.sp && !shown[s.id]?.clip).length;
  const plan = info ? spotRunUsd(todo, info.spotUsd.pic, info.spotUsd.clip) : 0;
  const over = !!info && info.spent + plan > info.cap;

  if (key === null) return null;
  if (!key) {
    return (
      <main className="zl">
        <h1>Linh Thú Viên · chỗ đứng</h1>
        <form className="zl-panel" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) setKey(typed.trim()); }}>
          <p className="zl-note">Trang của chủ game: nhập ADMIN_KEY (cùng khóa với trang báo cáo). Trang này tốn tiền fal.</p>
          <input className="zl-in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" />
          <button className="zl-btn" type="submit">Mở</button>
          {err && <p className="zl-err">{err}</p>}
        </form>
      </main>
    );
  }
  return (
    <main className="zl">
      <h1>Linh Thú Viên · chỗ đứng</h1>
      <p className="zl-note">Mỗi chỗ đứng có hành động riêng. Chọn thú cho từng chỗ rồi bấm Tạo: thú được vẽ vào đúng chỗ trong tranh, rồi động đậy tại chỗ. <a className="zl-link" href="/lab/linh-thu">← Xưởng</a></p>

      <section className="zl-panel">
        {SPOTS.map((s) => {
          const p = pick[s.id] || { sp: '', mut: BASE }, sh = shown[s.id];
          return (
            <div key={s.id} className="zl-row">
              <span>{s.name}</span>
              <div className="zs-pick">
                <select className="zl-in" value={p.sp} disabled={running} onChange={(e) => setPick((x) => ({ ...x, [s.id]: { sp: e.target.value, mut: p.mut } }))}>
                  <option value="">— để trống —</option>
                  {(info?.species || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <select className="zl-in" value={p.mut} disabled={running || !p.sp} onChange={(e) => setPick((x) => ({ ...x, [s.id]: { sp: p.sp, mut: e.target.value } }))}>
                  <option value={BASE}>Nguyên bản</option>
                  {MUTATIONS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {p.sp && <span className="zl-note">{note[s.id] || (sh?.clip ? 'Đã có hoạt ảnh' : sh?.pic ? 'Đã có ảnh, chưa có hoạt ảnh' : 'Chưa làm')}</span>}
            </div>
          );
        })}
        {info && (
          <p className="zl-note">
            Còn {todo} chỗ cần làm ≈ <b>{usd(plan)}</b> ({usd(info.spotUsd.pic)} ảnh + {usd(info.spotUsd.clip)} hoạt ảnh mỗi chỗ). Đã dùng {usd(info.spent)} / {usd(info.cap)}.
            {!info.enabled && ' fal chưa bật: cần FAL_KEY (IMAGE_PROVIDER=fal).'}
            {over && ' Vượt hạn mức.'}
          </p>
        )}
        {info && <p className="zl-note">{info.blob.on ? `Video lưu ở Blob: đã dùng ${info.blob.mb} MB (gói Hobby có 1024 MB).` : 'Blob chưa bật (thiếu BLOB_READ_WRITE_TOKEN): video đang lưu trong database, mỗi lần xem tốn transfer Neon. Nên bật Blob trước khi thử nhiều.'}</p>}
        <div className="zl-row"><span>Nền chuyển động</span>
          <div className="zl-chips">
            <button type="button" className="zl-chip" disabled={bgBusy || running || !info?.enabled || !!info?.bg?.current} onClick={makeBg}>{info?.bg?.current ? 'Đã có nền động mới nhất' : bgBusy ? 'Đang làm nền động (1–4 phút)…' : info?.bg ? `Làm lại nền động, chuyển động mạnh hơn (~${usd(info.spotUsd.bg)})` : `Làm nền động (~${usd(info?.spotUsd.bg || 0.7)}, một lần cho mọi người)`}</button>
            <button type="button" className="zl-chip" aria-pressed={fx} onClick={() => setFx((v) => !v)}>Hiệu ứng: chuồn chuồn, bướm, hạc, cánh hoa</button>
          </div>
        </div>
        <div className="zl-actions">
          <button className="zl-btn" type="button" onClick={run} disabled={running || !info?.enabled || !todo || over}>{running ? 'Đang làm…' : 'Tạo'}</button>
          {running && <button className="zl-btn zl-ghost" type="button" onClick={() => { stop.current = true; }}>Dừng</button>}
        </div>
        {err && <p className="zl-err">{err}</p>}
      </section>

      <div className="zs-scroll">
        <div className="zs-stage" style={{ aspectRatio: `${BG.w} / ${BG.h}` }}>
          <img className="zs-bg" src={`/art/zones/${BG.id}.jpg`} alt="" />
          {info?.bg && <div className="zs-bgvid"><LoopVideo src={info.bg.url || `/api/lab/media/${info.bg.id}`} poster={`/art/zones/${BG.id}.jpg`} label="Nền chuyển động" /></div>}
          {fx && <Ambient layer="back" />}
          <div className="zs-fog zs-fog-b" aria-hidden="true"><div className="zl-mist zl-mist-b" /></div>
          {SPOTS.map((s) => {
            const sh = shown[s.id], r = tileRect(s);
            const poster = sh?.pic ? `/api/img/${sh.pic.id}` : '';
            const clip = sh?.clip;
            if (!poster && !clip) return null;
            return (
              <div key={s.id} className="zs-tile" style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` }}>
                {clip ? <LoopVideo src={clip.url || `/api/lab/media/${clip.id}`} poster={poster} label={s.name} /> : <img src={poster} alt={s.name} />}
              </div>
            );
          })}
          <div className="zs-fog zs-fog-f" aria-hidden="true"><div className="zl-mist zl-mist-f" /></div>
          {fx && <Ambient layer="front" />}
          <div className="zs-rays" aria-hidden="true"><i /><i /></div>
        </div>
      </div>
    </main>
  );
}
