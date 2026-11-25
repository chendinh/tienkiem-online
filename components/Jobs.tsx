'use client';
import { useDeferredValue, useEffect, useMemo, useState, type ComponentType } from 'react';
import type { GS } from '@/lib/client/types';
import { Icon, type IconName } from './ds/Icon';
import { BeastJobs, PillJobs, MatJobs, readyCount } from './JobCards';
import { OrdersPanel, fillableCount } from './Orders';
import { ExpoPanel } from './Expo';
import { Window, type Act } from './Panels';

// Công việc: a place of its own for jobs a player may take up if they like (it is not the daily quests, and nothing is lost by leaving a job alone).
// A kind of job is one entry of JOB_KINDS: a name, a line about it, how many jobs of it could be done right now (for the badge), and the panel that shows them.
// To add a kind, write its panel and add an entry here; the window, the tabs and the badges follow.
export interface JobKind { id: string; name: string; icon: IconName; line: string; ready: (st: GS) => number; Panel: ComponentType<{ st: GS; act: Act }> }
export const JOB_KINDS: JobKind[] = [
  { id: 'items', name: 'Tìm đồ', icon: 'robe', line: 'Khách ở Phường Thị nhờ tìm đồ. Có món nào đưa món đó, đủ thì có thưởng.', ready: fillableCount, Panel: OrdersPanel },
  { id: 'beasts', name: 'Tìm thú', icon: 'paw', line: 'Khách nhờ tìm Linh Thú. Con nào hợp thì giao, giá cao hơn bán ở chuồng.', ready: (st) => readyCount(st, 'beast'), Panel: BeastJobs },
  { id: 'pills', name: 'Đặt đan', icon: 'flame', line: 'Khách đặt Hồi Khí Đan. Luyện được bao nhiêu giao bấy nhiêu.', ready: (st) => readyCount(st, 'pill'), Panel: PillJobs },
  { id: 'mats', name: 'Nguyên liệu', icon: 'sparkle', line: 'Khách thu nguyên liệu. Gom được bao nhiêu giao bấy nhiêu.', ready: (st) => readyCount(st, 'mat'), Panel: MatJobs },
  { id: 'expo', name: 'Triển lãm', icon: 'cloud', line: 'Bày 3 đến 6 món của ngươi trên mây. Khách tu sĩ ghé xem, ai mê thì tặng quà, ai chê thì ngươi cũng chẳng mất gì.', ready: () => 0 /* a place to look at, not a job to finish: no green dot */, Panel: ExpoPanel },
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

export function JobsPanel({ st, act }: { st: GS; act: Act }) {
  const [tab, setTab] = useState(JOB_KINDS[0].id);
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
export function JobsModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  return <Window title="Công việc" icon="job" sub="Việc nhờ ở Phường Thị. Muốn làm việc nào thì làm" onClose={onClose}><JobsPanel st={st} act={act} /></Window>;
}
