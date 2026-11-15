// Game engine: pure functions over GameState. It runs only on the server (lib/server/service.ts); the browser imports types and read-only helpers from here.
import { type Streams, newStreams, next, int, pick, weighted, truncNormal, shuffle } from './rng';
import * as C from './content';
import * as A from './arts';
import * as D from './daily';
import { BALANCE as B, BALANCE_VERSION, CATALOG_VERSION, GENERATOR_VERSION, rates, cultRate, cultThreshold, baseStat as baseStatOf } from './balance';
import { type Look, makeLook } from './look';
import { ERR, type ErrCode } from './strings';

export interface Bio { bio: string; motto: string; secret: string }
// Portrait state: base = plain portrait, pose = the same portrait in a graceful standing pose (an edit of base, drawn right after it),
// url = what is shown now, sig = equipment that image shows (see avatarSpec), art = art direction version (ART_V).
export interface Avatar { base?: string; pose?: string; url?: string; sig?: string; crop?: number; art?: number }
export interface Player { avatar?: Avatar; origin: number; bio?: Bio; chapters?: { realm: number; text: string }[]; prologueSeen?: boolean; look: Look; name: string; dao: string; linh: string[]; purity: number; pers: number; realm: number; sub: number; cp: number; hp: number; heartDemon: number; injury?: number }
export interface AffixRoll { id: string; label: string; stat: string; value: number }
// locked: the player chose this item (or locked it by hand). Auto-equip never replaces a locked worn item and a full bag never dissolves a locked one.
export interface Item { id: number; base: string; slot: string; name: string; tier: number; level: number; el: string; impl: { stat: string; value: number }; affixes: AffixRoll[]; tien?: string; power: number; locked?: boolean; art?: number; rel?: string }
export interface Beast { id: number; sp: string; name: string; level: number; size: number; cm: number; cls: number; mut: boolean; pers: number; apt: number[]; skills: string[]; stats: number[]; power: number; elite?: boolean }
export interface BestEntry { seen: number; tamed: number; maxCm: number; minCm: number; mutSeen: number; mutTamed: number }
export interface FeedEntry { id: number; tick: number; kind: string; text: string; beast?: Beast; item?: Item; outcome?: string; chips?: string[]; log?: string[] }
export interface Highlight { prio: number; kind: string; text: string; item?: Item; beast?: Beast; log?: string[] }
export interface Report {
  id: string; at: number; seen: boolean; ticks: number; elapsedSec: number; mode: string; zone: string; recoveryTicks: number;
  enc: { monster: number; npc: number; resource: number; event: number };
  encounters: number; wins: number; losses: number; draws: number; cp: number; levels: number; epiphanies: number;
  stones: number; stonesBy: Record<string, number>; lostStones: number; items: number[]; stashed: number; dissolved: number; dissolvedFull: number; equipped: number;
  mats: Record<string, number>; gain: { taming: number; hp: number; trib: number }; used: { taming: number; hp: number; trib: number; bt: number };
  tameTry: number; tamed: number; mutTamed: number; newSpecies: string[]; skipPen: number; skipTalisman: number;
  bt: { ok: number; fail: number; lostCp: number }; phen: Record<string, number>; highlights: Highlight[]; blockedTicks: number; robbed: number; upkeep: number;
  fromLevel: number; toLevel: number; beforeTier: number; afterTier: number;
}
export interface TameFilter { species: string[]; newOnly: boolean; alwaysMut: boolean; sizes: number[]; grade: number }
export interface Settings {
  mode: 'adventure' | 'retreat'; autoTame: boolean; autoEquip: boolean; autoBreak: boolean; autoPill: boolean; autoFight: boolean; hideRank: boolean; autoLearn: boolean;
  retreatPct: number; resumePct: number; dissolveMax: number; tame: TameFilter;
}
export interface Stacks { taming: number[]; hp: number[]; bt: number[]; trib: number; mat: Record<string, number>; books: Record<string, number> }
// Môn pháp (lib/arts.ts): techniques learned from Bí Công, and which of them sit in each môn's slots.
export interface Arts { learned: string[]; loadout: Record<string, string[]>; methods: string[]; method: string }
export interface LedgerRow { t: number; reason: string; amt: number; src: string }
export interface LedgerDaily { day: string; reason: string; amt: number; n: number }
export interface GameState {
  v: number; seed: number; streams: Streams; tick: number; clock: number; uid: number; settleSeq: number;
  player: Player; arts: Arts; bag: Item[]; stash: Item[]; eq: Record<string, Item | null>;
  beasts: Beast[]; best: Record<string, BestEntry>; stones: number; inv: Stacks; pity: { mut: number; item: number };
  set: Settings; recovery: boolean; zone: string; feed: FeedEntry[]; recent: string[]; kills: number;
  pend: Record<string, number>; ledger: LedgerRow[]; ledgerBase: number; ledgerDaily: LedgerDaily[];
  reqs: Record<string, { t: number; res: any }>; reports: Report[]; auditQ: any[];
  decision: Decision | null; breakSnooze: number;
  dailySeen?: string;   // the last day whose chronicle chapter was announced in the feed
  relicQ?: D.RelicOp[];   // what the server must do with the shared relic pool for this save: claim a relic that was found, give back one that was dissolved (never sent to the browser)
  relicDay?: { day: string; n: number };   // how many shared items this save found today
}
// A question the journey waits for (only asked when the matching auto setting is off). While it is open there are no new encounters.
export interface NpcFoe { name: string; level: number; el: string[]; stats: number[]; pers: number; power: number; elite?: boolean }
export type Decision = { id: number; kind: 'tame'; beast: Beast; log: string[]; until?: number } | { id: number; kind: 'npc'; npc: NpcFoe } | { id: number; kind: 'break' };
export interface Res { ok: boolean; code?: ErrCode; msg: string; data?: any }
export type InvResult = Res;

export const TICK_SEC = B.tickSec;
export const OFFLINE_CAP_H = B.offlineCapH;
export const MIN_OFFLINE_SEC = B.minOfflineSec;
export const BAG_MAX = B.bagCapacity;
export const TUNE = { z: B.monsterLevelGrowth, gear: B.gearScale };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
// A daily creature the browser has not downloaded yet shows as this placeholder instead of breaking the page.
const UNKNOWN_SP: C.Species = { id: '?', name: 'Dị Thú', el: ['Dương'], cm: 100, f: [1, 1, 1, 1, 1], tame: 1 };
export const SP = (id: string) => C.SPECIES.find((s) => s.id === id) || D.dailySpecies().find((s) => s.id === id) || { ...UNKNOWN_SP, id };
export const levelOf = (p: Player) => p.realm * 4 + p.sub + 1;
export const threshold = cultThreshold;
export const baseStat = baseStatOf;
export const sizeClass = (s: number) => B.sizeClassThresholds.filter((t) => s >= t).length;
export const pityP = (p: number, c: number, S: number, H: number) => p + (1 - p) * clamp((c - S) / (H - S), 0, 1);
export const ok = (msg: string, data?: any): Res => ({ ok: true, msg, data });
export const fail = (code: ErrCode, msg?: string): Res => ({ ok: false, code, msg: msg || ERR[code] });

// Element_Matrix (prototype ring): Strong against the next two Elements on the ring, Weak against the previous two.
export function elemMult(att: string, defs: string[]): number {
  const i = C.EO.indexOf(att);
  const m = defs.map((d) => { const diff = (C.EO.indexOf(d) - i + 8) % 8; return diff === 1 || diff === 2 ? B.strongMult : diff === 6 || diff === 7 ? B.weakMult : B.neutralMult; });
  return m.reduce((a, b) => a + b, 0) / m.length;
}

// ---------- time and Zone_Phenomenon
function worldSeed(): string { return (typeof process !== 'undefined' && process.env && process.env.TUTIEN_WORLD_SEED) || 'tutien-dev-world-seed'; }
// 53-bit string hash mapped to [0, 1) (cyrb53)
export function hash01(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 9007199254740992;
}
export const phenSlot = (ms: number) => Math.floor(ms / 1000 / B.phenomenonSlotSec);
// The Zone_Phenomenon of a Zone in a time slot depends only on World_Seed, Zone and slot (Requirement 6.8).
export function phenomenonInSlot(zoneId: string, slot: number, seed = worldSeed()): C.Phenomenon | null {
  const z = C.ZONE(zoneId);
  if (!z.phen.length) return null;
  if (hash01(`${seed}|${z.id}|${slot}|p`) >= B.phenomenonP) return null;
  const tot = z.phen.reduce((a, x) => a + x.w, 0);
  let r = hash01(`${seed}|${z.id}|${slot}|w`) * tot;
  for (const x of z.phen) { r -= x.w; if (r < 0) return C.PHEN(x.id); }
  return C.PHEN(z.phen[z.phen.length - 1].id);
}
export const phenomenonAt = (zoneId: string, ms: number) => phenomenonInSlot(zoneId, phenSlot(ms));

// ---------- stats
// The read-only helpers below also run in the browser on the view the server sends, which has no seeds.
export type Sheet = Pick<GameState, 'player' | 'eq'> & { arts?: Pick<Arts, 'method'> };
export function pstats(st: Sheet) {
  const L = levelOf(st.player);
  const add: Record<string, number> = { hp: 0, spirit: 0, atk: 0, def: 0, spd: 0, crit: 0, critdmg: 0, luck: 0, cult: 0 };
  for (const it of Object.values(st.eq)) if (it) { add[it.impl.stat] += it.impl.value; for (const a of it.affixes) add[a.stat] += a.value; }
  // the Công Pháp in use adds a share of the base stat to the stats it favours (Method_Stat_Bias)
  const bias = (key: 'hp' | 'spirit' | 'atk' | 'def' | 'spd', i: number) => (st.arts && A.methodOf(st.arts.method).bias.includes(key) ? Math.round(baseStat(L, i) * B.methodStatBias) : 0);
  const f = (st.player.injury || 0) > 0 ? B.injuryFactor : 1;   // Thương Thế
  return {
    maxHp: Math.round(baseStat(L, 0)) + add.hp + bias('hp', 0), maxSpirit: Math.round(baseStat(L, 1)) + add.spirit + bias('spirit', 1), atk: Math.round((Math.round(baseStat(L, 2)) + add.atk + bias('atk', 2)) * f),
    def: Math.round((Math.round(baseStat(L, 3)) + add.def + bias('def', 3)) * f), spd: Math.round((Math.round(baseStat(L, 4)) + add.spd + bias('spd', 4)) * f), crit: Math.min(B.critCap * 100, B.baseCrit + add.crit), critdmg: B.baseCritDmg + add.critdmg, luck: add.luck, cult: add.cult,
  };
}
export const outfitTier = (st: Sheet) => (st.eq.Robe ? st.eq.Robe.tier : 0);
export function auraElement(st: Sheet): string { return (st.eq.Weapon && st.eq.Weapon.el) || st.player.linh[0]; }
const effLuck = (st: GameState, bonus = 0) => clamp(pstats(st).luck + bonus, 0, B.luckCap);

// ---------- economy: every Spirit_Stone change goes through earn/spend and is written to the Economy_Ledger
export function earn(st: GameState, amt: number, reason: string, rep?: Report): number {
  amt = Math.floor(amt);
  if (amt <= 0) return 0;
  const add = Math.min(amt, B.stoneMax - st.stones);
  st.stones += add;
  if (add > 0) st.pend[reason] = (st.pend[reason] || 0) + add;
  if (rep) { rep.stones += add; rep.stonesBy[reason] = (rep.stonesBy[reason] || 0) + add; rep.lostStones += amt - add; }
  return add;
}
function spend(st: GameState, amt: number, reason: string) { st.stones -= amt; st.pend[reason] = (st.pend[reason] || 0) - amt; }
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);
// One row per (source, reason) with a non-zero sum. Old rows fold into the check balance and the daily summaries (Requirement 24.15).
export function flushLedger(st: GameState, src: string, now: number) {
  for (const [reason, amt] of Object.entries(st.pend)) if (amt !== 0) st.ledger.push({ t: now, reason, amt, src });
  st.pend = {};
  const cutoff = now - B.ledgerRetentionDays * 86400000;
  while (st.ledger.length > 0 && (st.ledger[0].t < cutoff || st.ledger.length > B.ledgerMaxRows)) {
    const r = st.ledger.shift()!;
    st.ledgerBase += r.amt;
    const day = dayOf(r.t), d = st.ledgerDaily.find((x) => x.day === day && x.reason === r.reason);
    if (d) { d.amt += r.amt; d.n++; } else st.ledgerDaily.push({ day, reason: r.reason, amt: r.amt, n: 1 });
  }
}
export const ledgerSum = (st: GameState) => st.ledgerBase + st.ledger.reduce((a, r) => a + r.amt, 0);

