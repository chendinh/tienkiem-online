import { newGame, settle, TUNE } from '../lib/game';
for (const z of [0.04, 0.06, 0.08, 0.1]) for (const gear of [0.85, 1.0]) {
  TUNE.z = z; TUNE.gear = gear;
  let w = 0, l = 0, e = 0, lv = 0, bt = 0, btf = 0; const n = 6;
  for (let sd = 1; sd <= n; sd++) { const st = newGame(1000 + sd); const r = settle(st, 8640); w += r.wins; l += r.losses; e += r.encounters; lv += r.toLevel; bt += r.bt.ok; btf += r.bt.fail; }
  console.log(`z=${z} gear=${gear} enc/12h=${Math.round(e / n)} win%=${(100 * w / e).toFixed(1)} loseCount=${Math.round(l / n)} avgLevel12h=${(lv / n).toFixed(1)} bt ok/fail=${(bt / n).toFixed(1)}/${(btf / n).toFixed(1)}`);
}
