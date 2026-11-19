'use client';
import { ModalClose, XSeal } from './ds/ModalClose';
import { Toast, toast, askConfirm } from './ds/Dialog';
import { addPasskey, passkeySupported, PASSKEY_UNSUPPORTED } from '@/lib/client/passkey';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as D from '@/lib/daily';
import * as A from '@/lib/arts';
import { type FeedEntry, pstats, levelOf, threshold, outfitTier, auraElement, atBottleneck, SP } from '@/lib/game';
import type { GS } from '@/lib/client/types';
import { authMe, authPost, gameGet, gameAct, watchNet, type AuthUser } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { BALANCE } from '@/lib/balance';
import { AuthScreen, LinkEmailModal } from './Auth';
import { RankingModal } from './Ranking';
import { NightMarketModal } from './NightMarket';
import { DailyModal } from './Daily';
import { MarketModal, AlchemyModal, Window, DaoModal, TitleModal, PurityModal, SettingsModal, OddsModal, ReportModal, ZoneModal, BreakModal, DecisionBar, PenPanel, type Act, type ActRes } from './Panels';
import { avatarBaseSpec, poseSpec, outfitSpec, equipSig, PLAIN_SIG, ART_V } from '@/lib/avatarSpec';
import { useGenImage } from '@/lib/useGenImage';
import lore from '@/content/lore.json';
import { Img, GenImg, ItemCard, BeastArt, SizeMeter, Bar, ElChip, GenCtx, ZoomProvider, useZoom, fmt } from './ui';
import { ArtsPanel } from './Arts';
import { EquipPanel, ItemPopup, useEquip, type Eqx } from './Equip';
import { Logo, Lockup } from './Logo';
import { ElIcon } from './Icons';
import { BattleLog, battleSummary } from './Battle';
import * as G from '@/lib/game';
import { PURE_INTENTS, decideIsPure } from '@/lib/intents';
import { LoadingNote } from './LoadingNote';
import { BattleStage } from './BattleStage';
import { Icon } from './ds/Icon';
import { Seg, Tabs } from './ds/Seg';
import { ItemAlbum, MutAlbum } from './Collection';
import { Popover } from './ds/Popover';
import { Atmosphere } from './fx/Atmosphere';
import { QiWidget } from './fx/QiWidget';
import { useFx } from './fx/FxProvider';
import { useCue } from './fx/Cue';
import { useTilt } from './fx/useTilt';
import { MusicOrb } from './audio/MusicOrb';
import { Credits } from './Credits';

const POLL_MS = Math.min(BALANCE.onlinePollSec * 1000, 5000);   // never slower than Online_Poll_Interval
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A fight log is up to 56 cards. It is built only when the player opens it, and a row is drawn again only when its entry changes (the whole feed is replaced by a new copy at every poll).
function FightLog({ log, foe, summary }: { log: string[]; foe: string; summary: string }) {
  const [open, setOpen] = useState(false);
  return <details className="flog" onToggle={(ev) => setOpen((ev.currentTarget as HTMLDetailsElement).open)}><summary><span className="flogGo"><Icon name="atk" size={15} /> Xem diễn biến</span><small>{summary}</small></summary>{open && <BattleLog log={log} foe={foe} />}</details>;
}
const FeedRow = memo(FeedRowInner, (a, b) => a.e.id === b.e.id && a.e.text === b.e.text && !!a.e.log === !!b.e.log);
function FeedRowInner({ e }: { e: FeedEntry }) {
  if (e.beast) {
    const b = e.beast, sp = SP(b.sp);
    return (
      <div className={`feedRow monster ${e.outcome}`}>
        <BeastArt b={b} box={96} />
        <div className="fbody">
          <div className="fname">
            {b.mut && <em className="mutBadge">✦ Dị Biến</em>} {b.name} <small>Lv{b.level}</small>
            <span className={`out ${e.outcome}`}>{e.kind === 'tame' ? (e.outcome === 'win' ? 'Thu phục' : 'Thất bại') : e.outcome === 'win' ? 'Thắng' : e.outcome === 'lose' ? 'Bại' : 'Hòa'}</span>
          </div>
          {e.kind === 'tame' && e.text && <div>{e.text}</div>}
          <div className="chips">
            <ElChip el={sp.el[0]} />
            <span className="chip">{C.PERS[b.pers].n}</span>
            {e.chips?.map((c, i) => <span key={i} className="chip gold">{c}</span>)}
          </div>
          <SizeMeter b={b} />
        </div>
        {/* outside the text column: the button and the chronicle use the whole width of the row, under the picture and the text */}
        {e.log && e.log.length > 0 && <FightLog log={e.log} foe={b.name} summary={battleSummary(e.log, b.name)} />}
      </div>
    );
  }
  const icon: Record<string, string> = { story: 'book', level: 'rise', break: 'bolt', event: 'sparkle', resource: 'lotus', book: 'book', item: 'stone', equip: 'robe', system: 'taiji' };
  return (
    <div className={`feedRow plain ${e.kind}`} style={e.item ? ({ '--rail': C.RCOLOR[e.item.tier] } as CSSProperties) : undefined}>
      <div className="ficon"><Icon name={icon[e.kind] || 'sparkle'} size={19} /></div>
      <div className="fbody">
        <div>{e.text}</div>
        {e.item && <ItemCard it={e.item} compact />}
        {e.chips && e.chips.length > 0 && <div className="chips">{e.chips.map((c, i) => <span key={i} className="chip gold">{c}</span>)}</div>}
      </div>
    </div>
  );
}

// A copy the instant actions may edit: everything they touch is copied (the bag, the worn items, the pen, the stocks, the settings, the journey), the rest is shared.
// `pend` (what the engine counts for the report) is not sent to the browser, but the rules still write to it.
const forkState = (st: GS): GS => ({
  ...st, bag: st.bag.map((x) => ({ ...x })), stash: st.stash.map((x) => ({ ...x })), eq: Object.fromEntries(Object.entries(st.eq).map(([k, v]) => [k, v ? { ...v } : v])) as GS['eq'],
  player: { ...st.player }, beasts: [...st.beasts], inv: structuredClone(st.inv), set: structuredClone(st.set), arts: structuredClone(st.arts), feed: [...st.feed], pend: {},
} as GS);

function ZoomBridge({ r }: { r: { current: ((z: any) => void) | null } }) { r.current = useZoom(); return null; }

function Intro({ onPick, onCredits }: { onPick: (g?: 'f' | 'm') => void; onCredits: () => void }) {
  return (
    <div className="intro">
      <div className="intro-corner"><MusicOrb onCredits={onCredits} /></div>
      <div className="introBody">
        <Lockup width={540} className="introLockup" />
        <h2>Khai Mở Đạo Đồ</h2>
        <p>Chọn thân phận. Linh Căn, Tính Cách, Xuất Thân và diện mạo chi tiết do Thiên Đạo ngẫu nhiên định đoạt.</p>
        <div className="introPick">
          <button onClick={() => onPick('f')}><Img src={C.introArt('f')} fb="♀" /><span>Nữ tu</span></button>
          <button onClick={() => onPick('m')}><Img src={C.introArt('m')} fb="♂" /><span>Nam tu</span></button>
        </div>
        <button className="btn" onClick={() => onPick()}>Để Thiên Đạo quyết định</button>
        <div className="intro-note">Nhạc nền sẽ vang lên khi bạn chạm vào màn hình. Tắt hoặc chỉnh âm lượng ở nút tròn phía trên bên phải.</div>
      </div>
    </div>
  );
}

// Temporarily locked to cut picture costs (demo phase over): the button that redraws the character in the worn equipment stays in place but disabled, and the "Trang bị đã đổi"
// tag is hidden. The base picture and the standing pose are still drawn automatically for a new account. Set to true to bring both back to work.
const OUTFIT_DRAW = false;
const WHY: Record<string, string> = { limited: 'Đã chạm giới hạn ảnh AI (ngân sách hoặc số lượt mỗi giờ).', failed: 'Vẽ không thành. Thử lại sau ít phút.', disabled: 'Ảnh AI đang tắt.' };