// ---------- generation
export function tierProbs(luck: number): number[] {
  const R = rates();
  const w = B.rarityWeights.map((x, k) => x * Math.pow(1 + B.luckRarityGain * luck, k) * (k >= 2 ? R.boost : 1));
  const tot = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / tot);
}
function rollTier(st: GameState, luckBonus = 0): number {
  const R = rates(), luck = effLuck(st, luckBonus);
  const w = B.rarityWeights.map((x, k) => x * Math.pow(1 + B.luckRarityGain * luck, k) * (k >= 2 ? R.boost : 1));
  const tot = w.reduce((a, b) => a + b, 0);
  const P = pityP((w[4] + w[5]) / tot, st.pity.item, R.itemS, R.itemH);
  if (next(st.streams, 'loot') < P) { st.pity.item = 0; return next(st.streams, 'loot') < B.rarityWeights[5] / (B.rarityWeights[4] + B.rarityWeights[5]) ? 5 : 4; }
  st.pity.item++;
  return weighted(st.streams, 'loot', w.slice(0, 4));
}

// `exact`: the Item_Instance has exactly `level` (starting items are Level 1), otherwise Level varies by Item_Level_Spread around the source Level.
export function genItem(st: GameState, level: number, forceTier?: number, forceSlot?: string, luckBonus = 0, exact = false): Item {
  const g = st.streams;
  const tier = forceTier !== undefined ? forceTier : rollTier(st, luckBonus);
  const slot = forceSlot || pick(g, 'loot', C.SLOTS);
  const lvl = clamp(level + (exact ? 0 : int(g, 'gen', -B.itemLevelSpread, B.itemLevelSpread)), 1, B.playableLevelCap);
  const scale = (1 + 0.12 * (lvl - 1)) * TUNE.gear;
  let el = pick(g, 'gen', C.EO);
  const im = C.SLOT_IMPL[slot];
  const implV = Math.max(1, Math.round((im.r[0] + next(g, 'gen') * (im.r[1] - im.r[0])) * scale));
  const n = int(g, 'gen', B.affixCountByTier[tier][0], B.affixCountByTier[tier][1]);
  let pre = 0, suf = 0;
  const used = new Set<string>(), affixes: AffixRoll[] = [];
  for (let i = 0; i < n; i++) {
    const cand = C.AFFIX.filter((a) => !used.has(a.id) && !(a.kind === 'p' && pre >= B.maxPrefix) && !(a.kind === 's' && suf >= B.maxSuffix));
    if (!cand.length) break;
    const a = pick(g, 'gen', cand);
    used.add(a.id); if (a.kind === 'p') pre++; else suf++;
    const fl = B.rollFloorByTier[tier], u = fl + (1 - fl) * next(g, 'gen');
    affixes.push({ id: a.id, label: a.label, stat: a.stat, value: Math.max(1, Math.round((a.r[0] + u * (a.r[1] - a.r[0])) * scale)) });
  }
  // Weapons added by the daily job share the draw with the static list (one extra number, only while such weapons exist).
  const extra = slot === 'Weapon' ? D.weaponPool(tier, st.clock) : [];
  let base: string;
  if (extra.length) {
    const tw = extra.reduce((a, x) => a + x.w, 0), n = C.SLOT_BASE[slot].length;
    base = next(g, 'gen') < tw / (n + tw) ? extra[weighted(g, 'gen', extra.map((x) => x.w))].base : pick(g, 'gen', C.SLOT_BASE[slot]);
  } else base = pick(g, 'gen', C.SLOT_BASE[slot]);
  let name = base, tien: string | undefined;
  if (tier >= 4) name = `${pick(g, 'gen', C.PROPER1)} ${pick(g, 'gen', C.PROPER2)} ${base}`;
  else if (tier >= 1) {
    const sa = affixes.find((a) => C.AFFIX.find((d) => d.id === a.id)!.kind === 's');
    name = `${C.EL_PREFIX[el]} ${base}` + (tier >= 2 && sa ? ` · ${C.AFFIX.find((d) => d.id === sa.id)!.name}` : '');
  }
  if (tier === 5) {
    tien = pick(g, 'gen', C.TIEN_VAN);
    name += ` · ${tien.replace(' Tiên Văn', '')}`;
    affixes.push({ id: 'tien_atk', label: 'Tiên Văn · Công Kích', stat: 'atk', value: Math.round(8 * scale) }, { id: 'tien_hp', label: 'Tiên Văn · Sinh Lực', stat: 'hp', value: Math.round(60 * scale) });
  }
  let power = implV * C.PW[im.stat];
  for (const a of affixes) power += a.value * C.PW[a.stat];
  // Picture look: common items share one picture per kind; Địa has a few looks; Thiên and Tiên always get their own.
  let rel: string | undefined;
  let art = tier >= 4 ? int(g, 'gen', 1000, 2 ** 30) : tier === 3 ? int(g, 'gen', 1, B.artVariantsDia) : undefined;
  // A Thiên or Tiên item may be a dissolved one found again: it takes that item's name and picture (already drawn), never its numbers.
  if (tier >= 4) {
    const today = D.dayKey(st.clock), pool = D.relicsFor(tier, slot);
    if (pool.length && (!st.relicDay || st.relicDay.day !== today || st.relicDay.n < D.RELIC_PER_DAY) && next(g, 'gen') < D.RELIC_P) {
      const r = pool[int(g, 'gen', 0, pool.length - 1)];
      base = r.base; name = r.name; el = r.el; tien = r.tien; art = r.art; rel = D.relicSig(r);
      (st.relicQ || (st.relicQ = [])).push({ op: 'take', sig: rel });   // the server claims it for this save; if somebody else got it first, the item gets a new look
      st.relicDay = { day: today, n: (st.relicDay && st.relicDay.day === today ? st.relicDay.n : 0) + 1 };
    }
  }
  return { id: ++st.uid, base, slot, name, tier, level: lvl, el, art, impl: { stat: im.stat, value: implV }, affixes, tien, power: Math.round(power), ...(rel ? { rel } : {}) };
}

export function sizeFactors(size: number) { return [1 + B.sizeHpCoef * (size - 1), 1, 1, 1, 1 - B.sizeSpeedCoef * (size - 1)]; }
function genBeast(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, L: number, rep?: Report): Beast {
  const elite = next(st.streams, 'enc') < B.eliteChance;
  const g = st.streams, R = rates();
  const ws = [...C.SPECIES.map((s) => (zone.species[s.id] || 0) * ((ph && ph.species && ph.species[s.id]) || 1)), ...D.dailyWeights(zone.id, st.clock)];
  const sp = D.allSpecies()[weighted(g, 'enc', ws)];
  const level = clamp(L + int(g, 'gen', -1, 2), zone.lv[0], Math.min(zone.lv[1], B.playableLevelCap));
  const apt = [0, 0, 0, 0, 0].map(() => B.aptMin + next(g, 'gen') * (B.aptMax - B.aptMin));
  const pers = int(g, 'gen', 0, C.PERS.length - 1);
  const size = truncNormal(g, 'gen', B.sizeMean, B.sizeSigma, B.sizeMin, B.sizeMax);
  const pm = pityP(R.mutP, st.pity.mut, R.mutS, R.mutH);
  const mut = next(g, 'gen') < pm;
  st.pity.mut = mut ? 0 : st.pity.mut + 1;
  const sf = sizeFactors(size);
  const stats = [0, 1, 2, 3, 4].map((i) => Math.max(1, Math.round(baseStat(level, i) * (1 + TUNE.z * level) * sp.f[i] * apt[i] * (1 + C.PERS[pers].dev[i]) * sf[i] * (mut ? 1 + B.mutationStatBonus : 1) * (elite ? B.eliteStatMult : 1))));
  const pool = [...C.SKILLS[sp.el[0]], C.NEUTRAL_SKILL];
  const skills = shuffle(g, 'gen', pool).slice(0, int(g, 'gen', B.monsterSkillMin, B.monsterSkillMax));
  const cm = Math.round(sp.cm * size);
  const e = st.best[sp.id] || (st.best[sp.id] = { seen: 0, tamed: 0, maxCm: 0, minCm: 9999, mutSeen: 0, mutTamed: 0 });
  if (e.seen === 0 && rep) rep.newSpecies.push(sp.name);
  e.seen++; e.maxCm = Math.max(e.maxCm, cm); e.minCm = Math.min(e.minCm, cm); if (mut) e.mutSeen++;
  return { id: ++st.uid, sp: sp.id, name: sp.name, level, size, cm, cls: sizeClass(size), mut, elite: elite || undefined, pers, apt, skills, stats, power: stats[2] + stats[3] + stats[4] + Math.round(stats[0] / 8) };
}

// ---------- inventory (Requirement 21)
const aptTotal = (b: Beast) => b.apt.reduce((a, x) => a + x, 0) / b.apt.length;
export const dissolveValue = (it: Item) => B.dissolveValueByTier[it.tier] * it.level;
export const releaseValue = (b: Beast) => Math.floor(B.releaseBase * b.level * aptTotal(b) * B.releaseSizeFactors[b.cls] * (b.mut ? B.releaseMutationFactor : 1));
// A dissolved Thiên or Tiên item goes to the shared relic pool (the server stores it): only its look, not its numbers.
function shareRelic(st: GameState, it: Item) {
  if (it.tier >= 4 && it.art) { const q = st.relicQ || (st.relicQ = []); if (q.length < 50) q.push({ op: 'give', tier: it.tier, slot: it.slot, base: it.base, el: it.el, art: it.art, name: it.name, ...(it.tien ? { tien: it.tien } : {}) }); }
}
function dissolveItem(st: GameState, it: Item, rep?: Report, full = false) {
  shareRelic(st, it);
  earn(st, dissolveValue(it), 'dissolve', rep); if (rep) { rep.dissolved++; if (full) rep.dissolvedFull++; } }
function feed(st: GameState, e: Omit<FeedEntry, 'id' | 'tick'>) { st.feed.unshift({ id: ++st.uid, tick: st.tick, ...e }); if (st.feed.length > B.feedSize) st.feed.length = B.feedSize; }

