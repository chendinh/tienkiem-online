'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouse } from 'react';
import { BASE, MUTATIONS } from '@/lib/anim';
import { BG, cleanPoints, frameOf, spotNeedUsd, spotsWith, room, tileRect, type Metrics, type Spot } from '@/lib/spots';
import { errText } from '@/lib/strings';
import { AlphaVideo } from './AlphaVideo';
import { Ambient, type Mark } from './Ambient';
import { LoopVideo } from './LoopVideo';

// Demo of the Linh Thú Viên: one background (Thanh Vân), four spots. Each spot is two exact points of the picture (where the feet stand, what the creature drinks / eats / watches),
// the same for every creature; the owner taps them on the picture (Chấm điểm). For each spot he picks a creature (and a mutation); the server draws it in the pose of the spot,
// cuts it out and measures it, makes a clip and cuts that out too. The page puts the cut-out on the stage so that its feet are on the first point and its mouth at the second.
const KEY = 'tutien-admin-key';
type St = 'pending' | 'ready' | 'failed' | 'limited' | 'disabled' | 'invalid';
interface Asset { id: string; kind: 'spotpic' | 'spotbox' | 'spotclip' | 'spotcut'; sp: string; mut: string; spot: string; src: string; url?: string; alpha?: string; alphaUrl?: string; m?: Metrics }
interface Usd { pic: number; box: number; clip: number; cut: number; bg: number }
interface Info { enabled: boolean; model: string; seconds: number; spent: number; cap: number; blob: { on: boolean; mb: number }; species: { id: string; name: string }[]; spots: Asset[]; spotUsd: Usd; bg: { id: string; url?: string; current: boolean } | null; points: Record<string, unknown> }
interface Pick { sp: string; mut: string }
type Answer = { status: St; id?: string; why?: string };
interface Shown { pic?: Asset; box?: Asset; clip?: Asset; cut?: Asset }