// Portrait, for looking at only (the equipment slots live in the Trang bị tab, not on the picture). The base picture (plain robe, empty hands)
// is drawn once per character, then the standing pose (an edit of the base, drawn automatically). After that the picture only changes when
// the player presses the button: the AI redraws the SAME person, in the same pose, wearing what is equipped right now.
function Hero({ st, tier, aura, on, offWhy, save, re, onBio }: { st: GS; tier: number; aura: string; on: boolean; offWhy: string; save: () => void; re: () => void; onBio: () => void }) {
  const p = st.player, av = p.avatar, zoom = useZoom();
  const heroRef = useRef<HTMLDivElement>(null); useTilt(heroRef);
  const cue = useCue();
  const sig = equipSig(st);
  const [baseTry, setBaseTry] = useState(0);
  const [poseTry, setPoseTry] = useState(0);
  const [want, setWant] = useState<{ spec: any; sig: string; n: number } | null>(null);
  const [msg, setMsg] = useState('');
  const breaks = useRef(0);

  const needBase = on && !av?.base;
  const base = useGenImage(needBase ? avatarBaseSpec(st) : null, 0, baseTry);
  useEffect(() => {
    if (needBase && base.url) { p.avatar = { base: base.url, url: base.url, sig: PLAIN_SIG, crop: base.crop, art: ART_V }; save(); re(); }
  }, [needBase, base.url]);

  // A character drawn under an older art direction (the base picture decides the style AND the body) is redrawn in three steps:
  // a new base picture, its standing pose, then the outfit made from the pose. The old picture stays on screen until the new one is ready.
  // `n` is a fresh key each time, so the browser never answers with a picture it already has from before.
  const [restyle, setRestyle] = useState<{ n: number; stage: 'base' | 'pose' } | null>(null);

  // The standing pose is drawn automatically right after the base (an edit of it, about 0,07 USD) and replaces the plain picture when that is
  // what is shown. A character from an older art direction does not get one here: it is offered the full redraw below instead.
  const needPose = on && !!av?.base && !av.pose && (av.art ?? 0) >= ART_V && !restyle;
  const pose = useGenImage(needPose ? poseSpec(st) : null, 0, poseTry);
  useEffect(() => {
    const a = p.avatar;
    if (!needPose || !pose.url || !a) return;
    p.avatar = { ...a, pose: pose.url, ...(a.sig === PLAIN_SIG ? { url: pose.url, crop: pose.crop } : {}) };
    save(); re();
  }, [needPose, pose.url]);
  const posing = needPose && pose.status === 'pending';

  const out = useGenImage(want ? want.spec : null, 0, want ? want.n : 0);
  useEffect(() => {
    if (!want) return;
    if (out.url) { p.avatar = { ...p.avatar, base: p.avatar?.base || out.url, url: out.url, sig: want.sig, crop: out.crop }; save(); setWant(null); re(); cue.redrawn(); }
    else if (out.status === 'failed' || out.status === 'limited' || out.status === 'disabled') { setMsg(WHY[out.status]); setWant(null); }
  }, [want, out.url, out.status]);

  // "Another version" of the standing pose (the button when nothing visible is worn and the pose is already on screen): a new `v` changes the
  // seed, so the server draws a new picture instead of answering with the cached one. Outfit pictures made from the old pose stay valid.
  const [roll, setRoll] = useState<{ v: number; n: number } | null>(null);
  const rolled = useGenImage(roll ? poseSpec(st, roll.v) : null, 0, roll ? roll.n : 0);
  useEffect(() => {
    if (!roll) return;
    const a = p.avatar;
    if (rolled.url && a) { p.avatar = { ...a, pose: rolled.url, ...(a.sig === PLAIN_SIG ? { url: rolled.url, crop: rolled.crop } : {}) }; save(); setRoll(null); re(); cue.redrawn(); }
    else if (rolled.status === 'failed' || rolled.status === 'limited' || rolled.status === 'disabled') { setMsg(WHY[rolled.status]); setRoll(null); }
  }, [roll, rolled.url, rolled.status]);

  const redo = useGenImage(restyle && restyle.stage === 'base' ? avatarBaseSpec(st) : null, 0, restyle ? restyle.n : 0);
  const redoPose = useGenImage(restyle && restyle.stage === 'pose' ? poseSpec(st) : null, 0, restyle ? restyle.n : 0);
  useEffect(() => {
    if (!restyle) return;
    const r = restyle.stage === 'base' ? redo : redoPose;
    if (r.url) {
      if (restyle.stage === 'base') {
        // the new base replaces everything (the old pose belonged to the old base); the pose is drawn from it next
        p.avatar = { base: r.url, url: r.url, sig: PLAIN_SIG, crop: r.crop, art: ART_V };
        save(); setRestyle({ n: restyle.n, stage: 'pose' }); re();
      } else {
        p.avatar = { ...p.avatar, pose: r.url, url: r.url, sig: PLAIN_SIG, crop: r.crop, art: ART_V };
        save(); setRestyle(null); re();
        if (C.VISIBLE.some((s) => st.eq[s])) setWant({ spec: outfitSpec(st), sig: equipSig(st), n: Date.now() });
      }
    } else if (r.status === 'failed' || r.status === 'limited' || r.status === 'disabled') { setMsg(WHY[r.status]); setRestyle(null); }
  }, [restyle, redo.url, redo.status, redoPose.url, redoPose.status]);

  // The saved picture can disappear (for example data/gen was wiped): fall back to the standing pose, then the base, or draw the base again.
  // A pose that is gone is cleared so it is drawn again from the base.
  const broken = () => {
    if (!p.avatar || ++breaks.current > 3) return;
    const a = p.avatar;
    if (a.url && a.url !== a.base && a.url !== a.pose && a.pose) p.avatar = { ...a, url: a.pose, sig: PLAIN_SIG };
    else if (a.url && a.url !== a.base) p.avatar = { ...a, ...(a.url === a.pose ? { pose: undefined } : {}), url: a.base, sig: PLAIN_SIG };
    else { p.avatar = undefined; setBaseTry((n) => n + 1); }
    save(); re();
  };

  const hasPic = !!av?.url;
  const changed = hasPic && av!.sig !== sig;
  const drawing = !!want || !!restyle || !!roll || posing;
  const oldArt = hasPic && (av!.art ?? 0) < ART_V;
  // The button is never switched off by a cooldown or by "already matching": whenever the AI is on and nothing is being drawn it draws again
  // (another version of the same picture), so a picture the player does not like can be redrawn at once.
  const canDraw = on && hasPic && !drawing;
  const plainPose = sig === PLAIN_SIG && !!av?.pose;  // nothing visible is worn: the picture is the standing pose itself
  const doRestyle = () => { if (on && hasPic && !drawing) { setMsg(''); setRestyle({ n: Date.now(), stage: 'base' }); } };
  const redoCost = C.VISIBLE.some((s) => st.eq[s]) ? '0,19' : '0,12';  // base 0,05 + pose 0,07 (+ outfit 0,07)
  const worn = C.VISIBLE.map((s) => st.eq[s]?.name).filter(Boolean).join(', ');
  const anotherV = () => 1 + Math.floor(Math.random() * 999998);
  const draw = () => {
    if (!canDraw) return;
    setMsg('');
    // nothing worn and no pose yet (it failed): there is no other version to draw, so try the pose again
    if (sig === PLAIN_SIG && !av!.pose) { if (needPose) setPoseTry((n) => n + 1); return; }
    if (plainPose) {
      // first press: back to the standing pose (nothing to draw, nothing to pay). When it is already shown: draw the pose again.
      if (av!.url !== av!.pose) { p.avatar = { ...av!, url: av!.pose, sig: PLAIN_SIG }; save(); re(); return; }
      setRoll({ v: anotherV(), n: Date.now() });
      return;
    }
    // the picture shows other equipment: draw what is worn now (a set drawn before is served from the cache); it already matches: another version
    setWant({ spec: changed ? outfitSpec(st) : outfitSpec(st, anotherV()), sig, n: Date.now() });
  };
  const label = drawing ? 'Đang vẽ…' : changed || !hasPic ? 'Vẽ lại theo trang bị' : 'Vẽ bản khác';
  const tip = !on ? offWhy : changed && plainPose ? 'Quay về ảnh tư thế đứng (không tốn tiền)' : changed ? `Vẽ nhân vật mặc: ${worn || 'chưa mặc món nào nhìn thấy được'}` : plainPose ? 'Vẽ lại tư thế đứng, ra một bản khác (khoảng 0,07 USD)' : 'Vẽ lại với cùng trang bị, ra một bản khác (khoảng 0,07 USD)';
  const baseWhy = base.status === 'failed' || base.status === 'limited' || base.status === 'disabled' ? WHY[base.status] : '';

  return (
    <>
      <div ref={heroRef} className={`hero tier${tier}`} style={{ '--aura': C.EL[aura].color, '--rc': C.RCOLOR[tier] } as CSSProperties}>
        <div className="halo" />
        {hasPic
          ? <div className="heroZoom zoomable" role="button" tabIndex={0} title="Bấm để xem ảnh lớn" onClick={() => zoom({ kind: 'avatar', src: av!.url!, name: p.name, sub: `${p.dao ? p.dao + ' · ' : ''}${C.REALMS[p.realm]} · ${C.SUBS[p.sub]}`, crop: av!.crop })} onKeyDown={(e) => { if (e.key === 'Enter') zoom({ kind: 'avatar', src: av!.url!, name: p.name, crop: av!.crop }); }}><Img key={av!.url} src={av!.url} className="heroImg genimg" style={av!.crop ? { height: `${100 / (1 - av!.crop)}%` } : undefined} fb={<Logo size={64} />} onBad={broken} /></div>
          : <div className="heroPh"><Logo size={72} /><span>{!on ? offWhy : baseWhy || 'AI đang vẽ nhân vật…'}</span>{on && base.status === 'failed' && <button className="btn" onClick={() => setBaseTry((n) => n + 1)}>Thử lại</button>}</div>}
        {drawing && <div className="aiTag busy">{restyle ? (restyle.stage === 'base' ? 'AI đang vẽ lại nhân vật (ảnh gốc mới)…' : 'AI đang vẽ tư thế đứng…') : posing || roll ? 'AI đang vẽ tư thế đứng…' : 'AI đang vẽ theo trang bị…'}</div>}
        {!drawing && !hasPic && on && base.status === 'pending' && <div className="aiTag busy">AI đang vẽ nhân vật…</div>}
        {OUTFIT_DRAW && !drawing && hasPic && <div className={`aiTag ${changed ? 'stale' : ''}`}>{changed ? '✦ Trang bị đã đổi' : '✦ Khớp trang bị'}</div>}
        <div className="sparkle">{tier >= 3 && Array.from({ length: 12 }, (_, i) => <b key={i} style={{ left: `${(i * 37) % 90 + 5}%`, animationDelay: `${(i % 6) * 0.8}s` }} />)}</div>
      </div>
      {msg && <div className="hint warn">{msg}</div>}
      {oldArt && (
        <div className="restyle">
          <span>Nhân vật này được vẽ theo kiểu cũ. Vẽ lại theo kiểu mới nhất (dáng <b>cao thon</b>, da sáng, nữ có <b>hông rõ hơn</b>, <b>tư thế đứng có thần thái</b>), rồi mặc lại đồ đang đeo. Khoảng {redoCost} USD.</span>
          <button className="btn hot" disabled={!on || drawing} title={on ? 'Vẽ ảnh gốc mới, tư thế đứng, rồi tự mặc các món đang đeo' : offWhy} onClick={doRestyle}><Icon name="sparkle" size={16} /> Vẽ lại</button>
        </div>
      )}
      {needPose && (pose.status === 'failed' || pose.status === 'limited') && (
        <div className="restyle">
          <span>{WHY[pose.status]} Chưa vẽ được tư thế đứng, tạm dùng ảnh đứng thẳng.</span>
          <button className="btn" onClick={() => setPoseTry((n) => n + 1)}>Thử lại</button>
        </div>
      )}
      <div className="rerow">
        <button className={`btn ${OUTFIT_DRAW && changed && canDraw ? 'hot' : ''}`} disabled={!OUTFIT_DRAW || !canDraw} onClick={draw} title={OUTFIT_DRAW ? tip : 'Tạm khóa'}><Icon name="brush" size={16} /> {label}</button>
        <button className="btn" onClick={onBio}><Icon name="book" size={16} /> Tiểu sử</button>
      </div>
    </>
  );
}

