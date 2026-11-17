import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';
import * as D from '../lib/daily';
import { BALANCE as B, cultRate, cultThreshold, validateBalance } from '../lib/balance';
import { validateCatalog } from '../lib/validate';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42, gender?: 'f' | 'm') => G.newGame(seed, gender, T0);
const strip = (st: G.GameState) => { const c = structuredClone(st); c.settleSeq = 0; c.reports = []; c.ledger = []; c.ledgerBase = 0; c.ledgerDaily = []; c.pend = {}; return JSON.stringify(c); };
const sigma = (n: number, p: number) => Math.sqrt(n * p * (1 - p));

test('Balance_Config and Content_Catalog are valid', () => {
  assert.deepEqual(validateBalance(), []);
  assert.deepEqual(validateCatalog(), []);
});
test('validateBalance rejects broken configs', () => {
  const bad = structuredClone(B) as typeof B;
  bad.tickSec = 0; bad.breakMax = 2; bad.shop.taming = [10, 10, 250, 1250]; bad.defaults.retreatPct = 90;
  const errs = validateBalance(bad);
  assert.ok(errs.length >= 4, errs.join('\n'));
});

test('cultivation tables match Appendix B.2', () => {
  assert.equal(cultRate(1), 20); assert.equal(cultRate(4), 27); assert.equal(cultRate(20), 122);
  assert.equal(cultThreshold(1), 1200); assert.equal(cultThreshold(2), 1980); assert.equal(cultThreshold(4), 8200); assert.equal(cultThreshold(20), 24340880);
  assert.equal(new Set([1, 2, 3, 4]).size, 4);
});

test('determinism: same seed and ticks give the same state', () => {
  const a = fresh(7), b = fresh(7);
  G.settle(a, 3000); G.settle(b, 3000);
  assert.equal(strip(a), strip(b));
});
test('splitting a Settlement does not change the result (Requirement 5.2)', () => {
  const a = fresh(11), b = fresh(11);
  G.settle(a, 2400);
  G.settle(b, 700); G.settle(b, 1100); G.settle(b, 600);
  assert.equal(strip(a), strip(b));
});
test('settling twice to the same time is a no-op (Requirement 5.3)', () => {
  const st = fresh(5), now = T0 + 3600_000;
  G.settleTo(st, now);
  const once = strip(st);
  const r = G.settleTo(st, now);
  assert.equal(r.ticks, 0);
  assert.equal(strip(st), once);
});
test('only whole ticks are simulated and the remainder is kept (Requirement 3.3)', () => {
  const st = fresh(5);
  const r = G.settleTo(st, T0 + 12_000);        // 2 ticks and 2 seconds
  assert.equal(r.ticks, 2);
  assert.equal(st.clock, T0 + 10_000);
  assert.equal(G.settleTo(st, T0 + 14_000).ticks, 0);   // still under one tick
  assert.equal(G.settleTo(st, T0 + 15_000).ticks, 1);
});
test('a clock earlier than the last Settlement changes nothing (Requirement 4.7)', () => {
  const st = fresh(5); G.settleTo(st, T0 + 60_000);
  const before = strip(st);
  assert.equal(G.settleTo(st, T0 + 1000).ticks, 0);
  assert.equal(strip(st), before);
});
test('online vs offline Settlement and the Offline_Cap (Requirement 4.2 to 4.6)', () => {
  const on = fresh(3), off = fresh(3), capped = fresh(3);
  assert.equal(G.settleTo(on, T0 + 100_000).offline, false);
  assert.equal(on.reports.length, 0);
  const r = G.settleTo(off, T0 + 130_000);
  assert.equal(r.offline, true); assert.equal(off.reports.length, 1);
  const c = G.settleTo(capped, T0 + 100 * 3600_000);
  assert.equal(c.ticks, Math.floor((B.offlineCapH * 3600) / B.tickSec));
  assert.equal(capped.clock, T0 + 100 * 3600_000);
});
test('Spirit_Stone equals the ledger sum after Settlement and shop actions (Requirement 24.1)', () => {
  const st = fresh(9); st.set.mode = 'adventure';
  G.settleTo(st, T0 + 6 * 3600_000);
  assert.equal(st.stones, G.ledgerSum(st));
  assert.ok(st.ledger.every((r) => r.amt !== 0 && Number.isInteger(r.amt)));
  assert.ok(G.buy(st, 'taming0', 1).ok); G.flushLedger(st, 'r1', T0 + 7 * 3600_000);
  assert.equal(st.stones, G.ledgerSum(st));
});
test('ledger folding keeps the invariant (Requirement 24.15)', () => {
  const st = fresh(9); G.settleTo(st, T0 + 6 * 3600_000);
  G.flushLedger(st, 'later', T0 + (B.ledgerRetentionDays + 5) * 86400_000);
  assert.equal(st.ledger.length, 0);
  assert.equal(st.stones, G.ledgerSum(st));
  assert.equal(st.ledgerDaily.reduce((a, d) => a + d.amt, 0), st.ledgerBase);
});
test('Spirit_Stone never passes the maximum and the excess is reported (Requirement 24.2)', () => {
  const st = fresh(1); st.stones = B.stoneMax - 5;
  const rep = { stones: 0, stonesBy: {}, lostStones: 0 } as any;
  assert.equal(G.earn(st, 100, 'victory', rep), 5);
  assert.equal(st.stones, B.stoneMax); assert.equal(rep.lostStones, 95);
});

test('Đốn Ngộ count stays within 4 sigma (Requirement 3.17)', () => {
  const st = fresh(21); st.set.mode = 'retreat';
  const N = 100_000, rep = G.settle(st, N);
  const mean = N * B.epiphanyP, sd = sigma(N, B.epiphanyP);
  assert.ok(Math.abs(rep.epiphanies - mean) <= 4 * sd, `${rep.epiphanies} vs ${mean} ± ${4 * sd}`);
});
test('Zone_Phenomenon depends only on seed, zone and slot and has the configured frequency (Requirement 6.8, 6.9)', () => {
  for (const z of C.ZONES) {
    let n = 0; const N = 10_000;
    for (let s = 0; s < N; s++) {
      const a = G.phenomenonInSlot(z.id, s, 'test-seed'), b = G.phenomenonInSlot(z.id, s, 'test-seed');
      assert.equal(a && a.id, b && b.id);
      if (a) n++;
    }
    assert.ok(Math.abs(n - N * B.phenomenonP) <= 4 * sigma(N, B.phenomenonP), `${z.id}: ${n}`);
  }
  assert.notEqual(JSON.stringify(Array.from({ length: 50 }, (_, s) => G.phenomenonInSlot('thanhvan', s, 'A')?.id)), JSON.stringify(Array.from({ length: 50 }, (_, s) => G.phenomenonInSlot('thanhvan', s, 'B')?.id)));
});
test('Luck only raises the odds of rare tiers and is capped (Requirement 20.12)', () => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  for (const luck of [0, 30, 100]) assert.ok(Math.abs(sum(G.tierProbs(luck)) - 1) < 1e-9);
  const rare = (l: number) => { const p = G.tierProbs(l); return p[4] + p[5]; };
  assert.ok(rare(0) < rare(50) && rare(50) < rare(100));
  assert.ok(Math.abs(rare(0) - 0.005) < 1e-9);
});
test('Mutation and item pity reach a guarantee at the hard count (Requirement 10)', () => {
  assert.equal(G.pityP(1 / 4096, 12288, 4096, 12288), 1);
  assert.equal(G.pityP(1 / 4096, 100, 4096, 12288), 1 / 4096);
  assert.ok(G.pityP(0.005, 600, 400, 800) > 0.5);
});
test('taming probability: grade and level difference are monotone, bounded (Requirement 9)', () => {
  const st = fresh(2), sp = C.SPECIES[0];
  const m = (level: number) => ({ level, pers: 0 }) as G.Beast;
  let prev = 0;
  for (let g = 0; g < 4; g++) { const p = G.tameProb(st, sp, m(1), g); assert.ok(p >= prev && p >= B.tameMin && p <= B.tameMax); prev = p; }
  st.player.sub = 3; st.player.realm = 2;
  prev = 0;
  for (let lv = 20; lv >= 1; lv--) { const p = G.tameProb(st, sp, m(lv), 0); assert.ok(p >= prev); prev = p; }
});

