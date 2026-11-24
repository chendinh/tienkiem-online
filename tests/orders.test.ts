import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';
import * as O from '../lib/orders';
import * as D from '../lib/daily';
import { BALANCE as B } from '../lib/balance';
import { artJobs } from '../lib/artjobs';
import { buildPlan } from '../lib/imageprompt';
import { buyerSpec } from '../lib/avatarSpec';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => G.newGame(seed, 'f', T0);
const base = (slot: string, i = 0) => C.SLOT_BASE[slot][i];
const DAYS = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10));

// An item with exactly the fields an order looks at (the rest is what genItem gives).
function item(st: G.GameState, over: Partial<G.Item>): G.Item {
  const it = G.genItem(st, 5, over.tier ?? 0, over.slot);
  Object.assign(it, over);
  return it;
}
const withDay = (st: G.GameState, list: O.Order[]) => { st.orders = { day: D.dayKey(st.clock), list }; return st; };
const mk = (over: Partial<O.Order> & { want: O.Want }): O.Order => ({ id: 'one0', kind: 'one', who: { name: 'Lý Vân', g: 'f', arch: 'Kiếm Tu' }, line: 0, need: 1, mult: O.MULT.one, done: false, ...over });

test('orders: the same day and seed always give the same buyers', () => {
  for (const day of DAYS.slice(0, 10)) assert.deepEqual(O.pickOrders(day, 123, { week: 'Kim', realm: 1 }), O.pickOrders(day, 123, { week: 'Kim', realm: 1 }));
  assert.notDeepEqual(O.pickOrders(DAYS[0], 1), O.pickOrders(DAYS[0], 2));
});

test('orders: every day has 3 single buyers and 2 set buyers, and a rare quest buyer on about half of the days', () => {
  let vip = 0;
  for (const day of DAYS) {
    const l = O.pickOrders(day, 77, { realm: 0 });
    assert.equal(l.filter((o) => o.kind === 'one').length, O.ONE_COUNT);
    assert.equal(l.filter((o) => o.kind === 'set').length, O.SET_COUNT);
    assert.ok(l.filter((o) => o.kind === 'vip').length <= 1);
    assert.equal(new Set(l.map((o) => o.id)).size, l.length, 'two buyers share an id');
    vip += l.filter((o) => o.kind === 'vip').length;
  }
  assert.ok(vip > 12 && vip < 48, `vip days: ${vip} of ${DAYS.length}`);
});

test('orders: what a buyer asks for is always something the game can give', () => {
  for (let seed = 1; seed <= 25; seed++) for (const day of DAYS.slice(0, 20)) for (const o of O.pickOrders(day, seed, { week: 'Hỏa', realm: seed % 4 })) {
    const w = o.want;
    assert.ok(w.tier >= 0 && w.tier <= 5, `${day} ${o.id} tier ${w.tier}`);
    if (o.kind === 'one' || o.kind === 'set') assert.ok(w.tier <= 2, 'a plain buyer never asks for Địa or higher');
    if (o.kind === 'vip') assert.ok(w.tier === 3 || w.tier === 4, 'the quest buyer asks Địa or Thiên');
    if (o.kind === 'set') { assert.ok(w.tier <= 1 && w.slot && w.slot !== 'Weapon' && w.base, 'a set is a Phàm or Hoàng piece with one picture'); assert.ok(o.need === 3 || o.need === 5); assert.ok(o.extra, 'a set always carries a gift'); }
    if (o.kind !== 'set') assert.equal(o.need, 1);
    if (w.slot) assert.ok(C.SLOTS.includes(w.slot), w.slot);
    if (w.tier >= 2 && o.kind !== 'vip') assert.ok(w.el, 'Huyền asks for an element');
    assert.ok(O.lineOf(o).length > 5);
    assert.ok(O.wantText(o).length > 3);
    assert.ok(o.mult >= 250 && o.mult <= 600);
    assert.ok(C.NPC_TITLES.includes(o.who.arch) && (o.who.g === 'f' || o.who.g === 'm') && o.who.name.length > 3);
    if (o.extra) assert.ok(O.extraName(o.extra).length > 1 && O.extraArt(o.extra).startsWith('/art/'));
  }
});

