import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BG, BG_SECONDS, SPOTS, bgClipPrompt, cropBox, spotClipPrompt, spotOf, spotPicPrompt, spotRunUsd, tileRect } from '../lib/spots';

test('spot ids are unique lowercase slugs and every window lies inside the picture', () => {
  assert.equal(new Set(SPOTS.map((s) => s.id)).size, SPOTS.length);
  for (const s of SPOTS) {
    assert.match(s.id, /^[a-z]+$/);
    const b = cropBox(s);
    assert.ok(b.left >= 0 && b.top >= 0 && b.left + b.width <= BG.w && b.top + b.height <= BG.h, s.id);
    assert.equal(b.width, b.height, 'square window');
    assert.equal(spotOf(s.id), s);
  }
  assert.equal(spotOf('khong-co'), undefined);
});

test('a window that sticks out is pulled back inside', () => {
  const b = cropBox({ id: 'x', name: '', place: '', action: '', box: { x: 1300, y: 700, s: 512 } });
  assert.deepEqual(b, { left: BG.w - 512, top: BG.h - 512, width: 512, height: 512 });
  assert.deepEqual(cropBox({ id: 'x', name: '', place: '', action: '', box: { x: -50, y: -9, s: 9999 } }), { left: 0, top: 0, width: BG.h, height: BG.h });
});

test('tiles are placed as percentages of the stage', () => {
  const t = tileRect(SPOTS[0]);
  assert.ok(t.left > 0 && t.left + t.width <= 100 && t.top + t.height <= 100.01);
  assert.equal(t.width, Math.round((512 / BG.w) * 10000) / 100);
  assert.equal(t.height, Math.round((512 / BG.h) * 10000) / 100);
});

test('prompts: the picture keeps the scene, the clip returns to its first frame', () => {
  for (const s of SPOTS) {
    const p = spotPicPrompt('a spirit fox', s);
    assert.match(p, /Image 1 is a painting of a place\. Image 2 is a creature \(a spirit fox\)/);
    assert.match(p, /Keep everything else in image 1 exactly as it is/);
    assert.ok(p.includes(s.place));
    const c = spotClipPrompt(s);
    assert.match(c, /last frame returns exactly to the first frame/);
    assert.match(c, /camera is completely static/);
    assert.ok(c.includes(s.action));
    assert.match(s.action, /settles back into the starting pose/);
  }
});

test('the spots are about different things: drink, eat, rest, look', () => {
  const by = Object.fromEntries(SPOTS.map((s) => [s.id, s.action]));
  assert.match(by.suoi, /drinks/);
  assert.match(by.cay, /eats/);
  assert.match(by.da, /rests/);
  assert.match(by.tre, /fireflies/);
});

test('a run is priced per creature and spot', () => {
  assert.equal(spotRunUsd(4, 0.07, 0.35), 1.68);
  assert.equal(spotRunUsd(0, 0.07, 0.35), 0);
  assert.equal(spotRunUsd(-3, 0.07, 0.35), 0);
});

test('the background clip: the scene moves, nothing is added, it loops', () => {
  const p = bgClipPrompt();
  assert.match(p, /river flows steadily/);
  assert.match(p, /spirit lights/);
  assert.match(p, /no creature, bird, insect or person is added/);
  assert.match(p, /last frame returns exactly to the first frame/);
  assert.ok([5, 10].includes(BG_SECONDS), 'a length the video model accepts');
});
