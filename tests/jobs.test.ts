import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';
import * as J from '../lib/jobs';
import { BALANCE as B } from '../lib/balance';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => G.newGame(seed, 'f', T0);
const board = (st: G.GameState) => st.jobs as J.JobBoard;
const mkBeast = (id: number, sp: string, level = 5, over: Partial<G.Beast> = {}): G.Beast => ({ id, level, mut: false, sp, name: `con ${id}`, apt: [1, 1, 1, 1, 1], cls: 2, power: level * 10, size: 1, cm: 50, pers: 0, skills: [], stats: [1, 1, 1, 1, 1], ...over }) as G.Beast;
// A buyer made by hand.
const mk = (type: J.JobType, ask: J.Ask, over: Partial<J.Job> = {}): J.Job => ({ id: `${type}0-0`, type, who: { name: 'Lý Vân', g: 'f', arch: 'Đan Sư' }, line: 0, ask, need: 3, got: 0, mult: J.MULT[type], bonus: 0, sum: 0, paid: 0, done: false, ...over });
const withBoard = (st: G.GameState, ...list: J.Job[]) => { st.jobs = { v: 1, n: 100, list }; return st; };

test('jobs: the same seed always gives the same board, and another seed another one', () => {
  assert.deepEqual(J.newBoard(123, { level: 5 }), J.newBoard(123, { level: 5 }));
  assert.notDeepEqual(J.newBoard(1, { level: 5 }), J.newBoard(2, { level: 5 }));
});

test('jobs: the board has 2 buyers of each kind, no two of a kind ask for the same thing', () => {
  for (let seed = 1; seed <= 40; seed++) for (const level of [1, 5, 12, 30]) {
    const b = J.newBoard(seed, { level });
    assert.equal(b.v, 1); assert.deepEqual(b.list.map((j) => j.type), J.LAYOUT); assert.equal(b.n, b.list.length);
    assert.equal(new Set(b.list.map((j) => j.id)).size, b.list.length);
    for (const t of ['beast', 'pill', 'mat'] as const) {
      const keys = b.list.filter((j) => j.type === t).map((j) => JSON.stringify(j.ask));
      assert.equal(new Set(keys).size, keys.length, `seed ${seed} level ${level}: two ${t} buyers ask for the same thing`);
    }
  }
});

test('jobs: what a buyer asks for is something the player can find at their level, and the numbers are sane', () => {
  for (const level of [1, 3, 6, 10, 20, 40]) {
    const sps = J.speciesAt(level), mats = J.matsAt(level), grades = J.gradesAt(level);
    assert.ok(sps.length > 0 && mats.length > 0 && grades.includes(0), `level ${level}`);
    for (let seed = 1; seed <= 30; seed++) {
      let b = J.newBoard(seed, { level });
      for (let k = 0; k < 24; k++) { const i = k % b.list.length; b.list[i] = J.makeJob(i, b.n++, seed, b.list, { level }); }
      for (const j of b.list) {
        assert.ok(j.got === 0 && j.sum === 0 && j.paid === 0 && !j.done && !j.left && j.need >= 1);
        const a = j.ask;
        if (a.t === 'beast') {
          assert.ok(a.sp || a.el); assert.ok(!a.sp || sps.includes(a.sp), `${a.sp} is not found at level ${level}`);
          assert.ok(j.need >= 1 && j.need <= 3);
          if (a.el) assert.equal(j.need, 3, 'a buyer of an element wants three');
          assert.ok(!j.bonus || j.need >= 2, 'the bonus is for a buyer who wants more than one');
        } else if (a.t === 'pill') { assert.ok(grades.includes(a.grade)); assert.ok(j.need >= 2 && j.need <= 10); assert.equal(j.bonus, 0); }
        else { assert.ok(mats.includes(a.id), `${a.id} is not found at level ${level}`); assert.ok(j.need >= 3 && j.need <= 50); assert.ok(J.unitValue(a) * j.need <= 100); }
        assert.ok(J.askText(j).length > 0 && J.askShort(a).length > 0 && J.lineOf(j).length > 0);
        assert.equal(C.NPC_TITLES.includes(j.who.arch), true, 'the portrait of every buyer exists');
      }
    }
  }
});

