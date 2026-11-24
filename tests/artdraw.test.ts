// The owner's "draw the missing pictures" button: the list of fixed pictures, how a missing one is told, and how a drawn one is found again by its file path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { artJobs, artKey, artKeyOfSpec, ART_BATCH, ART_GROUPS } from '../lib/artjobs';
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

test('one press draws a bounded number of pictures', () => { assert.ok(ART_BATCH >= 1 && ART_BATCH <= 20); });
