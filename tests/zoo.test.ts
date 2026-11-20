import test from 'node:test';
import assert from 'node:assert/strict';
import { lookOf, LOOK_COLOR, variantName, AIR, GLOW, LIGHT, sparks, ETA_MIN, ZOO_BGS, specks, ZOO_MAX, emptyZoo, etaText, parseZoo, variantOf, zooBgOk } from '../lib/zoo';
import { MUTATIONS } from '../lib/anim';
import { DEFAULT_PERCHES } from '../lib/garden';

test('a Dị Biến beast always has the same look, and a species shows many looks', () => {
  assert.equal(variantOf('soi', 7), variantOf('soi', 7));
  const seen = new Set(Array.from({ length: 200 }, (_, i) => variantOf('soi', i + 1)));
  assert.ok(seen.size >= MUTATIONS.length - 1, 'nearly every look turns up in 200 beasts');
  for (const v of seen) assert.ok(MUTATIONS.some((m) => m.id === v));
  assert.notEqual(new Set(Array.from({ length: 20 }, (_, i) => variantOf('soi', i + 1))).size, 1);
});

test('the backgrounds of the page are the three tall pictures of the game, each with perches', () => {
  assert.deepEqual(ZOO_BGS.map((b) => b.id), ['thanhvan', 'tinhha', 'xichviem']);
  for (const b of ZOO_BGS) { assert.ok((DEFAULT_PERCHES[b.id] || []).length >= 4); assert.match(b.src, /_v\.jpg$/); assert.ok(zooBgOk(b.id)); }
  assert.ok(!zooBgOk('dawn') && !zooBgOk('../x') && !zooBgOk(5));
});

test('a saved zoo is made safe: only own beasts, nearest perch, once per background, at most ZOO_MAX', () => {
  const own = new Set([1, 2, 3]);
  const p = DEFAULT_PERCHES.thanhvan[0];
  const z = parseZoo({ bg: 'tinhha', lay: { thanhvan: [
    { uid: 'aaaa', beast: 1, x: p.x, y: p.y + 0.3, flip: true, k: 9 },     // pulled to its nearest perch, k to the limit
    { uid: 'aaaa', beast: 2, x: 0.5, y: 0.8 },                                // same uid: dropped
    { uid: 'bbbb', beast: 99, x: 0.5, y: 0.8 },                               // not the player's: dropped
    { uid: 'cccc', beast: 1, x: 0.5, y: 0.8 },                                // the same beast again: dropped
    { uid: 'dd', beast: 2, x: 0.5, y: 0.8 },                                  // bad uid: dropped
    { uid: 'eeee', beast: 3, x: 'a', y: 0.8 },                                // bad position: dropped
    { uid: 'ffff', beast: 2, x: 0.5, y: 0.8 },
  ], nowhere: [{ uid: 'gggg', beast: 1, x: 0.5, y: 0.5 }] } }, own);
  assert.equal(z.v, 2); assert.equal(z.bg, 'tinhha');
  assert.equal(z.lay.thanhvan.length, 2);
  assert.equal(z.lay.thanhvan[0].beast, 1); assert.equal(z.lay.thanhvan[0].flip, true); assert.equal(z.lay.thanhvan[0].k, 2);
  assert.ok(DEFAULT_PERCHES.thanhvan.some((q) => q.id === z.lay.thanhvan[0].perch));
  assert.ok(!('nowhere' in z.lay));
  assert.deepEqual(parseZoo(null, own), emptyZoo());
  assert.deepEqual(parseZoo({ bg: 'dawn', lay: 5 }, own), emptyZoo());
  const many = Array.from({ length: 30 }, (_, i) => ({ uid: `u${String(i).padStart(4, '0')}`, beast: i + 1, x: 0.5, y: 0.8 }));
  assert.equal(parseZoo({ lay: { xichviem: many } }, new Set(many.map((m) => m.beast))).lay.xichviem.length, ZOO_MAX);
});

test('the waiting time shown to the player shrinks as the steps are done', () => {
  assert.ok(ETA_MIN.base > ETA_MIN.variant && ETA_MIN.variant > ETA_MIN.clip && ETA_MIN.clip > ETA_MIN.cut);
  assert.equal(etaText('clip'), 'khoảng 4 phút');
  assert.equal(etaText(undefined), 'khoảng 6 phút');
});