test('jobs: a Dị Biến is never asked for and never taken; the size and the element are looked at', () => {
  const sp = C.SPECIES[0], big = mkBeast(1, sp.id, 5, { cls: 4 }), small = mkBeast(2, sp.id, 5, { cls: 1 }), mut = mkBeast(3, sp.id, 5, { mut: true });
  assert.ok(J.beastMatches({ t: 'beast', sp: sp.id }, big) && !J.beastMatches({ t: 'beast', sp: sp.id }, mut));
  assert.ok(J.beastMatches({ t: 'beast', sp: sp.id, minCls: 3 }, big) && !J.beastMatches({ t: 'beast', sp: sp.id, minCls: 3 }, small));
  assert.ok(J.beastMatches({ t: 'beast', el: sp.el[0] }, small) && !J.beastMatches({ t: 'beast', el: sp.el[0] }, mut));
  const other = C.SPECIES.find((s) => !s.el.includes(sp.el[0]))!;
  assert.ok(!J.beastMatches({ t: 'beast', el: sp.el[0] }, mkBeast(4, other.id)));
  assert.ok(!J.beastMatches({ t: 'beast', sp: other.id }, big));
});

test('jobs: handing over beasts pays each at once, the last pays the bonus and the goods, and the beasts go', () => {
  const st = fresh(7), sp = C.SPECIES[0].id;
  const j = mk('beast', { t: 'beast', sp }, { need: 3, bonus: J.MULT.beastBonus, extra: { kind: 'taming', idx: 0, n: 3 } });
  withBoard(st, j);
  st.beasts = [mkBeast(11, sp, 5), mkBeast(12, sp, 9), mkBeast(13, sp, 4), mkBeast(14, sp, 2, { mut: true }), mkBeast(15, 'zzz')];
  const s0 = st.stones, t0 = st.inv.taming[0];
  // refusals leave everything as it was
  const snap = structuredClone(st);
  for (const [ids, code] of [[[14], 'E_MUTANT'], [[15], 'E_JOB_GIVE'], [[99], 'E_NOT_FOUND'], [[], 'E_BAD_REQUEST'], [[11, 11], 'E_BAD_REQUEST'], [[11, 12, 13, 11], 'E_BAD_REQUEST']] as const) {
    const r = G.fillJob(st, j.id, { ids: [...ids] });
    assert.ok(!r.ok && r.code === code, `${JSON.stringify(ids)} gave ${r.code}`);
  }
  assert.equal(G.fillJob(st, 'nope', { ids: [11] }).code, 'E_JOB_GONE');
  assert.deepEqual(st, snap);
  // two now
  const v = (id: number) => G.releaseValue(st.beasts.find((b) => b.id === id)!);
  const first = J.payFor(j.mult, v(11)) + J.payFor(j.mult, v(12)), sum2 = v(11) + v(12);
  let r = G.fillJob(st, j.id, { ids: [11, 12] });
  assert.ok(r.ok, r.msg); assert.equal(st.stones - s0, first); assert.equal(j.got, 2); assert.ok(!j.done);
  assert.deepEqual(st.beasts.map((b) => b.id), [13, 14, 15]);
  // the last one
  const last = J.payFor(j.mult, v(13)), bonus = J.payFor(j.bonus, sum2 + v(13));
  r = G.fillJob(st, j.id, { ids: [13] });
  assert.ok(r.ok, r.msg); assert.equal(st.stones - s0, first + last + bonus); assert.ok(j.done); assert.equal(j.paid, first + last + bonus);
  assert.equal(st.inv.taming[0], t0 + 3);
  assert.equal(G.fillJob(st, j.id, { ids: [13] }).code, 'E_JOB_GONE');   // a buyer that is done takes nothing more
});

