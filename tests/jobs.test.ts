import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';
import * as J from '../lib/jobs';
import * as O from '../lib/orders';
import { BALANCE as B } from '../lib/balance';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => G.newGame(seed, 'f', T0);
const board = (st: G.GameState) => st.jobs as J.JobBoard;
const mkBeast = (id: number, sp: string, level = 5, over: Partial<G.Beast> = {}): G.Beast => ({ id, level, mut: false, sp, name: `con ${id}`, apt: [1, 1, 1, 1, 1], cls: 2, power: level * 10, size: 1, cm: 50, pers: 0, skills: [], stats: [1, 1, 1, 1, 1], ...over }) as G.Beast;
// A buyer made by hand.
const mk = (type: J.JobType, ask: J.Ask, over: Partial<J.Job> = {}): J.Job => ({ id: `${type}0-0`, type, who: { name: 'Lý Vân', g: 'f', arch: 'Đan Sư' }, line: 0, ask, need: 3, got: 0, mult: J.MULT[type], bonus: 0, sum: 0, paid: 0, done: false, ...over });
const withBoard = (st: G.GameState, ...list: J.Job[]) => { st.jobs = { v: 1, n: 100, list }; return st; };
// A beast ask by element: [element, how many] pairs.
const byEl = (...ps: [string, number][]): J.Ask => ({ t: 'beast', want: ps.map(([el, n]) => ({ el, n, got: 0 })) });
// Species of one element only, a different element each.
const SOLO = C.SPECIES.filter((s) => s.el.length === 1);
const spOfEl = (el: string, skip: string[] = []) => SOLO.find((s) => s.el[0] === el && !skip.includes(s.id))!.id;

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
      const keys = b.list.filter((j) => j.type === t).map((j) => J.askKey(j.ask));
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
          // by element only: 1 to 3 different elements, each found at this level, any species
          assert.ok(a.want.length >= 1 && a.want.length <= 3 && !('sp' in a) && !('minCls' in a));
          assert.equal(new Set(a.want.map((w) => w.el)).size, a.want.length, 'the elements of a buyer are different');
          for (const w of a.want) {
            assert.ok(w.got === 0 && w.n >= 1 && w.n <= 4);
            assert.ok(sps.some((id) => J.speciesEls(id).includes(w.el)), `no creature of ${w.el} lives at level ${level}`);
          }
          assert.equal(j.need, a.want.reduce((s, w) => s + w.n, 0)); assert.ok(j.need >= 2 && j.need <= 6, `need ${j.need}`);
          assert.equal(j.mult, J.MULT.beast); assert.equal(j.bonus, J.MULT.beastBonus); assert.equal(j.extra, undefined);
          // always a Khế Ước Phù of grade Huyền or higher, and Hồi Khí Đan of grade 1 or 2
          const g = J.giftsOf(j);
          assert.ok(g.some((x) => x.kind === 'taming' && x.idx >= 1 && x.n >= 1), 'a Khế Ước Phù of Huyền or higher');
          assert.ok(g.some((x) => x.kind === 'hp' && x.idx <= 1 && x.n >= 1), 'Hồi Khí Đan of grade 1 or 2');
          assert.ok(!g.some((x) => x.kind === 'taming' && x.idx === 3) || j.need >= 5, 'Thiên only for the biggest orders');
        } else if (a.t === 'pill') { assert.ok(grades.includes(a.grade)); assert.ok(j.need >= 2 && j.need <= 10); assert.equal(j.bonus, 0); }
        else { assert.ok(mats.includes(a.id), `${a.id} is not found at level ${level}`); assert.ok(j.need >= 3 && j.need <= 50); assert.ok(J.unitValue(a) * j.need <= 100); }
        assert.ok(J.askText(j).length > 0 && J.askShort(a).length > 0 && J.lineOf(j).length > 0);
        assert.equal(C.NPC_TITLES.includes(j.who.arch), true, 'the portrait of every buyer exists');
      }
    }
  }
});

