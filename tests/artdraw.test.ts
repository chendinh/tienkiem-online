// The owner's "draw the missing pictures" button: the list of fixed pictures, how a missing one is told, and how a drawn one is found again by its file path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { artJobs, artKey, artKeyOfSpec, ART_GROUPS, DRAW_POINTS, takeBatch, pointsOf, commonLooks, missingLooks, wantedDrawable, fixedTodos } from '../lib/artjobs';
import { keyOfSpec } from '../lib/assetKey';
import * as C from '../lib/content';
import { missingArt, shippedArt } from '../lib/server/artfiles';
import * as A from '../lib/arts';

test('every fixed picture is a job with its own file path and its own key', () => {
  const jobs = artJobs();
  assert.ok(jobs.length > 300);
  assert.equal(new Set(jobs.map((j) => j.dest)).size, jobs.length, 'two pictures share a file');
  assert.equal(new Set(jobs.map((j) => j.name)).size, jobs.length, 'two pictures share a name');
  for (const j of jobs) assert.ok(j.dest.startsWith('/art/') && /\.jpg$/.test(j.dest), j.dest);
  const books = jobs.filter((j) => j.group === 'books');
  assert.equal(books.length, Object.values(A.TECHS).filter((t) => !t.basic).length + A.METHODS.length, 'a book is missing from the list');
  assert.deepEqual([...new Set(jobs.map((j) => j.group))].sort(), [...ART_GROUPS].sort());
  assert.deepEqual(artJobs('books').map((j) => j.dest), books.map((j) => j.dest));
});

test('a saved picture is found again by its file path: the request of a job maps to the key of its file, other requests map to nothing', () => {
  const jobs = artJobs();
  for (const j of jobs) assert.equal(artKeyOfSpec(j.spec), artKey(j.dest), j.dest);
  assert.equal(new Set(jobs.map((j) => artKeyOfSpec(j.spec))).size, jobs.length);
  assert.equal(artKey('/art/books/x.jpg'), 'art|books/x.jpg');
  assert.equal(artKeyOfSpec({ kind: 'book', id: 'không có thật' }), null);
  assert.equal(artKeyOfSpec({ kind: 'item', slot: 'Weapon', base: 'Trọng Kiếm', tier: 1, e: '', v: 0 }), null);
  assert.equal(artKeyOfSpec(null), null);
  assert.equal(artKeyOfSpec('book'), null);
});

test('missing = not shipped and not drawn by the server', () => {
  const jobs = artJobs('books').slice(0, 5);
  const have = new Set([jobs[0].dest.slice(5)]), drawn = new Set([artKey(jobs[1].dest)]);
  const s = missingArt(jobs, have, drawn);
  assert.deepEqual(s.missing.map((j) => j.dest), jobs.slice(2).map((j) => j.dest));
  assert.equal(s.shipped, 1); assert.equal(s.drawn, 1); assert.equal(s.total, 5); assert.equal(s.listOk, true);
  // a file that is shipped wins over a drawn one (nothing to draw, nothing to count twice)
  const both = missingArt(jobs, new Set([jobs[0].dest.slice(5)]), new Set([artKey(jobs[0].dest)]));
  assert.equal(both.shipped, 1); assert.equal(both.drawn, 0);
  // no list of shipped files at all: the button must refuse, not draw the whole game
  assert.equal(missingArt(jobs, new Set(), new Set()).listOk, false);
});

test('the shipped files come from the build list when there is one, from the folder otherwise', () => {
  const was = process.env.ART_FILES;
  try {
    delete process.env.ART_FILES;
    const disk = shippedArt();
    assert.ok(disk.has('intro_f.jpg') && disk.has('books/ban_thach_quyen.jpg'));
    process.env.ART_FILES = JSON.stringify(['books/a.jpg', 'b.jpg']);
    assert.deepEqual([...shippedArt()].sort(), ['b.jpg', 'books/a.jpg']);
    process.env.ART_FILES = 'not json';
    assert.equal(shippedArt().size, disk.size, 'a broken list falls back to the folder');
    // the real state: what the report calls missing is exactly the jobs whose file is not on disk
    delete process.env.ART_FILES;
    const jobs = artJobs(), miss = missingArt(jobs, shippedArt(), new Set()).missing.map((j) => j.dest).sort();
    assert.deepEqual(miss, jobs.filter((j) => !fs.existsSync(path.join(process.cwd(), 'public', j.dest))).map((j) => j.dest).sort());
  } finally { if (was === undefined) delete process.env.ART_FILES; else process.env.ART_FILES = was; }
});

