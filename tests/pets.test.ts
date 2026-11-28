import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as PB from '../lib/pets';
import { PURE_INTENTS } from '../lib/intents';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42) => G.newGame(seed, 'f', T0);

test('pets: a new character gets one Linh Noãn, and it hatches after the hatching time', () => {
  const st = fresh(5);
  assert.ok(st.pets);
  assert.equal(st.pets!.eggs.length, 1);
  assert.equal(st.pets!.list.length, 0);
  assert.equal(st.pets!.eggs[0].hatch, PB.PET.hatchTicks);
  G.settle(st, PB.PET.hatchTicks - 1);
  assert.equal(st.pets!.list.length, 0, 'not yet');
  G.settle(st, 1);
  assert.equal(st.pets!.list.length, 1);
  assert.equal(st.pets!.eggs.filter((e) => e.hatch <= st.tick).length, 0);
  const p = st.pets!.list[0];
  assert.equal(st.pets!.on, p.id, 'the first one follows at once');
  assert.ok(PB.PET_SPECIES.some((s) => s.id === p.sp));
  assert.ok(st.feed.some((f) => f.text.includes('Linh Noãn đã nở')));
});

test('pets: the same seed hatches the same species (no random numbers from the journey)', () => {
  const a = fresh(9), b = fresh(9);
  G.settle(a, PB.PET.hatchTicks); G.settle(b, PB.PET.hatchTicks);
  assert.equal(a.pets!.list[0].sp, b.pets!.list[0].sp);
});

test('pets: the talent of the one that follows adds to the master, and only while it follows', () => {
  for (const sp of PB.PET_SPECIES) {
    const st = fresh(3);
    const S0 = G.pstats(st);
    st.pets!.list.push({ id: 900, sp: sp.id, lv: 10, xp: 0 }); st.pets!.on = 900;
    const S1 = G.pstats(st), v = PB.talentOf(st.pets!.list[0]);
    assert.ok(v > 0);
    if (sp.stat === 'cult') assert.equal(S1.cult, S0.cult + v);
    if (sp.stat === 'luck') assert.equal(S1.luck, S0.luck + v);
    if (sp.stat === 'hp') assert.ok(S1.maxHp > S0.maxHp);
    assert.equal(PURE_INTENTS.petOff(st, {}).ok, true);
    assert.deepEqual(G.pstats(st), S0);
    assert.equal(PURE_INTENTS.petOn(st, { id: 900 }).ok, true);
    assert.deepEqual(G.pstats(st), S1);
  }
});

test('pets: experience never takes it above its master, and the forms come at fixed Levels', () => {
  const p: PB.Pet = { id: 1, sp: 'meo', lv: 1, xp: 0 };
  PB.addXp(p, 10_000_000, 5);
  assert.equal(p.lv, 5);
  assert.equal(p.xp, PB.xpNeed(5), 'the bar stays full while the master has not climbed');
  const r = PB.addXp(p, 10_000_000, 12);
  assert.equal(p.lv, 12);
  assert.equal(r.stage, true);
  assert.equal(PB.stageOf(1), 0); assert.equal(PB.stageOf(8), 0); assert.equal(PB.stageOf(9), 1); assert.equal(PB.stageOf(17), 2);
  assert.ok(PB.talentOf({ ...p, lv: 9 }) > PB.talentOf({ ...p, lv: 8 }));
});

test('pets: choosing and resting are pure intents; an unknown one is refused and changes nothing', () => {
  const st = fresh(4);
  st.pets!.list.push({ id: 500, sp: 'tho', lv: 3, xp: 0 }, { id: 501, sp: 'ca', lv: 2, xp: 0 });
  assert.equal(PURE_INTENTS.petOn(st, { id: 501 }).ok, true);
  assert.equal(st.pets!.on, 501);
  const before = JSON.stringify(st);
  assert.equal(PURE_INTENTS.petOn(st, { id: 77 }).ok, false);
  assert.equal(PURE_INTENTS.petOn(st, { id: 'x' }).ok, false);
  assert.equal(JSON.stringify(st), before);
  assert.equal(PURE_INTENTS.petOff(st, {}).ok, true);
  assert.equal(st.pets!.on, null);
  assert.equal(PURE_INTENTS.petOff(st, {}).ok, false);
  // taking off a Thỏ Ngọc keeps Sinh Lực within the new maximum
  PURE_INTENTS.petOn(st, { id: 500 }); st.player.hp = G.pstats(st).maxHp;
  PURE_INTENTS.petOff(st, {});
  assert.ok(st.player.hp <= G.pstats(st).maxHp);
});

test('pets: a second egg of a species already owned feeds that one instead of a copy', () => {
  const st = fresh(8);
  G.settle(st, PB.PET.hatchTicks);
  const first = st.pets!.list[0];
  // eggs until one opens into the same species
  for (let k = 0; k < 40 && st.pets!.list.length === 1; k++) {
    const xp = first.xp, lv = first.lv;
    st.pets!.eggs.push({ id: 10_000 + k, hatch: st.tick + 1 });
    G.settle(st, 1);
    if (st.pets!.list.length === 1) { assert.ok(first.xp > xp || first.lv > lv || first.lv >= G.levelOf(st.player)); break; }
  }
  assert.ok(new Set(st.pets!.list.map((p) => p.sp)).size === st.pets!.list.length, 'never two of one species');
});

test('pets: a save without Linh Sủng plays exactly as before', () => {
  const a = fresh(21), b = fresh(21);
  delete a.pets; delete b.pets;
  G.settle(a, 2000); G.settle(b, 2000);
  assert.equal(a.pets, undefined);
  assert.deepEqual(G.pstats(a), G.pstats(b));
});