test('jobs: a beast buyer takes any species and any size of the elements asked, never a Dị Biến, and each element only as many as asked', () => {
  const e1 = SOLO[0].el[0], e2 = SOLO.find((s) => s.el[0] !== e1)!.el[0], e3 = SOLO.find((s) => s.el[0] !== e1 && s.el[0] !== e2)!.el[0];
  const a1 = spOfEl(e1), a1b = spOfEl(e1, [a1]), a2 = spOfEl(e2), a3 = spOfEl(e3);
  const ask = byEl([e1, 1], [e2, 2]), want = J.wantsOf(ask);
  assert.ok(J.beastMatches(ask, mkBeast(1, a1)) && J.beastMatches(ask, mkBeast(2, a1b)) && J.beastMatches(ask, mkBeast(3, a2)), 'any species of the element');
  assert.ok(J.beastMatches(ask, mkBeast(4, a1, 5, { cls: 0 })) && J.beastMatches(ask, mkBeast(5, a1, 5, { cls: 4 })), 'any size');
  assert.ok(!J.beastMatches(ask, mkBeast(6, a1, 5, { mut: true })) && !J.beastMatches(ask, mkBeast(7, a3)), 'never a Dị Biến, never another element');
  // where each creature goes, whatever the order
  assert.deepEqual(J.assignBeasts(want, [mkBeast(1, a1), mkBeast(3, a2), mkBeast(8, a2)]), [0, 1, 1]);
  assert.deepEqual(J.assignBeasts(want, [mkBeast(3, a2), mkBeast(1, a1)]), [1, 0]);
  assert.equal(J.assignBeasts(want, [mkBeast(1, a1), mkBeast(2, a1b)]), null, 'two of an element asked once');
  assert.equal(J.assignBeasts(want, [mkBeast(7, a3)]), null);
  assert.equal(J.assignBeasts(want, [mkBeast(6, a1, 5, { mut: true })]), null);
  assert.equal(J.assignBeasts(want, [1, 2, 3, 4].map((i) => mkBeast(i, a2))), null, 'more than the whole order');
  assert.ok(J.canAdd(ask, [mkBeast(1, a1)], mkBeast(3, a2)) && !J.canAdd(ask, [mkBeast(1, a1)], mkBeast(2, a1b)));
  // once an element is full its creatures no longer fit, the others still do
  want[0].got = 1;
  assert.ok(!J.beastMatches(ask, mkBeast(2, a1b)) && J.beastMatches(ask, mkBeast(3, a2)));
  assert.equal(J.leftText(mk('beast', ask, { need: 3, got: 1 })), `2 con hệ ${e2}`);
});

test('jobs: handing over beasts pays each at once, the last pays the bonus and the gifts, and the beasts go', () => {
  const st = fresh(7), el = SOLO[0].el[0], sp = spOfEl(el), sp2 = spOfEl(el, [sp]);
  const j = mk('beast', byEl([el, 3]), { need: 3, bonus: J.MULT.beastBonus, gifts: [{ kind: 'taming', idx: 1, n: 2 }, { kind: 'hp', idx: 0, n: 3 }] });
  withBoard(st, j);
  st.beasts = [mkBeast(11, sp, 5), mkBeast(12, sp2, 9), mkBeast(13, sp, 4), mkBeast(14, sp, 2, { mut: true }), mkBeast(15, 'zzz')];
  const s0 = st.stones, t0 = st.inv.taming[1], h0 = st.inv.hp[0];
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
  assert.ok(r.ok, r.msg); assert.equal(st.stones - s0, first); assert.equal(j.got, 2); assert.equal(J.wantsOf(j.ask)[0].got, 2); assert.ok(!j.done);
  assert.deepEqual(st.beasts.map((b) => b.id), [13, 14, 15]);
  assert.match(r.msg, new RegExp(`Còn thiếu 1 con hệ ${el}`));
  // the last one
  const last = J.payFor(j.mult, v(13)), bonus = J.payFor(j.bonus, sum2 + v(13));
  r = G.fillJob(st, j.id, { ids: [13] });
  assert.ok(r.ok, r.msg); assert.equal(st.stones - s0, first + last + bonus); assert.ok(j.done); assert.equal(j.paid, first + last + bonus);
  assert.equal(st.inv.taming[1], t0 + 2); assert.equal(st.inv.hp[0], h0 + 3);
  assert.match(r.msg, /tặng 2 .+ và 3 /);
  assert.equal(G.fillJob(st, j.id, { ids: [13] }).code, 'E_JOB_GONE');   // a buyer that is done takes nothing more
});

