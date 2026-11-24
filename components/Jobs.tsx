'use client';
import { useState, type ComponentType } from 'react';
import type { GS } from '@/lib/client/types';
import { Icon } from './ds/Icon';
import { Seg } from './ds/Seg';
import { OrdersPanel, fillableCount } from './Orders';
import { Window, type Act } from './Panels';

// Công việc: a place of its own for jobs a player may take up if they like (it is not the daily quests, and nothing is lost by leaving a job alone).
// A kind of job is one entry of JOB_KINDS: a name, a line about it, how many jobs of it could be done right now (for the badge), and the panel that shows them.
// To add a kind, write its panel and add an entry here; the window, the tabs and the badges follow.
export interface JobKind { id: string; name: string; line: string; ready: (st: GS) => number; Panel: ComponentType<{ st: GS; act: Act }> }
export const JOB_KINDS: JobKind[] = [
  { id: 'items', name: 'Tìm đồ', line: 'Khách ở Phường Thị nhờ tìm đồ. Có món nào đưa món đó, đủ thì có thưởng.', ready: fillableCount, Panel: OrdersPanel },
];
/** How many jobs could be done right now, over every kind (the badge on the Công việc buttons). */
export const jobsReady = (st: GS): number => JOB_KINDS.reduce((n, k) => n + k.ready(st), 0);

export function JobsPanel({ st, act }: { st: GS; act: Act }) {
  const [kind, setKind] = useState(JOB_KINDS[0].id);
  const k = JOB_KINDS.find((x) => x.id === kind) || JOB_KINDS[0];
  return (
    <div className="jobsPanel">
      {JOB_KINDS.length > 1
        ? <Seg<string> label="Loại công việc" value={k.id} onChange={setKind} options={JOB_KINDS.map((x) => ({ v: x.id, label: <>{x.name}{x.ready(st) > 0 && <b className="jobBadge">{x.ready(st)}</b>}</> }))} />
        : <h4 className="jobKind"><Icon name="job" size={16} /> {k.name}</h4>}
      <div className="hint">{k.line}</div>
      <k.Panel st={st} act={act} />
    </div>
  );
}
export function JobsModal({ st, act, onClose }: { st: GS; act: Act; onClose: () => void }) {
  return <Window title="Công việc" icon="job" sub="Việc nhờ ở Phường Thị. Muốn làm việc nào thì làm" onClose={onClose}><JobsPanel st={st} act={act} /></Window>;
}
