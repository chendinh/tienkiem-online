import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';
import * as O from '../lib/orders';
import { BALANCE as B } from '../lib/balance';
import { artJobs } from '../lib/artjobs';
import { buildPlan } from '../lib/imageprompt';
import { buyerSpec } from '../lib/avatarSpec';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => G.newGame(seed, 'f', T0);
const base = (slot: string, i = 0) => C.SLOT_BASE[slot][i];

// An item with exactly the fields an order looks at (the rest is what genItem gives).
function item(st: G.GameState, over: Partial<G.Item>): G.Item {
  const it = G.genItem(st, 5, over.tier ?? 0, over.slot);
  Object.assign(it, over);
  return it;
}
// A buyer made by hand: a list of parts and a few numbers.
const mk = (parts: O.Want[], over: Partial<O.Order> = {}): O.Order => ({ id: 'one0-0', kind: parts.length > 1 ? 'set' : 'one', who: { name: 'Lý Vân', g: 'f', arch: 'Kiếm Tu' }, line: 0, parts: parts.map((want) => ({ want })), mult: O.MULT.part, bonus: 0, sum: 0, paid: 0, done: false, ...over });
const withBoard = (st: G.GameState, ...list: O.Order[]) => { st.orders = { v: 2, n: 100, list }; return st; };
const ringWant = (i = 0, tier = 0): O.Want => ({ tier, slot: 'Ring', base: base('Ring', i) });
const rank = (st: G.GameState) => st.orders as O.Board;

test('orders: the same seed always gives the same board, and another seed another one', () => {
  assert.deepEqual(O.newBoard(123, { week: 'Kim', realm: 1 }), O.newBoard(123, { week: 'Kim', realm: 1 }));
  assert.notDeepEqual(O.newBoard(1), O.newBoard(2));
});

test('orders: the board has 3 single buyers, 2 set buyers and a guest, each place of its own kind', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const b = O.newBoard(seed, { realm: seed % 4 });
    assert.equal(b.v, 2); assert.equal(b.list.length, O.LAYOUT.length);
    assert.deepEqual(b.list.map((o) => o.kind), O.LAYOUT);
    assert.equal(new Set(b.list.map((o) => o.id)).size, b.list.length, 'two buyers share an id');
    assert.equal(b.n, b.list.length);
    const keys = b.list.map((o) => JSON.stringify(o.parts.map((p) => p.want)));
    assert.equal(new Set(keys).size, keys.length, `seed ${seed}: two buyers ask for the same thing`);
  }
});

test('orders: what a buyer asks for is always something the game can give', () => {
  for (let seed = 1; seed <= 60; seed++) {
    let b = O.newBoard(seed, { week: 'Hỏa', realm: seed % 4 });
    for (let k = 0; k < 20; k++) { const i = k % b.list.length; b.list[i] = O.makeOrder(i, b.n++, seed, b.list, { week: 'Hỏa', realm: 0 }); }
    for (const o of b.list) {
      assert.ok(o.parts.length >= 1 && o.parts.every((p) => !p.got) && o.sum === 0 && o.paid === 0 && !o.done);
      assert.ok(o.mult === O.MULT.part || o.mult === O.MULT.vip);
      for (const p of o.parts) {
        const w = p.want;
        assert.ok(w.tier >= 0 && w.tier <= 4);
        if (w.slot) assert.ok(C.SLOTS.includes(w.slot), w.slot);
        if (w.el) assert.ok(C.EO.includes(w.el), w.el);
        if (w.base) assert.ok(C.SLOT_BASE[w.slot!].includes(w.base));
      }
      if (o.kind === 'one') { assert.equal(o.parts.length, 1); const w = o.parts[0].want; assert.ok(w.tier <= 2 && w.slot); if (w.tier === 2) assert.ok(w.el && !w.base && !w.cls, 'Huyền: slot and element only'); else assert.ok(w.base || w.cls); }
      if (o.kind === 'set') {
        assert.ok(o.parts.length === 3 || o.parts.length === 5, 'a set is 3 or 5 pieces');
        assert.equal(new Set(o.parts.map((p) => p.want.slot)).size, o.parts.length, 'every piece is of a different slot');
        assert.equal(new Set(o.parts.map((p) => p.want.tier)).size, 1, 'one rarity for the set');
        assert.ok(o.parts[0].want.tier <= 1);
        assert.equal(o.bonus, o.parts.length === 5 ? O.MULT.bonus5 : O.MULT.bonus3);
        assert.ok(o.extra, 'a set always carries goods');
      }
      if (o.kind === 'vip') { const w = o.parts[0].want; assert.ok(o.parts.length === 1 && (w.tier === 3 || w.tier === 4) && w.el && !w.slot); assert.equal(o.mult, O.MULT.vip); assert.ok(o.extra); }
      assert.ok(O.lineOf(o).length > 5 && O.wantText(o).length > 3);
      assert.ok(C.NPC_TITLES.includes(o.who.arch) && (o.who.g === 'f' || o.who.g === 'm') && o.who.name.length > 3);
      if (o.extra) assert.ok(O.extraName(o.extra).length > 1 && O.extraArt(o.extra).startsWith('/art/'));
    }
  }
});

