'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';
import * as C from '@/lib/content';
import * as A from '@/lib/arts';
import { levelOf } from '@/lib/game';
import { BALANCE } from '@/lib/balance';
import type { GS } from '@/lib/client/types';
import type { Act } from './Panels';
import { Img, ElChip } from './ui';
import { Seg } from './ds/Seg';
import { Icon } from './ds/Icon';
import { Toast } from './ds/Dialog';

// Thần Thông: the môn pháp of the weapon in hand and its techniques, the overview of everything learned, the Bí Công in the bag, and the Công Pháp (cultivation method).
// Every technique and method wears the colour of its rarity (Hoàng green, Huyền blue, Địa purple, Thiên orange), the same colours as the items.
//
// One vocabulary for "what do I have", used by every view:
//   on     learned and placed in a slot: it is used in the fight        known  learned, but not in a slot (so it is not used)
//   ready  not learned, but the Bí Công is in the bag and the Level is enough: press «Học»
//   wait   the Bí Công is in the bag but the Level is too low            none   not learned and no Bí Công yet
type View = 'cls' | 'known' | 'books' | 'method';
type Status = 'on' | 'known' | 'ready' | 'wait' | 'none';
type Flt = 'all' | 'learned' | 'unlearned';
const GROUP_TONE: Record<string, string> = { 'Tấn Công': 'atk', 'Phòng Thủ': 'def', 'Hồi Phục': 'heal', 'Cường Hóa': 'buff', 'Suy Yếu': 'debuff', 'Khống Chế': 'ctrl' };
const GROUP_HELP: Record<string, string> = { 'Tấn Công': 'Gây sát thương', 'Phòng Thủ': 'Giảm sát thương nhận vào', 'Hồi Phục': 'Hồi Sinh Lực', 'Cường Hóa': 'Tăng sức mình', 'Suy Yếu': 'Làm địch yếu đi', 'Khống Chế': 'Làm địch mất lượt' };
const GroupChip = ({ g }: { g: string }) => <span className={`chip grp ${GROUP_TONE[g] || ''}`} title={GROUP_HELP[g]}>{g}</span>;
const BIAS_VI: Record<string, string> = { hp: 'Sinh Lực', spirit: 'Linh Lực', atk: 'Công Kích', def: 'Phòng Ngự', spd: 'Thân Pháp' };

// rarity index into C.RARITY / C.RCOLOR: the basic attack is Phàm (0), Hoàng..Thiên techniques are 1..4
const rarOf = (t: A.Tech) => (t.basic ? 0 : t.tier + 1);
const RAR_NOTE = ['Hoàng: phổ thông', 'Huyền: khá hiếm', 'Địa: hiếm', 'Thiên: cực hiếm'];

const have = (st: GS, name: string) => st.inv.books[name] || 0;
const techStatus = (st: GS, t: A.Tech): Status => {
  if (st.arts.learned.includes(t.name)) return (st.arts.loadout[t.cls] || []).includes(t.name) ? 'on' : 'known';
  if (have(st, t.name) > 0) return levelOf(st.player) >= t.minLevel ? 'ready' : 'wait';
  return 'none';
};
const methodStatus = (st: GS, x: A.Method): Status => {
  if (st.arts.method === x.name) return 'on';
  if (st.arts.methods.includes(x.name)) return 'known';
  if (have(st, x.name) > 0) return levelOf(st.player) >= x.minLevel ? 'ready' : 'wait';
  return 'none';
};
const ALL_TECHS = Object.values(A.TECHS).filter((t) => !t.basic);
// Where a Bí Công can be found (lib/game.ts rollBook): beasts of the môn's elements and Tu Sĩ of that môn, foes at most 2 Levels under the technique's Level.
const dropHint = (t: A.Tech) => `Rơi khi thắng yêu thú hệ ${A.dropElements(t.cls).join(', ')} hoặc ${A.dropNpc(t.cls)}${t.minLevel > 3 ? `, gặp địch từ Lv${t.minLevel - 2} trở lên` : ''}. Khoảng ${Math.round(100 * BALANCE.bookDropP)}% mỗi trận thắng, Tinh Anh và Dị Biến dễ rơi hơn.`;
const methodHint = `Cuốn kinh rơi hiếm sau trận thắng (khoảng ${(BALANCE.methodDropP * 100).toFixed(1)}%).`;

