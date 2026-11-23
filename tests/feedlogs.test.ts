import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import { cutFeedLogs, makeLogCache } from '../lib/feedlogs';
import { BALANCE as B } from '../lib/balance';

const row = (id: number, withLog: boolean): G.FeedEntry => ({ id, tick: id, kind: 'monster', text: `row ${id}`, ...(withLog ? { log: [`~start ${id}`, `hit ${id}`, `end ${id}`] } : {}) });

test('cutFeedLogs: since 0 changes nothing, a cut row keeps everything but its log and is marked', () => {
  const feed = [row(9, true), row(7, false), row(5, true), row(3, true)];
  assert.equal(cutFeedLogs(feed, 0), feed);
  const out = cutFeedLogs(feed, 5);
  assert.equal(out[0], feed[0], 'a row newer than since is the same object, log and all');
  assert.equal(out[1], feed[1], 'a row without a log is never marked');
  assert.deepEqual(out[2], { id: 5, tick: 5, kind: 'monster', text: 'row 5', logCut: true });
  assert.deepEqual(out[3], { id: 3, tick: 3, kind: 'monster', text: 'row 3', logCut: true });
  assert.ok(feed[2].log && !('logCut' in feed[2]), 'the saved state is never touched');
});

test('the cache puts back every log that was left out, and asks again when it cannot', () => {
  const full = [row(9, true), row(7, true), row(5, true)];
  const cache = makeLogCache();
  assert.equal(cache.since(), 0);
  assert.equal(cache.fill(structuredClone(full)), true);   // the first answer: everything
  assert.equal(cache.since(), 9);
  const next = structuredClone(cutFeedLogs([row(11, true), ...full], cache.since()));
  assert.ok(!next[1].log && next[1].logCut);
  assert.equal(cache.fill(next), true);
  assert.deepEqual(next, [row(11, true), ...full]);   // the same feed the browser would have got without the cut
  assert.equal(cache.since(), 11);
  // a cache that never saw the rows (a reload with an old `since`, a lost answer): false, and the next poll asks for all
  const empty = makeLogCache();
  const cut = structuredClone(cutFeedLogs(full, 9));
  assert.equal(empty.fill(cut), false);
  assert.equal(empty.since(), 0);
  assert.equal(empty.fill(structuredClone(full)), true);
});

test('over a whole journey the browser ends with the same feed as without the cut, and polls carry far fewer logs', () => {
  const st = G.newGame(4242, undefined, 1_700_000_000_000);
  Object.assign(st.set, { autoTame: true, autoFight: true, autoBreak: true, autoEquip: true });
  st.inv.trib = 20;
  const cache = makeLogCache();
  let fullBytes = 0, cutBytes = 0, polls = 0, fights = 0;
  for (let i = 0; i < 400; i++) {
    G.settle(st, 1);   // one tick (5 s) per poll
    const asked = cache.since();
    const got = structuredClone(cutFeedLogs(st.feed, asked));   // what crosses the wire
    cutBytes += JSON.stringify(got).length; fullBytes += JSON.stringify(st.feed).length; polls++;
    assert.equal(cache.fill(got), true);
    assert.deepEqual(got, st.feed, `poll ${i}: the feed the browser rebuilds must equal the server's`);
    if (st.feed[0]?.log) fights++;
  }
  assert.ok(fights > 0, 'the journey fought at least once');
  assert.ok(cutBytes < fullBytes, `cut ${cutBytes} < full ${fullBytes}`);
  console.log(`feed bytes over ${polls} polls: full ${fullBytes}, with the cut ${cutBytes} (${((1 - cutBytes / fullBytes) * 100).toFixed(0)}% less)`);
});

test('the cache stays small and drops the oldest logs first', () => {
  const cache = makeLogCache(5);
  for (let id = 1; id <= 20; id++) cache.fill([row(id, true)]);
  const probe = [row(1, false), row(20, false)].map((e) => ({ ...e, logCut: true as const }));
  assert.equal(cache.fill(probe), false, 'the oldest log is gone');
  const newest = [{ ...row(20, false), logCut: true as const }];
  assert.equal(cache.fill(newest), true, 'the newest log is still there');
  assert.ok(B.feedLogKeep < 60, 'the default cache is larger than the rows that can keep a log');
});
