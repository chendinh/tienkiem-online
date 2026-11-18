// Tu Sĩ ảo ("ghost"): made-up cultivators that only fill the Bảng Phong Thần so the world looks lived in.
// Unlike the bots (lib/bots.ts) a ghost has NO account, NO saved game and NO database row: it is a pure function of its number and the clock.
// Its level climbs slowly and levels off, its page (worn items, Linh Thú) is built from the same game code in memory when somebody opens it.
// Nothing here is written anywhere and nothing is drawn: items are Địa or lower (shared pictures), or a Thiên/Tiên look that was already drawn (the relic pool).
import * as G from './game';
import * as C from './content';
import * as D from './daily';
import { BALANCE as B } from './balance';
import { PERSONAS, botSeed, botEmail } from './bots';

export const GHOST_DOMAIN = 'ghost.tienkiem.local';
// How many ghosts there are. GHOSTS=0 turns them off.
export const ghostCount = (): number => { const n = Number(process.env.GHOSTS ?? 40); return Number.isInteger(n) && n >= 0 ? Math.min(n, 200) : 40; };

const DAY = 86400_000;
const EPOCH = Date.UTC(2026, 10, 18);        // day 0 of the ghosts: they all start low and climb from here
const LEVEL_TOP = 18;                         // no ghost passes this Level, so the real players stay ahead (the playable cap is 24)
const h = (n: number, k: string) => G.hash01(`ghost|${n}|${k}`);

export interface Ghost { n: number; st: G.GameState; level: number; cp: number; qd: number; t: number }

// Level as a real number: it starts between 2 and 10, climbs about 0.08 to 0.43 Level a day at first and slows down towards its own ceiling (9 to 18).
function level(n: number, now: number): number {
  const days = Math.max(0, (now - EPOCH) / DAY);
  const start = 2 + h(n, 'start') * 8, rate = 0.08 + h(n, 'rate') * 0.35, top = Math.max(start + 1, Math.min(LEVEL_TOP, 9 + h(n, 'top') * 9));
  return start + (top - start) * (1 - Math.exp((-rate * days) / (top - start)));
}

// Items: Phàm to Địa by Level; a Thiên or Tiên item only when its look is already in the relic pool (never a new picture).
function wear(st: G.GameState, n: number, L: number) {
  const max = L < 6 ? 1 : L < 12 ? 2 : 3;
  for (const slot of C.SLOTS) {
    const tier = Math.min(max, Math.floor(Math.sqrt(h(n, `tier|${slot}`)) * (max + 1)));
    st.eq[slot] = G.genItem(st, L, tier, slot);
  }
  if (L >= 10 && h(n, 'relic') < 0.35) {
    const slot = C.SLOTS[Math.floor(h(n, 'relic|slot') * C.SLOTS.length)], tier = h(n, 'relic|tier') < 0.3 ? 5 : 4, pool = D.relicsFor(tier, slot);
    if (pool.length) {
      const r = pool[Math.floor(h(n, 'relic|pick') * pool.length)], it = G.genItem(st, L, tier, slot);
      it.base = r.base; it.name = r.name; it.el = r.el; it.tien = r.tien; it.art = r.art;   // the look of a picture that already exists
      delete it.rel; st.relicQ = [];
      st.eq[slot] = it;
    }
  }
}

// An old bot keeps who it is (name, look, element: the same seed as when it was made) and only its progress is made up.
const BOT_BASE = 1000;
const identity = (n: number): { seed: number; gender: 'f' | 'm'; email: string } => {
  const ps = n > BOT_BASE ? PERSONAS.find((x) => x.n === n - BOT_BASE) : undefined;
  return ps ? { seed: botSeed(ps.n), gender: ps.gender, email: botEmail(ps.n) } : { seed: 5_000_000 + n * 104_729, gender: h(n, 'gender') < 0.5 ? 'f' : 'm', email: `${String(n).padStart(3, '0')}@${GHOST_DOMAIN}` };
};
function build(n: number, L: number): G.GameState {
  const id = identity(n);
  const st = G.newGame(id.seed, id.gender, EPOCH, id.email);
  const p = st.player;
  p.realm = Math.floor((L - 1) / 4); p.sub = (L - 1) % 4;
  wear(st, n, L);
  const zone = [...C.ZONES].reverse().find((z) => z.minLevel <= L) || C.ZONES[0];
  const count = Math.max(B.maxParty, 4 + Math.floor(h(n, 'beasts') * 8));
  for (let i = 0; i < count; i++) {
    const b = G.genBeast(st, zone, null, L);
    st.beasts.push(b);
    const e = st.best[b.sp]; e.tamed++; if (b.mut) e.mutTamed++;
  }
  st.kills = Math.round(L * L * 9 * (0.8 + 0.4 * h(n, 'kills')));
  p.hp = G.pstats(st).maxHp;
  return st;
}

// The built games are kept per instance; one is built again only when its Level goes up (a few times in all).
const memo: Map<number, { L: number; st: G.GameState }> = ((globalThis as any).__tutienGhosts ||= new Map());

export function ghost(n: number, now: number): Ghost {
  const lv = level(n, now), L = Math.max(1, Math.floor(lv));
  let m = memo.get(n);
  if (!m || m.L !== L) { m = { L, st: build(n, L) }; memo.set(n, m); }
  const days = Math.max(0, (now - EPOCH) / DAY);
  const bucket = Math.floor(now / 1_800_000);   // "last seen": mostly a few minutes ago, sometimes hours, and it changes every half hour
  const t = now - Math.round(Math.pow(h(n, `seen|${bucket}`), 2.5) * 600) * 60_000 - Math.round(h(n, `sec|${bucket}`) * 55) * 1000;
  return { n, st: m.st, level: L, cp: Math.round((lv - L) * G.threshold(L)), qd: Math.floor(Math.min(days, 300) * (0.2 + 0.6 * h(n, 'quest'))), t };
}
export const ghostAcc = (n: number) => `ghost:${n}`;
// The made-up progress of old bot number `botN` (1..10).
export const botGhost = (botN: number, now: number): Ghost => ghost(BOT_BASE + botN, now);
export const hasBotGhost = (botN: number) => PERSONAS.some((x) => x.n === botN);
export const ghosts = (now: number): Ghost[] => Array.from({ length: ghostCount() }, (_, i) => ghost(i + 1, now));