test('every background has its drifting specks, placed the same way every time and inside the picture', () => {
  for (const b of ZOO_BGS) {
    const a = AIR[b.id], l = specks(b.id);
    assert.equal(l.length, a.n);
    assert.deepEqual(l, specks(b.id));
    for (const k of l) { assert.ok(k.x >= 3 && k.x <= 97); assert.ok(k.s >= a.size[0] && k.s <= a.size[1]); assert.ok(k.dur >= a.dur[0] && k.dur <= a.dur[1] && k.delay <= 0 && k.delay >= -k.dur); }
  }
  assert.notDeepEqual(specks('tinhha').map((k) => k.x), specks('xichviem').map((k) => k.x));
  assert.deepEqual(specks('nowhere'), []);
});

test('the fixed lights of each background blink at places inside the picture, the same every time', () => {
  for (const b of ZOO_BGS) {
    const g = GLOW[b.id], l = sparks(b.id);
    assert.equal(l.length, g.n);
    assert.deepEqual(l, sparks(b.id));
    for (const k of l) { assert.ok(k.x >= 4 && k.x <= 96 && k.y >= g.y[0] && k.y <= g.y[1]); assert.ok(k.delay <= 0 && k.delay >= -k.dur); }
    for (const p of g.pulses || []) assert.ok(p.x - p.w / 2 > -5 && p.x + p.w / 2 < 105 && p.y - p.h / 2 > -5 && p.y + p.h / 2 < 105);
  }
  assert.ok(sparks('thanhvan').some((k) => k.dx !== 0) && sparks('tinhha').every((k) => k.dx === 0 && k.dy === 0));
  assert.deepEqual(sparks('nowhere'), []);
});

test('each background has one light source inside its picture', () => {
  for (const b of ZOO_BGS) {
    const l = LIGHT[b.id];
    assert.ok(l && l.x > 0 && l.x < 100 && l.y > 0 && l.y < 100 && l.r > 20 && l.r <= 100 && l.a > 0 && l.a <= 1);
    assert.match(l.color, /^\d{1,3}, \d{1,3}, \d{1,3}$/);
  }
});

test('every Dị Biến beast has one of the ten looks, an ordinary beast has none', () => {
  assert.equal(lookOf({ sp: 'soi', id: 7, mut: false }), null);
  assert.equal(lookOf(null), null);
  const seen = new Set<string>();
  for (let i = 1; i <= 300; i++) { const l = lookOf({ sp: 'soi', id: i, mut: true })!; assert.equal(l, variantOf('soi', i)); seen.add(l); }
  assert.equal(seen.size, MUTATIONS.length);
  for (const m of MUTATIONS) { assert.ok(LOOK_COLOR[m.id]); assert.equal(variantName(m.id), m.name); }
});

test('poses: a perch decides the pose, and a new pose rewrites only the pose of the plain picture prompt', async () => {
  const Z = await import('../lib/zoo');
  const A = await import('../lib/anim');
  const G = await import('../lib/garden');
  assert.equal(Z.poseOf('da1'), 'watch');
  assert.equal(Z.poseOf('suoi2'), 'drink');
  assert.equal(Z.poseOf('bo'), 'rest');
  assert.equal(Z.poseOf('trai'), 'walk');
  assert.equal(Z.poseOf('gan'), 'stand');
  assert.equal(Z.poseOf('whatever'), 'stand');
  // every default perch gets a pose that exists
  for (const ps of Object.values(G.DEFAULT_PERCHES)) for (const p of ps) assert.ok(A.poseOk(Z.poseOf(p.id)), p.id);
  const m = A.MUTATIONS[0];
  assert.equal(A.posePrompt(m, false, 'stand'), A.plainPrompt(m, false));
  const d = A.posePrompt(m, false, 'drink');
  assert.notEqual(d, A.plainPrompt(m, false));
  assert.ok(d.includes(A.POSES.drink.en) && !d.includes('same creature design, body shape, pose,'));
  assert.ok(d.includes('flat, uniform'));   // the flat ground stays
  assert.equal(A.poseOk('fly'), false);
});
