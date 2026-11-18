import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BG, BG_SECONDS, SPOTS, alphaMetrics, bgClipPrompt, cleanPoints, cropBox, dirWord, face, frameOf, metricsOf, room, spotClipPrompt, spotNeedUsd, spotOf, spotPicPrompt, spotPose, spotRunUsd, spotsWith, tileRect, type Metrics, type Spot } from '../lib/spots';

// a creature's measured box (fractions of its picture), as alphaMetrics gives it: `l` and `r` are the left and right extremes
const box = (x0: number, y0: number, x1: number, y1: number, ly = 0.5, ry = 0.5): Metrics => ({ x0, y0, x1, y1, l: { x: x0, y: ly }, r: { x: x1, y: ry } });
const CREATURES: Record<string, Metrics> = { fox: box(0.15, 0.4, 0.85, 0.9, 0.85, 0.6), tall: box(0.4, 0.05, 0.6, 0.95), snake: box(0.02, 0.7, 0.98, 0.9), tiny: box(0.45, 0.45, 0.55, 0.55) };

test('spot ids are unique lowercase slugs, the points are inside the picture and the windows too', () => {
  assert.equal(new Set(SPOTS.map((s) => s.id)).size, SPOTS.length);
  for (const s of SPOTS) {
    assert.match(s.id, /^[a-z]+$/);
    assert.equal(spotOf(s.id), s);
    assert.ok(cleanPoints({ stand: s.stand, focus: s.focus }, s.kind), `${s.id}: the default points are valid`);
    const b = cropBox(s);
    assert.ok(b.left >= 0 && b.top >= 0 && b.left + b.width <= BG.w && b.top + b.height <= BG.h, s.id);
    assert.equal(b.width, b.height, 'square window');
    // the window holds the feet and the focus
    assert.ok(s.stand.x >= b.left && s.stand.x <= b.left + b.width && s.stand.y >= b.top && s.stand.y <= b.top + b.height, `${s.id}: feet in the window`);
    assert.ok(s.focus.x >= b.left && s.focus.x <= b.left + b.width && s.focus.y >= b.top, `${s.id}: focus in the window`);
  }
  assert.equal(spotOf('khong-co'), undefined);
});

test('the window follows the points but only in steps, so a nudge does not pay for a new picture', () => {
  const s = SPOTS[0], t: Spot = { ...s, stand: { x: s.stand.x + 4, y: s.stand.y - 3 }, focus: { x: s.focus.x + 4, y: s.focus.y } };
  assert.deepEqual(cropBox(t), cropBox(s));
  const far: Spot = { ...s, stand: { x: 1200, y: 700 }, focus: { x: 1300, y: 700 } };
  const b = cropBox(far);
  assert.ok(b.left + b.width <= BG.w && b.top + b.height <= BG.h);
});

test('the owner\'s points: bad ones are refused, good ones replace the defaults, the rest stay', () => {
  assert.equal(cleanPoints({ stand: { x: 10, y: 10 }, focus: { x: 99999, y: 50 } }), null, 'outside the picture');
  assert.equal(cleanPoints({ stand: { x: 100, y: 10 }, focus: { x: 300, y: 5 } }), null, 'feet at the very top');
  assert.equal(cleanPoints({ stand: { x: 100, y: 300 }, focus: { x: 105, y: 305 } }), null, 'the points are the same place');
  assert.equal(cleanPoints({ stand: { x: 100, y: 300 }, focus: { x: 110, y: 300 } }, 'drink'), null, 'a drink needs room between feet and water');
  assert.equal(cleanPoints({ stand: { x: 100, y: 300 }, focus: { x: 300, y: 290 } }, 'eat'), null, 'an apple-picker needs height between feet and fruit');
  assert.equal(cleanPoints('x'), null);
  assert.deepEqual(cleanPoints({ stand: { x: 100.4, y: 300.6 }, focus: { x: 300, y: 310 } }, 'drink'), { stand: { x: 100, y: 301 }, focus: { x: 300, y: 310 } });
  const out = spotsWith({ suoi: { stand: { x: 500, y: 700 }, focus: { x: 650, y: 710 } }, cay: { stand: { x: -5, y: 1 } } });
  assert.deepEqual(out[0].stand, { x: 500, y: 700 });
  assert.deepEqual(out[1], SPOTS[1], 'a bad saved value leaves the default');
  assert.deepEqual(spotsWith(null), SPOTS);
});

