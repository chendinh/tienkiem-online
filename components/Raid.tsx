'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as R from '@/lib/raid';
import * as P from '@/lib/raidplay';
import * as L from '@/lib/raidloot';
import { levelOf, type Item } from '@/lib/game';
import { stackInfo } from '@/lib/goods';
import { raidGet, messageOf } from '@/lib/client/api';
import type { GS } from '@/lib/client/types';
import { Icon } from './ds/Icon';
import { ElIcon } from './Icons';
import { Img, fmt, ItemCard, ItemIcon } from './ui';
import { Cultivator, lookOf } from './Cultivator';
import { RaidScene, type FilmView } from './RaidScene';
import type { Act } from './Panels';
import { useCalm } from './ExpoScene';

// Phó Bản, its first kind: Trảm Dị Thú (one Dị Thú a day). A screen of its own over the game (like Công việc, components/Jobs.tsx), with an address (?pho-ban=1) so Back closes it and a reload comes back to it.
// The player only ticks "Tham gia". At the fight time the server fights once for everyone; this screen then plays the film of it (live, from the right moment, while it is
// still running; from the start afterwards), then shows who did what and the reward. The rules are in lib/raid.ts, the film in lib/raidplay.ts and components/RaidScene.tsx.
export const RAID_PARAM = 'pho-ban';
export const raidInUrl = (): boolean => typeof window !== 'undefined' && !!new URL(window.location.href).searchParams.get(RAID_PARAM);
let pushedUrl: string | null = null;
const urlWith = (on: boolean) => { const u = new URL(window.location.href); if (on) u.searchParams.set(RAID_PARAM, '1'); else u.searchParams.delete(RAID_PARAM); return u.toString(); };

interface Today { day: string; boss: string; at: number; status: string; joined: boolean; auto: boolean; all?: boolean; count: number; crowd: R.Fighter[]; loot?: L.LootDrop[] }
interface Claim { day: string; boss: string; win: boolean; reward: R.Reward }
type FilmOut = FilmView & { reward: R.Reward | null; claimed: boolean };
interface View { now: number; today: Today; film: FilmOut | null; claims: Claim[] }

