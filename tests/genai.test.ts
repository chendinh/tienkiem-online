import test from 'node:test';
import assert from 'node:assert/strict';
import { ANGLES, DEFAULT_PICK, EXPRESSIONS, FRAMES, HAIR, HANDS, HIDDEN_STORIES, LEGAL, LEGAL_VERSION, SCENE_MAX, STORIES, STYLES, VIEWS, buildGenPrompt, cleanPick, composeScene, consentOk, dayKey, isFaceless, poseText, sceneOf, sceneProblem, validPoses } from '../lib/genai';

test('the five stories are off, and so is the hot spring; the rest stay', () => {
  for (const id of ['daohoa', 'bangtuyet', 'tinhha', 'longcung', 'thuphong']) assert.ok(!STORIES.some((s) => s.id === id), id);
  assert.ok(!STORIES.some((s) => s.id === 'suoinong'));
  assert.equal(STORIES.length, 15 - HIDDEN_STORIES.length + 1); // +1: timmong, the lavender close-up
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
  for (const story of STORIES) for (const frame of FRAMES) for (const view of VIEWS) for (const angle of ANGLES) for (const hands of HANDS) for (const ex of EXPRESSIONS) {
    const p = cleanPick({ ...DEFAULT_PICK, story: story.id, frame: frame.id, view: view.id, angle: angle.id, hands: hands.id, expr: ex.id });
    const s = composeScene(p);
    assert.ok(s.length < SCENE_MAX, `${story.id}/${frame.id}/${view.id}/${angle.id}/${hands.id}/${ex.id}: ${s.length}`);
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

// ---- male tab -------------------------------------------------------------------------------------------------------------------
import * as M from '../lib/genaiMale';
import { TABS, isGender } from '../lib/genai';

test('male: three types, each with stories; a story always fits the type', () => {
  assert.deepEqual(M.TYPES.map((t) => t.id), ['strong', 'cool', 'calm']);
  for (const t of M.TYPES) assert.ok(M.storiesOf(t.id).length >= 3, t.id);
  assert.equal(M.cleanPick({ type: 'calm', story: 'kiemlanh' }).story, M.storiesOf('calm')[0].id);
  assert.equal(M.cleanPick({ type: 'strong', story: 'hoaviem' }).story, 'hoaviem');
  assert.equal(M.cleanPick({ type: 'nope' }).type, M.DEFAULT_PICK.type);
  assert.equal(M.cleanPick({ view: 'front' }, true).view, 'back');
  for (const s of M.STORIES) assert.ok(s.mood.length > 5 && M.TYPES.some((t) => t.id === s.type), s.id);
});

test('male: every combination is under the cap, in proportion, clothed, and passes the word filter', () => {
  let n = 0;
  for (const type of M.TYPES) for (const story of M.storiesOf(type.id)) for (const frame of M.FRAMES) for (const view of M.VIEWS) for (const angle of M.ANGLES) for (const hands of M.HANDS) for (const ex of M.EXPRESSIONS) {
    const s = M.composeScene(M.cleanPick({ type: type.id, story: story.id, frame: frame.id, view: view.id, angle: angle.id, hands: hands.id, expr: ex.id }));
    assert.ok(s.length < SCENE_MAX, `${story.id}/${frame.id}/${view.id}/${angle.id}/${hands.id}: ${s.length}`);
    assert.match(s, /one seventh to one eighth/);
    assert.equal(sceneProblem(s), null, `${story.id}: ${s.slice(0, 60)}`);
    assert.ok(!/\b(she|her|woman|girl|feminine)\b/i.test(s), `${story.id} mentions a woman`);
    n++;
  }
  assert.ok(n > 1000);
});

test('male: no round-frame camera, a doorway peek exists, hands have natural and hidden, expressions name the face', () => {
  assert.ok(M.ANGLES.some((a) => a.id === 'peek') && !M.ANGLES.some((a) => a.id === 'moon'));
  assert.ok(M.HANDS.some((h) => h.id === 'natural') && M.HANDS.some((h) => h.id === 'hidden'));
  for (const e of M.EXPRESSIONS) assert.match(e.text, /eyes|brow|lips|smile|smirk/, e.id);
  assert.ok(M.HAIR.length >= 8);
});

test('male: faceless views have no expression, close-up puts the hands out of frame, poses exist for every frame and view', () => {
  for (const v of ['back', 'hidden']) assert.ok(!/Expression:/.test(M.composeScene(M.cleanPick({ view: v }))));
  assert.match(M.composeScene(M.cleanPick({ frame: 'close' })), /hands are outside the frame/);
  for (const f of M.FRAMES) for (const v of M.VIEWS) assert.ok(M.validPoses(f.id, v.id).length > 0, `${f.id}/${v.id}`);
});

test('male prompt: man in the photo rule first, clothed rule last; gender picks the scene and the fixed lines', () => {
  const sc = sceneOf({}, undefined, false, 'm').scene;
  assert.match(sc, /Character:/);
  assert.match(buildGenPrompt(sc, false, 'm'), /^Use the adult man in the reference photo as the face/);
  assert.match(buildGenPrompt(sc, false, 'm'), /fully clothed, modest and non-suggestive\.$/);
  assert.match(buildGenPrompt(sc, true, 'm'), /^Use the adult man in the reference photo only for hair/);
  assert.match(buildGenPrompt('x'.repeat(30), false), /^Use the adult person in the reference photo/);
  assert.ok(isGender('m') && isGender('f') && !isGender('x') && !isGender(undefined));
  assert.equal(TABS.m.clean({ story: 'kiemlanh' }, false).type, 'cool');
  assert.ok(TABS.f.types.length === 0 && TABS.m.types.length === 3);
});

import { isUnlimited } from '../lib/genai';
test('the owner address has no limit (any case, spaces), others do; extra addresses come from the environment', () => {
  assert.equal(isUnlimited('chendinhit@gmail.com'), true);
  assert.equal(isUnlimited('  ChenDinhIT@Gmail.com '), true);
  assert.equal(isUnlimited('chendinhit@gmail.com.evil.com'), false);
  assert.equal(isUnlimited('someone@gmail.com'), false);
  assert.equal(isUnlimited(''), false);
  assert.equal(isUnlimited(undefined), false);
  assert.equal(isUnlimited('friend@x.com', 'a@b.com, Friend@X.com'), true);
  assert.equal(isUnlimited('friend@x.com', ''), false);
});

import { turnsLeft } from '../lib/genai';
test('turns left = free turns of the day still unused + the bonus granted by the owner, never negative', () => {
  assert.equal(turnsLeft(3, 0, 0), 3);
  assert.equal(turnsLeft(3, 2, 0), 1);
  assert.equal(turnsLeft(3, 3, 0), 0);
  assert.equal(turnsLeft(3, 5, 0), 0);
  assert.equal(turnsLeft(3, 3, 4), 4);
  assert.equal(turnsLeft(3, 1, 4), 6);
  assert.equal(turnsLeft(3, 0, -2), 3);
});

import { QUIET_CODES, shapeError } from '../lib/genai';
test('error log entries are shaped and cut short; expected states are not logged', () => {
  const e = shapeError({ acc: 'a', email: 'x@y.z', gender: 'weird', stage: 'fal', code: 'E_GENAI_FAIL', http: '502', fal: 422, detail: 'x'.repeat(5000), scene: 'y'.repeat(5000), ms: 1234.6 });
  assert.equal(e.gender, 'f'); assert.equal(e.http, 502); assert.equal(e.detail.length, 700); assert.equal(e.scene.length, 500); assert.equal(e.ms, 1235);
  const d = shapeError({});
  assert.equal(d.code, 'E_SERVER'); assert.equal(d.stage, 'server'); assert.equal(d.http, 0); assert.equal(d.detail, '');
  assert.equal(shapeError({ detail: 'a \n\n  b' }).detail, 'a b');
  assert.equal(shapeError({ gender: 'm' }).gender, 'm');
  for (const c of ['E_GENAI_LIMIT', 'E_GENAI_BUSY', 'E_AUTH']) assert.ok(QUIET_CODES.includes(c));
  assert.ok(!QUIET_CODES.includes('E_GENAI_FAIL') && !QUIET_CODES.includes('E_SERVER') && !QUIET_CODES.includes('E_BAD_REQUEST'));
});

test('male calligraphy story: the writing is on the paper, never on the hand', () => {
  const sc = M.composeScene(M.cleanPick({ type: 'calm', story: 'thuphapnam', frame: 'full' }));
  assert.match(sc, /sheet of white paper/); assert.match(sc, /only on the paper/); assert.ok(sc.length < SCENE_MAX);
});

import { DEFAULT_FIXES, FIXES, FIXES_MAX, FIX_GROUPS, cleanFixes, facelessOf, fixesText } from '../lib/genai';
test('error guards: positive sentences only, neutral wording, known ids, order kept, defaults when none sent', () => {
  assert.ok(FIXES.length >= 15);
  const ids = FIXES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FIXES) {
    assert.ok(FIX_GROUPS.includes(f.group), f.id);
    assert.ok(f.label.length > 3 && f.hint.length > 3, f.id);
    assert.ok(!/\b(no|not|without|never|avoid|don't|isn't|nothing)\b/i.test(f.text), `${f.id} is negative: ${f.text}`);
    assert.ok(!/\b(she|her|he|his|woman|man|girl|boy)\b/i.test(f.text), `${f.id} is not neutral`);
    assert.equal(sceneProblem(f.text + ' padding for the minimum length'), null, f.id);
  }
  assert.deepEqual(cleanFixes(undefined), DEFAULT_FIXES);
  assert.deepEqual(cleanFixes('x'), DEFAULT_FIXES);
  assert.deepEqual(cleanFixes([]), []);
  assert.deepEqual(cleanFixes(['sharp', 'nope', 'sharp', 5, 'fingers']), ['fingers', 'sharp']);
  assert.ok(fixesText(ids).length < FIXES_MAX, 'all guards on fit under the cap');
  assert.equal(fixesText([]), '');
});
test('error guards go after the scene and before the clothed rule; face guards drop out when no face is shown', () => {
  const sc = composeScene(DEFAULT_PICK);
  const p = buildGenPrompt(sc, false, 'f', ['fingers', 'faceSym', 'sharp']);
  assert.ok(p.indexOf(sc) < p.indexOf('Quality notes:') && p.indexOf('Quality notes:') < p.indexOf('fully clothed'));
  assert.match(p, /symmetrical, harmonious face/);
  const back = buildGenPrompt(sc, false, 'f', ['fingers', 'faceSym', 'eyes', 'hair', 'sharp'], true);
  assert.ok(!/symmetrical, harmonious face|bright clear eyes|well-defined locks/.test(back));
  assert.match(back, /slender, clearly separated fingers/);
  assert.match(buildGenPrompt(sc, false, 'f'), /Quality notes:/);   // no list sent: the defaults
  assert.ok(!/Quality notes:/.test(buildGenPrompt(sc, false, 'f', [])));
  assert.equal(facelessOf('f', { view: 'back' }, false), true);
  assert.equal(facelessOf('m', { view: 'hidden' }, false), true);
  assert.equal(facelessOf('f', { view: 'front' }, false), false);
  assert.equal(facelessOf('m', { view: 'front' }, true), true);
});

test('the person blends into the scene: a guard that is on by default, and a line in the male prefix', () => {
  assert.ok(DEFAULT_FIXES.includes('blend'));
  assert.match(fixesText(['blend']), /lit by the scene's own light/);
  assert.match(buildGenPrompt(sceneOf({}, undefined, false, 'm').scene, false, 'm'), /lit by the light of the scene, so he belongs naturally/);
});

test('male: floating elements are semi-transparent and snow is a mist, in the prefix and in the stories', () => {
  for (const noFace of [false, true]) assert.match(buildGenPrompt('x'.repeat(30), noFace, 'm'), /semi-transparent and dreamy[\s\S]*Snow appears as layered snow mist and icy haze/);
  const snow = M.composeScene(M.cleanPick({ type: 'cool', story: 'tuyetdinh' }));
  assert.match(snow, /snow mist/); assert.ok(!/snowflake/i.test(snow));
  for (const s of M.STORIES) assert.ok(!/snowflake|\bfalling (snow|leaves|petals)\b/i.test(s.text + ' ' + s.setting), s.id);
});

test('the scene light follows the chosen expression, for her and for him, and stays under the cap', () => {
  const a = composeScene(cleanPick({ ...DEFAULT_PICK, expr: 'smile' })), b = composeScene(cleanPick({ ...DEFAULT_PICK, expr: 'sad' }));
  assert.match(a, /Scene mood: bright and joyful/); assert.match(b, /Scene mood: wistful/);
  assert.doesNotMatch(composeScene(cleanPick({ ...DEFAULT_PICK, view: 'back', expr: 'sad' })), /Scene mood/);
  for (const e of EXPRESSIONS) assert.ok(e.tone && e.tone.length > 20, e.id);
  for (const e of M.EXPRESSIONS) assert.ok(e.tone && e.tone.length > 20, e.id);
  assert.match(M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, expr: 'fierce' })), /Scene mood: dramatic/);
});

