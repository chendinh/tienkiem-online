import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIONS, MUTATIONS, clipCost, clipInput, clipPrompt, estimate, isPictureId, parseRange, variantPrompt, DEFAULT_MODEL } from '../lib/anim';

test('mutation and motion ids are unique, lowercase slugs', () => {
  for (const list of [MUTATIONS, MOTIONS]) {
    const ids = list.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z]+$/);
  }
});

test('the rainbow mutation stays the first one: the lab reuses the game picture for it', () => {
  assert.equal(MUTATIONS[0].id, 'ngusac');
});

test('a variant keeps the creature and a clip returns to its first frame', () => {
  for (const m of MUTATIONS) assert.match(variantPrompt(m), /same creature design, body shape, pose/);
  for (const m of MOTIONS) assert.match(clipPrompt(m), /last frame returns exactly to the first frame/);
});

test('Kling 2.6 loops: start and end frame are the same picture, no audio', () => {
  const i = clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'https://v3.fal.media/x.jpg', seconds: 5 });
  assert.equal(i.start_image_url, i.end_image_url);
  assert.equal(i.generate_audio, false);
  assert.equal(i.duration, '5');
  assert.equal(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 10 }).duration, '10');
  assert.equal(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 7 }).duration, '5');
});

test('prices: a known model, an unknown model (priced high), and a whole run', () => {
  assert.equal(clipCost(DEFAULT_MODEL, 5), 0.35);
  assert.equal(clipCost('some/new-model', 5), 1);
  // 3 variants -> 4 pictures; 2 motions -> 8 clips of 5 s
  assert.deepEqual(estimate({ model: DEFAULT_MODEL, seconds: 5, editUsd: 0.04, variants: 3, motions: 2 }), { edits: 3, clips: 8, usd: 2.92 });
  assert.equal(estimate({ model: DEFAULT_MODEL, seconds: 5, editUsd: 0.04, variants: 0, motions: 0 }).usd, 0);
});

test('picture ids are the 20-hex hashes of the image table', () => {
  assert.ok(isPictureId('0123456789abcdef0123'));
  assert.ok(!isPictureId('0123456789ABCDEF0123'));
  assert.ok(!isPictureId('../../etc'));
  assert.ok(!isPictureId(undefined));
});

test('Range header: pieces for a phone, 416 for nonsense', () => {
  assert.equal(parseRange(null, 10), null);
  assert.deepEqual(parseRange('bytes=0-', 10), { start: 0, end: 9 });
  assert.deepEqual(parseRange('bytes=0-', 10, 4), { start: 0, end: 3 });
  assert.deepEqual(parseRange('bytes=4-5', 10), { start: 4, end: 5 });
  assert.deepEqual(parseRange('bytes=8-100', 10), { start: 8, end: 9 });
  assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
  for (const bad of ['bytes=20-30', 'bytes=5-2', 'bytes=-', 'bytes=-0', 'bytes=0-1,3-4', 'items=0-1', 'abc']) assert.equal(parseRange(bad, 10), 'bad', bad);
  assert.equal(parseRange('bytes=0-', 0), 'bad');
});