const two = (n: number) => String(n).padStart(2, '0');
const left = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`; };
const hhmm = (ms: number) => { const d = new Date(ms + R.TZ_MS); return `${d.getUTCHours()}:${two(d.getUTCMinutes())}`; };   // Vietnam time
const dayName = (day: string) => { const [, m, d] = day.split('-'); return `${Number(d)}/${Number(m)}`; };
const goodsLine = (g: { key: string; qty: number }) => { const i = stackInfo(g.key); return i ? { name: i.name, art: i.art, qty: g.qty } : null; };
const asItem = (x: L.LootItem, k: number): Item => ({ ...x, id: -1 - k });   // a prize piece to show (it has no id until a save takes it)
const pct = (p: number) => (p >= 0.1 ? `${Math.round(p * 100)}%` : p >= 0.001 ? `${(p * 100).toFixed(1).replace('.', ',')}%` : '<0,1%');

export function RaidScreen({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const shut = useRef(onClose); shut.current = onClose;
  // the address: pushed when the screen opens (not when it was opened from the address); Back closes it
  useEffect(() => {
    if (!raidInUrl()) { const to = urlWith(true); window.history.pushState(null, '', to); pushedUrl = to; }
    const pop = () => { if (!raidInUrl()) { pushedUrl = null; shut.current(); } };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const close = useCallback(() => {
    if (pushedUrl && pushedUrl === window.location.href) { pushedUrl = null; window.history.back(); return; }
    pushedUrl = null; window.history.replaceState(null, '', urlWith(false)); shut.current();
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.modal')) close(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close]);
  useLayoutEffect(() => { const y = window.scrollY; return () => { requestAnimationFrame(() => window.scrollTo(0, y)); }; }, []);

  // ---- what the server says, and the server's clock (the countdown and the live film follow it, not the device's)
  const [v, setV] = useState<View | null>(null), [err, setErr] = useState('');
  const skew = useRef(0);
  const load = useCallback(async () => {
    const j = await raidGet();
    if (!j || !j.ok) { setErr(messageOf(j || { ok: false })); return; }
    skew.current = j.now - Date.now(); setErr('');
    setV({ now: j.now, today: j.today, film: j.film, claims: j.claims });
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 30000); return () => clearInterval(t); }, [load]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + skew.current), 1000); return () => clearInterval(t); }, []);
  // the fight time comes while the screen is open: ask again a moment later (the first request after it fights)
  useEffect(() => {
    if (!v || v.today.status !== 'open') return;
    const ms = v.today.at - (Date.now() + skew.current);
    if (ms < 0 || ms > 6 * 3600 * 1000) return;
    const t = setTimeout(() => void load(), ms + 1500);
    return () => clearTimeout(t);
  }, [v, load]);

  // ---- the stage: today's lobby, or a film (today's once fought; yesterday's when asked)
  const [mode, setMode] = useState<'lobby' | 'film' | 'result'>('lobby');
  const [play, setPlay] = useState<{ from: number; started: number; live: boolean } | null>(null);
  const filmDone = !!v && !!v.film && v.film.day === v.today.day;
  const tl = useMemo(() => (v && v.film ? P.timelineOf(v.film.rounds, P.shownOf(v.film.fighters, v.film.me)) : null), [v?.film?.day, v?.film?.me]);   // eslint-disable-line react-hooks/exhaustive-deps
  // a page that asks for calm (reduced motion, effects off) goes straight to the result: the film is all motion
  const calm = useCalm();
  const startFilm = useCallback((from: number, live: boolean) => { if (calm) { setMode('result'); return; } setPlay({ from, started: Date.now(), live }); setMode('film'); }, [calm]);
  // today's fight is done: play it (from the right moment while it is still running)
  const autoed = useRef('');
  useEffect(() => {
    if (!v || !v.film || !tl || !filmDone || autoed.current === v.film.day) return;
    autoed.current = v.film.day;
    const into = Date.now() + skew.current - v.film.at;
    if (into < tl.total) startFilm(Math.max(0, into), into > 2000); else setMode('result');
  }, [v, tl, filmDone, startFilm]);
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

  // ---- actions
  const [busy, setBusy] = useState(''), [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const run = async (type: string, payload: any = {}) => {
    setBusy(type); setMsg(null);
    const r = await act(type, payload);
    setBusy('');
    if (!r.ok) setMsg({ t: r.msg, ok: false });
    await load();
    return r;
  };

  const { wrap, big, toggleBig } = useFullStage();

  if (!v) return (
    <div className="jobsScreen raidScreen" role="dialog" aria-modal="true" aria-label="Phó Bản">
      <Bar close={close} sub="Đang mở…" />
      <div className="jobsScroll"><div className="jobsInner">{err ? <p className="hint bad">{err}</p> : <div className="jobsWait" aria-busy="true" />}</div></div>
    </div>
  );
  const t = v.today, boss = R.BOSS(t.boss), open = t.status === 'open' && now < t.at;
  const film = v.film, fboss = film ? R.BOSS(film.boss) : boss;
  const showFilm = (mode === 'film' || mode === 'result') && film;
  const myPid = film && film.me >= 0 ? film.fighters[film.me].pid : null;

  return (
    <div className={`jobsScreen raidScreen${big ? ' bigOn' : ''}`} role="dialog" aria-modal="true" aria-label="Phó Bản">
      <Bar close={close} sub={boss.name} />
      <div className="jobsScroll">
        <div className="raidInner">
          <div className={`raidStageWrap${big ? ' big' : ''}`} ref={wrap}>
            {showFilm && play && mode === 'film'
              ? <RaidScene key={`${film!.day}|${play.from}|${play.started}`} mode="film" boss={fboss} film={film!} from={play.from} live={play.live} onEnd={() => { setMode('result'); setPlay(null); }} />
              : showFilm && mode === 'result'
                ? <RaidScene key={`res|${film!.day}`} mode="film" boss={fboss} film={film!} from={tl ? tl.total : 0} live={false} onEnd={() => {}} />
                : <RaidScene mode="lobby" boss={boss} crowd={t.crowd} meId={t.joined ? (t.crowd[0]?.pid ?? null) : null} caption={open ? `Khai chiến sau ${left(t.at - now)}` : t.status === 'empty' ? 'Hôm nay không ai xuất chiến' : 'Đang khai chiến…'} />}
            <div className="raidCtl">
              {mode === 'film' && play && <button type="button" onClick={() => tl && startFilm(tl.outro - 300, false)} title="Bỏ qua tới kết quả"><Icon name="next" size={16} /> Bỏ qua</button>}
              <button type="button" className="raidFull" onClick={() => void toggleBig()} aria-pressed={big} aria-label={big ? 'Thu nhỏ' : 'Toàn màn hình'} title={big ? 'Thu nhỏ (Esc)' : 'Toàn màn hình'}><FullIcon out={big} /></button>
            </div>
            {mode === 'result' && film && <ResultCard film={film} boss={fboss} onReplay={() => startFilm(0, false)} />}
          </div>

          <div className="raidSide">
            {msg && <p className={`hint ${msg.ok ? '' : 'bad'}`} role="status">{msg.t}</p>}
            {/* today: sign up */}
            <section className="raidCard today" style={{ '--el': C.EL[boss.el]?.color } as CSSProperties}>
              <header>
                <ElIcon el={boss.el} size={18} />
                <div><h3>{boss.name}</h3><small>{boss.title} · hệ {boss.el}</small></div>
                {mode !== 'lobby' && <button type="button" className="btn ghost sm" onClick={() => { setMode('lobby'); setPlay(null); }}>Về sảnh</button>}
              </header>
              <p className="raidLore">{boss.line}</p>
              {open ? (
                <>
                  <div className="raidCount"><Icon name="clock" size={16} /> Khai chiến lúc <b>{hhmm(t.at)}</b> · còn <b className="num">{left(t.at - now)}</b></div>
                  {t.all
                    ? (
                      <div className="raidJoined">
                        <span className="seal" aria-hidden="true"><b>Đã</b><b>Ghi</b><b>Danh</b></span>
                        <span className="txt"><b>Mọi tu sĩ cùng xuất chiến</b><small>Đang thử nghiệm: ai cũng tự có mặt trên sân, không cần ghi danh. Tới giờ cứ ngồi xem.</small></span>
                      </div>
                    )
                    : t.joined
                    ? (
                      <div className="raidJoined">
                        <span className="seal" aria-hidden="true"><b>Đã</b><b>Ghi</b><b>Danh</b></span>
                        <span className="txt"><b>Đã ghi danh xuất chiến</b><small>Tu sĩ của ngươi đã có mặt trên sân. Tới giờ cứ ngồi xem.</small></span>
                        <button type="button" className="raidLeave" disabled={!!busy} onClick={() => void run('raid_leave')}>{busy === 'raid_leave' ? '…' : 'Rút tên'}</button>
                      </div>
                    )
                    : (
                      <button type="button" className="raidJoinBtn" disabled={!!busy} onClick={() => void run('raid_join')}>
                        <span className="ico" aria-hidden="true"><Icon name="atk" size={22} /></span>
                        <span className="txt"><b>{busy === 'raid_join' ? 'Đang ghi danh…' : 'Ghi danh xuất chiến'}</b><small>Một chạm. Tới giờ tu sĩ của ngươi tự bay ra đánh.</small></span>
                      </button>
                    )}
                  {!t.all && <button type="button" role="switch" aria-checked={t.auto} className={`raidSwitch${t.auto ? ' on' : ''}`} disabled={!!busy} onClick={() => void run('raid_auto', { on: !t.auto })}>
                    <span className="track" aria-hidden="true"><i /></span>
                    <span className="lbl">Tự tham gia mỗi ngày</span>
                  </button>}
                  <div className="raidCrowd"><Icon name="sparkle" size={14} /> <b>{t.count}</b> tu sĩ {t.all ? 'xuất chiến' : 'đã ghi danh'}{t.count > P.SHOWN_MAX ? ` (trên sân hiện ${P.SHOWN_MAX})` : ''}</div>
                </>
              ) : (
                <div className="raidCount">{t.status === 'empty' ? 'Hôm nay không ai ghi danh. Trận sau mở lúc 0:00.' : filmDone ? `Đã khai chiến lúc ${hhmm(t.at)} · ${film!.fighters.length} tu sĩ` : 'Đang khai chiến…'}</div>
              )}
              {film && !filmDone && mode === 'lobby' && (
                <button type="button" className="btn ghost raidReplay" onClick={() => startFilm(0, false)}><Icon name="play" size={15} /> Xem lại trận {dayName(film.day)}: {fboss.name} ({film.win ? 'thắng' : 'trốn thoát'})</button>
              )}
              {film && filmDone && mode === 'lobby' && <button type="button" className="btn raidReplay" onClick={() => startFilm(0, false)}><Icon name="play" size={15} /> Xem trận hôm nay</button>}
            </section>

            {/* the three Thiên pieces: what today's fight gives (before it), then who got them (once the film has reached its end, or from the lobby once fought) */}
            {film && film.loot && film.loot.length > 0 && (mode === 'result' || (mode === 'lobby' && filmDone))
              ? <LootWonCard film={film} myPid={myPid} />
              : t.loot && t.loot.length > 0 && <LootCard drops={t.loot} level={levelOf(st.player)} />}

            {/* rewards still to take */}
            {v.claims.map((c) => (
              <section key={c.day} className={`raidCard claim${c.win ? ' win' : ''}`}>
                <header><Icon name="chest" size={18} /><div><h3>Thưởng Trảm Dị Thú {dayName(c.day)}</h3><small>{R.BOSS(c.boss).name} · {c.win ? 'Đại thắng' : 'Dị Thú trốn thoát'} · hạng {c.reward.rank}</small></div></header>
                <RewardList r={c.reward} />
                <button type="button" className="btn primary" disabled={!!busy} onClick={() => void run('raid_claim', { day: c.day })}>{busy === 'raid_claim' ? 'Đang nhận…' : 'Nhận thưởng'}</button>
              </section>
            ))}

            {/* the board of the film on the stage */}
            {film && mode === 'result' && <Board film={film} myPid={myPid} />}
            <p className="hint raidRules">Mỗi ngày một Dị Thú. Ai ghi danh trước {R.FIGHT_HOUR}:00 (giờ Việt Nam) đều xuất chiến với chỉ số lúc đó. Kết quả do máy chủ đánh một lần cho mọi người; màn này chỉ chiếu lại. Thắng hay thua, ba món Thiên của trận đều có chủ: mỗi món bốc riêng, cơ hội của mỗi người bằng phần trăm sát thương người đó gây ra (gục giữa trận vẫn tính). Thắng còn có Linh Thạch, Khế Ước Phù, Hồi Khí Đan, nguyên liệu; ba người gây sát thương cao nhất có thể nhận Bí Kíp hệ {boss.el}. Thua vẫn có quà nhỏ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Full screen, like a video player: the stage alone, as big as the screen allows. The browser's own full screen where it exists; where it does not
// (an iPhone only lets a <video> go full screen) the stage covers the page itself. Esc, the button or the phone's Back leaves it.
export function useFullStage() {
  const wrap = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    const on = () => setBig(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    document.addEventListener('fullscreenchange', on); document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);
  const toggleBig = useCallback(async () => {
    const el = wrap.current as any, d = document as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) { await (d.exitFullscreen || d.webkitExitFullscreen)?.call(d)?.catch?.(() => {}); setBig(false); return; }
    if (big) { setBig(false); return; }
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    if (req) { try { await req.call(el, { navigationUI: 'hide' }); setBig(true); return; } catch { /* refused: cover the page instead */ } }
    setBig(true);
  }, [big]);
  useEffect(() => {
    if (!big) return;
    // Esc leaves full screen only (it must not also close the Phó Bản screen behind it)
    const key = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; e.stopImmediatePropagation(); const d = document as any; if (d.fullscreenElement || d.webkitFullscreenElement) void (d.exitFullscreen || d.webkitExitFullscreen)?.call(d)?.catch?.(() => {}); setBig(false); };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [big]);
  return { wrap, big, toggleBig };
}

function Bar({ close, sub }: { close: () => void; sub: string }) {
  return (
    <header className="jobsBar">
      <button type="button" className="jobsBack" onClick={close} aria-label="Quay lại hành trình" title="Quay lại hành trình (Esc)"><Icon name="back" size={20} /></button>
      <span className="winSeal"><Icon name="atk" size={20} /></span>
      <div className="jobsTitle"><h2>Phó Bản</h2><small>Trảm Dị Thú · {sub}</small></div>
    </header>
  );
}

function RewardList({ r }: { r: R.Reward }) {
  return (
    <ul className="raidReward">
      {(r.items || []).map((x, k) => <li key={`it${k}`} className="thien"><span className="pic"><ItemIcon it={asItem(x, k)} size={26} zoom /></span><b>{x.name}</b><small>Thiên · Lv{x.level}</small></li>)}
      <li><Icon name="stone" size={16} /><b>{fmt(r.stones)}</b><small>Linh Thạch</small></li>
      {r.goods.map((g) => { const x = goodsLine(g); return x && <li key={g.key}><Img src={x.art} className="ico" fb={<Icon name="sparkle" size={16} />} /><b>×{g.qty}</b><small>{x.name}</small></li>; })}
    </ul>
  );
}

export function ResultCard({ film, boss, onReplay, demo }: { film: FilmOut; boss: R.Boss; onReplay: () => void; demo?: boolean }) {
  const mine = film.me >= 0, total = film.dmg.reduce((a, b) => a + b, 0) || 1;
  const rank = mine ? film.fighters.map((_, i) => i).sort((a, b) => film.dmg[b] - film.dmg[a]).indexOf(film.me) + 1 : 0;
  const mvp = film.fighters[film.mvp];
  return (
    <div className={`raidResult ${film.win ? 'win' : 'flee'}`}>
      <h3>{film.win ? 'Đại thắng' : 'Dị Thú trốn thoát'}</h3>
      <p>{film.win ? `${boss.name} đã bị ${film.fighters.length} tu sĩ trảm sau ${film.rounds.length} hiệp.` : `${boss.name} bỏ chạy sau ${film.rounds.length} hiệp, còn ${Math.round(((film.rounds[film.rounds.length - 1]?.hp || 0) / film.max) * 100)}% Sinh Lực.`}</p>
      {film.loot && film.loot.length > 0 && (
        <>
        <small className="raidLootLbl">Thiên Bảo về tay</small>
        <div className="raidLootStrip" aria-label="Ba món Thiên đã có chủ">
          {film.loot.map((w) => { const f = film.fighters[w.to]; return f && (
            <span key={w.k} className={w.to === film.me ? 'me' : ''} title={`${w.item.name} → ${f.name}`}>
              <span className="pic"><ItemIcon it={asItem(w.item, w.k)} size="fit" /></span>
              <b>{w.to === film.me ? 'Ngươi' : f.name}</b>
            </span>
          ); })}
        </div>
        </>
      )}
      {mvp && film.fighters.length > 1 && <div className="raidMvp"><span className="fig"><Cultivator look={lookOf(mvp.arch, mvp.g, mvp.hair, mvp.cls)} /></span><span><small>Công đầu</small><b>{mvp.name}</b><em>{fmt(film.dmg[film.mvp])} sát thương</em></span></div>}
      {demo ? null : mine
        ? <div className="raidMine"><span>Ngươi: hạng <b>{rank}</b>/{film.fighters.length} · {fmt(film.dmg[film.me])} sát thương ({Math.round((film.dmg[film.me] / total) * 100)}%){film.ko[film.me] ? ` · trọng thương ở hiệp ${film.ko[film.me]}` : ''}</span>{film.reward && <RewardList r={film.reward} />}{film.reward && film.claimed && <small className="ok">Đã nhận thưởng</small>}</div>
        : <div className="raidMine"><span>Ngươi không tham gia trận này.</span></div>}
      <button type="button" className="btn ghost" onClick={onReplay}><Icon name="play" size={15} /> Xem lại</button>
    </div>
  );
}

// Before the fight: the three pieces it gives, shown at the viewer's own level (a piece is made at its winner's level). A tap opens a piece's numbers.
export function LootCard({ drops, level }: { drops: L.LootDrop[]; level: number }) {
  const items = useMemo(() => drops.map((d, k) => asItem(L.lootItem(d, level), k)), [drops, level]);
  const [sel, setSel] = useState<number | null>(null);
  return (
    <section className="raidCard loot">
      <header><span className="lootSeal" aria-hidden="true"><Icon name="chest" size={18} /></span><div><h3>Thiên Bảo hôm nay</h3><small>{items.length} món Thiên · thắng hay thua đều chia</small></div></header>
      <div className="raidLoot">
        {items.map((it, k) => (
          <button key={k} type="button" className={`lootTile${sel === k ? ' on' : ''}`} style={{ '--el': C.EL[it.el]?.color } as CSSProperties} onClick={() => setSel(sel === k ? null : k)} aria-pressed={sel === k} aria-label={`${it.name}, xem chỉ số`}>
            <span className="pic"><ItemIcon it={it} size="fit" /><i className="glint" aria-hidden="true" /></span>
            <b>{it.name}</b>
            <small>{C.SLOT_VI[it.slot]} · <Icon name="atk" size={11} /> {fmt(it.power)}</small>
          </button>
        ))}
      </div>
      {sel !== null && items[sel] && <div className="lootOpen"><ItemCard it={items[sel]} /><small>Chỉ số theo cấp của ngươi (Lv{level}). Món về tay ai thì làm theo cấp người đó.</small></div>}
      <p className="lootNote">Mỗi món bốc riêng: ngươi gây bao nhiêu phần trăm tổng sát thương thì có bấy nhiêu phần trăm cơ hội nhận mỗi món. Gục giữa trận vẫn được tính, miễn đã ra đòn.</p>
    </section>
  );
}

// After the fight, for everyone: which piece went to whom, and with what chance.
export function LootWonCard({ film, myPid }: { film: FilmOut; myPid: string | null }) {
  const won = film.loot || [];
  const [sel, setSel] = useState<number | null>(null);
  return (
    <section className="raidCard loot done">
      <header><span className="lootSeal" aria-hidden="true"><Icon name="chest" size={18} /></span><div><h3>Thiên Bảo đã có chủ</h3><small>Trận {dayName(film.day)} · bốc theo % sát thương</small></div></header>
      <ul className="raidLootWon">
        {won.map((w) => {
          const f = film.fighters[w.to]; if (!f) return null;
          const it = asItem(w.item, w.k), mine = f.pid === myPid;
          return (
            <li key={w.k} className={`${mine ? 'me' : ''}${sel === w.k ? ' on' : ''}`}>
              <button type="button" onClick={() => setSel(sel === w.k ? null : w.k)} aria-pressed={sel === w.k} aria-label={`${it.name}, xem chỉ số`}>
                <span className="pic"><ItemIcon it={it} size="fit" /></span>
                <span className="nm"><b>{it.name}</b><small>{C.SLOT_VI[it.slot]} · Lv{it.level} · <Icon name="atk" size={11} /> {fmt(it.power)}</small></span>
              </button>
              <span className="who">
                <span className="fig"><Cultivator look={lookOf(f.arch, f.g, f.hair, f.cls)} /></span>
                <span><b>{mine ? 'Ngươi' : f.name}</b><small>{pct(w.p)} cơ hội{film.ko[w.to] ? ' · đã gục' : ''}</small></span>
              </span>
              {sel === w.k && <div className="lootOpen"><ItemCard it={it} /></div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Board({ film, myPid, sub }: { film: FilmOut; myPid: string | null; sub?: string }) {
  const order = film.fighters.map((_, i) => i).sort((a, b) => film.dmg[b] - film.dmg[a]);
  const top = order.slice(0, 20), meAt = order.findIndex((i) => film.fighters[i].pid === myPid);
  const max = film.dmg[order[0]] || 1;
  const row = (i: number, k: number) => {
    const f = film.fighters[i];
    return (
      <li key={f.pid} className={f.pid === myPid ? 'me' : ''}>
        <span className="rk">{k + 1}</span>
        <span className="fig"><Cultivator look={lookOf(f.arch, f.g, f.hair, f.cls)} /></span>
        <span className="nm"><b>{f.name}</b><small>Cấp {f.level} · {f.el}{film.ko[i] ? ` · gục hiệp ${film.ko[i]}` : ''}</small></span>
        <span className="dm"><b>{fmt(film.dmg[i])}</b><i style={{ width: `${(film.dmg[i] / max) * 100}%` }} /></span>
      </li>
    );
  };
  return (
    <section className="raidCard board">
      <header><Icon name="crown" size={18} /><div><h3>Bảng sát thương</h3><small>{film.fighters.length} tu sĩ · {sub ?? dayName(film.day)}</small></div></header>
      <ol className="raidBoard">{top.map(row)}{meAt >= 20 && row(order[meAt], meAt)}</ol>
    </section>
  );
}

// The full-screen sign of a video player: four corners pointing out (or in, to leave).
export function FullIcon({ out }: { out: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {out
        ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}