test('orders: no two buyers of one day ask for the same thing', () => {
  for (let seed = 1; seed <= 30; seed++) for (const day of DAYS.slice(0, 20)) {
    const l = O.pickOrders(day, seed, { realm: 0 }).filter((o) => o.kind !== 'vip');
    const keys = l.map((o) => JSON.stringify([o.want.tier, o.want.slot, o.want.base, o.want.cls, o.want.el]));
    assert.equal(new Set(keys).size, keys.length, `${day} seed ${seed}`);
  }
});

test('orders: matching a want: tier, slot, base, môn and element', () => {
  const st = fresh();
  const sword = item(st, { slot: 'Weapon', base: 'Trường Kiếm', tier: 1, el: 'Kim' });
  assert.ok(O.matchesWant({ tier: 1, slot: 'Weapon', cls: 'kiem' }, sword), 'a sword is a kiếm môn weapon');
  assert.ok(!O.matchesWant({ tier: 1, slot: 'Weapon', cls: 'cung' }, sword), 'a sword is not for the bow môn');
  assert.ok(!O.matchesWant({ tier: 2, slot: 'Weapon', cls: 'kiem', el: 'Kim' }, sword), 'the tier must match exactly');
  const h = item(st, { slot: 'Weapon', base: 'Trường Kiếm', tier: 2, el: 'Hỏa' });
  assert.ok(O.matchesWant({ tier: 2, slot: 'Weapon', cls: 'kiem', el: 'Hỏa' }, h));
  assert.ok(!O.matchesWant({ tier: 2, slot: 'Weapon', cls: 'kiem', el: 'Thủy' }, h), 'the element must match from Huyền up');
  assert.ok(O.matchesWant({ tier: 3, el: 'Hỏa' }, item(st, { slot: 'Ring', tier: 3, el: 'Hỏa' })), 'a quest buyer takes any slot');
  assert.ok(!O.matchesWant({ tier: 3, el: 'Hỏa' }, item(st, { slot: 'Ring', tier: 2, el: 'Hỏa' })));
});

test('orders: checkItems for a set needs the right count, no repeats and ONE picture', () => {
  const st = fresh();
  const o = mk({ kind: 'set', need: 3, mult: O.MULT.set3, want: { tier: 0, slot: 'Footwear', base: base('Footwear', 0) } });
  const a = item(st, { id: 9001, slot: 'Footwear', base: base('Footwear', 0), tier: 0 }), b = item(st, { id: 9002, slot: 'Footwear', base: base('Footwear', 0), tier: 0 }), c = item(st, { id: 9003, slot: 'Footwear', base: base('Footwear', 0), tier: 0 });
  assert.equal(O.checkItems(o, [a, b, c]), null);
  assert.ok(O.checkItems(o, [a, b]), 'too few');
  assert.ok(O.checkItems(o, [a, a, b]), 'the same item twice');
  const other = item(st, { id: 9004, slot: 'Footwear', base: base('Footwear', 1), tier: 0 });
  assert.ok(O.checkItems(o, [a, b, other]), 'a different picture');
  const e = item(st, { id: 9005, slot: 'Footwear', base: base('Footwear', 0), tier: 1 });
  assert.ok(O.checkItems(o, [a, b, e]), 'a different tier');
});

