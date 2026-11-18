import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPEED, depthOf, gradeAt, grassPath, lookOf, nextMove, pickSpot, scaleAt, shadowAt, speedAt, turn } from '../lib/scene';

const zones = ['thanhvan', 'xichviem', 'hannguyet', 'loivan', 'cuuu', 'tinhha', 'dawn', 'night', 'own'];

test('every look keeps its ground inside the picture', () => {
  for (const z of zones) {
    const l = lookOf(z);
    assert.ok(l.band[0] < l.band[1] && l.band[0] > 0.5 && l.band[1] < 1, z);
    assert.ok(l.xr[0] >= 0 && l.xr[1] <= 1 && l.xr[0] < l.xr[1], z);
    assert.ok(l.far > 0 && l.near >= l.far, z);
  }
  assert.equal(lookOf('cuuu').ground, false);
  // the garden's own pictures are a cloud floor: ground, no drawn grass, a thick mist, creatures in the middle
  for (const z of ['dawn', 'night']) { const l = lookOf(z); assert.equal(l.ground, true); assert.equal(l.fgDraw, 'none'); assert.ok(l.mist >= 0.8); assert.ok(l.xr[0] >= 0.25 && l.xr[1] <= 0.8); }
  assert.equal(lookOf('thanhvan').fgDraw, 'grass');
  assert.equal(lookOf('thanhvan').ground, true);
});

test('a creature grows towards the near edge and is clamped outside the band', () => {
  const l = lookOf('thanhvan');
  assert.equal(depthOf(l, l.band[0]), 0);
  assert.equal(depthOf(l, l.band[1]), 1);
  assert.equal(depthOf(l, 0), 0);
  assert.equal(depthOf(l, 1), 1);
  assert.ok(scaleAt(l, l.band[0]) < scaleAt(l, (l.band[0] + l.band[1]) / 2));
  assert.ok(scaleAt(l, (l.band[0] + l.band[1]) / 2) < scaleAt(l, l.band[1]));
});

test('far creatures are hazier and move slower on screen (so the feet do not slide)', () => {
  const l = lookOf('thanhvan');
  assert.ok(gradeAt(l, l.band[0]).amt > gradeAt(l, l.band[1]).amt);
  assert.equal(gradeAt(l, l.band[1]).amt, 0);
  assert.ok(speedAt(SPEED.walk, l, l.band[0]) < speedAt(SPEED.walk, l, l.band[1]));
  assert.ok(Math.abs(speedAt(SPEED.walk, l, l.band[1]) - SPEED.walk * l.near) < 1e-9);
});

test('the shadow falls away from the light and is darker when near', () => {
  const l = { ...lookOf('thanhvan'), light: 1 };
  assert.ok(shadowAt(l, 0.9).dx < 0);
  assert.ok(shadowAt({ ...l, light: -1 }, 0.9).dx > 0);
  assert.equal(shadowAt({ ...l, light: 0 }, 0.9).dx === 0, true);
  assert.ok(shadowAt(l, l.band[1]).a > shadowAt(l, l.band[0]).a);
});

test('spots are always on the ground band', () => {
  const l = lookOf('loivan');
  let s = 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 200; i++) {
    const p = pickSpot(l, rnd);
    assert.ok(p.x >= l.xr[0] && p.x <= l.xr[1] && p.y >= l.band[0] && p.y <= l.band[1]);
  }
});

test('what a creature does next follows the clips it has', () => {
  const seen = (has: { walk: boolean; run: boolean; act: boolean }) => {
    const out = new Set<string>();
    for (let i = 0; i < 100; i++) out.add(nextMove(has, () => i / 100 + 0.001));
    return out;
  };
  assert.deepEqual([...seen({ walk: false, run: false, act: false })], ['rest']);
  assert.ok(!seen({ walk: true, run: false, act: false }).has('run'));
  assert.ok(!seen({ walk: true, run: true, act: false }).has('act'));
  assert.deepEqual([...seen({ walk: true, run: true, act: true })].sort(), ['act', 'rest', 'run', 'walk']);
  assert.ok(!seen({ walk: false, run: false, act: true }).has('walk'));
});

test('turning glides to the target and stops on it', () => {
  assert.equal(turn(1, -1, 0.05), 0.6);
  assert.equal(turn(-0.9, -1, 0.05), -1);
  assert.equal(turn(-1, 1, 1), 1);
  assert.equal(turn(1, 1, 0.1), 1);
});

test('grass is the same for the same seed and stays in its box', () => {
  const a = grassPath(7, 40, 14, 46);
  assert.equal(a, grassPath(7, 40, 14, 46));
  assert.notEqual(a, grassPath(8, 40, 14, 46));
  assert.equal((a.match(/M/g) || []).length, 40);
  const nums = (a.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  assert.ok(nums.every(Number.isFinite));
  const ys = (a.match(/,(-?\d+(\.\d+)?)/g) || []).map((x) => Number(x.slice(1)));
  assert.ok(ys.every((y) => y >= 0 && y <= 100), 'blade tips stay inside 0..100');
});
