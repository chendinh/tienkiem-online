'use client';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { GS } from '@/lib/client/types';
import { Icon, type IconName } from './ds/Icon';
import { BeastJobs, PillJobs, MatJobs, readyCount } from './JobCards';
import { OrdersPanel, fillableCount } from './Orders';
import { ExpoPanel } from './Expo';
import { WorkPanel, workReady } from './Work';
import type { Act } from './Panels';
import { XSeal } from './ds/ModalClose';

// Công việc: a place of its own for jobs a player may take up if they like (it is not the daily quests, and nothing is lost by leaving a job alone).
// A kind of job is one entry of JOB_KINDS: a name, a line about it, how many jobs of it could be done right now (for the badge), and the panel that shows them.
// To add a kind, write its panel and add an entry here; the window, the tabs and the badges follow.
export interface JobKind { id: string; slug: string /* in the address: ?cong-viec=<slug> */; name: string; icon: IconName; line: string; ready: (st: GS) => number; Panel: ComponentType<{ st: GS; act: Act }> }
export const JOB_KINDS: JobKind[] = [
  { id: 'items', slug: 'tim-do', name: 'Tìm đồ', icon: 'robe', line: 'Khách ở Phường Thị nhờ tìm đồ. Có món nào đưa món đó, đủ thì có thưởng.', ready: fillableCount, Panel: OrdersPanel },
  { id: 'beasts', slug: 'tim-thu', name: 'Tìm thú', icon: 'paw', line: 'Khách nhờ tìm Linh Thú. Con nào hợp thì giao, giá cao hơn bán ở chuồng.', ready: (st) => readyCount(st, 'beast'), Panel: BeastJobs },
  { id: 'pills', slug: 'dat-dan', name: 'Đặt đan', icon: 'flame', line: 'Khách đặt Hồi Khí Đan. Luyện được bao nhiêu giao bấy nhiêu.', ready: (st) => readyCount(st, 'pill'), Panel: PillJobs },
  { id: 'mats', slug: 'nguyen-lieu', name: 'Nguyên liệu', icon: 'sparkle', line: 'Khách thu nguyên liệu. Gom được bao nhiêu giao bấy nhiêu.', ready: (st) => readyCount(st, 'mat'), Panel: MatJobs },
  { id: 'work', slug: 'thu-di-lam', name: 'Thú đi làm', icon: 'zoo', line: 'Cử Linh Thú hợp yêu cầu đi làm. Làm xong nhận thưởng, thú vẫn là của ngươi.', ready: workReady, Panel: WorkPanel },
  { id: 'expo', slug: 'trien-lam', name: 'Triển lãm', icon: 'cloud', line: 'Bày 3 đến 6 món của ngươi trên mây. Khách tu sĩ ghé xem, ai mê thì tặng quà, ai chê thì ngươi cũng chẳng mất gì.', ready: () => 0 /* a place to look at, not a job to finish: no green dot */, Panel: ExpoPanel },
];
/** How many jobs could be done right now, over every kind (the badge on the Công việc buttons). */
export const jobsReady = (st: GS): number => JOB_KINDS.reduce((n, k) => n + k.ready(st), 0);

/** False for the first two frames after the window shows: the window and its tabs are drawn first, the cards (pictures, lists) follow, so opening never waits for them. */
function useAfterOpen(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let a = requestAnimationFrame(() => { a = requestAnimationFrame(() => setOn(true)); });
    return () => cancelAnimationFrame(a);
  }, []);
  return on;
}