test('orders: Phàm and Hoàng of one base are different pictures (lookKey), the element only counts from Huyền', () => {
  const st = fresh();
  const a = item(st, { slot: 'Ring', base: base('Ring', 0), tier: 0, el: 'Kim' }), b = item(st, { slot: 'Ring', base: base('Ring', 0), tier: 0, el: 'Mộc' });
  assert.equal(O.lookKey(a), O.lookKey(b), 'a Phàm ring looks the same whatever its element');
  const h = item(st, { slot: 'Ring', base: base('Ring', 0), tier: 2, el: 'Kim' }), i = item(st, { slot: 'Ring', base: base('Ring', 0), tier: 2, el: 'Mộc' });
  assert.notEqual(O.lookKey(h), O.lookKey(i));
  assert.notEqual(O.lookKey(a), O.lookKey(h));
});

test('orders: pay is a multiple of the dissolve value, rounded down', () => {
  assert.equal(O.payFor(300, 10), 30);
  assert.equal(O.payFor(250, 7), 17);
  assert.equal(O.payFor(600, 0), 0);
});

test('orders: the day is made on the first tick and kept for the whole day', () => {
  const st = fresh(5);
  assert.equal(st.orders, undefined);
  G.settle(st, 5);
  assert.ok(st.orders && st.orders.day === D.dayKey(st.clock) && st.orders.list.length >= O.ONE_COUNT + O.SET_COUNT);
  const first = JSON.stringify(st.orders);
  G.settle(st, 50);
  assert.equal(JSON.stringify(st.orders), first, 'same day, same buyers');
});

test('orders: the buyers are the same on every device (fresh state, same seed and day)', () => {
  const a = fresh(8), b = fresh(8);
  G.settle(a, 5); G.settle(b, 5);
  assert.deepEqual(a.orders, b.orders);
});

test('fillOrder: a single order takes the item, pays and gives the extra', () => {
  const st = fresh(), it = item(st, { id: 7001, slot: 'Ring', base: base('Ring', 0), tier: 1 });
  st.bag.push(it);
  const o = mk({ want: { tier: 1, slot: 'Ring', base: base('Ring', 0) }, extra: { kind: 'taming', idx: 0, n: 3 } });
  withDay(st, [o]);
  const s0 = st.stones, t0 = st.inv.taming[0], v = G.dissolveValue(it);
  const r = G.fillOrder(st, 'one0', [7001]);
  assert.ok(r.ok, r.msg);
  assert.equal(st.stones, s0 + O.payFor(o.mult, v));
  assert.equal(st.inv.taming[0], t0 + 3);
  assert.ok(!st.bag.some((x) => x.id === 7001));
  assert.equal(st.orders!.list[0].done, true);
  assert.equal(st.orders!.list[0].paid, O.payFor(o.mult, v));
  assert.equal(G.fillOrder(st, 'one0', [7001]).code, 'E_ORDER_GONE', 'an order is filled once');
});

test('fillOrder: items can come from the stash too', () => {
  const st = fresh(), it = item(st, { id: 7002, slot: 'Ring', base: base('Ring', 0), tier: 0 });
  st.stash.push(it);
  withDay(st, [mk({ want: { tier: 0, slot: 'Ring', base: base('Ring', 0) } })]);
  assert.ok(G.fillOrder(st, 'one0', [7002]).ok);
  assert.ok(!st.stash.some((x) => x.id === 7002));
});

test('fillOrder: refuses worn, locked, missing, wrong and badly shaped requests, and changes nothing', () => {
  const st = fresh(), good = item(st, { id: 7010, slot: 'Ring', base: base('Ring', 0), tier: 0 });
  const locked = item(st, { id: 7011, slot: 'Ring', base: base('Ring', 0), tier: 0, locked: true }), wrong = item(st, { id: 7012, slot: 'Ring', base: base('Ring', 1), tier: 0 });
  st.bag.push(good, locked, wrong);
  const worn = item(st, { id: 7013, slot: 'Ring', base: base('Ring', 0), tier: 0 }); st.eq.Ring = worn;
  withDay(st, [mk({ want: { tier: 0, slot: 'Ring', base: base('Ring', 0) } })]);
  const snap = JSON.stringify(st);
  assert.equal(G.fillOrder(st, 'nope', [7010]).code, 'E_ORDER_GONE');
  assert.equal(G.fillOrder(st, 'one0', []).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'one0', [7010, 7011]).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'one0', ['7010']).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'one0', [1.5]).code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'one0', 'x').code, 'E_BAD_REQUEST');
  assert.equal(G.fillOrder(st, 'one0', [99999]).code, 'E_NOT_FOUND');
  assert.equal(G.fillOrder(st, 'one0', [7013]).code, 'E_WORN');
  assert.equal(G.fillOrder(st, 'one0', [7011]).code, 'E_LOCKED');
  assert.equal(G.fillOrder(st, 'one0', [7012]).code, 'E_ORDER_ITEMS');
  assert.equal(JSON.stringify(st), snap, 'a refused request must not change the state');
});

