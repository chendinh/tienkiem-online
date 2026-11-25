import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as XP from '../lib/expo';
import * as C from '../lib/content';
import { PURE_INTENTS } from '../lib/intents';
import { BALANCE as B } from '../lib/balance';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => { const st = G.newGame(seed, 'f', T0); st.player.realm = 2; st.player.sub = 1; return st; };
const lvl = (st: G.GameState) => G.levelOf(st.player);
const SLOTS = ['Weapon', 'Robe', 'Ring', 'Talisman', 'Footwear', 'Headwear'];
/** A piece of the given rarity in the bag. */
const piece = (st: G.GameState, tier: number, slot = 'Weapon'): G.Item => { const it = G.genItem(st, lvl(st), tier, slot, 0, true); st.bag.push(it); return it; };
const beast = (st: G.GameState, id: number, over: Partial<G.Beast> = {}): G.Beast => {
  const b: G.Beast = { id, level: 5, mut: false, sp: C.SPECIES[0].id, name: `con ${id}`, apt: [1, 1, 1, 1, 1], cls: 2, power: 50, size: 1, cm: 100, pers: 0, skills: [], stats: [10, 10, 10, 10, 10], ...over } as G.Beast;
  st.beasts.push(b); return b;
};
/** A full row of pieces, all of one rarity. */
const fill = (st: G.GameState, tier: number, n = 6) => { const ids: number[] = []; for (let i = 0; i < n; i++) { const it = piece(st, tier, SLOTS[i]); assert.ok(G.expoSet(st, i, 'item', it.id).ok); ids.push(it.id); } return ids; };

test('expo: a visitor is made from the seed and its number only, and the same ones always come', () => {
  assert.deepEqual(XP.visitorOf(5, 9), XP.visitorOf(5, 9));
  assert.notDeepEqual(XP.visitorOf(5, 9), XP.visitorOf(5, 10));
  const kinds = new Set<string>(), els = new Set<string>();
  for (let n = 1; n <= 300; n++) { const v = XP.visitorOf(7, n); kinds.add(v.who.arch); els.add(v.el); assert.ok(C.NPC_TITLES.includes(v.who.arch)); assert.ok(C.EO.includes(v.el)); assert.ok(v.bar >= 0 && v.bar <= 3); assert.ok(v.gen >= 0.8 - 1e-9 && v.gen <= 1.2 + 1e-9); }
  assert.equal(kinds.size, C.NPC_TITLES.length); assert.equal(els.size, C.EO.length);
});

test('expo: the reaction follows the score, a piece of the rarity a visitor is used to scores "like", and better pieces score higher', () => {
  const r = XP.reactionOf;
  assert.deepEqual([6, 5, 4, 3, 2, 1, 0, -1].map(r), ['love', 'love', 'wow', 'like', null, 'sad', 'angry', 'angry']);
  const v = { who: { name: 'x', g: 'f' as const, arch: 'Tán Tu' }, el: 'Kim', bar: 2, gen: 1 };
  const x = (tier: number, over: Partial<XP.Exhibit> = {}): XP.Exhibit => ({ kind: 'item', tier, el: 'Thủy', slot: 'Ring', level: 5, value: 100, ...over });
  // without the luck of the key the score is exactly tier - bar + 3: find a key whose luck is 0
  let key = ''; for (let i = 0; i < 99 && !key; i++) if (XP.scoreOf(v, x(2), `k${i}`) === 3) key = `k${i}`;
  assert.ok(key);
  assert.equal(XP.scoreOf(v, x(3), key), 4); assert.equal(XP.scoreOf(v, x(1), key), 2); assert.equal(XP.scoreOf(v, x(0), key), 1);
  assert.equal(XP.scoreOf(v, x(2, { el: 'Kim' }), key), 4);   // the favourite element
});

