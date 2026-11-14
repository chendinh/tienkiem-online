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

// Thần Thông: the môn pháp of the weapon in hand and its techniques, the overview of everything learned, and the Công Pháp (cultivation method).
// Every technique and method wears the colour of its rarity (Hoàng green, Huyền blue, Địa purple, Thiên orange), the same colours as the items.
type View = 'cls' | 'known' | 'method';
const GROUP_TONE: Record<string, string> = { 'Tấn Công': 'atk', 'Phòng Thủ': 'def', 'Hồi Phục': 'heal', 'Cường Hóa': 'buff', 'Suy Yếu': 'debuff', 'Khống Chế': 'ctrl' };
const GROUP_HELP: Record<string, string> = { 'Tấn Công': 'Gây sát thương', 'Phòng Thủ': 'Giảm sát thương nhận vào', 'Hồi Phục': 'Hồi Sinh Lực', 'Cường Hóa': 'Tăng sức mình', 'Suy Yếu': 'Làm địch yếu đi', 'Khống Chế': 'Làm địch mất lượt' };
const GroupChip = ({ g }: { g: string }) => <span className={`chip grp ${GROUP_TONE[g] || ''}`} title={GROUP_HELP[g]}>{g}</span>;
const BIAS_VI: Record<string, string> = { hp: 'Sinh Lực', spirit: 'Linh Lực', atk: 'Công Kích', def: 'Phòng Ngự', spd: 'Thân Pháp' };

// rarity index into C.RARITY / C.RCOLOR: the basic attack is Phàm (0), Hoàng..Thiên techniques are 1..4
const rarOf = (t: A.Tech) => (t.basic ? 0 : t.tier + 1);
const RAR_NOTE = ['Hoàng: phổ thông', 'Huyền: khá hiếm', 'Địa: hiếm', 'Thiên: cực hiếm'];

function Pips({ n }: { n: number }) {
  return <span className="pips" role="img" aria-label={n ? `Độ hiếm ${n} trên 4` : 'Đòn cơ bản'}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>;
}
const Stat = ({ icon, label, value }: { icon: string; label: string; value: string }) => <span className="acStat"><Icon name={icon} size={13} /><small>{label}</small><b>{value}</b></span>;
const StateChip = ({ s }: { s: 'on' | 'known' | 'locked' }) => (
  <span className={`chip st ${s}`}>{s === 'on' ? <><Icon name="check" size={12} /> Trong ô chiêu</> : s === 'known' ? 'Đã học' : <><Icon name="lock" size={12} /> Chưa học</>}</span>
);

interface CardProps { name: string; ri: number; pips: number; state: 'on' | 'known' | 'locked'; tags?: ReactNode; text?: ReactNode; stats?: ReactNode; foot?: ReactNode }
function ArtCard({ name, ri, pips, state, tags, text, stats, foot }: CardProps) {
  return (
    <article className={`artCard r${ri} ${state}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
      <div className="acTop">
        <div className="acName"><b>{name}</b><span className="rarTag">{ri === 0 ? 'Cơ bản' : C.RARITY[ri]}</span></div>
        <Pips n={pips} />
      </div>
      <div className="acTags"><StateChip s={state} />{tags}</div>
      {text && <p className="acText">{text}</p>}
      {stats && <div className="acStats">{stats}</div>}
      {foot && <div className="acFoot">{foot}</div>}
    </article>
  );
}

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

export function ArtsPanel({ st, act }: { st: GS; act: Act }) {
  const [view, setView] = useState<View>('cls');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const run = async (type: 'learn' | 'loadout' | 'method', body: any) => { const r = await act(type, body); setMsg({ t: r.msg, ok: r.ok }); };
  const nTech = Object.values(A.TECHS).filter((t) => !t.basic).length, kTech = st.arts.learned.length;
  return (
    <div className="artsPanel">
      <Seg<View> label="Thần Thông" value={view} onChange={(v) => { setView(v); setMsg(null); }} options={[
        { v: 'cls', label: <><Icon name="atk" size={14} /><span>Bộ chiêu</span></>, title: 'Chiêu thức của pháp khí đang cầm: học và xếp vào ô chiêu' },
        { v: 'known', label: <><Icon name="book" size={14} /><span>Sổ chiêu <em>{kTech}/{nTech}</em></span></>, title: 'Mọi chiêu thức ngươi đã học và chưa học, theo từng môn' },
        { v: 'method', label: <><Icon name="lotus" size={14} /><span>Công Pháp</span></>, title: 'Công pháp tu luyện đang dùng' },
      ]} />
      {msg && <div className={`eqMsg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.t}</div>}
      {view === 'cls' && <ClassView st={st} run={run} />}
      {view === 'known' && <KnownView st={st} />}
      {view === 'method' && <MethodView st={st} run={run} />}
    </div>
  );
}

