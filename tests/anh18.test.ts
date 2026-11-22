import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANATOMY, ANGLES, EXPRESSIONS, FRAMES, HAIR, HANDS, LEVELS, POSES, REFLECTION, STORIES, STORY_POSE, STYLES, VIEWS, composeScene, faceScene, isFaceless, poseText, randomPick, validPoses, type Pick } from '../lib/wallpaper';
import { FACE_PREFIX, FACELESS_PREFIX, FIX_PROMPT, MODELS, buildFacePrompt, buildPrompt, fixInput, inputOf, isFalUrl, isFixKind, isPhotoDataUrl, DEFAULT_SCENE, modelOf, promptProblem } from '../lib/anh18';

const base: Pick = { style: 'donghua', story: 'nguyetmon', frame: 'half', angle: 'eye', view: 'front', pose: 'auto', hands: 'hidden', hair: 'long', expr: 'soft', level: '2' };

test('the default scene passes the filter and the prompt always says adult and fictional', () => {
  assert.equal(promptProblem(DEFAULT_SCENE), null);
  assert.match(buildPrompt(DEFAULT_SCENE), /fictional adult woman/);
});
test('minors, real people and explicit words are stopped', () => {
  for (const t of ['a young girl in a garden', 'schoolgirl uniform', 'bé gái 15 tuổi', 'loli', 'looks like a celebrity', 'ảnh thật của ca sĩ', 'fully nude', 'khỏa thân', 'topless on a lotus']) assert.notEqual(promptProblem(t), null, t);
  for (const t of ['fairy with plunging neckline and thigh slit', 'barefoot on a lotus above clouds']) assert.equal(promptProblem(t), null, t);
});
test('safety checker stays on unless the account is authorised; older and face models never switch it off', () => {
  for (const id of ['flux2dev', 'kolors', 'sdxl', 'seedreamFace', 'flux2MaxFace'] as const) assert.equal((inputOf(id, 'x', '2k', 5, true, 'data:image/jpeg;base64,AAAA') as any).enable_safety_checker, true, id);
  for (const m of MODELS) assert.equal((inputOf(m.id, 'x', '4k', 5, false, 'data:image/jpeg;base64,AAAA') as any).enable_safety_checker, true);
  assert.equal((inputOf('flux2pro', 'x', '4k', 5, true) as any).enable_safety_checker, false);
  const s: any = inputOf('seedream45', 'x', '4k', 5, false);
  assert.ok(s.image_size.width >= 1920 && s.image_size.width <= 4096 && s.image_size.height <= 4096);
  assert.ok((inputOf('seedream45', 'x', '2k', 5, false) as any).image_size.width * (inputOf('seedream45', 'x', '2k', 5, false) as any).image_size.height >= 2560 * 1440);
  assert.equal((inputOf('flux2max', 'x', '2k', 9, false) as any).safety_tolerance, '5');
  assert.equal(modelOf('nope'), undefined);
});
test('only the older models get a negative prompt', () => {
  assert.ok((inputOf('kolors', 'x', '2k', 5, false) as any).negative_prompt);
  assert.equal((inputOf('flux2pro', 'x', '2k', 5, false) as any).negative_prompt, undefined);
});

test('every wallpaper combination of the main choices passes the filter and fits the length limit', () => {
  for (const story of STORIES) for (const frame of FRAMES) for (const view of VIEWS) for (const hands of HANDS) for (const level of LEVELS) for (const style of STYLES) {
    const t = composeScene({ ...base, story: story.id, frame: frame.id, view: view.id, hands: hands.id, level: level.id, style: style.id });
    assert.equal(promptProblem(t), null, `${story.id}/${frame.id}/${view.id}/${hands.id}/${level.id}/${style.id}`);
    assert.ok(t.length < 2400, `too long ${t.length}`);
  }
  for (const h of HAIR) for (const e of EXPRESSIONS) for (const a of ANGLES) {
    const t = composeScene({ ...base, hair: h.id, expr: e.id, angle: a.id });
    assert.equal(promptProblem(t), null, `${h.id}/${e.id}/${a.id}`); assert.ok(t.includes(h.text));
  }
  assert.match(composeScene({ ...base, story: 'x', frame: 'x', view: 'x' }), /9:16/);
  assert.equal(randomPick({ level: '3' }, () => 0.5).level, '3');
});

test('prompts never mention a clock, and the stories fix neither a hair colour nor a posture', () => {
  for (const s of STORIES) {
    assert.ok(!/clock|timepiece/i.test(composeScene({ ...base, story: s.id })), s.id);
    assert.ok(!/\b(black|silver|white|long)[- ]?(white )?hair\b/i.test(s.text), s.id);
    assert.ok(!/\b(sitting|seated|lying|standing|kneeling|leaning|drifting weightlessly)\b/i.test(s.text), `posture in story text: ${s.id}`);
    assert.ok(STORY_POSE[s.id], `no natural pose for ${s.id}`);
  }
});

