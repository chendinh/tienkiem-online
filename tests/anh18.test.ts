import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faceScene } from '../lib/wallpaper';
import { ANGLES, EXPRESSIONS, HANDS, LEVELS, STORIES, STYLES, composeScene, randomPick } from '../lib/wallpaper';
import { FACE_PREFIX, buildFacePrompt, isPhotoDataUrl, DEFAULT_SCENE, MODELS, SCENES, buildPrompt, inputOf, modelOf, promptProblem } from '../lib/anh18';

test('the default scene passes the filter and the prompt always says adult and fictional', () => {
  assert.equal(promptProblem(DEFAULT_SCENE), null);
  assert.match(buildPrompt(DEFAULT_SCENE), /fictional adult woman/);
});
test('minors, real people and explicit words are stopped', () => {
  for (const t of ['a young girl in a garden', 'schoolgirl uniform', 'bé gái 15 tuổi', 'loli', 'looks like a celebrity', 'ảnh thật của ca sĩ', 'fully nude', 'khỏa thân', 'topless on a lotus']) assert.notEqual(promptProblem(t), null, t);
  for (const t of ['fairy with plunging neckline and thigh slit', 'barefoot on a lotus above clouds']) assert.equal(promptProblem(t), null, t);
});
test('safety checker stays on unless the account is authorised; seedream 4K is inside fal limits', () => {
  for (const m of MODELS) assert.equal((inputOf(m.id, 'x', '4k', 5, false) as any).enable_safety_checker, true);
  assert.equal((inputOf('flux2pro', 'x', '4k', 5, true) as any).enable_safety_checker, false);
  const s: any = inputOf('seedream45', 'x', '4k', 5, false);
  assert.ok(s.image_size.width >= 1920 && s.image_size.width <= 4096 && s.image_size.height <= 4096);
  const l: any = inputOf('seedream45', 'x', '2k', 5, false);
  assert.ok(l.image_size.width * l.image_size.height >= 2560 * 1440);
  assert.equal((inputOf('flux2max', 'x', '2k', 9, false) as any).safety_tolerance, '5');
  assert.equal(modelOf('nope'), undefined);
});
test('every preset scene passes the filter and the prompt keeps the character clothed', () => {
  for (const x of SCENES) { assert.equal(promptProblem(x.text), null, x.id); assert.match(buildPrompt(x.text), /no nudity/); }
});
test('older models keep the checker on even when the server flag says it may be off', () => {
  for (const id of ['flux2dev', 'kolors', 'sdxl'] as const) assert.equal((inputOf(id, 'x', '2k', 5, true) as any).enable_safety_checker, true, id);
});
test('every wallpaper combination passes the filter, stays clothed and fits a phone', () => {
  for (const story of STORIES) for (const angle of ANGLES) for (const hands of HANDS) for (const expr of EXPRESSIONS) for (const level of LEVELS) for (const style of STYLES) {
    const t = composeScene({ story: story.id, angle: angle.id, hands: hands.id, expr: expr.id, level: level.id, style: style.id });
    assert.equal(promptProblem(t), null, `${story.id}/${angle.id}/${hands.id}/${expr.id}/${level.id}/${style.id}`);
    assert.ok(t.length < 2000, 'scene text must fit the 2000 character limit');
  }
  assert.match(composeScene({ story: 'x', angle: 'x', hands: 'x', expr: 'x', level: 'x', style: 'x' }), /9:16/);
  const r = randomPick({ level: '3' }, () => 0.5);
  assert.equal(r.level, '3');
});
test('framing is close, hands are handled by positive wording, only older models get a negative prompt', () => {
  const t = composeScene({ story: 'cocam', angle: 'bust', hands: 'hidden', expr: 'soft', level: '2', style: 'donghua' });
  assert.match(t, /waist up/); assert.match(t, /feet out of frame/); assert.match(t, /hidden inside her wide flowing sleeves/);
  assert.ok(!/\b(no|not|without)\b[^.]*fingers/i.test(t.replace('no hands visible', '')), 'no negated finger wording');
  assert.ok((inputOf('kolors', 'x', '2k', 5, false) as any).negative_prompt);
  assert.equal((inputOf('flux2pro', 'x', '2k', 5, false) as any).negative_prompt, undefined);
});
test('prompts never mention a clock (the model draws one)', () => {
  for (const story of STORIES) assert.ok(!/clock|watch|timepiece/i.test(composeScene({ story: story.id, angle: 'bust', hands: 'hidden', expr: 'soft', level: '2', style: 'donghua' })), story.id);
});
test('the my-face model: photo accepted only as a small data URL, look forced to level 1, checker always on', () => {
  assert.ok(isPhotoDataUrl('data:image/jpeg;base64,/9j/4AAQ'));
  for (const bad of ['http://x/y.jpg', 'data:text/html;base64,AAAA', 'data:image/svg+xml;base64,AAAA', '', 5]) assert.equal(isPhotoDataUrl(bad), false, String(bad));
  const f = faceScene({ story: 'nguyetmon', angle: 'bust', hands: 'hidden', expr: 'soft', level: '3', style: 'donghua' });
  assert.match(f, /off-shoulder neckline and sheer gauze sleeves/); assert.ok(!/bare midriff/.test(f));
  assert.match(buildFacePrompt(f), /non-suggestive/); assert.match(FACE_PREFIX, /slimmer/);
  const i: any = inputOf('seedreamFace', 'x', '4k', 5, true, 'data:image/jpeg;base64,AAAA');
  assert.equal(i.enable_safety_checker, true); assert.deepEqual(i.image_urls, ['data:image/jpeg;base64,AAAA']);
  assert.ok(MODELS.filter((m) => m.face).length === 1);
});