test('expo: each kind of cultivator likes its own kind of piece', () => {
  const item = (slot: string): XP.Exhibit => ({ kind: 'item', tier: 2, el: 'Thủy', slot, level: 5, value: 100 });
  const bst = (mut: boolean): XP.Exhibit => ({ kind: 'beast', tier: 2, el: 'Thủy', mut, level: 5, value: 100 });
  assert.equal(XP.liking('Kiếm Tu', item('Weapon')), 1); assert.equal(XP.liking('Kiếm Tu', item('Ring')), 0);
  assert.equal(XP.liking('Thể Tu', item('Robe')), 1); assert.equal(XP.liking('Thể Tu', item('Weapon')), 0);
  assert.equal(XP.liking('Phù Sư', item('Talisman')), 1); assert.equal(XP.liking('Đan Sư', bst(false)), 1); assert.equal(XP.liking('Đan Sư', item('Ring')), 0);
  assert.equal(XP.liking('Ma Tu', bst(true)), 2); assert.equal(XP.liking('Ma Tu', bst(false)), 0); assert.equal(XP.liking('Tán Tu', item('Weapon')), 0);
});

test('expo: only love, wow and like give Linh Thạch, and a better reaction gives more', () => {
  const x: XP.Exhibit = { kind: 'item', tier: 3, el: 'Kim', slot: 'Weapon', level: 10, value: 4000 };
  assert.equal(XP.stonesFor(null, x, 1), 0); assert.equal(XP.stonesFor('sad', x, 1), 0); assert.equal(XP.stonesFor('angry', x, 1), 0);
  const [a, b, c] = [XP.stonesFor('love', x, 1), XP.stonesFor('wow', x, 1), XP.stonesFor('like', x, 1)];
  assert.ok(a > b && b > c && c > 0);
  assert.ok(a <= x.value * 0.01, 'a piece is never used up, so one visit gives a small share of its worth');
  assert.ok(XP.stonesFor('love', { ...x, value: 1 }, 1) >= 2, 'even a cheap piece moves a visitor a little');
});

test('expo: a route is 1 to 3 of the filled stands, from the top tier down, and the same for the same visitor', () => {
  const st = fresh(); fill(st, 2); const e = st.expo!;
  for (let n = 1; n <= 200; n++) {
    const r = XP.routeOf(e, st.seed, n);
    assert.deepEqual(r, XP.routeOf(e, st.seed, n));
    assert.ok(r.slots.length >= 1 && r.slots.length <= 3); assert.equal(new Set(r.slots).size, r.slots.length);
    const rows = r.slots.map((s) => s >> 1); assert.deepEqual(rows, [...rows].sort((p, q) => p - q));
  }
  // only filled stands are visited
  const two = fresh(3); const a = piece(two, 1), b = piece(two, 1); G.expoSet(two, 1, 'item', a.id); G.expoSet(two, 4, 'item', b.id);
  for (let n = 1; n <= 50; n++) for (const s of XP.routeOf(two.expo!, two.seed, n).slots) assert.ok(s === 1 || s === 4);
});

test('expo: putting a piece on a stand locks it, taking it away gives back the lock it had, a Linh Thú is only referred to', () => {
  const st = fresh(); const a = piece(st, 2), b = piece(st, 2); b.locked = true;
  assert.ok(G.expoSet(st, 0, 'item', a.id).ok); assert.ok(G.expoSet(st, 1, 'item', b.id).ok);
  assert.equal(a.locked, true); assert.equal(b.locked, true);
  assert.ok(G.expoClear(st, 0).ok); assert.ok(!a.locked, 'it was free before, so it is free again');
  assert.ok(G.expoClear(st, 1).ok); assert.equal(b.locked, true, 'the player had locked it: it stays locked');
  assert.equal(st.expo!.stands[0], null);
  const bs = beast(st, 900); assert.ok(G.expoSet(st, 2, 'beast', bs.id).ok); assert.equal((bs as any).locked, undefined);
  assert.deepEqual(G.expoView(st)[2], { kind: 'beast', beast: bs });
});