test('the room of a spot: a drink is as wide as feet-to-water, a fruit picker as tall as feet-to-fruit', () => {
  const drink = SPOTS.find((s) => s.kind === 'drink')!, eat = SPOTS.find((s) => s.kind === 'eat')!, rest = SPOTS.find((s) => s.kind === 'rest')!;
  assert.equal(room(drink).w, Math.abs(drink.focus.x - drink.stand.x));
  assert.equal(room(eat).h, eat.stand.y - eat.focus.y);
  assert.deepEqual(room(rest), rest.size);
  assert.equal(face(drink), 1);
  assert.equal(dirWord(eat), 'left');
});

test('alphaMetrics: the box of the creature, ignoring dust, and its two extremes', () => {
  const w = 100, h = 100, a = new Uint8Array(w * h);
  for (let y = 30; y < 80; y++) for (let x = 20; x < 60; x++) a[y * w + x] = 255;
  a[5 * w + 90] = 255;                                            // a speck far away
  for (let y = 70; y < 76; y++) for (let x = 60; x < 66; x++) a[y * w + x] = 255;   // a snout sticking out low on the right
  const m = alphaMetrics(a, w, h)!;
  assert.ok(m, 'found');
  assert.equal(m.x0, 0.2); assert.equal(m.y0, 0.3); assert.equal(m.y1, 0.8); assert.equal(m.x1, 0.66);
  assert.ok(m.r.y > 0.7 && m.r.y < 0.77, 'the right extreme is the low snout');
  assert.ok(m.l.y > 0.3 && m.l.y < 0.8, 'the left extreme is the middle of the left side');
  assert.equal(alphaMetrics(new Uint8Array(100), 10, 10), null, 'empty picture');
  assert.equal(alphaMetrics(new Uint8Array(5), 10, 10), null, 'short buffer');
  assert.equal(metricsOf(m)?.x0, 0.2);
  assert.equal(metricsOf({ x0: 1 }), null);
  assert.equal(metricsOf(box(0.5, 0.2, 0.4, 0.9)), null, 'an upside-down box');
});

test('any creature: feet on the stand point, inside the room, and a reaching creature touches the focus', () => {
  for (const s of SPOTS) {
    for (const [name, m] of Object.entries(CREATURES)) {
      const f = frameOf(s, m), rm = room(s), tag = `${s.id}/${name}`;
      assert.ok(Math.abs(f.bbox.top + f.bbox.h - s.stand.y) < 1e-6, `${tag}: bottom of the box is the stand point`);
      assert.ok(f.bbox.w <= rm.w + 1e-6 && f.bbox.h <= rm.h + 1e-6, `${tag}: fits the room`);
      assert.ok(f.bbox.w >= rm.w - 1e-6 || f.bbox.h >= rm.h - 1e-6, `${tag}: as big as the room allows`);
      assert.ok(f.bbox.left >= 0 && f.bbox.left + f.bbox.w <= BG.w, `${tag}: on the picture`);
      if (s.kind === 'drink' || s.kind === 'eat') {
        const front = face(s) > 0 ? f.bbox.left + f.bbox.w : f.bbox.left;
        assert.ok(Math.abs(front - s.focus.x) < 1e-6, `${tag}: the front of the box is at the focus`);
      } else assert.ok(Math.abs(f.bbox.left + f.bbox.w / 2 - s.stand.x) < 1e-6, `${tag}: centred on the stand point`);
    }
  }
});