// Gate: sign in first. Everything after it is driven by the Game_Server.
export default function Game() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [google, setGoogle] = useState(false);
  const [linkNote, setLinkNote] = useState<{ t: string; ok: boolean } | null>(null);
  useEffect(() => {
    (async () => {
      // ?link=... is the click on the e-mail confirmation: finish it first, then read who is signed in
      const q = new URLSearchParams(window.location.search), tk = q.get('link');
      if (tk) {
        const r = await authPost({ action: 'link-confirm', token: tk });
        setLinkNote({ ok: !!r.ok, t: r.ok ? 'Đã liên kết email. Từ nay ngươi đăng nhập được từ mọi thiết bị.' : errText(r.code || 'E_SERVER') });
        window.history.replaceState(null, '', '/');
      }
      const me = await authMe();
      setGoogle(me.google); setUser(me.user);
    })().catch(() => setUser(null));
  }, []);
  if (user === undefined) return <><Atmosphere scene="night" /><div className="loading"><div className="loadBox"><Lockup width={300} /><span>Đang nhập định</span></div></div></>;
  if (!user) return <><Atmosphere scene="night" /><AuthScreen google={google} initialNote={linkNote} onDone={(u) => { setUser(u); authMe().then((m) => setUser(m.user)).catch(() => {}); }} /></>;
  return <GameInner user={user} linkNote={linkNote} onSignOut={() => setUser(null)} />;
}
function GameInner({ user: user0, linkNote, onSignOut }: { user: AuthUser; linkNote: { t: string; ok: boolean } | null; onSignOut: () => void }) {
  const [user, setUser] = useState(user0);
  const email = user.email, guest = user.guest;
  const [pkBusy, setPkBusy] = useState(false);
  const addPk = async () => {
    if (!passkeySupported()) { toast(PASSKEY_UNSUPPORTED, false); return; }
    setPkBusy(true);
    const c = await addPasskey();
    setPkBusy(false);
    if (!c) { setUser((u) => ({ ...u, passkeys: (u.passkeys || 0) + 1 })); toast('Đã thêm passkey. Lần sau ngươi đăng nhập chỉ cần vân tay hoặc khuôn mặt.', true); }
    else if (c !== 'cancel') toast(errText(c), false);
  };
  const removePk = async () => { if (await askConfirm({ title: 'Gỡ passkey?', body: 'Mọi passkey của tài khoản này sẽ bị gỡ. Ngươi vẫn đăng nhập được bằng cách khác nếu đã có email.', ok: 'Gỡ', danger: true })) { await authPost({ action: 'pk-remove' }); setUser((u) => ({ ...u, passkeys: 0 })); } };
  const [linkOpen, setLinkOpen] = useState(false), [nagGone, setNagGone] = useState(false);
  useEffect(() => { if (linkNote) toast(linkNote.t, linkNote.ok); }, [linkNote]);
  const stRef = useRef<GS | null>(null);
  const stormRef = useRef(false);
  const dirty = useRef(false), saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null), saveVer = useRef(0);
  const [, setN] = useState(0);
  const re = useCallback(() => setN((x) => x + 1), []);
  const [ready, setReady] = useState(false);
  const [net, setNet] = useState(true);
  const [stage, setStage] = useState<FeedEntry | null>(null);   // the fight being replayed above the journey
  // The server settles every tick at once, the replay of a fight is slower. So a state that brings a new fight is kept aside (`held`) while the fight is replayed:
  // the screen keeps showing the state from before it (health, Linh Thạch, Tu Vi, the journey), and the new state is applied when the last queued fight is over.
  const stageNow = useRef<FeedEntry | null>(null), fightQ = useRef<FeedEntry[]>([]), held = useRef<GS | null>(null), watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenFeed = useRef<number | null>(null), cuedFeed = useRef<number | null>(null), seenSig = useRef<string | null>(null);
  const [storm, setStorm] = useState(false);
  const [credits, setCredits] = useState(false);
  const [acked, setAcked] = useState<string[]>([]);   // reports closed by the player and waiting for the server to confirm
  const [sideOpen, setSideOpen] = useState(false);   // the third column (Kho báu) is a drawer on laptop and phone screens
  const [intro, setIntro] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const [codex, setCodex] = useState<null | 'bio' | 'story' | 'world' | 'daily'>(null);
  const [, setDailyTick] = useState(0);
  const [modal, setModal] = useState<null | 'settings' | 'odds' | 'rank' | 'market' | 'night' | 'daily' | 'pen' | 'dex' | 'arts' | 'dao' | 'title' | 'purity' | 'alchemy'>(null);
  // Linh Thú Viên is its own page: a full page load, so the game (its timers, canvases, music) is gone and the zoo has the whole phone to itself
  const goZoo = () => { cue.open(); window.location.assign('/linh-thu-vien'); };
  const openWin = (w: 'market' | 'pen' | 'dex' | 'arts' | 'alchemy') => { cue.open(); setSideOpen(false); setModal(w); };
  const [view, setView] = useState<'journey' | 'hero'>('journey');   // phone only: one panel at a time instead of one very long page
  const [story, setStory] = useState<{ enabled: boolean } | null>(null);
  const [breakOpen, setBreakOpen] = useState(false), [zoneOpen, setZoneOpen] = useState(false);
  const [note, setNote] = useState<{ t: string; ok: boolean } | null>(null);
  const zoomRef = useRef<((z: any) => void) | null>(null);
  const [dexTab, setDexTab] = useState<'thu' | 'di' | 'khi'>('thu');
  const bioBusy = useRef(false), bioFails = useRef(0), chBusy = useRef(false), chFail = useRef<Record<number, number>>({});
  const say = useCallback((t: string, ok = true) => { setNote({ t, ok }); setTimeout(() => setNote((n) => (n && n.t === t ? null : n)), 6000); }, []);

  // A new state from the server replaces ours. Pictures and the biography the player just made stay until the server has them.
  const commit = useCallback((v: GS) => {
    const cur = stRef.current;
    if (cur && dirty.current) { v.player.avatar = cur.player.avatar; v.player.bio = cur.player.bio || v.player.bio; v.player.prologueSeen = cur.player.prologueSeen || v.player.prologueSeen; }
    stRef.current = v; re();
  }, [re]);
  // The next fight of the queue goes on stage. The moment a fight is over its result (drops, taming, rewards) goes into the journey, even when more fights are waiting:
  // with fights back to back the queue never empties, so waiting for it to empty would never show anything. Only the rows that belong to fights not yet replayed stay hidden.
  // When there is no fight left, the state that was kept aside is shown whole.
  const nextFight = useCallback(() => {
    if (watchdog.current) { clearTimeout(watchdog.current); watchdog.current = null; }
    const done = stageNow.current, f = fightQ.current.shift() || null;
    stageNow.current = f; setStage(f);
    const h = held.current;
    if (f) {
      watchdog.current = setTimeout(() => { if (stageNow.current === f) nextFight(); }, 40000);   // a replay that never reports back cannot freeze the screen
      if (h && done) {
        const lastId = fightQ.current.length ? fightQ.current[fightQ.current.length - 1].id : f.id;
        commit({ ...h, feed: h.feed.filter((x) => x.id <= done.id || x.id > lastId) });
      }
      return;
    }
    held.current = null; if (h) commit(h);
  }, [commit]);
  const apply = useCallback((v: GS) => {
    const top = v.feed[0]?.id ?? 0, seen = seenFeed.current;
    if (seen === null) { seenFeed.current = top; commit(v); return; }
    // fights that are new (older saves have plain-text logs and are skipped), replayed one after the other and only to someone who is looking
    const fights = top > seen && !document.hidden ? v.feed.filter((e) => e.id > seen && (e.kind === 'monster' || e.kind === 'npc') && e.log?.[0]?.startsWith('~')).reverse() : [];
    if (top > seen) seenFeed.current = top;
    if (fights.length) {
      fightQ.current.push(...fights); if (fightQ.current.length > 3) fightQ.current.splice(0, fightQ.current.length - 3);   // never a long backlog
      held.current = v; if (!stageNow.current) nextFight(); return;
    }
    if (stageNow.current || held.current) { held.current = v; return; }   // a fight is on stage: nothing newer is shown before it ends
    commit(v);
  }, [commit, nextFight]);
  // A poll that started before the last click finished may carry the state from before it: it is dropped, so a click never seems to undo itself.
  const actAt = useRef(0);
  const inflight = useRef(0);        // player requests on their way: a poll that answers meanwhile may carry the state from before the click, so it is dropped
  const [busy, setBusy] = useState(0);   // requests the player started and that have not been answered yet (shows a thin bar, see .busyBar)
  const actNet: Act = useCallback(async (type, payload = {}): Promise<ActRes> => {
    setBusy((n) => n + 1); inflight.current++;
    let out: Awaited<ReturnType<typeof gameAct>>;
    // A request that never gets through answers with a refusal instead of throwing, so every caller can show it (before, the click just did nothing).
    try { out = await gameAct({ type, ...payload }); }
    catch { return { ok: false, msg: errText('E_SERVER'), code: 'E_SERVER' }; }
    finally { setBusy((n) => n - 1); inflight.current--; }
    if (out.code === 'E_AUTH') { onSignOut(); return { ok: false, msg: errText('E_AUTH'), code: 'E_AUTH' }; }
    if (out.state) {
      actAt.current = performance.now();
      // While a fight is replayed, apply() keeps every newer state aside. That is right for the poll, but the player's own click (clean the bag, wear, buy...)
      // must show at once: otherwise the bag still shows items that are already gone and the next click on one of them fails with "not found".
      if (stageNow.current || held.current) {
        const top = out.state.feed[0]?.id ?? 0;
        if (seenFeed.current !== null && top > seenFeed.current) seenFeed.current = top;
        held.current = null;   // the answer is the newest state, an older one kept aside must not replace it later
        commit(out.state);
      } else apply(out.state);
    }
    return { ok: out.ok, msg: out.ok ? out.msg || '' : out.msg || errText(out.code || 'E_SERVER'), data: out.data, code: out.code };
  }, [apply, onSignOut]);

  // ---- instant actions. What needs no dice (lib/intents.ts) is done on the screen at once, with the very same rules the server uses, on a copy of the state;
  // the server is told in the background, one request after another, and its answer replaces the copy. The caller gets the result right away, so nothing
  // waits for the network. If the server refuses, its state is shown and the player is told; if the request never got through, the old state comes back.
  type Op = { type: string; payload: any; local: (s: G.GameState) => G.Res };
  const optQ = useRef<Op[]>([]), optRun = useRef(false), optBase = useRef<GS | null>(null), optLast = useRef<GS | null>(null);
  const runOpt = useCallback(async () => {
    if (optRun.current) return;
    optRun.current = true;
    while (optQ.current.length) {
      const op = optQ.current[0];
      const r = await actNet(op.type, op.payload);
      optQ.current.shift();
      if (!r.ok) say(r.msg, false);
      if (optQ.current.length) {
        // the answer put the server's state on the screen: the changes still on their way go back on top of it, so nothing seems to undo itself
        const cur = stRef.current;
        if (cur) { const f = forkState(cur); for (const o of optQ.current) o.local(f as unknown as G.GameState); stRef.current = f; optLast.current = f; }
      } else if (!r.ok && stRef.current === optLast.current && optBase.current) stRef.current = optBase.current;
      re();
    }
    optRun.current = false;
  }, [actNet, say, re]);
  const act: Act = useCallback(async (type, payload = {}): Promise<ActRes> => {
    // The question of the journey: a skip, an avoid or a "later" is decided here. A taming or a fight has chance in it, so only the question closes at once
    // and the result (a new row in the journey) comes with the server's answer.
    const closeAsk = (s: G.GameState, b: any): G.Res => (s.decision && s.decision.id === b.id ? ((s.decision = null), G.ok('')) : G.fail('E_NO_DECISION'));
    const pure = type === 'decide' ? (decideIsPure(payload) ? (s: G.GameState, b: any) => G.decide(s, b) : payload && (payload.choice === 'tame' || payload.choice === 'fight') ? closeAsk : undefined) : PURE_INTENTS[type];
    const st = stRef.current;
    if (!pure || !st) return actNet(type, payload);
    const f = forkState(st), r = pure(f as unknown as G.GameState, payload);
    if (!r.ok) return { ok: false, msg: r.msg, code: r.code, data: r.data };
    if (!optQ.current.length && !optRun.current) optBase.current = st;
    optQ.current.push({ type, payload, local: (s) => pure(s, payload) });
    stRef.current = f; optLast.current = f;
    re();
    void runOpt();
    return { ok: true, msg: r.msg, data: r.data };
  }, [actNet, runOpt, re]);

  // Portraits, biography and prologue flag are presentation only: they are sent to the server shortly after they change.
  const save = useCallback(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const st = stRef.current; if (!st) return;
      const v = ++saveVer.current, p = st.player, body: any = { type: 'cosmetic' };
      if (p.avatar) body.avatar = p.avatar;
      if (p.bio) body.bio = p.bio;
      if (p.prologueSeen) body.prologueSeen = true;
      try { await gameAct(body); } catch {}
      if (saveVer.current === v) dirty.current = false;
    }, 500);
  }, []);
  const eqx = useEquip(stRef, act, re);

  // A poll that is already running is shared: a second caller waits for the same request instead of returning at once,
  // so the first load never reports "ready" before the data has arrived (React runs effects twice in development).
  const polling = useRef<Promise<void> | null>(null);
  const poll = useCallback((): Promise<void> => {
    if (stormRef.current) return Promise.resolve();
    if (polling.current) return polling.current;
    const run = (async () => {
      try {
        const t0 = performance.now();
        const out = await gameGet();
        if (out.code === 'E_AUTH') onSignOut();
        else if (out.state) { if (t0 >= actAt.current && inflight.current === 0) apply(out.state); }
        else if (out.ok) setIntro(true);
      } catch {} finally { polling.current = null; }
    })();
    polling.current = run;
    return run;
  }, [apply, onSignOut]);
  useEffect(() => {
    watchNet(setNet);
    poll().finally(() => setReady(true));
    const id = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
    const vis = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [poll]);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/image').then((r) => r.json()).then((j) => alive && setAi((prev: any) => (JSON.stringify(prev) === JSON.stringify(j) ? prev : j))).catch(() => {});
    load(); const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  // Daily creatures and chronicle chapters: reloaded when the server reports a newer pack (or a new picture).
  const dailyVer = stRef.current?.dailyVer;
  useEffect(() => {
    if (dailyVer === undefined) return;
    fetch('/api/daily').then((r) => r.json()).then((j) => { if (j && j.ok && Array.isArray(j.packs)) { D.setDaily(j.packs); setDailyTick((n) => n + 1); } }).catch(() => {});
  }, [dailyVer]);
  useEffect(() => { fetch('/api/story').then((r) => r.json()).then(setStory).catch(() => setStory({ enabled: false })); }, []);

  // Biography: written once per character by Claude (server caches it), then kept in the save.
  useEffect(() => {
    const st = stRef.current;
    if (!st || intro || !story?.enabled || st.player.bio || bioBusy.current || bioFails.current >= 3) return;
    bioBusy.current = true;
    const p = st.player, L = p.look;
    fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'bio', name: p.name, dao: p.dao, g: L.g, linh: p.linh, purity: p.purity, pers: p.pers, origin: p.origin, look: { hc: L.hc, hs: L.hs, ey: L.ey, sk: L.sk, mk: L.mk } }) })
      .then((r) => r.json())
      .then((j) => { if (j.status === 'ready' && j.bio) { p.bio = { bio: j.bio, motto: j.motto, secret: j.secret }; save(); re(); } else bioFails.current++; })
      .catch(() => { bioFails.current++; })
      .finally(() => setTimeout(() => { bioBusy.current = false; }, 45000));
  });
  // One diary chapter per Realm reached.
  useEffect(() => {
    const st = stRef.current;
    if (!st || intro || !story?.enabled || chBusy.current) return;
    const p = st.player, have = new Set((p.chapters || []).map((c) => c.realm));
    let need = 0;
    for (let r = 1; r <= p.realm; r++) if (!have.has(r) && Date.now() - (chFail.current[r] || 0) > 120000) { need = r; break; }
    if (!need) return;
    chBusy.current = true;
    fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'chapter', name: p.name, g: p.look.g, realm: need, motto: (p.bio && p.bio.motto) || '' }) })
      .then((r) => r.json())
      .then(async (j) => { if (j.status === 'ready' && j.text) await act('cosmetic', { chapter: { realm: need, text: j.text } }); else chFail.current[need] = Date.now(); })
      .catch(() => { chFail.current[need] = Date.now(); })
      .finally(() => { chBusy.current = false; });
  });
  const cue = useCue(); const fx = useFx();
  // the Kho báu drawer always opens at its top: it is a scrolling panel that kept the position it had when it was closed
  useEffect(() => {
    if (!sideOpen) return;
    const el = document.getElementById('sidePanel'); if (el) el.scrollTop = 0;
    const eq = el?.querySelector('.eqPanel') as HTMLElement | null; if (eq) eq.scrollTop = 0;
  }, [sideOpen]);
  useEffect(() => {
    if (!sideOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSideOpen(false); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [sideOpen]);
  // sound and effects for what just happened: new journey entries, a changed outfit (the first pass only records where we are)
  // New rows come in at the top. The rows below slide down with transform only (the browser's compositor, no layout per frame) instead of the list reflowing while a row opens.
  const feedRef = useRef<HTMLDivElement>(null), feedTop = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = feedRef.current, f = stRef.current?.feed;
    if (!el || !f) return;
    const top = f[0]?.id ?? 0, prev = feedTop.current; feedTop.current = top;
    if (prev === null || top <= prev) return;
    const rows = Array.from(el.children) as HTMLElement[], added = Math.min(f.filter((e) => e.id > prev).length, rows.length - 1);
    if (added < 1) return;
    const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
    const d = rows.slice(0, added).reduce((a, r) => a + r.offsetHeight + gap, 0);
    rows.slice(added, added + 8).forEach((r) => r.animate([{ transform: `translateY(${-d}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }));   // only the rows in view
  });
  useEffect(() => {
    const cur = stRef.current; if (!cur || intro) return;
    const top = cur.feed[0]?.id ?? 0;
    if (cuedFeed.current === null) cuedFeed.current = top;
    else if (top > cuedFeed.current) {
      const fresh = cur.feed.filter((e) => e.id > cuedFeed.current!).slice(0, 4).reverse(); cuedFeed.current = top;
      for (const e of fresh) {
        if (e.kind === 'level') cue.levelUp();
        else if (e.kind === 'break') { if (e.text.startsWith('Đột phá thành công')) cue.breakOk(); else if (e.text.startsWith('Đột phá thất bại')) cue.breakFail(); }
        else if ((e.kind === 'item' || e.kind === 'equip') && e.item) cue.drop(e.item.tier);
        else if (e.kind === 'tame' && e.outcome === 'win') cue.tame();
        else if (e.kind === 'monster' && e.beast && e.beast.mut) cue.mutant();
      }
    }
    const sig = equipSig(cur);
    if (seenSig.current === null) seenSig.current = sig; else if (sig !== seenSig.current) { seenSig.current = sig; cue.equip(); }
  });

  const start = async (g?: 'f' | 'm') => { const r = await act('restart', { gender: g }); if (r.ok) { fightQ.current = []; stageNow.current = null; held.current = null; setStage(null); seenFeed.current = stRef.current?.feed[0]?.id ?? 0; cuedFeed.current = null; seenSig.current = null; setIntro(false); } else say(r.msg, false); };
  const signOut = async () => { await authPost({ action: 'logout' }); onSignOut(); };

  if (!ready) return <><Atmosphere scene="night" /><div className="loading"><div className="loadBox"><Lockup width={300} /><span>Đang nhập định</span></div></div></>;
  if (intro) return <><Atmosphere scene="night" /><Intro onPick={start} onCredits={() => setCredits(true)} />{credits && <Credits onClose={() => setCredits(false)} />}</>;
  if (!stRef.current) return <><Atmosphere scene="night" /><div className="loading"><div className="loadBox"><Lockup width={300} /><span>Không tải được dữ liệu.</span><button className="btn" onClick={() => poll()}>Thử lại</button></div></div></>;

  const st = stRef.current;
  const S = pstats(st), p = st.player, L = levelOf(p), th = threshold(L), tier = outfitTier(st), aura = auraElement(st);
  const bott = atBottleneck(st);
  const target = p.realm + 1, waves = L < BALANCE.playableLevelCap ? C.WAVES[target] || 0 : 0;
  const speciesAll = D.allSpecies();
  const seenSpecies = speciesAll.filter((s) => (st.best[s.id]?.seen || 0) > 0).length;
  const rep = st.pending.find((r) => !acked.includes(r.id));   // a report the player just closed is hidden at once, not after the server answers
  const zone = st.zones.find((z) => z.id === st.zone);
  // the tribulation plays out first (charge, one lightning strike per wave); the server decides the verdict meanwhile
  const doBreak = async (o: { pill: boolean; trib: boolean }) => {
    if (storm) return;
    setBreakOpen(false);
    cue.charge();
    stormRef.current = true; setStorm(true);
    if (waves > 0) cue.storm(waves);
    const [r] = await Promise.all([act('break', { pill: o.pill, trib: o.trib }), sleep(waves > 0 ? 700 + waves * 430 : 500)]);
    stormRef.current = false; setStorm(false);
    if (!r.ok) say(r.msg, false);
  };
  const state = st.decision ? 'Chờ quyết định' : st.recovery ? 'Điều Tức' : (p.injury || 0) > 0 ? 'Thương Thế' : p.heartDemon > 0 ? 'Tâm Ma' : st.set.mode === 'retreat' ? 'Bế Quan' : 'Lịch Luyện';
  const ack = async (id: string) => { setAcked((a) => (a.includes(id) ? a : [...a, id])); await act('ack', { id }); };   // stays hidden even if the server refuses: the button must always close the window

  return (
    <GenCtx.Provider value={!!(ai && ai.enabled)}>
    <ZoomProvider>
    <ZoomBridge r={zoomRef} />
    <div className={`app ${st.decision ? 'hasDecision' : ''}`}>
      {busy > 0 && <div className="busyBar" role="progressbar" aria-label="Đang gửi lên máy chủ" />}
      <LoadingNote active={busy > 0} />
      {!net && <div className="netBanner" role="alert">Mất kết nối tới máy chủ. Đang thử lại, các thao tác chưa gửi sẽ được gửi lại.</div>}
      <Atmosphere scene={st.set.mode === 'retreat' ? 'night' : 'dawn'} aura={C.EL[aura].color} zone={st.zone} />

      <header className="top">
        <div className="brand"><h1 className="wm"><Lockup width={112} className="lkWide" /><Logo size={38} className="lkMark" /></h1></div>
        <QiWidget aura={C.EL[aura].color} />
        <div className="topMid">
          <Seg label="Chế độ" value={st.set.mode} onChange={async (v) => { const r = await act('mode', { mode: v }); if (!r.ok) say(r.msg, false); }} options={[
            { v: 'adventure' as const, label: <><Icon name="wind" size={15} /><span className="lbl">Lịch Luyện</span></>, title: 'Lịch Luyện: ra ngoài săn Linh Thú, nhặt pháp khí' },
            { v: 'retreat' as const, label: <><Icon name="lotus" size={15} /><span className="lbl">Bế Quan</span></>, title: 'Bế Quan: ngồi thiền tích lũy Tu Vi' },
          ]} />
        </div>
        <nav className="topNav" aria-label="Chức năng">
          <button type="button" aria-label="Linh Thú Viên" title="Linh Thú Viên" className="nav pic zoo quick" data-tone="jade" onClick={goZoo}><span className="navArt" style={{ backgroundImage: 'url(/art/ui/nav/zoo.png)' }} aria-hidden="true" /><span className="navIco"><Icon name="zoo" size={18} /></span><span className="lbl">Linh Thú Viên</span></button>
          <button type="button" aria-label="Phong Thần" className="nav pic rank quick" data-tone="gold" onClick={() => { cue.open(); setModal('rank'); }}><span className="navArt" style={{ backgroundImage: `url(${C.uiArt('ico_rank')})` }} aria-hidden="true" /><span className="navIco"><Icon name="crown" size={18} /></span><span className="lbl">Phong Thần</span></button>
          <button type="button" aria-label="Phường Thị" className="nav pic alt market" data-tone="gold" onClick={() => openWin('market')}><span className="navIco"><Icon name="stone" size={18} /></span><span className="lbl">Phường Thị</span></button>
          <button type="button" aria-label="Luyện Đan" className="nav pic alt alchemy" data-tone="gold" onClick={() => openWin('alchemy')}><span className="navIco"><Icon name="lotus" size={18} /></span><span className="lbl">Luyện Đan</span></button>
          <button type="button" aria-label="Chợ Đêm" className="nav pic alt night" data-tone="violet" onClick={() => { cue.open(); setModal('night'); }}><span className="navIco"><Icon name="moon" size={18} /></span><span className="lbl">Chợ Đêm</span></button>
          <button type="button" aria-label="Nhiệm vụ" className="nav pic alt daily quick" data-tone="gold" onClick={() => { cue.open(); setModal('daily'); }}><span className="navArt" style={{ backgroundImage: `url(${C.uiArt('ico_quest')})` }} aria-hidden="true" /><span className="navIco"><Icon name="scroll" size={18} /></span><span className="lbl">Nhiệm vụ</span></button>
          <button type="button" aria-label="Thần Thông" className="nav pic alt arts" data-tone="violet" onClick={() => openWin('arts')}><span className="navIco"><Icon name="bolt" size={18} /></span><span className="lbl">Thần Thông</span></button>
          <button type="button" aria-label="Linh Thú" className="nav pic alt pen" data-tone="jade" onClick={() => openWin('pen')}><span className="navIco"><Icon name="paw" size={18} /></span><span className="lbl">Linh Thú</span></button>
          <button type="button" aria-label="Thiên Thư" className="nav pic alt story" data-tone="jade" onClick={() => { cue.open(); setCodex('story'); }}><span className="navIco"><Icon name="scroll" size={18} /></span><span className="lbl">Thiên Thư</span></button>
          <button type="button" aria-label="Xác suất" className="nav pic alt odds" data-tone="azure" onClick={() => { cue.open(); setModal('odds'); }}><span className="navIco"><Icon name="luck" size={18} /></span><span className="lbl">Xác suất</span></button>
          <button type="button" aria-label="Cài đặt" className="nav pic alt settings" data-tone="violet" onClick={() => { cue.open(); setModal('settings'); }}><span className="navIco"><Icon name="gear" size={18} /></span><span className="lbl">Cài đặt</span></button>
          <button type="button" aria-label="Kho báu" className={`nav pic kho quick ${sideOpen ? 'on' : ''}`} data-tone="cinnabar" aria-expanded={sideOpen} onClick={() => { cue.open(); setSideOpen((o) => !o); }}><span className="navArt" style={{ backgroundImage: `url(${C.uiArt('ico_bag')})` }} aria-hidden="true" /><span className="navIco"><Icon name="chest" size={18} /></span><span className="lbl">Kho báu</span></button>
        </nav>
        <div className="orbs">
          <span className="musicSlot"><MusicOrb onCredits={() => setCredits(true)} /></span>
          <Popover icon={<Icon name="menu" size={19} />} label="Tùy chọn" width={340}>{(close) => {
            // every entry closes the menu first, then opens its window
            const go = (fn: () => void) => () => { close(); cue.open(); setSideOpen(false); fn(); };
            const tile = (icon: 'stone' | 'lotus' | 'bolt' | 'paw' | 'scroll' | 'moon' | 'book' | 'luck' | 'gear' | 'zoo', label: string, fn: () => void, hot?: boolean) => (
              <button type="button" className={`menuTile ${hot ? 'hot' : ''}`} onClick={go(fn)}><Icon name={icon} size={22} /><span>{label}</span></button>
            );
            return (<>
            <div className="pop-head"><b>Menu</b></div>
            <div className="pop-sect">Tài khoản</div>
            {guest
              ? <><p className="pop-note muted">Tài khoản khách: tiến trình chỉ nằm trong trình duyệt này. Liên kết email để chơi trên mọi thiết bị và đổi được mật khẩu.</p>
                <div className="pop-grid" style={{ marginBottom: 10 }}><button className="btn sm hot" onClick={go(() => setLinkOpen(true))}>Liên kết email</button><button className="btn sm" onClick={signOut}>Đăng xuất</button></div></>
              : <><p className="pop-note muted">{email}</p><div className="pop-grid" style={{ marginBottom: 10 }}><button className="btn sm" onClick={signOut}>Đăng xuất</button></div></>}
            {<div className="pop-grid" style={{ marginBottom: 10 }}>{user.passkeys ? <button className="btn sm ghost" onClick={removePk}>Gỡ passkey ({user.passkeys})</button> : <button className="btn sm" disabled={pkBusy} onClick={addPk}>Thêm passkey (vân tay / khuôn mặt)</button>}</div>}
            <div className="popNav">
              <div className="menuGroup"><div className="menuTitle">Tu luyện</div>
                <div className="menuGrid">{tile('bolt', 'Thần Thông', () => setModal('arts'))}{tile('paw', 'Linh Thú', () => setModal('pen'))}{tile('zoo', 'Linh Thú Viên', goZoo)}{tile('book', 'Sưu Tập', () => setModal('dex'))}{tile('lotus', 'Luyện Đan', () => setModal('alchemy'))}</div></div>
              <div className="menuGroup"><div className="menuTitle">Mua bán và nhiệm vụ</div>
                <div className="menuGrid">{tile('stone', 'Phường Thị', () => setModal('market'))}{tile('moon', 'Chợ Đêm', () => setModal('night'))}{tile('scroll', 'Nhiệm vụ', () => setModal('daily'))}</div></div>
              <div className="menuGroup"><div className="menuTitle">Tìm hiểu</div>
                <div className="menuGrid">{tile('scroll', 'Thiên Thư', () => setCodex('story'))}{tile('luck', 'Xác suất', () => setModal('odds'))}</div></div>
              <div className="menuGroup"><div className="menuTitle">Thiết lập</div>
                <div className="menuGrid one">{tile('gear', 'Cài đặt: âm nhạc, nghỉ ngơi, tự động, thu phục', () => setModal('settings'), true)}</div></div>
            </div>
            <div className="pop-sect">Hiệu ứng hình ảnh</div>
            <Seg label="Mức hiệu ứng" value={fx.level} onChange={fx.setLevel} options={[{ v: 'low' as const, label: 'Nhẹ' }, { v: 'mid' as const, label: 'Vừa' }, { v: 'high' as const, label: 'Nhiều' }]} />
            <p className="pop-note muted">Hạ xuống Nhẹ khi máy yếu. Nếu hệ thống đang yêu cầu giảm chuyển động, game tự dùng mức Nhẹ.</p>
            </>);
          }}</Popover>
        </div>
      </header>

      {guest && !nagGone && (
        <div className="guestNag" role="status">
          <img src="/brand/emblem.webp" width={36} height={36} alt="" draggable={false} />
          <p><b>Ngươi đang chơi bằng tài khoản khách.</b> Xoá dữ liệu trình duyệt là mất đạo đồ. Liên kết email để giữ tiến trình và đổi mật khẩu khi cần.</p>
          <button className="btn sm hot" onClick={() => setLinkOpen(true)}>Liên kết email</button>
          <button className="btn sm ghost" onClick={() => setNagGone(true)} aria-label="Để sau">Để sau</button>
        </div>
      )}
      <div className="mobView"><Seg<'journey' | 'hero'> label="Màn hình" value={view} onChange={setView} options={[{ v: 'journey' as const, label: <><Icon name="wind" size={15} /><span>Hành trình</span></>, title: 'Các lần gặp gỡ và trận đánh' }, { v: 'hero' as const, label: <><Icon name="lotus" size={15} /><span>Nhân vật</span></>, title: 'Chỉ số, đột phá, khu vực' }]} /></div>
      <main className={`main ${sideOpen ? 'sideOpen' : ''}`} data-view={view}>
        <section className="panel heroPanel">
          <Hero st={st} tier={tier} aura={aura} on={!!ai && ai.enabled && !ai.locked} offWhy={!ai ? 'Đang chuẩn bị…' : !ai.enabled ? 'Chưa có nguồn ảnh AI (thiếu khóa trong .env.local)' : 'Nhà cung cấp ảnh tạm khóa 15 phút (lỗi 403)'} save={save} re={re} onBio={() => setCodex('bio')} />
          <h2 className="pname">{p.name}</h2>
          <div className="idLines">
            <button type="button" className={`dao ${p.dao ? '' : 'none'}`} onClick={() => setModal('dao')} title="Xem đạo hiệu và đặc quyền">{p.dao || 'Chưa có đạo hiệu'}</button>
            <button type="button" className={`titleChip ${p.title ? '' : 'none'}`} onClick={() => setModal('title')} title="Xem chức vụ">{C.titleOf(p.title)?.name || 'Chưa có chức vụ'}</button>
          </div>
          <div className="realm">{C.REALMS[p.realm]} · {C.SUBS[p.sub]} <small>(Lv{L})</small> <span className="state">{state}</span></div>
          <div className="chips">{p.linh.map((e) => <ElChip key={e} el={e} />)}<button type="button" className="chip act" title="Độ thuần là gì?" onClick={() => { cue.open(); setModal('purity'); }}>Độ thuần {p.purity}</button><span className="chip">{C.PERS[p.pers].n}</span></div>
          <Bar pct={(p.hp / S.maxHp) * 100} label={`Sinh lực ${fmt(p.hp)} / ${fmt(S.maxHp)}`} cls="hp" />
          <Bar pct={L >= BALANCE.playableLevelCap ? 100 : (p.cp / th) * 100} label={bott ? 'Bình Cảnh — sẵn sàng đột phá' : `Tu Vi ${fmt(p.cp)} / ${fmt(th)}`} cls="cp" />
          <div className="stats">
            <div className="stat" title="Công Kích"><Icon name="atk" size={20} /><div><b>{S.atk}</b><small>Công</small></div></div>
            <div className="stat" title="Phòng Ngự"><Icon name="def" size={20} /><div><b>{S.def}</b><small>Thủ</small></div></div>
            <div className="stat" title="Thân Pháp"><Icon name="spd" size={20} /><div><b>{S.spd}</b><small>Tốc</small></div></div>
            <div className="stat" title="Bạo Kích"><Icon name="crit" size={20} /><div><b>{S.crit}%</b><small>Bạo</small></div></div>
            <div className="stat" title="May Mắn"><Icon name="luck" size={20} /><div><b>{S.luck}</b><small>Vận</small></div></div>
            <div className="stat" title="Tốc độ Tu Luyện"><Icon name="cult" size={20} /><div><b>+{S.cult}%</b><small>Tu</small></div></div>
          </div>
          <Toast msg={note} />
          <div className="heroActions">
            <button className={`btn big ${storm ? 'storming' : ''}`} disabled={!bott || storm} onClick={() => setBreakOpen(true)}>
              {storm ? <><Icon name="bolt" size={18} /> Đang độ kiếp…</> : bott ? `Đột Phá lên ${C.REALMS[target]}` : L >= BALANCE.playableLevelCap ? 'Đã tới giới hạn bản hiện tại' : 'Đang tích lũy Tu Vi…'}
            </button>
            <button className="zoneBtn" onClick={() => setZoneOpen(true)} style={{ backgroundImage: `url(${C.zoneArt(st.zone)})` }} aria-label={`Khu vực ${zone?.name}. Bấm để đổi`}>
              <small>Khu vực</small>
              <b>{zone?.name}</b>
              <span>Lv{zone?.lv[0]}–{zone?.lv[1]} · linh khí ×{zone?.density}</span>
              {zone?.phen && <em>{zone.phen.name}{zone.phen.effects[0] ? ` · ${zone.phen.effects[0]}` : ''}</em>}{zone?.dropEvent && <em className="dropEv">✦ Rơi Thiên/Tiên +1%</em>}
            </button>
          </div>
        </section>

        <section className="panel feedPanel">
          <div className="miniStatus">
            <button type="button" className="msFace" onClick={() => setView('hero')} aria-label="Xem nhân vật" title="Xem nhân vật">{p.avatar && p.avatar.url ? <Img src={`${p.avatar.url}?s=face`} className="faceImg" fb={<Logo size={34} />} /> : <Logo size={34} />}</button>
            <div className="msInfo">
              <div className="msTop"><b>{p.name}</b><small>{C.REALMS[p.realm]} · {C.SUBS[p.sub]} · {state}</small></div>
              <Bar pct={(p.hp / S.maxHp) * 100} label={`Sinh lực ${fmt(p.hp)} / ${fmt(S.maxHp)}`} cls="hp" />
              <Bar pct={L >= BALANCE.playableLevelCap ? 100 : (p.cp / th) * 100} label={bott ? 'Bình Cảnh, sẵn sàng đột phá' : `Tu Vi ${fmt(p.cp)} / ${fmt(th)}`} cls="cp" />
              {bott && !storm && <button className="btn hot sm" onClick={() => setBreakOpen(true)}><Icon name="bolt" size={15} /> Đột Phá lên {C.REALMS[target]}</button>}
            </div>
          </div>
          <div className="phead"><h3>Hành trình</h3><small>Mỗi lần gặp đều được máy chủ sinh ngẫu nhiên: loài, kích thước, tính cách, Dị Biến</small></div>
          {stage && <BattleStage key={stage.id} e={stage} hero={p.avatar?.url} heroEl={aura} onDone={nextFight} />}
          <div className="feed" ref={feedRef} aria-live="polite">{st.feed.map((e) => <FeedRow key={e.id} e={e} />)}</div>
        </section>

        <section className="panel sidePanel" id="sidePanel" aria-label="Kho báu">
          <div className="sideHead"><b><Icon name="chest" size={18} /> Kho báu</b><button type="button" className="xClose static" aria-label="Đóng kho báu" title="Đóng kho báu (Esc)" onClick={() => setSideOpen(false)}><XSeal size={34} /></button></div>
          <div className="res">
            <span title="Linh Thạch"><Icon name="stone" size={17} /> {fmt(st.stones)}</span>
            <span title="Khế Ước Phù theo hạng Hoàng / Huyền / Địa / Thiên"><Icon name="contract" size={17} /> Khế Ước {st.inv.taming.join('/')}</span>
            <span title="Hồi Khí Đan hạng 1 / 2 / 3"><Icon name="lotus" size={17} /> Đan {st.inv.hp.join('/')}</span>
            <span title="Độ Kiếp Phù"><Icon name="bolt" size={17} /> Độ Kiếp {st.inv.trib}</span>
          </div>
          <div className="shortcuts" role="group" aria-label="Các phần khác của game">
            <button type="button" className="sc" onClick={() => openWin('arts')}><Icon name="bolt" size={17} /><span>Thần Thông</span>{Object.keys(st.inv.books).length > 0 && <em>{Object.values(st.inv.books).reduce((n, q) => n + q, 0)} bí kíp</em>}</button>
            <button type="button" className="sc" onClick={() => openWin('pen')}><Icon name="paw" size={17} /><span>Linh Thú</span><em>{st.beasts.length}</em></button>
            <button type="button" className="sc" onClick={() => openWin('dex')}><Icon name="book" size={17} /><span>Sưu Tập</span><em>{seenSpecies}/{speciesAll.length}</em></button>
            <button type="button" className="sc" onClick={() => openWin('market')}><Icon name="stone" size={17} /><span>Phường Thị</span></button>
            <button type="button" className="sc" onClick={() => openWin('alchemy')}><Icon name="lotus" size={17} /><span>Luyện Đan</span></button>
          </div>
          <EquipPanel st={st} eqx={eqx} />
        </section>
        {sideOpen && <button type="button" className="scrim" aria-label="Đóng kho báu" onClick={() => setSideOpen(false)} />}
      </main>

      <footer className="foot">
        <div>Máy chủ quyết định mọi kết quả và tiếp tục tính giờ khi ngươi vắng mặt (tối đa {st.config.offlineCapH} giờ). Ảnh minh họa tạm do AI tạo, chưa kiểm tra giấy phép thương mại.</div>
        <div className="row"><button className="link" onClick={() => setCredits(true)}>Ghi công</button><a className="link" href="/design">Bộ quy chuẩn giao diện</a></div>
      </footer>

      {!p.prologueSeen && !rep && (
        <div className="modal">
          <div className="modalBody lore">
            <h2>{(lore as any).worldName}</h2>
            <p className="tag">{(lore as any).tagline}</p>
            {(lore as any).prologue.map((t: string, i: number) => <p key={i}>{t}</p>)}
            <p className="hook">{(lore as any).hook}</p>
            <button className="btn big" onClick={() => { p.prologueSeen = true; save(); re(); }}>Bước vào đạo đồ</button>
          </div>
        </div>
      )}

      {codex && (
        <div className="modal" onClick={() => setCodex(null)}>
          <ModalClose onClose={() => setCodex(null)} />
          <div className="modalBody lore" onClick={(e) => e.stopPropagation()}>
            <Tabs<'bio' | 'story' | 'world' | 'daily'> label="Thiên Thư" value={codex} onChange={setCodex} options={[{ v: 'bio' as const, label: 'Tiểu sử' }, { v: 'story' as const, label: 'Cốt truyện' }, { v: 'daily' as const, label: 'Nhật ký thiên hạ' }, { v: 'world' as const, label: 'Thế giới' }]} />
            {codex === 'daily' && (
              <div>
                <h2>Nhật Ký Thiên Hạ</h2><p className="tag">Mỗi ngày một chương mới; có ngày kèm một loài yêu thú mới.</p>
                {D.dailyPacks().filter((x) => x.chronicle).slice().reverse().slice(0, 14).map((x) => (
                  <div key={x.day} className="chap">
                    <h3>{x.day.split('-').reverse().join('/')} · {x.title}</h3>
                    {x.chronicle.split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}
                    {x.beast && (
                    <div className="dailyNew">
                      <div className="dailyArt">{x.beast.art ? <Img src={x.beast.art} className="fill" fb={<ElIcon el={x.beast.el[0]} size={40} />} /> : <ElIcon el={x.beast.el[0]} size={40} />}</div>
                      <div className="dailyTxt">
                        <b>Yêu thú mới: {x.beast.name}</b> <ElChip el={x.beast.el[0]} />
                        {x.beast.legend && <small>{x.beast.legend}</small>}
                        {!x.beast.art && <small className="wait">Ảnh đang được vẽ, quay lại sau ít phút.</small>}
                      </div>
                    </div>
                    )}
                    {x.weapon && (
                      <div className="dailyNew">
                        <div className="dailyArt"><GenImg spec={{ kind: 'item', slot: 'Weapon', base: x.weapon.base, tier: Math.min(1, ...x.weapon.tiers), e: '' }} pri={3} fb={<Icon name="atk" size={32} />} /></div>
                        <div className="dailyTxt"><b>Pháp khí mới: {x.weapon.base}</b> <span className="chip">{A.ART(x.weapon.cls)?.name || x.weapon.cls}</span><small>Có thể rơi từ nay về sau, nhất là trong ít ngày đầu.</small></div>
                      </div>
                    )}
                  </div>
                ))}
                {D.dailyPacks().filter((x) => x.chronicle).length === 0 && <p className="secret">Chương đầu tiên chưa được viết. Hãy quay lại sau.</p>}
              </div>
            )}
            {codex === 'bio' && (
              <div>
                <h2>{p.name}{p.dao ? ` · ${p.dao}` : ''}</h2>
                <div className="chips"><span className="chip">{C.ORIGINS[p.origin].n}</span>{p.linh.map((e) => <ElChip key={e} el={e} />)}<span className="chip">{C.PERS[p.pers].n}</span></div>
                {p.bio ? (<>
                  {p.bio.bio.split(/\n\s*\n/).map((t, i) => <p key={i}>{t}</p>)}
                  <p className="motto">“{p.bio.motto}”</p>
                  <p className="secret">Bí mật: {p.bio.secret}</p>
                </>) : <p className="secret">{story?.enabled ? 'Thiên Đạo đang viết tiểu sử cho ngươi…' : 'Chưa bật AI viết truyện (thiếu khóa TUTIEN_ONLINE_AI_KEY trong .env.local).'}</p>}
                {(p.chapters || []).slice().sort((a, b) => a.realm - b.realm).map((c) => <div key={c.realm} className="chap"><h3>{C.REALMS[c.realm]}</h3><p>{c.text}</p></div>)}
              </div>
            )}
            {codex === 'story' && (
              <div>
                <h2>{(lore as any).worldName}</h2><p className="tag">{(lore as any).tagline}</p>
                {(lore as any).prologue.map((t: string, i: number) => <p key={i}>{t}</p>)}
                <h3>Mối họa</h3><p>{(lore as any).threat}</p>
                {(lore as any).eras.map((e: any) => <div key={e.name} className="chap"><h3>{e.name}</h3><p>{e.text}</p></div>)}
              </div>
            )}
            {codex === 'world' && (
              <div>
                <h3>Vùng đất</h3>{(lore as any).regions.map((r: any) => <p key={r.name}><b>{r.name}.</b> {r.text}</p>)}
                <h3>Thế lực</h3>{(lore as any).factions.map((r: any) => <p key={r.name}><b>{r.name}.</b> {r.text}</p>)}
                <h3>Tám hệ</h3>{(lore as any).elements.map((r: any) => <p key={r.element}><b>{r.element}.</b> {r.text}</p>)}
                <h3>Cảnh giới</h3>{(lore as any).realms.map((r: any) => <p key={r.realm}><b>{r.realm}.</b> {r.text}</p>)}
              </div>
            )}
            <button className="btn big" onClick={() => setCodex(null)}>Đóng</button>
          </div>
        </div>
      )}

      <ItemPopup st={st} eqx={eqx} />
      {zoneOpen && <ZoneModal st={st} act={act} onClose={() => setZoneOpen(false)} />}
      {breakOpen && bott && <BreakModal st={st} onBreak={doBreak} onClose={() => setBreakOpen(false)} onLater={st.decision?.kind === 'break' ? () => { setBreakOpen(false); act('decide', { id: st.decision!.id, choice: 'later' }); } : undefined} />}
      {st.decision && !rep && !stage && p.prologueSeen && <DecisionBar st={st} act={act} onOpenBreak={() => setBreakOpen(true)} />}
      {modal === 'arts' && <Window title="Thần Thông" icon="bolt" sub="Môn pháp theo pháp khí đang cầm, chiêu đã học, Bí Công và Công Pháp" wide onClose={() => setModal(null)}><ArtsPanel st={st} act={act} /></Window>}
      {modal === 'pen' && <Window title="Linh Thú" icon="paw" sub={`${st.beasts.length}/${st.caps.pen} Linh Thú ngươi đã thu phục`} wide onClose={() => setModal(null)}><PenPanel st={st} act={act} say={say} /></Window>}
      {modal === 'dex' && <Window title="Sưu Tập" icon="book" sub={dexTab === 'thu' ? `Linh Thú Đồ Giám · đã gặp ${seenSpecies}/${speciesAll.length} loài` : dexTab === 'di' ? 'Album Dị Biến' : 'Album Pháp Khí'} wide onClose={() => setModal(null)}>
        <div className="dexTabs"><Seg<'thu' | 'di' | 'khi'> label="Sưu Tập" value={dexTab} onChange={setDexTab} options={[{ v: 'thu', label: 'Linh Thú' }, { v: 'di', label: 'Dị Biến' }, { v: 'khi', label: 'Pháp Khí' }]} /></div>
        {dexTab === 'di' && <MutAlbum st={st} />}
        {dexTab === 'khi' && <ItemAlbum st={st} />}
        {dexTab === 'thu' && <>
            <div className="dexHead"><b>Linh Thú Đồ Giám</b> là sổ sưu tập các loài yêu thú ngươi đã gặp. Bấm vào một loài đã gặp để xem ảnh lớn, số liệu và truyền thuyết.</div>
            <div className="dexList">
              {speciesAll.map((s) => {
                const e = st.best[s.id], seen = !!(e && e.seen > 0);
                const open = () => { if (seen) zoomRef.current?.({ kind: 'species', id: s.id, text: (lore as any).beasts[s.id] || D.legendOf(s.id), best: e }); };
                return (
                  <button key={s.id} type="button" className={`dexRow ${seen ? '' : 'unseen'}`} disabled={!seen} onClick={open} aria-label={seen ? `Xem ${s.name}` : `${s.name}: chưa gặp`}>
                    <span className="dexThumb"><Img src={C.monsterArt(s.id, false, true)} className="fill" fb={<ElIcon el={s.el[0]} size={24} />} /></span>
                    <span className="dexMain">
                      <b>{seen ? s.name : '???'}</b>
                      <small>{seen ? `Gặp ${e.seen} · Thu ${e.tamed}${e.mutSeen ? ` · ✦ Dị Biến ${e.mutSeen}` : ''}` : 'Chưa gặp'}</small>
                    </span>
                    {seen && <span className="dexEl">{s.el.map((x) => <ElIcon key={x} el={x} size={16} />)}</span>}
                  </button>
                );
              })}
            </div>
        </>}
      </Window>}
      {linkOpen && <LinkEmailModal onClose={() => setLinkOpen(false)} onLinked={(em) => { setUser({ ...user, email: em, guest: false }); setLinkOpen(false); toast('Đã liên kết email.', true); }} />}
      {modal === 'dao' && <DaoModal dao={p.dao} email={guest ? 'khách (chưa liên kết email)' : email} onClose={() => setModal(null)} />}
      {modal === 'purity' && <PurityModal st={st} onClose={() => setModal(null)} />}
      {modal === 'title' && <TitleModal title={p.title} hist={p.titleHist} onClose={() => setModal(null)} />}
      {modal === 'market' && <MarketModal st={st} act={act} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal st={st} act={act} onClose={() => setModal(null)} onCredits={() => setCredits(true)} />}
      {modal === 'daily' && <DailyModal st={st} onClose={() => setModal(null)} onLore={() => setCodex('daily')} />}
      {modal === 'alchemy' && <AlchemyModal st={st} act={act} onClose={() => setModal(null)} />}
      {modal === 'night' && <NightMarketModal st={st} act={act} onClose={() => setModal(null)} />}
      {modal === 'rank' && <RankingModal onClose={() => setModal(null)} />}
      {modal === 'odds' && <OddsModal st={st} onClose={() => setModal(null)} />}
      {rep && p.prologueSeen && <ReportModal rep={rep} title="Chào mừng trở lại" st={st} onDaily={() => setModal('daily')} onClose={() => ack(rep.id)} />}
      {credits && <Credits onClose={() => setCredits(false)} />}
    </div>
    </ZoomProvider>
    </GenCtx.Provider>
  );
}