test('orders: a new buyer for a place is a different one (the running number), and not a copy of another waiting buyer', () => {
  const b = O.newBoard(9);
  const a = b.list[0], c = O.makeOrder(0, b.n, 9, b.list);
  assert.notEqual(a.id, c.id);
  for (let n = 10; n < 60; n++) { const o = O.makeOrder(1, n, 9, b.list); assert.notEqual(JSON.stringify(o.parts), JSON.stringify(b.list[0].parts)); }
});

test('orders: matching a want: tier, slot, base, môn and element', () => {
  const st = fresh();
  const sword = item(st, { slot: 'Weapon', base: 'Trường Kiếm', tier: 1, el: 'Kim' });
  assert.ok(O.matchesWant({ tier: 1, slot: 'Weapon', cls: 'kiem' }, sword));
  assert.ok(!O.matchesWant({ tier: 1, slot: 'Weapon', cls: 'cung' }, sword), 'a sword is not for the bow môn');
  assert.ok(!O.matchesWant({ tier: 2, slot: 'Weapon', cls: 'kiem', el: 'Kim' }, sword), 'the tier must match exactly');
  assert.ok(O.matchesWant({ tier: 1, slot: 'Weapon' }, sword), 'a set piece asks no kind of item');
  const h = item(st, { slot: 'Weapon', base: 'Trường Kiếm', tier: 2, el: 'Hỏa' });
  assert.ok(O.matchesWant({ tier: 2, slot: 'Weapon', el: 'Hỏa' }, h));
  assert.ok(!O.matchesWant({ tier: 2, slot: 'Weapon', el: 'Thủy' }, h));
  assert.ok(O.matchesWant({ tier: 3, el: 'Hỏa' }, item(st, { slot: 'Ring', tier: 3, el: 'Hỏa' })), 'a guest takes any slot');
  assert.ok(!O.matchesWant({ tier: 3, el: 'Hỏa' }, item(st, { slot: 'Ring', tier: 2, el: 'Hỏa' })));
});

test('orders: assign puts every piece in a part of its own, and says why when it cannot', () => {
  const st = fresh();
  const o = mk([{ tier: 0, slot: 'Ring' }, { tier: 0, slot: 'Robe' }, { tier: 0, slot: 'Back' }]);
  const r1 = item(st, { id: 1, slot: 'Ring', tier: 0 }), r2 = item(st, { id: 2, slot: 'Ring', tier: 0 }), ro = item(st, { id: 3, slot: 'Robe', tier: 0 }), up = item(st, { id: 4, slot: 'Back', tier: 1 });
  assert.deepEqual(O.assign(o, [r1, ro]), [0, 1]);
  assert.equal(typeof O.assign(o, [r1, r2]), 'string', 'two pieces for one part');
  assert.equal(typeof O.assign(o, [up]), 'string', 'a different rarity');
  o.parts[0].got = true;
  assert.equal(typeof O.assign(o, [r1]), 'string', 'the part is already filled');
  assert.deepEqual(O.assign(o, [ro]), [1]);
});