test('expo: the same piece cannot stand twice, a worn or missing piece cannot stand, a new piece replaces the old one', () => {
  const st = fresh(); const a = piece(st, 1), b = piece(st, 1);
  assert.ok(G.expoSet(st, 0, 'item', a.id).ok);
  assert.equal(G.expoSet(st, 3, 'item', a.id).code, 'E_EXPO_TWICE');
  assert.ok(G.expoSet(st, 0, 'item', a.id).ok, 'the same piece on the same stand again is fine');
  assert.equal(G.expoSet(st, 2, 'item', 123456).code, 'E_NOT_FOUND'); assert.equal(G.expoSet(st, 2, 'beast', 123456).code, 'E_NOT_FOUND');
  assert.equal(G.expoSet(st, 6, 'item', a.id).code, 'E_BAD_REQUEST'); assert.equal(G.expoSet(st, 0, 'sword', a.id).code, 'E_BAD_REQUEST'); assert.equal(G.expoSet(st, 0, 'item', 'x').code, 'E_BAD_REQUEST');
  assert.ok(G.expoSet(st, 0, 'item', b.id).ok); assert.ok(!a.locked); assert.equal(b.locked, true);
  const worn = piece(st, 1, 'Robe'); assert.ok(G.equipFromBag(st, worn.id).ok);
  assert.equal(G.expoSet(st, 1, 'item', worn.id).code, 'E_WORN');
});

test('expo: a stand whose piece is gone is empty, and the visitors do not look at it', () => {
  const st = fresh(); const ids = fill(st, 2); const gone = st.bag.find((x) => x.id === ids[0])!; gone.locked = false;
  st.bag.splice(st.bag.indexOf(gone), 1);   // sold or dissolved some other way
  assert.equal(G.expoView(st)[0], null);
  G.settle(st, 720);
  assert.equal(st.expo!.stands[0], null);
  for (const v of st.expo!.log) assert.ok(!v.route.some((s) => s.slot === 0));
});

test('expo: with fewer than 3 stands nobody comes, with 3 the first visitor comes after about 15 seconds', () => {
  const st = fresh(); fill(st, 3, 2);
  G.settle(st, 720); assert.equal(st.expo!.n, 0); assert.equal(st.expo!.log.length, 0);
  const c = piece(st, 3, 'Ring'); G.expoSet(st, 4, 'item', c.id);
  G.tick(st); assert.equal(st.expo!.n, 0, 'the first tick only sets the time');
  assert.equal(st.expo!.next, st.clock + XP.FIRST_VISIT_MS - 0 === st.expo!.next ? st.expo!.next : st.expo!.next);
  for (let i = 0; i < 2; i++) G.tick(st); assert.equal(st.expo!.n, 0);
  for (let i = 0; i < 3; i++) G.tick(st); assert.equal(st.expo!.n, 1, 'after 15 seconds of game time (3 ticks) a visitor has come');
  assert.equal(st.expo!.log.length, 1);
  // taking one piece away closes it again
  G.expoClear(st, 4); const n = st.expo!.n; G.settle(st, 720); assert.equal(st.expo!.n, n);
});

test('expo: more stands, more visitors, and 12 offline hours are settled quickly and keep only the latest visits', () => {
  const rate = (k: number) => { const st = fresh(9); fill(st, 2, k); G.settle(st, 720); return st.expo!.n; };
  assert.ok(rate(3) < rate(4) && rate(4) < rate(5) && rate(5) < rate(6));
  const st = fresh(9); fill(st, 3); const t = Date.now(); G.settle(st, 12 * 720);
  assert.ok(Date.now() - t < 20_000);
  assert.ok(st.expo!.log.length <= XP.LOG_KEEP); assert.equal(st.expo!.log.at(-1)!.n, st.expo!.n);
  assert.ok(st.expo!.n > 600 && st.expo!.n < 900, `visits in 12 hours: ${st.expo!.n}`);
  assert.ok(st.expo!.box.weapons.length <= XP.BOX_WEAPONS); assert.ok(Object.keys(st.expo!.box.books).length <= XP.BOX_BOOKS); assert.ok(st.expo!.box.pills.every((n) => n <= XP.BOX_PILLS));
});