test('the photo expression is not kept: the prompt asks for the named expression, and sad has no smile', () => {
  for (const g of ['f', 'm'] as const) assert.match(buildGenPrompt('x'.repeat(30), false, g), /whatever expression the photo has/);
  assert.doesNotMatch(EXPRESSIONS.find((e) => e.id === 'sad')!.text, /smile/);
  assert.doesNotMatch(M.EXPRESSIONS.find((e) => e.id === 'sad')!.text, /smile/);
});

test('the doorway camera fits each story: its own door or gate, and the generic text only as a fallback', () => {
  const a = composeScene(cleanPick({ ...DEFAULT_PICK, story: 'hoason', angle: 'peek' }));
  assert.match(a, /black stone temple archway/); assert.doesNotMatch(a, /carved wooden doorway/);
  const b = M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, story: 'tuyetdinh', angle: 'peek' }));
  assert.match(b, /half-buried in snow/);
  for (const st of STORIES) assert.match(composeScene(cleanPick({ ...DEFAULT_PICK, story: st.id, angle: 'peek' })), /looking in through/, st.id);
  for (const st of M.STORIES) assert.match(M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, type: st.type, story: st.id, angle: 'peek' })), /looking in through/, st.id);
});

test('every story names its depth layers and every prompt asks for separated layers', () => {
  for (const st of STORIES) assert.match(composeScene(cleanPick({ ...DEFAULT_PICK, story: st.id })), /Depth layers: front, .*; middle, .*; back, /, st.id);
  for (const st of M.STORIES) assert.match(M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, type: st.type, story: st.id })), /Depth layers: front, /, st.id);
  for (const g of ['f', 'm'] as const) for (const nf of [false, true]) assert.match(buildGenPrompt('x'.repeat(30), nf, g), /separated depth layers/);
});