export function JobsPanel({ st, act, tab, setTab }: { st: GS; act: Act; tab: string; setTab: (id: string) => void }) {
  const kind = useDeferredValue(tab);   // the tab lights up at once; the cards of the new kind are built right after, without holding the tap
  const k = JOB_KINDS.find((x) => x.id === kind) || JOB_KINDS[0];
  const shown = useAfterOpen();
  const ready = useMemo(() => JOB_KINDS.map((x) => x.ready(st)), [st]);   // the dots of the tabs: worked out once per state, not once per redraw
  return (
    <div className="jobsPanel">
      {JOB_KINDS.length > 1
        ? (
          <div className="jobTabs" role="tablist" aria-label="Loại công việc">
            {JOB_KINDS.map((x, i) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === tab} className={`jobTab${x.id === tab ? ' on' : ''}`} onClick={() => setTab(x.id)}>
                <span className="jobTabIco"><Icon name={x.icon} size={20} /></span>
                <span className="jobTabNm">{x.name}</span>
                {ready[i] > 0 && <i className="navDot" aria-label="Có việc làm được ngay" />}
              </button>
            ))}
          </div>
        )
        : <h4 className="jobKind"><Icon name="job" size={16} /> {k.name}</h4>}
      <div className="hint">{k.line}</div>
      {shown ? <div className={`jobsBody${kind !== tab ? ' stale' : ''}`}><k.Panel st={st} act={act} /></div> : <div className="jobsWait" aria-busy="true" />}
    </div>
  );
}
// ---- the Công việc screen: a full screen of its own inside the game (not a window over it, not a page of its own).
// It covers the whole game, and the game under it is hidden (components/Game.tsx: .app.jobsOn), so its journey, fight replays and loops stop drawing and the screen has the device to
// itself; the state, the polling and the instant actions stay the game's, nothing is loaded again. It has an address: ?cong-viec=<slug of the tab>, so the Back button of the browser
// or the phone closes it instead of leaving the game, a reload comes back to the same tab, and a link opens it.
export const JOBS_PARAM = 'cong-viec';
const bySlug = (slug: string | null) => JOB_KINDS.find((k) => k.slug === slug);
let lastTab = JOB_KINDS[0].id;   // the tab it was left on, for the next time it opens (this page only)
let pushedUrl: string | null = null;   // the address this screen pushed when it opened: closing goes back past it
const urlWith = (slug: string | null) => { const u = new URL(window.location.href); if (slug) u.searchParams.set(JOBS_PARAM, slug); else u.searchParams.delete(JOBS_PARAM); return u.toString(); };
/** The tab named in the address, if the page was opened on one (the game opens the screen when it is). */
export const jobsInUrl = (): boolean => typeof window !== 'undefined' && !!bySlug(new URL(window.location.href).searchParams.get(JOBS_PARAM));

export function JobsScreen({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  const [tab, setTabState] = useState(() => (typeof window !== 'undefined' && bySlug(new URL(window.location.href).searchParams.get(JOBS_PARAM))?.id) || lastTab);
  const k = JOB_KINDS.find((x) => x.id === tab) || JOB_KINDS[0];
  const shut = useRef(onClose); shut.current = onClose;
  const scroll = useRef<HTMLDivElement>(null);
  // the address: pushed once when the screen opens (not when it was opened from the address), changed in place when the tab changes
  useEffect(() => {
    const here = new URL(window.location.href).searchParams.get(JOBS_PARAM);
    if (here !== k.slug) {
      const to = urlWith(k.slug);
      if (here) window.history.replaceState(null, '', to); else { window.history.pushState(null, '', to); pushedUrl = to; }
    }
  }, [k.slug]);
  // Back (the browser's or the phone's): the address lost its tab, so the screen closes
  useEffect(() => {
    const pop = () => { if (!new URL(window.location.href).searchParams.get(JOBS_PARAM)) { pushedUrl = null; shut.current(); } };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const close = useCallback(() => {
    if (pushedUrl && pushedUrl === window.location.href) { pushedUrl = null; window.history.back(); return; }   // popstate closes it
    pushedUrl = null; window.history.replaceState(null, '', urlWith(null)); shut.current();
  }, []);
  // Esc closes it, unless a window is open over it (that window takes the Esc)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.modal')) close(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close]);
  // the game under it is hidden while it is open, so the page keeps no scroll of its own: put it back where it was on the way out
  useLayoutEffect(() => { const y = window.scrollY; return () => { requestAnimationFrame(() => window.scrollTo(0, y)); }; }, []);
  const setTab = useCallback((id: string) => { lastTab = id; setTabState(id); scroll.current?.scrollTo({ top: 0 }); }, []);
  return (
    <div className="jobsScreen" role="dialog" aria-modal="true" aria-label="Công việc">
      <header className="jobsBar">
        <button type="button" className="jobsBack" onClick={close} aria-label="Quay lại hành trình" title="Quay lại hành trình (Esc)"><Icon name="back" size={20} /></button>
        <span className="winSeal"><Icon name="job" size={20} /></span>
        <div className="jobsTitle"><h2>Công việc</h2><small>{k.name}</small></div>
        <button type="button" className="xClose static" aria-label="Đóng Công việc" title="Đóng (Esc)" onClick={close}><XSeal size={34} /></button>
      </header>
      <div className="jobsScroll" ref={scroll}>
        <div className="jobsInner"><JobsPanel st={st} act={act} tab={tab} setTab={setTab} /></div>
      </div>
    </div>
  );
}
