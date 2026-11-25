import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../lib/game';
import * as R from '../lib/raid';
import * as P from '../lib/raidplay';
import * as A from '../lib/arts';
import { stackInfo } from '../lib/goods';
import { fighterOf } from '../lib/server/raid';

const T0 = 1_800_000_000_000;
// A fighter made from a real save (the same function the server uses), at the realm and sub-realm asked.
const fighter = (seed: number, realm = 1, sub = 2) => {
  const st = G.newGame(seed, seed % 2 ? 'f' : 'm', T0); st.player.realm = realm; st.player.sub = sub; G.settle(st, 1);
  return fighterOf(st, (0x100000 + seed * 7919).toString(16) + 'abcdef');
};
const crowd = (n: number, realm = 1) => Array.from({ length: n }, (_, i) => fighter(100 + i, realm + (i % 2), i % 4));
const DAYS = Array.from({ length: 40 }, (_, d) => new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10));

test('a day has one Dị Thú, all eight come round, and the fight is at 20:00 Vietnam time', () => {
  assert.equal(new Set(DAYS.slice(0, 8).map((d) => R.bossOfDay(d).id)).size, R.BOSSES.length);
  assert.equal(new Set(R.BOSSES.map((b) => b.el)).size, 8, 'one Dị Thú per element');
  const at = R.fightAtOf('2026-11-25');
  assert.equal(new Date(at).toISOString(), '2026-11-25T13:00:00.000Z');
  assert.equal(R.raidDay(at - 1), '2026-11-25');
  assert.equal(R.raidDay(Date.parse('2026-11-25T17:00:00Z')), '2026-11-26', 'midnight in Vietnam starts the next day');
  assert.equal(R.prevDay('2026-03-01'), '2026-02-28');
});

test('every Dị Thú has its pictures and clips, and its blows use effects that exist', () => {
  for (const b of R.BOSSES) {
    for (const w of ['bg', 'boss', 'loop', 'ult'] as const) assert.ok(fs.existsSync(`public${R.raidArt(b.id, w)}`), `${b.id} ${w}`);
    assert.ok(b.at.y + b.at.r * 0.3 < 58, `${b.id} stands above the cultivators`);
    assert.deepEqual(b.skills.map((s) => s.kind), ['strike', 'sweep', 'nova']);
    assert.ok(b.skills.every((s) => s.coef > 0 && s.coef < 0.6));
    assert.ok(stackInfo(`mat:${b.mat}`), `${b.id} drops a material that exists`);
  }
});

test('a fighter is taken from the save: real stats and skills, the public id, never the account', () => {
  const f = fighter(7, 2, 1);
  assert.equal(f.level, 10);
  assert.ok(f.atk > 0 && f.def > 0 && f.hp > 0 && f.spd > 0);
  assert.ok(f.skills.length >= 1 && f.skills.every((s) => !!A.skillOf(s)));
  assert.ok(!('acc' in f) && !('email' in f));
  assert.ok(['Tán Tu', 'Kiếm Tu', 'Đan Sư', 'Phù Sư', 'Thể Tu', 'Ma Tu'].includes(f.arch));
});

test('the fight is the same every time it is computed, and its record adds up', () => {
  const fs_ = crowd(9), day = '2026-11-25', boss = R.bossOfDay(day);
  const a = R.fight(boss, fs_, day), b = R.fight(boss, fs_, day);
  assert.deepEqual(a, b);
  assert.ok(a.rounds.length >= 1 && a.rounds.length <= R.MAX_ROUNDS);
  const dealt = a.rounds.flatMap((r) => r.f).reduce((s, x) => s + x.d, 0);
  assert.equal(dealt, a.dmg.reduce((s, x) => s + x, 0), 'the damage of the record is the damage per fighter');
  assert.equal(a.rounds[a.rounds.length - 1].hp, Math.max(0, a.max - dealt));
  assert.equal(a.win, a.rounds[a.rounds.length - 1].hp === 0);
  // nobody acts after falling, and the fallen are the ones the record says
  const down = new Set<number>();
  for (const r of a.rounds) {
    for (const x of r.f) assert.ok(!down.has(x.i), `fighter ${x.i} acts after falling`);
    if (r.b) { r.b.ko.forEach((i) => down.add(i)); r.b.t.forEach((i, k) => assert.ok(r.b!.h[k] >= 0)); }
  }
  assert.deepEqual([...down].sort(), a.ko.map((k, i) => (k ? i : -1)).filter((i) => i >= 0).sort());
  // the nova comes in rounds 3, 7, 11 and hits everyone still standing
  for (const r of a.rounds) if (r.b && !r.b.stun) assert.equal(r.b.s === 2, r.r % R.NOVA_EVERY === 3 && true);
});