test('jobs: a buyer of several elements takes them in any order, each element only as many as asked', () => {
  const st = fresh(10), e1 = SOLO[0].el[0], e2 = SOLO.find((s) => s.el[0] !== e1)!.el[0], a1 = spOfEl(e1), a2 = spOfEl(e2);
  const j = mk('beast', byEl([e1, 1], [e2, 2]), { need: 3, bonus: J.MULT.beastBonus, gifts: J.beastGifts(3, 'x') });
  withBoard(st, j);
  st.beasts = [mkBeast(1, a1), mkBeast(2, a1), mkBeast(3, a2), mkBeast(4, a2)];
  const snap = structuredClone(st);
  assert.equal(G.fillJob(st, j.id, { ids: [1, 2] }).code, 'E_JOB_GIVE', 'two of an element asked once');
  assert.deepEqual(st, snap);
  assert.ok(G.fillJob(st, j.id, { ids: [3, 1] }).ok);
  assert.deepEqual(J.wantsOf(j.ask).map((w) => w.got), [1, 1]); assert.equal(j.got, 2);
  assert.equal(G.fillJob(st, j.id, { ids: [2] }).code, 'E_JOB_GIVE', 'its element is full now');
  const r = G.fillJob(st, j.id, { ids: [4] });
  assert.ok(r.ok && j.done, r.msg); assert.deepEqual(st.beasts.map((b) => b.id), [2]);
});

test('jobs: a beast buyer saved before the asks went by element is replaced on the next tick; what it paid stays', () => {
  const st = fresh(11); G.settle(st, 2);
  const b = board(st), at = b.list.findIndex((x) => x.type === 'beast'), sp = C.SPECIES[0].id;
  const old = { ...b.list[at], ask: { t: 'beast', sp, minCls: 3 } as any, need: 2, got: 1, paid: 500, extra: { kind: 'taming', idx: 0, n: 3 } as O.Extra, gifts: undefined };
  b.list[at] = old;
  assert.ok(J.isLegacy(old) && !J.isOpen(old));
  st.beasts = [mkBeast(901, sp)];
  const s0 = st.stones;
  assert.equal(G.fillJob(st, old.id, { ids: [901] }).code, 'E_JOB_GONE');
  assert.equal(J.beastWantedBy(b, st.beasts[0]).some((x) => x.id === old.id), false, 'no mark in the pen for it');
  G.settle(st, 1);
  const nj = board(st).list[at];
  assert.notEqual(nj.id, old.id); assert.ok(J.isOpen(nj) && J.wantsOf(nj.ask).length > 0);
  assert.ok(st.stones >= s0, 'nothing is taken back');
  assert.equal(J.isLegacy(mk('beast', { t: 'beast', el: 'Hỏa' } as any)), true);
});

test('jobs: the gifts of a beast buyer grow with the order: Huyền always, Địa sometimes, Thiên rarely and only for the biggest', () => {
  let dia = 0, thien = 0, n = 0;
  for (let k = 0; k < 600; k++) for (const need of [2, 3, 4, 5, 6]) {
    const g = J.beastGifts(need, `t${k}`), tam = g.find((x) => x.kind === 'taming') as { idx: number; n: number }, hp = g.find((x) => x.kind === 'hp') as { idx: number; n: number };
    n++; assert.equal(g.length, 2);
    assert.ok(tam.idx >= 1 && tam.idx <= 3 && tam.n >= 1); assert.ok(hp.idx === 0 || hp.idx === 1); assert.ok(hp.n >= 2);
    if (tam.idx === 1) assert.equal(tam.n, 1 + Math.ceil(need / 2));
    if (tam.idx === 2) dia++;
    if (tam.idx === 3) { thien++; assert.ok(need >= 5); }
  }
  assert.ok(dia / n > 0.1 && dia / n < 0.4, `Địa ${dia / n}`); assert.ok(thien > 0 && thien / n < 0.06, `Thiên ${thien / n}`);
  // bigger orders give more
  const worth = (need: number) => { let v = 0; for (let k = 0; k < 300; k++) for (const x of J.beastGifts(need, `w${k}`)) v += x.n * (C.SHOP_ITEM(O.extraId(x))?.price || 0); return v / 300; };
  assert.ok(worth(2) < worth(4) && worth(4) < worth(6), `${worth(2)} ${worth(4)} ${worth(6)}`);
});