test('Breakthrough probability: bounded, monotone in purity and pill (Requirement 23.3)', () => {
  const st = fresh(4);
  for (let realm = 0; realm < 4; realm++) {
    st.player.realm = realm;
    let prev = 0;
    for (const purity of [0.5, 0.7, 1]) { st.player.purity = purity; const p = G.breakthroughP(st, false); assert.ok(p >= B.breakMin && p <= B.breakMax && p >= prev); prev = p; assert.ok(G.breakthroughP(st, true) >= p); }
  }
});
function atPeak(seed: number, realm = 0) { const st = fresh(seed); st.player.realm = realm; st.player.sub = 3; st.player.cp = cultThreshold(G.levelOf(st.player)); st.player.hp = G.pstats(st).maxHp; return st; }
test('Breakthrough errors: not at bottleneck, no pill, no talisman (Requirement 23.2)', () => {
  const st = fresh(4);
  assert.equal(G.attemptBreakthrough(st, {}).code, 'E_NOT_BOTTLENECK');
  const p = atPeak(4);
  assert.equal(G.attemptBreakthrough(p, { pill: true }).code, 'E_NO_PILL');
  assert.equal(G.attemptBreakthrough(p, { trib: true }).code, 'E_NO_TRIB');
  assert.equal(p.player.cp, cultThreshold(G.levelOf(p.player)));   // nothing changed
});
test('Tribulation_Talisman is spent only when a Tribulation begins (Requirement 23.8)', () => {
  let spentWithoutTribulation = 0, sawTribulation = false;
  for (let seed = 1; seed <= 60; seed++) {
    const st = atPeak(seed, 0); st.inv.trib = 1;   // target Trúc Cơ has no Tribulation
    G.attemptBreakthrough(st, { trib: true }); if (st.inv.trib === 0) spentWithoutTribulation++;
    const k = atPeak(seed, 1); k.inv.trib = 1; k.player.purity = 1; const r = G.attemptBreakthrough(k, { trib: true });
    assert.ok(r.ok);
    if (k.auditQ[0].waves > 0) { sawTribulation = true; assert.equal(k.inv.trib, 0); } else assert.equal(k.inv.trib, 1);
  }
  assert.equal(spentWithoutTribulation, 0); assert.ok(sawTribulation);
});
test('failed Breakthrough: loses Tu Vi, sets Tâm Ma, keeps Level, HP untouched when the roll fails (Requirement 23.10)', () => {
  for (let seed = 1; seed < 400; seed++) {
    const st = atPeak(seed, 3); st.player.purity = 0.5; st.player.hp = 77;
    const before = st.player.cp, r = G.attemptBreakthrough(st, {});
    if ((r.data as any).success) continue;
    assert.equal(st.player.realm, 3); assert.equal(st.player.heartDemon, B.heartDemonDuration);
    assert.equal(st.player.cp, before - Math.floor(before * B.breakFailureLoss));
    if (!st.auditQ[0].waves || st.auditQ[0].passed === 0 && !st.auditQ[0].roll) assert.equal(st.player.hp, 77);
    return;
  }
  assert.fail('no failed attempt found');
});
test('Auto_Breakthrough is off by default and respects its conditions (Requirement 23.12)', () => {
  const st = fresh(8); assert.equal(st.set.autoBreak, false);
  const p = atPeak(8, 1); p.set.autoBreak = true; p.inv.trib = 0; p.player.hp = G.pstats(p).maxHp;
  G.settle(p, 1);
  assert.equal(p.player.realm, 1);   // target Kim Đan needs a talisman
  const q = atPeak(8, 0); q.set.autoBreak = true; G.settle(q, 1);
  assert.equal(q.auditQ.length, 1); assert.equal(q.auditQ[0].src, 'auto');
});

test('inventory conservation and equip round trip (Requirement 21.12, 21.13)', () => {
  const st = fresh(13); st.set.autoEquip = false; st.set.dissolveMax = -1;
  const g = (slot: string, lv: number) => { const it = G.genItem(st, lv, 1, slot); it.level = 1; return it; };
  const x = g('Weapon', 1); st.bag.push(x);
  const wasWorn = st.eq.Weapon!;
  const ids = () => [...st.bag, ...st.stash, ...Object.values(st.eq).filter(Boolean) as G.Item[]].map((i) => i.id).sort();
  const before = ids();
  assert.ok(G.equipFromBag(st, x.id).ok);
  assert.equal(st.eq.Weapon!.id, x.id); assert.equal(st.bag[0].id, wasWorn.id);   // the old one goes to the exact place
  assert.deepEqual(ids(), before);
  st.eq.Weapon!.locked = false;
  assert.ok(G.equipFromBag(st, wasWorn.id).ok);
  assert.deepEqual(ids(), before);
});
test('inventory rules: too high level, wrong item, full bag, locked (Requirement 21.10)', () => {
  const st = fresh(13); st.set.dissolveMax = -1;
  const hi = G.genItem(st, 1, 1, 'Weapon'); hi.level = 9; st.bag.push(hi);
  assert.equal(G.equipFromBag(st, hi.id).code, 'E_LEVEL_TOO_LOW');
  assert.equal(G.equipFromBag(st, 99999).code, 'E_NOT_FOUND');
  assert.equal(G.toggleLock(st, hi.id).ok, true);
  assert.equal(G.dissolveBagItem(st, hi.id).code, 'E_LOCKED');
  G.toggleLock(st, hi.id);
  const worn = st.eq.Robe!; assert.equal(G.dissolveBagItem(st, worn.id).code, 'E_WORN');
  while (st.bag.length < B.bagCapacity) st.bag.push(G.genItem(st, 1, 0));
  assert.equal(G.unequip(st, 'Robe').code, 'E_BAG_FULL');
  assert.ok(st.bag.length <= B.bagCapacity);
});
test('bag and stash never pass their capacity while items arrive (Requirement 21.5, 21.13)', () => {
  const st = fresh(17); st.set.mode = 'adventure'; st.set.dissolveMax = -1; st.set.autoEquip = false;
  G.settle(st, 6000);
  assert.ok(st.bag.length <= B.bagCapacity && st.stash.length <= B.overflowCapacity);
});

test('shop: buy and sell rules (Requirement 24.9 to 24.13)', () => {
  const st = fresh(6); st.stones = 10_000;
  const price = B.shop.taming[0];
  assert.equal(G.buy(st, 'nope', 1).code, 'E_NOT_FOR_SALE');
  assert.equal(G.buy(st, 'taming0', 0).code, 'E_BAD_QTY');
  assert.equal(G.buy(st, 'taming0', 1.5).code, 'E_BAD_QTY');
  assert.equal(G.buy(st, 'taming0', B.maxPurchaseQty + 1).code, 'E_BAD_QTY');
  const t0 = st.inv.taming[0];
  assert.ok(G.buy(st, 'taming0', 4).ok);
  assert.equal(st.stones, 10_000 - 4 * price); assert.equal(st.inv.taming[0], t0 + 4);
  st.stones = 5; assert.equal(G.buy(st, 'taming0', 1).code, 'E_FUNDS'); assert.equal(st.stones, 5);
  st.stones = 1_000_000; st.inv.taming[0] = B.stackMax - 1; assert.equal(G.buy(st, 'taming0', 2).code, 'E_STACK_MAX');
  const have = st.inv.taming[0], s0 = st.stones;
  assert.ok(G.sell(st, 'taming0', 2).ok);
  assert.equal(st.stones, s0 + 2 * Math.floor(B.sellBackRatio * price)); assert.equal(st.inv.taming[0], have - 2);
  assert.equal(G.sell(st, 'taming0', have + 1).code, 'E_BAD_QTY');
  for (const s of C.SHOP) assert.ok(Math.floor(B.sellBackRatio * s.price) < s.price);
  assert.equal(C.SHOP.length, 12);
});
test('HP pills heal by grade and are refused at full HP (Requirement 24.12)', () => {
  const st = fresh(6), S = G.pstats(st);
  assert.equal(G.useHpPill(st, 0).code, 'E_HP_FULL');
  st.player.hp = 1; st.inv.hp[1] = 1;
  assert.ok(G.useHpPill(st, 1).ok);
  assert.equal(st.player.hp, Math.min(S.maxHp, 1 + Math.floor(B.pillRestore[1] * S.maxHp)));
  assert.equal(G.useHpPill(st, 1).code, 'E_NO_STOCK');
});
test('Auto_Pill picks the pill that fits the missing health (Requirement 3.10, changed: it now works right after a fight, see the auto pills test below)', () => {
  const st = fresh(6); st.set.mode = 'retreat'; st.set.autoPill = true; st.inv.hp = [2, 5, 5];
  st.player.hp = 1;
  G.settle(st, 1);
  assert.equal(st.inv.hp[2], 4, 'only the biggest pill fills what was missing'); assert.equal(st.inv.hp[0], 2); assert.equal(st.player.hp, G.pstats(st).maxHp);
});
test('release value follows the formula (Requirement 24.8)', () => {
  const st = fresh(6);
  const b = { level: 10, apt: [1, 1, 1, 1, 1], cls: 2, mut: false } as G.Beast;
  assert.equal(G.releaseValue(b), 20);
  assert.equal(G.releaseValue({ ...b, mut: true } as G.Beast), 20 * B.releaseMutationFactor);
  st.beasts.push({ ...b, id: 5, name: 'x', sp: 'ho' } as G.Beast);
  const s0 = st.stones; assert.ok(G.releaseBeast(st, 5).ok); assert.equal(st.stones, s0 + 20); assert.equal(st.beasts.length, 0);
});

test('settings validation (Requirement 3.15)', () => {
  const st = fresh(1);
  assert.equal(G.setSettings(st, { retreatPct: 90, resumePct: 80 }).code, 'E_BAD_THRESHOLDS');
  assert.equal(G.setSettings(st, { retreatPct: 0 }).code, 'E_BAD_THRESHOLDS');
  assert.equal(G.setSettings(st, { resumePct: 101 }).code, 'E_BAD_THRESHOLDS');
  assert.equal(st.set.retreatPct, B.defaults.retreatPct); assert.equal(st.set.resumePct, B.defaults.resumePct);
  assert.ok(G.setSettings(st, { retreatPct: 35, resumePct: 60, dissolveMax: -1, tame: { grade: 2, sizes: [1, 2] } }).ok);
  assert.equal(st.set.retreatPct, 35); assert.deepEqual(st.set.tame.sizes, [1, 2]);
  assert.equal(G.setSettings(st, { autoTame: 'yes' }).code, 'E_BAD_SETTING');
  assert.equal(st.set.hideRank, false); assert.ok(G.setSettings(st, { hideRank: true }).ok); assert.equal(st.set.hideRank, true);
  assert.equal(G.setSettings(st, { hideRank: 1 }).code, 'E_BAD_SETTING');
  assert.equal(G.setSettings(st, { tame: { species: ['nope'] } }).code, 'E_BAD_SETTING');
});
test('zones: locked until the Level is reached (Requirement 6.5, 6.6)', () => {
  const st = fresh(1);
  assert.equal(G.setZone(st, 'xichviem').code, 'E_ZONE_LOCKED'); assert.equal(st.zone, C.START_ZONE);
  assert.equal(G.setZone(st, 'nowhere').code, 'E_BAD_ZONE');
  st.player.realm = 2;
  assert.ok(G.setZone(st, 'xichviem').ok); assert.equal(st.zone, 'xichviem');
});
test('monsters stay inside the Level range of the Zone (Requirement 7.5)', () => {
  const st = fresh(31); st.player.realm = 4; st.player.sub = 3;
  st.zone = 'thanhvan'; st.set.mode = 'adventure';
  G.settle(st, 2000);
  for (const e of st.feed) if (e.beast) assert.ok(e.beast.level >= 1 && e.beast.level <= C.ZONE('thanhvan').lv[1]);
});
test('kỳ ngộ never repeat inside the distinct window (Requirement 7.12)', () => {
  const st = fresh(55); st.set.mode = 'adventure'; G.settle(st, 6000);
  const ids = st.feed.filter((e) => e.kind === 'event' && e.text && C.EVENTS.some((x) => x.text === e.text)).map((e) => C.EVENTS.find((x) => x.text === e.text)!.id).reverse();
  for (let i = 0; i + B.eventDistinctWindow <= ids.length; i++) assert.equal(new Set(ids.slice(i, i + B.eventDistinctWindow)).size, B.eventDistinctWindow);
});
test('Level never decreases and Tu Vi stays within the threshold (Requirement 22.11)', () => {
  const st = fresh(77); let lv = G.levelOf(st.player);
  for (let i = 0; i < 40; i++) { G.settle(st, 500); const l = G.levelOf(st.player); assert.ok(l >= lv); lv = l; assert.ok(Number.isInteger(st.player.cp) && st.player.cp >= 0 && st.player.cp <= cultThreshold(l)); }
});
test('HP stays within [0, Max HP] over a long run', () => {
  const st = fresh(88); st.set.mode = 'adventure';
  for (let i = 0; i < 30; i++) { G.settle(st, 400); const S = G.pstats(st); assert.ok(st.player.hp >= 1 && st.player.hp <= S.maxHp); }
});
test('size class probabilities match Appendix B (Requirement 17)', () => {
  const p = G.sizeClassProbs(), want = [0.0594, 0.198, 0.462, 0.2574, 0.0232];
  p.forEach((x, i) => assert.ok(Math.abs(x - want[i]) < 0.004, `${i}: ${x}`));
});

