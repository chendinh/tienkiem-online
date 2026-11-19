// Balance_Config: every tunable number of the game lives here (requirements, Appendix B). Game logic reads it and never repeats a value.
// `validateBalance` is what the CI check (scripts/check.ts) runs; a failing rule fails the build.

export const BALANCE_VERSION = 1;
export const CATALOG_VERSION = 1;
export const GENERATOR_VERSION = 1;

export interface Rates { mutP: number; mutS: number; mutH: number; itemS: number; itemH: number; boost: number }

export const BALANCE = {
  version: BALANCE_VERSION,
  // accounts and sessions (Requirement 1, 2)
  passwordMinLength: 8,
  sessionLifetimeSec: 2592000,
  maxActiveSessions: 5,
  passwordResetLifetimeSec: 3600,
  requestRetentionSec: 86400,
  // time (Requirement 3, 4)
  tickSec: 5,
  offlineCapH: 12,
  minOfflineSec: 120,
  onlinePollSec: 10,
  recoveryRegen: 0.04,
  adventureRegen: 0.005,
  epiphanyP: 0.02,
  epiphanyMult: 5,
  retreatCultFactor: 2,
  adventureCultFactor: 1,
  playableLevelCap: 24,
  highlightMinTier: 3,
  highlightLimit: 14,
  reportHistory: 20,
  feedSize: 20,       // the journey list shows only the latest 20 rows (a fight now writes up to three: the fight, what it dropped, the taming result)
  feedLogKeep: 10,   // only the newest journey entries keep their fight log (older ones keep the summary): the logs were most of the save
  // zones (Requirement 6)
  phenomenonSlotSec: 10800,
  phenomenonP: 0.35,
  dropEventSlotSec: 900,   // Thiên/Tiên drop event: a window of this length (15 minutes) in ONE zone, announced in the news
  dropEventP: 0.25,        // chance that a window holds an event
  dropEventMonsterMult: 1.5,   // while the Thiên/Tiên drop event runs in the zone the player is in, the weight of meeting a Linh Thú is raised by 50% (Tu Sĩ and events come less often)
  dropEventBonus: 0.005,    // added to the chance that a drop is Thiên or Tiên while the event runs in the zone the player is in
  questTame: 5,            // the daily quest: tame this many of the day's new creature...
  questCultPct: 0.2,       // ...and receive this share of the Tu Vi needed for the current Level
  eventDistinctWindow: 6,
  // combat (Requirement 8, 14)
  maxParty: 3,
  maxCombatRounds: 60,
  combatPace: 0.5,   // every hit is scaled by this on both sides: the same odds, but more rounds to watch
  minDamage: 1,
  critCap: 0.75,
  damageVariance: 0.1,
  skillSlotsByRealm: [3, 3, 3, 3, 4, 4, 5, 5, 6],   // Skill_Slots_By_Realm (Requirement 18.9): technique slots of each môn pháp, by Realm
  bookTierWeights: [8, 4, 2, 1],         // how often a Bí Công of each tier (Hoàng to Thiên) is the one that drops
  bookDropP: 0.10, bookEliteMult: 1.5,   // chance of a Bí Công after a win; Tinh Anh and Dị Biến foes are likelier
  dupBookStones: [10, 25, 60, 150],      // Linh Thạch for a Bí Công of a technique the player already knows, by tier (Hoàng, Huyền, Địa, Thiên)
  minRetreatPct: 30,             // the character never goes out to fight with less than this share of health, and the retreat setting cannot go below it
  pillMinUse: 0.5,               // an auto pill is used only when what is missing is at least this share of what the pill restores
  daoShare: 1,                   // the share of e-mail addresses that get a đạo hiệu. 1 = everybody (for now, for fun); lower it later and only NEW accounts are affected
  destinyP: 1 / 2400,            // per tick of adventure: the chance that fate puts a person on the road who gives, changes or takes away the character's chức vụ
  startTitleP: 0.35,             // a new character starts with a chức vụ with this chance
  pollSaveTicks: 12,             // an ordinary poll saves only after this many ticks of game time (see service.getGame)
  playerCoefScale: 1.0,
  healScale: 1.0,                // a healing skill restores attack x power x this x the combat pace
  methodAffinityBonus: 0.10,     // Method_Affinity_Bonus: a Công Pháp whose element is in the Linh Căn cultivates faster
  methodStatBias: 0.06,          // Method_Stat_Bias: share of the base stat added to each stat a Công Pháp favours
  methodDropP: 0.015,            // chance of a Công Pháp scroll after a win
  spiritRegenPct: 0.08,        // Spirit that comes back each round, as a share of the maximum
  offElementPenalty: 0.7,      // Off_Element_Penalty (Requirement 18.2): a skill of an element the user does not have
  foeCoefScale: 0.85, beastCoefScale: 0.65,   // keep the damage of foes and Linh Thú near what they did before skills had power, cost and cooldown
  strongMult: 1.5, neutralMult: 1, weakMult: 0.67, sameElementBonus: 1.2,
  combatLogLines: 56,
  // taming (Requirement 9)
  tameBase: 0.35,
  tameGradeMult: [1, 1.5, 2.2, 3],
  tameLevelStep: 0.05,
  tameDecisionSec: 30,         // the server skips the taming question on its own after this long (the journey then goes on). It covers the fight replay, which hides the question
  tameShowSec: 10,             // how long the player sees the question (the countdown starts when the bar appears, after the replay)
  tameMin: 0.02,
  tameMax: 0.95,
  penCapacity: 100,
  // generation (Requirement 15 to 20)
  linhCountWeights: [2, 8, 20, 30, 40],
  linhSpeedByCount: [2.0, 1.6, 1.3, 1.1, 1.0],
  aptMin: 0.8, aptMax: 1.2,
  monsterSkillMin: 2, monsterSkillMax: 4,
  sizeMean: 1, sizeSigma: 0.25, sizeMin: 0.5, sizeMax: 2,
  sizeClassThresholds: [0.65, 0.85, 1.15, 1.5],
  sizeHpCoef: 0.3, sizeSpeedCoef: 0.2,
  mutationStatBonus: 0.15,
  maxPrefix: 3, maxSuffix: 3,
  affixCountByTier: [[0, 0], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] as [number, number][],
  rollFloorByTier: [0, 0, 0.1, 0.25, 0.45, 0.65],
  rarityWeights: [12000, 5600, 1800, 500, 49, 2],   // Thiên (49) is half as common as before (it was 49 out of 10000); the other tiers keep their share
  luckRarityGain: 0.005,
  luckCap: 100,
  itemLevelSpread: 2,
  artVariantsDia: 6,   // Địa items are drawn in this many different looks per kind; Thiên items reuse a picture that already exists (lib/daily.ts, thienLooksFor); only Tiên items always get a picture of their own
  dropRollCount: 1,
  // prototype balancing that Appendix B does not fix
  monsterLevelGrowth: 0.04,   // extra monster strength per Level
  gearScale: 0.85,            // scales item stats
  tribulationWaveStrength: 0.6,
  // difficulty beyond the requirements (the player asked for a harder, less steady journey)
  encounterChance: 0.4,        // chance that a tick in Adventure_Mode meets something (the rest is travelling)
  eliteChance: 0.08, eliteStatMult: 1.35, eliteRewardMult: 2,
  npcLevelBonus: [0, 2] as [number, number],   // a Tu Sĩ is this many Levels above the Zone roll
  npcRewardMult: 1.5,
  injuryTicks: 180, injuryFactor: 0.85, injuryCurePillGrade: 2,   // Thương Thế after a Defeat or a bad Kỳ Ngộ: atk, def and spd are lower until it ends or a grade-3 pill cures it
  robPctOnNpcDefeat: 0.04,
  upkeepEveryTicks: 120, upkeepLevelDiv: 4,   // feeding the Linh Thú in the pen: every 10 minutes each Linh Thú costs ceil(Level / 4) Linh Thạch (a sink; nothing dies when the purse is empty)
  breakSnoozeTicks: 360,       // "Để sau" on the Breakthrough question hides it this long
  // bag and economy (Requirement 21, 24)
  bagCapacity: 100,
  overflowCapacity: 50,
  stoneMax: 1_000_000_000_000,
  stackMax: 9999,
  maxPurchaseQty: 999,
  startingStones: 100,
  startingTaming: 10,
  startingHpPills: 5,
  victoryRewardPerLevel: 1,
  // Tu Vi of a won fight (beast or Tu Sĩ): this many ticks' worth of the base rate, plus victoryCultPerLevel ticks per Level of the foe, +victoryCultGap per Level the foe is above the player
  // (and the same less below, within ±victoryCultGapMax), times the reward multiplier of the foe (elite 2, Tu Sĩ 1.5)
  victoryCultTicks: 2, victoryCultPerLevel: 0.25, victoryCultGap: 0.1, victoryCultGapMax: 0.3,
  dissolveValueByTier: [1, 3, 10, 40, 200, 1000],
  releaseBase: 2,
  releaseSizeFactors: [0.8, 0.9, 1, 1.2, 1.5],
  releaseMutationFactor: 5,
  sellBackRatio: 0.5,
  pillRestore: [0.3, 0.6, 1],
  ledgerRetentionDays: 90,
  ledgerMaxRows: 1500,
  confirmPurchaseThreshold: 1000,
  // cultivation (Requirement 22)
  rate0: 20, rateGrowth: 1.1,
  thresholdMin0: 5, thresholdGrowth: 1.5, thresholdPeak: 1.5,
  baseStats: [100, 60, 14, 10, 10],
  baseStatLevelGrowth: 1.1, baseStatRealmGrowth: 1.25,
  baseCrit: 5, baseCritDmg: 150,
  // breakthrough (Requirement 23)
  breakBase: [0, 0, 0.9, 0.75, 0.6, 0.5, 0.4], // by target Realm number 1..6 (index 0 and 1 unused)
  breakPurityBonus: 0.1,
  breakPillBonus: 0.15,
  breakMin: 0.05, breakMax: 0.95,
  tribulationRealms: [3, 4, 5, 6],
  tribulationWaves: { 3: 3, 4: 4, 5: 5, 6: 6 } as Record<number, number>,
  tribulationReduction: 0.3,
  breakFailureLoss: 0.15,
  heartDemonDuration: 720,
  heartDemonFactor: 0.5,
  // a purer Linh Căn pays for its speed: 0 extra at purity 0.5, the full extra at purity 1.0 (see purityLoad in game.ts)
  purityDemonExtra: 0.5,   // Tâm Ma lasts up to +50% longer
  purityTribExtra: 0.25,   // Thiên Kiếp hits up to +25% harder
  autoBreakMinHp: 0.8,
  autoBreakMinProb: 0.5,
  // player settings defaults (Requirement 1.8)
  // Items go to the bag and the player decides (autoEquip off, no auto-dissolve). Tu Sĩ fights and Linh Thú taming ask the player unless an auto setting is on.
  defaults: { retreatPct: 30, resumePct: 80, autoPill: true, autoTame: false, autoBreak: false, autoEquip: false, autoFight: false, autoLearn: true, dissolveMax: -1 },
  // shop (Requirement 24)
  shop: {
    taming: [30, 120, 500, 2200],
    hp: [20, 60, 200],
    breakthrough: [200, 2000, 15000, 100000, 600000], // target Realm 2, 3, 4, 5, 6
    tribulation: 2000,
  },
};
export type Balance = typeof BALANCE;

