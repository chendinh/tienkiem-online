'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as R from '@/lib/raid';
import * as P from '@/lib/raidplay';
import { DEMO_MAX, demoFighters, demoFilm, type Outcome } from '@/lib/raiddemo';
import { Icon } from '../ds/Icon';
import { ElIcon } from '../Icons';
import { useFx, type FxLevel } from '../fx/FxProvider';
import { RaidScene, type FilmView } from '../RaidScene';
import { Board, FullIcon, ResultCard, useFullStage } from '../Raid';

// Phó Bản, the demo stage (app/demo/pho-ban): pick a Dị Thú, how many cultivators and of what realm, the ending, and start a fight right now. The cultivators are made up
// in the browser the way the game makes characters, the fight is lib/raid.ts as the server fights it, and the film is the real stage (components/RaidScene.tsx).
// Nothing is stored, nobody is rewarded, the daily Phó Bản is not touched.
const COUNTS = [1, 6, 12, 30, 60, 150, 300];
const OUTCOMES: [Outcome, string][] = [['any', 'Tự nhiên'], ['win', 'Thắng'], ['flee', 'Trốn thoát']];
const LEVELS: [FxLevel, string][] = [['low', 'Thấp'], ['mid', 'Vừa'], ['high', 'Cao']];
const two = (n: number) => String(n).padStart(2, '0');
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${two(s % 60)}`; };
const newSeed = () => Math.floor(Math.random() * 1e9);
type FilmOut = FilmView & { reward: null; claimed: false };

export function RaidDemo() {
  const fx = useFx();
  const [bossId, setBossId] = useState(() => R.bossOfDay(R.raidDay(Date.now())).id);
  const [n, setN] = useState(30), [realm, setRealm] = useState(-1), [want, setWant] = useState<Outcome>('any');
  const [seed, setSeed] = useState(newSeed);
  const boss = R.BOSS(bossId);

  // the cultivators of the settings (made again a moment after the count stops moving: 300 of them take a few hundred ms on a phone)
  const [fs, setFs] = useState<R.Fighter[]>([]);
  const made = useRef('');   // the settings the cultivators on hand were made for (Khai chiến makes its own team: not made twice)
  useEffect(() => {
    const key = `${n}|${seed}|${realm}`;
    if (made.current === key) return;
    const t = setTimeout(() => { made.current = key; setFs(demoFighters(n, seed, realm)); }, made.current ? 220 : 0);
    return () => clearTimeout(t);
  }, [n, seed, realm]);
  const crowd = useMemo(() => fs.slice().sort((a, b) => b.power - a.power).slice(0, 60), [fs]);

  // the film
  const [film, setFilm] = useState<FilmOut | null>(null);
  const [mode, setMode] = useState<'lobby' | 'film' | 'result'>('lobby');
  const [play, setPlay] = useState<{ from: number; started: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const tl = useMemo(() => (film ? P.timelineOf(film.rounds, P.shownOf(film.fighters, -1)) : null), [film]);
  const { wrap, big, toggleBig } = useFullStage();
  const startFilm = useCallback((from: number) => { setPlay({ from, started: Date.now() }); setMode('film'); }, []);
  const go = () => {
    if (busy) return;
    setBusy(true);
    // a frame first, so the button shows it is working while the fight is computed
    setTimeout(() => {
      const s = newSeed(), team = demoFighters(n, s, realm);
      made.current = `${n}|${s}|${realm}`; setSeed(s); setFs(team);
      setFilm({ ...demoFilm(bossId, team, want, s), reward: null, claimed: false });
      setBusy(false); startFilm(0);
      // the button sits under the stage on a phone: bring the stage into view
      if (wrap.current && wrap.current.getBoundingClientRect().top < 0) wrap.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };
  const toLobby = () => { setMode('lobby'); setPlay(null); };
  // a hidden tab holds the timers back: on return the film jumps to where it should be
  useEffect(() => {
    if (mode !== 'film' || !play) return;
    let hiddenAt = 0;
    const vis = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 1500) setPlay((p) => (p ? { ...p, from: p.from + (Date.now() - p.started), started: Date.now() } : p));
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [mode, play]);

  useEffect(() => { if (!big) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [big]);

  const fboss = film ? R.BOSS(film.boss) : boss;
  const lvl = fx.level === 'off' ? 'low' : fx.level;
  return (
    <main className="rdDemo">
      <header className="rdDemoBar">
        <span className="winSeal"><Icon name="atk" size={20} /></span>
        <div><h1>Phó Bản · Demo</h1><small>Khai chiến lúc nào cũng được · không lưu, không thưởng</small></div>
        <a className="btn ghost sm" href="/">Về game</a>
      </header>
      <div className="raidInner">
        <div className={`raidStageWrap${big ? ' big' : ''}`} ref={wrap}>
          {film && play && mode === 'film'
            ? <RaidScene key={`${film.day}|${play.from}|${play.started}`} mode="film" boss={fboss} film={film} from={play.from} live={false} onEnd={() => { setMode('result'); setPlay(null); }} />
            : film && mode === 'result'
              ? <RaidScene key={`res|${film.day}|${seed}`} mode="film" boss={fboss} film={film} from={tl ? tl.total : 0} live={false} onEnd={() => {}} />
              : <RaidScene key={`lobby|${bossId}`} mode="lobby" boss={boss} crowd={crowd} meId={null} caption={busy ? 'Đang dàn trận…' : `${n} tu sĩ chờ lệnh khai chiến`} />}
          <div className="raidCtl">
            {mode === 'film' && play && tl && <button type="button" onClick={() => startFilm(tl.outro - 300)} title="Bỏ qua tới kết quả"><Icon name="next" size={16} /> Bỏ qua</button>}
            <button type="button" className="raidFull" onClick={() => void toggleBig()} aria-pressed={big} aria-label={big ? 'Thu nhỏ' : 'Toàn màn hình'} title={big ? 'Thu nhỏ (Esc)' : 'Toàn màn hình'}><FullIcon out={big} /></button>
          </div>
          {mode === 'result' && film && <ResultCard film={film} boss={fboss} onReplay={() => startFilm(0)} demo />}
        </div>

        <div className="raidSide">
          <section className="raidCard rdDemoSet" style={{ '--el': C.EL[boss.el]?.color } as CSSProperties}>
            <header><ElIcon el={boss.el} size={18} /><div><h3>{boss.name}</h3><small>{boss.title} · hệ {boss.el}</small></div>{mode !== 'lobby' && <button type="button" className="btn ghost sm" onClick={toLobby}>Về sảnh</button>}</header>

            <div className="rdDemoField">
              <span className="lbl">Dị Thú</span>
              <div className="rdDemoBosses" role="radiogroup" aria-label="Dị Thú">
                {R.BOSSES.map((b) => (
                  <button key={b.id} type="button" role="radio" aria-checked={b.id === bossId} className={b.id === bossId ? 'on' : ''} style={{ '--el': C.EL[b.el]?.color } as CSSProperties} onClick={() => { setBossId(b.id); toLobby(); }} title={b.name}>
                    <img src={R.raidArt(b.id, 'boss')} alt="" loading="lazy" decoding="async" style={{ objectPosition: `${b.at.x}% ${b.at.y}%` }} />
                    <span><ElIcon el={b.el} size={12} /> {b.name.split(' ').slice(-2).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rdDemoField">
              <span className="lbl">Số tu sĩ <b className="num">{n}</b></span>
              <input type="range" min={1} max={DEMO_MAX} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Số tu sĩ" style={{ '--pct': `${((n - 1) / (DEMO_MAX - 1)) * 100}%` } as CSSProperties} />
              <div className="rdDemoChips">{COUNTS.map((c) => <button key={c} type="button" className={c === n ? 'on' : ''} onClick={() => setN(c)}>{c}</button>)}</div>
            </div>

            <label className="rdDemoField">
              <span className="lbl">Cảnh giới</span>
              <select value={realm} onChange={(e) => setRealm(Number(e.target.value))}>
                <option value={-1}>Hỗn hợp (đa số cấp thấp)</option>
                {C.REALMS.map((r, i) => <option key={r} value={i}>{r}</option>)}
              </select>
            </label>

            <div className="rdDemoField">
              <span className="lbl">Kết cục</span>
              <div className="seg" role="radiogroup" aria-label="Kết cục">{OUTCOMES.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={want === k} className={want === k ? 'on' : ''} onClick={() => setWant(k)}>{t}</button>)}</div>
            </div>

            <div className="rdDemoField">
              <span className="lbl">Hiệu ứng <small>(dùng chung với game)</small></span>
              <div className="seg" role="radiogroup" aria-label="Mức hiệu ứng">{LEVELS.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={lvl === k} className={lvl === k ? 'on' : ''} onClick={() => fx.setLevel(k)}>{t}</button>)}</div>
            </div>

            <button type="button" className="btn big rdDemoGo" disabled={busy || !fs.length} onClick={go}><Icon name="atk" size={18} /> {busy ? 'Đang dàn trận…' : 'Khai chiến'}</button>
            {film && tl && <p className="hint">Trận vừa rồi: {film.fighters.length} tu sĩ · {film.rounds.length} hiệp · phim dài {mmss(tl.total)}. Bấm Khai chiến lần nữa là một đội và một trận mới.</p>}
          </section>

          {film && mode === 'result' && <Board film={film} myPid={null} sub="Demo" />}
        </div>
      </div>
    </main>
  );
}