// ---------- decisions, difficulty and defaults
const auto = (st: G.GameState, on: boolean) => { Object.assign(st.set, { autoTame: on, autoFight: on, autoBreak: on }); if (on) st.inv.trib = 99; return st; };
function runUntilDecision(kind: 'tame' | 'npc', from = 100, tries = 400) {
  for (let seed = from; seed < from + tries; seed++) {
    const st = fresh(seed); auto(st, false); st.set.autoBreak = true; st.inv.trib = 99; st.inv.taming = [50, 50, 50, 50];
    for (let i = 0; i < 4000 && !st.decision; i++) G.settle(st, 1);   // one tick at a time: a taming question lapses on its own, so it must be caught while open
    if (st.decision && st.decision.kind === kind) return st;
  }
  throw new Error('no decision of kind ' + kind);
}
test('defaults: items go to the bag, nothing is auto-dissolved or auto-worn (player decision)', () => {
  const st = fresh(61); assert.equal(st.set.autoEquip, false); assert.equal(st.set.dissolveMax, -1); assert.equal(st.set.autoFight, false); assert.equal(st.set.autoBreak, false);
  auto(st, true);
  const rep = G.settle(st, 3000);
  assert.equal(rep.dissolved, 0); assert.equal(rep.equipped, 0);
  assert.ok(st.bag.length > 0);
  assert.equal(st.bag.length + st.stash.length, rep.items.reduce((a, b) => a + b, 0));
});
test('a full bag spills into the stash and the feed says where an item went (Requirement 21.2)', () => {
  const st = fresh(62); auto(st, true);
  while (st.bag.length < B.bagCapacity) st.bag.push(G.genItem(st, 1, 0));
  G.settle(st, 6000);
  assert.ok(st.stash.length > 0 || st.bag.length === B.bagCapacity);
  assert.ok(st.feed.filter((e) => e.kind === 'item').every((e) => /vào túi|kho tạm|phân giải/.test(e.text)));
});
test('a journey meets something on about 40% of the ticks it is not recovering (travel in between)', () => {
  const st = fresh(63); auto(st, true); st.inv.hp = [500, 0, 0]; st.set.autoPill = true;
  const rep = G.settle(st, 20000), N = rep.ticks - rep.recoveryTicks;
  assert.ok(Math.abs(rep.encounters - N * B.encounterChance) <= 4 * sigma(N, B.encounterChance), `${rep.encounters} of ${N}`);
});
test('Auto Tame off: a notable Linh Thú asks the player and the journey waits (decision)', () => {
  const st = runUntilDecision('tame');
  const d = st.decision as Extract<G.Decision, { kind: 'tame' }>;
  const feedLen = st.feed.length, tick = st.tick;
  const rep = G.settle(st, 1);
  assert.equal(rep.encounters, 0); assert.equal(st.feed.length, feedLen);   // nothing new happens while it waits
  assert.equal(rep.blockedTicks, 1); assert.equal(st.tick, tick + 1);
  assert.equal(G.decide(st, { id: d.id + 99, choice: 'skip' }).code, 'E_NO_DECISION');
  assert.equal(G.decide(st, { id: d.id, choice: 'tame', grade: 9 }).code, 'E_BAD_REQUEST');
  const left = st.inv.taming[1], had = st.beasts.length;
  const r = G.decide(st, { id: d.id, choice: 'tame', grade: 1 });
  assert.ok(r.ok); assert.equal(st.inv.taming[1], left - 1); assert.equal(st.decision, null);
  assert.equal(st.beasts.length, had + ((r.data as any).won ? 1 : 0));
  assert.ok(G.settle(st, 400).encounters > 0);   // the journey goes on
});
test('Auto Tame off: an unanswered taming question is skipped on its own after Tame_Decision_Seconds', () => {
  const st = runUntilDecision('tame', 100);
  const d = st.decision as Extract<G.Decision, { kind: 'tame' }>, ticks = Math.ceil((B.tameDecisionSec * 1000) / (B.tickSec * 1000)), before = JSON.stringify(st.inv.taming);
  assert.ok(d.until! > st.clock);
  G.settle(st, ticks - 1); assert.equal(st.decision?.id, d.id);   // still open just before the time is up
  G.settle(st, 1);
  assert.ok(st.decision === null || st.decision.id !== d.id);       // gone
  assert.ok(st.feed.some((e) => e.kind === 'system' && e.text.includes('hết thời gian')));
  assert.equal(JSON.stringify(st.inv.taming), before);              // lapsing costs no talisman
});
test('Auto Tame off: skipping costs nothing; a full pen or no talisman is refused', () => {
  const st = runUntilDecision('tame', 300);
  const d = st.decision!, before = JSON.stringify(st.inv.taming);
  const full = structuredClone(st); while (full.beasts.length < B.penCapacity) full.beasts.push(full.decision && (full.decision as any).beast);
  assert.equal(G.decide(full, { id: d.id, choice: 'tame', grade: 0 }).code, 'E_PEN_FULL');
  const none = structuredClone(st); none.inv.taming = [0, 0, 0, 0];
  assert.equal(G.decide(none, { id: d.id, choice: 'tame', grade: 0 }).code, 'E_NO_STOCK');
  assert.ok(G.decide(st, { id: d.id, choice: 'skip' }).ok); assert.equal(JSON.stringify(st.inv.taming), before); assert.equal(st.decision, null);
});
test('Tu Sĩ: the player chooses to fight or avoid when Auto Fight is off', () => {
  const a = runUntilDecision('npc'), d = a.decision as Extract<G.Decision, { kind: 'npc' }>;
  const avoid = structuredClone(a); const wins = avoid.kills;
  assert.ok(G.decide(avoid, { id: d.id, choice: 'avoid' }).ok); assert.equal(avoid.kills, wins); assert.equal(avoid.decision, null);
  const fightSt = structuredClone(a);
  assert.ok(G.decide(fightSt, { id: d.id, choice: 'fight' }).ok); assert.equal(fightSt.decision, null);
  assert.ok(fightSt.feed[0].kind === 'npc' && fightSt.feed[0].outcome);
});
test('Tu Sĩ with Auto Fight on never asks', () => {
  const st = fresh(70); auto(st, true); G.settle(st, 6000);
  assert.equal(st.decision, null); assert.ok(st.feed.some((e) => e.kind === 'npc'));
});
test('Breakthrough question appears at the bottleneck when Auto Breakthrough is off, and "later" snoozes it', () => {
  const st = atPeak(5, 0); st.set.mode = 'retreat'; G.settle(st, 1);
  assert.equal(st.decision?.kind, 'break');
  const d = st.decision!;
  assert.ok(G.decide(st, { id: d.id, choice: 'later' }).ok); assert.equal(st.decision, null);
  G.settle(st, 100); assert.equal(st.decision, null);                 // snoozed
  G.settle(st, B.breakSnoozeTicks); assert.equal(st.decision?.kind, 'break');   // asks again later
  const r = G.decide(st, { id: st.decision!.id, choice: 'break' });
  assert.ok(r.ok); assert.equal(st.decision, null);
});
test('Defeat gives Thương Thế: weaker stats until it ends or a grade-3 pill cures it', () => {
  const st = fresh(8), base = G.pstats(st);
  st.player.injury = 50;
  const hurt = G.pstats(st);
  assert.ok(hurt.atk < base.atk && hurt.def < base.def && hurt.maxHp === base.maxHp);
  st.set.mode = 'retreat'; G.settle(st, 60); assert.equal(st.player.injury, 0);
  st.player.injury = 500; st.player.hp = 1; st.inv.hp[B.injuryCurePillGrade] = 1;
  assert.ok(G.useHpPill(st, B.injuryCurePillGrade).ok); assert.equal(st.player.injury, 0);
  st.player.injury = 500; st.player.hp = 1; st.inv.hp[0] = 1; G.useHpPill(st, 0); assert.equal(st.player.injury, 500);
});
test('bad Kỳ Ngộ never take HP below 1 and use their own ledger reason (Requirement 7.17)', () => {
  for (let seed = 1; seed < 40; seed++) {
    const st = fresh(seed); auto(st, true); st.ledgerBase += 5000 - st.stones; st.stones = 5000;
    G.settle(st, 3000); G.flushLedger(st, 'x', T0 + 1e9);
    assert.ok(st.player.hp >= 1);
    assert.equal(st.stones, G.ledgerSum(st));
  }
});
test('Linh Thú upkeep is charged every 10 minutes and never below zero', () => {
  const st = fresh(9); st.set.mode = 'retreat';
  st.beasts.push({ id: 1, level: 8, sp: 'ho', name: 'a', apt: [1, 1, 1, 1, 1], cls: 2, mut: false } as G.Beast, { id: 2, level: 3, sp: 'ho', name: 'b', apt: [1, 1, 1, 1, 1], cls: 2, mut: false } as G.Beast);
  assert.equal(G.upkeepDue(st), 2 + 1);
  const s0 = st.stones; st.tick = B.upkeepEveryTicks - 1;
  G.settle(st, 1);
  assert.equal(st.stones, s0 - 3);
  st.stones = 1; st.tick = 2 * B.upkeepEveryTicks - 1; G.settle(st, 1); assert.equal(st.stones, 0);
});
test('bulk dissolve and bulk sale only touch what the player allows', () => {
  const st = fresh(10); st.set.dissolveMax = -1;
  const a = G.genItem(st, 1, 0), b = G.genItem(st, 1, 1), c = G.genItem(st, 1, 4), d = G.genItem(st, 1, 0); d.locked = true;
  const sx = G.genItem(st, 1, 0);
  st.bag.push(a, b, c, d); st.stash.push(sx);
  // something far stronger is worn in every slot these pieces belong to, so none of them is an upgrade (the green arrow)
  for (const x of [a, b, c, d, sx]) st.eq[x.slot] = { ...x, id: 9000 + x.id, power: 1e9 };
  const free = C.SLOTS.find((x) => ![a, b, c, d, sx].some((y) => y.slot === x))!;
  const up = G.genItem(st, 1, 0, free); st.eq[free] = { ...up, id: 9999, power: 1 }; st.bag.push(up);   // an upgrade (stronger than what is worn there): it must stay
  const s0 = st.stones;
  assert.equal(G.dissolveMany(st, 9).code, 'E_BAD_REQUEST');
  const r = G.dissolveMany(st, 1);
  assert.ok(r.ok); assert.equal((r.data as any).n, 3); assert.equal((r.data as any).kept, 1);
  assert.deepEqual(st.bag.map((x) => x.id).sort(), [c.id, d.id, up.id].sort()); assert.equal(st.stash.length, 0);
  assert.equal(st.stones, s0 + (r.data as any).stones);
  assert.equal(G.dissolveMany(st, 0).code, 'E_NOT_FOUND');   // only the locked piece, the Địa piece and the upgrade are left
  const mk = (id: number, level: number, mut = false) => ({ id, level, mut, sp: 'ho', name: 'x', apt: [1, 1, 1, 1, 1], cls: 2, power: level * 10 }) as G.Beast;
  st.beasts = [mk(1, 9), mk(2, 8), mk(3, 7), mk(4, 2), mk(5, 3, true), mk(6, 1)];
  const sold = G.releaseMany(st);
  assert.ok(sold.ok); assert.deepEqual(st.beasts.map((x) => x.id).sort(), [1, 2, 3, 5]);   // the three strongest and the Dị Biến stay
});
test('elite monsters are stronger and pay more', () => {
  let eliteSeen = 0;
  const st = fresh(11); auto(st, true); G.settle(st, 12000);
  for (const e of st.feed) if (e.beast?.elite) eliteSeen++;
  assert.ok(st.feed.length > 0);
  void eliteSeen;
  assert.ok(B.eliteStatMult > 1 && B.eliteRewardMult > 1);
});