test('the fight is a contest: neither always won nor always lost, longer than a few rounds', () => {
  for (const n of [1, 4, 10, 25]) {
    let wins = 0, rounds = 0;
    for (const d of DAYS) { const r = R.fight(R.bossOfDay(d), crowd(n), d); wins += r.win ? 1 : 0; rounds += r.rounds.length; }
    const rate = wins / DAYS.length, avg = rounds / DAYS.length;
    assert.ok(rate >= 0.2 && rate <= 1, `n=${n} win rate ${rate}`);
    assert.ok(avg >= 7, `n=${n} rounds ${avg}`);
  }
});

test('rewards: by level, more for a win and for a bigger share, a Bí Kíp only for the best of a win', () => {
  const day = DAYS[3], boss = R.bossOfDay(day), fs_ = crowd(8);
  const res = R.fight(boss, fs_, day);
  const rw = fs_.map((_, i) => R.rewardOf(boss, res, fs_, i, day));
  assert.deepEqual(rw.map((r) => r.rank).sort((a, b) => a - b), fs_.map((_, i) => i + 1));
  for (const r of rw) { assert.ok(r.stones > 0); for (const g of r.goods) assert.ok(stackInfo(g.key), g.key); }
  const books = rw.filter((r) => r.goods.some((g) => g.key.startsWith('book:')));
  if (res.win) { assert.ok(books.length >= 1 && books.every((r) => r.rank <= 3)); assert.ok(rw.find((r) => r.rank === 1)!.goods.some((g) => g.key.startsWith('book:'))); }
  else assert.equal(books.length, 0);
  for (const r of rw) for (const g of r.goods) if (g.key.startsWith('book:')) assert.equal(A.TECHS[g.key.slice(5)].el, boss.el);
  // the same fighter in a won and a lost fight
  const won = { ...res, win: true }, lost = { ...res, win: false };
  assert.ok(R.rewardOf(boss, won, fs_, 0, day).stones > R.rewardOf(boss, lost, fs_, 0, day).stones);
});

test('the film: who is drawn, where, and a timeline that ends where the fight ended', () => {
  const fs_ = crowd(30), day = DAYS[5], boss = R.bossOfDay(day), res = R.fight(boss, fs_, day);
  const shown = P.shownOf(fs_, 17);
  assert.equal(shown.length, P.SHOWN_MAX);
  assert.equal(shown[0], 17, 'the viewer is always drawn, in the best spot');
  const spots = P.formation(boss, shown.map((i) => fs_[i].pid));
  assert.equal(new Set(spots.map((p) => `${Math.round(p.x)}|${Math.round(p.y)}`)).size, spots.length, 'no two on the same spot');
  for (const p of spots) assert.ok(p.x > 5 && p.x < 95 && p.y > 25 && p.y < 96);
  const tl = P.timelineOf(res.rounds, shown);
  assert.equal(tl.rounds.length, res.rounds.length);
  for (let k = 1; k < tl.rounds.length; k++) assert.ok(tl.rounds[k].t0 > tl.rounds[k - 1].end);
  assert.ok(tl.total > tl.outro && tl.total < 4 * 60000, `film of ${Math.round(tl.total / 1000)} s`);
  // every fighter not drawn still deals its damage, in one streak per round
  const hidden = tl.rounds.filter((r) => r.off).reduce((s, r) => s + r.off!.d, 0);
  const notDrawn = res.rounds.flatMap((r) => r.f).filter((a) => !shown.includes(a.i)).reduce((s, a) => s + a.d, 0);
  assert.equal(hidden, notDrawn);
  // the state at the end of the film is the end of the fight; at the start, everyone is whole
  const end = P.stateAt(res.max, fs_, tl, tl.total), start = P.stateAt(res.max, fs_, tl, 0);
  assert.equal(end.hp, res.rounds[res.rounds.length - 1].hp);
  assert.deepEqual(end.down.map((d, i) => d === !!res.ko[i]), fs_.map(() => true));
  assert.equal(start.hp, res.max); assert.ok(start.down.every((d) => !d));
  // a flight goes out and comes back to where it started
  const fr = P.flightFrames(80, -120, 1);
  assert.deepEqual([fr[0].x, fr[0].y], [0, 0]); assert.ok(Math.abs(fr[fr.length - 1].x) < 0.5 && Math.abs(fr[fr.length - 1].y) < 0.5);
  assert.ok(fr.every((f, k) => k === 0 || f.offset > fr[k - 1].offset));
});
