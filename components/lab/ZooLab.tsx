'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASE, MOTIONS, MUTATIONS, estimate } from '@/lib/anim';
import { errText } from '@/lib/strings';
import { AlphaVideo } from './AlphaVideo';
import { LoopVideo } from './LoopVideo';

// Lab: pick a creature, pick mutations and motions, and the page asks the server for every variant picture, every looping clip and (if asked) every
// cut-out of a clip, a few at a time. Nothing here is a toast: each card says what it is doing. The owner's key is the one of /admin (kept in the tab only).
const KEY = 'tutien-admin-key';
type St = 'pending' | 'ready' | 'failed' | 'limited' | 'disabled' | 'invalid';
interface Cell { id?: string; alpha?: string; src?: string; st: St; why?: string }
interface Asset { id: string; kind: 'animvar' | 'anim' | 'animcut'; mut?: string; motion?: string; src?: string; alpha?: string }
interface Info { enabled: boolean; provider: string; model: string; cutModel: string; seconds: number; editUsd: number; spent: number; cap: number; species: { id: string; name: string; isNew: boolean }[]; assets: Asset[] }
type Answer = { status: St; id?: string; alpha?: string; why?: string };

const WHY: Record<string, string> = { limited: 'Hết hạn mức của lab', disabled: 'fal chưa được bật', invalid: 'Yêu cầu không hợp lệ', failed: 'Lỗi' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const flip = (a: string[], x: string) => (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]);
const usd = (x: number) => `$${x.toFixed(2)}`;