test('one person only: every prompt says so, and no story or expression text invites a second person', () => {
  for (const g of ['f', 'm'] as const) for (const nf of [false, true]) assert.match(buildGenPrompt('x'.repeat(30), nf, g), /only person in the whole picture[\s\S]*does not appear in the image/);
  const all = [...STORIES.map((x) => x.id + ' ' + composeScene(cleanPick({ ...DEFAULT_PICK, story: x.id }))), ...M.STORIES.map((x) => x.id + ' ' + M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, type: x.type, story: x.id })))];
  for (const t of all) assert.doesNotMatch(t, /someone|empty seat|two cups|beloved|each other|companion|crowd|disciple|lover|couple/i, t.slice(0, 40));
});

test('the lavender close-up story (her) and the crystal-eye story (him): present, layered, pick the close-up frame, one person', () => {
  const f = STORIES.find((x) => x.id === 'timmong')!, m = M.STORIES.find((x) => x.id === 'datmat')!;
  assert.ok(f && m); assert.equal(f.frame, 'close'); assert.equal(m.frame, 'close');
  const a = composeScene(cleanPick({ ...DEFAULT_PICK, story: 'timmong', frame: 'close' })), b = M.composeScene(M.cleanPick({ ...M.DEFAULT_PICK, type: 'cool', story: 'datmat', frame: 'close' }));
  assert.match(a, /lavender/); assert.match(a, /Depth layers/); assert.match(a, /chin lowered/);
  assert.match(b, /crystal beads/); assert.match(b, /Depth layers/); assert.match(b, /chin lowered/);
  assert.equal(sceneProblem(a), null); assert.equal(sceneProblem(b), null);
});