function Pips({ n }: { n: number }) {
  return <span className="pips" role="img" aria-label={n ? `Độ hiếm ${n} trên 4` : 'Đòn cơ bản'}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>;
}
const Stat = ({ icon, label, value }: { icon: string; label: string; value: string }) => <span className="acStat"><Icon name={icon} size={13} /><small>{label}</small><b>{value}</b></span>;

// The same five words everywhere: what the player has of this technique (or of this Công Pháp).
function StateChip({ s, lv, unit = 'tech', short }: { s: Status | 'basic'; lv?: number; unit?: 'tech' | 'method'; short?: boolean }) {
  const m = unit === 'method';
  const icon = s === 'on' || s === 'known' || s === 'basic' ? 'check' : s === 'none' ? 'lock' : 'book';
  const text = short ? (s === 'basic' ? 'Luôn có' : s === 'on' ? 'Đang dùng' : s === 'known' ? 'Đã học' : s === 'ready' ? 'Học được ngay' : s === 'wait' ? `Cần Lv${lv}` : 'Chưa có')
    : s === 'basic' ? 'Luôn có'
    : s === 'on' ? (m ? 'Đang tu luyện' : 'Đang dùng trong trận')
      : s === 'known' ? (m ? 'Đã học · chưa dùng' : 'Đã học · chưa xếp ô')
        : s === 'ready' ? (m ? 'Có kinh · học được ngay' : 'Có bí kíp · học được ngay')
          : s === 'wait' ? `${m ? 'Có kinh' : 'Có bí kíp'} · cần Lv${lv}`
            : (m ? 'Chưa có kinh' : 'Chưa có bí kíp');
  return <span className={`chip st ${s}`}><Icon name={icon} size={12} /> {text}</span>;
}

