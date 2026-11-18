import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAR, HEIGHT, K_RANGE, MAX_ITEMS, NEAR, PLANE, THEMES, alphaBox, boxOk, bgClipPrompt, BG_SECONDS, cleanPlane, creatureUsd, depth, frameOf, isBgId, newUid, parseLayout, planePrompt, scaleAt, snap, themeOf } from '../lib/garden';

const id = (n: number) => n.toString(16).padStart(20, '0');

test('the plane: a dropped creature is pushed back onto the ground, and far ones are smaller', () => {
  assert.deepEqual(snap(PLANE, 0.5, 0.2), { x: 0.5, y: PLANE.y0 });
  assert.deepEqual(snap(PLANE, 0.5, 0.99), { x: 0.5, y: PLANE.y1 });
  assert.equal(snap(PLANE, -3, 0.8).x, 0.03);
  assert.equal(snap(PLANE, 7, 0.8).x, 0.97);
  assert.equal(depth(PLANE, PLANE.y0), 0); assert.equal(depth(PLANE, PLANE.y1), 1);
  assert.equal(scaleAt(PLANE, PLANE.y0), FAR); assert.ok(Math.abs(scaleAt(PLANE, PLANE.y1) - NEAR) < 1e-9);
  assert.ok(scaleAt(PLANE, 0.8) > scaleAt(PLANE, 0.75));
});

test('a plane from outside is kept sane', () => {
  assert.deepEqual(cleanPlane({ y0: 0.6, y1: 0.9 }), { y0: 0.6, y1: 0.9 });
  assert.deepEqual(cleanPlane('x'), PLANE);
  assert.deepEqual(cleanPlane({ y0: 0.8, y1: 0.7 }), { y0: 0.8, y1: 0.84 }, 'the near edge is always below the far edge');
  const p = cleanPlane({ y0: -5, y1: 9 });
  assert.ok(p.y0 >= 0.3 && p.y1 <= 0.99 && p.y1 > p.y0);
});

test('a stored layout is validated: bad items are dropped, numbers are pulled into range, at most MAX_ITEMS', () => {
  const l = parseLayout({ plane: { y0: 0.7, y1: 0.9 }, items: [
    { uid: 'abcd1234', cut: id(1), x: 0.5, y: 0.5, flip: true, k: 9 },            // y is pushed onto the plane, k to the limit
    { uid: 'abcd1234', cut: id(2), x: 0.4, y: 0.8, flip: false, k: 1 },            // same uid: dropped
    { uid: 'zzzz', cut: 'nope', x: 0.4, y: 0.8 },                                    // not a picture id: dropped
    { uid: 'qqqq1111', cut: id(3), x: 'a', y: 0.8 },                                 // not a number: dropped
    { uid: 'good0001', cut: id(4), x: 0.2, y: 0.85 },
  ] });
  assert.equal(l.items.length, 2);
  assert.equal(l.items[0].y, 0.7); assert.equal(l.items[0].k, K_RANGE.max); assert.equal(l.items[0].flip, true);
  assert.deepEqual(l.items[1], { uid: 'good0001', cut: id(4), x: 0.2, y: 0.85, flip: false, k: 1 });
  assert.deepEqual(parseLayout(null), { plane: PLANE, items: [] });
  const many = parseLayout({ items: Array.from({ length: 40 }, (_, i) => ({ uid: `u${String(i).padStart(4, '0')}`, cut: id(i), x: 0.5, y: 0.8 })) });
  assert.equal(many.items.length, MAX_ITEMS);
  assert.match(newUid(), /^[a-z0-9]{8}$/);
  assert.ok(isBgId('dawn') && isBgId(id(5)) && !isBgId('../x') && !isBgId('') && !isBgId(5));
});