test('orders: pay is a multiple of the dissolve value, rounded down', () => {
  assert.equal(O.payFor(300, 10), 30); assert.equal(O.payFor(250, 7), 17); assert.equal(O.payFor(600, 0), 0);
});

test('orders: the board is made on the first tick and kept (no new buyers while all are waiting)', () => {
  const st = fresh(5);
  assert.equal(st.orders, undefined);
  G.settle(st, 5);
  assert.ok(O.isBoard(st.orders) && rank(st).list.length === O.LAYOUT.length);
  const first = JSON.stringify(st.orders);
  G.settle(st, 200);
  assert.equal(JSON.stringify(st.orders), first, 'the same buyers, whatever the days that pass');
  const a = fresh(8), b = fresh(8);
  G.settle(a, 5); G.settle(b, 5);
  assert.deepEqual(a.orders, b.orders, 'two runs of one world give the same buyers');
});

test('orders: a board of the first version (a list of the day) is replaced by a new one', () => {
  const st = fresh(6);
  (st as any).orders = { day: '2026-11-24', list: [{ id: 'one0', kind: 'one', want: { tier: 0 }, need: 1, done: false }] };
  G.settle(st, 3);
  assert.ok(O.isBoard(st.orders));
});

test('fillOrder: one piece for a single buyer pays at once, completes the order and gives the goods', () => {
  const st = fresh(), it = item(st, { id: 7001, slot: 'Ring', base: base('Ring'), tier: 1 });
  st.bag.push(it);
  const o = mk([{ tier: 1, slot: 'Ring', base: base('Ring') }], { extra: { kind: 'taming', idx: 0, n: 3 } });
  withBoard(st, o);
  const s0 = st.stones, t0 = st.inv.taming[0], v = G.dissolveValue(it);
  const r = G.fillOrder(st, o.id, [7001]);
  assert.ok(r.ok, r.msg);
  assert.equal(st.stones, s0 + O.payFor(O.MULT.part, v));
  assert.equal(st.inv.taming[0], t0 + 3);
  assert.ok(!st.bag.some((x) => x.id === 7001));
  assert.ok(o.done && o.paid === O.payFor(O.MULT.part, v) && o.parts[0].got);
  assert.equal(G.fillOrder(st, o.id, [7001]).code, 'E_ORDER_GONE');
});

test('fillOrder: a set is handed over a piece at a time; the bonus and the goods come with the last piece', () => {
  const st = fresh();
  const slots = ['Ring', 'Robe', 'Back'], ids = [8001, 8002, 8003];
  slots.forEach((slot, i) => st.stash.push(item(st, { id: ids[i], slot, tier: 1 })));
  const o = mk(slots.map((slot) => ({ tier: 1, slot })), { id: 'set0-0', bonus: O.MULT.bonus3, extra: { kind: 'trib', n: 2 } });
  withBoard(st, o);
  const v = (id: number) => G.dissolveValue(st.stash.find((x) => x.id === id)!);
  const v1 = v(8001), v2 = v(8002), v3 = v(8003), t0 = st.inv.trib;
  let s0 = st.stones;
  assert.ok(G.fillOrder(st, 'set0-0', [8001]).ok);
  assert.equal(st.stones - s0, O.payFor(300, v1)); assert.ok(!o.done && o.parts[0].got && !o.parts[1].got);
  assert.equal(st.inv.trib, t0, 'no goods yet');
  s0 = st.stones;
  assert.ok(G.fillOrder(st, 'set0-0', [8002]).ok);
  assert.equal(st.stones - s0, O.payFor(300, v2)); assert.ok(!o.done);
  s0 = st.stones;
  const last = G.fillOrder(st, 'set0-0', [8003]);
  assert.ok(last.ok && last.data.done);
  assert.equal(st.stones - s0, O.payFor(300, v3) + O.payFor(O.MULT.bonus3, v1 + v2 + v3), 'the last piece brings the bonus on the whole');
  assert.equal(st.inv.trib, t0 + 2);
  assert.ok(o.done && o.paid === O.payFor(300, v1) + O.payFor(300, v2) + O.payFor(300, v3) + O.payFor(O.MULT.bonus3, v1 + v2 + v3));
  assert.equal(st.stash.length, 0);
});

