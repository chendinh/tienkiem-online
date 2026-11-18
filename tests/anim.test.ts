import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIONS, MUTATIONS, plainBg, plainPrompt, clipCost, clipInput, clipPrompt, cutCost, cutInput, estimate, isPictureId, motionOf, parseRange, variantPrompt, DEFAULT_CUT_MODEL, DEFAULT_MODEL, fgCost, fgCutInput, fgPrompt, isZoneId, bgPath, bgExt } from '../lib/anim';

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

test('walk and run are done in place and are the only motions that travel', () => {
  assert.deepEqual(MOTIONS.filter((m) => m.move).map((m) => m.id), ['walk', 'run']);
  for (const id of ['walk', 'run']) assert.match(motionOf(id)!.en, /in place[\s\S]*does not travel forward/);
});

test('Kling 2.6 loops: start and end frame are the same picture, no audio', () => {
  const i = clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'https://v3.fal.media/x.jpg', seconds: 5 });
  assert.equal(i.start_image_url, i.end_image_url);
  assert.equal(i.generate_audio, false);
  assert.equal(i.duration, '5');
  assert.equal(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 10 }).duration, '10');
  assert.equal(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 7 }).duration, '5');
});

test('the cut-out asks VEED for two H.264 videos (Safari cannot show the alpha of a WebM)', () => {
  const i = cutInput(DEFAULT_CUT_MODEL, 'https://v3.fal.media/c.mp4');
  assert.equal(i.output_codec, 'h264');
  assert.equal(i.subject_is_person, false);
  assert.deepEqual(cutInput('other/model', 'u'), { video_url: 'u' });
});

test('prices: a known model, an unknown model (priced high), a cut-out, and a whole run', () => {
  assert.equal(clipCost(DEFAULT_MODEL, 5), 0.35);
  assert.equal(clipCost('some/new-model', 5), 1);
  assert.equal(cutCost(DEFAULT_CUT_MODEL, 5), 0.06);
  // 3 variants -> 4 pictures; 2 motions -> 8 clips of 5 s
  assert.deepEqual(estimate({ model: DEFAULT_MODEL, seconds: 5, editUsd: 0.04, variants: 3, motions: 2 }), { edits: 3, clips: 8, usd: 2.92 });
  // the same run with every clip cut out: 8 x 0.06 more
  assert.equal(estimate({ model: DEFAULT_MODEL, seconds: 5, editUsd: 0.04, variants: 3, motions: 2, cutModel: DEFAULT_CUT_MODEL }).usd, 3.4);
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

test('the foreground layer: kept elements on white, then cut; cheap and bound to a zone id', () => {
  assert.match(fgPrompt(), /ONLY the closest foreground[\s\S]*flat pure white background/);
  assert.deepEqual(fgCutInput('u'), { image_url: 'u' });
  assert.equal(fgCost(0.04), 0.06);
  assert.ok(isZoneId('thanhvan'));
  for (const bad of ['../x', 'Thanh', 'a', '', undefined, 'thanh-van']) assert.ok(!isZoneId(bad), String(bad));
});

test('the background pictures: the game\'s sea of clouds and the zones, each with its own path and type', () => {
  assert.equal(bgPath('dawn'), '/art/scene/dawn.webp');
  assert.equal(bgExt('night'), 'webp');
  assert.equal(bgPath('thanhvan'), '/art/zones/thanhvan.jpg');
  assert.equal(bgExt('thanhvan'), 'jpg');
  assert.ok(isZoneId('dawn'));
});

test('the Linh Thú Viên motion asks for big movement and its picture has a flat ground', () => {
  const live = motionOf('live')!;
  assert.ok(live.bold && !live.move);
  assert.match(clipPrompt(live), /clearly visible, not subtle/);
  assert.match(clipPrompt(live), /last frame returns exactly to the first frame/);
  assert.match(String(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 5, bold: true }).negative_prompt), /^static, frozen/);
  assert.doesNotMatch(String(clipInput(DEFAULT_MODEL, { prompt: 'p', imageUrl: 'u', seconds: 5 }).negative_prompt), /frozen/);
  for (const m of MUTATIONS) {
    assert.match(plainPrompt(m, false), new RegExp(`variant with ${m.en.slice(0, 20)}`));
    assert.match(plainPrompt(m, false), new RegExp(`uniform ${plainBg(m.id)} that fills the whole picture`));
    assert.match(plainPrompt(m, true), /^Edit this image\. Keep the creature exactly as it is/);
    assert.doesNotMatch(plainPrompt(m, true), /rare mutated variant/);
    assert.doesNotMatch(m.en, /translucent|semi-transparent|haze|mist/);   // a see-through or hazy body is cut away by the background remover
  }
  assert.equal(plainBg('hanbang'), 'deep charcoal grey');
  assert.equal(plainBg('thanhmoc'), 'pure white');
});