test('alphaBox: the box of the creature, ignoring dust', () => {
  const w = 100, h = 100, a = new Uint8Array(w * h);
  for (let y = 30; y < 80; y++) for (let x = 20; x < 60; x++) a[y * w + x] = 255;
  a[5 * w + 90] = 255;
  assert.deepEqual(alphaBox(a, w, h), { x0: 0.2, y0: 0.3, x1: 0.6, y1: 0.8 });
  assert.equal(alphaBox(new Uint8Array(100), 10, 10), null);
  assert.equal(alphaBox(new Uint8Array(5), 10, 10), null);
  assert.ok(boxOk({ x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.9 }));
  assert.ok(!boxOk({ x0: 0.5, y0: 0.1, x1: 0.1, y1: 0.9 }) && !boxOk(null) && !boxOk({ x0: 'a' }));
});

test('frameOf: the feet of any creature stand on the dropped point, whatever the empty margin of its picture', () => {
  const aspect = 16 / 9;
  for (const b of [{ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.95 }, { x0: 0.4, y0: 0.05, x1: 0.6, y1: 0.8 }, { x0: 0.02, y0: 0.5, x1: 0.98, y1: 0.7 }]) {
    for (const it of [{ x: 0.5, y: 0.8, k: 1 }, { x: 0.2, y: PLANE.y0, k: 1 }, { x: 0.9, y: PLANE.y1, k: 2 }]) {
      const f = frameOf(PLANE, b, it, aspect);
      // the bottom middle of the box, back in stage shares
      const feetX = f.left / 100 + ((b.x0 + b.x1) / 2) * (f.width / 100), feetY = f.top / 100 + b.y1 * (f.height / 100);
      assert.ok(Math.abs(feetX - it.x) < 1e-3 && Math.abs(feetY - it.y) < 1e-3, 'feet on the point');
      // the box is HEIGHT * scale * k of the stage's height, and the frame is square on screen
      assert.ok(Math.abs((b.y1 - b.y0) * (f.height / 100) - HEIGHT * scaleAt(PLANE, it.y) * it.k) < 1e-3);
      assert.ok(Math.abs((f.width / 100) * aspect - f.height / 100) < 1e-3, 'square frame');
    }
  }
  const far = frameOf(PLANE, { x0: 0, y0: 0, x1: 1, y1: 1 }, { x: 0.5, y: PLANE.y0, k: 1 }, aspect), near = frameOf(PLANE, { x0: 0, y0: 0, x1: 1, y1: 1 }, { x: 0.5, y: PLANE.y1, k: 1 }, aspect);
  assert.ok(far.height < near.height, 'far is smaller');
  assert.equal(frameOf(PLANE, { x0: 0.2, y0: 0, x1: 0.8, y1: 1 }, { x: 0.5, y: 0.8, k: 1 }, aspect).pivot, 50);
});

test('themes: ids are slugs, every prompt asks for an empty flat horizontal ground and no creature', () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  for (const t of THEMES) {
    assert.match(t.id, /^[a-z]+$/);
    assert.equal(themeOf(t.id), t);
    const p = planePrompt(t);
    assert.ok(p.includes(t.en));
    assert.match(p, /FLAT HORIZONTAL ground/);
    assert.match(p, /completely empty and clear/);
    assert.match(p, /No creatures, no people/);
  }
  assert.equal(themeOf('x'), undefined);
});

test('the background clip is generic (no river in particular), loops, adds nothing, and keeps the ground still', () => {
  const p = bgClipPrompt();
  assert.match(p, /any water flows/);
  assert.match(p, /ground in the lower part of the picture stays still/);
  assert.match(p, /no creature, bird, insect or person is added/);
  assert.match(p, /last frame returns exactly to the first frame/);
  assert.ok([5, 10].includes(BG_SECONDS));
});

test('a creature costs its clip and cut-out, plus a variant picture when it is a mutation', () => {
  const u = { edit: 0.04, clip: 0.35, cut: 0.06 };
  assert.equal(creatureUsd(u, false), 0.41);
  assert.equal(creatureUsd(u, true), 0.45);
});