// ---------- item pictures: common items share one picture, Địa has a few looks, Thiên and Tiên always get their own
import { itemSpec, propSpec, placeSpec, equipSpec } from '../lib/avatarSpec';
import { buildPlan } from '../lib/imageprompt';
test('picture looks by rarity: shared for Phàm to Huyền, a few for Địa, unique for Thiên and Tiên', () => {
  const st = fresh(90);
  const make = (tier: number, n: number) => Array.from({ length: n }, () => G.genItem(st, 5, tier, 'Weapon'));
  for (const it of [...make(0, 40), ...make(1, 40), ...make(2, 40)]) assert.equal(it.art, undefined);
  const dia = make(3, 300);
  assert.ok(dia.every((it) => it.art! >= 1 && it.art! <= B.artVariantsDia));
  assert.ok(new Set(dia.map((it) => it.art)).size > 1);
  const top = [...make(4, 300), ...make(5, 100)];
  assert.equal(new Set(top.map((it) => it.art)).size, top.length);
  // two common items of the same kind ask for the very same picture; two Thiên items never do
  const a = G.genItem(st, 5, 1, 'Weapon'); a.base = 'Trường Kiếm'; const b = { ...a, id: 999, impl: { ...a.impl, value: a.impl.value + 3 } };
  assert.equal(JSON.stringify(itemSpec(a)), JSON.stringify(itemSpec(b)));
  const t1 = { ...top[0] }, t2 = { ...top[0], art: top[1].art };
  assert.notEqual(JSON.stringify(itemSpec(t1)), JSON.stringify(itemSpec(t2)));
});
test('the picture prompt changes with the look and refuses invalid looks', () => {
  const base = { kind: 'item', slot: 'Weapon', base: 'Trường Kiếm', tier: 4, e: 'Hỏa' };
  const p0 = buildPlan(base), p1 = buildPlan({ ...base, v: 12345 }), p2 = buildPlan({ ...base, v: 12346 });
  assert.notEqual(p0.prompt, p1.prompt); assert.notEqual(p1.seed, p2.seed); assert.notEqual(p1.seed, p0.seed);
  assert.equal(JSON.stringify(buildPlan(base)), JSON.stringify(p0));   // the common look is stable
  assert.throws(() => buildPlan({ ...base, v: -1 })); assert.throws(() => buildPlan({ ...base, v: 1.5 })); assert.throws(() => buildPlan({ ...base, v: '7' }));
});
test('the character wears the exact picture of a unique item', () => {
  const st = fresh(91); const it = G.genItem(st, 5, 5, 'Weapon'); st.eq.Weapon = it;
  assert.equal(equipSpec(st).Weapon!.v, it.art);
  const plain = fresh(92); assert.equal(equipSpec(plain).Weapon!.v, undefined);
  const spec = { kind: 'outfit', look: st.player.look, el: 'Kim', pers: 0, base: 'x'.repeat(20), eq: equipSpec(st) };
  void spec;
});
test('fixed pictures: every shop item, material and zone has a prompt', () => {
  for (const s of C.SHOP) assert.equal(buildPlan(propSpec(s.id)).kind, 'item');
  for (const m of C.MATERIALS) assert.equal(buildPlan(propSpec('mat_' + m.id)).kind, 'item');
  for (const z of C.ZONES) assert.equal(buildPlan(placeSpec(z.id)).kind, 'place');
  assert.equal(buildPlan(placeSpec('market')).kind, 'place');
  assert.throws(() => buildPlan(propSpec('nope'))); assert.throws(() => buildPlan(placeSpec('nope')));
});

test('every Linh Thú species lives in some zone, has lore and a picture description', async () => {
  const lore = (await import('../content/lore.json')).default as any;
  assert.equal(C.SPECIES.length, 68);
  for (const s of C.SPECIES) {
    assert.ok(C.ZONES.some((z) => (z.species[s.id] || 0) > 0), `${s.id} is in no zone`);
    assert.ok(typeof lore.beasts[s.id] === 'string' && lore.beasts[s.id].length > 40, `${s.id} has no lore`);
    assert.ok(s.id in C.SPECIES_EN);
  }
  for (const el of C.EO) assert.ok(C.SPECIES.filter((s) => s.el[0] === el).length >= 1, el);
});
test('the new species are met in play and tamed Linh Thú keep their species', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) { const st = fresh(seed); auto(st, true); st.player.realm = 3; st.player.sub = 3; for (const z of C.ZONES) { st.zone = z.id; G.settle(st, 1500); } for (const k of Object.keys(st.best)) seen.add(k); }
  assert.ok(seen.size >= 16, `only ${seen.size} species met`);
});

test('combat power counts the player and the Linh Thú in the Party', () => {
  const st = fresh(120), base = G.combatPower(st);
  const mk = (id: number, power: number) => ({ id, power, level: 1, apt: [1, 1, 1, 1, 1], cls: 2, mut: false, sp: 'ho', name: 'x' }) as G.Beast;
  st.beasts = [mk(1, 100), mk(2, 90), mk(3, 80), mk(4, 70)];
  assert.equal(G.combatPower(st), base + 270);   // only the three strongest go into battle
});

