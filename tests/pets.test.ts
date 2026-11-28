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

test('pets: a Linh Sủng never changes its master\'s stats, following or not', () => {
  for (const sp of PB.PET_SPECIES) {
    const st = fresh(3);
    const S0 = G.pstats(st);
    st.pets!.list.push({ id: 900, sp: sp.id, lv: 20, xp: 0 }); st.pets!.on = 900;
    assert.deepEqual(G.pstats(st), S0);
    assert.equal(PURE_INTENTS.petOff(st, {}).ok, true);
    assert.deepEqual(G.pstats(st), S0);
  }
});

test('pets: its own stats grow with Level and form, Linh Mẫn has a ceiling', () => {
  for (const sp of PB.PET_SPECIES) {
    const at = (lv: number) => PB.petStats({ id: 1, sp: sp.id, lv, xp: 0 });
    assert.ok(at(1).luc > 0 && at(1).man > 0);
    assert.ok(at(8).luc >= at(1).luc);
    assert.ok(at(9).luc > at(8).luc && at(9).man > at(8).man, 'a new form is a clear step');
    assert.ok(at(17).luc > at(16).luc);
    assert.ok(at(200).man <= PB.PET.manCap);
    assert.match(PB.skillText({ id: 1, sp: sp.id, lv: 5, xp: 0 }), new RegExp(`${at(5).man}% cơ hội`));
  }
});

test('pets: each skill acts after won fights, about as often as its Linh Mẫn says', () => {
  const said: Record<string, RegExp> = { tho: /Thỏ Ngọc hồi/, meo: /Mèo Mây ngộ đạo/, ca: /Cá Chép Vàng chiêu tài/ };
  for (const sp of PB.PET_SPECIES) {
    const st = fresh(11);
    st.starter = { done: ['tame'] }; Object.assign(st.set, { autoFight: true, autoBreak: true }); st.inv.trib = 10;   // let the journey run on its own
    st.pets!.eggs = [];
    st.pets!.list.push({ id: 900, sp: sp.id, lv: 1, xp: 0 }); st.pets!.on = 900;
    const seen = new Map<number, G.FeedEntry>();   // the feed keeps only its last rows: read it as it goes
    let stones = 0;
    for (let i = 0; i < 150; i++) {
      stones += G.settle(st, 20).stonesBy.pet || 0;
      for (const f of st.feed) if (f.kind === 'monster' && f.outcome === 'win') seen.set(f.id, f);
    }
    const rep = { stonesBy: { pet: stones } };
    const wins = [...seen.values()];
    const acted = wins.filter((f) => (f.chips || []).some((c) => said[sp.id].test(c)));
    if (sp.kind === 'stones') assert.ok((rep.stonesBy.pet || 0) > 0, 'Chiêu Tài shows in the Linh Thạch report');
    assert.ok(wins.length > 50, `enough fights to judge (${wins.length})`);
    const rate = acted.length / wins.length, man = PB.petStats(st.pets!.list[0]).man / 100;
    if (sp.kind === 'heal') { assert.ok(acted.length > 0 && rate <= man + 0.1, `${sp.id}: acted ${rate.toFixed(2)}`); continue; }   // it heals only when the master is hurt
    assert.ok(Math.abs(rate - man) < 0.15, `${sp.id}: acted ${rate.toFixed(2)}, Linh Mẫn ${man}`);
  }
});

test('pets: one egg at a time; none is found while one is in the nest', () => {
  const keep = PB.PET.eggDropP;
  try {
    PB.PET.eggDropP = 1;   // every won fight would find one
    const st = fresh(6);
    for (let i = 0; i < 40; i++) { G.settle(st, 20); assert.ok(st.pets!.eggs.length <= 1); }
    G.settle(st, PB.PET.hatchTicks);
    assert.ok(st.pets!.list.length >= 1);
    assert.ok(st.pets!.eggs.length <= 1);
    // an old save with several eggs: they hatch one after another, each with its full time
    st.pets!.eggs = [{ id: 7001, hatch: st.tick + 1 }, { id: 7002, hatch: st.tick + 1 }];
    G.settle(st, 1);
    assert.equal(st.pets!.eggs.length, 1);
    assert.equal(st.pets!.eggs[0].id, 7002);
    assert.ok(st.pets!.eggs[0].hatch >= st.tick + PB.PET.hatchTicks - 1);
  } finally { PB.PET.eggDropP = keep; }
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
