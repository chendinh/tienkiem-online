import test from 'node:test';
import assert from 'node:assert/strict';
import { variantOf } from '../lib/zoo';
import { lookFailed, takeWanted, wantLooks } from '../lib/server/zoolooks';

// The server draws the look of a newly tamed Dị Biến beast by itself; an account whose looks did not change is not looked at again for a while.
test('a new Dị Biến beast asks for its look at once; nothing new asks for nothing', () => {
  const ids = Array.from({ length: 60 }, (_, i) => i + 1);
  const a = ids.find((i) => variantOf('soi', i) !== 'ngusac')!, rainbow = ids.find((i) => variantOf('soi', i) === 'ngusac')!;
  const b = ids.find((i) => variantOf('soi', i) !== 'ngusac' && variantOf('soi', i) !== variantOf('soi', a))!;
  const t = 1_000_000, A = { sp: 'soi', id: a, mut: true }, B = { sp: 'soi', id: b, mut: true };
  takeWanted();
  assert.equal(wantLooks('p1', [{ sp: 'soi', id: a, mut: false }], t), false, 'an ordinary beast has no look to draw');
  assert.equal(wantLooks('p2', [{ sp: 'soi', id: rainbow, mut: true }], t), false, 'Ngũ Sắc is the game\'s own picture');
  assert.equal(wantLooks('p3', [A], t), true, 'a Dị Biến look is wanted');
  assert.deepEqual(takeWanted(), [{ sp: 'soi', look: variantOf('soi', a) }]);
  assert.equal(wantLooks('p3', [A], t + 60000), false, 'the same beasts a minute later: nothing to do');
  assert.equal(wantLooks('p3', [A, B], t + 61000), true, 'a newly tamed beast is wanted at once');
  assert.deepEqual(takeWanted().map((k) => k.look).sort(), [variantOf('soi', a), variantOf('soi', b)].sort());
  assert.equal(wantLooks('p3', [A, B], t + 17 * 60000), true, 'looked at again after a while (a picture may still be missing)');
  takeWanted();
  lookFailed({ sp: 'soi', look: variantOf('soi', a) }, t + 17 * 60000);
  assert.equal(wantLooks('p4', [A], t + 18 * 60000), false, 'a look the reviewer refused is not paid for again soon');
  assert.equal(wantLooks('p5', [A], t + 7 * 3600000), true, 'but is tried again hours later');
});