test('fillOrder: an order of yesterday is gone', () => {
  const st = fresh(), it = item(st, { id: 7020, slot: 'Ring', base: base('Ring', 0), tier: 0 });
  st.bag.push(it);
  withDay(st, [mk({ want: { tier: 0, slot: 'Ring', base: base('Ring', 0) } })]);
  st.orders!.day = '2001-01-01';
  assert.equal(G.fillOrder(st, 'one0', [7020]).code, 'E_ORDER_GONE');
  assert.ok(st.bag.some((x) => x.id === 7020));
});

test('fillOrder: a set of five of one picture, a gift of materials, and the stack cap', () => {
  const st = fresh(), ids = [8001, 8002, 8003, 8004, 8005];
  for (const id of ids) st.bag.push(item(st, { id, slot: 'Footwear', base: base('Footwear', 0), tier: 1 }));
  const o = mk({ id: 'set0', kind: 'set', need: 5, mult: O.MULT.set5, want: { tier: 1, slot: 'Footwear', base: base('Footwear', 0) }, extra: { kind: 'trib', n: 4 } });
  withDay(st, [o]);
  st.inv.trib = B.stackMax - 1;
  const sum = ids.reduce((a, id) => a + G.dissolveValue(st.bag.find((x) => x.id === id)!), 0), s0 = st.stones;
  assert.ok(G.fillOrder(st, 'set0', ids).ok);
  assert.equal(st.stones, s0 + O.payFor(O.MULT.set5, sum));
  assert.equal(st.inv.trib, B.stackMax, 'the gift stops at the stack cap and the order still goes through');
  for (const id of ids) assert.ok(!st.bag.some((x) => x.id === id));
});

test('fillOrder: a set with a stranger among the five is refused', () => {
  const st = fresh(), ids = [8101, 8102, 8103];
  for (const id of ids.slice(0, 2)) st.bag.push(item(st, { id, slot: 'Footwear', base: base('Footwear', 0), tier: 0 }));
  st.bag.push(item(st, { id: 8103, slot: 'Footwear', base: base('Footwear', 1), tier: 0 }));
  withDay(st, [mk({ id: 'set0', kind: 'set', need: 3, mult: O.MULT.set3, want: { tier: 0, slot: 'Footwear', base: base('Footwear', 0) } })]);
  assert.equal(G.fillOrder(st, 'set0', ids).code, 'E_ORDER_ITEMS');
  assert.equal(st.bag.length >= 3, true);
});

test('fillOrder: the order of today survives the browser copy (forkState keeps `orders`)', () => {
  const st = fresh(3); G.settle(st, 5);
  const copy = structuredClone(st);
  assert.deepEqual(copy.orders, st.orders);
  const o = st.orders!.list[0];
  copy.orders!.list[0].done = true;
  assert.equal(o.done, false, 'the copy must not share the buyers with the original');
});

test('orders: the intent is registered as a pure intent, so it runs at once on the screen', async () => {
  const I = await import('../lib/intents');
  const names = Object.keys((I as any).PURE_INTENTS || {});
  assert.ok(names.includes('fillOrder'), names.join(','));
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