test('every common look of every item base is a look to draw, each with its own key (new weapons included)', () => {
  const looks = commonLooks();
  let n = 0;
  for (const slot of C.SLOTS) n += C.basesOf(slot).length * (2 + C.EO.length);
  assert.equal(looks.length, n);
  const keys = looks.map((t) => keyOfSpec(t.spec));
  assert.ok(keys.every((k) => typeof k === 'string'));
  assert.equal(new Set(keys).size, n, 'two looks share a key');
  for (const b of ['Trọng Kiếm', 'Họa Kích', 'Bát Quái Kính']) assert.ok(looks.some((t) => t.spec.base === b && t.spec.tier === 2 && t.spec.e === C.EO[0]), b);
});

test('item icons are missing when no picture is indexed under their look; the wanted ones follow, Địa and Thiên only when allowed', () => {
  const looks = commonLooks();
  const have = new Set(looks.filter((t) => t.spec.base !== 'Trọng Kiếm').map((t) => keyOfSpec(t.spec)!));
  const miss = missingLooks(looks, [], have);
  assert.deepEqual(miss.map((t) => t.label), looks.filter((t) => t.spec.base === 'Trọng Kiếm').map((t) => t.label));
  assert.equal(miss.length, 2 + C.EO.length);
  // wanted: an unknown look is added once, a look that already has a picture or is asked twice is not, a Thiên look waits for the owner's permission
  const w1 = { kind: 'item', slot: 'Weapon', base: 'Trọng Kiếm', tier: 2, e: C.EO[0] };   // already a common look: counted once
  const w2 = { kind: 'item', slot: 'Weapon', base: 'Trọng Kiếm', tier: 3, e: C.EO[1], v: 2 };
  const w3 = { kind: 'item', slot: 'Weapon', base: 'Trọng Kiếm', tier: 4, e: C.EO[1], v: 1 };
  const was = [process.env.DRAW_DIA_ART, process.env.DRAW_THIEN_ART];
  try {
    delete process.env.DRAW_DIA_ART; delete process.env.DRAW_THIEN_ART;
    assert.equal(missingLooks(looks, [w1, w1, w2, w3], have).length, miss.length);
    assert.ok(!wantedDrawable(w2) && !wantedDrawable(w3) && wantedDrawable(w1));
    process.env.DRAW_DIA_ART = '1';
    assert.equal(missingLooks(looks, [w1, w2, w2, w3], have).length, miss.length + 1);
    process.env.DRAW_THIEN_ART = '1';
    assert.equal(missingLooks(looks, [w1, w2, w3, { kind: 'monster' }, null], have).length, miss.length + 2);
  } finally {
    if (was[0] === undefined) delete process.env.DRAW_DIA_ART; else process.env.DRAW_DIA_ART = was[0];
    if (was[1] === undefined) delete process.env.DRAW_THIEN_ART; else process.env.DRAW_THIEN_ART = was[1];
  }
  assert.equal(missingLooks(looks, [], new Set(looks.map((t) => keyOfSpec(t.spec)!))).length, 0);
});

test('one press draws a bounded number of pictures: item icons are small and count 1, scenes and covers count 2', () => {
  const looks = commonLooks(), art = fixedTodos(artJobs('books'));
  assert.equal(pointsOf(looks[0]), 1); assert.equal(pointsOf(art[0]), 2);
  assert.equal(takeBatch(looks).length, DRAW_POINTS);
  assert.equal(takeBatch(art).length, DRAW_POINTS / 2);
  const mixed = takeBatch([...looks.slice(0, 3), ...art]);
  assert.equal(mixed.reduce((a, t) => a + pointsOf(t), 0) <= DRAW_POINTS, true);
  assert.deepEqual(mixed.slice(0, 3).map((t) => t.group), ['looks', 'looks', 'looks']);
  assert.equal(takeBatch([]).length, 0);
  assert.equal(takeBatch(art, 1).length, 1, 'a press always draws at least one picture');
  assert.ok(DRAW_POINTS >= 2 && DRAW_POINTS <= 40);
});