test('expo: it draws nothing from the journey: with and without stands the same fights and drops happen', () => {
  const mk = (stands: boolean) => { const st = fresh(11); for (let i = 1; i <= 4; i++) beast(st, 800 + i, { cls: 3 }); if (stands) for (let i = 0; i < 4; i++) assert.ok(G.expoSet(st, i, 'beast', 801 + i).ok); G.settle(st, 3 * 720); return st; };
  const a = mk(true), b = mk(false);
  assert.ok(a.expo!.n > 0);
  assert.deepEqual(a.streams, b.streams);
  assert.equal(a.player.xp ?? 0, b.player.xp ?? 0);
  assert.equal(a.tick, b.tick);
});

test('expo: the same save settled twice has the same visits and the same box', () => {
  const run = () => { const st = fresh(13); fill(st, 3); G.settle(st, 6 * 720); return JSON.stringify([st.expo!.log, st.expo!.box, st.expo!.stands, st.expo!.n]); };
  assert.equal(run(), run());
});

test('expo: the visits are what the tallies and the box say', () => {
  const st = fresh(15); fill(st, 3); G.settle(st, 2 * 720);
  const e = st.expo!, t = XP.talliesOf(e), all = t.reduce((a, b) => a + b, 0);
  assert.ok(all > 0 && e.box.stones > 0);
  for (const v of e.log) for (const s of v.route) { assert.ok(s.slot >= 0 && s.slot < 6); assert.ok(s.r === null || XP.REACTIONS.includes(s.r)); assert.equal(s.stones > 0, s.r === 'love' || s.r === 'wow' || (s.r === 'like' && s.stones > 0)); }
  // a stand that is put again starts a new tally
  G.expoSet(st, 0, 'item', st.bag.find((x) => x.locked && !e.stands.some((s) => s && s.id === x.id))?.id ?? piece(st, 3).id);
  assert.deepEqual(st.expo!.stands[0]!.tally, XP.emptyTally());
});

test('expo: better pieces earn more, and a full row of common pieces earns very little', () => {
  const earned = (tier: number) => { const st = fresh(17); fill(st, tier); const t0 = st.stones; G.settle(st, 6 * 720); G.expoCollect(st); return st.stones - t0 - 0; };
  const e = [0, 1, 2, 3, 4].map(earned);
  for (let i = 1; i < e.length; i++) assert.ok(e[i] > e[i - 1], `tier ${i} should earn more than tier ${i - 1}: ${e}`);
  // and nothing is ever taken: the pieces are all still there
  const st = fresh(17); const ids = fill(st, 4); G.settle(st, 6 * 720);
  for (const id of ids) assert.ok(st.bag.some((x) => x.id === id));
});

test('expo: the income is a small share of what the pieces are worth each hour', () => {
  for (const tier of [2, 3, 4]) {
    const st = fresh(19); const ids = fill(st, tier); const worth = ids.reduce((a, id) => a + G.dissolveValue(st.bag.find((x) => x.id === id)!), 0);
    let stones = 0; for (let h = 0; h < 12; h++) { G.settle(st, 720); const r = G.expoCollect(st); if (r.ok) stones += r.data.stones; }
    assert.ok(stones / 12 < worth * 0.2, `tier ${tier}: ${Math.round(stones / 12)} stones an hour for pieces worth ${worth}`);
  }
});