test('fillOrder: several pieces at once, from the bag and the stash', () => {
  const st = fresh();
  st.bag.push(item(st, { id: 8101, slot: 'Ring', tier: 0 })); st.stash.push(item(st, { id: 8102, slot: 'Robe', tier: 0 }));
  withBoard(st, mk([{ tier: 0, slot: 'Ring' }, { tier: 0, slot: 'Robe' }, { tier: 0, slot: 'Back' }], { id: 's' }));
  const r = G.fillOrder(st, 's', [8101, 8102]);
  assert.ok(r.ok, r.msg);
  assert.equal(rank(st).list[0].parts.filter((p) => p.got).length, 2);
  assert.ok(!rank(st).list[0].done);
});

test('fillOrder: refuses worn, locked, missing, wrong, repeated and badly shaped requests, and changes nothing', () => {
  const st = fresh(), good = item(st, { id: 7010, slot: 'Ring', base: base('Ring'), tier: 0 });
  const locked = item(st, { id: 7011, slot: 'Ring', base: base('Ring'), tier: 0, locked: true }), wrong = item(st, { id: 7012, slot: 'Ring', base: base('Ring', 1), tier: 0 }), twin = item(st, { id: 7014, slot: 'Ring', base: base('Ring'), tier: 0 });
  st.bag.push(good, locked, wrong, twin);
  const worn = item(st, { id: 7013, slot: 'Ring', base: base('Ring'), tier: 0 }); st.eq.Ring = worn;
  withBoard(st, mk([ringWant()], { id: 'o' }));
  const snap = JSON.stringify(st);
  assert.equal(G.fillOrder(st, 'nope', [7010]).code, 'E_ORDER_GONE');
  assert.equal(G.fillOrder(st, 'o', []).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'o', [7010, 7014]).code, 'E_BAD_REQUEST', 'more pieces than parts');
  assert.equal(G.fillOrder(st, 'o', ['7010']).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'o', [1.5]).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'o', 'x').code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'o', [7010, 7010]).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'o', [99999]).code, 'E_NOT_FOUND');
  assert.equal(G.fillOrder(st, 'o', [7013]).code, 'E_WORN');
  assert.equal(G.fillOrder(st, 'o', [7011]).code, 'E_LOCKED');
  assert.equal(G.fillOrder(st, 'o', [7012]).code, 'E_ORDER_ITEMS');
  assert.equal(JSON.stringify(st), snap, 'a refused request must not change the state');
  const s2 = withBoard(fresh(), mk([{ tier: 0, slot: 'Ring' }, { tier: 0, slot: 'Robe' }], { id: 'p' }));
  s2.bag.push(item(s2, { id: 1, slot: 'Ring', tier: 0 }), item(s2, { id: 2, slot: 'Ring', tier: 0 }));
  assert.equal(G.fillOrder(s2, 'p', [1, 2]).code, 'E_ORDER_ITEMS', 'two pieces for one part');
  assert.equal(s2.bag.length, 2);
});