// Put an Item_Instance away: auto-dissolve, bag, stash, or the rule for when both are full (Requirement 21.2 to 21.5). `x` is never locked.
function shelve(st: GameState, x: Item, rep?: Report): 'bag' | 'stash' | 'dissolved' | 'auto' {
  const cur = st.eq[x.slot];
  if (!x.locked && st.set.dissolveMax >= 0 && x.tier <= st.set.dissolveMax && cur) { dissolveItem(st, x, rep); return 'auto'; }
  if (st.bag.length < B.bagCapacity) { st.bag.push(x); return 'bag'; }
  if (st.stash.length < B.overflowCapacity) { st.stash.push(x); if (rep) rep.stashed++; return 'stash'; }
  // both full: dissolve the weakest of {x} plus the unlocked stash items (lowest tier, then lowest power, then earliest in the stash; x counts as the latest)
  let wi = -1;
  for (let i = 0; i < st.stash.length; i++) {
    const s = st.stash[i]; if (s.locked) continue;
    if (wi < 0) { wi = i; continue; }
    const w = st.stash[wi];
    if (s.tier < w.tier || (s.tier === w.tier && s.power < w.power)) wi = i;
  }
  if (wi >= 0 && (st.stash[wi].tier < x.tier || (st.stash[wi].tier === x.tier && st.stash[wi].power < x.power))) {
    const gone = st.stash.splice(wi, 1)[0]; dissolveItem(st, gone, rep, true); st.stash.push(x); if (rep) rep.stashed++; return 'stash';
  }
  dissolveItem(st, x, rep, true); return 'dissolved';
}
// A new Item_Instance is given to the player: auto-equip first, then the shelving rules.
function giveItem(st: GameState, it: Item, rep?: Report, from = '') {
  const L = levelOf(st.player), cur = st.eq[it.slot];
  if (rep) {
    rep.items[it.tier]++;
    const pr = it.tier === 5 ? 100 : it.tier === 4 ? 80 : it.tier === 3 ? 60 : 0;
    if (pr) rep.highlights.push({ prio: pr, kind: 'item', text: `Nhặt được pháp khí hạng ${C.RARITY[it.tier]}`, item: it });
  }
  if (st.set.autoEquip && it.level <= L && (!cur || (!cur.locked && cur.power < it.power))) {
    st.eq[it.slot] = it; if (rep) rep.equipped++;
    feed(st, { kind: 'equip', text: `${from}Tự động mặc ${it.name}`, item: it });
    if (cur) shelve(st, cur, rep);
    return;
  }
  const where = shelve(st, it, rep);
  if (it.tier >= 1) feed(st, { kind: 'item', text: `${from}Nhặt được ${it.name} (${where === 'bag' ? 'vào túi' : where === 'stash' ? 'vào kho tạm, túi đã đầy' : where === 'auto' ? 'tự động phân giải theo cài đặt' : 'túi và kho đã đầy nên bị phân giải'})`, item: it });
}
const clampHp = (st: GameState) => { st.player.hp = Math.min(st.player.hp, pstats(st).maxHp); };
const findIn = (st: GameState, id: number): { it: Item; where: 'bag' | 'stash' | 'eq'; i: number; slot?: string } | null => {
  let i = st.bag.findIndex((x) => x.id === id); if (i >= 0) return { it: st.bag[i], where: 'bag', i };
  i = st.stash.findIndex((x) => x.id === id); if (i >= 0) return { it: st.stash[i], where: 'stash', i };
  for (const [slot, x] of Object.entries(st.eq)) if (x && x.id === id) return { it: x, where: 'eq', i: -1, slot };
  return null;
};

// Wear an item from the bag or the stash. The item that was worn goes back to the exact place the new one leaves. The chosen item is locked so that auto-equip keeps it.
export function equipFromBag(st: GameState, id: number): Res {
  const f = findIn(st, id);
  if (!f || f.where === 'eq') return fail('E_NOT_FOUND');
  const it = f.it, L = levelOf(st.player);
  if (it.level > L) return fail('E_LEVEL_TOO_LOW', `${it.name} cần Lv${it.level}, ngươi mới Lv${L}.`);
  const list = f.where === 'bag' ? st.bag : st.stash;
  const cur = st.eq[it.slot];
  if (cur) { cur.locked = false; list[f.i] = cur; } else list.splice(f.i, 1);
  it.locked = true;
  st.eq[it.slot] = it;
  clampHp(st);
  return ok(`Đã mặc ${it.name} vào ô ${C.SLOT_VI[it.slot]}${cur ? `, ${cur.name} về ${f.where === 'bag' ? 'túi' : 'kho tạm'}` : ''}. Món này được khóa nên game không tự thay.`);
}
export function unequip(st: GameState, slot: string): Res {
  const it = st.eq[slot];
  if (!it) return fail('E_SLOT_EMPTY');
  if (st.bag.length >= B.bagCapacity) return fail('E_BAG_FULL');
  st.eq[slot] = null; it.locked = false; st.bag.push(it);
  clampHp(st);
  return ok(`Đã tháo ${it.name} về túi.`);
}
export function unstash(st: GameState, id: number): Res {
  const i = st.stash.findIndex((x) => x.id === id);
  if (i < 0) return fail('E_NOT_FOUND');
  if (st.bag.length >= B.bagCapacity) return fail('E_BAG_FULL');
  st.bag.push(st.stash.splice(i, 1)[0]);
  return ok('Đã chuyển vào Túi Càn Khôn.');
}
export function toggleLock(st: GameState, id: number): Res {
  const f = findIn(st, id);
  if (!f) return fail('E_NOT_FOUND');
  f.it.locked = !f.it.locked;
  return ok(f.it.locked ? `Đã khóa ${f.it.name}: game không tự thay hay tự phân giải món này.` : `Đã mở khóa ${f.it.name}.`);
}
export function dissolveBagItem(st: GameState, id: number): Res {
  const f = findIn(st, id);
  if (!f) return fail('E_NOT_FOUND');
  if (f.where === 'eq') return fail('E_WORN');
  if (f.it.locked) return fail('E_LOCKED');
  (f.where === 'bag' ? st.bag : st.stash).splice(f.i, 1);
  shareRelic(st, f.it);
  const v = earn(st, dissolveValue(f.it), 'dissolve');
  return ok(`Đã phân giải ${f.it.name}, nhận ${v} Linh Thạch.`, { stones: v });
}

// ---------- shop, pills, release (Requirement 24)
const stackOf = (st: GameState, s: C.ShopItem): number => (s.kind === 'taming' ? st.inv.taming[s.idx] : s.kind === 'hp' ? st.inv.hp[s.idx] : s.kind === 'bt' ? st.inv.bt[s.idx] : st.inv.trib);
const addStack = (st: GameState, s: C.ShopItem, q: number) => { if (s.kind === 'taming') st.inv.taming[s.idx] += q; else if (s.kind === 'hp') st.inv.hp[s.idx] += q; else if (s.kind === 'bt') st.inv.bt[s.idx] += q; else st.inv.trib += q; };
const validQty = (q: any, max: number) => Number.isInteger(q) && q >= 1 && q <= max;
export function buy(st: GameState, id: string, q: number): Res {
  const s = C.SHOP_ITEM(id);
  if (!s) return fail('E_NOT_FOR_SALE');
  if (!validQty(q, B.maxPurchaseQty)) return fail('E_BAD_QTY');
  const total = s.price * q;
  if (total > st.stones) return fail('E_FUNDS');
  if (stackOf(st, s) + q > B.stackMax) return fail('E_STACK_MAX');
  spend(st, total, 'purchase'); addStack(st, s, q);
  return ok(`Đã mua ${q} ${s.name} với ${total} Linh Thạch.`);
}
export const sellPrice = (s: C.ShopItem) => Math.floor(B.sellBackRatio * s.price);
export function sell(st: GameState, id: string, q: number): Res {
  if (id.startsWith('mat:')) {
    const m = C.MATERIALS.find((x) => x.id === id.slice(4));
    if (!m) return fail('E_NOT_FOR_SALE');
    const have = st.inv.mat[m.id] || 0;
    if (!validQty(q, have)) return fail(have <= 0 ? 'E_NO_STOCK' : 'E_BAD_QTY');
    st.inv.mat[m.id] = have - q;
    const v = earn(st, m.price * q, 'sell_material');
    return ok(`Đã bán ${q} ${m.name}, nhận ${v} Linh Thạch.`, { stones: v });
  }
  const s = C.SHOP_ITEM(id);
  if (!s) return fail('E_NOT_FOR_SALE');
  const have = stackOf(st, s);
  if (!validQty(q, have)) return fail(have <= 0 ? 'E_NO_STOCK' : 'E_BAD_QTY');
  addStack(st, s, -q);
  const v = earn(st, sellPrice(s) * q, 'sell_back');
  return ok(`Đã bán lại ${q} ${s.name}, nhận ${v} Linh Thạch.`, { stones: v });
}
function applyHpPill(st: GameState, grade: number) {
  const S = pstats(st), p = st.player;
  p.hp = Math.min(S.maxHp, p.hp + Math.floor(B.pillRestore[grade] * S.maxHp));
  if (grade >= B.injuryCurePillGrade) p.injury = 0;
}
export function useHpPill(st: GameState, grade: number): Res {
  if (!Number.isInteger(grade) || grade < 0 || grade > 2) return fail('E_BAD_REQUEST');
  if (st.inv.hp[grade] <= 0) return fail('E_NO_STOCK');
  if (st.player.hp >= pstats(st).maxHp) return fail('E_HP_FULL');
  st.inv.hp[grade]--; applyHpPill(st, grade);
  return ok(`Đã dùng Hồi Khí Đan hạng ${grade + 1}.`);
}
export function releaseBeast(st: GameState, id: number): Res {
  const i = st.beasts.findIndex((b) => b.id === id);
  if (i < 0) return fail('E_NOT_FOUND');
  const b = st.beasts.splice(i, 1)[0];
  const v = earn(st, releaseValue(b), 'release');
  return ok(`Đã thả ${b.name}, nhận ${v} Linh Thạch.`, { stones: v });
}

// ---------- bulk actions the player starts by hand
// Dissolve every item that is not locked and not worn, up to a rarity (the player picks it; nothing happens on its own).
export function dissolveMany(st: GameState, maxTier: number): Res {
  if (!Number.isInteger(maxTier) || maxTier < 0 || maxTier > 5) return fail('E_BAD_REQUEST');
  let n = 0, gain = 0;
  for (const list of [st.bag, st.stash]) {
    for (let i = list.length - 1; i >= 0; i--) { const it = list[i]; if (!it.locked && it.tier <= maxTier) { list.splice(i, 1); shareRelic(st, it); gain += earn(st, dissolveValue(it), 'dissolve'); n++; } }
  }
  return n === 0 ? fail('E_NOT_FOUND', 'Không có món nào phù hợp để phân giải.') : ok(`Đã phân giải ${n} món, nhận ${gain} Linh Thạch.`, { n, stones: gain });
}
// Sell every Linh Thú that is not in the Party and not a Dị Biến.
export function releaseMany(st: GameState): Res {
  const keep = new Set(bestParty(st).map((b) => b.id));
  let n = 0, gain = 0;
  st.beasts = st.beasts.filter((b) => { if (keep.has(b.id) || b.mut) return true; gain += earn(st, releaseValue(b), 'release'); n++; return false; });
  return n === 0 ? fail('E_NOT_FOUND', 'Không có Linh Thú nào phù hợp để bán.') : ok(`Đã bán ${n} Linh Thú, nhận ${gain} Linh Thạch.`, { n, stones: gain });
}

// ---------- answering the question the journey waits for
export function decide(st: GameState, b: { id: number; choice: string; grade?: number; pill?: boolean; trib?: boolean }): Res {
  const d = st.decision;
  if (!d || d.id !== b.id) return fail('E_NO_DECISION');
  if (d.kind === 'tame') {
    const m = d.beast, sp = SP(m.sp);
    if (b.choice === 'skip') { st.decision = null; feed(st, { kind: 'system', text: `Bỏ qua ${m.name}.` }); return ok(`Đã bỏ qua ${m.name}.`); }
    if (b.choice !== 'tame' || !Number.isInteger(b.grade) || b.grade! < 0 || b.grade! > 3) return fail('E_BAD_REQUEST');
    if (st.beasts.length >= B.penCapacity) return fail('E_PEN_FULL');
    if (st.inv.taming[b.grade!] <= 0) return fail('E_NO_STOCK');
    const chips: string[] = [];
    const won = rollTame(st, m, sp, b.grade!, chips, undefined, d.log);
    st.decision = null;
    feed(st, { kind: 'tame', text: `${m.mut ? 'Dị Biến ' : ''}${m.name} (Lv${m.level}): ${chips[0]}`, beast: won ? m : undefined, chips: [] });
    return ok(chips[0], { won });
  }
  if (d.kind === 'npc') {
    const zone = C.ZONE(st.zone);
    if (b.choice === 'avoid') { st.decision = null; feed(st, { kind: 'system', text: `Tránh được ${d.npc.name}.` }); return ok('Đã tránh đi.'); }
    if (b.choice !== 'fight') return fail('E_BAD_REQUEST');
    st.decision = null;
    fightNpc(st, zone, phenomenonAt(zone.id, st.clock), d.npc);
    return ok('Giao chiến xong.');
  }
  if (b.choice === 'later') { st.decision = null; st.breakSnooze = st.tick + B.breakSnoozeTicks; return ok('Để sau.'); }
  if (b.choice === 'break') return attemptBreakthrough(st, { pill: b.pill === true, trib: b.trib === true, src: 'player' });
  return fail('E_BAD_REQUEST');
}