export function ZooLab() {
  const [key, setKey] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [sp, setSp] = useState('');
  const [muts, setMuts] = useState<string[]>([]);
  const [moves, setMoves] = useState<string[]>(['idle']);
  const [cutOn, setCutOn] = useState(true);
  const [pics, setPics] = useState<Record<string, Cell>>({});
  const [clips, setClips] = useState<Record<string, Cell>>({});
  const [cuts, setCuts] = useState<Record<string, Cell>>({});
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } }, []);

  // what the server knows: prices, spend, species, and what is already made for the chosen species
  const load = useCallback(async (k: string, s: string) => {
    try {
      const r = await fetch(`/api/lab/anim${s ? `?sp=${encodeURIComponent(s)}` : ''}`, { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setInfo(j);
      const pc: Record<string, Cell> = {}, cc: Record<string, Cell> = {}, xc: Record<string, Cell> = {};
      for (const a of j.assets as Asset[]) {
        if (a.kind === 'animvar' && a.mut) pc[a.mut] = { id: a.id, st: 'ready' };
        else if (a.kind === 'anim' && a.mut && a.motion) cc[`${a.mut}:${a.motion}`] = { id: a.id, src: a.src, st: 'ready' };
        else if (a.kind === 'animcut' && a.mut && a.motion) xc[`${a.mut}:${a.motion}`] = { id: a.id, alpha: a.alpha, src: a.src, st: 'ready' };
      }
      setPics(pc); setClips(cc); setCuts(xc);
    } catch { setErr('Không gọi được máy chủ.'); }
  }, []);
  useEffect(() => { if (key) void load(key, sp); }, [key, sp, load]);
  useEffect(() => { if (!sp && info?.species.length) setSp(info.species[0].id); }, [sp, info]);

  // ask until the server stops saying "pending" (a clip takes one to three minutes)
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
  const pool = async <T,>(items: T[], n: number, fn: (x: T) => Promise<void>) => {
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length && !stop.current) await fn(items[i++]); }));
  };

  async function run() {
    if (!key || !sp || running) return;
    stop.current = false; setRunning(true); setErr('');
    const setPic = (m: string, c: Cell) => setPics((p) => ({ ...p, [m]: c }));
    const setClip = (k: string, c: Cell) => setClips((p) => ({ ...p, [k]: { ...p[k], ...c } }));
    const setCut = (k: string, c: Cell) => setCuts((p) => ({ ...p, [k]: { ...p[k], ...c } }));
    try {
      setPic(BASE, { st: 'pending' });
      const base = await until(key, { step: 'base', sp });
      setPic(BASE, { id: base.id, st: base.status, why: base.why });
      if (base.status !== 'ready' || !base.id) return;
      const src: Record<string, string> = { [BASE]: base.id };
      await pool<string>(muts, 2, async (m) => {
        setPic(m, { st: 'pending' });
        const v = await until(key, { step: 'variant', sp, mut: m });
        setPic(m, { id: v.id, st: v.status, why: v.why });
        if (v.status === 'ready' && v.id) src[m] = v.id;
      });
      const jobs = [BASE, ...muts].filter((m) => src[m]).flatMap((m) => moves.map((mv) => [m, mv] as const));
      await pool(jobs, 2, async ([m, mv]) => {
        const k = `${m}:${mv}`;
        setClip(k, { st: 'pending', src: src[m] });
        const c = await until(key, { step: 'clip', sp, mut: m, motion: mv, src: src[m] });
        setClip(k, { id: c.id, src: src[m], st: c.status, why: c.why });
        if (!cutOn || c.status !== 'ready' || !c.id || stop.current) return;
        setCut(k, { st: 'pending' });
        const x = await until(key, { step: 'cut', sp, mut: m, motion: mv, src: c.id });
        setCut(k, { id: x.id, alpha: x.alpha, st: x.status, why: x.why });
      });
    } catch { setErr('Mất kết nối giữa chừng. Những ảnh đã làm xong vẫn được giữ.'); }
    finally { setRunning(false); }
  }

  const plan = useMemo(() => info ? estimate({ model: info.model, seconds: info.seconds, editUsd: info.editUsd, variants: muts.length, motions: moves.length, cutModel: cutOn ? info.cutModel : undefined }) : null, [info, muts, moves, cutOn]);
  const over = !!info && !!plan && info.spent + plan.usd > info.cap;

  if (key === null) return null;
  if (!key) {
    return (
      <main className="zl">
        <h1>Linh Thú Viên · thử hoạt ảnh</h1>
        <form className="zl-panel" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) setKey(typed.trim()); }}>
          <p className="zl-note">Trang của chủ game: nhập ADMIN_KEY (cùng khóa với trang báo cáo). Trang này tốn tiền fal.</p>
          <input className="zl-in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="ADMIN_KEY" />
          <button className="zl-btn" type="submit">Mở</button>
          {err && <p className="zl-err">{err}</p>}
        </form>
      </main>
    );
  }

  const shown = [BASE, ...MUTATIONS.map((m) => m.id).filter((id) => muts.includes(id) || pics[id])];
  return (
    <main className="zl">
      <h1>Linh Thú Viên · thử hoạt ảnh</h1>
      <p className="zl-note">Vẽ biến thể dị biến từ ảnh gốc của loài, làm mỗi ảnh thành đoạn hoạt ảnh lặp, rồi tách nền để thú đi lại được trong cảnh. Ảnh đã có thì dùng lại, không tính tiền lần nữa. <a className="zl-link" href="/lab/linh-thu/vien">Chỗ đứng cố định (demo) →</a> · <a className="zl-link" href="/lab/linh-thu/canh">Cảnh thú đi lại →</a></p>

      <section className="zl-panel">
        <label className="zl-row">
          <span>Loài</span>
          <select className="zl-in" value={sp} onChange={(e) => setSp(e.target.value)} disabled={running}>
            {(info?.species || []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.isNew ? ' · mới' : ''}</option>)}
          </select>
        </label>
        <div className="zl-row"><span>Dị biến</span>
          <div className="zl-chips">{MUTATIONS.map((m) => <button key={m.id} type="button" className="zl-chip" aria-pressed={muts.includes(m.id)} disabled={running} onClick={() => setMuts((a) => flip(a, m.id))}>{m.name}</button>)}</div>
        </div>
        <div className="zl-row"><span>Chuyển động</span>
          <div className="zl-chips">{MOTIONS.map((m) => <button key={m.id} type="button" className="zl-chip" aria-pressed={moves.includes(m.id)} disabled={running} onClick={() => setMoves((a) => flip(a, m.id))}>{m.name}</button>)}</div>
        </div>
        <label className="zl-check"><input type="checkbox" checked={cutOn} disabled={running} onChange={(e) => setCutOn(e.target.checked)} /> Tách nền (thú trong suốt, để đặt vào cảnh)</label>
        {info && plan && (
          <p className="zl-note">
            Tối đa {plan.edits} ảnh biến thể + {plan.clips} đoạn {info.seconds} giây{cutOn ? ' (có tách nền)' : ''} ≈ <b>{usd(plan.usd)}</b>. Đã dùng {usd(info.spent)} / {usd(info.cap)}.
            {!info.enabled && ' fal chưa bật: cần FAL_KEY (IMAGE_PROVIDER=fal).'}
            {over && ' Vượt hạn mức, bớt dị biến hoặc chuyển động.'}
          </p>
        )}
        <div className="zl-actions">
          <button className="zl-btn" type="button" onClick={run} disabled={running || !info?.enabled || !sp || !moves.length || over}>{running ? 'Đang làm…' : 'Tạo'}</button>
          {running && <button className="zl-btn zl-ghost" type="button" onClick={() => { stop.current = true; }}>Dừng</button>}
        </div>
        {err && <p className="zl-err">{err}</p>}
      </section>

      <section className="zl-grid">
        {shown.map((id) => <Tile key={id} title={id === BASE ? 'Nguyên bản' : MUTATIONS.find((m) => m.id === id)!.name} pic={pics[id]}
          cells={Object.fromEntries(MOTIONS.map((mv) => [mv.id, clips[`${id}:${mv.id}`]]))} cuts={Object.fromEntries(MOTIONS.map((mv) => [mv.id, cuts[`${id}:${mv.id}`]]))} />)}
      </section>
    </main>
  );
}