const WHY: Record<string, string> = { limited: 'Hết hạn mức của lab', disabled: 'fal chưa được bật', invalid: 'Yêu cầu không hợp lệ' };
const FOCUS: Record<Spot['kind'], string> = { drink: 'điểm uống nước', eat: 'điểm hái quả', rest: 'hướng nhìn', watch: 'hướng nhìn' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const usd = (x: number) => `$${x.toFixed(2)}`;
const pc = (n: number) => `${n}%`;
const mediaUrl = (id: string, url?: string) => url || `/api/lab/media/${id}`;

// A creature cut out of its picture, put at its place. Its videos play only while it is on the screen (nine videos at once are too many for a phone).
function Creature({ f, still, rgb, alpha, onFail }: { f: ReturnType<typeof frameOf>; still: string; rgb?: string; alpha?: string; onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(true), [ever, setEver] = useState(false), [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setEver(true); return; }
    const io = new IntersectionObserver(([e]) => { setSeen(e.isIntersecting); if (e.isIntersecting) setEver(true); }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const r = f.frame;
  return (
    <div ref={ref} className="zs-cr" style={{ left: pc(r.left), top: pc(r.top), width: pc(r.width), height: pc(r.height) }}>
      {!live && <img className="zs-cr-still" src={still} alt="" />}
      {rgb && alpha && ever && <AlphaVideo rgb={rgb} alpha={alpha} playing={seen} onFail={onFail} onDraw={live ? undefined : () => setLive(true)} />}
    </div>
  );
}

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
  const [pts, setPts] = useState<Record<string, unknown>>({});   // the owner's points (saved on the server at once)
  const [calib, setCalib] = useState(false);
  const [act, setAct] = useState<{ spot: string; pt: 'stand' | 'focus' }>({ spot: 'suoi', pt: 'stand' });
  const [broken, setBroken] = useState<Record<string, boolean>>({});   // a spot whose cut-out cannot be drawn on this device shows the plain tile instead
  const stop = useRef(false), ptsInit = useRef(false), stage = useRef<HTMLDivElement>(null);
  const spots = useMemo(() => spotsWith(pts), [pts]);

  useEffect(() => { try { setKey(sessionStorage.getItem(KEY) || ''); } catch { setKey(''); } }, []);
  const load = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/lab/anim?spots=1', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} setKey(''); setErr(errText('E_AUTH')); return; }
      if (!r.ok || !j.ok) { setErr(errText(String(j.code || 'E_SERVER'))); return; }
      try { sessionStorage.setItem(KEY, k); } catch {}
      setErr(''); setInfo(j as Info);
      if (!ptsInit.current) { ptsInit.current = true; setPts((j.points as Record<string, unknown>) || {}); }   // later answers must not undo a point just tapped
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

  // what exists at each spot for the creature picked there: the newest picture, and what was made from that picture
  const shown = useMemo(() => {
    const out: Record<string, Shown> = {};
    for (const s of spots) {
      const p = pick[s.id];
      if (!p || !info) { out[s.id] = {}; continue; }
      const mine = info.spots.filter((a) => a.spot === s.id && a.sp === p.sp && a.mut === p.mut);
      const last = (k: Asset['kind'], src?: string) => mine.filter((a) => a.kind === k && (!src || a.src === src)).slice(-1)[0];
      const pic = last('spotpic'), box = pic && last('spotbox', pic.id), clip = pic && last('spotclip', pic.id), cut = clip && last('spotcut', clip.id);
      out[s.id] = { pic, box, clip, cut };
    }
    return out;
  }, [pick, info, spots]);

  // where each creature stands on the stage, from its measured box and the spot's two points
  const placed = useMemo(() => {
    const out: Record<string, ReturnType<typeof frameOf>> = {};
    for (const s of spots) { const m = shown[s.id]?.box?.m; if (m) out[s.id] = frameOf(s, m); }
    return out;
  }, [spots, shown]);
  const marks = useMemo<Mark[]>(() => spots.flatMap((s): Mark[] => {
    const f = placed[s.id];
    if (!f) return [];
    return s.kind === 'drink' ? [{ kind: 'drink', x: f.nose.x, y: f.nose.y }] : s.kind === 'eat' ? [{ kind: 'eat', x: f.focus.x, y: f.focus.y }] : [];
  }), [spots, placed]);

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
    const jobs = spots.filter((s) => pick[s.id]?.sp);
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
          say(s.id, 'Vẽ thú vào tư thế của chỗ đứng…');
          const pic = await until(key, { step: 'spotpic', sp, mut, spot: s.id, src });
          if (pic.status !== 'ready' || !pic.id) { fail(s.id, pic); continue; }
          say(s.id, 'Tách thú khỏi nền và đo khung…');
          const box = await until(key, { step: 'spotbox', sp, mut, spot: s.id, src: pic.id });
          if (box.status !== 'ready') { fail(s.id, box); continue; }
          await load(key);   // from here the creature already stands at its place (a still)
          say(s.id, 'Làm hoạt ảnh (1–3 phút)…');
          const clip = await until(key, { step: 'spotclip', sp, mut, spot: s.id, src: pic.id });
          if (clip.status !== 'ready' || !clip.id) { fail(s.id, clip); continue; }
          say(s.id, 'Tách nền hoạt ảnh…');
          const cut = await until(key, { step: 'spotcut', sp, mut, spot: s.id, src: clip.id });
          if (cut.status !== 'ready') { fail(s.id, cut); continue; }
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

  // a tap on the picture while calibrating: the chosen point of the chosen spot goes there (saved at once; no money is spent)
  async function tap(e: ReactMouse) {
    const el = stage.current;
    if (!el || !key) return;
    const r = el.getBoundingClientRect(), x = Math.round(((e.clientX - r.left) / r.width) * BG.w), y = Math.round(((e.clientY - r.top) / r.height) * BG.h);
    const s = spots.find((z) => z.id === act.spot);
    if (!s) return;
    const next = cleanPoints({ stand: act.pt === 'stand' ? { x, y } : s.stand, focus: act.pt === 'focus' ? { x, y } : s.focus }, s.kind);
    if (!next) { setErr(s.kind === 'drink' ? 'Điểm này không dùng được: chân và mặt nước cần cách nhau ít nhất 40 px ngang.' : s.kind === 'eat' ? 'Điểm này không dùng được: quả cần cao hơn chân ít nhất 40 px.' : 'Điểm này không dùng được: hai điểm quá gần nhau hoặc chân quá sát mép trên.'); return; }
    setErr(''); setPts((o) => ({ ...o, [s.id]: next }));
    if (act.pt === 'stand') setAct({ spot: s.id, pt: 'focus' });
    try {
      const r2 = await fetch('/api/lab/anim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ step: 'points', spot: s.id, ...next }) });
      if (!r2.ok) setErr('Không lưu được điểm vừa chấm.');
    } catch { setErr('Không lưu được điểm vừa chấm.'); }
  }

  const missing = spots.filter((s) => pick[s.id]?.sp).map((s) => ({ s, sh: shown[s.id] || {} })).filter(({ sh }) => !sh.cut);
  const todo = missing.length;
  const plan = info ? Math.round(missing.reduce((t, { sh }) => t + spotNeedUsd(info.spotUsd, { pic: !!sh.pic, box: !!sh.box, clip: !!sh.clip, cut: !!sh.cut }), 0) * 100) / 100 : 0;
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
      <p className="zl-note">Mỗi chỗ đứng là hai điểm cố định trên tranh: nơi chân đặt xuống và điểm thú uống / hái / nhìn. Thú nào vào cũng được đặt theo hai điểm đó. <a className="zl-link" href="/lab/linh-thu">← Xưởng</a></p>

      <section className="zl-panel">
        {spots.map((s) => {
          const p = pick[s.id] || { sp: '', mut: BASE }, sh = shown[s.id] || {};
          const state = sh.cut ? 'Đã có hoạt ảnh tách nền' : sh.clip ? 'Có hoạt ảnh, chưa tách nền' : sh.box ? 'Đã đặt thú, chưa có hoạt ảnh' : sh.pic ? 'Có ảnh, chưa tách khỏi nền' : 'Chưa làm';
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
              {p.sp && <span className="zl-note">{note[s.id] || state}</span>}
            </div>
          );
        })}
        {info && (
          <p className="zl-note">
            Còn {todo} chỗ cần làm ≈ <b>{usd(plan)}</b> (mỗi chỗ đủ bước: {usd(info.spotUsd.pic)} vẽ + {usd(info.spotUsd.box)} tách ảnh + {usd(info.spotUsd.clip)} hoạt ảnh + {usd(info.spotUsd.cut)} tách hoạt ảnh). Đã dùng {usd(info.spent)} / {usd(info.cap)}.
            {!info.enabled && ' fal chưa bật: cần FAL_KEY (IMAGE_PROVIDER=fal).'}
            {over && ' Vượt hạn mức.'}
          </p>
        )}
        {info && <p className="zl-note">{info.blob.on ? `Video lưu ở Blob: đã dùng ${info.blob.mb} MB (gói Hobby có 1024 MB).` : 'Blob chưa bật (thiếu BLOB_READ_WRITE_TOKEN): video đang lưu trong database, mỗi lần xem tốn transfer Neon. Nên bật Blob trước khi thử nhiều.'}</p>}
        <div className="zl-row"><span>Điểm của chỗ đứng</span>
          <div className="zl-chips">
            <button type="button" className="zl-chip" aria-pressed={calib} onClick={() => setCalib((v) => !v)}>Chấm điểm trên tranh</button>
          </div>
        </div>
        {calib && (
          <div className="zl-row"><span>Chạm tranh để đặt</span>
            <div className="zl-chips">
              {spots.flatMap((s) => (['stand', 'focus'] as const).map((pt) => (
                <button key={`${s.id}-${pt}`} type="button" className="zl-chip" aria-pressed={act.spot === s.id && act.pt === pt} onClick={() => setAct({ spot: s.id, pt })}>
                  {s.name.split(' · ')[0]} · {pt === 'stand' ? 'chỗ chân đứng' : FOCUS[s.kind]} ({(pt === 'stand' ? s.stand : s.focus).x}, {(pt === 'stand' ? s.stand : s.focus).y})
                </button>
              )))}
            </div>
            <p className="zl-note">Chấm đỏ = chỗ chân đặt xuống, nên là nền đất, đá hoặc cỏ vững. Vòng xanh = mặt nước (hay quả, hay hướng nhìn). Khung vàng là chỗ thú được phép chiếm. Thú đã làm sẽ dời theo ngay khi bạn chấm; điểm được lưu liền, không tốn tiền.</p>
          </div>
        )}
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
        <div ref={stage} className="zs-stage" style={{ aspectRatio: `${BG.w} / ${BG.h}` }}>
          <img className="zs-bg" src={`/art/zones/${BG.id}.jpg`} alt="" />
          {info?.bg && <div className="zs-bgvid"><LoopVideo src={mediaUrl(info.bg.id, info.bg.url)} poster={`/art/zones/${BG.id}.jpg`} label="Nền chuyển động" /></div>}
          {fx && <Ambient layer="back" />}
          <div className="zs-fog zs-fog-b" aria-hidden="true"><div className="zl-mist zl-mist-b" /></div>
          {spots.map((s) => {
            const sh = shown[s.id] || {}, f = placed[s.id];
            if (f && sh.box && !broken[s.id]) {
              // the creature is cut out: only it is laid over the background (and its clip once that is cut out too), so no tile edge can show
              const cut = sh.cut && !broken[s.id] ? sh.cut : undefined;
              return (
                <Fragment key={s.id}>
                  <div className="zs-shadow" style={{ left: pc(f.shadow.left), top: pc(f.shadow.top), width: pc(f.shadow.width), height: pc(f.shadow.height) }} />
                  <Creature f={f} still={`/api/img/${sh.box.id}`} rgb={cut && mediaUrl(cut.id, cut.url)} alpha={cut?.alpha && mediaUrl(cut.alpha, cut.alphaUrl)} onFail={() => setBroken((b) => ({ ...b, [s.id]: true }))} />
                </Fragment>
              );
            }
            // not cut out yet (or this device cannot draw the cut-out): the plain window of the picture, with soft edges
            const poster = sh.pic ? `/api/img/${sh.pic.id}` : '', clip = sh.clip, r = tileRect(s);
            if (!poster && !clip) return null;
            return (
              <div key={s.id} className="zs-tile" style={{ left: pc(r.left), top: pc(r.top), width: pc(r.width), height: pc(r.height) }}>
                {clip ? <LoopVideo src={mediaUrl(clip.id, clip.url)} poster={poster} label={s.name} /> : <img src={poster} alt={s.name} />}
              </div>
            );
          })}
          <div className="zs-fog zs-fog-f" aria-hidden="true"><div className="zl-mist zl-mist-f" /></div>
          {fx && <Ambient layer="front" marks={marks} />}
          <div className="zs-rays" aria-hidden="true"><i /><i /></div>
          {calib && (
            <div className="zs-cal" onClick={tap}>
              {spots.map((s) => {
                const rm = room(s), on = act.spot === s.id;
                // the room a creature may fill: a drink spans feet to water, others are centred on the feet (the same rule as frameOf)
                const left = s.kind === 'drink' ? Math.min(s.stand.x, s.focus.x) : s.kind === 'eat' ? (s.focus.x >= s.stand.x ? s.focus.x - rm.w : s.focus.x) : s.stand.x - rm.w / 2;
                return (
                  <div key={s.id} className={`zs-cal-s${on ? ' on' : ''}`}>
                    <div className="zs-cal-room" style={{ left: pc((left / BG.w) * 100), top: pc(((s.stand.y - rm.h) / BG.h) * 100), width: pc((rm.w / BG.w) * 100), height: pc((rm.h / BG.h) * 100) }} />
                    <i className="zs-cal-stand" style={{ left: pc((s.stand.x / BG.w) * 100), top: pc((s.stand.y / BG.h) * 100) }} />
                    <i className="zs-cal-focus" style={{ left: pc((s.focus.x / BG.w) * 100), top: pc((s.focus.y / BG.h) * 100) }} />
                    <b className="zs-cal-name" style={{ left: pc((s.stand.x / BG.w) * 100), top: pc((s.stand.y / BG.h) * 100) }}>{s.name.split(' · ')[0]}</b>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