// ---------- settings, mode, zone
export function setMode(st: GameState, mode: string): Res {
  if (mode !== 'adventure' && mode !== 'retreat') return fail('E_BAD_REQUEST');
  st.set.mode = mode;
  if (mode === 'retreat') st.recovery = false;
  return ok(mode === 'retreat' ? 'Đã chuyển sang Bế Quan.' : 'Đã chuyển sang Lịch Luyện.');
}
export function setZone(st: GameState, id: string): Res {
  const z = C.ZONES.find((x) => x.id === id);
  if (!z) return fail('E_BAD_ZONE');
  if (z.minLevel > levelOf(st.player)) return fail('E_ZONE_LOCKED', `Cần Lv${z.minLevel} để vào ${z.name}.`);
  st.zone = z.id;
  return ok(`Đã tới ${z.name}.`);
}
const isBool = (x: any) => typeof x === 'boolean';
export function setSettings(st: GameState, patch: any): Res {
  if (!patch || typeof patch !== 'object') return fail('E_BAD_REQUEST');
  const cur = st.set, next_: Settings = { ...cur, tame: { ...cur.tame } };
  for (const k of ['autoTame', 'autoEquip', 'autoBreak', 'autoPill', 'autoFight', 'hideRank', 'autoLearn'] as const) if (k in patch) { if (!isBool(patch[k])) return fail('E_BAD_SETTING'); next_[k] = patch[k]; }
  for (const k of ['retreatPct', 'resumePct'] as const) if (k in patch) { if (!Number.isInteger(patch[k])) return fail('E_BAD_THRESHOLDS'); next_[k] = patch[k]; }
  if (!(next_.retreatPct > 0 && next_.retreatPct < next_.resumePct && next_.resumePct <= 100)) return fail('E_BAD_THRESHOLDS');
  if ('dissolveMax' in patch) { if (!Number.isInteger(patch.dissolveMax) || patch.dissolveMax < -1 || patch.dissolveMax > 5) return fail('E_BAD_SETTING'); next_.dissolveMax = patch.dissolveMax; }
  if (patch.tame !== undefined) {
    const t = patch.tame;
    if (!t || typeof t !== 'object') return fail('E_BAD_SETTING');
    if ('species' in t) { if (!Array.isArray(t.species) || t.species.some((s: any) => !C.SPECIES.some((x) => x.id === s))) return fail('E_BAD_SETTING'); next_.tame.species = [...new Set<string>(t.species)]; }
    if ('newOnly' in t) { if (!isBool(t.newOnly)) return fail('E_BAD_SETTING'); next_.tame.newOnly = t.newOnly; }
    if ('alwaysMut' in t) { if (!isBool(t.alwaysMut)) return fail('E_BAD_SETTING'); next_.tame.alwaysMut = t.alwaysMut; }
    if ('sizes' in t) { if (!Array.isArray(t.sizes) || t.sizes.some((s: any) => !Number.isInteger(s) || s < 0 || s > 4)) return fail('E_BAD_SETTING'); next_.tame.sizes = [...new Set<number>(t.sizes)].sort(); }
    if ('grade' in t) { if (!Number.isInteger(t.grade) || t.grade < 0 || t.grade > 3) return fail('E_BAD_SETTING'); next_.tame.grade = t.grade; }
  }
  st.set = next_;
  return ok('Đã lưu cài đặt.');
}

// ---------- cultivation (Requirement 22, 23)
export function breakthroughP(st: GameState, pill = false) {
  const target = st.player.realm + 2; // Realm number of the target
  return clamp((B.breakBase[target] ?? 0) + B.breakPurityBonus * st.player.purity + (pill ? B.breakPillBonus : 0), B.breakMin, B.breakMax);
}
function advance(st: GameState, rep?: Report) {
  const p = st.player;
  for (;;) {
    const L = levelOf(p), th = cultThreshold(L);
    if (L >= B.playableLevelCap || p.sub >= 3) { p.cp = Math.min(p.cp, th); return; }
    if (p.cp < th) return;
    p.cp -= th; p.sub++;
    if (rep) { rep.levels++; rep.highlights.push({ prio: 10, kind: 'level', text: `Tu vi tăng: ${C.REALMS[p.realm]} ${C.SUBS[p.sub]}` }); }
    feed(st, { kind: 'level', text: `Tu vi tăng: ${C.REALMS[p.realm]} ${C.SUBS[p.sub]}` });
  }
}
export function atBottleneck(st: Pick<GameState, 'player'>) { const p = st.player, L = levelOf(p); return p.sub === 3 && L < B.playableLevelCap && p.cp >= cultThreshold(L); }
export const targetIsTribulation = (st: GameState) => B.tribulationRealms.includes(st.player.realm + 2);
export const tribulationWaves = (st: GameState) => (targetIsTribulation(st) ? B.tribulationWaves[st.player.realm + 2] : 0);
const tribEnemyStats = (st: GameState) => { const tl = (st.player.realm + 1) * 4 + 1; return [0, 1, 2, 3, 4].map((i) => Math.max(1, Math.round(baseStat(tl, i) * B.tribulationWaveStrength))); };

export function previewBreakthrough(st: GameState): Res {
  const L = levelOf(st.player);
  if (L >= B.playableLevelCap) return fail('E_AT_CAP');
  return ok('', { target: st.player.realm + 1, pNoPill: breakthroughP(st, false), pPill: breakthroughP(st, true), tribulation: targetIsTribulation(st), waves: tribulationWaves(st), enemy: tribEnemyStats(st), pills: st.inv.bt[st.player.realm], trib: st.inv.trib });
}

// One Breakthrough_Attempt. `src` is who asked (the player or Auto_Breakthrough). Draws one value from the `cult` stream, then Tribulation waves from `combat`.
export function attemptBreakthrough(st: GameState, opt: { pill?: boolean; trib?: boolean; src?: 'player' | 'auto' } = {}, rep?: Report): Res {
  const p = st.player, L = levelOf(p), src = opt.src || 'player';
  if (L >= B.playableLevelCap) return fail('E_AT_CAP');
  if (!atBottleneck(st)) return fail('E_NOT_BOTTLENECK');
  if (opt.pill && st.inv.bt[p.realm] <= 0) return fail('E_NO_PILL');
  if (opt.trib && st.inv.trib <= 0) return fail('E_NO_TRIB');
  if (st.decision && st.decision.kind === 'break') st.decision = null;
  const target = p.realm + 1, usePill = !!opt.pill, prob = breakthroughP(st, usePill);
  const prevMode = st.set.mode, wasRecovery = st.recovery;
  if (usePill) { st.inv.bt[p.realm]--; if (rep) rep.used.bt++; }
  const audit: any = { type: 'breakthrough', src, tick: st.tick, target: C.REALMS[target], prob, pill: usePill, trib: 0, waves: 0, passed: 0 };
  let success = next(st.streams, 'cult') < prob, text = '';
  audit.roll = success;
  if (success && targetIsTribulation(st)) {
    const waves = tribulationWaves(st), S = pstats(st), stats = tribEnemyStats(st);
    let reduce = 1;
    if (opt.trib) { st.inv.trib--; reduce = 1 - B.tribulationReduction; audit.trib = 1; if (rep) rep.used.trib++; }
    audit.waves = waves;
    for (let w = 1; w <= waves && success; w++) {
      const foe = { name: 'Thiên Lôi', stats, el: ['Lôi'] };
      const r = fightCore(st, S, foe, [], reduce);
      if (r.outcome === 'lose') { success = false; text = `Thiên Kiếp đợt ${w}/${waves} quá mạnh, đạo thể tan vỡ.`; p.hp = 1; p.injury = B.injuryTicks; if (prevMode === 'adventure' && !wasRecovery) st.recovery = true; }
      else audit.passed++;
    }
    if (success) text = `Vượt qua ${waves} đợt Thiên Kiếp!`;
  }
  audit.ok = success;
  if (success) {
    p.realm = target; p.sub = 0; p.cp = 0; p.hp = pstats(st).maxHp;
    text = text || 'Đột phá thành công!';
    feed(st, { kind: 'break', text: `Đột phá thành công: ${C.REALMS[p.realm]} ${C.SUBS[0]}. ${text}` });
    if (rep) { rep.bt.ok++; rep.levels++; rep.highlights.push({ prio: 70, kind: 'break', text: `Đột phá lên ${C.REALMS[p.realm]}. ${text}` }); }
  } else {
    const lost = Math.floor(p.cp * B.breakFailureLoss);
    p.cp -= lost; p.heartDemon = B.heartDemonDuration; audit.lostCp = lost;
    text = text || 'Đột phá thất bại, tâm ma quấy nhiễu.';
    feed(st, { kind: 'break', text: `Đột phá thất bại. ${text} (mất ${lost} Tu Vi, Tâm Ma ${Math.round(B.heartDemonDuration * B.tickSec / 60)} phút)` });
    if (rep) { rep.bt.fail++; rep.bt.lostCp += lost; rep.highlights.push({ prio: 50, kind: 'break', text: `Đột phá thất bại. ${text}` }); }
  }
  st.auditQ.push(audit);
  return { ok: true, msg: text, data: { success } };  // the attempt took place; `data.success` tells how it ended
}