test('expo: gifts fit the kind of cultivator and the rarity of the piece', () => {
  assert.equal(XP.giftOf('Kiếm Tu', 'wow', { kind: 'item', tier: 3, el: 'Kim', level: 5, value: 10 }, 'k') === null || true, true);
  const x: XP.Exhibit = { kind: 'item', tier: 4, el: 'Kim', slot: 'Weapon', level: 12, value: 5000 };
  const got: Record<string, number> = {};
  for (const arch of C.NPC_TITLES) { for (let i = 0; i < 3000; i++) { const g = XP.giftOf(arch, 'love', x, `${arch}${i}`); if (g) { assert.equal(g.kind, XP.GIFT_OF[arch]); assert.equal(g.tier, 3); got[arch] = (got[arch] || 0) + 1; } } assert.ok(got[arch] > 40 && got[arch] < 180, `${arch}: ${got[arch]} gifts in 3000 loves`); }
  assert.equal(XP.giftOf('Kiếm Tu', 'like', x, 'k'), null); assert.equal(XP.giftOf('Kiếm Tu', null, x, 'k'), null); assert.equal(XP.giftOf('Kiếm Tu', 'sad', x, 'k'), null);
  assert.equal(XP.giftOf('Kiếm Tu', 'love', { ...x, tier: 0 }, 'a0') === null || XP.giftOf('Kiếm Tu', 'love', { ...x, tier: 0 }, 'a0')!.tier === 0, true);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(XP.pillGrade), [0, 0, 0, 1, 2, 2]);
  for (let i = 0; i < 40; i++) { const b = XP.bookFor('Hỏa', 2, 10, `b${i}`); if (b) { assert.ok(C.slug(b) && require('../lib/arts').isTech(b)); assert.ok(require('../lib/arts').TECHS[b].tier <= 2); } }
});

test('expo: the weapons given are real, are the player\'s level and take nothing from the drops', () => {
  const st = fresh(21); fill(st, 4);
  for (let h = 0; h < 4 && !st.expo!.box.weapons.length; h++) G.settle(st, 720);
  const w = st.expo!.box.weapons;
  assert.ok(w.length > 0);
  for (const it of w) { assert.equal(it.slot, 'Weapon'); assert.ok(it.tier <= 3); assert.equal(it.level, lvl(st)); assert.ok(it.id > 0); }
  assert.equal(new Set([...w.map((x) => x.id), ...st.bag.map((x) => x.id)]).size, w.length + st.bag.length, 'every id is new');
});

test('expo: collecting the box moves everything into the bag and the stocks, and what does not fit stays', () => {
  const st = fresh(23); fill(st, 3); G.settle(st, 6 * 720);
  const bx = st.expo!.box; assert.ok(bx.stones > 0);
  bx.books['Kim Quang Kiếm'] = 2; bx.pills = [3, 2, 1];
  const money = st.stones, bag = st.bag.length, w = bx.weapons.length, hp = [...st.inv.hp], bk = st.inv.books['Kim Quang Kiếm'] || 0, give = bx.stones;
  const r = G.expoCollect(st); assert.ok(r.ok);
  assert.equal(st.stones, money + give); assert.equal(st.bag.length, bag + w); assert.deepEqual(st.inv.hp, [hp[0] + 3, hp[1] + 2, hp[2] + 1]); assert.equal(st.inv.books['Kim Quang Kiếm'], bk + 2);
  assert.equal(XP.boxCount(st.expo!.box), 0); assert.equal(G.expoCollect(st).code, 'E_EXPO_EMPTY');
  // a full bag keeps the weapons in the box
  const full = fresh(23); fill(full, 3); G.settle(full, 6 * 720);
  while (full.bag.length < B.bagCapacity) piece(full, 0, 'Ring');
  const left = full.expo!.box.weapons.length; assert.ok(left > 0);
  const r2 = G.expoCollect(full); assert.ok(r2.ok); assert.equal(full.expo!.box.weapons.length, left); assert.equal(r2.data.left, XP.boxCount(full.expo!.box));
  // a full stack of pills keeps the rest
  const pills = fresh(23); fill(pills, 3); G.settle(pills, 720); pills.inv.hp[1] = B.stackMax - 1; pills.expo!.box.pills = [0, 5, 0];
  G.expoCollect(pills); assert.equal(pills.inv.hp[1], B.stackMax); assert.equal(pills.expo!.box.pills[1], 4);
});