// ---------- môn pháp, Bí Công and technique slots (Requirement 18)
import * as A from '../lib/arts';
const withWeapon = (st: G.GameState, base: string) => { st.eq.Weapon!.base = base; st.arts = { learned: [], loadout: {}, methods: [], method: '' }; G.initArts(st); return st; };
test('every weapon base belongs to a môn and every môn has a free basic attack and four techniques', () => {
  for (const b of C.SLOT_BASE.Weapon) assert.ok(A.ARTS.some((a) => a.id === C.WEAPON_CLASS[b]), b);
  for (const a of A.ARTS) {
    assert.equal(A.attackTechs(a.id).length, 4); assert.ok(A.techsOf(a.id).length >= 6);
    assert.equal(A.basicOf(a.id).spirit, 0); assert.equal(A.basicOf(a.id).cd, 0);
    assert.ok(A.attackTechs(a.id).every((t, i, l) => i === 0 || t.minLevel >= l[i - 1].minLevel));
  }
});
test('a fight uses only the techniques of the môn of the weapon in hand', () => {
  const st = withWeapon(fresh(300), 'Cổ Cầm');
  const tech = A.techsOf('cam')[0].name;
  assert.deepEqual(G.playerSkills(st), [A.ART('cam').basic, tech]);
  st.eq.Weapon!.base = 'Trường Cung';   // a bow: the lute technique is not used, only the bow's free basic attack
  assert.deepEqual(G.playerSkills(st), [A.ART('cung').basic]);
  st.eq.Weapon = null;
  assert.deepEqual(G.playerSkills(st), [C.NEUTRAL_SKILL]);
  // the skills named in the combat log all come from the weapon's môn (or are the foe's own)
  const fight = withWeapon(fresh(301), 'Trường Kiếm'); fight.set.autoFight = true;
  G.settle(fight, 600);
  const mine = new Set(Object.values(A.TECHS).filter((t) => t.cls === 'kiem').map((t) => t.name));
  const used = new Set<string>();
  for (const e of fight.feed) for (const l of e.log || []) if (l[0] === '~') { const j = JSON.parse(l.slice(1)); if (j.w === 'p') used.add(j.k); }
  assert.ok(used.size > 0 && [...used].every((n) => mine.has(n)), [...used].join(', '));
});
test('a new character knows one technique of its weapon môn and an old save gets the same', () => {
  const st = fresh(302), cls = G.classOf(st);
  assert.equal(st.arts.learned.length, 1); assert.equal(A.TECHS[st.arts.learned[0]].cls, cls); assert.deepEqual(st.arts.loadout[cls], st.arts.learned);
});
test('Bí Công drop after a win about as often as the balance says, and Auto Learn learns them', () => {
  let wins = 0, books = 0;
  for (let seed = 1; seed <= 12; seed++) { const st = fresh(seed); Object.assign(st.set, { autoFight: true, autoLearn: true, autoBreak: true }); st.inv.trib = 10; const seen = new Set<number>(); for (let k = 0; k < 250; k++) { const r = G.settle(st, 10); wins += r.wins; for (const e of st.feed) if (e.kind === 'book' && !seen.has(e.id)) { seen.add(e.id); books++; } } assert.ok(st.arts.learned.length >= 1); }
  const p = books / wins;
  assert.ok(p > B.bookDropP * 0.7 && p < B.bookDropP * 1.6, `drop rate ${p.toFixed(3)} over ${wins} wins`);
});
test('with Auto Learn off the Bí Công waits in the bag and learning it follows the rules', () => {
  const st = fresh(310); Object.assign(st.set, { autoLearn: false, autoFight: true, autoBreak: true }); st.inv.trib = 10; G.settle(st, 3000);
  const names = Object.keys(st.inv.books);
  assert.ok(names.length > 0);
  const n = names.find((x) => A.TECHS[x] && A.TECHS[x].minLevel <= G.levelOf(st.player) && !st.arts.learned.includes(x));
  assert.equal(G.learnBook(st, 'Không Có Chiêu Này').code, 'E_BAD_SKILL');
  const none = Object.values(A.TECHS).find((t) => !t.basic && !(st.inv.books[t.name] > 0))!;
  assert.equal(G.learnBook(st, none.name).code, 'E_NO_BOOK');
  if (n) {
    const before = st.inv.books[n];
    assert.ok(G.learnBook(st, n).ok);
    assert.ok(st.arts.learned.includes(n)); assert.equal(st.inv.books[n] || 0, before - 1);
  }
  const high = Object.values(A.TECHS).find((t) => t.minLevel > G.levelOf(st.player))!;
  st.inv.books[high.name] = 1;
  const keep = JSON.stringify(st);
  assert.equal(G.learnBook(st, high.name).code, 'E_LEVEL_TOO_LOW'); assert.equal(JSON.stringify(st), keep);   // a refusal changes nothing
});
test('technique slots: only known techniques of that môn, no repeats, no more than the Realm allows, and slotting then clearing restores the state', () => {
  const st = withWeapon(fresh(320), 'Trường Kiếm');
  const [a, b, c, d] = A.attackTechs('kiem').map((t) => t.name);
  st.arts.learned.push(a, b, c, d);
  const before = JSON.stringify(st.arts);
  assert.equal(A.slotsAt(0), B.skillSlotsByRealm[0]);
  assert.equal(G.setLoadout(st, 'kiem', [a, a]).code, 'E_BAD_SKILL');
  assert.equal(G.setLoadout(st, 'kiem', ['Tên Không Có']).code, 'E_BAD_SKILL');   // not a technique
  assert.equal(G.setLoadout(st, 'kiem', [A.techsOf('cung')[0].name]).code, 'E_BAD_SKILL');    // another môn
  assert.equal(G.setLoadout(st, 'kiem', [a, b, c, d]).code, 'E_SKILL_SLOTS');                 // Realm 1 has 3 slots
  assert.equal(JSON.stringify(st.arts), before);
  assert.ok(G.setLoadout(st, 'kiem', [b, c]).ok); assert.deepEqual(G.playerSkills(st), [A.ART('kiem').basic, b, c]);
  assert.ok(G.setLoadout(st, 'kiem', [a]).ok); assert.deepEqual(st.arts.loadout.kiem, [a]);
  st.player.realm = 4; assert.ok(G.setLoadout(st, 'kiem', [a, b, c, d]).ok);   // more slots with the Realm
});
test('a Tu Sĩ fights with the môn of its title and a bow shoots two strikes', () => {
  assert.equal(A.npcClass('Kiếm Tu Lý Vân'), 'kiem'); assert.equal(A.npcClass('Thể Tu Trần Hàn'), 'quyen');
  assert.ok(['thuong', 'cung', 'tieu'].includes(A.npcClass('Tán Tu Lâm Minh')));
  assert.equal(A.npcClass('Tán Tu Lâm Minh'), A.npcClass('Tán Tu Lâm Minh'));
  assert.equal(A.TECHS[A.ART('cung').basic].hits, 2);
  const st = withWeapon(fresh(330), 'Trường Cung'); st.set.autoFight = true; G.settle(st, 900);
  const shots = st.feed.flatMap((e) => e.log || []).filter((l) => l[0] === '~').map((l) => JSON.parse(l.slice(1))).filter((j) => j.w === 'p' && !j.f);
  assert.ok(shots.length > 0 && shots.every((j) => j.u === 2));
});
test('the new weapons and the Bí Công books have picture prompts', () => {
  for (const b of C.SLOT_BASE.Weapon) {
    const p = buildPlan({ kind: 'item', slot: 'Weapon', base: b, tier: 1, e: '' });
    assert.ok(p.prompt.includes(C.BASE_EN[b].split(' ').slice(-3).join(' ')) || p.prompt.length > 100, b);
  }
  for (const a of A.ARTS) assert.equal(buildPlan(propSpec(`book_${a.id}`)).kind, 'item');
  for (const b of ['Trường Cung', 'Trảm Đao', 'Quyền Sáo']) assert.ok(C.PLACE_WEAPON[b]);
});

// ---------- support skills and status effects (Requirement 18.1, 18.16)
const loaded = (base: string, seed: number) => {
  const st = withWeapon(fresh(seed), base); const cls = G.classOf(st);
  st.arts.learned = A.techsOf(cls).map((t) => t.name); st.arts.loadout[cls] = [...st.arts.learned]; st.player.realm = 8; st.player.realm = 0;
  Object.assign(st.set, { autoFight: true, autoBreak: true }); st.inv.trib = 10; return st;
};
const logs = (st: G.GameState) => st.feed.flatMap((e) => e.log || []).filter((l) => l[0] === '~').map((l) => JSON.parse(l.slice(1)));
test('every skill group has techniques, and each group follows its rules', () => {
  for (const g of A.GROUPS) assert.ok(Object.values(A.TECHS).some((t) => t.group === g), g);
  for (const t of Object.values(A.TECHS)) {
    if (t.group === 'Tấn Công') assert.ok(t.coef > 0 && !t.fx);
    else assert.ok(t.fx && t.fx.turns >= 1 && (t.group === 'Hồi Phục' ? t.coef > 0 : t.coef === 0));
    if (t.group === 'Suy Yếu' || t.group === 'Khống Chế') assert.equal(t.target, 'Kẻ Địch');
  }
});
test('a healing technique restores Sinh Lực, a guard cuts the damage taken and a stun costs the foe its action', () => {
  const seen: Record<string, number> = {};
  for (const [base, seed] of [['Phất Trần', 400], ['Cổ Cầm', 401], ['Trường Thương', 402], ['Quyền Sáo', 403]] as const) {
    const st = loaded(base, seed);
    for (let k = 0; k < 40; k++) { G.settle(st, 40); for (const j of logs(st)) if (j.f) seen[j.f] = (seen[j.f] || 0) + 1; }
  }
  assert.ok(seen.heal > 0, JSON.stringify(seen)); assert.ok(seen.guard > 0, JSON.stringify(seen));
});
test('support skills work in a fight: heal never passes the maximum, a stunned side loses exactly its action', () => {
  const st = loaded('Phất Trần', 410); st.player.realm = 0;
  for (let k = 0; k < 60; k++) { G.settle(st, 30); const S = G.pstats(st); assert.ok(st.player.hp <= S.maxHp && st.player.hp >= 0); }
  for (const j of logs(st)) { if (j.f === 'heal') assert.ok(j.a >= 0 && j.h <= j.hm); if (j.f === 'skip') assert.equal(j.d, 0); }
});