test('fillOrder: the stack cap stops the goods but not the order', () => {
  const st = fresh(), ids = [8201];
  st.bag.push(item(st, { id: 8201, slot: 'Ring', tier: 0 }));
  withBoard(st, mk([{ tier: 0, slot: 'Ring' }], { extra: { kind: 'trib', n: 4 } }));
  st.inv.trib = B.stackMax - 1;
  assert.ok(G.fillOrder(st, 'one0-0', ids).ok);
  assert.equal(st.inv.trib, B.stackMax);
});

test('dismissOrder: the buyer leaves, what was handed over stays paid, and a new buyer takes the place on the next tick', () => {
  const st = fresh(11); G.settle(st, 3);
  const b = rank(st), n0 = b.n, set = b.list.find((o) => o.kind === 'set')!, i = b.list.indexOf(set);
  const first = set.parts[0].want;
  const it = item(st, { id: 9001, slot: first.slot, tier: first.tier });
  st.bag.push(it);
  assert.ok(G.fillOrder(st, set.id, [9001]).ok);
  const paid = set.paid, stones = st.stones;
  assert.ok(paid > 0);
  assert.ok(G.dismissOrder(st, set.id).ok);
  assert.ok(set.left);
  assert.equal(G.dismissOrder(st, set.id).code, 'E_ORDER_GONE');
  assert.equal(G.fillOrder(st, set.id, [1]).code, 'E_ORDER_GONE');
  assert.equal(st.stones, stones, 'nothing is taken back');
  G.settle(st, 2);
  const now = rank(st);
  assert.notEqual(now.list[i].id, set.id); assert.equal(now.list[i].kind, 'set'); assert.ok(O.isOpen(now.list[i]));
  assert.equal(now.n, n0 + 1, 'the running number moved on by one');
});

test('orders: a finished buyer is replaced on the next tick and the others stay as they were', () => {
  const st = fresh(12); G.settle(st, 3);
  const before = structuredClone(rank(st));
  const o = rank(st).list[0], w = o.parts[0].want;
  const it = item(st, { id: 9101, slot: w.slot, base: w.base, tier: w.tier });
  if (w.cls) it.base = Object.keys(C.WEAPON_CLASS).find((b) => C.WEAPON_CLASS[b] === w.cls)!;
  st.bag.push(it);
  assert.ok(G.fillOrder(st, o.id, [9101]).ok, 'the piece fits');
  assert.ok(o.done);
  G.settle(st, 1);
  const after = rank(st);
  assert.notEqual(after.list[0].id, before.list[0].id);
  assert.ok(O.isOpen(after.list[0]));
  for (let i = 1; i < after.list.length; i++) assert.deepEqual(after.list[i], before.list[i]);
  assert.equal(after.n, before.n + 1);
});

test('keeping what buyers wait for: Dọn túi leaves the weakest piece for each open part', () => {
  const st = fresh();
  for (const s of C.SLOTS) st.eq[s] = item(st, { id: 500 + C.SLOTS.indexOf(s), slot: s, tier: 3, power: 9999 });   // strong gear everywhere, so nothing in the bag is an upgrade
  const w1 = item(st, { id: 601, slot: 'Ring', base: base('Ring'), tier: 0, power: 10 }), w2 = item(st, { id: 602, slot: 'Ring', base: base('Ring'), tier: 0, power: 5 }), other = item(st, { id: 603, slot: 'Ring', base: base('Ring', 1), tier: 0, power: 1 });
  st.bag.push(w1, w2, other);
  withBoard(st, mk([ringWant()]));
  assert.deepEqual([...O.keepIds(st.orders, [...st.bag, ...st.stash])], [602], 'the weakest of the two');
  const r = G.dissolveMany(st, 1);
  assert.ok(r.ok, r.msg);
  assert.deepEqual(st.bag.map((x) => x.id), [602]);
  assert.match(r.msg, /Tìm đồ/);
});