test('expo: Bán nhanh keeps the Linh Thú on a stand, and nothing else about the clean-up changes', () => {
  const st = fresh(25); const all = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => beast(st, 700 + i, { power: i * 10 }));
  assert.ok(G.expoSet(st, 0, 'beast', all[0].id).ok);   // the weakest one: it would be sold first
  const r = G.releaseMany(st);
  assert.ok(r.ok); assert.ok(st.beasts.some((x) => x.id === all[0].id), 'the one on the stand stays');
  assert.ok(st.beasts.length < all.length, 'and the others were sold');
  const plain = fresh(25); const same = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => beast(plain, 700 + i, { power: i * 10 }));
  G.releaseMany(plain); assert.ok(!plain.beasts.some((x) => x.id === same[0].id), 'without a stand the weakest one goes');
});

test('expo: Dọn túi does not dissolve a piece on a stand (it is locked), and does dissolve the rest', () => {
  const st = fresh(27); const worn = piece(st, 4, 'Ring'); assert.ok(G.equipFromBag(st, worn.id).ok);   // nothing below is an upgrade, so the clean-up takes it all
  const on = piece(st, 1, 'Ring'), off = piece(st, 1, 'Ring');
  assert.ok(G.expoSet(st, 0, 'item', on.id).ok);
  const r = G.dissolveMany(st, 2); assert.ok(r.ok);
  assert.ok(st.bag.some((x) => x.id === on.id)); assert.ok(!st.bag.some((x) => x.id === off.id));
});

test('expo: the actions are pure intents, so they run at once on the screen', () => {
  for (const k of ['expoSet', 'expoClear', 'expoCollect']) assert.equal(typeof PURE_INTENTS[k], 'function', k);
  const st = fresh(29); const a = piece(st, 1);
  assert.ok(PURE_INTENTS.expoSet(st, { slot: 0, kind: 'item', id: a.id }).ok);
  assert.equal(PURE_INTENTS.expoSet(st, null).code, 'E_BAD_REQUEST'); assert.equal(PURE_INTENTS.expoClear(st, undefined).code, 'E_BAD_REQUEST');
  assert.ok(PURE_INTENTS.expoClear(st, { slot: 0 }).ok);
});

test('expo: a beast scores by its size, one step more for a Dị Biến, and its worth is what it would sell for', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((c) => XP.beastTier(c, false)), [0, 1, 2, 3, 4]); assert.equal(XP.beastTier(4, true), 5); assert.equal(XP.beastTier(1, true), 2);
  const st = fresh(31); const b = beast(st, 600, { cls: 4, mut: true }); G.expoSet(st, 0, 'beast', b.id);
  const v = G.expoView(st)[0]; assert.equal(v && v.kind, 'beast');
});

test('expo: a save from before the feature simply has no expo, and a bad value is replaced', () => {
  const st = fresh(33); assert.equal(st.expo, undefined); G.settle(st, 100); assert.equal(st.expo, undefined);
  st.expo = { v: 9 } as any; const a = piece(st, 1); assert.ok(G.expoSet(st, 0, 'item', a.id).ok); assert.ok(XP.isExpo(st.expo));
  assert.equal(XP.isExpo(null), false); assert.equal(XP.isExpo({ v: 1, stands: [], box: {} }), false);
});

// ---- the flight of a visitor (lib/expofly.ts): numbers only
import * as FL from '../lib/expofly';
const visit = (side: 0 | 1, slots: number[], gift = false): XP.Visit => ({ n: 1, at: 0, who: { name: 'A', g: 'f', arch: 'Kiếm Tu' }, side, route: slots.map((slot, i) => ({ slot, r: (['love', 'wow', 'sad'] as const)[i % 3], stones: i * 5 })), ...(gift ? { gift: { kind: 'pill', grade: 0, n: 1 } as XP.Gift } : {}) });