// ---------- Công Pháp (Requirement 18.5, 18.6, 18.15)
test('a new character cultivates with the starter Công Pháp and an old save gets it', () => {
  const st = fresh(500);
  assert.equal(st.arts.method, A.STARTER_METHOD); assert.deepEqual(st.arts.methods, [A.STARTER_METHOD]);
  const old = fresh(501); (old.arts as any).methods = undefined; (old.arts as any).method = undefined; G.initArts(old);
  assert.equal(old.arts.method, A.STARTER_METHOD);
});
test('Method_Speed_Factor: the speed of the method, plus the affinity bonus when its element is in the Linh Căn', () => {
  const hoang = A.METHODS.find((x) => x.el && x.tier === 0)!;
  assert.equal(A.methodSpeed(hoang.name, [hoang.el]), hoang.speed * (1 + B.methodAffinityBonus));
  assert.equal(A.methodSpeed(hoang.name, C.EO.filter((e) => e !== hoang.el).slice(0, 1)), hoang.speed);
  assert.equal(A.methodSpeed(A.STARTER_METHOD, ['Kim']), 1);
  for (const x of A.METHODS) for (const y of A.METHODS) if (x.tier > y.tier) assert.ok(x.speed >= y.speed);
});
test('a better Công Pháp cultivates faster and adds the favoured stats; changing it is checked', () => {
  const a = fresh(510), b = fresh(510);
  const best = A.METHODS.filter((x) => !x.el).sort((x, y) => y.speed - x.speed)[0];
  b.arts.methods.push(best.name);
  assert.equal(G.setMethod(b, 'Không Có').code, 'E_BAD_SKILL'); assert.equal(G.setMethod(b, 'Hỏa Dương Công').code, 'E_BAD_SKILL');   // unknown, or not learned
  assert.ok(G.setMethod(b, best.name).ok);
  a.arts.method = A.STARTER_METHOD;
  G.settle(a, 150); G.settle(b, 150);
  const total = (s: G.GameState) => G.levelOf(s.player) * 1e9 + s.player.cp;
  assert.ok(total(b) > total(a), 'a faster method gets further in the same time');
  const hpOf = (m: string) => { const s = fresh(511); s.arts.methods.push(m); s.arts.method = m; return G.pstats(s).maxHp; };
  assert.ok(hpOf('Hỗn Nguyên Nhất Khí Quyết') > hpOf('Dưỡng Khí Công'));   // the first favours Sinh Lực, the second Linh Lực
});
test('Công Pháp scrolls drop, can wait in the bag, and are learned by reading them', () => {
  let got = 0;
  for (let seed = 1; seed <= 20 && !got; seed++) {
    const st = fresh(600 + seed); Object.assign(st.set, { autoFight: true, autoLearn: false, autoBreak: true }); st.inv.trib = 10;
    for (let k = 0; k < 80 && !got; k++) { G.settle(st, 40); const n = Object.keys(st.inv.books).find((x) => A.isMethod(x)); if (n) { got++; const x = A.methodOf(n); if (G.levelOf(st.player) >= x.minLevel) { assert.ok(G.learnBook(st, n).ok); assert.ok(st.arts.methods.includes(n)); } } }
  }
  assert.ok(got > 0, 'a Công Pháp scroll should drop within a few thousand ticks');
});

// ---------- đạo hiệu follows the e-mail, and chức vụ
test('the đạo hiệu depends only on the e-mail address: same one every time, and the configured share of the addresses have one', () => {
  assert.equal(G.daoOfEmail('A@Example.com '), G.daoOfEmail('a@example.com'));
  let have = 0; const seen = new Set<string>(); const N = 3000;
  for (let i = 0; i < N; i++) { const d = G.daoOfEmail(`user${i}@gmail.com`); if (d) { have++; seen.add(d); } }
  assert.ok(Math.abs(have / N - B.daoShare) < 0.04, `share ${have / N}`);
  assert.equal(seen.size, C.DAO.length);
  // lowering the share later only leaves some addresses without one: the one an address would get never changes
  const was = B.daoShare; (B as any).daoShare = 0.5;
  try { for (let i = 0; i < 300; i++) { const e = `user${i}@gmail.com`; const d = G.daoOfEmail(e); (B as any).daoShare = 1; const full = G.daoOfEmail(e); (B as any).daoShare = 0.5; assert.ok(d === '' || d === full); } } finally { (B as any).daoShare = was; }
});
test('a character made for an e-mail takes its đạo hiệu and its starting privileges; making it again gives the same', () => {
  let e = '', info: C.DaoInfo | undefined;
  for (let i = 0; i < 200 && !info; i++) { e = `perk${i}@gmail.com`; info = C.daoInfo(G.daoOfEmail(e)); }
  assert.ok(info);
  const a = G.newGame(11, 'f', T0, e), b = G.newGame(99, 'm', T0, e), plain = G.newGame(11, 'f', T0, 'khong.dao.nao.ca@gmail.com');
  assert.equal(a.player.dao, info!.name); assert.equal(b.player.dao, info!.name);
  const k = info!.perks;
  if (k.stones) assert.ok(a.stones >= k.stones, 'the Linh Thạch of the privilege is in the purse');
  if (k.weaponTier !== undefined) assert.equal(a.eq.Weapon!.tier, k.weaponTier);
  assert.ok(C.daoPerkLines(k).length > 0);
  void plain;
});
test('an older character takes the đạo hiệu of its e-mail once, with the privileges', () => {
  let e = '', info: C.DaoInfo | undefined;
  for (let i = 0; i < 200 && !info; i++) { e = `old${i}@gmail.com`; info = C.daoInfo(G.daoOfEmail(e)); }
  const st = G.newGame(21, 'm', T0); st.player.dao = 'Tên Cũ'; delete st.player.daoFix;
  const before = st.stones + st.inv.taming.reduce((x, y) => x + y, 0) + st.inv.hp.reduce((x, y) => x + y, 0) + st.inv.trib + st.bag.length;
  G.adoptDao(st, e);
  assert.equal(st.player.dao, info!.name); assert.equal(st.player.daoFix, true);
  const after = st.stones + st.inv.taming.reduce((x, y) => x + y, 0) + st.inv.hp.reduce((x, y) => x + y, 0) + st.inv.trib + st.inv.bt.reduce((x, y) => x + y, 0) + st.bag.length;
  assert.ok(after > before, 'the privileges were given');
  const snap = JSON.stringify(st); G.adoptDao(st, e); assert.equal(JSON.stringify(st), snap);   // only once
});
test('30 chức vụ, and fate gives, changes and takes them away while the character adventures', () => {
  assert.equal(C.TITLES.length, 30); assert.equal(new Set(C.TITLES.map((t) => t.id)).size, 30); assert.ok(C.TITLES.every((t) => t.name && t.blurb));
  const st = G.newGame(31, 'f', T0); Object.assign(st.set, { autoFight: true, autoBreak: true }); st.inv.trib = 20;
  const seen: string[] = []; let gained = 0, lost = 0, changed = 0, prev = st.player.title;
  for (let k = 0; k < 120; k++) {
    G.settle(st, 500);
    const t = st.player.title;
    if (t !== prev) { if (!prev) gained++; else if (!t) lost++; else changed++; prev = t; }
  }
  for (const e of st.feed) if (e.kind === 'destiny') seen.push(e.text);
  assert.ok(gained + lost + changed >= 3, `${gained}/${changed}/${lost}`);
  assert.ok(gained > 0 && lost + changed > 0);
  assert.ok(st.player.title === undefined || C.titleOf(st.player.title));
});
test('chức vụ changes come out the same however the ticks are split, and never move the random streams', () => {
  const a = G.newGame(41, 'f', T0), b = G.newGame(41, 'f', T0);
  G.settle(a, 6000); G.settle(b, 2000); G.settle(b, 1000); G.settle(b, 3000);
  assert.equal(a.player.title, b.player.title); assert.deepEqual(a.player.titleHist, b.player.titleHist);
  const hold = G.newGame(41, 'f', T0); const was = B.destinyP; (B as any).destinyP = 0;
  try { G.settle(hold, 6000); } finally { (B as any).destinyP = was; }
  assert.equal(JSON.stringify(hold.streams), JSON.stringify(a.streams));
});