// ---- rates. The launch profile is Appendix B. The demo profile (TUTIEN_RATES=demo, server side only) makes rare things show up in minutes while developing.
export function rates(): Rates {
  const demo = typeof process !== 'undefined' && process.env && process.env.TUTIEN_RATES === 'demo';
  return demo
    ? { mutP: 1 / 60, mutS: 200, mutH: 600, itemS: 60, itemH: 150, boost: 6 }
    : { mutP: 1 / 4096, mutS: 4096, mutH: 12288, itemS: 800, itemH: 1600, boost: 1 };
}

// ---- cultivation tables (Appendix B.2): Base_Cultivation_Rate and Cultivation_Threshold by Level
export const cultRate = (L: number) => Math.round(BALANCE.rate0 * Math.pow(BALANCE.rateGrowth, L - 1));
export function cultThreshold(L: number): number {
  const b = BALANCE;
  let minutes = b.thresholdMin0 * Math.pow(b.thresholdGrowth, L - 1);
  if (L % 4 === 0) minutes *= b.thresholdPeak;
  const ticksPerHour = 3600 / b.tickSec;
  return Math.round((ticksPerHour * cultRate(L) * (minutes / 60)) / 10) * 10;
}
export const baseStat = (L: number, i: number) => BALANCE.baseStats[i] * Math.pow(BALANCE.baseStatLevelGrowth, L - 1) * Math.pow(BALANCE.baseStatRealmGrowth, Math.floor((L - 1) / 4));

