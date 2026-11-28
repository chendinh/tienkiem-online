// Báo cáo độ đa dạng (Requirement 25): from a fixed seed, make many creatures, Tu Sĩ and Pháp Khí with the game's own rules, sum each up as a fingerprint,
// and count how many are exact copies of another one. A rule change that makes everything come out the same fails here, before it reaches the players.
// No AI, no database: only the generators. N per kind is 2000 (DIVERSITY_N=10000 for a bigger run; copies of a Phàm grow with N, its kinds are few by design).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as C from '../lib/content';

const N = Number(process.env.DIVERSITY_N) || 2000, SEED = 20261128;
/** Share of the sample that has the same fingerprint as an earlier one (0 = all different). */
const dupRate = (keys: string[]) => (keys.length - new Set(keys).size) / keys.length;
/** A fresh game whose player stands in the middle of the zone, so the zone's own level range is used. */
const at = (z: C.Zone, seed: number) => { const st = G.newGame(seed, 'f', 1_800_000_000_000); const L = Math.round((z.lv[0] + z.lv[1]) / 2); st.player.realm = Math.floor((L - 1) / 4); st.player.sub = (L - 1) % 4; return st; };
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

function sample<T>(make: (st: G.GameState, z: C.Zone) => T, key: (x: T) => string) {
  const keys: string[] = [];
  C.ZONES.forEach((z, zi) => { const st = at(z, SEED + zi); for (let i = zi; i < N; i += C.ZONES.length) keys.push(key(make(st, z))); });
  return keys;
}

const beastKey = (b: G.Beast) => [b.sp, b.level, b.pers, [...b.skills].sort().join('+'), b.cls, b.mut ? 1 : 0, b.elite ? 1 : 0].join('|');
const npcKey = (n: G.NpcFoe) => [[...n.el].sort().join('+'), n.level, n.pers, n.elite ? 1 : 0].join('|');
const itemKey = (x: G.Item) => [x.base, x.tier, x.level, x.impl.value, x.affixes.map((a) => `${a.id}:${a.value}`).sort().join('+'), x.tien || ''].join('|');

test('diversity: creatures, Tu Sĩ and Pháp Khí rarely come out as exact copies (2000 of each, fixed seed)', () => {
  const beasts = sample((st, z) => G.genBeast(st, z, null, G.levelOf(st.player)), beastKey);
  const npcs = sample((st, z) => G.makeNpc(st, z), npcKey);
  const items = sample((st) => G.genItem(st, G.levelOf(st.player)), itemKey);
  // a Phàm has no extra lines by design (only its kind, Level and one number), so copies of it are expected; from Hoàng up every piece should be its own
  const plain = items.filter((k) => k.split('|')[1] === '0'), rare = items.filter((k) => k.split('|')[1] !== '0');
  const r = { beasts: dupRate(beasts), npcs: dupRate(npcs), items: dupRate(items), plain: dupRate(plain), rare: dupRate(rare) };
  console.log(`# Báo cáo độ đa dạng (N=${N} mỗi loại): Linh Thú trùng ${pct(r.beasts)} · Tu Sĩ trùng ${pct(r.npcs)} · Pháp Khí trùng ${pct(r.items)} (Phàm ${pct(r.plain)} trên ${plain.length}, Hoàng trở lên ${pct(r.rare)} trên ${rare.length})`);
  assert.equal(beasts.length, N); assert.equal(npcs.length, N); assert.equal(items.length, N);
  assert.ok(r.beasts <= 0.05, `Linh Thú trùng ${pct(r.beasts)}`);
  assert.ok(r.npcs <= 0.35, `Tu Sĩ trùng ${pct(r.npcs)}`);
  assert.ok(r.rare <= 0.01, `Pháp Khí Hoàng trở lên trùng ${pct(r.rare)}`);
  assert.ok(r.plain <= 0.25, `Pháp Khí Phàm trùng ${pct(r.plain)}`);
});

test('diversity: the same seed gives the same report', () => {
  const a = sample((st) => G.genItem(st, G.levelOf(st.player)), itemKey), b = sample((st) => G.genItem(st, G.levelOf(st.player)), itemKey);
  assert.deepEqual(a, b);
});
