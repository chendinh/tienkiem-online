import test from 'node:test';
import assert from 'node:assert/strict';
import { ANGLES, DEFAULT_PICK, EXPRESSIONS, FRAMES, HAIR, HANDS, HIDDEN_STORIES, LEGAL, LEGAL_VERSION, SCENE_MAX, STORIES, STYLES, VIEWS, buildGenPrompt, cleanPick, composeScene, consentOk, dayKey, isFaceless, poseText, sceneOf, sceneProblem, validPoses } from '../lib/genai';

test('the five stories are off, and so is the hot spring; the rest stay', () => {
  for (const id of ['daohoa', 'bangtuyet', 'tinhha', 'longcung', 'thuphong']) assert.ok(!STORIES.some((s) => s.id === id), id);
  assert.ok(!STORIES.some((s) => s.id === 'suoinong'));
  assert.equal(STORIES.length, 15 - HIDDEN_STORIES.length);
  for (const s of STORIES) assert.ok(s.mood.length > 5, s.id);
});

test('no round moon-gate camera; a peek through a doorway camera exists', () => {
  assert.ok(!ANGLES.some((a) => a.id === 'moon'));
  const peek = ANGLES.find((a) => a.id === 'peek');
  assert.ok(peek && /doorway/.test(peek.text) && /frame/.test(peek.text));
  assert.ok(!/\b(circular|round)\b/.test(peek!.text));
});

test('hands have a natural option, expressions name eyes, brows or mouth', () => {
  assert.ok(HANDS.some((h) => h.id === 'natural') && HANDS.some((h) => h.id === 'hidden'));
  assert.equal(DEFAULT_PICK.hands, 'natural');
  for (const e of EXPRESSIONS) assert.match(e.text, /eyes|brow|lips|smile|smirk/, e.id);
  assert.ok(EXPRESSIONS.length >= 6);
});

test('every combination is under the length cap, in proportion and clothed', () => {
  let n = 0;
  for (const story of STORIES) for (const frame of FRAMES) for (const view of VIEWS) for (const angle of ANGLES) for (const hands of HANDS) {
    const p = cleanPick({ ...DEFAULT_PICK, story: story.id, frame: frame.id, view: view.id, angle: angle.id, hands: hands.id });
    const s = composeScene(p);
    assert.ok(s.length < SCENE_MAX, `${story.id}/${frame.id}/${view.id}/${angle.id}/${hands.id}: ${s.length}`);
    assert.match(s, /one seventh to one eighth/);
    assert.match(s, /layered silk gown/);
    assert.equal(sceneProblem(s), null, `${story.id} ${s.slice(0, 80)}`);
    assert.ok(!/clock/i.test(s));
    n++;
  }
  assert.ok(n > 1000);
});

test('faceless views carry no expression; a close-up puts the natural hands out of frame', () => {
  for (const v of VIEWS.filter((x) => isFaceless(x.id))) assert.ok(!/Expression:/.test(composeScene(cleanPick({ ...DEFAULT_PICK, view: v.id }))));
  assert.match(composeScene(cleanPick({ ...DEFAULT_PICK, frame: 'close' })), /hands are outside the frame/);
  assert.match(composeScene(cleanPick({ ...DEFAULT_PICK, view: 'back', hands: 'flower' })), /no hands visible/);
});

test('cleanPick rejects unknown values, a pose that does not fit, and narrows the view for a photo without a face', () => {
  const p = cleanPick({ story: 'daohoa', frame: 'nope', angle: 'moon', hands: 'x', pose: 'kneel', expr: 5 });
  assert.equal(p.story, DEFAULT_PICK.story);
  assert.equal(p.frame, DEFAULT_PICK.frame);
  assert.equal(p.angle, DEFAULT_PICK.angle);
  assert.equal(p.hands, DEFAULT_PICK.hands);
  assert.equal(p.pose, 'auto');   // kneel needs the full frame
  assert.equal(cleanPick({ view: 'front' }, true).view, 'back');
  assert.equal(cleanPick({ view: 'profile' }, true).view, 'profile');
  assert.equal(cleanPick('junk').style, DEFAULT_PICK.style);
  const ok = validPoses('full', 'front')[0];
  assert.equal(cleanPick({ frame: 'full', pose: ok.id }).pose, ok.id);
  assert.ok(poseText(cleanPick({})).length > 10);
});

test('the prompt always starts with the photo rule and ends with the clothed rule', () => {
  const s = composeScene(DEFAULT_PICK);
  const full = buildGenPrompt(s, false);
  assert.match(full, /^Use the adult person in the reference photo as the face/);
  assert.match(full, /Take only the identity from the photo/);
  assert.match(full, /fully clothed, modest and non-suggestive\.$/);
  assert.match(buildGenPrompt(s, true), /^Use the adult person in the reference photo only for hair/);
  // a rewritten description still gets the fixed lines
  assert.match(buildGenPrompt('a fairy by a lake, calm and gentle', false), /fairy by a lake.*fully clothed/);
});

test('sceneOf trusts the choices unless the player rewrote the text, and cleans what it takes', () => {
  assert.equal(sceneOf({ story: 'cocam' }, undefined, false).custom, false);
  assert.equal(sceneOf({ story: 'cocam' }, '   ', false).custom, false);
  assert.match(sceneOf({ story: 'cocam' }, undefined, false).scene, /guqin/);
  const c = sceneOf({}, '  a  fairy\n\nby   a lake  ', false);
  assert.equal(c.custom, true); assert.equal(c.scene, 'a fairy by a lake');
  assert.equal(sceneOf({}, 'x'.repeat(5000), false).scene.length, SCENE_MAX);
});

test('the server filter stops nudity, minors and real people in a rewritten description', () => {
  assert.equal(sceneProblem('short'), 'short');
  assert.equal(sceneProblem('a graceful immortal beside a quiet lake at dawn'), null);
  assert.equal(sceneProblem('a naked fairy beside a quiet lake at dawn'), 'explicit');
  assert.equal(sceneProblem('a young girl beside a quiet lake at dawn'), 'minor');
  assert.equal(sceneProblem('a celebrity beside a quiet lake at dawn'), 'real');
  assert.equal(sceneProblem('cô gái khỏa thân bên hồ nước lúc bình minh'), 'explicit');
});

test('consent needs both boxes and the current terms', () => {
  assert.equal(consentOk({ personal: true, adult: true, terms: LEGAL_VERSION }), true);
  assert.equal(consentOk({ personal: true, adult: false, terms: LEGAL_VERSION }), false);
  assert.equal(consentOk({ personal: true, adult: true, terms: 'old' }), false);
  assert.equal(consentOk({ personal: 'yes', adult: true, terms: LEGAL_VERSION }), false);
  assert.equal(consentOk(null), false);
});

test('the legal text covers age, own photo, not 18+, photo data and logging', () => {
  const all = LEGAL.map((x) => x.h + ' ' + x.p).join(' ');
  for (const w of ['18 tuổi', 'chính bạn', 'không phải nội dung 18+', 'cho phép', 'không lưu ảnh', 'không thay thế sự cho phép', 'Nhật ký']) assert.ok(all.toLowerCase().includes(w.toLowerCase()), w);
  assert.ok(STYLES.length === 3 && HAIR.length >= 10);
});

test('the day of the turns is the Vietnamese day', () => {
  assert.equal(dayKey(Date.UTC(2026, 10, 23, 16, 59)), '2026-11-23');
  assert.equal(dayKey(Date.UTC(2026, 10, 23, 17, 0)), '2026-11-24');
});