// ---------- môn pháp: techniques, Bí Công and slots (lib/arts.ts)
// A new character knows the Hoàng technique of the môn of its starting weapon and has it slotted; an old save gets the same (service.ts upgrade).
export function initArts(st: Pick<GameState, 'eq' | 'arts'>) {
  if (!st.arts.methods || !st.arts.methods.length) { st.arts.methods = [A.STARTER_METHOD]; st.arts.method = A.STARTER_METHOD; }
  const cls = classOf(st);
  if (!cls || st.arts.learned.length) return;
  const t = A.attackTechs(cls)[0];
  st.arts.learned.push(t.name); st.arts.loadout[cls] = [t.name];
}
// Learn the technique of a Bí Công. A technique already known turns into Linh Thạch. Returns false when the player is too low a Level (the book stays).
function learnTech(st: GameState, name: string, rep?: Report): { known: boolean; stones?: number } | null {
  const t = A.TECHS[name];
  if (levelOf(st.player) < t.minLevel) return null;
  if (st.arts.learned.includes(name)) return { known: true, stones: earn(st, B.dupBookStones[t.tier], 'drop', rep) };
  st.arts.learned.push(name);
  const slots = st.arts.loadout[t.cls] || (st.arts.loadout[t.cls] = []);
  if (slots.length < A.slotsAt(st.player.realm)) slots.push(name);   // a free slot takes it at once
  return { known: false };
}
// A Bí Công dropped after a win. With Auto Learn it is learned at once; otherwise (or when the Level is too low) it waits in the bag.
function rollBook(st: GameState, src: { el?: string; cls?: string; boost: number }, level: number, rep: Report | undefined, chips: string[]) {
  const g = st.streams;
  if (next(g, 'loot') >= B.bookDropP * src.boost) return;
  const cls = src.cls || pick(g, 'loot', A.CLASSES_BY_EL[src.el || 'Kim']);
  const pool = A.techsOf(cls).filter((t) => t.minLevel <= level + 2);
  const t = pool[weighted(g, 'loot', pool.map((x) => B.bookTierWeights[x.tier]))];   // the higher the tier, the rarer
  let line = `Nhặt được Bí Công «${t.name}» (${A.ART(t.cls).name})`;
  const learned = st.set.autoLearn ? learnTech(st, t.name, rep) : null;
  if (learned) line += learned.known ? `, đã biết chiêu này nên đổi lấy ${learned.stones} Linh Thạch` : ', đã học ngay';
  else { st.inv.books[t.name] = (st.inv.books[t.name] || 0) + 1; line += ', cất vào túi'; }
  chips.push(`Bí Công: ${t.name}`);
  feed(st, { kind: 'book', text: line, chips: [] });
  if (rep) rep.highlights.push({ prio: 55 + t.tier * 10, kind: 'book', text: line });
}
// The player reads a Bí Công from the bag.
export function learnBook(st: GameState, name: string): Res {
  if (typeof name !== 'string' || !(A.isTech(name) || A.isMethod(name))) return fail('E_BAD_SKILL');
  if (!(st.inv.books[name] > 0)) return fail('E_NO_BOOK');
  if (A.isMethod(name)) {
    const x = A.methodOf(name);
    if (levelOf(st.player) < x.minLevel) return fail('E_LEVEL_TOO_LOW', `${x.name} cần Lv${x.minLevel}, ngươi mới Lv${levelOf(st.player)}.`);
    const r = learnMethod(st, name)!;
    st.inv.books[name]--; if (st.inv.books[name] <= 0) delete st.inv.books[name];
    return ok(r.known ? `Đã biết «${name}» từ trước, đổi cuốn kinh lấy ${r.stones} Linh Thạch.` : `Đã học Công Pháp «${name}». Vào tab Thần Thông để đổi sang dùng.`);
  }
  const t = A.TECHS[name];
  if (levelOf(st.player) < t.minLevel) return fail('E_LEVEL_TOO_LOW', `${t.name} cần Lv${t.minLevel}, ngươi mới Lv${levelOf(st.player)}.`);
  const r = learnTech(st, name)!;
  st.inv.books[name]--; if (st.inv.books[name] <= 0) delete st.inv.books[name];
  return ok(r.known ? `Đã biết «${name}» từ trước, đổi Bí Công lấy ${r.stones} Linh Thạch.` : `Đã học «${name}» (${A.ART(t.cls).name}).`);
}
// ---------- Công Pháp (Requirement 18.5 to 18.15): learned from a scroll, one is in use at a time; a change takes effect from the next tick.
function learnMethod(st: GameState, name: string, rep?: Report): { known: boolean; stones?: number } | null {
  const x = A.methodOf(name);
  if (levelOf(st.player) < x.minLevel) return null;
  if (st.arts.methods.includes(name)) return { known: true, stones: earn(st, B.dupBookStones[x.tier], 'drop', rep) };
  st.arts.methods.push(name);
  return { known: false };
}
function rollMethod(st: GameState, level: number, rep: Report | undefined, chips: string[]) {
  const g = st.streams;
  if (next(g, 'loot') >= B.methodDropP) return;
  const pool = A.METHODS.filter((x) => x.minLevel <= level + 2);
  const x = pool[weighted(g, 'loot', pool.map((y) => B.bookTierWeights[y.tier]))];
  let line = `Nhặt được cuốn kinh Công Pháp «${x.name}» (${A.METHOD_TIER[x.tier]})`;
  const learned = st.set.autoLearn ? learnMethod(st, x.name, rep) : null;
  if (learned) line += learned.known ? `, đã biết nên đổi lấy ${learned.stones} Linh Thạch` : ', đã học ngay';
  else { st.inv.books[x.name] = (st.inv.books[x.name] || 0) + 1; line += ', cất vào túi'; }
  chips.push(`Công Pháp: ${x.name}`);
  feed(st, { kind: 'book', text: line, chips: [] });
  if (rep) rep.highlights.push({ prio: 60 + x.tier * 10, kind: 'book', text: line });
}
export function setMethod(st: GameState, name: any): Res {
  if (typeof name !== 'string' || !st.arts.methods.includes(name)) return fail('E_BAD_SKILL');
  st.arts.method = name;
  return ok(`Đã đổi sang Công Pháp «${name}».`);
}
// Choose the techniques of one môn (Requirement 18.10 and 18.11): only known techniques of that môn, no repeats, no more than the slots of the Realm. Nothing changes on an error.
export function setLoadout(st: GameState, cls: string, names: any): Res {
  if (typeof cls !== 'string' || !A.ARTS.some((a) => a.id === cls) || !Array.isArray(names)) return fail('E_BAD_REQUEST');
  if (new Set(names).size !== names.length) return fail('E_BAD_SKILL');
  for (const n of names) if (typeof n !== 'string' || !A.isTech(n) || A.TECHS[n].cls !== cls || !st.arts.learned.includes(n)) return fail('E_BAD_SKILL');
  if (names.length > A.slotsAt(st.player.realm)) return fail('E_SKILL_SLOTS');
  st.arts.loadout[cls] = names;
  return ok('Đã lưu bộ chiêu.');
}

// ---------- combat (Requirement 8). `foe` has stats [maxHp, maxSpirit, atk, def, spd] and a list of Elements.
interface Foe { name: string; stats: number[]; el: string[]; skills?: string[]; level?: number }
// One combat log line. Lines that start with '~' are a JSON record the client draws as a card (components/Battle.tsx); anything else is plain text from older saves.
// t:'open' opens the fight; otherwise r = round, w = who (p you, b your Linh Thú, m the foe), n = name, k = skill, e = element of the attack,
// to = who was hit, d = damage, c = critical, x = element multiplier, s = same-element bonus, h/hm = the target's HP left and its maximum.
const rec = (o: Record<string, unknown>) => '~' + JSON.stringify(o);
// One fighter's skills, Spirit and cooldowns for the length of a fight (Requirement 18). Spirit starts full and comes back a little every round.
// `fx` holds the status effects that sit on this fighter (a guard it cast, a weakening the foe cast on it) and `skip` the actions it still loses to a stun.
interface Eff { amt: number; until: number; team?: boolean }
interface Side { fx: Partial<Record<'guard' | 'atkUp' | 'critUp' | 'atkDown' | 'defDown', Eff>>; skip: number }
interface Caster { defs: C.SkillDef[]; els: string[]; lv: number; sp: number; max: number; last: Map<string, number>; side: Side }
const caster = (names: string[], els: string[], lv: number, max: number): Caster => ({ defs: [...new Set([...names, C.NEUTRAL_SKILL])].map(A.skillOf), els, lv, sp: max, max, last: new Map(), side: { fx: {}, skip: 0 } });
const live = (e: Eff | undefined, r: number) => (e && r <= e.until ? e : undefined);
// What the picker needs to know about the fight: its own health, and the foe's state.
interface Ctx { hp: number; max: number; foe: Side; foeHp: number }
// The best skill that can be used now (level reached, cooldown over, enough Spirit); the free neutral skill is always there as the fallback.
// An attack scores its power times the element multiplier, so a skill that is weak against this foe loses to a plainer one.
// A support skill scores a fixed value, and only when it is useful: heal when hurt, a buff or a guard when it is not already on, a weakening or a stun on a foe that is not yet affected.
function pickSkill(c: Caster, r: number, foeEls: string[], x: Ctx) {
  let best = A.skillOf(C.NEUTRAL_SKILL), bs = -1;
  const hurt = x.hp / Math.max(1, x.max), endgame = x.foeHp < 0.2;
  for (const d of c.defs) {
    if (d.minLevel > c.lv || c.sp < d.spirit || r <= (c.last.get(d.name) ?? -99) + d.cd) continue;
    let sc: number;
    if (d.fx) {
      const k = d.fx.kind;
      if (k === 'heal') { if (hurt >= 0.5) continue; sc = 1.2 + (0.5 - hurt) * 3; }
      else if (endgame) continue;
      else if (k === 'guard') { if (live(c.side.fx.guard, r) || x.foe.skip > 0) continue; sc = 1.3; }
      else if (k === 'atkUp') { if (live(c.side.fx.atkUp, r)) continue; sc = 1.4; }
      else if (k === 'critUp') { if (live(c.side.fx.critUp, r)) continue; sc = 1.25; }
      else if (k === 'atkDown') { if (live(x.foe.fx.atkDown, r)) continue; sc = 1.2; }
      else if (k === 'defDown') { if (live(x.foe.fx.defDown, r)) continue; sc = 1.3; }
      else { if (x.foe.skip > 0) continue; sc = 1.6; }
    } else sc = d.coef * (d.hits || 1) * (d.el && !c.els.includes(d.el) ? B.offElementPenalty : 1) * (d.el ? elemMult(d.el, foeEls) : B.neutralMult);
    if (sc > bs) { bs = sc; best = d; }
  }
  c.sp -= best.spirit; c.last.set(best.name, r);
  return { def: best, off: best.el && !c.els.includes(best.el) ? B.offElementPenalty : 1 };
}
// The môn of the weapon in hand, and the skills it gives: the môn's free basic attack plus the techniques the player slotted (and knows).
export const classOf = (st: Pick<GameState, 'eq'>) => A.weaponClass(st.eq.Weapon && st.eq.Weapon.base);
export function playerSkills(st: Pick<GameState, 'eq' | 'arts'>): string[] {
  const cls = classOf(st);
  if (!cls) return [C.NEUTRAL_SKILL];
  return [A.ART(cls).basic, ...(st.arts.loadout[cls] || []).filter((n) => st.arts.learned.includes(n))];
}
function fightCore(st: GameState, S: ReturnType<typeof pstats>, m: Foe, party: Beast[], reduce = 1) {
  const g = st.streams, p = st.player, log: string[] = [];
  const push = (s: string) => { if (log.length < B.combatLogLines) log.push(s); };
  let mhp = m.stats[0];
  const monster = m.skills && m.skills.length ? m.skills : m.el.flatMap((e) => C.SKILLS[e] || []);
  const foe = caster(monster, m.el, m.level ?? 99, m.stats[1] || 0);
  push(rec({ t: 'open', f: m.name, fe: m.el, fh: m.stats[0], ph: p.hp, pm: S.maxHp }));
  const you = caster(playerSkills(st), p.linh, levelOf(p), S.maxSpirit);
  const pals = party.map((b) => ({ b, el: SP(b.sp).el, c: caster(b.skills, SP(b.sp).el, b.level, b.stats[1] || 0) }));
  const V = B.damageVariance;
  // One technique: `hits` strikes (a bow shoots twice), each ignoring `pierce` of the defence; the numbers are added into one log line.
  const hit = (atk: number, def: number, coef: number, mult: number, crit: number, cd: number, hits = 1, pierce = 0) => {
    let d = 0, c = false;
    for (let k = 0; k < hits; k++) {
      const v = 1 - V + next(g, 'combat') * 2 * V, cr = next(g, 'combat') < crit / 100;
      d += Math.max(B.minDamage, Math.round(atk * coef * mult * v * (atk / (atk + def * (1 - pierce))) * (cr ? cd / 100 : 1) * B.combatPace));
      c = c || cr;
    }
    return { d, c };
  };
  const regen = (c: Caster) => { c.sp = Math.min(c.max, c.sp + Math.round(c.max * B.spiritRegenPct)); };
  // Apply a support skill. `me` is the caster's side and `them` the other one; returns what the log line shows.
  const cast = (def: C.SkillDef, r: number, me: Caster, them: Caster, atk: number) => {
    const fx = def.fx!;
    const until = r + fx.turns - 1;
    if (fx.kind === 'heal') return Math.round(atk * def.coef * B.combatPace * B.healScale);
    if (fx.kind === 'guard' || fx.kind === 'atkUp' || fx.kind === 'critUp') me.side.fx[fx.kind] = { amt: fx.amount, until, team: fx.team };
    else if (fx.kind === 'atkDown' || fx.kind === 'defDown') them.side.fx[fx.kind] = { amt: fx.amount, until };
    else them.side.skip += fx.turns;
    return fx.kind === 'stun' ? fx.turns : fx.kind === 'critUp' ? fx.amount : Math.round(fx.amount * 100);
  };
  let rounds = 0;
  for (let r = 1; r <= B.maxCombatRounds && mhp > 0 && p.hp > 0; r++) {
    rounds = r;
    if (r > 1) { regen(you); regen(foe); for (const x of pals) regen(x.c); }
    for (const who of S.spd >= m.stats[4] ? ['p', 'm'] : ['m', 'p']) {
      if (mhp <= 0 || p.hp <= 0) break;
      if (who === 'p') {
        if (you.side.skip > 0) { you.side.skip--; push(rec({ r, w: 'p', n: 'Ngươi', k: 'Choáng váng', e: '', to: 'Ngươi', d: 0, c: 0, x: 1, s: 0, f: 'skip', ts: 'p', h: p.hp, hm: S.maxHp })); continue; }
        const up = live(you.side.fx.atkUp, r), down = live(you.side.fx.atkDown, r), cu = live(you.side.fx.critUp, r);
        const atk = S.atk * (1 + (up ? up.amt : 0)) * (1 - (down ? down.amt : 0));
        const { def, off } = pickSkill(you, r, m.el, { hp: p.hp, max: S.maxHp, foe: foe.side, foeHp: mhp / m.stats[0] });
        if (def.fx) {
          const a = cast(def, r, you, foe, atk);
          if (def.fx.kind === 'heal') p.hp = Math.min(S.maxHp, p.hp + a);
          const self = def.fx.kind === 'heal';
          push(rec({ r, w: 'p', n: 'Ngươi', k: def.name, e: '', to: self || def.target !== 'Kẻ Địch' ? 'Ngươi' : m.name, d: 0, c: 0, x: 1, s: 0, f: def.fx.kind, a, ts: self ? 'p' : 'm', h: self ? p.hp : Math.max(0, mhp), hm: self ? S.maxHp : m.stats[0] }));
        } else {
          const dd = m.stats[3] * (1 - (live(foe.side.fx.defDown, r)?.amt || 0));
          const mult = def.el ? elemMult(def.el, m.el) : B.neutralMult, same = def.el && p.linh.includes(def.el) ? B.sameElementBonus : 1;
          const h = hit(atk, dd, def.coef * off * same * B.playerCoefScale, mult, S.crit + (cu ? cu.amt : 0) + (def.crit || 0), S.critdmg, def.hits || 1, def.pierce || 0);
          mhp -= h.d;
          push(rec({ r, w: 'p', n: 'Ngươi', k: def.name, e: def.el, to: m.name, d: h.d, c: h.c ? 1 : 0, x: +mult.toFixed(2), s: same > 1 ? 1 : 0, u: def.hits && def.hits > 1 ? def.hits : undefined, h: Math.max(0, mhp), hm: m.stats[0] }));
        }
        for (const x of pals) {
          if (mhp <= 0) break;
          const sk = pickSkill(x.c, r, m.el, { hp: 1, max: 1, foe: foe.side, foeHp: mhp / m.stats[0] }), bm = sk.def.el ? elemMult(sk.def.el, m.el) : B.neutralMult;
          const tu = live(you.side.fx.atkUp, r), team = tu && tu.team ? 1 + tu.amt : 1;
          const bh = hit(x.b.stats[2] * team, m.stats[3] * (1 - (live(foe.side.fx.defDown, r)?.amt || 0)), sk.def.coef * sk.off * B.beastCoefScale, bm, 5, 150);
          mhp -= bh.d;
          push(rec({ r, w: 'b', n: x.b.name, k: sk.def.name, e: sk.def.el || x.el[0], to: m.name, d: bh.d, c: 0, x: +bm.toFixed(2), s: 0, h: Math.max(0, mhp), hm: m.stats[0] }));
        }
      } else {
        if (foe.side.skip > 0) { foe.side.skip--; push(rec({ r, w: 'm', n: m.name, k: 'Choáng váng', e: '', to: m.name, d: 0, c: 0, x: 1, s: 0, f: 'skip', ts: 'm', h: Math.max(0, mhp), hm: m.stats[0] })); continue; }
        const up = live(foe.side.fx.atkUp, r), down = live(foe.side.fx.atkDown, r);
        const atk = m.stats[2] * (1 + (up ? up.amt : 0)) * (1 - (down ? down.amt : 0));
        const { def, off } = pickSkill(foe, r, p.linh, { hp: mhp, max: m.stats[0], foe: you.side, foeHp: p.hp / S.maxHp });
        if (def.fx) {
          const a = cast(def, r, foe, you, atk);
          if (def.fx.kind === 'heal') mhp = Math.min(m.stats[0], mhp + a);
          const self = def.fx.kind === 'heal';
          push(rec({ r, w: 'm', n: m.name, k: def.name, e: '', to: self || def.target !== 'Kẻ Địch' ? m.name : 'Ngươi', d: 0, c: 0, x: 1, s: 0, f: def.fx.kind, a, ts: self ? 'm' : 'p', h: self ? Math.max(0, mhp) : p.hp, hm: self ? m.stats[0] : S.maxHp }));
        } else {
          const guard = live(you.side.fx.guard, r), dd = S.def * (1 - (live(you.side.fx.defDown, r)?.amt || 0));
          const em = def.el ? elemMult(def.el, p.linh) : B.neutralMult, h = hit(atk, dd, def.coef * off * B.foeCoefScale, em, 5 + (def.crit || 0), 150, def.hits || 1, def.pierce || 0);
          const dmg = Math.max(B.minDamage, Math.round(h.d * reduce * (1 - (guard ? guard.amt : 0))));
          p.hp -= dmg;
          push(rec({ r, w: 'm', n: m.name, k: def.name, e: def.el || m.el[0], to: 'Ngươi', d: dmg, c: h.c ? 1 : 0, x: +em.toFixed(2), s: 0, u: def.hits && def.hits > 1 ? def.hits : undefined, h: Math.max(0, p.hp), hm: S.maxHp }));
        }
      }
    }
  }
  const outcome = mhp <= 0 ? 'win' : p.hp <= 0 ? 'lose' : 'draw';
  if (outcome === 'lose') p.hp = 1;
  log.push(outcome === 'win' ? 'Thắng' : outcome === 'lose' ? 'Bại' : 'Hòa (hết hiệp)');   // the verdict is kept even when the log is full
  return { outcome, log, rounds };
}
// Chiến Lực (Bảng Phong Thần): the player's own fighting stats plus the power of the Party that goes into battle.
export function combatPower(st: GameState): number { const S = pstats(st); return S.atk + S.def + S.spd + Math.round(S.maxHp / 8) + bestParty(st).reduce((a, b) => a + b.power, 0); }
export const bestParty = (st: GameState) => st.beasts.slice().sort((a, b) => b.power - a.power).slice(0, B.maxParty);