interface CardProps { name: string; ri: number; pips: number; state: Status | 'basic'; unit?: 'tech' | 'method'; lv?: number; tags?: ReactNode; text?: ReactNode; stats?: ReactNode; foot?: ReactNode }
function ArtCard({ name, ri, pips, state, unit, lv, tags, text, stats, foot }: CardProps) {
  return (
    <article className={`artCard r${ri} ${state === 'none' ? 'locked' : state === 'basic' ? 'known' : state}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
      <div className="acTop">
        <div className="acName"><b>{name}</b><span className="rarTag">{ri === 0 ? 'Cơ bản' : C.RARITY[ri]}</span></div>
        <Pips n={pips} />
      </div>
      <div className="acTags"><StateChip s={state} lv={lv} unit={unit} />{tags}</div>
      {text && <p className="acText">{text}</p>}
      {stats && <div className="acStats">{stats}</div>}
      {foot && <div className="acFoot">{foot}</div>}
    </article>
  );
}
// A titled block of cards ("Đang dùng trong trận", "Chưa học"...), so the player reads the list as groups, not as one long column.
const Group = ({ title, note, tone, children }: { title: string; note?: string; tone?: Status; children: ReactNode }) => (
  <section className={`artGroup ${tone || ''}`}><h5>{title}{note && <small>{note}</small>}</h5>{children}</section>
);

function techStats(t: A.Tech): ReactNode {
  return (
    <>
      {t.group === 'Tấn Công' && <Stat icon="atk" label="Sát thương" value={`×${(t.coef * t.hits).toFixed(2)}${t.hits > 1 ? ` (${t.hits} đòn)` : ''}`} />}
      {t.pierce > 0 && <Stat icon="def" label="Xuyên giáp" value={`${Math.round(t.pierce * 100)}%`} />}
      {t.crit > 0 && <Stat icon="crit" label="Bạo kích" value={`+${t.crit}%`} />}
      <Stat icon="cult" label="Linh Lực" value={t.spirit ? String(t.spirit) : 'Miễn phí'} />
      <Stat icon="clock" label="Hồi chiêu" value={t.cd ? `${t.cd} hiệp` : 'Không'} />
    </>
  );
}
function techText(t: A.Tech): string {
  if (t.basic) return 'Đòn cơ bản của môn pháp này. Luôn dùng được, không tốn Linh Lực.';
  if (t.group === 'Tấn Công') return `Gây sát thương${t.el ? ` hệ ${t.el}` : ''}${t.pierce ? `, bỏ qua ${Math.round(t.pierce * 100)}% phòng ngự` : ''}${t.crit ? `, dễ bạo kích hơn` : ''}.`;
  return `${A.effectOf(t)}.`;
}

type Run = (type: 'learn' | 'loadout' | 'method', body: any) => Promise<void>;

// What is in the bag, in numbers: Bí Công and Công Pháp scrolls, how many can be read now, how many wait for a Level, how many are only duplicates.
function bagStats(st: GS) {
  const L = levelOf(st.player);
  let qty = 0, ready = 0, wait = 0, dup = 0;
  for (const [n, q] of Object.entries(st.inv.books)) {
    const t = A.TECHS[n], x = A.isMethod(n) ? A.methodOf(n) : null;
    if (!t && !x) continue;
    qty += q;
    const owned = t ? st.arts.learned.includes(n) : st.arts.methods.includes(n);
    if (owned) dup++; else if (L >= (t ? t.minLevel : x!.minLevel)) ready++; else wait++;
  }
  return { qty, ready, wait, dup };
}

export function ArtsPanel({ st, act }: { st: GS; act: Act }) {
  const [view, setView] = useState<View>('cls');
  const [flt, setFlt] = useState<Flt>('all');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const run: Run = async (type, body) => { const r = await act(type, body); setMsg({ t: r.msg, ok: r.ok }); };
  const go = (v: View, f: Flt = 'all') => { setView(v); setFlt(f); setMsg(null); };
  const nTech = ALL_TECHS.length, kTech = st.arts.learned.length, bag = bagStats(st);
  const cls = A.weaponClass(st.eq.Weapon && st.eq.Weapon.base), slots = A.slotsAt(st.player.realm), used = cls ? (st.arts.loadout[cls] || []).filter((n) => st.arts.learned.includes(n)).length : 0;
  const unlearned = ALL_TECHS.filter((t) => !st.arts.learned.includes(t.name)), withBook = unlearned.filter((t) => have(st, t.name) > 0).length;
  return (
    <div className="artsPanel">
      <div className="artSum" role="group" aria-label="Tổng quan Thần Thông">
        <button type="button" className="sumTile" onClick={() => go('known', 'learned')} title="Xem các chiêu đã học">
          <small>Đã học</small><b>{kTech}<i>/{nTech}</i></b><span>chiêu thức</span>
        </button>
        <button type="button" className="sumTile" onClick={() => go('cls')} title="Chiêu đang xếp trong ô của pháp khí đang cầm">
          <small>Dùng trong trận</small><b>{cls ? used : '–'}<i>{cls ? `/${slots} ô` : ''}</i></b><span>{cls ? A.ART(cls).name : 'chưa cầm pháp khí'}</span>
        </button>
        <button type="button" className={`sumTile ${bag.ready ? 'hot' : ''}`} onClick={() => go('books')} title="Bí Công và kinh Công Pháp đang có trong túi">
          <small>Bí kíp trong túi</small><b>{bag.qty}<i> quyển</i></b><span>{bag.ready ? `${bag.ready} học được ngay` : bag.qty ? 'chưa có quyển nào học được' : 'túi chưa có quyển nào'}</span>
        </button>
        <button type="button" className="sumTile" onClick={() => go('known', 'unlearned')} title="Xem các chiêu chưa học">
          <small>Chưa học</small><b>{unlearned.length}</b><span>{withBook ? `${withBook} đã có bí kíp` : 'chưa có bí kíp nào'}</span>
        </button>
      </div>

      <Seg<View> label="Thần Thông" value={view} onChange={(v) => go(v, v === 'known' ? flt : 'all')} options={[
        { v: 'cls', label: <><Icon name="atk" size={14} /><span>Bộ chiêu</span></>, title: 'Chiêu thức của pháp khí đang cầm: học và xếp vào ô chiêu' },
        { v: 'known', label: <><Icon name="scroll" size={14} /><span>Sổ chiêu</span></>, title: 'Mọi chiêu thức của tám môn pháp: đã học, có bí kíp, chưa học' },
        { v: 'books', label: <><Icon name="book" size={14} /><span>Bí kíp{bag.qty > 0 && <em className={bag.ready ? 'hot' : ''}>{bag.qty}</em>}</span></>, title: 'Bí Công và kinh Công Pháp trong túi' },
        { v: 'method', label: <><Icon name="lotus" size={14} /><span>Công Pháp</span></>, title: 'Công pháp tu luyện đang dùng' },
      ]} />
      <Toast msg={msg} />
      {view === 'cls' && <ClassView st={st} run={run} />}
      {view === 'known' && <KnownView st={st} run={run} flt={flt} setFlt={setFlt} />}
      {view === 'books' && <BooksView st={st} run={run} />}
      {view === 'method' && <MethodView st={st} run={run} />}
    </div>
  );
}

// ---------- Bộ chiêu: the môn of the weapon in hand, its techniques grouped by what the player has of them
function ClassView({ st, run }: { st: GS; run: Run }) {
  const L = levelOf(st.player);
  const cur = A.weaponClass(st.eq.Weapon && st.eq.Weapon.base);
  const [pick, setPick] = useState<string>(cur || A.ARTS[0].id);
  const slots = A.slotsAt(st.player.realm), used = st.arts.loadout[pick] || [];
  const full = used.length >= slots;
  const toggle = (name: string) => run('loadout', { cls: pick, names: used.includes(name) ? used.filter((n) => n !== name) : [...used, name] });
  const wep = st.eq.Weapon, a = A.ART(pick), basic = A.basicOf(pick);
  const rows = A.techsOf(pick).map((t) => ({ t, s: techStatus(st, t) }));
  const of = (...s: Status[]) => rows.filter((r) => s.includes(r.s));
  const inSlots = of('on'), learnedOnly = of('known'), bagged = of('ready', 'wait'), missing = of('none');

  const card = ({ t, s }: { t: A.Tech; s: Status }) => {
    const low = L < t.minLevel;
    return (
      <ArtCard key={t.name} name={t.name} ri={rarOf(t)} pips={t.tier + 1} state={s} lv={t.minLevel}
        tags={<><GroupChip g={t.group} />{t.el && <ElChip el={t.el} />}<span className={`chip lv ${low ? 'low' : ''}`}>Lv{t.minLevel}</span></>}
        text={techText(t)} stats={techStats(t)}
        foot={s === 'on' || s === 'known'
          ? <>
            <button type="button" className={`btn sm ${s === 'on' ? 'ghost' : 'hot'}`} disabled={s === 'known' && full} onClick={() => toggle(t.name)}>{s === 'on' ? 'Bỏ khỏi ô chiêu' : 'Đưa vào ô chiêu'}</button>
            {s === 'known' && full && <small className="acNote">Hết ô chiêu của môn này. Bỏ một chiêu khác ra trước.</small>}
          </>
          : <button type="button" className="btn sm hot" disabled={s === 'wait'} onClick={() => run('learn', { name: t.name })}>{s === 'wait' ? `Cần Lv${t.minLevel} để học (ngươi Lv${L})` : 'Học ngay bằng bí kíp trong túi'}</button>} />
    );
  };

  return (
    <>
      <details className="artGuide" open={st.arts.learned.length < 2}>
        <summary><Icon name="info" size={15} /> Thần Thông dùng thế nào?</summary>
        <ol>
          <li><b>Nhặt bí kíp</b>: thắng yêu thú hoặc Tu Sĩ có khoảng {Math.round(100 * BALANCE.bookDropP)}% rơi một quyển Bí Công. Quyển nhặt được nằm ở tab «Bí kíp».</li>
          <li><b>Học</b>: bấm «Học» ở quyển trong túi để biết chiêu đó.</li>
          <li><b>Đưa vào ô chiêu</b>: chỉ chiêu nằm trong ô mới được tung trong trận. Thêm ô khi lên Cảnh Giới.</li>
        </ol>
        <div className="rarLegend" aria-label="Màu độ hiếm">{RAR_NOTE.map((n, i) => <span key={n} style={{ '--rc': C.RCOLOR[i + 1] } as CSSProperties}><i />{n}</span>)}</div>
      </details>

      <div className="hint">
        {wep
          ? <>Đang cầm <b>{wep.name}</b>, nên ngươi dùng <b>{A.ART(cur).name}</b>. Đổi pháp khí là đổi môn pháp.</>
          : <>Chưa cầm pháp khí: ngươi chỉ có đòn «{C.NEUTRAL_SKILL}».</>}
      </div>

      <div className="artPicks" role="group" aria-label="Môn pháp">
        {A.ARTS.map((x) => {
          const list = A.techsOf(x.id), k = list.filter((t) => st.arts.learned.includes(t.name)).length, ready = list.filter((t) => techStatus(st, t) === 'ready').length;
          return (
            <button key={x.id} type="button" className={`artPick ${x.id === pick ? 'on' : ''}`} aria-pressed={x.id === pick} title={`${x.name}: ${x.style}. Đã học ${k}/${list.length}${ready ? `, ${ready} chiêu học được ngay` : ''}`} onClick={() => setPick(x.id)}>
              {x.id === cur && <span className="curMark" title="Môn của pháp khí đang cầm"><Icon name="check" size={10} /></span>}
              {ready > 0 && <span className="readyMark" title={`${ready} chiêu có bí kíp, học được ngay`}><Icon name="book" size={10} />{ready}</span>}
              <Img src={C.bookArt(x.id)} className="pickImg" fb={<span>✦</span>} />
              <b>{x.short}</b>
              <small>{k}/{list.length}</small>
            </button>
          );
        })}
      </div>

      <div className="artHead">
        <Img src={C.bookArt(pick)} className="artBook" fb={<span>✦</span>} />
        <div className="ahInfo">
          <h4>{a.name}{pick === cur && <span className="curTag">Đang cầm</span>}</h4>
          <small>{a.blurb}</small>
          <div className="slotMeter" title="Số chiêu được xếp vào trận">
            <span>Ô chiêu</span>
            {Array.from({ length: slots }, (_, i) => <i key={i} className={i < used.length ? 'on' : ''} />)}
            <b>{used.length}/{slots}</b>
          </div>
        </div>
      </div>

      <Group title="Đòn cơ bản" note="luôn có, không tốn Linh Lực">
        <ArtCard name={basic.name} ri={0} pips={0} state="basic" tags={<GroupChip g="Tấn Công" />} text={techText(basic)} stats={techStats(basic)} />
      </Group>
      <Group title="Đang dùng trong trận" note={`${used.length}/${slots} ô`} tone="on">
        {inSlots.length ? <div className="artList">{inSlots.map(card)}</div> : <div className="hint">Chưa xếp chiêu nào vào ô: trong trận ngươi chỉ dùng đòn cơ bản.</div>}
      </Group>
      {learnedOnly.length > 0 && <Group title="Đã học, chưa xếp vào ô" note="chưa được dùng trong trận" tone="known"><div className="artList">{learnedOnly.map(card)}</div></Group>}
      {bagged.length > 0 && <Group title="Có bí kíp trong túi" note="chưa học" tone="ready"><div className="artList">{bagged.map(card)}</div></Group>}
      {missing.length > 0 && (
        <Group title="Chưa học, chưa có bí kíp" note={`${missing.length} chiêu, bấm để xem chi tiết`} tone="none">
          <div className="lockList">{missing.map(({ t }) => techLock(t, L))}</div>
        </Group>
      )}
    </>
  );
}

// Something the player has neither learned nor found a book of: one line that opens to what it does and where it comes from.
function LockedRow({ name, ri, tags, text, stats, hint }: { name: string; ri: number; tags: ReactNode; text: ReactNode; stats: ReactNode; hint: ReactNode }) {
  return (
    <details className={`lockRow r${ri}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
      <summary><Icon name="lock" size={13} /><b>{name}</b><span className="rarTag">{C.RARITY[ri]}</span>{tags}</summary>
      <div className="lockBody">
        <p className="acText">{text}</p>
        <div className="acStats">{stats}</div>
        <small className="acNote"><Icon name="book" size={12} /> {hint}</small>
      </div>
    </details>
  );
}
const techLock = (t: A.Tech, L: number) => (
  <LockedRow key={t.name} name={t.name} ri={rarOf(t)} text={techText(t)} stats={techStats(t)} hint={dropHint(t)}
    tags={<><GroupChip g={t.group} />{t.el && <ElChip el={t.el} />}<span className={`chip lv ${L < t.minLevel ? 'low' : ''}`}>Lv{t.minLevel}</span></>} />
);

// ---------- Sổ chiêu: every technique of the eight môn, with what the player has of each
function KnownView({ st, run, flt, setFlt }: { st: GS; run: Run; flt: Flt; setFlt: (f: Flt) => void }) {
  const L = levelOf(st.player);
  const cur = A.weaponClass(st.eq.Weapon && st.eq.Weapon.base);
  const [g, setG] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const groups = ['all', ...A.GROUPS];
  const learnedN = ALL_TECHS.filter((t) => st.arts.learned.includes(t.name)).length;
  const fits = (s: Status) => flt === 'all' || (flt === 'learned' ? s === 'on' || s === 'known' : s !== 'on' && s !== 'known');
  const ORDER: Status[] = ['on', 'known', 'ready', 'wait', 'none'];
  const FLT: [Flt, string, number][] = [['all', 'Tất cả', ALL_TECHS.length], ['learned', 'Đã học', learnedN], ['unlearned', 'Chưa học', ALL_TECHS.length - learnedN]];
  return (
    <>
      <div className="hint">Mọi chiêu của tám môn pháp. Chiêu <b>đã học</b> sáng rõ, chiêu <b>có bí kíp</b> viền vàng (học được ngay khi đủ cấp), chiêu <b>chưa có</b> mờ hơn. Bấm vào một chiêu để xem chi tiết.</div>
      <div className="artFilter" role="group" aria-label="Lọc theo trạng thái">
        {FLT.map(([k, label, n]) => <button key={k} type="button" className={`chip flt ${k === flt ? 'on' : ''}`} aria-pressed={k === flt} onClick={() => setFlt(k)}>{label} · {n}</button>)}
      </div>
      <div className="artFilter" role="group" aria-label="Lọc theo loại chiêu">
        {groups.map((x) => <button key={x} type="button" className={`chip grp ${x === g ? 'on' : ''} ${GROUP_TONE[x] || ''}`} onClick={() => setG(x)}>{x === 'all' ? 'Mọi loại' : x}</button>)}
      </div>
      {A.ARTS.map((a) => {
        const all = A.techsOf(a.id);
        let list = all.map((t) => ({ t, s: techStatus(st, t) })).filter((r) => (g === 'all' || r.t.group === g) && fits(r.s));
        if (flt === 'unlearned') list = [...list].sort((x, y) => ORDER.indexOf(x.s) - ORDER.indexOf(y.s));   // the ones with a book first
        if (!list.length) return null;
        const k = all.filter((t) => st.arts.learned.includes(t.name)).length;
        return (
          <section key={a.id} className="artSec">
            <h4>{a.name}{a.id === cur && <small className="cur"> đang cầm</small>} <small>đã học {k}/{all.length}</small></h4>
            <div className="techGrid">
              {list.map(({ t, s }) => {
                const ri = rarOf(t), low = L < t.minLevel, isOpen = open === t.name, learned = s === 'on' || s === 'known';
                return (
                  <div key={t.name} className={`artTile r${ri} st-${s} ${learned ? 'known' : 'unknown'}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
                    <button type="button" className="tileHead" onClick={() => setOpen(isOpen ? null : t.name)} aria-expanded={isOpen}>
                      <span className="acTop"><b>{t.name}</b></span>
                      <span className="acTags"><span className="rarTag">{C.RARITY[ri]}</span><GroupChip g={t.group} />{t.el && <ElChip el={t.el} />}</span>
                      <span className="tileFoot"><Pips n={t.tier + 1} /><StateChip s={s} lv={t.minLevel} short /></span>
                    </button>
                    {isOpen && (
                      <div className="tileMore">
                        <span>{techText(t)}</span>
                        <span className="acStats">{techStats(t)}</span>
                        {s === 'none' && <span className="acNote"><Icon name="book" size={12} /> {dropHint(t)}{low ? ` Cần đạt Lv${t.minLevel} (ngươi Lv${L}).` : ''}</span>}
                        {s === 'wait' && <span className="acNote">{`Đã có bí kíp trong túi, nhưng cần Lv${t.minLevel} (ngươi Lv${L}) mới học được.`}</span>}
                        {s === 'ready' && <button type="button" className="btn sm hot" onClick={() => run('learn', { name: t.name })}>Học ngay bằng bí kíp trong túi</button>}
                        {s === 'known' && <span className="acNote">Đã học nhưng chưa xếp vào ô chiêu: vào tab «Bộ chiêu» để xếp.</span>}
                        {s === 'on' && <span className="acNote">Đang nằm trong ô chiêu: ngươi sẽ tung chiêu này trong trận.</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {A.ARTS.every((a) => !A.techsOf(a.id).some((t) => (g === 'all' || t.group === g) && fits(techStatus(st, t)))) && <div className="hint">Không có chiêu nào khớp bộ lọc này.</div>}
    </>
  );
}

// ---------- Bí kíp: every Bí Công and Công Pháp scroll in the bag, grouped by what can be done with it
function BooksView({ st, run }: { st: GS; run: Run }) {
  const L = levelOf(st.player);
  type Row = { n: string; q: number; kind: 'tech' | 'method'; tier: number; need: number; owned: boolean; sub: string };
  const rows: Row[] = Object.entries(st.inv.books).flatMap(([n, q]): Row[] => {
    if (A.TECHS[n]) { const t = A.TECHS[n]; return [{ n, q, kind: 'tech', tier: t.tier, need: t.minLevel, owned: st.arts.learned.includes(n), sub: `Bí Công · ${A.ART(t.cls).name} · ${t.group}` }]; }
    if (A.isMethod(n)) { const x = A.methodOf(n); return [{ n, q, kind: 'method', tier: x.tier, need: x.minLevel, owned: st.arts.methods.includes(n), sub: 'Kinh Công Pháp' }]; }
    return [];
  }).sort((x, y) => y.tier - x.tier);
  const ready = rows.filter((r) => !r.owned && L >= r.need), wait = rows.filter((r) => !r.owned && L < r.need), dup = rows.filter((r) => r.owned);

  const row = (r: Row, mode: 'ready' | 'wait' | 'dup') => {
    const ri = r.tier + 1, stones = BALANCE.dupBookStones[r.tier];
    const line = mode === 'ready' ? (r.kind === 'tech' ? 'Chưa học. Bấm «Học» để biết chiêu này.' : 'Chưa học. Bấm «Học» để thêm vào các Công Pháp ngươi biết.')
      : mode === 'wait' ? `Cần Lv${r.need} mới học được (ngươi Lv${L}). Quyển vẫn nằm trong túi.`
        : `Đã biết từ trước. Đổi quyển này lấy ${stones} Linh Thạch.`;
    return (
      <div key={r.n} className={`bookRow r${ri} ${mode}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
        <Img src={C.bookArt(r.kind === 'tech' ? A.TECHS[r.n].cls : 'method')} className="artBookSm" fb={<span>✦</span>} />
        <div className="bkInfo">
          <b>{r.n} <small>×{r.q}</small></b>
          <small>{C.RARITY[ri]} · {r.sub}</small>
          <small className="bkState">{line}</small>
        </div>
        <button type="button" className={`btn sm ${mode === 'ready' ? 'hot' : ''}`} disabled={mode === 'wait'} title={mode === 'wait' ? `Cần Lv${r.need}` : undefined} onClick={() => run('learn', { name: r.n })}>
          {mode === 'wait' ? `Lv${r.need}` : mode === 'dup' ? `Đổi +${stones}` : 'Học'}
        </button>
      </div>
    );
  };

  if (rows.length === 0) {
    return (
      <div className="artEmpty">
        <Icon name="book" size={28} />
        <b>Túi chưa có bí kíp nào</b>
        <p>Thắng yêu thú hoặc Tu Sĩ có khoảng {Math.round(100 * BALANCE.bookDropP)}% rơi một quyển Bí Công (kinh Công Pháp hiếm hơn, khoảng {(BALANCE.methodDropP * 100).toFixed(1)}%).</p>
        {st.set.autoLearn
          ? <p>Đang bật <b>Tự học Bí Công</b>: quyển nhặt được sẽ được học ngay nên túi luôn trống. Muốn tự chọn lúc học, tắt trong Cài đặt. Chiêu đã học xem ở tab «Sổ chiêu».</p>
          : <p>Quyển nhặt được sẽ nằm ở đây để ngươi tự học.</p>}
      </div>
    );
  }
  return (
    <section className="artBooks">
      {ready.length > 0 && <Group title="Học được ngay" note={`${ready.reduce((n, r) => n + r.q, 0)} quyển`} tone="ready"><div className="bookList">{ready.map((r) => row(r, 'ready'))}</div></Group>}
      {wait.length > 0 && <Group title="Chưa đủ cấp để học" note="quyển vẫn được giữ" tone="wait"><div className="bookList">{wait.map((r) => row(r, 'wait'))}</div></Group>}
      {dup.length > 0 && <Group title="Đã biết, đổi lấy Linh Thạch" note="quyển trùng chiêu đã học" tone="known"><div className="bookList">{dup.map((r) => row(r, 'dup'))}</div></Group>}
      {st.set.autoLearn && <div className="hint">Đang bật <b>Tự học Bí Công</b>: quyển mới nhặt được sẽ học ngay, chỉ quyển chưa đủ cấp hoặc trùng chiêu mới nằm lại đây.</div>}
    </section>
  );
}

// ---------- Công Pháp
function MethodView({ st, run }: { st: GS; run: Run }) {
  const L = levelOf(st.player);
  const cur = A.methodOf(st.arts.method), speed = A.methodSpeed(st.arts.method, st.player.linh);
  const pct = Math.round(BALANCE.methodStatBias * 100);
  const detail = (x: A.Method) => (
    <>
      <Stat icon="cult" label="Tu luyện" value={`×${x.speed.toFixed(2)}`} />
      {x.bias.map((b) => <Stat key={b} icon={b === 'hp' ? 'hp' : b === 'atk' ? 'atk' : b === 'def' ? 'def' : b === 'spd' ? 'spd' : 'lotus'} label={BIAS_VI[b]} value={`+${pct}%`} />)}
    </>
  );
  const rows = A.METHODS.map((x) => ({ x, s: methodStatus(st, x) }));
  const card = ({ x, s }: { x: A.Method; s: Status }) => {
    const low = L < x.minLevel, ri = x.tier + 1;
    return (
      <ArtCard key={x.name} name={x.name} ri={ri} pips={x.tier + 1} state={s} unit="method" lv={x.minLevel}
        tags={<>{x.el ? <ElChip el={x.el} /> : <span className="chip">không hệ</span>}<span className={`chip lv ${low ? 'low' : ''}`}>Lv{x.minLevel}</span></>}
        text={x.desc}
        stats={detail(x)}
        foot={s === 'on' || s === 'known'
          ? <button type="button" className={`btn sm ${s === 'on' ? 'ghost' : 'hot'}`} disabled={s === 'on'} onClick={() => run('method', { name: x.name })}>{s === 'on' ? 'Đang dùng' : 'Dùng công pháp này'}</button>
          : s === 'ready' ? <button type="button" className="btn sm hot" onClick={() => run('learn', { name: x.name })}>Học ngay bằng cuốn kinh trong túi</button>
            : s === 'wait' ? <button type="button" className="btn sm" disabled>Cần Lv{x.minLevel} để học (ngươi Lv{L})</button> : undefined} />
    );
  };
  const owned = rows.filter((r) => r.s === 'on' || r.s === 'known'), bagged = rows.filter((r) => r.s === 'ready' || r.s === 'wait'), missing = rows.filter((r) => r.s === 'none');
  return (
    <>
      <div className="hint">Công Pháp là cách ngươi tu luyện, tác động liên tục (không cần chiến đấu). Công Pháp hợp hệ Linh Căn tu luyện nhanh hơn thêm {Math.round(BALANCE.methodAffinityBonus * 100)}%, và cộng thêm vào vài chỉ số gốc. Chỉ một Công Pháp được dùng một lúc.</div>
      <div className={`methodNow r${cur.tier + 1}`} style={{ '--rc': C.RCOLOR[cur.tier + 1] } as CSSProperties}>
        <small className="mnLbl">Đang tu luyện</small>
        <div className="acTop"><div className="acName"><b>{cur.name}</b><span className="rarTag">{A.METHOD_TIER[cur.tier]}</span></div><Pips n={cur.tier + 1} /></div>
        <small>{cur.desc}</small>
        <div className="acStats"><Stat icon="cult" label="Tốc độ tu luyện hiện tại" value={`×${speed.toFixed(2)}`} /></div>
        {cur.el && st.player.linh.includes(cur.el) && <small className="acNote">Đã gồm thưởng hợp hệ {cur.el}.</small>}
      </div>
      <Group title="Đã học" note={`${owned.length}/${A.METHODS.length} Công Pháp`} tone="known"><div className="artList">{owned.map(card)}</div></Group>
      {bagged.length > 0 && <Group title="Có kinh trong túi" note="chưa học" tone="ready"><div className="artList">{bagged.map(card)}</div></Group>}
      {missing.length > 0 && (
        <Group title="Chưa học, chưa có kinh" note={`${missing.length} Công Pháp, bấm để xem chi tiết`} tone="none">
          <div className="lockList">{missing.map(({ x }) => (
            <LockedRow key={x.name} name={x.name} ri={x.tier + 1} text={x.desc} stats={detail(x)} hint={`${methodHint}${L < x.minLevel ? ` Cần đạt Lv${x.minLevel} (ngươi Lv${L}).` : ''}`}
              tags={<>{x.el ? <ElChip el={x.el} /> : <span className="chip">không hệ</span>}<span className={`chip lv ${L < x.minLevel ? 'low' : ''}`}>Lv{x.minLevel}</span></>} />
          ))}</div>
        </Group>
      )}
    </>
  );
}