test('jobs: a framed beast that is handed over leaves the frame; more beasts than asked is refused', () => {
  const st = fresh(8), sp = C.SPECIES[0].id;
  withBoard(st, mk('beast', { t: 'beast', sp }, { need: 1 }));
  st.beasts = [mkBeast(21, sp, 6), mkBeast(22, sp, 6)];
  st.player.showcase = { kind: 'beast', id: 21 };
  assert.equal(G.fillJob(st, 'beast0-0', { ids: [21, 22] }).code, 'E_BAD_REQUEST');
  assert.ok(G.fillJob(st, 'beast0-0', { ids: [21] }).ok);
  assert.equal(st.player.showcase, undefined);
});

test('jobs: pills and materials are handed over by number, as many as there are up to what is asked', () => {
  const st = fresh(9);
  const pill = mk('pill', { t: 'pill', grade: 1 }, { id: 'pill0-0', need: 4, extra: { kind: 'mat', id: 'ngoc', n: 3 } }), mat = mk('mat', { t: 'mat', id: 'truc' }, { id: 'mat0-0', need: 10, bonus: J.MULT.matBonus, extra: { kind: 'hp', idx: 0, n: 2 } });
  withBoard(st, pill, mat);
  st.inv.hp = [0, 3, 0]; st.inv.mat = { truc: 25 };
  const snap = structuredClone(st);
  assert.equal(G.fillJob(st, pill.id, { n: 0 }).code, 'E_BAD_REQUEST'); assert.equal(G.fillJob(st, pill.id, { n: 1.5 }).code, 'E_BAD_REQUEST'); assert.equal(G.fillJob(st, pill.id, {}).code, 'E_BAD_REQUEST');
  const other = structuredClone(st); other.inv.hp = [5, 0, 0];
  assert.equal(G.fillJob(other, pill.id, { n: 2 }).code, 'E_NO_STOCK');   // pills of another grade do not count
  assert.deepEqual(st, snap);
  const unit = J.payFor(pill.mult, J.sellBack(1));
  let s0 = st.stones;
  assert.ok(G.fillJob(st, pill.id, { n: 99 }).ok);   // cut down to the 3 there are
  assert.equal(st.stones - s0, 3 * unit); assert.equal(pill.got, 3); assert.equal(st.inv.hp[1], 0); assert.ok(!pill.done);
  st.inv.hp[1] = 5; s0 = st.stones;
  assert.ok(G.fillJob(st, pill.id, { n: 5 }).ok);   // only 1 is still asked
  assert.equal(st.stones - s0, unit); assert.ok(pill.done); assert.equal(st.inv.hp[1], 4); assert.equal(st.inv.mat.ngoc, 3);
  // materials
  s0 = st.stones;
  assert.ok(G.fillJob(st, mat.id, { n: 10 }).ok);
  const per = J.payFor(mat.mult, C.MAT('truc').price);
  assert.equal(st.stones - s0, 10 * per + J.payFor(mat.bonus, 10 * C.MAT('truc').price));
  assert.ok(mat.done); assert.equal(st.inv.mat.truc, 15); assert.equal(st.inv.hp[0], 2);
});

test('jobs: a buyer that is done or sent away is replaced on the next tick and the others stay as they were', () => {
  const st = fresh(12); G.settle(st, 3);
  assert.ok(J.isBoard(st.jobs), 'the board is made on the first ticks');
  const before = structuredClone(board(st));
  const j = board(st).list[2];
  assert.ok(G.dismissJob(st, j.id).ok); assert.equal(G.dismissJob(st, j.id).code, 'E_JOB_GONE');
  G.settle(st, 1);
  const after = board(st);
  assert.notEqual(after.list[2].id, before.list[2].id); assert.ok(J.isOpen(after.list[2])); assert.equal(after.list[2].type, 'pill');
  for (const i of [0, 1, 3, 4, 5]) assert.deepEqual(after.list[i], before.list[i]);
  assert.equal(after.n, before.n + 1);
  // a finished one too
  const m = after.list[4]; m.done = true; G.settle(st, 1);
  assert.notEqual(board(st).list[4].id, m.id); assert.equal(board(st).list[4].type, 'mat');
});