// ---- validation (CI)
const isInt = (x: any) => Number.isInteger(x);
const inRange = (x: number, a: number, b: number) => x >= a && x <= b;
const nonDecreasing = (a: number[]) => a.every((x, i) => i === 0 || x >= a[i - 1]);
const strictlyIncreasing = (a: number[]) => a.every((x, i) => i === 0 || x > a[i - 1]);

export function validateBalance(b: Balance = BALANCE): string[] {
  const e: string[] = [];
  const need = (ok: boolean, msg: string) => { if (!ok) e.push(msg); };
  // Requirement 3, 4
  need(b.tickSec > 0, 'Tick_Interval phải dương');
  need(b.offlineCapH > 0 && b.minOfflineSec >= 0, 'Offline_Cap hoặc Min_Offline_Seconds không hợp lệ');
  need(inRange(b.epiphanyP, 0, 1) && b.epiphanyMult > 1, 'Epiphany_Probability phải trong [0,1] và Epiphany_Multiplier > 1');
  need(b.recoveryRegen > 0 && b.adventureRegen > 0, 'Regen_Rate phải dương');
  need(b.minRetreatPct >= 1 && b.minRetreatPct <= 90 && b.pillMinUse >= 0 && b.pillMinUse <= 1, 'Min_Retreat_Pct/Pill_Min_Use không hợp lệ');
  need(b.defaults.retreatPct >= b.minRetreatPct && b.defaults.retreatPct < b.defaults.resumePct && b.defaults.resumePct <= 100, 'Retreat_Threshold/Resume_Threshold mặc định phải thỏa 0 < R < S <= 100');
  // Requirement 6
  need(b.dropEventSlotSec > 0 && b.dropEventMonsterMult >= 1 && inRange(b.dropEventP, 0, 1) && inRange(b.dropEventBonus, 0, 1) && isInt(b.questTame) && b.questTame >= 1 && inRange(b.questCultPct, 0, 1), 'Drop_Event hoặc Daily_Quest không hợp lệ');
  need(b.phenomenonSlotSec > 0 && inRange(b.phenomenonP, 0, 1), 'Phenomenon_Slot_Duration hoặc Phenomenon_Probability không hợp lệ');
  need(isInt(b.eventDistinctWindow) && b.eventDistinctWindow >= 1, 'Event_Distinct_Window phải là số nguyên >= 1');
  // Requirement 9, 16, 17
  need(isInt(b.tameDecisionSec) && b.tameDecisionSec >= 1, 'Tame_Decision_Seconds không hợp lệ');
  need(b.tameMin > 0 && b.tameMin <= b.tameMax && b.tameMax <= 1, 'Taming_Min/Max_Probability không hợp lệ');
  need(nonDecreasing(b.tameGradeMult) && b.tameGradeMult.length === 4, 'Hệ số hạng Khế Ước Phù phải gồm 4 giá trị không giảm');
  need(b.aptMin > 0 && b.aptMin <= b.aptMax, 'Aptitude_Min/Max không hợp lệ');
  need(b.monsterSkillMin >= 1 && b.monsterSkillMin <= b.monsterSkillMax, 'Monster_Skill_Count không hợp lệ');
  need(b.sizeMin > 0 && b.sizeMin < b.sizeMax && b.sizeSigma > 0 && inRange(b.sizeMean, b.sizeMin, b.sizeMax), 'Size_Min/Max/Sigma/Mean không hợp lệ');
  need(strictlyIncreasing(b.sizeClassThresholds) && b.sizeClassThresholds.every((x) => x > b.sizeMin && x < b.sizeMax), 'Size_Class_Thresholds phải tăng ngặt trong (Size_Min, Size_Max)');
  need(b.sizeHpCoef >= 0 && b.sizeSpeedCoef >= 0, 'Size_HP/Speed_Coefficient không được âm');
  need(1 + b.sizeHpCoef * (b.sizeMin - 1) > 0, 'Hệ số kích thước của Max_HP phải dương tại Size_Min');
  need(1 - b.sizeSpeedCoef * (b.sizeMax - 1) > 0, 'Hệ số kích thước của Speed phải dương tại Size_Max');
  // Requirement 14
  need(b.skillSlotsByRealm.length === 9 && b.skillSlotsByRealm.every((x, i) => isInt(x) && x >= 1 && (i === 0 || x >= b.skillSlotsByRealm[i - 1])), 'Skill_Slots_By_Realm phải gồm 9 số nguyên >= 1 và không giảm');
  need(b.bookDropP >= 0 && b.bookDropP <= 1 && b.bookEliteMult >= 1 && b.bookTierWeights.length === 4 && b.bookTierWeights.every((x) => x > 0) && b.dupBookStones.length === 4 && b.dupBookStones.every((x) => isInt(x) && x >= 0) && b.playerCoefScale > 0 && b.healScale > 0 && isInt(b.pollSaveTicks) && b.pollSaveTicks >= 1 && b.destinyP >= 0 && b.destinyP <= 1 && b.daoShare >= 0 && b.daoShare <= 1 && b.startTitleP >= 0 && b.startTitleP <= 1 && isInt(b.feedLogKeep) && b.feedLogKeep >= 1 && b.feedLogKeep <= b.feedSize && b.methodAffinityBonus >= 0 && b.methodStatBias >= 0 && b.methodDropP >= 0 && b.methodDropP <= 1, 'Book_* không hợp lệ');
  need(b.offElementPenalty > 0 && b.offElementPenalty < 1 && b.spiritRegenPct >= 0 && b.spiritRegenPct <= 1 && b.foeCoefScale > 0 && b.beastCoefScale > 0, 'Skill_* không hợp lệ');
  need(b.weakMult > 0 && b.weakMult < b.neutralMult && b.neutralMult < b.strongMult && b.sameElementBonus >= 1, 'Element multiplier không hợp lệ');
  // Requirement 19, 20
  need(b.affixCountByTier.length === 6 && b.affixCountByTier.every(([lo, hi]) => 0 <= lo && lo <= hi && hi <= b.maxPrefix + b.maxSuffix)
    && nonDecreasing(b.affixCountByTier.map((x) => x[0])) && nonDecreasing(b.affixCountByTier.map((x) => x[1])), 'Affix_Count_By_Tier không hợp lệ');
  need(b.rollFloorByTier.length === 6 && b.rollFloorByTier.every((x) => x >= 0 && x < 1) && nonDecreasing(b.rollFloorByTier), 'Roll_Floor_By_Tier không hợp lệ');
  need(isInt(b.maxPrefix) && b.maxPrefix > 0 && isInt(b.maxSuffix) && b.maxSuffix > 0, 'Max_Prefix/Suffix_Count phải là số nguyên dương');
  const rw = b.rarityWeights;
  need(rw.length === 6 && rw.every((x) => isInt(x) && x >= 0) && rw.reduce((x, y) => x + y, 0) > 0 && rw[4] + rw[5] > 0, 'Rarity_Weights không hợp lệ');
  need(rw.every((x, i) => i === 0 || x <= rw[i - 1]), 'Rarity_Weights không được tăng khi hạng tăng');
  need(isInt(b.upkeepEveryTicks) && b.upkeepEveryTicks >= 1 && b.upkeepLevelDiv > 0, 'Phí nuôi Linh Thú không hợp lệ');
  need(inRange(b.encounterChance, 0.05, 1) && inRange(b.eliteChance, 0, 1) && b.eliteStatMult >= 1 && b.eliteRewardMult >= 1 && b.npcRewardMult >= 1 && b.injuryFactor > 0 && b.injuryFactor <= 1 && isInt(b.injuryTicks) && b.injuryTicks >= 0 && inRange(b.robPctOnNpcDefeat, 0, 0.5), 'Cấu hình độ khó không hợp lệ');
  need(b.luckRarityGain >= 0 && b.luckCap >= 0 && isInt(b.itemLevelSpread) && b.itemLevelSpread >= 0 && isInt(b.dropRollCount) && b.dropRollCount >= 1, 'Luck/Item_Level_Spread/Drop_Roll_Count không hợp lệ');
  // Requirement 21
  need(isInt(b.bagCapacity) && b.bagCapacity >= 1 && isInt(b.overflowCapacity) && b.overflowCapacity >= 0, 'Bag_Capacity/Overflow_Capacity không hợp lệ');
  need(isInt(b.defaults.dissolveMax) && b.defaults.dissolveMax >= -1 && b.defaults.dissolveMax <= 5 && typeof b.defaults.autoEquip === 'boolean', 'Auto_Dissolve/Auto_Equip mặc định không hợp lệ');
  // Requirement 22
  need(inRange(b.playableLevelCap, 1, 36), 'Playable_Level_Cap phải trong [1,36]');
  let prevT = 0, prevR = 0;
  for (let L = 1; L <= b.playableLevelCap; L++) {
    const t = cultThreshold(L), r = cultRate(L);
    need(isInt(t) && t > prevT, `Cultivation_Threshold(${L}) phải là số nguyên tăng ngặt`);
    need(isInt(r) && r > 0 && r >= prevR, `Base_Cultivation_Rate(${L}) phải là số nguyên dương không giảm`);
    prevT = t; prevR = r;
  }
  need(b.adventureCultFactor > 0 && b.retreatCultFactor > 0, 'Cultivation factor phải dương');
  need(inRange(b.baseCrit / 100, 0, 1) && b.baseCritDmg >= 100, 'Base_Secondary_Stats không hợp lệ');
  { // Base_Stat strictly increasing, and a Realm boundary jumps more than any step inside the previous Realm
    for (let i = 0; i < 5; i++) {
      let prev = 0, maxIn = 0, ok = true;
      for (let L = 1; L <= b.playableLevelCap; L++) {
        const v = Math.round(baseStat(L, i)); if (v <= prev) ok = false;
        if (L > 1) { const d = v - prev; if ((L - 1) % 4 === 0) { if (d <= maxIn) ok = false; maxIn = 0; } else maxIn = Math.max(maxIn, d); }
        prev = v;
      }
      need(ok, `Base_Stat của Stat ${i} phải tăng ngặt, và bước qua ranh giới Realm phải lớn hơn mọi bước trong Realm trước`);
    }
  }
  // Requirement 23
  for (const r of [2, 3, 4, 5, 6]) need(typeof b.breakBase[r] === 'number' && inRange(b.breakBase[r], 0, 1), `Breakthrough_Base_Probability thiếu hoặc ngoài [0,1] ở Realm ${r}`);
  need(inRange(b.breakMin, 0, 1) && inRange(b.breakMax, 0, 1) && b.breakMin <= b.breakMax, 'Breakthrough_Probability_Min/Max không hợp lệ');
  need(b.breakPurityBonus >= 0 && b.breakPillBonus >= 0, 'Breakthrough bonus không được âm');
  need(b.tribulationRealms.every((r) => inRange(r, 2, 6)), 'Tribulation_Realms phải là tập con của Realm 2 đến 6');
  for (const r of b.tribulationRealms) need(isInt(b.tribulationWaves[r]) && b.tribulationWaves[r] >= 1, `Tribulation_Wave_Count thiếu hoặc không hợp lệ ở Realm ${r}`);
  need(b.tribulationWaveStrength > 0 && b.tribulationReduction >= 0 && b.tribulationReduction < 1, 'Tribulation_Wave_Strength/Talisman_Reduction không hợp lệ');
  need(isInt(b.heartDemonDuration) && b.heartDemonDuration >= 1 && b.heartDemonFactor > 0 && b.heartDemonFactor <= 1, 'Heart_Demon không hợp lệ');
  need(b.purityDemonExtra >= 0 && b.purityTribExtra >= 0, 'Purity_Demon/Tribulation_Extra không được âm');
  need(b.breakFailureLoss >= 0 && b.breakFailureLoss < 1, 'Breakthrough_Failure_Loss phải trong [0,1)');
  need(inRange(b.autoBreakMinHp, 0, 1) && inRange(b.autoBreakMinProb, 0, 1), 'Auto_Breakthrough_Min_HP/Probability không hợp lệ');
  // Requirement 24
  const sp = b.shop;
  const posInts = (a: number[]) => a.every((x) => isInt(x) && x > 0);
  need(posInts(sp.taming) && strictlyIncreasing(sp.taming), 'Giá Khế Ước Phù phải là số nguyên dương tăng ngặt');
  need(posInts(sp.hp) && strictlyIncreasing(sp.hp), 'Giá HP_Pill phải là số nguyên dương tăng ngặt');
  need(posInts(sp.breakthrough) && strictlyIncreasing(sp.breakthrough), 'Giá Breakthrough_Pill phải là số nguyên dương tăng ngặt');
  need(isInt(sp.tribulation) && sp.tribulation > 0, 'Giá Tribulation_Talisman không hợp lệ');
  need(b.sellBackRatio >= 0 && b.sellBackRatio < 1, 'Sell_Back_Ratio phải trong [0,1)');
  need(b.dissolveValueByTier.length === 6 && posInts(b.dissolveValueByTier) && nonDecreasing(b.dissolveValueByTier), 'Dissolve_Value_By_Tier không hợp lệ');
  need(isInt(b.victoryRewardPerLevel) && b.victoryRewardPerLevel >= 1, 'Victory_Reward_Per_Level không hợp lệ');
  need(b.victoryCultTicks >= 0 && b.victoryCultPerLevel >= 0 && b.victoryCultGap >= 0 && inRange(b.victoryCultGapMax, 0, 0.9), 'Victory_Cult_* không hợp lệ');
  need(b.pillRestore.length === 3 && strictlyIncreasing(b.pillRestore) && b.pillRestore.every((x) => x > 0 && x <= 1), 'Pill_HP_Restore_By_Grade không hợp lệ');
  need(b.releaseBase > 0 && b.releaseSizeFactors.length === 5 && b.releaseSizeFactors.every((x) => x > 0) && nonDecreasing(b.releaseSizeFactors) && b.releaseMutationFactor >= 1, 'Release_* không hợp lệ');
  need(isInt(b.stoneMax) && b.stoneMax >= 1 && b.stoneMax < Number.MAX_SAFE_INTEGER, 'Spirit_Stone_Max không hợp lệ');
  need(isInt(b.stackMax) && b.stackMax >= 1 && isInt(b.maxPurchaseQty) && b.maxPurchaseQty >= 1 && b.maxPurchaseQty <= b.stackMax, 'Stack_Max/Max_Purchase_Quantity không hợp lệ');
  need(isInt(b.startingStones) && inRange(b.startingStones, 0, b.stoneMax), 'Starting_Spirit_Stone không hợp lệ');
  need(isInt(b.startingTaming) && inRange(b.startingTaming, 0, b.stackMax) && isInt(b.startingHpPills) && inRange(b.startingHpPills, 0, b.stackMax), 'Starting_*_Count không hợp lệ');
  need(isInt(b.ledgerRetentionDays) && b.ledgerRetentionDays >= 1 && 24 * b.ledgerRetentionDays >= b.requestRetentionSec / 3600, 'Economy_Ledger_Retention không hợp lệ');
  need(isInt(b.confirmPurchaseThreshold) && b.confirmPurchaseThreshold > 0, 'Confirm_Purchase_Threshold phải là số nguyên dương');
  // Requirement 1
  need(isInt(b.passwordMinLength) && b.passwordMinLength >= 1 && b.maxActiveSessions >= 1 && b.sessionLifetimeSec > 0, 'Cấu hình tài khoản không hợp lệ');
  return e;
}
