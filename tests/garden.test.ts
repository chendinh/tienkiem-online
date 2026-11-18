import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BG_SECONDS, DEFAULT_PERCHES, HEIGHT, defaultSize, K_RANGE, MAX_ITEMS, MAX_PERCHES, S_RANGE, THEMES, W_RANGE, alphaBox, bgClipPrompt, boxOk, cleanPerches, creatureUsd, frameOf, isBgId, newUid, parseLayout, perchAt, perchAsk, planePrompt, sizeAtY, sizeOf, snapPerch, themeOf } from '../lib/garden';

const id = (n: number) => n.toString(16).padStart(20, '0');

test('perches: a dropped creature goes to the nearest one and stays inside it', () => {
  const ps = cleanPerches([{ id: 'aa', x: 0.2, y: 0.8, w: 0.1, s: 1 }, { id: 'bb', x: 0.7, y: 0.6, w: 0.06, s: 0.6 }]);
  assert.equal(ps.length, 2);
  const a = snapPerch(ps, 0.22, 0.5, 16 / 9)!, b = snapPerch(ps, 0.8, 0.9, 16 / 9)!;
  assert.equal(a.perch.id, 'aa'); assert.equal(a.y, 0.8); assert.equal(a.x, 0.22, 'x inside the perch is kept');
  assert.equal(b.perch.id, 'bb'); assert.equal(b.x, 0.73, 'x is pulled to the edge of the perch (0.7 + 0.03)'); assert.equal(b.y, 0.6);
  assert.equal(snapPerch([], 0.5, 0.5, 1.7), null);
  // distance is measured on the screen: the same gap in x counts for more than in y on a wide stage
  const far = cleanPerches([{ id: 'll', x: 0.3, y: 0.5, w: 0.02 }, { id: 'uu', x: 0.5, y: 0.3, w: 0.02 }]);
  assert.equal(snapPerch(far, 0.5, 0.5, 2)!.perch.id, 'uu');
});

test('perches from outside are kept sane: ids, ranges, duplicates, defaults', () => {
  const ps = cleanPerches([{ id: 'ok', x: -4, y: 9, w: 5, s: 99 }, { id: 'ok', x: 0.5, y: 0.5 }, { id: 'BAD ID', x: 0.5, y: 0.5 }, { id: 'nx', x: 'a', y: 0.5 }, { id: 'def', x: 0.5, y: 0.9 }, 7, null]);
  assert.deepEqual(ps.map((p) => p.id), ['ok', 'def']);
  assert.equal(ps[0].x, 0.02); assert.equal(ps[0].y, 0.99); assert.equal(ps[0].w, W_RANGE.max); assert.equal(ps[0].s, S_RANGE.max);
  assert.equal(ps[1].w, 0.07); assert.equal(ps[1].s, defaultSize(0.9, 0.07));
  assert.deepEqual(cleanPerches('x'), []);
  assert.equal(cleanPerches(Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, x: 0.5, y: 0.5 }))).length, MAX_PERCHES);
  assert.ok(sizeAtY(0.95) > sizeAtY(0.75), 'near is bigger than far');
  assert.ok(sizeAtY(0.2) >= 0.4 && sizeAtY(1) <= 1.2);
  const p = perchAt('zz', 0.5, 0.9);
  assert.deepEqual(p, { id: 'zz', x: 0.5, y: 0.9, w: 0.07, s: 0.56 });
  assert.equal(perchAt('wide', 0.5, 0.9, 0.2).s, 1, 'a wide perch near the viewer holds a big creature');
  assert.ok(perchAt('tiny', 0.5, 0.9, 0.02).s >= 0.3, 'never smaller than 0.3');
  assert.equal(sizeOf(p, 9), p.s * K_RANGE.max);
});

test('the perches that come with the site are valid and spread out', () => {
  for (const [bg, ps] of Object.entries(DEFAULT_PERCHES)) {
    assert.ok(isBgId(bg));
    assert.equal(cleanPerches(ps).length, ps.length, `${bg}: all valid`);
    assert.ok(ps.length >= 4, `${bg}: several perches`);
    assert.ok(new Set(ps.map((p) => p.id)).size === ps.length);
  }
});

