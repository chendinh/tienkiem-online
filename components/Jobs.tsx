'use client';
import { useState, type ComponentType } from 'react';
import type { GS } from '@/lib/client/types';
import { Icon, type IconName } from './ds/Icon';
import { BeastJobs, PillJobs, MatJobs, readyCount } from './JobCards';
import { OrdersPanel, fillableCount } from './Orders';
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
];
/** How many jobs could be done right now, over every kind (the badge on the Công việc buttons). */
export const jobsReady = (st: GS): number => JOB_KINDS.reduce((n, k) => n + k.ready(st), 0);

export function JobsPanel({ st, act }: { st: GS; act: Act }) {
  const [kind, setKind] = useState(JOB_KINDS[0].id);
  const k = JOB_KINDS.find((x) => x.id === kind) || JOB_KINDS[0];
  return (
    <div className="jobsPanel">
      {JOB_KINDS.length > 1
        ? (
          <div className="jobTabs" role="tablist" aria-label="Loại công việc">
            {JOB_KINDS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === k.id} className={`jobTab${x.id === k.id ? ' on' : ''}`} onClick={() => setKind(x.id)}>
                <span className="jobTabIco"><Icon name={x.icon} size={20} /></span>
                <span className="jobTabNm">{x.name}</span>
                {x.ready(st) > 0 && <i className="navDot" aria-label="Có việc làm được ngay" />}
              </button>
            ))}
          </div>
        )
        : <h4 className="jobKind"><Icon name="job" size={16} /> {k.name}</h4>}
      <div className="hint">{k.line}</div>
      <k.Panel st={st} act={act} />
    </div>
  );
}
export function JobsModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  return <Window title="Công việc" icon="job" sub="Việc nhờ ở Phường Thị. Muốn làm việc nào thì làm" onClose={onClose}><JobsPanel st={st} act={act} /></Window>;
}