// ---------- encounters (Requirement 7)
export const tameProb = (st: GameState, sp: C.Species, m: Beast, grade: number) => {
  const d = levelOf(st.player) - m.level;
  return clamp(B.tameBase * sp.tame * C.PERS[m.pers].tame * B.tameGradeMult[grade] * Math.max(0, 1 + B.tameLevelStep * d), B.tameMin, B.tameMax);
};
function matchesFilter(st: GameState, m: Beast, sp: C.Species): boolean {
  const f = st.set.tame;
  if (m.mut && f.alwaysMut) return true;
  if (f.species.length > 0 && !f.species.includes(sp.id)) return false;
  if (!f.sizes.includes(m.cls)) return false;
  if (f.newOnly && (st.best[sp.id]?.tamed || 0) > 0) return false;
  return true;
}
const notable = (st: GameState, m: Beast) => m.mut || !!m.elite || m.cls === 0 || m.cls === 4 || (st.best[m.sp]?.tamed || 0) === 0;
const missed = (m: Beast, why: 'pen' | 'tal', chips: string[], rep?: Report, log?: string[]) => {
  if (rep) { if (why === 'pen') rep.skipPen++; else rep.skipTalisman++; if (m.mut) rep.highlights.push({ prio: 85, kind: 'mutation', text: `Bỏ lỡ ${m.name} Dị Biến (${why === 'pen' ? 'Linh Thú Viên đầy' : 'hết Khế Ước Phù'})`, beast: m, log }); }
  chips.push(why === 'pen' ? 'Linh Thú Viên đầy, bỏ qua' : 'Hết Khế Ước Phù, bỏ qua');
};
// The taming roll itself: spends one Khế Ước Phù of `grade`, draws from the `tame` stream, adds the Linh Thú on success.
function rollTame(st: GameState, m: Beast, sp: C.Species, grade: number, chips: string[], rep?: Report, log?: string[]): boolean {
  st.inv.taming[grade]--;
  const pt = tameProb(st, sp, m, grade);
  if (rep) { rep.used.taming++; rep.tameTry++; }
  if (next(st.streams, 'tame') < pt) {
    const e = st.best[sp.id], first = e.tamed === 0;
    st.beasts.push(m); e.tamed++; if (m.mut) e.mutTamed++;
    if (rep) { rep.tamed++; if (m.mut) rep.mutTamed++; if (first) rep.highlights.push({ prio: 10, kind: 'species', text: `Lần đầu thu phục ${sp.name}`, beast: m }); }
    chips.push(`Thu phục thành công (${Math.round(pt * 100)}%)`);
    if (rep && m.mut) rep.highlights.push({ prio: 95, kind: 'mutation', text: `Thu phục ${m.name} Dị Biến!`, beast: m, log });
    return true;
  }
  chips.push(`Thu phục thất bại (${Math.round(pt * 100)}%)`);
  return false;
}
// After a Victory over a Monster. Auto_Tame on: the filter decides. Auto_Tame off: a notable creature (Dị Biến, Tinh Anh, very small or large, new species) asks the player.
function tryTame(st: GameState, m: Beast, sp: C.Species, chips: string[], rep?: Report, log?: string[]) {
  if (st.set.autoTame) {
    if (!matchesFilter(st, m, sp)) return;
    const g = st.set.tame.grade;
    if (st.beasts.length >= B.penCapacity) return missed(m, 'pen', chips, rep, log);
    if (st.inv.taming[g] <= 0) return missed(m, 'tal', chips, rep, log);
    rollTame(st, m, sp, g, chips, rep, log);
    return;
  }
  if (!notable(st, m)) return;
  if (st.beasts.length >= B.penCapacity) return missed(m, 'pen', chips, rep, log);
  if (st.inv.taming.every((n) => n <= 0)) return missed(m, 'tal', chips, rep, log);
  st.decision = { id: ++st.uid, kind: 'tame', beast: m, log: log || [], until: st.clock + B.tameDecisionSec * 1000 };
  chips.push('Chờ ngươi quyết định thu phục');
}

// One drop roll from the Zone's Drop_Table (Requirement 20.1 to 20.5). Returns a chip for what was given.
function dropOnce(st: GameState, zone: C.Zone, srcLevel: number, luckBonus: number, rep: Report | undefined, from: string, chips: string[]) {
  const g = st.streams, table = zone.drop;
  const e = table[weighted(g, 'loot', table.map((x) => x.w))];
  switch (e.kind) {
    case 'item': giveItem(st, genItem(st, srcLevel, undefined, undefined, luckBonus), rep, from); break;
    case 'stones': { const x = earn(st, int(g, 'loot', e.q[0], e.q[1]) * Math.max(1, Math.floor(srcLevel / 2)), 'drop', rep); chips.push(`+${x} Linh Thạch`); break; }
    case 'taming': { const x = int(g, 'loot', e.q[0], e.q[1]); st.inv.taming[e.grade] += x; if (rep) rep.gain.taming += x; chips.push(`+${x} Khế Ước Phù`); break; }
    case 'pill': { const x = int(g, 'loot', e.q[0], e.q[1]); st.inv.hp[e.grade] += x; if (rep) rep.gain.hp += x; chips.push(`+${x} Hồi Khí Đan`); break; }
    case 'material': { const m = zone.materials[weighted(g, 'loot', zone.materials.map((x) => x.w))]; const x = int(g, 'loot', e.q[0], e.q[1]); st.inv.mat[m.id] = (st.inv.mat[m.id] || 0) + x; if (rep) rep.mats[m.id] = (rep.mats[m.id] || 0) + x; chips.push(`+${x} ${C.MAT(m.id).name}`); break; }
    default: break;
  }
}
const rollDrops = (st: GameState, zone: C.Zone, srcLevel: number, n: number, luckBonus: number, rep: Report | undefined, from: string, chips: string[]) => { for (let k = 0; k < n; k++) dropOnce(st, zone, srcLevel, luckBonus, rep, from, chips); };