test('keeping what buyers wait for: auto-dissolve spares one piece for an open part, not the rest', () => {
  const st = fresh();
  for (const s of C.SLOTS) st.eq[s] = item(st, { id: 500 + C.SLOTS.indexOf(s), slot: s, tier: 3, power: 9999 });
  st.set.dissolveMax = 5; st.set.autoEquip = false;
  withBoard(st, mk([ringWant()]));
  const a = item(st, { id: 701, slot: 'Ring', base: base('Ring'), tier: 0, power: 3 }), b = item(st, { id: 702, slot: 'Ring', base: base('Ring'), tier: 0, power: 2 }), c = item(st, { id: 703, slot: 'Ring', base: base('Ring', 1), tier: 0, power: 2 });
  G.giveItem(st, a); G.giveItem(st, b); G.giveItem(st, c);
  assert.deepEqual(st.bag.map((x) => x.id), [701], 'the first one stays, the twin and the one nobody asked for are dissolved');
  const none = fresh(); for (const s of C.SLOTS) none.eq[s] = item(none, { id: 500 + C.SLOTS.indexOf(s), slot: s, tier: 3, power: 9999 });
  none.set.dissolveMax = 5; none.set.autoEquip = false;
  G.giveItem(none, item(none, { id: 801, slot: 'Ring', base: base('Ring'), tier: 0, power: 3 }));
  assert.equal(none.bag.length, 0, 'with no buyer waiting it is dissolved as before');
});

test('orders: the bag knows which pieces a buyer waits for', () => {
  const st = fresh();
  const mine = item(st, { slot: 'Ring', base: base('Ring'), tier: 0 }), no = item(st, { slot: 'Ring', base: base('Ring', 1), tier: 0 });
  withBoard(st, mk([ringWant()], { id: 'x' }));
  assert.equal(O.wantedBy(st.orders, mine).length, 1); assert.equal(O.wantedBy(st.orders, mine)[0].order.id, 'x');
  assert.equal(O.wantedBy(st.orders, no).length, 0);
  rank(st).list[0].parts[0].got = true;
  assert.equal(O.wantedBy(st.orders, mine).length, 0, 'a filled part wants nothing more');
  assert.equal(O.wantedBy(undefined, mine).length, 0);
});

test('orders: the buyers survive the browser copy (forkState keeps `orders`)', () => {
  const st = fresh(3); G.settle(st, 5);
  const copy = structuredClone(st);
  assert.deepEqual(copy.orders, st.orders);
  copy.orders!.list[0].done = true;
  assert.equal(rank(st).list[0].done, false);
});

test('orders: the intents are registered as pure intents, so they run at once on the screen', async () => {
  const I = await import('../lib/intents');
  const names = Object.keys((I as any).PURE_INTENTS || {});
  assert.ok(names.includes('fillOrder') && names.includes('dismissOrder'), names.join(','));
});

test('orders: the portrait of each buyer is a fixed picture with its own file and a buildable prompt', () => {
  const jobs = artJobs('buyers');
  assert.equal(jobs.length, C.NPC_TITLES.length * 2);
  assert.equal(new Set(jobs.map((j) => j.dest)).size, jobs.length);
  for (const arch of C.NPC_TITLES) for (const g of ['f', 'm'] as const) {
    assert.ok(jobs.some((j) => j.dest === C.buyerArt(arch, g)), `${arch} ${g}`);
    const p = buildPlan(buyerSpec(arch, g));
    assert.equal(p.kind, 'portrait');
    assert.ok(p.prompt.includes(C.BUYER_EN[arch]));
    assert.equal(p.width, 768);
  }
  assert.notEqual(buildPlan(buyerSpec('Kiếm Tu', 'f')).seed, buildPlan(buyerSpec('Kiếm Tu', 'm')).seed);
  assert.throws(() => buildPlan({ kind: 'buyer', arch: 'Không Có', g: 'f' }));
});
