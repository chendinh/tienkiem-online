// The Phó Bản demo (app/demo/pho-ban): a fight made up in the browser, any time, with as many cultivators as asked. Each one is made the way the game makes a new
// character (G.newGame: a real name, look, weapon and element), raised to a realm, given techniques of its môn, and turned into a fighter by the same fighterOf the server
// uses; then lib/raid.ts fights it exactly as the server would. Nothing is stored and nobody gets a reward.
import * as G from './game';
import * as A from './arts';
import * as R from './raid';
import { fighterOf } from './raidfighter';
import type { FilmView } from '@/components/RaidScene';

export const DEMO_MAX = 300;
const T0 = 1_800_000_000_000;

/** n made-up cultivators. realm: a realm index (0 Luyện Khí…), or -1 for a mix weighted toward the low realms, as a real server is. */
export function demoFighters(n: number, seed: number, realm: number): R.Fighter[] {
  const r = R.rng(`demo|${seed}`);
  return Array.from({ length: Math.max(1, Math.min(DEMO_MAX, n)) }, (_, i) => {
    const st = G.newGame(Math.floor(r() * 2 ** 31), r() < 0.5 ? 'f' : 'm', T0);
    const rl = realm >= 0 ? realm : Math.min(5, Math.floor(r() ** 1.6 * 6));
    st.player.realm = rl; st.player.sub = Math.floor(r() * 4);
    // techniques of its môn, as many as the realm has slots for (attack and support mixed, as players pick them)
    const cls = G.classOf(st);
    if (cls) {
      const pool = A.techsOf(cls).map((t) => t.name).filter((x) => x !== A.ART(cls).basic);
      for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
      const pick = pool.slice(0, A.slotsAt(rl));
      st.arts.learned = pick; st.arts.loadout[cls] = pick;
    }
    G.settle(st, 1);
    return fighterOf(st, (0x100000 + ((seed * 7919 + i * 104729) % 0xeffff)).toString(16) + i.toString(16).padStart(6, '0'));
  });
}

export type Outcome = 'any' | 'win' | 'flee';
/** A fight of these cultivators, as a film. The ending asked is found by trying other days (the day seeds every roll of the fight), then a sturdier or frailer
 *  Dị Thú (R.fight hpMul) when the days alone do not give it. */
export function demoFilm(bossId: string, fs: R.Fighter[], want: Outcome, seed: number): FilmView {
  const boss = R.BOSS(bossId);
  const ladder = want === 'flee' ? [1, 1.35, 1.8, 2.4, 3.2, 4.5] : want === 'win' ? [1, 0.8, 0.6, 0.45, 0.3] : [1];
  let first: FilmView | null = null;
  for (const mul of ladder) {
    for (let k = 0; k < (want === 'any' ? 1 : 4); k++) {
      // a real date, so the board can show it
      const day = new Date(Date.UTC(2026, 0, 1) + ((seed + k * 37) % 3650) * 86400000).toISOString().slice(0, 10);
      const res = R.fight(boss, fs, day, mul);
      const film: FilmView = { day, boss: boss.id, at: 0, win: res.win, max: res.max, fighters: fs, rounds: res.rounds, dmg: res.dmg, ko: res.ko, mvp: res.mvp, me: -1 };
      if (!first) first = film;
      if (want === 'any' || (want === 'win') === res.win) return film;
    }
  }
  return first!;
}