test('jobs: an old save without the board gets one, and the board survives a copy', () => {
  const st = fresh(13); delete (st as any).jobs; G.settle(st, 2);
  assert.ok(J.isBoard(st.jobs)); assert.deepEqual(structuredClone(st.jobs), st.jobs);
  assert.equal(J.isBoard({ v: 0, list: [], n: 1 }), false);
});

test('jobs: "Bán nhanh" keeps the weakest beasts that fit what a buyer waits for', () => {
  const st = fresh(14), sp = C.SPECIES[0].id, other = C.SPECIES[1].id;
  withBoard(st, mk('beast', { t: 'beast', sp }, { need: 2 }));
  st.beasts = [mkBeast(1, other, 50), mkBeast(2, other, 40), mkBeast(3, other, 30), mkBeast(4, sp, 20), mkBeast(5, sp, 10), mkBeast(6, sp, 5), mkBeast(7, sp, 3)];
  const r = G.releaseMany(st);
  assert.ok(r.ok, r.msg);
  const left = st.beasts.map((b) => b.id).sort((a, b) => a - b);
  // the strongest three go to the Party; of the four that fit, the two weakest (7 and 6) are kept for the buyer, and the rest are sold
  assert.deepEqual(left, [1, 2, 3, 6, 7].sort((a, b) => a - b).filter((x) => left.includes(x)));
  assert.ok(left.includes(6) && left.includes(7), `kept ${left}`);
  assert.ok(!left.includes(4) && !left.includes(5), `sold ${left}`);
});

test('jobs: the buyers stay out of the economy: buying pills only to hand them over always loses Linh Thạch', () => {
  for (let grade = 0; grade < 3; grade++) {
    const price = C.SHOP_ITEM(`hp${grade}`)!.price, pay = J.payFor(J.MULT.pill, J.sellBack(grade));
    assert.ok(pay < price, `grade ${grade}: ${pay} paid for a pill that costs ${price}`);
  }
  for (let seed = 1; seed <= 60; seed++) for (const level of [1, 5, 10, 25]) {
    const b = J.newBoard(seed, { level });
    for (let k = 0; k < 12; k++) { const i = k % b.list.length; b.list[i] = J.makeJob(i, b.n++, seed, b.list, { level }); }
    for (const j of b.list.filter((x) => x.type === 'pill')) {
      const a = j.ask as { t: 'pill'; grade: number }, cost = j.need * C.SHOP_ITEM(`hp${a.grade}`)!.price;
      const gain = j.need * J.payFor(j.mult, J.sellBack(a.grade)) + J.payFor(j.bonus, j.need * J.sellBack(a.grade));
      const goods = j.extra && j.extra.kind === 'mat' ? j.extra.n * C.MAT(j.extra.id).price : 0;   // even if the materials are sold at their full price
      assert.ok(j.extra && j.extra.kind === 'mat', 'a pill buyer only gives materials');
      assert.ok(gain + goods < cost, `seed ${seed} level ${level}: ${j.need} pills of grade ${a.grade} cost ${cost}, the buyer gives ${gain} + ${goods}`);
    }
  }
});

test('jobs: beasts and materials are paid more than selling them, but within a fixed multiple', () => {
  assert.ok(J.MULT.beast > 100 && J.MULT.beast <= 300 && J.MULT.mat > 100 && J.MULT.mat <= 300);
  assert.ok(J.MULT.beastBonus <= 100 && J.MULT.matBonus <= 100);
  const b = mkBeast(1, C.SPECIES[0].id, 20, { cls: 4 });
  assert.equal(J.payFor(J.MULT.beast, G.releaseValue(b)), Math.floor((G.releaseValue(b) * J.MULT.beast) / 100));
  assert.ok(B.sellBackRatio > 0 && B.sellBackRatio < 1);
});

test('jobs: the intents are registered as pure intents, so they run at once on the screen', async () => {
  const I = await import('../lib/intents');
  const names = Object.keys((I as any).PURE_INTENTS || {});
  assert.ok(names.includes('fillJob') && names.includes('dismissJob'), names.join(','));
});