function Tile({ title, pic, cells, cuts }: { title: string; pic?: Cell; cells: Record<string, Cell | undefined>; cuts: Record<string, Cell | undefined> }) {
  const [pick, setPick] = useState('');
  const [clear, setClear] = useState(false);   // show the cut-out on a checkerboard instead of the clip with its background
  const ready = MOTIONS.filter((m) => cells[m.id]?.st === 'ready');
  const cur = ready.find((m) => m.id === pick) || ready[0];
  const clip = cur ? cells[cur.id] : undefined;
  const cut = cur && cuts[cur.id]?.st === 'ready' && cuts[cur.id]?.alpha ? cuts[cur.id] : undefined;
  const still = pic?.id ? `/api/img/${pic.id}` : clip?.src ? `/api/img/${clip.src}` : '';
  const busy = pic?.st === 'pending';
  const showCut = clear && !!cut;
  return (
    <figure className="zl-tile">
      <div className={`zl-art ${showCut ? 'zl-checker' : ''}`}>
        {showCut ? <AlphaVideo rgb={`/api/lab/media/${cut!.id}`} alpha={`/api/lab/media/${cut!.alpha}`} />
          : clip?.id ? <LoopVideo src={`/api/lab/media/${clip.id}`} poster={still} label={title} />
          : still ? <img src={still} alt={title} loading="lazy" />
          : <div className="zl-empty">{busy ? 'Đang vẽ…' : pic && pic.st !== 'ready' ? (pic.why || WHY[pic.st] || 'Lỗi') : 'Chưa có'}</div>}
        {busy && still && <span className="zl-badge">Đang vẽ…</span>}
      </div>
      <figcaption>
        <b>{title}</b>
        <span className="zl-moves">
          {MOTIONS.map((m) => {
            const c = cells[m.id], x = cuts[m.id];
            if (!c) return null;
            const label = c.st === 'ready' ? m.name : c.st === 'pending' ? `${m.name} …` : `${m.name} ✕`;
            return <button key={m.id} type="button" className="zl-chip zl-sm" aria-pressed={cur?.id === m.id} disabled={c.st !== 'ready'} title={c.st === 'failed' || c.st === 'limited' ? c.why || WHY[c.st] : x?.st === 'failed' ? x.why : undefined} onClick={() => setPick(m.id)}>{label}{x?.st === 'pending' ? ' ✂…' : x?.st === 'failed' ? ' ✂✕' : ''}</button>;
          })}
        </span>
        {cur && <button type="button" className="zl-chip zl-sm" aria-pressed={showCut} disabled={!cut} onClick={() => setClear((v) => !v)}>{cut ? 'Xem bản trong suốt' : cuts[cur.id]?.st === 'pending' ? 'Đang tách nền…' : 'Chưa tách nền'}</button>}
      </figcaption>
    </figure>
  );
}