test('framing: close frames crop legs and feet out; the full-length frame hides the feet under the hem', () => {
  const f = Object.fromEntries(FRAMES.map((x) => [x.id, x.text]));
  assert.match(f.half, /no legs/); assert.match(f.knee, /no feet/); assert.match(f.close, /chest/);
  assert.match(f.full, /head to toe/); assert.match(f.full, /covers her feet/);
  assert.ok(!/\b(no|not|never|without)\b[^.,]*(extra|deformed|bad|wrong)/i.test(ANATOMY), 'anatomy is worded positively');
});

test('poses: every distance and facing direction has at least one fitting pose, and the pose follows the choice', () => {
  for (const fr of FRAMES) for (const v of VIEWS) assert.ok(validPoses(fr.id, v.id).length > 0, `${fr.id}/${v.id}`);
  for (const x of POSES) { assert.equal(promptProblem(x.text), null, x.id); assert.ok(x.frames.length && x.views.length, x.id); }
  assert.equal(poseText({ ...base, pose: 'chin' }), POSES.find((x) => x.id === 'chin')!.text);
  assert.equal(poseText({ ...base, story: 'ruouhoa', pose: 'auto' }), STORY_POSE.ruouhoa);
  assert.equal(poseText({ ...base, frame: 'close', pose: 'walk' }), STORY_POSE.nguyetmon, 'a pose that does not fit the frame falls back to the natural one');
  assert.match(composeScene({ ...base, frame: 'full', pose: 'twirl' }), /slow twirl/);
});

test('faceless views: no expression, hands hidden from behind, and the pose list offers faceless poses only', () => {
  assert.ok(isFaceless('back') && isFaceless('hidden') && !isFaceless('front') && !isFaceless('profile'));
  const back = composeScene({ ...base, view: 'back', frame: 'knee', pose: 'back-stand', hands: 'flower' });
  assert.match(back, /her back to the camera, her face is not visible/); assert.ok(!/Expression:/.test(back)); assert.match(back, /hidden inside her wide flowing sleeves/); assert.match(composeScene({ ...base, frame: 'full', hands: 'lap' }), /hidden inside her wide flowing sleeves/); assert.match(composeScene({ ...base, frame: 'half', hands: 'lap' }), /out of frame below the edge/);
  assert.ok(validPoses('half', 'hidden').every((x) => x.views.includes('hidden')));
  assert.match(composeScene({ ...base, view: 'hidden', pose: 'fan-hide' }), /hidden behind a round silk fan/);
  assert.match(composeScene({ ...base, view: 'profile', pose: 'profile' }), /side profile/);
});

test('water scenes ask for one clean mirror reflection; others do not', () => {
  for (const id of ['lienhoa', 'cocam', 'suoinong', 'duthu']) assert.ok(composeScene({ ...base, story: id }).includes(REFLECTION), id);
  assert.ok(!composeScene({ ...base, story: 'hoason' }).includes(REFLECTION));
  assert.match(REFLECTION, /single clear, accurate reflection/);
});

test('the my-face models: photo only as a small data URL, look forced to level 1, checker always on', () => {
  assert.ok(isPhotoDataUrl('data:image/jpeg;base64,/9j/4AAQ'));
  for (const bad of ['http://x/y.jpg', 'data:text/html;base64,AAAA', 'data:image/svg+xml;base64,AAAA', '', 5]) assert.equal(isPhotoDataUrl(bad), false, String(bad));
  const f = faceScene({ ...base, level: '3' });
  assert.match(f, /off-shoulder neckline and sheer gauze sleeves/); assert.ok(!/bare midriff/.test(f));
  assert.match(buildFacePrompt(f), /non-suggestive/); assert.match(FACE_PREFIX, /slimmer/);
  assert.match(buildFacePrompt(f, true), /Her face is not shown/); assert.ok(buildFacePrompt(f, true).startsWith(FACELESS_PREFIX)); assert.ok(!/slimmer/.test(FACELESS_PREFIX));
  const i: any = inputOf('seedreamFace', 'x', '4k', 5, true, 'data:image/jpeg;base64,AAAA');
  assert.deepEqual(i.image_urls, ['data:image/jpeg;base64,AAAA']);
  const x: any = inputOf('flux2MaxFace', 'x', '4k', 5, true, 'data:image/jpeg;base64,AAAA');
  assert.equal(x.safety_tolerance, '2'); assert.equal(MODELS.filter((m) => m.face).length, 2);
});

test('fix hands: only fal CDN addresses, a fixed prompt, checker on, same character kept', () => {
  assert.ok(isFalUrl('https://v3b.fal.media/files/b/x.jpg'));
  for (const bad of ['http://v3.fal.media/x.jpg', 'https://evil.com/fal.media/x.jpg', 'https://fal.media.evil.com/x.jpg', 'data:image/jpeg;base64,AAAA', '', 5]) assert.equal(isFalUrl(bad), false, String(bad));
  assert.ok(isFixKind('seedream') && isFixKind('flux') && !isFixKind('x'));
  for (const k of ['seedream', 'flux'] as const) { const i: any = fixInput(k, 'https://v3.fal.media/a.jpg', '4k'); assert.equal(i.prompt, FIX_PROMPT); assert.equal(i.enable_safety_checker, true); assert.deepEqual(i.image_urls, ['https://v3.fal.media/a.jpg']); }
  assert.match(FIX_PROMPT, /exactly the same/); assert.match(FIX_PROMPT, /five natural fingers/);
});