test('a stored layout is validated: bad items are dropped, a creature follows its perch, at most MAX_ITEMS', () => {
  const perches = [{ id: 'aa', x: 0.2, y: 0.8, w: 0.1, s: 1 }, { id: 'bb', x: 0.7, y: 0.6, w: 0.06, s: 0.6 }];
  const l = parseLayout({ perches, items: [
    { uid: 'abcd1234', cut: id(1), x: 0.9, y: 0.5, flip: true, k: 9 },            // goes to the nearest perch, k to the limit
    { uid: 'abcd1234', cut: id(2), x: 0.4, y: 0.8, flip: false, k: 1 },            // same uid: dropped
    { uid: 'zzzz', cut: 'nope', x: 0.4, y: 0.8 },                                    // not a picture id: dropped
    { uid: 'qqqq1111', cut: id(3), x: 'a', y: 0.8 },                                 // not a number: dropped
    { uid: 'good0001', cut: id(4), x: 0.21, y: 0.8 },
  ] });
  assert.equal(l.items.length, 2);
  assert.equal(l.items[0].perch, 'bb'); assert.equal(l.items[0].k, K_RANGE.max); assert.equal(l.items[0].flip, true);
  assert.deepEqual(l.items[1], { uid: 'good0001', cut: id(4), perch: 'aa', x: 0.21, y: 0.8, flip: false, k: 1 });
  // a perch that moved: the creature on it follows to the nearest one
  const moved = parseLayout({ perches: [{ id: 'aa', x: 0.25, y: 0.82, w: 0.1 }], items: [{ uid: 'good0001', cut: id(4), x: 0.21, y: 0.8 }] });
  assert.equal(moved.items[0].perch, 'aa'); assert.equal(moved.items[0].y, 0.82);
  // no perch at all: no creature; a background with none saved starts from the fallback
  assert.deepEqual(parseLayout({ perches: [], items: [{ uid: 'good0001', cut: id(4), x: 0.2, y: 0.8 }] }), { perches: [], items: [] });
  assert.equal(parseLayout(null, DEFAULT_PERCHES.thanhvan).perches.length, DEFAULT_PERCHES.thanhvan.length);
  assert.deepEqual(parseLayout(null), { perches: [], items: [] });
  const many = parseLayout({ perches, items: Array.from({ length: 40 }, (_, i) => ({ uid: `u${String(i).padStart(4, '0')}`, cut: id(i), x: 0.2, y: 0.8 })) });
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

test('frameOf: the feet of any creature stand on the perch point, whatever the empty margin of its picture', () => {
  const aspect = 16 / 9;
  for (const b of [{ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.95 }, { x0: 0.4, y0: 0.05, x1: 0.6, y1: 0.8 }, { x0: 0.02, y0: 0.5, x1: 0.98, y1: 0.7 }]) {
    for (const [it, size] of [[{ x: 0.5, y: 0.8 }, 1], [{ x: 0.2, y: 0.55 }, 0.5], [{ x: 0.9, y: 0.95 }, 1.6]] as const) {
      const f = frameOf(b, it, size, aspect);
      const feetX = f.left / 100 + ((b.x0 + b.x1) / 2) * (f.width / 100), feetY = f.top / 100 + b.y1 * (f.height / 100);
      assert.ok(Math.abs(feetX - it.x) < 1e-3 && Math.abs(feetY - it.y) < 1e-3, 'feet on the point');
      assert.ok(Math.abs((b.y1 - b.y0) * (f.height / 100) - HEIGHT * size) < 1e-3, 'box height = HEIGHT * size');
      assert.ok(Math.abs((f.width / 100) * aspect - f.height / 100) < 1e-3, 'square frame');
    }
  }
  assert.equal(frameOf({ x0: 0.2, y0: 0, x1: 0.8, y1: 1 }, { x: 0.5, y: 0.8 }, 1, 1.7).pivot, 50);
});

test('themes: ids are slugs, every prompt asks for a beautiful scene with several small flat places and no creature', () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  for (const t of THEMES) {
    assert.match(t.id, /^[a-z]+$/);
    assert.equal(themeOf(t.id), t);
    const p = planePrompt(t);
    assert.ok(p.includes(t.en));
    assert.match(p, /SEVERAL small natural flat places/);
    assert.match(p, /mossy boulder/);
    assert.match(p, /open space above it/);
    assert.match(p, /No creatures, no people/);
    assert.ok(!/completely empty|FLAT HORIZONTAL/.test(p), 'not a big empty plane');
  }
  assert.equal(themeOf('x'), undefined);
  const ask = perchAsk();
  assert.match(ask, /JSON only/); assert.match(ask, /grid/);
});

test('the background clip is generic (no river in particular), loops, adds nothing, and keeps the ground still', () => {
  const p = bgClipPrompt();
  assert.match(p, /any water flows/);
  assert.match(p, /flat places in the picture stay perfectly still/);
  assert.match(p, /no creature, bird, insect or person is added/);
  assert.match(p, /last frame returns exactly to the first frame/);
  assert.ok([5, 10].includes(BG_SECONDS));
});

test('a creature costs its clip and cut-out, plus a variant picture when it is a mutation', () => {
  const u = { edit: 0.04, clip: 0.35, cut: 0.06 };
  assert.equal(creatureUsd(u, false), 0.41);
  assert.equal(creatureUsd(u, true), 0.45);
});
