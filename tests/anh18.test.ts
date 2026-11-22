import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCENE, MODELS, SCENES, buildPrompt, inputOf, modelOf, promptProblem } from '../lib/anh18';

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