test('jobs: a framed beast that is handed over leaves the frame; more beasts than asked is refused', () => {
  const st = fresh(8), el = SOLO[0].el[0], sp = spOfEl(el);
  withBoard(st, mk('beast', byEl([el, 1]), { need: 1 }));
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

test('jobs: a buyer that is done (or left, in an old save) is replaced on the next tick and the others stay as they were', () => {
  const st = fresh(12); G.settle(st, 3);
  assert.ok(J.isBoard(st.jobs), 'the board is made on the first ticks');
  const before = structuredClone(board(st));
  const j = board(st).list[2];
  j.left = true;   // only old saves have buyers that left: there is no way to send one away any more
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

test('jobs: "Bán nhanh" sells every spare creature as before, whether a buyer waits for it or not', () => {
  const st = fresh(14), sp = C.SPECIES[0].id, other = C.SPECIES[1].id;
  withBoard(st, mk('beast', byEl([C.SPECIES[0].el[0], 2]), { need: 2 }));
  st.beasts = [mkBeast(1, other, 50), mkBeast(2, other, 40), mkBeast(3, other, 30), mkBeast(4, sp, 20), mkBeast(5, sp, 10), mkBeast(6, sp, 5), mkBeast(7, sp, 3)];
  const r = G.releaseMany(st);
  assert.ok(r.ok, r.msg);
  assert.deepEqual(st.beasts.map((b) => b.id).sort((a, b) => a - b), [1, 2, 3], 'only the Party stays');
  assert.doesNotMatch(r.msg, /công việc|Tìm thú/);
});

test('jobs: the buyers stay out of the economy: buying pills only to hand them over always loses Linh Thạch', () => {
  for (let grade = 0; grade < 3; grade++) {
    const price = C.SHOP_ITEM(`hp${grade}`)!.price, pay = J.payFor(J.MULT.pill, J.sellBack(grade));
    assert.ok(pay < price, `grade ${grade}: ${pay} paid for a pill that costs ${price}`);
  }
  for (const done of [0, 3, 8, 15, 25, 40, 200]) for (let seed = 1; seed <= 40; seed++) for (const level of [1, 5, 10, 25, 50]) {
    const b = J.newBoard(seed, { level, done: { pill: done, mat: done } });
    for (let k = 0; k < 12; k++) { const i = k % b.list.length; b.list[i] = J.makeJob(i, b.n++, seed, b.list, { level, done: { pill: done, mat: done } }); }
    for (const j of b.list.filter((x) => x.type === 'pill')) {
      const a = j.ask as { t: 'pill'; grade: number }, cost = j.need * C.SHOP_ITEM(`hp${a.grade}`)!.price;
      const gain = j.need * J.payFor(j.mult, J.sellBack(a.grade)) + J.payFor(j.bonus, j.need * J.sellBack(a.grade));
      const goods = j.extra && j.extra.kind === 'mat' ? j.extra.n * C.MAT(j.extra.id).price : 0;   // even if the materials are sold at their full price
      assert.ok(j.extra && j.extra.kind === 'mat', 'a pill buyer only gives materials');
      assert.equal(j.bonus, 0, 'a pill buyer pays no bonus in Linh Thạch');
      assert.ok(gain + goods < cost, `done ${done} seed ${seed} level ${level}: ${j.need} pills of grade ${a.grade} cost ${cost}, the buyer gives ${gain} + ${goods}`);
    }
  }
});

test('jobs: beasts and materials are paid more than selling them, but within a fixed multiple', () => {
  assert.ok(J.MULT.beast > 100 && J.MULT.beast <= 300 && J.MULT.mat > 100 && J.MULT.mat <= 300);
  assert.ok(J.MULT.beastBonus <= 200 && J.MULT.matBonus <= 100);
  const b = mkBeast(1, C.SPECIES[0].id, 20, { cls: 4 });
  assert.equal(J.payFor(J.MULT.beast, G.releaseValue(b)), Math.floor((G.releaseValue(b) * J.MULT.beast) / 100));
  assert.ok(B.sellBackRatio > 0 && B.sellBackRatio < 1);
});

test('jobs: the intents are registered as pure intents, so they run at once on the screen', async () => {
  const I = await import('../lib/intents');
  const names = Object.keys((I as any).PURE_INTENTS || {});
  assert.ok(names.includes('fillJob'), names.join(','));
  assert.ok(!names.includes('dismissJob'), 'a buyer cannot be sent away to find a new one');
});

test('jobs: the rank follows the jobs finished in a kind', () => {
  assert.deepEqual(J.RANK_AT.map((a) => J.rankOf(a)), [0, 1, 2, 3, 4, 5]);
  assert.equal(J.rankOf(0), 0); assert.equal(J.rankOf(2), 0); assert.equal(J.rankOf(3), 1); assert.equal(J.rankOf(7), 1); assert.equal(J.rankOf(40), 5); assert.equal(J.rankOf(9999), 5);
  assert.equal(J.toNext(0), 3); assert.equal(J.toNext(2), 1); assert.equal(J.toNext(3), 5); assert.equal(J.toNext(40), null);
  assert.equal(J.RANK_NAME.length, J.RANK_AT.length); assert.equal(J.QTY.length, J.RANK_AT.length);
  assert.equal(J.doneOf(undefined, 'pill'), 0); assert.equal(J.doneOf({ v: 1, n: 1, list: [] }, 'pill'), 0, 'a board without counts counts as 0');
});

test('jobs: the higher the rank, the bigger and rarer the asks, and the better they pay', () => {
  const level = 30, stats = (type: J.JobType, done: number) => {
    let n = 0, need = 0, grade = 0, price = 0, mult = 0, bonus = 0, goods = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const j = J.makeJob(type === 'pill' ? 2 : 4, seed, seed, [], { level, done: { pill: done, mat: done } });
      assert.equal(j.rank, J.rankOf(done)); n++; need += j.need; mult += j.mult; bonus += j.bonus;
      if (j.ask.t === 'pill') grade += j.ask.grade; if (j.ask.t === 'mat') price += C.MAT(j.ask.id).price;
      goods += j.extra ? j.extra.n * (j.extra.kind === 'mat' ? C.MAT(j.extra.id).price : (C.SHOP_ITEM(O.extraId(j.extra))?.price || 0)) : 0;
    }
    return { need: need / n, grade: grade / n, price: price / n, mult: mult / n, bonus: bonus / n, goods: goods / n };
  };
  const p0 = stats('pill', 0), p5 = stats('pill', 40), m0 = stats('mat', 0), m5 = stats('mat', 40);
  assert.ok(p5.need > p0.need * 3, `pills ${p0.need} -> ${p5.need}`); assert.ok(p5.grade > p0.grade + 0.4, `grade ${p0.grade} -> ${p5.grade}`); assert.ok(p5.goods > p0.goods * 2, `pill goods ${p0.goods} -> ${p5.goods}`);
  assert.ok(m5.price > m0.price * 1.8, `material price ${m0.price} -> ${m5.price}`); assert.ok(m5.mult > m0.mult && m5.bonus > m0.bonus, 'materials pay more'); assert.ok(m5.goods > m0.goods * 1.5, `mat goods ${m0.goods} -> ${m5.goods}`);
  // the value asked grows too (what the material is worth times how many), and stays within the caps
  const value = (done: number) => { let v = 0; for (let seed = 1; seed <= 120; seed++) { const j = J.makeJob(4, seed, seed, [], { level, done: { mat: done } }); assert.ok(j.need >= 3 && j.need <= Math.round(50 * J.QTY[J.rankOf(done)])); v += j.need * J.unitValue(j.ask); } return v / 120; };
  assert.ok(value(40) > value(0) * 4, `${value(0)} -> ${value(40)}`);
  for (let seed = 1; seed <= 60; seed++) for (const d of [0, 8, 40]) assert.ok(J.makeJob(2, seed, seed, [], { level: 30, done: { pill: d } }).need <= 80);
  // beasts do not get harder with the count
  assert.deepEqual(J.makeJob(0, 5, 5, [], { level, done: { beast: 0 } }).ask, J.makeJob(0, 5, 5, [], { level, done: { beast: 99 } }).ask);
});

test('jobs: finishing a buyer counts for its kind, a rank-up is told, and the next buyer of the kind is bigger', () => {
  const st = fresh(21); G.settle(st, 3);
  const b = board(st), at = b.list.findIndex((x) => x.type === 'mat');
  b.done = { mat: 2 };
  const j = b.list[at]; j.got = j.need - 1; j.done = false; j.left = false;
  const a = j.ask as { t: 'mat'; id: string }; st.inv.mat[a.id] = 5;
  const r = G.fillJob(st, j.id, { n: 1 });
  assert.ok(r.ok, r.msg); assert.ok(j.done); assert.equal(b.done.mat, 3); assert.equal((r.data as any).rankUp, 1); assert.match(r.msg, /Lên bậc Học Việc/);
  G.settle(st, 1);
  const nj = board(st).list[at];
  assert.notEqual(nj.id, j.id); assert.equal(nj.rank, 1);
  // a finished buyer that does not make a new rank says nothing about it
  const b2 = board(st), j2 = b2.list[at]; j2.got = j2.need - 1; st.inv.mat[(j2.ask as any).id] = 5;
  const r2 = G.fillJob(st, j2.id, { n: 1 });
  assert.ok(r2.ok && !('rankUp' in (r2.data as any)) && !/Lên bậc/.test(r2.msg), r2.msg); assert.equal(b2.done!.mat, 4);
  // a buyer that left (old saves) does not count; beasts count but have no rank
  const k = board(st).list.findIndex((x) => x.type === 'pill'); const before = JSON.stringify(board(st).done);
  board(st).list[k].left = true; G.settle(st, 1); assert.equal(JSON.stringify(board(st).done), before);
  // a board saved before the counts existed still works
  const old = fresh(22); G.settle(old, 2); delete (board(old) as any).done;
  const m = board(old).list.find((x) => x.type === 'mat')!; m.got = m.need - 1; old.inv.mat[(m.ask as any).id] = 3;
  assert.ok(G.fillJob(old, m.id, { n: 1 }).ok); assert.equal(board(old).done!.mat, 1);
});

test('jobs: the Party is worked out once, and the spare creatures come first, weakest first', () => {
  const x = C.SPECIES[0].id, beasts = [mkBeast(1, x, 9), mkBeast(2, x, 3), mkBeast(3, x, 6), mkBeast(4, x, 1), mkBeast(5, x, 8)];
  const party = J.partyOf(beasts, 2);
  assert.deepEqual([...party].sort(), [1, 5]);   // the two strongest
  const keep = new Set([...party, 3]);   // plus the framed one
  assert.equal(J.partyOf(beasts, 0).size, 0);
  assert.equal(J.partyOf([], 3).size, 0);
  assert.equal(beasts.map((b) => b.id).join(), '1,2,3,4,5');   // the pen itself is not reordered
  const j = mk('beast', byEl([C.SPECIES[0].el[0], 5]), { need: 5 });
  const order = J.beastCands(j, beasts, keep).map((b) => b.id);
  assert.deepEqual(order, [4, 2, 3, 5, 1]);   // spare ones weakest first, then the framed one and the Party by power
  const spare = order.filter((id) => J.isSpare({ id }, keep)), rest = order.filter((id) => !J.isSpare({ id }, keep));
  assert.deepEqual(spare, [4, 2]);   // 4 (power 10) before 2 (power 30)
  assert.deepEqual(order, [...spare, ...rest]);   // the Party and the framed one come last
  assert.equal(J.isSpare({ id: 3 }, keep), false); assert.equal(J.isSpare({ id: 1 }, keep), false); assert.equal(J.isSpare({ id: 4 }, keep), true);
});