function victory(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, level: number, rep: Report | undefined, chips: string[], mult = 1, book?: { el?: string; cls?: string; boost: number }) {
  st.kills++; if (rep) rep.wins++;
  const v = earn(st, Math.round(B.victoryRewardPerLevel * level * mult), 'victory', rep); chips.push(`+${v} Linh Thạch`);
  rollDrops(st, zone, level, B.dropRollCount + (mult > 1 ? 1 : 0), (ph && ph.luck) || 0, rep, '', chips);
  if (book) { rollBook(st, book, level, rep, chips); rollMethod(st, level, rep, chips); }
}
function runMonster(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, rep?: Report) {
  const S = pstats(st), L = levelOf(st.player);
  const m = genBeast(st, zone, ph, L, rep), sp = SP(m.sp);
  if (rep) { rep.encounters++; rep.enc.monster++; if (m.mut) rep.highlights.push({ prio: 90, kind: 'mutation', text: `Gặp ${m.name} Dị Biến!`, beast: m }); }
  const r = fightCore(st, S, { name: m.name, stats: m.stats, el: sp.el, skills: m.skills, level: m.level }, bestParty(st));
  const chips: string[] = [];
  if (r.outcome === 'win') { victory(st, zone, ph, m.level, rep, chips, m.elite ? B.eliteRewardMult : 1, { el: sp.el[0], boost: m.elite || m.mut ? B.bookEliteMult : 1 }); tryTame(st, m, sp, chips, rep, r.log); }
  else if (r.outcome === 'lose') { defeated(st); if (rep) rep.losses++; } else if (rep) rep.draws++;
  feed(st, { kind: 'monster', text: '', beast: m, outcome: r.outcome, chips, log: r.log });
}
// Defeat: Recovery_State and Thương Thế (lower atk, def and spd for a while).
function defeated(st: GameState) { st.recovery = true; st.player.injury = B.injuryTicks; }
const powerOf = (stats: number[]) => stats[2] + stats[3] + stats[4] + Math.round(stats[0] / 8);
function makeNpc(st: GameState, zone: C.Zone): NpcFoe {
  const g = st.streams, L = levelOf(st.player);
  const elite = next(g, 'gen') < B.eliteChance;
  const level = clamp(L + int(g, 'gen', B.npcLevelBonus[0] - 1, B.npcLevelBonus[1]), zone.lv[0], Math.min(zone.lv[1], B.playableLevelCap));
  const pers = int(g, 'gen', 0, C.PERS.length - 1);
  const el = shuffle(g, 'gen', C.EO).slice(0, weighted(g, 'gen', B.linhCountWeights) + 1);
  const name = `${pick(g, 'gen', C.NPC_TITLES)} ${pick(g, 'gen', C.FAMILY)} ${pick(g, 'gen', C.SYL1)}`;
  const stats = [0, 1, 2, 3, 4].map((i) => Math.max(1, Math.round(baseStat(level, i) * (1 + TUNE.z * level) * (1 + C.PERS[pers].dev[i]) * (0.95 + next(g, 'gen') * 0.1) * (elite ? B.eliteStatMult : 1))));
  return { name, level, el, stats, pers, power: powerOf(stats), elite: elite || undefined };
}
// The fight against a Tu Sĩ, after it was accepted or when Auto Fight is on.
function fightNpc(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, npc: NpcFoe, rep?: Report) {
  const S = pstats(st);
  if (rep) { rep.encounters++; rep.enc.npc++; }
  const r = fightCore(st, S, { name: npc.name, stats: npc.stats, el: npc.el, level: npc.level, skills: A.npcSkills(npc.name, npc.el) }, bestParty(st));
  const chips: string[] = [];
  if (r.outcome === 'win') victory(st, zone, ph, npc.level, rep, chips, B.npcRewardMult * (npc.elite ? 1.3 : 1), { cls: A.npcClass(npc.name), boost: npc.elite ? B.bookEliteMult : 1 });
  else if (r.outcome === 'lose') {
    defeated(st); if (rep) rep.losses++;
    const lost = Math.min(st.stones, Math.floor(st.stones * B.robPctOnNpcDefeat));
    if (lost > 0) { spend(st, lost, 'robbed'); if (rep) rep.robbed += lost; chips.push(`Bị cướp ${lost} Linh Thạch`); }
  } else if (rep) rep.draws++;
  const res = r.outcome === 'win' ? 'Thắng' : r.outcome === 'lose' ? 'Bại' : 'Hòa';
  feed(st, { kind: 'npc', text: `${npc.elite ? 'Tinh Anh ' : ''}${npc.name} (Lv${npc.level}, ${npc.el.join('/')}) ${pick(st.streams, 'gen', C.NPC_LINES)}. ${res}.`, outcome: r.outcome, chips, log: r.log });
}
function runNpc(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, rep?: Report) {
  const npc = makeNpc(st, zone);
  if (st.set.autoFight) return fightNpc(st, zone, ph, npc, rep);
  st.decision = { id: ++st.uid, kind: 'npc', npc };   // the player chooses: fight or avoid
  feed(st, { kind: 'npc', text: `${npc.name} (Lv${npc.level}) chặn đường. Chờ ngươi quyết định.`, chips: [] });
}
function runResource(st: GameState, zone: C.Zone, rep?: Report) {
  const g = st.streams;
  const m = zone.materials[weighted(g, 'enc', zone.materials.map((x) => x.w))], q = int(g, 'enc', m.q[0], m.q[1]);
  st.inv.mat[m.id] = (st.inv.mat[m.id] || 0) + q;
  if (rep) { rep.encounters++; rep.enc.resource++; rep.mats[m.id] = (rep.mats[m.id] || 0) + q; }
  feed(st, { kind: 'resource', text: `Hái được ${C.MAT(m.id).name}`, chips: [`+${q} ${C.MAT(m.id).name}`] });
}
function runEvent(st: GameState, zone: C.Zone, ph: C.Phenomenon | null, rep?: Report) {
  const g = st.streams, L = levelOf(st.player), S = pstats(st);
  const keepRecent = Math.max(0, B.eventDistinctWindow - 1);
  let pool = zone.events.map((id) => C.EVENTS.find((e) => e.id === id)!).filter((e) => e && e.lv[0] <= L && L <= e.lv[1]);
  const fresh = pool.filter((e) => !st.recent.includes(e.id));
  if (fresh.length > 0) pool = fresh;
  const ev = pick(g, 'event', pool);
  st.recent.push(ev.id); while (st.recent.length > keepRecent) st.recent.shift();
  const o = ev.out[weighted(g, 'event', ev.out.map((x) => x.w))];
  const chips: string[] = [];
  if (rep) { rep.encounters++; rep.enc.event++; }
  if (o.cpTicks) { const x = cultRate(L) * o.cpTicks; st.player.cp += x; if (rep) rep.cp += x; chips.push(`+${x} Tu Vi`); advance(st, rep); }
  if (o.heal) { st.player.hp = S.maxHp; chips.push('Hồi đầy sinh lực'); }
  if (o.stonesPerLv) { const x = earn(st, int(g, 'event', o.stonesPerLv[0], o.stonesPerLv[1]) * L, 'event', rep); chips.push(`+${x} Linh Thạch`); }
  if (o.taming) { const x = int(g, 'event', o.taming[0], o.taming[1]); st.inv.taming[0] += x; if (rep) rep.gain.taming += x; chips.push(`+${x} Khế Ước Phù`); }
  if (o.hurtPct) { const x = Math.min(st.player.hp - 1, Math.floor(S.maxHp * o.hurtPct)); st.player.hp -= Math.max(0, x); chips.push(`-${Math.max(0, x)} Sinh Lực`); }
  if (o.injure) { st.player.injury = Math.max(st.player.injury || 0, o.injure); chips.push('Thương Thế'); }
  if (o.robPct) { const x = Math.floor(st.stones * o.robPct); if (x > 0) { spend(st, x, 'robbed'); if (rep) rep.robbed += x; chips.push(`-${x} Linh Thạch`); } }
  feed(st, { kind: 'event', text: ev.text, chips });
  if (o.drops) rollDrops(st, zone, L, o.drops, (ph && ph.luck) || 0, rep, 'Kỳ ngộ: ', chips);
  if (rep && ev.rare) rep.highlights.push({ prio: 40, kind: 'event', text: ev.text });
  else if (rep && !ev.bad) rep.highlights.push({ prio: 10, kind: 'event', text: ev.text });
}
export function encounterWeights(zone: C.Zone, ph: C.Phenomenon | null): number[] {
  const m: C.Phenomenon['enc'] = (ph && ph.enc) || {};
  return [zone.enc.monster * (m.monster ?? 1), zone.enc.npc * (m.npc ?? 1), zone.enc.resource * (m.resource ?? 1), zone.enc.event * (m.event ?? 1)];
}

export const upkeepDue = (st: Pick<GameState, 'beasts'>) => st.beasts.reduce((a, b) => a + Math.ceil(b.level / B.upkeepLevelDiv), 0);

// ---------- the tick
export function tick(st: GameState, rep?: Report) {
  const startMs = st.clock;
  st.clock += B.tickSec * 1000; st.tick++;
  if (rep) rep.ticks++;
  const p = st.player, zone = C.ZONE(st.zone), ph = phenomenonAt(zone.id, startMs);
  const S0 = pstats(st), L0 = levelOf(p), mode0 = st.set.mode, demon = p.heartDemon > 0;
  if (rep && ph) rep.phen[ph.name] = (rep.phen[ph.name] || 0) + 1;
  if (rep && st.recovery) rep.recoveryTicks++;
  // Dốn Ngộ is decided at the start of the tick, in Retreat_Mode only
  const epi = mode0 === 'retreat' && next(st.streams, 'cult') < B.epiphanyP;
  // an unanswered taming question lapses after Tame_Decision_Seconds of game time: the creature is let go and the journey goes on
  const dq = st.decision;
  if (dq && dq.kind === 'tame') {
    if (dq.until == null) dq.until = st.clock + B.tameDecisionSec * 1000;   // a question saved before this rule existed
    else if (st.clock >= dq.until) { st.decision = null; feed(st, { kind: 'system', text: `Bỏ qua ${dq.beast.name} (hết thời gian quyết định).` }); }
  }
  if (st.decision) { if (rep) rep.blockedTicks++; }   // the journey waits for the player's answer
  else if (mode0 === 'adventure' && !st.recovery && next(st.streams, 'enc') < B.encounterChance) {
    const k = weighted(st.streams, 'enc', encounterWeights(zone, ph));
    if (k === 0) runMonster(st, zone, ph, rep); else if (k === 1) runNpc(st, zone, ph, rep); else if (k === 2) runResource(st, zone, rep); else runEvent(st, zone, ph, rep);
  }
  // daily content: the day's chronicle headline once, and a journey beat every few minutes of adventure (no random numbers, no game numbers change)
  if (!st.decision) {
    const news = D.newsAt(st.clock);
    if (news && st.dailySeen !== news.day) { st.dailySeen = news.day; feed(st, { kind: 'story', text: news.text }); }
    else if (mode0 === 'adventure' && !st.recovery) { const t = D.taleAt(zone.id, st.clock, st.tick); if (t) feed(st, { kind: 'event', text: t }); }
  }
  // recovery of HP, Auto_Pill, then the Recovery_State check
  const S = pstats(st);
  const regen = mode0 === 'retreat' || st.recovery ? B.recoveryRegen : B.adventureRegen;
  p.hp = Math.min(S.maxHp, p.hp + Math.ceil(S.maxHp * regen));
  if (st.set.autoPill && p.hp < (S.maxHp * st.set.retreatPct) / 100) {
    const g = st.inv.hp.findIndex((n) => n > 0);
    if (g >= 0) { st.inv.hp[g]--; applyHpPill(st, g); if (rep) rep.used.hp++; feed(st, { kind: 'system', text: `Tự dùng Hồi Khí Đan hạng ${g + 1}.` }); }
  }
  if (st.set.mode === 'adventure') {
    if (st.recovery && p.hp >= (S.maxHp * st.set.resumePct) / 100) st.recovery = false;
    else if (!st.recovery && p.hp < (S.maxHp * st.set.retreatPct) / 100) st.recovery = true;
  } else st.recovery = false;
  // Tu Vi at the end of the tick, from the state at its start
  let g = cultRate(L0) * B.linhSpeedByCount[p.linh.length - 1] * p.purity * (1 + S0.cult / 100) * A.methodSpeed(st.arts.method, p.linh) * zone.density * ((ph && ph.cult) || 1)
    * (mode0 === 'retreat' ? B.retreatCultFactor : B.adventureCultFactor) * (epi ? B.epiphanyMult : 1) * (demon ? B.heartDemonFactor : 1);
  g = Math.round(g);
  if (epi) { feed(st, { kind: 'event', text: 'Đốn Ngộ! Tu vi tăng vọt trong khoảnh khắc.' }); if (rep) { rep.epiphanies++; rep.highlights.push({ prio: 10, kind: 'epiphany', text: 'Đốn Ngộ trong lúc bế quan.' }); } }
  p.cp += g; if (rep) rep.cp += g;
  advance(st, rep);
  if (p.heartDemon > 0) p.heartDemon--;
  if ((p.injury || 0) > 0) p.injury!--;
  if (st.beasts.length > 0 && st.tick % B.upkeepEveryTicks === 0) {
    const due = upkeepDue(st), paid = Math.min(due, st.stones);
    if (paid > 0) { spend(st, paid, 'upkeep'); if (rep) rep.upkeep += paid; }
  }
  if (!st.set.autoBreak && !st.decision && st.tick >= st.breakSnooze && atBottleneck(st)) st.decision = { id: ++st.uid, kind: 'break' };
  if (st.set.autoBreak && atBottleneck(st) && p.heartDemon <= 0 && p.hp >= B.autoBreakMinHp * S.maxHp && breakthroughP(st, false) >= B.autoBreakMinProb && (!targetIsTribulation(st) || st.inv.trib > 0)) {
    attemptBreakthrough(st, { pill: false, trib: targetIsTribulation(st), src: 'auto' }, rep);
  }
}