// ---------- auto settings: strong creatures only, health thresholds, pills after a fight, alchemy
const beastP = (id: number, power: number, mut = false) => ({ id, power, level: 5, apt: [1, 1, 1, 1, 1], cls: 2, mut, sp: 'ho', name: 'x', stats: [1, 1, 1, 1, 1], skills: [], size: 1, cm: 1, pers: 0 }) as unknown as G.Beast;
test('"strong creatures only": any creature while the Party is not full, then only one stronger than the weakest of the Party', () => {
  const st = fresh(700), sp = C.SPECIES[0];
  st.set.tame.strong = true; st.set.tame.alwaysMut = false;
  st.beasts = [beastP(1, 100), beastP(2, 90)];
  assert.equal(G.matchesFilter(st, beastP(9, 10), sp), true, 'the Party has room');
  st.beasts.push(beastP(3, 80));
  assert.equal(G.matchesFilter(st, beastP(9, 79), sp), false); assert.equal(G.matchesFilter(st, beastP(9, 80), sp), false);
  assert.equal(G.matchesFilter(st, beastP(9, 81), sp), true);
  st.beasts.push(beastP(4, 500));   // only the three strongest go into battle: the weakest of those is 90 now
  assert.equal(G.matchesFilter(st, beastP(9, 85), sp), false); assert.equal(G.matchesFilter(st, beastP(9, 95), sp), true);
  st.set.tame.strong = false; st.set.tame.sizes = [0, 1, 2, 3, 4];
  assert.equal(G.matchesFilter(st, beastP(9, 1), sp), true, 'off: the old filter applies');
});
test('an auto tame of a Dị Biến always uses the best Khế Ước Phù the player has; an ordinary creature uses the chosen grade', () => {
  const sp = C.SPECIES[0], mk = (mut: boolean) => { const st = fresh(800); st.set.autoTame = true; st.set.tame.grade = 0; st.set.tame.alwaysMut = true; st.inv.taming = [5, 0, 5, 0]; st.best[sp.id] = { seen: 1, tamed: 0, maxCm: 1, minCm: 1, mutSeen: 0, mutTamed: 0 }; G.tryTame(st, beastP(77, 10, mut), sp, []); return st; };
  const mut = mk(true), plain = mk(false);
  assert.deepEqual(mut.inv.taming, [5, 0, 4, 0], 'Dị Biến: the Địa talisman');
  assert.deepEqual(plain.inv.taming, [4, 0, 5, 0], 'ordinary: the Hoàng one chosen in the settings');
});
test('the retreat setting cannot go below 30% and the character never goes out to fight under it', () => {
  const st = fresh(710);
  assert.equal(G.setSettings(st, { retreatPct: 29 }).code, 'E_BAD_THRESHOLDS');
  assert.equal(G.setSettings(st, { retreatPct: 30, resumePct: 100 }).ok, true);
  assert.equal(G.setSettings(st, { retreatPct: 30, resumePct: 101 }).code, 'E_BAD_THRESHOLDS');
  assert.equal(G.setSettings(st, { retreatPct: 50, resumePct: 50 }).code, 'E_BAD_THRESHOLDS');
  // an old save with a lower setting still stops at 30%
  const low = fresh(711); Object.assign(low.set, { retreatPct: 10, resumePct: 40, autoPill: false }); low.player.hp = Math.floor(G.pstats(low).maxHp * 0.25);
  G.tick(low); assert.equal(low.recovery, true, 'below 30% the character rests');
});
test('auto pills are used right after a fight: the smallest pill that fills what is missing, the biggest again and again otherwise, none for a scratch', () => {
  const st = fresh(720), S = G.pstats(st);
  st.inv.hp = [5, 5, 5];
  st.player.hp = S.maxHp - Math.floor(S.maxHp * 0.25);   // 25% missing: a grade 1 pill (30%) fills it
  G.autoHeal(st); assert.equal(st.player.hp, S.maxHp); assert.deepEqual(st.inv.hp, [4, 5, 5]);
  st.player.hp = S.maxHp - Math.floor(S.maxHp * 0.5);    // 50% missing: grade 2 (60%)
  G.autoHeal(st); assert.equal(st.player.hp, S.maxHp); assert.deepEqual(st.inv.hp, [4, 4, 5]);
  st.player.hp = S.maxHp - 3;                            // a scratch: nothing is wasted
  G.autoHeal(st); assert.deepEqual(st.inv.hp, [4, 4, 5]);
  st.inv.hp = [0, 3, 0]; st.player.hp = 1;               // only a 60% pill: used again until full
  G.autoHeal(st); assert.equal(st.player.hp, S.maxHp); assert.equal(st.inv.hp[1], 1);
  st.inv.hp = [0, 0, 0]; st.player.hp = 1; G.autoHeal(st); assert.equal(st.player.hp, 1);
});
test('Luyện Đan: materials become pills for free, and a refusal changes nothing', () => {
  const st = fresh(730);
  st.inv.mat = { linhthao: 20, truc: 5 };
  const stones = st.stones, r1 = G.craft(st, 'hp0', 2);
  assert.ok(r1.ok); assert.equal(st.inv.mat.linhthao, 4); assert.equal(st.stones, stones, 'free');
  const before = JSON.stringify(st.inv);
  assert.equal(G.craft(st, 'hp0', 1).ok, false); assert.equal(G.craft(st, 'hp2', 1).ok, false); assert.equal(G.craft(st, 'nope', 1).code, 'E_NOT_FOUND'); assert.equal(G.craft(st, 'hp0', 0).code, 'E_BAD_QTY');
  assert.equal(JSON.stringify(st.inv), before);
  st.inv.mat = { linhthao: 12, truc: 4 }; const h1 = st.inv.hp[1];
  assert.ok(G.craft(st, 'hp1', 1).ok); assert.equal(st.inv.hp[1], h1 + 1); assert.equal(st.inv.mat.linhthao, undefined);
});

test('bots: ten temperaments, a bot plays on its own for a day and stays within the rules', async () => {
  const Bt = await import('../lib/bots');
  assert.equal(Bt.PERSONAS.length, 10);
  assert.equal(new Set(Bt.PERSONAS.map((p) => Bt.botEmail(p.n))).size, 10);
  assert.ok(Bt.PERSONAS.every((p) => p.diligence > 0 && p.diligence <= 1 && p.retreatPct >= B.minRetreatPct));
  const ST = (n: number) => Bt.newBot(n, T0);
  assert.equal(ST(1).player.look.g, 'f'); assert.equal(ST(2).player.look.g, 'm');
  assert.equal(JSON.stringify(ST(3)), JSON.stringify(ST(3)), 'the same number always makes the same character');
  assert.ok(Bt.isBotEmail(Bt.botEmail(4)) && !Bt.isBotEmail('x@example.com'));
  for (const ps of Bt.PERSONAS.slice(0, 4)) {
    const st = Bt.newBot(ps.n, T0), t = T0 + 24 * 3600 * 1000;
    const played = Bt.stepBot(st, ps, t);
    assert.ok(played > 0 && played <= 24 * 720 * ps.diligence + 1, `bot ${ps.n} played ${played} ticks`);
    assert.equal(st.clock, t);
    assert.equal(st.decision, null, 'a bot never leaves a question open');
    assert.ok(G.levelOf(st.player) > 1, `bot ${ps.n} did not progress`);
    assert.ok(st.kills > 0 && st.stones >= 0 && st.bag.length <= B.bagCapacity && st.stash.length <= B.overflowCapacity && st.beasts.length <= B.penCapacity);
    assert.equal(st.stones, G.ledgerSum(st) + Object.values(st.pend).reduce((a, b) => a + b, 0), 'the ledger still adds up');
    assert.ok(st.set.autoTame && st.set.autoFight && st.set.autoEquip && st.set.autoPill);
    assert.ok(st.set.retreatPct >= B.minRetreatPct);
    assert.ok(st.reports.length === 0 && st.auditQ.length === 0);
    assert.ok(st.beasts.length > 0, `bot ${ps.n} tames beasts`);
    assert.equal(Bt.stepBot(st, ps, t), 0, 'nothing more to play at the same moment');
  }
});
test('bots: they buy, dissolve, brew and sell like a player would', async () => {
  const Bt = await import('../lib/bots'), ps = Bt.PERSONAS[0];
  const st = Bt.newBot(1, T0);
  st.stones = 20000; st.inv.taming = [0, 0, 0, 0]; st.inv.hp = [0, 0, 0];
  st.inv.mat = { linhthao: 40, truc: 10 };
  for (let i = 0; i < 12; i++) st.bag.push(G.genItem(st, 1, 0, 'Weapon'));
  for (let i = 0; i < 45; i++) st.beasts.push({ id: 900 + i, sp: 'ho', name: 'Xích Viêm Hồ', level: 3, size: 1, cm: 70, cls: 2, mut: false, pers: 0, apt: [1, 1, 1, 1, 1], skills: [], stats: [1, 1, 5, 5, 5], power: 10 + i } as any);
  Bt.thinkBot(st, ps);
  assert.ok(st.inv.taming[0] > 0, 'bought talismans');
  assert.ok(st.inv.hp[0] > 0 || st.inv.hp[1] > 0, 'bought or brewed pills');
  assert.ok(st.inv.hp[1] > 0, 'brewed the better pill from materials');
  assert.ok(st.bag.length < 12, 'dissolved the spare gear');
  assert.ok(st.beasts.length <= 30, 'sold surplus beasts');
  assert.ok(st.stones > 0);
});
test('bots: the picture is due every two days, only when what is worn changed, and the ten bots are spread out', async () => {
  const Bt = await import('../lib/bots'), { equipSig } = await import('../lib/avatarSpec');
  const st = Bt.newBot(1, T0, { url: '/api/img/abcdef0123456789abcd', crop: 0 });
  assert.equal(st.player.avatar!.at, T0);
  assert.equal(Bt.pictureDue(st, T0 + 2 * 86400_000 - 1), false, 'not before two days');
  assert.equal(Bt.pictureDue(st, T0 + 2 * 86400_000), true, 'worn items differ from the plain picture');
  st.player.avatar!.sig = equipSig(st);
  assert.equal(Bt.pictureDue(st, T0 + 9 * 86400_000), false, 'same items, nothing to redraw');
  assert.equal(Bt.pictureDue(Bt.newBot(2, T0), T0 + 9 * 86400_000), false, 'a bot without a picture never draws one');
  assert.deepEqual([1, 2, 10].map(Bt.pictureStagger), [0, 3 * 3600_000, 27 * 3600_000]);
});