test('a drinker\'s muzzle lands on the water point for a fox and for a snake alike', () => {
  const s = SPOTS.find((x) => x.kind === 'drink')!;
  for (const m of [CREATURES.fox, CREATURES.snake, CREATURES.tiny]) {
    const f = frameOf(s, m);
    assert.ok(Math.abs(f.nose.x - s.focus.x / BG.w) < 1e-6, 'muzzle x is the focus x');
    assert.ok(f.nose.y > 0 && f.nose.y < 1);
  }
  // the frame of the video is placed so that the measured box ends up where the box was put
  const m = CREATURES.fox, f = frameOf(s, m);
  const el = { left: (f.frame.left / 100) * BG.w, top: (f.frame.top / 100) * BG.h, w: (f.frame.width / 100) * BG.w, h: (f.frame.height / 100) * BG.h };
  assert.ok(Math.abs(el.left + m.x0 * el.w - f.bbox.left) < 0.5);
  assert.ok(Math.abs(el.top + m.y1 * el.h - (f.bbox.top + f.bbox.h)) < 0.5);
  assert.ok(Math.abs(el.w - 512 * f.k) < 0.5, 'one scale for the whole frame');
});

test('prompts: the pose points towards the focus, the picture keeps the scene, the clip returns to its first frame', () => {
  for (const s of SPOTS) {
    const p = spotPicPrompt('a spirit fox', s);
    assert.match(p, /Image 1 is a painting of a place\. Image 2 is a creature \(a spirit fox\)/);
    assert.match(p, /Keep everything else in image 1 exactly as it is/);
    assert.match(p, /fully visible and not cropped/);
    assert.ok(p.includes(spotPose(s)));
    assert.ok(!p.includes('{dir}'), 'the direction is filled in');
    const c = spotClipPrompt(s);
    assert.match(c, /last frame returns exactly to the first frame/);
    assert.match(c, /camera is completely static/);
    assert.ok(c.includes(s.action));
    assert.match(s.action, /(starting pose)/);
  }
  assert.match(spotPose(SPOTS.find((s) => s.kind === 'drink')!), /facing right/);
  assert.match(spotPose({ ...SPOTS[0], focus: { x: 100, y: 700 } }), /facing left/);
});

test('the spots are about different things, and a drink or a meal keeps the mouth in place', () => {
  const by = Object.fromEntries(SPOTS.map((s) => [s.id, s]));
  assert.match(by.suoi.action, /drinking/); assert.match(by.suoi.pose, /muzzle touches the surface/);
  assert.match(by.cay.action, /eats/); assert.match(by.cay.pose, /fruit/);
  assert.match(by.da.action, /rests/);
  assert.match(by.tre.action, /fireflies/);
  assert.match(by.suoi.action, /Its feet do not move/);
  assert.match(by.suoi.action, /ends exactly in the starting pose/);
});

test('tiles (shown until the cut-out exists) are placed as percentages of the stage', () => {
  const t = tileRect(SPOTS[0]);
  assert.ok(t.left >= 0 && t.left + t.width <= 100.01 && t.top + t.height <= 100.01);
  assert.equal(t.width, Math.round((512 / BG.w) * 10000) / 100);
  assert.equal(t.height, Math.round((512 / BG.h) * 10000) / 100);
});

test('a run is priced per creature and spot, and only for the steps still missing', () => {
  assert.equal(spotRunUsd(4, 0.07, 0.35), 1.68);
  assert.equal(spotRunUsd(2, 0.07, 0.35, 0.1), 1.04);
  assert.equal(spotRunUsd(0, 0.07, 0.35), 0);
  assert.equal(spotRunUsd(-3, 0.07, 0.35), 0);
  const u = { pic: 0.07, box: 0.02, clip: 0.35, cut: 0.06 };
  assert.equal(spotNeedUsd(u, {}), 0.5);
  assert.equal(spotNeedUsd(u, { pic: true, box: true }), 0.41);
  assert.equal(spotNeedUsd(u, { pic: true, box: true, clip: true, cut: true }), 0);
});

test('the background clip: the scene moves, nothing is added, it loops', () => {
  const p = bgClipPrompt();
  assert.match(p, /river flows steadily/);
  assert.match(p, /spirit lights/);
  assert.match(p, /no creature, bird, insect or person is added/);
  assert.match(p, /last frame returns exactly to the first frame/);
  assert.ok([5, 10].includes(BG_SECONDS), 'a length the video model accepts');
});
