// Economy and difficulty report for tuning: npm run econ. A player who has every auto setting on (the easiest case).
import { newGame, settle, levelOf } from '../lib/game';
import * as C from '../lib/content';
const T0 = 1_800_000_000_000;
const HOURS = Number(process.argv[2] || 24), SEEDS = Number(process.argv[3] || 6);
const agg: Record<string, number> = {};
const add = (k: string, v: number) => { agg[k] = (agg[k] || 0) + v; };
let lv = 0;
for (let sd = 1; sd <= SEEDS; sd++) {
  const st = newGame(500 + sd, undefined, T0);
  Object.assign(st.set, { autoEquip: true, autoBreak: true, autoPill: true, autoFight: true, autoTame: true, dissolveMax: 2 });
  st.inv.trib = 50; st.inv.hp = [60, 30, 10]; st.stones = 0;
  for (let h = 0; h < HOURS; h++) {
    const z = [...C.ZONES].reverse().find((x) => x.minLevel <= levelOf(st.player))!; st.zone = z.id;
    const r = settle(st, 720);
    add('encounters', r.encounters); add('wins', r.wins); add('losses', r.losses); add('draws', r.draws); add('stones', r.stones); add('items', r.items.reduce((a, b) => a + b, 0));
    for (const [k, v] of Object.entries(r.stonesBy)) add('$' + k, v);
    add('mat', Object.values(r.mats).reduce((a, b) => a + b, 0)); add('bt_ok', r.bt.ok); add('bt_fail', r.bt.fail);
    // income from selling materials counts too
    for (const [id, n] of Object.entries(st.inv.mat)) { add('$sell_material', C.MAT(id).price * n); st.inv.mat[id] = 0; }
  }
  lv += levelOf(st.player);
}
const per = (k: string) => Math.round((agg[k] || 0) / SEEDS / HOURS);
console.log(`${HOURS}h x ${SEEDS} players. Average Level at the end: ${(lv / SEEDS).toFixed(1)}`);
console.log(`per hour: encounters ${per('encounters')}, wins ${per('wins')}, losses ${per('losses')}, draws ${per('draws')}, win% ${(100 * agg.wins / Math.max(1, agg.encounters)).toFixed(1)}, items ${per('items')}, materials ${per('mat')}`);
console.log(`stones per hour: ${per('stones')} (${Object.keys(agg).filter((k) => k[0] === '$').map((k) => k.slice(1) + ' ' + per(k)).join(', ')})`);
console.log(`breakthroughs per player: ok ${(agg.bt_ok / SEEDS).toFixed(1)}, fail ${(agg.bt_fail / SEEDS).toFixed(1)}`);