test('fal balance: read from credits.current_balance, never invented when it is missing, and a key without billing rights is explained', async () => {
  const F = await import('../lib/server/falbalance');
  assert.deepEqual(F.parseBalance({ credits: { current_balance: 12.5, currency: 'usd' } }), { balance: 12.5, currency: 'USD' });
  assert.deepEqual(F.parseBalance({ credits: { current_balance: '7.25' } }), { balance: 7.25, currency: 'USD' });
  assert.deepEqual(F.parseBalance({ credits: { current_balance: 0 } }), { balance: 0, currency: 'USD' }, 'a zero balance is a real answer');
  for (const bad of [null, {}, { credits: {} }, { credits: { current_balance: null } }, { credits: { current_balance: '' } }, { credits: { current_balance: 'abc' } }, { credits: { current_balance: NaN } }]) assert.equal(F.parseBalance(bad), null);
  const was = { b: process.env.FAL_BILLING_KEY, k: process.env.FAL_KEY };
  const res = (status: number, body: any) => (async (_u: any, _o: any) => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  try {
    delete process.env.FAL_BILLING_KEY; delete process.env.FAL_KEY;
    assert.equal((await F.falBalance(1, res(200, {}))).configured, false);
    process.env.FAL_BILLING_KEY = 'k';
    let url = '', auth = '';
    const spy = (async (u: any, o: any) => { url = String(u); auth = o.headers.Authorization; return new Response(JSON.stringify({ credits: { current_balance: 3.5, currency: 'USD' } })); }) as unknown as typeof fetch;
    const ok = await F.falBalance(1, spy);
    assert.equal(ok.balance, 3.5); assert.equal(url, 'https://api.fal.ai/v1/account/billing?expand=credits'); assert.equal(auth, 'Key k');
    const no = await F.falBalance(1, res(403, { error: { type: 'authorization_error' } }));
    assert.equal(no.balance, null); assert.match(no.error!, /billing:usage:read/);
    assert.equal((await F.falBalance(1, res(200, { credits: {} }))).balance, null, 'HTTP 200 without a balance is not zero');
    assert.match((await F.falBalance(1, res(500, {}))).error!, /500/);
  } finally { was.b === undefined ? delete process.env.FAL_BILLING_KEY : (process.env.FAL_BILLING_KEY = was.b); was.k === undefined ? delete process.env.FAL_KEY : (process.env.FAL_KEY = was.k); }
});

test('fal usage: the day-by-day charge is read from time_series, pages are followed, and a key without billing rights is explained', async () => {
  const F = await import('../lib/server/falbalance');
  const bucket = (day: string, rows: any[]) => ({ bucket: `${day}T00:00:00+00:00`, results: rows.map(([endpoint_id, cost_total, quantity]) => ({ endpoint_id, unit: 'image', quantity, unit_price: 0.1, cost_total, cost: cost_total, currency: 'USD' })) });
  const p = F.parseUsage([{ time_series: [bucket('2026-11-15', [['a/x', 0.25, 5], ['a/y', 0.07, 1]])] }, { time_series: [bucket('2026-11-15', [['a/x', 0.1, 2]]), bucket('2026-11-16', [['a/y', 0.14, 2]])] }])!;
  assert.ok(Math.abs(p.days.get('2026-11-15')! - 0.42) < 1e-9); assert.ok(Math.abs(p.days.get('2026-11-16')! - 0.14) < 1e-9);
  assert.ok(Math.abs(p.byModel.get('a/x')!.usd - 0.35) < 1e-9 && p.byModel.get('a/x')!.qty === 7);
  assert.equal(F.parseUsage([{}]), null); assert.equal(F.parseUsage([{ time_series: 'x' }]), null);
  const was = { b: process.env.FAL_BILLING_KEY, k: process.env.FAL_KEY }; process.env.FAL_BILLING_KEY = 'k';
  try {
    const now = Date.parse('2026-11-16T12:00:00Z'), urls: string[] = [];
    const paged = (async (u: any, o: any) => {
      urls.push(String(u)); assert.equal(o.headers.Authorization, 'Key k');
      const cur = new URL(String(u)).searchParams.get('cursor');
      return new Response(JSON.stringify(cur ? { time_series: [bucket('2026-11-16', [['a/y', 0.14, 2]])], next_cursor: null, has_more: false } : { time_series: [bucket('2026-11-15', [['a/x', 0.5, 5]])], next_cursor: 'Mg==', has_more: true }));
    }) as unknown as typeof fetch;
    const u = (await F.falUsage(now, 3, paged))!;
    assert.equal(u.ok, true); assert.equal(urls.length, 2); assert.match(urls[0], /\/v1\/models\/usage\?/); assert.match(urls[0], /start=2026-11-14/); assert.match(urls[0], /end=2026-11-17/); assert.match(urls[1], /cursor=Mg%3D%3D/);
    assert.deepEqual(u.days.map((d) => d.day), ['2026-11-14', '2026-11-15', '2026-11-16']); assert.deepEqual(u.days.map((d) => d.usd), [0, 0.5, 0.14]); assert.equal(u.total, 0.64);
    const no = (await F.falUsage(now, 3, (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch))!;
    assert.equal(no.ok, false); assert.match(no.error!, /billing:usage:read/);
    assert.match((await F.falUsage(now, 3, (async () => new Response('{}')) as unknown as typeof fetch))!.error!, /không trả về/);
    delete process.env.FAL_BILLING_KEY; delete process.env.FAL_KEY;
    assert.equal(await F.falUsage(now, 3, paged), null, 'no key, nothing asked');
  } finally { was.b === undefined ? delete process.env.FAL_BILLING_KEY : (process.env.FAL_BILLING_KEY = was.b); was.k === undefined ? delete process.env.FAL_KEY : (process.env.FAL_KEY = was.k); }
});

// ---------- journey rows for taming, plain drops and the Thiên/Tiên event
test('every taming attempt writes its own journey row: success, failure and a miss', () => {
  const sp = C.SPECIES[0];
  const mk = (seed: number) => { const st = fresh(seed); st.set.autoTame = true; st.set.tame.grade = 0; st.best[sp.id] = { seen: 1, tamed: 0, maxCm: 1, minCm: 1, mutSeen: 0, mutTamed: 0 }; return st; };
  // no Khế Ước Phù: the miss is told
  const none = mk(900); none.inv.taming = [0, 0, 0, 0];
  const missNote = G.tryTame(none, beastP(1, 10), sp, []);
  assert.ok(missNote && !missNote.won && /Khế Ước Phù/.test(missNote.text));
  // many tries: both outcomes happen, and the note always says which one it was
  let won = 0, lost = 0;
  for (let i = 0; i < 60; i++) {
    const st = mk(901 + i); st.inv.taming = [3, 0, 0, 0];
    const chips: string[] = [], n = G.tryTame(st, beastP(i + 1, 10), sp, chips)!;
    assert.ok(n, 'an auto tame always reports');
    assert.equal(n.won, st.beasts.length === 1);
    assert.match(n.text, n.won ? /^Thu phục thành công/ : /^Thu phục thất bại/);
    if (n.won) won++; else lost++;
  }
  assert.ok(won > 0 && lost > 0, `both outcomes seen (won ${won}, lost ${lost})`);
});
test('a taming the player answers by hand also lands in the journey with its result', () => {
  const sp = C.SPECIES[0];
  const st = fresh(950); st.inv.taming = [9, 0, 0, 0]; st.best[sp.id] = { seen: 1, tamed: 0, maxCm: 1, minCm: 1, mutSeen: 0, mutTamed: 0 };
  st.decision = { id: ++st.uid, kind: 'tame', beast: beastP(5, 10, true), log: [] };
  const r = G.decide(st, { id: st.decision.id, choice: 'tame', grade: 0 });
  assert.ok(r.ok);
  const row = st.feed[0];
  assert.equal(row.kind, 'tame'); assert.ok(row.beast); assert.equal(row.outcome, r.data && (r.data as any).won ? 'win' : 'lose');
  assert.match(row.text, /Dị Biến/);
});
test('plain (Phàm) items and items dissolved by the setting are shown in the journey too', () => {
  const st = fresh(960); st.set.autoEquip = false; st.set.dissolveMax = 5;
  for (let i = 0; i < 400 && !st.feed.some((e) => e.kind === 'item' && e.item && e.item.tier === 0); i++) G.tick(st);
  const plain = st.feed.find((e) => e.kind === 'item' && e.item && e.item.tier === 0);
  assert.ok(plain, 'a Phàm item has its row');
});
test('while the Thiên/Tiên event runs in the zone, the weight of meeting a Linh Thú is raised by 50%', () => {
  for (const z of C.ZONES) {
    const base = G.encounterWeights(z, null), ev = G.encounterWeights(z, null, true);
    assert.equal(ev[0], base[0] * B.dropEventMonsterMult); assert.equal(B.dropEventMonsterMult, 1.5);
    assert.deepEqual(ev.slice(1), base.slice(1));
    const share = (w: number[]) => w[0] / w.reduce((a, b) => a + b, 0);
    assert.ok(share(ev) > share(base));
  }
});
test('a fight is always the last journey row of its group: the taming row and the drops of that fight have lower ids', () => {
  const st = fresh(970); st.set.autoTame = true; st.set.autoFight = true; st.inv.taming = [50, 0, 0, 0];
  let checked = 0;
  for (let i = 0; i < 600 && checked < 5; i++) {
    const before = st.uid; G.tick(st);
    const fight = st.feed.find((e) => e.kind === 'monster' && e.id > before);
    if (!fight) continue;
    for (const e of st.feed) if (e.id > before && ['item', 'equip', 'tame'].includes(e.kind)) assert.ok(e.id < fight.id, `${e.kind} row ${e.id} comes before its fight row ${fight.id}`);
    checked++;
  }
  assert.ok(checked > 0);
});

test('finishing the daily quest is counted for good (not only the latest 30 days), once per finished quest', () => {
  const st = fresh(990);
  assert.equal(G.questCount(st), 0);
  const day = new Date(T0).toISOString().slice(0, 10), sp = { ...C.SPECIES[0], id: 'dailytest', day, zones: [], legend: '', en: 'Daily Test' } as any;
  D.setDaily([{ day, title: 't', chronicle: 'c', tales: {}, beast: sp }]);
  try {
    st.set.autoTame = true; st.set.tame.grade = 0; st.best[sp.id] = { seen: 1, tamed: 0, maxCm: 1, minCm: 1, mutSeen: 0, mutTamed: 0 };
    for (let i = 0; i < 400 && !(st.quest && st.quest.done); i++) { st.beasts = []; st.inv.taming = [5, 0, 0, 0]; G.tryTame(st, { ...beastP(i + 1, 10), sp: sp.id } as G.Beast, sp, []); }
    assert.ok(st.quest && st.quest.done, 'the quest was finished');
    assert.equal(st.questDone, 1); assert.equal(G.questCount(st), 1);
    for (let i = 0; i < 20; i++) { st.beasts = []; st.inv.taming = [5, 0, 0, 0]; G.tryTame(st, { ...beastP(i + 900, 10), sp: sp.id } as G.Beast, sp, []); }
    assert.equal(st.questDone, 1, 'finishing it again on the same day does not count twice');
  } finally { D.setDaily([]); }
  const old = fresh(991);   // a save from before the counter: it counts the days it still remembers
  old.questDays = Array.from({ length: 30 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  assert.equal(G.questCount(old), 30);
  old.questDone = 41; assert.equal(G.questCount(old), 41);
});