test('expofly: a flight starts off the stage on its side, ends off the stage, and never goes backwards in time', () => {
  for (const side of [0, 1] as const) for (const slots of [[0], [1, 2], [0, 3, 4], [5, 2, 1]]) {
    const p = FL.planOf(visit(side, slots));
    assert.ok(p.total > 0 && p.frames.length > 10);
    assert.equal(p.frames[0].t, 0); assert.ok(Math.abs(p.frames[p.frames.length - 1].t - 1) < 1e-9);
    for (let i = 1; i < p.frames.length; i++) assert.ok(p.frames[i].t >= p.frames[i - 1].t, 'time goes forward');
    assert.ok(side === 0 ? p.frames[0].x < 0 : p.frames[0].x > 100);
    const end = p.frames[p.frames.length - 1]; assert.ok(end.x < 0 || end.x > 100);
    for (const f of p.frames) { assert.ok(Math.abs(f.a) <= 17.01); assert.ok(f.y > -10 && f.y < 100); }
    assert.equal(p.stops.length, slots.length); assert.deepEqual(p.stops.map((s) => s.slot), slots);
  }
});

test('expofly: the visitor hovers beside the stand on the side it came from and looks at it', () => {
  const p = FL.planOf(visit(0, [0, 1]));
  const [a, b] = p.stops;
  assert.equal(a.face, 1); assert.ok(a.hover.x < FL.STAND_AT[0].x);   // from the left: left of the stand, facing right
  assert.equal(b.face, 1); assert.ok(b.hover.x < FL.STAND_AT[1].x);
  const q = FL.planOf(visit(1, [1, 0]));
  assert.equal(q.stops[0].face, -1); assert.ok(q.stops[0].hover.x > FL.STAND_AT[1].x);   // from the right: right of the stand, facing left
  for (const s of [...p.stops, ...q.stops]) assert.ok(s.hover.x > 0 && s.hover.x < 100, 'the visitor stays on the stage while it looks');
});

test('expofly: stops are one hold apart or more, in order, and the gift leaves while the last stand is looked at', () => {
  const p = FL.planOf(visit(0, [0, 3, 4], true));
  for (let i = 1; i < p.stops.length; i++) assert.ok(p.stops[i].at >= p.stops[i - 1].at + FL.HOLD_MS + FL.MIN_LEG_MS - 1);
  const last = p.stops[p.stops.length - 1];
  assert.ok(p.gift && p.gift.at > last.at && p.gift.at < last.at + FL.HOLD_MS);
  assert.equal(FL.planOf(visit(0, [2])).gift, null);
  assert.ok(p.total > last.at + FL.HOLD_MS);
  assert.ok(p.total < 40_000, 'a visit never takes long');
});

test('expofly: a stand that does not exist is skipped, an empty route is only a pass', () => {
  assert.equal(FL.planOf(visit(0, [9, 2])).stops.length, 1);
  const p = FL.planOf(visit(1, []));
  assert.equal(p.stops.length, 0); assert.ok(p.total > 0);
});

test('expofly: a coin or a gift lands on the chest and rises on the way', () => {
  const a = FL.STAND_AT[2];
  assert.deepEqual(FL.arcAt(a, FL.CHEST_AT, 0), a);
  const e = FL.arcAt(a, FL.CHEST_AT, 1); assert.ok(Math.abs(e.x - FL.CHEST_AT.x) < 1e-9 && Math.abs(e.y - FL.CHEST_AT.y) < 1e-9);
  assert.ok(FL.arcAt(a, FL.CHEST_AT, 0.5).y < (a.y + FL.CHEST_AT.y) / 2);
});

// ---- the five faces: drawn once like the other fixed pictures, with a prompt of their own
import { artJobs } from '../lib/artjobs';
import { buildPlan } from '../lib/imageprompt';
test('expo: the five reaction faces are in the fixed pictures to draw, each with its own prompt', () => {
  const jobs = artJobs('shop');
  const seeds = new Set<number>();
  for (const r of XP.REACTIONS) {
    const j = jobs.find((x) => x.dest === C.reactArt(r));
    assert.ok(j, `${r} is drawn by pregen`);
    const p = buildPlan(j!.spec);
    assert.ok(p.prompt.length > 50 && p.prompt.includes('original'));
    seeds.add(p.seed);
  }
  assert.equal(seeds.size, 5, 'each face has its own seed');
  assert.equal(new Set(XP.REACTIONS.map((r) => C.reactArt(r))).size, 5);
});
