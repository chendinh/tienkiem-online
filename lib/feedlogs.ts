// Fight logs in the journey list. A log is written once, when its entry is made, and never changes afterwards (the server only drops it from entries
// older than the newest B.feedLogKeep). Every poll used to carry all of them again, about half of the answer, although the browser had them already.
// So a poll says how far the browser has the logs (`?logs=<id>`), the server leaves out the logs of entries up to that id and marks the entry `logCut`,
// and the browser puts them back from what it kept. Nothing is ever lost silently: an entry that is marked but has no kept log makes the browser ask again for everything.
import type { FeedEntry } from './game';

// Server side: the feed as it goes into an answer to a poll that already has the logs of every entry up to `since` (0 or less: all of them).
export function cutFeedLogs(feed: FeedEntry[], since: number): FeedEntry[] {
  if (!(since > 0)) return feed;
  return feed.map((e) => {
    if (!e.log || e.id > since) return e;
    const { log: _log, ...rest } = e;
    return { ...rest, logCut: true as const };
  });
}

// Browser side: remembers the logs of every state it receives (a poll and the answer to a click alike) and puts back the ones a poll left out.
// It also keeps a log that the SERVER no longer has (only its newest B.feedLogKeep rows keep one, so a fight lost its "Xem diễn biến" about a minute after it
// ended): a row still on the list keeps showing the log the browser saw, until the row leaves the list or the page is loaded again. No cost on the server or the save.
export function makeLogCache(keep = 60) {
  const logs = new Map<number, string[]>();
  let top = 0;   // the newest feed id whose log the cache holds, when it has one: what the next poll sends as `logs`
  return {
    since: () => top,
    reset() { logs.clear(); top = 0; },
    // Returns false when a left-out log is not in the cache: the caller then asks again with since 0 (that answer has every log).
    fill(feed: FeedEntry[]): boolean {
      let whole = true, newest = 0;
      for (const e of feed) {
        if (e.id > newest) newest = e.id;
        if (e.log) logs.set(e.id, e.log);
        else {
          const kept = logs.get(e.id);
          if (kept) { e.log = kept; delete e.logCut; }   // left out by a poll, or dropped by the server because the row is no longer among its newest
          else if (e.logCut) whole = false;
        }
      }
      if (!whole) { top = 0; return false; }
      if (newest > top) top = newest;
      if (logs.size > keep) for (const id of [...logs.keys()].sort((a, b) => a - b).slice(0, logs.size - keep)) logs.delete(id);   // the oldest go first
      return true;
    },
  };
}