type Run = (type: 'learn' | 'loadout' | 'method', body: any) => Promise<void>;

// The Bí Công and Công Pháp scrolls in the bag, with a button to read each one.
function Books({ st, run, kind }: { st: GS; run: Run; kind: 'tech' | 'method' }) {
  const L = levelOf(st.player);
  const rows = Object.entries(st.inv.books).filter(([n]) => (kind === 'tech' ? A.TECHS[n] : A.isMethod(n)));
  rows.sort((x, y) => (kind === 'tech' ? A.TECHS[x[0]].tier - A.TECHS[y[0]].tier : A.methodOf(x[0]).tier - A.methodOf(y[0]).tier));
  const what = kind === 'tech' ? 'Bí Công' : 'cuốn kinh Công Pháp';
  return (
    <section className="artBooks">
      <h4 className="artBooksTitle"><Icon name="book" size={16} /> {kind === 'tech' ? 'Bí Công' : 'Kinh Công Pháp'} trong túi {rows.length > 0 && <small>{rows.reduce((n, [, q]) => n + q, 0)} quyển</small>}</h4>
      {rows.length === 0
        ? <div className="hint">Chưa có quyển nào. {st.set.autoLearn ? `Nhặt được ${what} sẽ tự học ngay (đổi trong Cài đặt).` : `${what[0].toUpperCase()}${what.slice(1)} nhặt được sẽ nằm ở đây để ngươi tự học.`}</div>
        : rows.map(([n, q]) => {
          const t = kind === 'tech' ? A.TECHS[n] : null, mth = kind === 'method' ? A.methodOf(n) : null;
          const need = t ? t.minLevel : mth!.minLevel, low = L < need;
          const dup = t ? st.arts.learned.includes(n) : st.arts.methods.includes(n);
          const ri = (t ? t.tier : mth!.tier) + 1;
          return (
            <div key={n} className={`bookRow r${ri}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties}>
              <Img src={kind === 'tech' ? C.bookArt(t!.cls) : C.bookArt('method')} className="artBookSm" fb={<span>✦</span>} />
              <div className="bkInfo">
                <b>{n} <small>×{q}</small></b>
                <small>{C.RARITY[ri]} · {t ? `${A.ART(t.cls).name} · ${t.group}` : 'Công Pháp'}{dup ? ' · đã biết, đọc để đổi Linh Thạch' : ''}</small>
              </div>
              <button className="btn sm hot" disabled={low} title={low ? `Cần Lv${need}` : undefined} onClick={() => run('learn', { name: n })}>{low ? `Lv${need}` : dup ? 'Đổi' : 'Học'}</button>
            </div>
          );
        })}
    </section>
  );
}

function ClassView({ st, run }: { st: GS; run: Run }) {
  const L = levelOf(st.player);
  const cur = A.weaponClass(st.eq.Weapon && st.eq.Weapon.base);
  const [pick, setPick] = useState<string>(cur || A.ARTS[0].id);
  const slots = A.slotsAt(st.player.realm);
  const a = A.ART(pick), used = st.arts.loadout[pick] || [];
  const full = used.length >= slots;
  const toggle = (name: string) => run('loadout', { cls: pick, names: used.includes(name) ? used.filter((n) => n !== name) : [...used, name] });
  const wep = st.eq.Weapon;
  const basic = A.basicOf(pick);
  return (
    <>
      <details className="artGuide" open>
        <summary><Icon name="info" size={15} /> Thần Thông dùng thế nào?</summary>
        <ol>
          <li><b>Nhặt Bí Công</b>: thắng yêu thú hoặc Tu Sĩ có khoảng {Math.round(100 * BALANCE.bookDropP)}% rơi một quyển.</li>
          <li><b>Học</b>: bấm «Học» ở quyển trong túi để biết chiêu.</li>
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
          const n = A.techsOf(x.id).length, k = A.techsOf(x.id).filter((t) => st.arts.learned.includes(t.name)).length;
          return (
            <button key={x.id} type="button" className={`artPick ${x.id === pick ? 'on' : ''}`} aria-pressed={x.id === pick} title={`${x.name}: ${x.style}`} onClick={() => setPick(x.id)}>
              {x.id === cur && <span className="curMark" title="Môn của pháp khí đang cầm"><Icon name="check" size={10} /></span>}
              <Img src={C.bookArt(x.id)} className="pickImg" fb={<span>✦</span>} />
              <b>{x.short}</b>
              <small>{k}/{n}</small>
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

      <div className="artList">
        <ArtCard name={basic.name} ri={0} pips={0} state="known" tags={<GroupChip g="Tấn Công" />} text={techText(basic)} stats={techStats(basic)} />
        {A.techsOf(pick).map((t) => {
          const known = st.arts.learned.includes(t.name), on = used.includes(t.name), low = L < t.minLevel, have = (st.inv.books[t.name] || 0) > 0;
          const state = on ? 'on' : known ? 'known' : 'locked';
          return (
            <ArtCard key={t.name} name={t.name} ri={rarOf(t)} pips={t.tier + 1} state={state}
              tags={<><GroupChip g={t.group} />{t.el && <ElChip el={t.el} />}<span className={`chip lv ${low ? 'low' : ''}`}>Lv{t.minLevel}</span></>}
              text={techText(t)}
              stats={techStats(t)}
              foot={known
                ? <>
                  <button type="button" className={`btn sm ${on ? 'ghost' : 'hot'}`} disabled={!on && full} onClick={() => toggle(t.name)}>{on ? 'Bỏ khỏi ô' : 'Đưa vào ô chiêu'}</button>
                  {!on && full && <small className="acNote">Hết ô chiêu của môn này. Bỏ một chiêu khác ra trước.</small>}
                </>
                : have
                  ? <button type="button" className="btn sm hot" disabled={low} onClick={() => run('learn', { name: t.name })}>{low ? `Cần Lv${t.minLevel} để học (ngươi Lv${L})` : 'Học ngay (có Bí Công trong túi)'}</button>
                  : <small className="acNote"><Icon name="lock" size={12} /> Cần Bí Công «{t.name}» (rơi khi thắng địch){low ? `, và đạt Lv${t.minLevel} (ngươi Lv${L})` : ''}.</small>} />
          );
        })}
      </div>
      <Books st={st} run={run} kind="tech" />
    </>
  );
}

// Everything learned across all the môn, so the player can see what the character can do (and what is still missing).
function KnownView({ st }: { st: GS }) {
  const L = levelOf(st.player);
  const cur = A.weaponClass(st.eq.Weapon && st.eq.Weapon.base);
  const [g, setG] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const groups = ['all', ...A.GROUPS];
  const count = (grp: string) => Object.values(A.TECHS).filter((t) => !t.basic && (grp === 'all' || t.group === grp) && st.arts.learned.includes(t.name)).length;
  return (
    <>
      <div className="hint">Mọi chiêu của tám môn pháp. Chiêu đã học sáng rõ, chiêu chưa học mờ hơn. Màu viền là độ hiếm. Bấm vào một chiêu để xem chi tiết.</div>
      <div className="artFilter">
        {groups.map((x) => <button key={x} type="button" className={`chip grp ${x === g ? 'on' : ''} ${GROUP_TONE[x] || ''}`} onClick={() => setG(x)}>{x === 'all' ? 'Tất cả' : x} · {count(x)}</button>)}
      </div>
      {A.ARTS.map((a) => {
        const list = A.techsOf(a.id).filter((t) => g === 'all' || t.group === g);
        if (!list.length) return null;
        const k = A.techsOf(a.id).filter((t) => st.arts.learned.includes(t.name)).length;
        return (
          <section key={a.id} className="artSec">
            <h4>{a.name}{a.id === cur && <small className="cur"> đang cầm</small>} <small>{k}/{A.techsOf(a.id).length}</small></h4>
            <div className="techGrid">
              {list.map((t) => {
                const known = st.arts.learned.includes(t.name), slotted = (st.arts.loadout[a.id] || []).includes(t.name), ri = rarOf(t);
                return (
                  <button type="button" key={t.name} className={`artTile r${ri} ${known ? 'known' : 'unknown'} ${slotted ? 'slotted' : ''}`} style={{ '--rc': C.RCOLOR[ri] } as CSSProperties} onClick={() => setOpen(open === t.name ? null : t.name)} aria-expanded={open === t.name}>
                    <span className="acTop"><b>{t.name}</b></span>
                    <span className="acTags"><span className="rarTag">{C.RARITY[ri]}</span><GroupChip g={t.group} />{t.el && <ElChip el={t.el} />}</span>
                    <span className="tileFoot"><Pips n={t.tier + 1} /><small>{known ? (slotted ? 'Trong ô chiêu' : 'Đã học') : `Chưa học · Lv${t.minLevel}${L >= t.minLevel ? '' : ' (chưa đủ)'}`}</small></span>
                    {open === t.name && <span className="tileMore"><span>{techText(t)}</span><span className="acStats">{techStats(t)}</span>{!known && <span className="acNote">Cần tìm Bí Công «{t.name}».</span>}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

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
  return (
    <>
      <div className="hint">Công Pháp là cách ngươi tu luyện, tác động liên tục (không cần chiến đấu). Công Pháp hợp hệ Linh Căn tu luyện nhanh hơn thêm {Math.round(BALANCE.methodAffinityBonus * 100)}%, và cộng thêm vào vài chỉ số gốc. Cuốn kinh rơi hiếm hơn Bí Công (khoảng {(BALANCE.methodDropP * 100).toFixed(1)}% sau mỗi trận thắng).</div>
      <div className={`methodNow r${cur.tier + 1}`} style={{ '--rc': C.RCOLOR[cur.tier + 1] } as CSSProperties}>
        <small className="mnLbl">Đang tu luyện</small>
        <div className="acTop"><div className="acName"><b>{cur.name}</b><span className="rarTag">{A.METHOD_TIER[cur.tier]}</span></div><Pips n={cur.tier + 1} /></div>
        <small>{cur.desc}</small>
        <div className="acStats"><Stat icon="cult" label="Tốc độ tu luyện hiện tại" value={`×${speed.toFixed(2)}`} /></div>
        {cur.el && st.player.linh.includes(cur.el) && <small className="acNote">Đã gồm thưởng hợp hệ {cur.el}.</small>}
      </div>
      <div className="artList">
        {A.METHODS.map((x) => {
          const known = st.arts.methods.includes(x.name), on = st.arts.method === x.name, low = L < x.minLevel, ri = x.tier + 1;
          return (
            <ArtCard key={x.name} name={x.name} ri={ri} pips={x.tier + 1} state={on ? 'on' : known ? 'known' : 'locked'}
              tags={<>{x.el ? <ElChip el={x.el} /> : <span className="chip">không hệ</span>}<span className={`chip lv ${low ? 'low' : ''}`}>Lv{x.minLevel}</span></>}
              text={known ? x.desc : `Cần cuốn kinh «${x.name}»${low ? ` và đạt Lv${x.minLevel} (ngươi Lv${L})` : ''}.`}
              stats={detail(x)}
              foot={known ? <button type="button" className={`btn sm ${on ? 'ghost' : 'hot'}`} disabled={on} onClick={() => run('method', { name: x.name })}>{on ? 'Đang dùng' : 'Dùng công pháp này'}</button> : undefined} />
          );
        })}
      </div>
      <Books st={st} run={run} kind="method" />
    </>
  );
}
