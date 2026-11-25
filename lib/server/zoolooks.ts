// Which Dị Biến looks the server should draw by itself (2026-11-26): the game route hands every answer's beasts to wantLooks(), and when it answers true the
// route runs paintWanted() (lib/server/zoo.ts) after the answer. A newly tamed beast (by hand, or by the idle taming while away) changes the account's looks,
// so its look is wanted at once; beasts tamed before this are wanted the first time their owner's game is loaded. Kept apart from zoo.ts so it has no imports.
import { variantOf } from '../zoo';

export interface LookKey { sp: string; look: string }
const LOOK_RECHECK_MS = 15 * 60000;   // an account whose looks did not change is looked at again only after this
const LOOK_FAIL_MS = 6 * 3600000;     // a look refused by the reviewer is not tried again by the server before this (each try is paid)
const seen = new Map<string, { sig: string; t: number }>();
const wanted = new Map<string, LookKey>();
const failed = new Map<string, number>();

const lookOfBeast = (b: { sp: string; id: number; mut?: boolean }) => { const l = b.mut ? variantOf(b.sp, b.id) : null; return l && l !== 'ngusac' ? l : null; };   // Ngũ Sắc is the game's own picture

// true: something is waiting to be drawn
export function wantLooks(acc: string, beasts: { sp: string; id: number; mut?: boolean }[] | null | undefined, now = Date.now()): boolean {
  if (beasts) {
    const keys = new Map<string, LookKey>();
    for (const b of beasts) { const look = lookOfBeast(b); if (look) keys.set(`${b.sp}:${look}`, { sp: b.sp, look }); }
    const sig = [...keys.keys()].sort().join(','), s = seen.get(acc);
    if (!s || s.sig !== sig || now - s.t >= LOOK_RECHECK_MS) {
      seen.set(acc, { sig, t: now });
      if (seen.size > 2000) seen.delete(seen.keys().next().value as string);
      for (const [k, v] of keys) { const f = failed.get(k); if (!f || now - f > LOOK_FAIL_MS) wanted.set(k, v); }
    }
  }
  return wanted.size > 0;
}
export function takeWanted(): LookKey[] { const out = [...wanted.values()]; wanted.clear(); return out; }
export function lookFailed(k: LookKey, now = Date.now()) { failed.set(`${k.sp}:${k.look}`, now); if (failed.size > 2000) failed.delete(failed.keys().next().value as string); }