// ---------- state
export function defaultSettings(): Settings {
  const d = B.defaults;
  return { mode: 'adventure', autoTame: d.autoTame, autoEquip: d.autoEquip, autoBreak: d.autoBreak, autoPill: d.autoPill, autoFight: d.autoFight, autoLearn: d.autoLearn, hideRank: false, retreatPct: d.retreatPct, resumePct: d.resumePct, dissolveMax: d.dissolveMax, tame: { species: [], newOnly: false, alwaysMut: true, sizes: [0, 1, 2, 3, 4], grade: 0 } };
}
export function newGame(seed = Math.floor(Math.random() * 2 ** 31), gender?: 'f' | 'm', now = Date.now()): GameState {
  const streams = newStreams(seed);
  const n = weighted(streams, 'gen', B.linhCountWeights) + 1;
  const linh = shuffle(streams, 'gen', C.EO).slice(0, n);
  const player: Player = {
    look: makeLook(streams, gender),
    origin: int(streams, 'gen', 0, C.ORIGINS.length - 1),
    name: `${pick(streams, 'gen', C.FAMILY)} ${pick(streams, 'gen', C.SYL1)} ${pick(streams, 'gen', C.SYL2)}`,
    dao: next(streams, 'gen') < 0.3 ? pick(streams, 'gen', C.DAO) : '', linh, purity: Math.round((0.5 + next(streams, 'gen') * 0.5) * 100) / 100,
    pers: int(streams, 'gen', 0, C.PERS.length - 1), realm: 0, sub: 0, cp: 0, hp: 1, heartDemon: 0,
  };
  const st: GameState = {
    v: 2, seed, streams, tick: 0, clock: now, uid: 0, settleSeq: 0, player, bag: [], stash: [], eq: Object.fromEntries(C.SLOTS.map((s) => [s, null])), beasts: [], best: {},
    stones: 0, inv: { taming: [0, 0, 0, 0], hp: [0, 0, 0], bt: [0, 0, 0, 0], trib: 0, mat: {}, books: {} }, arts: { learned: [], loadout: {}, methods: [A.STARTER_METHOD], method: A.STARTER_METHOD }, pity: { mut: 0, item: 0 }, set: defaultSettings(), recovery: false, zone: C.START_ZONE,
    feed: [], recent: [], kills: 0, pend: {}, ledger: [], ledgerBase: 0, ledgerDaily: [], reqs: {}, reports: [], auditQ: [], decision: null, breakSnooze: 0,
  };
  const origin = C.ORIGINS[player.origin];
  earn(st, B.startingStones + origin.stones, 'starting_grant');
  st.inv.taming[0] = B.startingTaming + origin.talis; st.inv.hp[0] = B.startingHpPills;
  st.eq.Weapon = genItem(st, 1, 0, 'Weapon', 0, true); st.eq.Robe = genItem(st, 1, 0, 'Robe', 0, true);
  initArts(st);
  player.hp = pstats(st).maxHp;
  feed(st, { kind: 'system', text: `${player.name} bắt đầu hành trình tu tiên.` });
  flushLedger(st, 'create', now);
  return st;
}
function newReport(st: GameState, elapsedSec: number): Report {
  return {
    id: '', at: 0, seen: false, ticks: 0, elapsedSec, mode: st.set.mode, zone: st.zone, recoveryTicks: 0, enc: { monster: 0, npc: 0, resource: 0, event: 0 },
    encounters: 0, wins: 0, losses: 0, draws: 0, cp: 0, levels: 0, epiphanies: 0, stones: 0, stonesBy: {}, lostStones: 0, items: [0, 0, 0, 0, 0, 0], stashed: 0, dissolved: 0, dissolvedFull: 0, equipped: 0,
    mats: {}, gain: { taming: 0, hp: 0, trib: 0 }, used: { taming: 0, hp: 0, trib: 0, bt: 0 }, tameTry: 0, tamed: 0, mutTamed: 0, newSpecies: [], skipPen: 0, skipTalisman: 0,
    bt: { ok: 0, fail: 0, lostCp: 0 }, phen: {}, highlights: [], blockedTicks: 0, robbed: 0, upkeep: 0, fromLevel: levelOf(st.player), toLevel: levelOf(st.player), beforeTier: outfitTier(st), afterTier: outfitTier(st),
  };
}
// Simulate `ticks` whole ticks from the Settlement clock. Highlights are ordered by Highlight_Priority; a later event wins a tie (Requirement 4.15).
export function settle(st: GameState, ticks: number, elapsedSec = ticks * B.tickSec): Report {
  const rep = newReport(st, elapsedSec), from = st.tick;
  for (let i = 0; i < ticks; i++) tick(st, rep);
  st.settleSeq++;
  rep.id = `${st.settleSeq}:${from + 1}-${st.tick}`;
  rep.at = st.clock;
  rep.toLevel = levelOf(st.player); rep.afterTier = outfitTier(st);
  rep.highlights = rep.highlights.map((h, i) => ({ h, i })).sort((a, b) => b.h.prio - a.h.prio || b.i - a.i).slice(0, B.highlightLimit).map((x) => x.h);
  return rep;
}
export interface SettleOut { ticks: number; offline: boolean; report: Report | null }
// Settlement up to the server clock `nowMs` (Requirement 3.2, 3.3, 4.2 to 4.7). A clock that reads earlier than the last Settlement changes nothing.
export function settleTo(st: GameState, nowMs: number): SettleOut {
  const e = (nowMs - st.clock) / 1000;
  if (!(e >= B.tickSec)) return { ticks: 0, offline: false, report: null };
  const offline = e >= B.minOfflineSec, cap = B.offlineCapH * 3600;
  const n = Math.floor(Math.min(e, cap) / B.tickSec);
  const rep = settle(st, n, Math.min(e, cap));
  if (e > cap) st.clock = nowMs;
  flushLedger(st, `S${rep.id}`, nowMs);
  if (offline) { st.reports.unshift(rep); const keep = B.reportHistory; if (st.reports.length > keep) st.reports.length = keep; }
  return { ticks: n, offline, report: offline ? rep : null };
}
export const ticksForAbsence = (sec: number) => (sec < B.minOfflineSec ? 0 : Math.floor(Math.min(sec, B.offlineCapH * 3600) / B.tickSec));

// ---------- what the server tells the client that depends on current state (Requirement 6.13, 10.16, 20.14, 31.8)
export function oddsOf(st: GameState, nowMs: number) {
  const R = rates(), zone = C.ZONE(st.zone), ph = phenomenonAt(zone.id, nowMs), luck = effLuck(st, (ph && ph.luck) || 0);
  const ew = encounterWeights(zone, ph), et = ew.reduce((a, b) => a + b, 0);
  const sw = [...C.SPECIES.map((s) => (zone.species[s.id] || 0) * ((ph && ph.species && ph.species[s.id]) || 1)), ...D.dailyWeights(zone.id, nowMs)], stot = sw.reduce((a, b) => a + b, 0);
  const dt = zone.drop.reduce((a, d) => a + d.w, 0);
  const p = st.player, canBreak = levelOf(p) < B.playableLevelCap;
  return {
    luck, tiers: tierProbs(luck), mutP: R.mutP,
    pity: { mut: { c: st.pity.mut, soft: R.mutS, hard: R.mutH }, item: { c: st.pity.item, soft: R.itemS, hard: R.itemH } },
    encounter: ['Yêu Thú', 'Tu Sĩ', 'Tài Nguyên', 'Kỳ Ngộ'].map((n, i) => ({ n, p: ew[i] / et })),
    species: D.allSpecies().map((s, i) => ({ id: s.id, n: s.name, p: stot ? sw[i] / stot : 0 })),
    drops: zone.drop.map((d) => ({ kind: d.kind, p: d.w / dt })),
    dropRolls: B.dropRollCount,
    size: sizeClassProbs(),
    taming: { base: B.tameBase, grades: B.tameGradeMult, min: B.tameMin, max: B.tameMax },
    breakthrough: canBreak ? { noPill: breakthroughP(st, false), pill: breakthroughP(st, true) } : null,
    heartDemon: { factor: B.heartDemonFactor, ticks: B.heartDemonDuration }, epiphany: { p: B.epiphanyP, mult: B.epiphanyMult },
    demoRates: R.boost !== 1,
  };
}
// Probability of each Size_Class under the truncated normal Size_Scale distribution (numeric integral).
export function sizeClassProbs(): number[] {
  const { sizeMean: mu, sizeSigma: s, sizeMin: lo, sizeMax: hi } = B, th = B.sizeClassThresholds, N = 4000;
  const out = [0, 0, 0, 0, 0]; let tot = 0;
  for (let i = 0; i < N; i++) { const x = lo + ((i + 0.5) * (hi - lo)) / N, d = Math.exp(-((x - mu) ** 2) / (2 * s * s)); out[th.filter((t) => x >= t).length] += d; tot += d; }
  return out.map((x) => x / tot);
}
export function zonesView(st: GameState, nowMs: number) {
  const L = levelOf(st.player), slotMs = B.phenomenonSlotSec * 1000;
  return C.ZONES.map((z) => {
    const slot = phenSlot(nowMs), ph = phenomenonInSlot(z.id, slot);
    return { id: z.id, name: z.name, blurb: z.blurb, lv: z.lv, minLevel: z.minLevel, density: z.density, open: z.minLevel <= L, phen: ph ? { name: ph.name, text: ph.text, endsAt: (slot + 1) * slotMs } : null };
  });
}
export const versions = () => ({ balance: BALANCE_VERSION, catalog: CATALOG_VERSION, generator: GENERATOR_VERSION });
