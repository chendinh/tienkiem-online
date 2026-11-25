// Phó Bản: one Dị Thú a day, fought by every cultivator who signed up. The players only tick "Tham gia"; at FIGHT_HOUR (Vietnam time) the server fights the whole
// battle once (this file, no DOM, deterministic from the day and the fighters), stores every blow, and every screen replays the same film from that record
// (lib/raidplay.ts turns it into a timeline, components/RaidScene.tsx draws it). Nothing the player does on the screen changes the result.
//
// A fighter is a SNAPSHOT of the player's fighting numbers (taken when they join, refreshed when they open the screen before the fight), so the fight never has to load saves.
// Fairness between levels: a fighter hits with its own Công Kích (a stronger player does more), but the Dị Thú hurts each one by a share of that fighter's own Sinh Lực,
// lowered by its Phòng Ngự compared with the Phòng Ngự of its level. So a new player is not killed in one blow and still stays for the film.
import * as C from './content';
import * as A from './arts';
import { BALANCE as B, baseStat as baseStatOf } from './balance';
import type { SkillFx } from './skillfx';
import type { LootItem } from './raidloot';

// ---------- the eight Dị Thú (one per element), in the order they come round
export interface BossSkill { name: string; kind: 'strike' | 'sweep' | 'nova'; fx: SkillFx; coef: number /* share of the target's Sinh Lực before Phòng Ngự */ }
export interface Boss {
  id: string; name: string; title: string; el: string; line: string;
  en: string;            // what the creature looks like (the drawing)
  lair: string;          // its lair (the drawing of the empty stage)
  ultEn: string;         // what happens in the clip of its great attack
  idleEn: string;        // how it moves in the loop (breathing, aura)
  at: { x: number; y: number; r: number };   // where the creature is on the 9:16 picture (percent of the width and height) and about how big (radius, percent of the width): blows land there
  skills: [BossSkill, BossSkill, BossSkill];   // strike (one target), sweep (a few), nova (everyone; plays the clip)
  mat: string;           // the material it drops (C.MATERIALS id)
}
const S = (name: string, kind: BossSkill['kind'], fx: SkillFx, coef: number): BossSkill => ({ name, kind, fx, coef });
export const BOSSES: Boss[] = [
  {
    id: 'bachho', name: 'Kim Tinh Bạch Hổ', title: 'Vạn Kiếm Chi Vương', el: 'Kim', line: 'Hổ trắng ngàn năm canh Kiếm Trủng, lông như bạc mài, sau lưng lơ lửng trăm thanh kiếm cổ.',
    en: 'a colossal white tiger demon king with fur like brushed silver, gleaming plates of metal armour along its spine and shoulders, long blade-like sabre fangs, glowing golden eyes, and a fan of ancient floating swords hovering behind its back like a crown',
    lair: 'an ancient sword tomb on a high mountain plateau: thousands of rusted and broken swords stuck in the cracked stone ground, crumbling stone steles, golden light rays breaking through clouds',
    ultEn: 'The giant white tiger roars furiously and a storm of glowing golden flying swords bursts out from behind it and shoots straight toward the camera, metal shards and sparks fill the screen.',
    idleEn: 'its chest heaves with deep breaths, it shifts its weight on its paws, its head turns slowly and it bares its fangs, its tail swishes, its fur ripples in the wind and the floating swords behind it drift and slowly turn',
    at: { x: 55, y: 37, r: 30 }, mat: 'loitinh',
    skills: [S('Bạch Hổ Liệt Trảo', 'strike', { m: 'slash', tex: 'claw', size: 150, shake: 1 }, 0.42), S('Vạn Kiếm Quy Tông', 'sweep', { m: 'rain', tex: 'shard', n: 3, shake: 1 }, 0.2), S('Kim Hổ Phá Thiên', 'nova', { m: 'burst', tex: 'shard', size: 170, shake: 2 }, 0.16)],
  },
  {
    id: 'cuvien', name: 'Thanh Đằng Cự Viên', title: 'Cổ Lâm Bá Chủ', el: 'Mộc', line: 'Vượn khổng lồ ngủ vạn năm trong rừng cổ, rêu xanh phủ kín người, dây leo mọc ra từ vai.',
    en: 'a gigantic ancient ape demon with dark green moss-covered fur, thick vines and blooming white flowers growing over its shoulders and long arms, bark-like plates on its chest, huge fists, glowing emerald eyes',
    lair: 'a primeval forest of colossal ancient trees with roots like stone bridges, glowing green spores floating in the air, shafts of green light through a high canopy, a wide mossy clearing',
    ultEn: 'The giant moss ape beats its chest and slams both fists into the ground, giant thorned vines erupt from the earth and lash straight toward the camera, leaves and splinters fill the screen.',
    idleEn: 'its chest heaves with deep breaths, its huge shoulders rise and fall, it shifts its weight on its knuckles, its head turns slowly and it snarls, the vines on its back sway and leaves and spores drift around it',
    at: { x: 50, y: 35, r: 30 }, mat: 'truc',
    skills: [S('Cự Viên Toái Thạch', 'strike', { m: 'burst', tex: 'palm', size: 150, hit: 'shock_ring', shake: 2 }, 0.44), S('Đằng Mạn Triền Thân', 'sweep', { m: 'aura', tex: 'vine', size: 120 }, 0.19), S('Vạn Mộc Phệ Thiên', 'nova', { m: 'burst', tex: 'vine', size: 180, shake: 2 }, 0.16)],
  },
  {
    id: 'cuuanh', name: 'Cửu Anh Thủy Mãng', title: 'Nộ Hải Yêu Hoàng', el: 'Thủy', line: 'Mãng xà chín đầu dưới đáy Nộ Hải. Mỗi lần nó thức giấc là một trận hồng thủy.',
    en: 'a colossal nine-headed water serpent hydra rising from the sea, deep blue scales edged with glowing aqua, fins like torn sails, water streaming down its necks, nine fierce heads with glowing cyan eyes',
    lair: 'a vast stormy sea between jagged black rocks, huge waves and spray, dark swirling clouds with a single break of pale light, a wide stretch of churning water',
    ultEn: 'All nine heads of the giant sea serpent rear up and roar, then a colossal tidal wave rises behind it and crashes straight toward the camera, water and foam fill the screen.',
    idleEn: 'its nine necks sway and coil slowly, each head turns and hisses, water streams and splashes from its scales, the sea churns around it and spray drifts',
    at: { x: 52, y: 40, r: 32 }, mat: 'ngoc',
    skills: [S('Thủy Mãng Phệ Giảo', 'strike', { m: 'bolt', tex: 'water_swirl', size: 130, shake: 1 }, 0.4), S('Hồng Thủy Triều', 'sweep', { m: 'sweep', tex: 'water_swirl', size: 160, shake: 1 }, 0.2), S('Cửu Anh Nộ Đào', 'nova', { m: 'burst', tex: 'water_swirl', size: 190, shake: 2 }, 0.16)],
  },
  {
    id: 'kylan', name: 'Xích Diễm Hỏa Kỳ Lân', title: 'Viêm Ngục Thần Thú', el: 'Hỏa', line: 'Kỳ lân lửa sinh ra từ lòng núi lửa, bờm là ngọn lửa sống, móng giẫm đâu đá chảy đến đó.',
    en: 'a huge fire qilin with crimson and black scales, a flowing mane and tail of living flame, golden branching antlers, hooves wreathed in fire, smouldering embers rising from its back, fierce glowing eyes',
    lair: 'a volcanic caldera with glowing rivers of lava between black basalt rocks, falling ash, a dark red sky lit from below, a wide flat ledge of cooled lava',
    ultEn: 'The fire qilin rears up on its hind legs and breathes a gigantic torrent of fire that blasts straight toward the camera, flames and embers fill the whole screen.',
    idleEn: 'its chest heaves with deep breaths, it paws the ground, its head turns slowly and smoke curls from its nostrils, its flame mane and tail flicker and flow strongly, embers rise around it',
    at: { x: 50, y: 39, r: 28 }, mat: 'hoatinh',
    skills: [S('Kỳ Lân Liệt Diễm', 'strike', { m: 'bolt', tex: 'flame', size: 130, shake: 1 }, 0.42), S('Phần Thiên Hỏa Vũ', 'sweep', { m: 'rain', tex: 'flame', n: 3, shake: 1 }, 0.2), S('Thiên Hỏa Phần Thế', 'nova', { m: 'burst', tex: 'fire_swirl', size: 190, shake: 2 }, 0.16)],
  },
  {
    id: 'huyenvu', name: 'Huyền Vũ Cự Quy', title: 'Trấn Sơn Thần Quy', el: 'Thổ', line: 'Rùa đen to như núi, mai mọc thông cổ, một con mãng xà đen quấn quanh. Nó bước một bước, đất nứt ba dặm.',
    en: 'a mountain-sized ancient black tortoise whose shell is a craggy mountain covered with pine trees and boulders, a long black serpent coiled around its body with its head raised, glowing amber cracks in the shell and on its thick scaly legs',
    lair: 'a desolate canyon of red-brown cliffs with floating broken rocks, swirling dust in the air, a wide cracked stone floor, low golden sun',
    ultEn: 'The giant mountain tortoise stomps the ground, the earth cracks open and a wave of giant stone spikes erupts and rushes straight toward the camera, rocks and dust fill the screen.',
    idleEn: 'it breathes slowly and heavily, its head and the serpent coiled around it sway and turn, dust and small rocks fall from its shell, the glowing cracks pulse',
    at: { x: 55, y: 39, r: 32 }, mat: 'tinhsa',
    skills: [S('Huyền Vũ Trấn Áp', 'strike', { m: 'burst', tex: 'rock', size: 150, shake: 2 }, 0.42), S('Địa Liệt Sơn Băng', 'sweep', { m: 'burst', tex: 'shock_ring', size: 150, hit: 'rock', shake: 2 }, 0.19), S('Sơn Hà Đảo Huyền', 'nova', { m: 'burst', tex: 'rock', size: 200, shake: 2 }, 0.16)],
  },
  {
    id: 'loibang', name: 'Cửu Thiên Lôi Bằng', title: 'Bão Lôi Chi Dực', el: 'Lôi', line: 'Chim bằng sải cánh che trời, mỗi lần vỗ cánh là một tia sét đánh xuống.',
    en: 'a colossal roc bird of prey with storm-grey and deep violet feathers crackling with lightning, a hooked golden beak, fierce glowing eyes, enormous spread wings, arcs of lightning jumping between its wingtips',
    lair: 'the summit of a storm-wracked stone peak above a sea of black thunderclouds, lightning branching across a violet sky, a wide flat rock ledge',
    ultEn: 'The giant thunder roc spreads its wings and screeches, a storm of lightning bolts rains down and branches straight toward the camera, blinding flashes fill the screen.',
    idleEn: 'it hovers in place beating its huge wings slowly and powerfully, its head turns and it screeches, lightning crackles along its feathers and the clouds swirl',
    at: { x: 52, y: 24, r: 36 }, mat: 'loitinh',
    skills: [S('Lôi Bằng Kích', 'strike', { m: 'rain', tex: 'lightning', n: 1, size: 160, shake: 2 }, 0.42), S('Cuồng Phong Lôi Vũ', 'sweep', { m: 'rain', tex: 'lightning', n: 2, shake: 1 }, 0.2), S('Vạn Lôi Thiên Phạt', 'nova', { m: 'rain', tex: 'lightning', n: 3, size: 190, shake: 2 }, 0.16)],
  },
  {
    id: 'thienlang', name: 'Hàn Nguyệt Thiên Lang', title: 'U Minh Nguyệt Ảnh', el: 'Âm', line: 'Sói trời sống dưới trăng lạnh. Ai nghe tiếng tru của nó, hồn như bị kéo ra khỏi xác.',
    en: 'a gigantic spectral wolf with pale silver and violet fur, a body trailing wisps of ghostly mist, cold glowing white eyes, long frost-covered fangs, a huge full moon behind it',
    lair: 'a frozen ruined temple courtyard at night under a huge pale moon, broken stone pillars, violet mist drifting across a wide snowy stone floor',
    ultEn: 'The giant ghost wolf howls at the moon, then a wave of ghostly violet shadow wolves charges straight toward the camera, mist and frost fill the screen.',
    idleEn: 'its chest heaves with deep breaths, it lowers its head and growls, its ears twitch, its fur and the ghostly mist around it flow strongly, its eyes glow',
    at: { x: 50, y: 36, r: 24 }, mat: 'uminh',
    skills: [S('Nguyệt Ảnh Trảo', 'strike', { m: 'slash', tex: 'claw', size: 150, shake: 1 }, 0.42), S('U Minh Lang Khiếu', 'sweep', { m: 'sweep', tex: 'shadow', size: 160, shake: 1 }, 0.2), S('Thiên Lang Thực Nguyệt', 'nova', { m: 'burst', tex: 'moon', size: 190, shake: 2 }, 0.16)],
  },
  {
    id: 'suvuong', name: 'Thánh Quang Sư Vương', title: 'Đại Nhật Kim Thân', el: 'Dương', line: 'Sư tử vàng mang vầng nhật sau lưng. Nó gầm một tiếng, mây ngàn dặm tan thành ánh sáng.',
    en: 'a majestic colossal golden lion with a radiant mane like flames of sunlight, white and gold armour plates on its chest and legs, a blazing sun halo behind its head, glowing golden eyes',
    lair: 'a celestial palace terrace high above golden clouds at sunrise, giant white jade pillars and broken arches, a wide marble floor, rays of sunlight',
    ultEn: 'The golden lion roars and a blinding beam of sunlight blasts from its mouth straight toward the camera, golden light and sparks fill the screen.',
    idleEn: 'its chest heaves with deep breaths, its head turns slowly and it bares its fangs, its radiant mane flows strongly, the sun halo behind it pulses and light motes drift',
    at: { x: 54, y: 37, r: 26 }, mat: 'tinhsa',
    skills: [S('Sư Vương Hống', 'strike', { m: 'bolt', tex: 'sound', size: 140, hit: 'shock_ring', shake: 1 }, 0.4), S('Liệt Nhật Quang Luân', 'sweep', { m: 'sweep', tex: 'sun', size: 150, shake: 1 }, 0.2), S('Đại Nhật Phá Hư', 'nova', { m: 'beam', tex: 'beam', size: 300, shake: 2 }, 0.16)],
  },
];
export const BOSS = (id: string) => BOSSES.find((b) => b.id === id) || BOSSES[0];
// The pictures and clips of a Dị Thú (scripts/gen-raid.ts): the empty lair, the lair with the creature in it, a looping clip of it alive, and the clip of its great attack.
export const raidArt = (id: string, what: 'bg' | 'boss' | 'loop' | 'ult' | 'poster') => `/art/raid/${id}/${what}.${what === 'loop' || what === 'ult' ? 'mp4' : 'jpg'}`;

// ---------- the day
// A raid day runs on Vietnam time (UTC+7). Signing up is open from midnight until the fight; the fight is at FIGHT_HOUR; the film and the rewards stay until the next fight.
export const TZ_MS = 7 * 3600 * 1000;
export const FIGHT_HOUR = 20;
export const DAY_MS = 86400 * 1000;
export const raidDay = (ms: number) => new Date(ms + TZ_MS).toISOString().slice(0, 10);
const dayIndex = (day: string) => Math.round(Date.parse(day + 'T00:00:00Z') / DAY_MS);
/** When the fight of a day starts (ms). `minute` moves it (minutes after midnight, Vietnam time), for testing. */
export const fightAtOf = (day: string, minute = FIGHT_HOUR * 60) => Date.parse(day + 'T00:00:00Z') - TZ_MS + minute * 60000;
export const bossOfDay = (day: string): Boss => BOSSES[((dayIndex(day) % BOSSES.length) + BOSSES.length) % BOSSES.length];
/** True for a few minutes from the fight time (the screen's clock; the server may move the time with RAID_FIGHT_MINUTE, the badge does not know). */
export const raidLive = (ms: number) => { const t = ms - fightAtOf(raidDay(ms)); return t >= 0 && t < 3 * 60000; };
export const prevDay = (day: string) => new Date(Date.parse(day + 'T00:00:00Z') - DAY_MS).toISOString().slice(0, 10);

// ---------- a fighter
/** What the fight needs of one player, taken from the save. `pid` is the public id (lib/server/ranking.ts), never the account id. */
export interface Fighter {
  pid: string; name: string; g: 'f' | 'm'; arch: string; hair: number; level: number; realm: number; sub: number; el: string; cls: string;
  skills: string[]; atk: number; def: number; spd: number; hp: number; crit: number; critdmg: number; power: number; av?: string;
}
/** The kind of cultivator a player looks like on the stage (components/Cultivator.tsx), from the môn of the weapon and the element. */
export const archOf = (cls: string, el: string) => (el === 'Âm' ? 'Ma Tu' : cls === 'kiem' ? 'Kiếm Tu' : cls === 'dao' || cls === 'quyen' ? 'Thể Tu' : cls === 'phat' ? 'Phù Sư' : cls === 'cam' || cls === 'tieu' ? 'Đan Sư' : 'Tán Tu');
// The Phòng Ngự a player of this level has with no gear: a fighter with more takes less from the Dị Thú.
const baseDef = (level: number) => Math.max(1, Math.round(baseStatOf(level, 3)));

// ---------- the record of the fight (what the film plays)
/** One fighter's action. i: fighter, k: index in its skills, d: damage to the Dị Thú, c: critical, f: support effect, t: ally healed, h: that ally's Sinh Lực after. */
export interface FAct { i: number; k: number; d: number; c?: 1; f?: C.FxKind; t?: number; h?: number }
/** The Dị Thú's action. s: index of its skill (0 strike, 1 sweep, 2 nova), t: targets, d: damage to each, h: their Sinh Lực after, ko: who fell. stun: it lost the turn. */
export interface BAct { s: 0 | 1 | 2; t: number[]; d: number[]; h: number[]; ko: number[]; stun?: 1; g?: 1 /* a shield took part of it */ }
export interface Round { r: number; f: FAct[]; b: BAct | null; hp: number /* the Dị Thú's Sinh Lực after this round */; rage?: 1 /* it went berserk this round */; bite?: number /* the fighter it bit this round (gone at once) */ }
export interface Result { win: boolean; rounds: Round[]; max: number; dmg: number[]; ko: number[] /* round each fighter fell in (0: stood to the end) */; mvp: number }

export const MAX_ROUNDS = 14;
export const RAGE_AT = 0.3;      // under this share of its Sinh Lực the Dị Thú goes berserk
export const RAGE_MULT = 1.3;
// How hard it is. How often a group wins is set by its size (WIN_CURVE, 2026-11-26): alone 15% of the days, 4 together 30%, 6: 40%, 10: 45%, 20 and more 50%, never
// more; in between on a straight line. The day decides first whether the group wins, the Dị Thú's Sinh Lực is then set so the fight ends that way (bossStats). From a
// few (well geared, with support) to half (new players with their starting techniques) of the cultivators fall; the fights go to the last rounds.
export const WIN_CURVE: readonly (readonly [number, number])[] = [[1, 0.15], [4, 0.3], [6, 0.4], [10, 0.45], [20, 0.5]];
export function winChance(n: number): number {
  const c = WIN_CURVE;
  if (n <= c[0][0]) return c[0][1];
  for (let k = 1; k < c.length; k++) if (n <= c[k][0]) { const [a, pa] = c[k - 1], [b, pb] = c[k]; return pa + ((pb - pa) * (n - a)) / (b - a); }
  return c[c.length - 1][1];
}
/** Whether the group wins on this day: the days take turns (a golden-ratio sequence over the days, not a die), so over any run of days a group wins as often as
 *  winChance says, give or take two wins (measured over ten years, runs of 7 to 60 days): no lucky streak above it, at most two wins in a row. */
export function winsOn(day: string, n: number): boolean {
  const t = Date.parse(`${day}T00:00:00Z`);
  const u = Number.isFinite(t) ? (((Math.round(t / 86400000) * 0.6180339887498949) % 1) + 1) % 1 : rng(`raid|win|${day}`)();
  return u < winChance(n);
}
export const BOSS_POWER = 0.7;   // all the Dị Thú's blows, as a share of each target's own Sinh Lực (see battle)
// The Dị Thú's Sinh Lực: a share of what the group deals in this very fight against a Dị Thú that cannot fall: drawn in WIN_SHARE on a day it is won (it falls late in
// the fight), in LOSE_SHARE on a day it is lost (it flees with a little of its Sinh Lực left); then the fight is fought, and the share moved until it ends as decided.
export const WIN_SHARE: readonly [number, number] = [0.74, 0.93], LOSE_SHARE: readonly [number, number] = [1.05, 1.25];
// A group that keeps its shields up, weakens the Dị Thú and heals would take next to nothing: the Dị Thú's blows grow by what that support took away in the measuring
// fight, to the power SUPPORT_PAYS, at most TEAM_POW times (support still pays: heals and shields work hardest when the blows are hardest). A group with no support
// (new players: starting techniques only) gets no more.
export const SUPPORT_PAYS = 1.0, TEAM_POW = 6;
// The cultivators' blows in a Phó Bản count this many times (2026-11-26: bigger numbers on the stage). The Dị Thú's Sinh Lực is measured from them (bossStats), so it
// grows with them: the same odds, the same fight.
export const HIT_MULT = 2;
export const STUN_GUARD = 3;   // after losing a turn to a stun the Dị Thú shakes stuns off for this many rounds
export const NOVA_EVERY = 4;
// The bite (2026-11-26): from round 2, in a round that is not its great attack and not stunned, the Dị Thú may bite one cultivator standing, any of them: it falls at once,
// whatever its Sinh Lực. Never the last one standing (a lone cultivator is not ended by a bite). Which one is drawn at random among those standing (not by Sinh Lực,
// not by damage), so whoever it bites keeps the damage dealt before it. How often grows with the size of the group: each round BITE_BASE plus BITE_STEP for each
// doubling of the group, at most BITE_MAX; BITE_RAGE times that once it has gone berserk. So a few cultivators are bitten in under half of their fights, a crowd in
// nearly every one, two or three times.
export const BITE_BASE = 0.02, BITE_STEP = 0.03, BITE_MAX = 0.28, BITE_RAGE = 1.5;
export const biteChance = (n: number, rage: boolean) => Math.min(BITE_MAX, BITE_BASE + BITE_STEP * Math.log2(Math.max(2, n))) * (rage ? BITE_RAGE : 1);
export const STRIKE_FRAC = 0.2, SWEEP_FRAC = 0.45;     // its great attack comes in rounds 3, 7, 11 (then every 4)

// A small deterministic random number generator (mulberry32), seeded from the day: the same fight is fought the same way every time it is computed.
export function rng(seed: string) {
  let a = 0; for (let i = 0; i < seed.length; i++) a = (Math.imul(a ^ seed.charCodeAt(i), 2654435761) + i) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// Strong against the next two elements of the ring, weak against the two before (lib/game.ts elemMult, kept here without the save's numbers).
export function elMult(att: string, def: string): number {
  if (!att || !def) return 1;
  const i = C.EO.indexOf(att), j = C.EO.indexOf(def);
  if (i < 0 || j < 0) return 1;
  const d = (j - i + C.EO.length) % C.EO.length;
  return d === 1 || d === 2 ? B.strongMult : d === C.EO.length - 1 || d === C.EO.length - 2 ? B.weakMult : 1;
}
export const skillOfFighter = (f: Fighter, k: number) => A.skillOf(f.skills[k] || C.NEUTRAL_SKILL);

/** About what one fighter deals per round to this Dị Thú: its attack techniques picked as the fight picks them (the best ready one, cooldowns counted), with its element,
 *  its critical hits and the armour they ignore. Support techniques count as nothing. */
export function expectedPerRound(f: Fighter, boss: Pick<Boss, 'el'>, def: number): number {
  const cd: Record<number, number> = {};
  let sum = 0;
  const crit = 1 + (Math.min(100, f.crit) / 100) * (f.critdmg / 100 - 1);
  for (let r = 1; r <= 12; r++) {
    let best = -1, pick = 0;
    f.skills.forEach((_, k) => { if ((cd[k] || 0) > r) return; const s = skillOfFighter(f, k); if (s.fx) return; const v = s.coef * (s.hits || 1) * elMult(s.el || f.el, boss.el) * (f.atk / (f.atk + def * (1 - (s.pierce || 0)))); if (v > best) { best = v; pick = k; } });
    if (best < 0) continue;
    const s = skillOfFighter(f, pick); if (s.cd) cd[pick] = r + s.cd + 1;
    sum += f.atk * best * crit;
  }
  return (sum / 12) * B.combatPace * HIT_MULT;
}
/** The Dị Thú's Sinh Lực and Phòng Ngự for these fighters. The Sinh Lực is measured, not guessed: the group first fights a Dị Thú that cannot fall (its techniques, its
 *  buffs and heals, its losses to the Dị Thú's blows all count, whatever its size), and the Dị Thú gets a share of what they dealt, chosen so the day ends as winsOn
 *  decided (checked by fighting it). So the odds are winChance's, whatever the group's strength. */
export function bossStats(fs: Fighter[], day: string, boss: Boss) {
  const r = rng(`raid|hp|${day}`);
  const avgAtk = fs.reduce((a, f) => a + f.atk, 0) / Math.max(1, fs.length);
  const def = Math.round(avgAtk * 0.55);
  const dry = battle(boss, fs, `${day}|dry`, Infinity, def, 1);
  // how much of its blows the group's shields, weakening and heals took away in that fight: the Dị Thú hits that much harder (part of it: support still pays)
  const kept = dry.press.want > 0 ? clamp((dry.press.took - dry.press.healed) / dry.press.want, 0.15, 1) : 1;
  const pow = Math.min(TEAM_POW, (1 / kept) ** SUPPORT_PAYS);
  // the same fight (same day, same blows) against a Dị Thú that cannot fall: what this group deals in it
  const win = winsOn(day, fs.length), full = battle(boss, fs, day, Infinity, def, pow), dealt = full.dmg.reduce((a, d) => a + d, 0);
  const [lo, hi] = win ? WIN_SHARE : LOSE_SHARE;
  let share = lo + r() * (hi - lo), hp = 0;
  for (let k = 0; k < 8; k++) {
    hp = Math.max(100 * HIT_MULT, Math.round(dealt * share));
    if (battle(boss, fs, day, hp, def, pow).win === win) break;
    share *= win ? 0.9 : 1.1;   // a Dị Thú gone berserk can turn a fight: a little frailer (sturdier) and again
  }
  return { hp, def, pow, win };
}

/** The whole fight. Fighters act fastest first, then the Dị Thú answers. Deterministic from the day and the fighters. hpMul (the demo stage only, lib/raiddemo.ts)
 *  makes the Dị Thú sturdier or frailer, to show a given ending. */
export function fight(boss: Boss, fs: Fighter[], day: string, hpMul = 1): Result {
  const bs = bossStats(fs, day, boss);
  const { win, rounds, max, dmg, ko, mvp } = battle(boss, fs, day, hpMul === 1 ? bs.hp : Math.max(100 * HIT_MULT, Math.round(bs.hp * hpMul)), bs.def, bs.pow);
  return { win, rounds, max, dmg, ko, mvp };
}
/** The fight against a Dị Thú of this Sinh Lực and Phòng Ngự, its blows times pow. Also how hard it pressed: the Sinh Lực its blows would have taken (want), what they took
 *  (took) and what the heals gave back (healed). */
function battle(boss: Boss, fs: Fighter[], seed: string, max: number, bossDef: number, teamPow: number): Result & { press: { want: number; took: number; healed: number } } {
  const press = { want: 0, took: 0, healed: 0 };
  const rnd = rng(`raid|fight|${seed}|${fs.length}`);
  let hp = max, rage = false, stun = 0, stunFree = 1;   // after it loses a turn the Dị Thú shakes off stuns for STUN_GUARD rounds (else a big group, someone always ready, would keep it stunned)
  const cur = fs.map((f) => f.hp), dmg = fs.map(() => 0), ko = fs.map(() => 0), cd = fs.map(() => ({} as Record<number, number>));
  const order = fs.map((_, i) => i).sort((a, b) => fs[b].spd - fs[a].spd || a - b);
  let atkUp = { amt: 0, until: 0 }, guard = { amt: 0, until: 0 }, critUp = { amt: 0, until: 0 }, defDown = { amt: 0, until: 0 }, atkDown = { amt: 0, until: 0 };
  const rounds: Round[] = [];
  const alive = () => order.filter((i) => cur[i] > 0);
  for (let r = 1; r <= MAX_ROUNDS && hp > 0 && alive().length; r++) {
    const round: Round = { r, f: [], b: null, hp };
    for (const i of order) {
      if (hp <= 0) break;
      if (cur[i] <= 0) continue;
      const f = fs[i];
      // the skill: the strongest attack that is ready; a heal when an ally is low; a support skill when its effect is not running
      let pick = 0;
      const ready = f.skills.map((_, k) => k).filter((k) => (cd[i][k] || 0) <= r);
      const low = alive().filter((j) => cur[j] < fs[j].hp * 0.5).sort((a, b) => cur[a] / fs[a].hp - cur[b] / fs[b].hp);
      const sup = ready.filter((k) => skillOfFighter(f, k).fx);
      const heal = sup.find((k) => skillOfFighter(f, k).fx!.kind === 'heal');
      const other = sup.find((k) => { const x = skillOfFighter(f, k).fx!.kind; return x !== 'heal' && ((x === 'atkUp' && atkUp.until < r) || (x === 'guard' && guard.until < r) || (x === 'critUp' && critUp.until < r) || (x === 'defDown' && defDown.until < r) || (x === 'atkDown' && atkDown.until < r) || (x === 'stun' && !stun && r >= stunFree)); });
      if (heal !== undefined && low.length) pick = heal;
      else if (other !== undefined && rnd() < 0.6) pick = other;
      else { let best = -1; for (const k of ready) { const s = skillOfFighter(f, k); if (s.fx) continue; const v = s.coef * (s.hits || 1) * elMult(s.el, boss.el); if (v > best) { best = v; pick = k; } } }
      const s = skillOfFighter(f, pick);
      if (s.cd) cd[i][pick] = r + s.cd + 1;
      if (s.fx) {
        const x = s.fx.kind, turns = Math.max(1, s.fx.turns);
        const act: FAct = { i, k: pick, d: 0, f: x };
        if (x === 'heal') {
          const t = low[0] ?? i, amt = Math.round(fs[t].hp * clamp(0.18 + s.coef * 0.06, 0.2, 0.4));
          press.healed += Math.min(fs[t].hp, cur[t] + amt) - cur[t];
          cur[t] = Math.min(fs[t].hp, cur[t] + amt); act.t = t; act.h = cur[t];
        } else if (x === 'atkUp') atkUp = { amt: Math.max(atkUp.amt * (atkUp.until >= r ? 1 : 0), s.fx.amount), until: r + turns };
        else if (x === 'guard') guard = { amt: Math.max(guard.amt * (guard.until >= r ? 1 : 0), Math.min(0.5, s.fx.amount)), until: r + turns };
        else if (x === 'critUp') critUp = { amt: s.fx.amount, until: r + turns };
        else if (x === 'defDown') defDown = { amt: s.fx.amount, until: r + turns };
        else if (x === 'atkDown') atkDown = { amt: s.fx.amount, until: r + turns };
        else if (x === 'stun') stun = 1;
        round.f.push(act);
        continue;
      }
      // an attack: the player's own Công Kích, the element against the Dị Thú, critical hits, a little luck
      const up = atkUp.until >= r ? 1 + atkUp.amt : 1, dd = bossDef * (1 - (defDown.until >= r ? defDown.amt : 0)) * (1 - (s.pierce || 0));
      let d = 0, c = false;
      for (let h = 0; h < (s.hits || 1); h++) {
        const v = 0.88 + rnd() * 0.24, cr = rnd() < (f.crit + (critUp.until >= r ? critUp.amt : 0) + (s.crit || 0)) / 100;
        const atk = f.atk * up;
        d += Math.max(1, Math.round(atk * s.coef * elMult(s.el || f.el, boss.el) * v * (atk / (atk + dd)) * (cr ? f.critdmg / 100 : 1) * B.combatPace * HIT_MULT));
        c = c || cr;
      }
      hp = Math.max(0, hp - d); dmg[i] += d;
      round.f.push({ i, k: pick, d, ...(c ? { c: 1 as const } : {}) });
    }
    // the Dị Thú answers
    if (hp > 0) {
      if (!rage && hp < max * RAGE_AT) { rage = true; round.rage = 1; }
      if (!stun && r >= 2 && r % NOVA_EVERY !== 3) {
        const up = alive();
        if (up.length > 1 && rnd() < biteChance(fs.length, rage)) { const j = up[Math.floor(rnd() * up.length)]; cur[j] = 0; ko[j] = r; round.bite = j; }
      }
      const live = alive();
      const kind: 0 | 1 | 2 = r % NOVA_EVERY === 3 ? 2 : r % 2 === 0 && live.length > 1 ? 1 : 0;
      if (stun) { stun = 0; stunFree = r + 1 + STUN_GUARD; round.b = { s: kind, t: [], d: [], h: [], ko: [], stun: 1 }; }
      else if (live.length) {
        const sk = boss.skills[kind];
        // who: the nova hits everyone; a sweep about 45% of those standing, a strike about 20% (at least one), more often the ones that hurt it most.
        // `share` keeps what each fighter takes per round the same whatever the size of the group: a lone fighter is hit by every blow, but softer.
        const frac = kind === 2 ? 1 : kind === 1 ? SWEEP_FRAC : STRIKE_FRAC;
        const n = clamp(Math.round(live.length * frac), 1, live.length), share = Math.min(1, (live.length * frac) / n);
        let targets: number[];
        if (kind === 2) targets = live;
        else {
          const w = live.map((j) => 1 + (dmg[j] / Math.max(1, max - hp)) * live.length * (kind === 0 ? 1 : 0.3)), pool = live.slice();
          targets = [];
          while (targets.length < n && pool.length) { let x = rnd() * pool.reduce((a, j) => a + w[live.indexOf(j)], 0), q = 0; for (; q < pool.length - 1; q++) { x -= w[live.indexOf(pool[q])]; if (x <= 0) break; } targets.push(pool.splice(q, 1)[0]); }
        }
        const b: BAct = { s: kind, t: targets, d: [], h: [], ko: [] };
        const sh = guard.until >= r ? guard.amt : 0, soft = atkDown.until >= r ? 1 - atkDown.amt : 1;
        if (sh) b.g = 1;
        for (const j of targets) {
          const f = fs[j], ratio = clamp(f.def / baseDef(f.level), 0.5, 3);
          const pct = BOSS_POWER * teamPow * sk.coef * share * (rage ? RAGE_MULT : 1) * clamp(1.15 - 0.15 * ratio, 0.7, 1.1) * elMult(boss.el, f.el) * (0.85 + rnd() * 0.3) * soft * (1 - sh);
          const d = Math.max(1, Math.round(f.hp * pct));
          press.want += f.hp * (pct / Math.max(0.05, soft * (1 - sh))); press.took += Math.min(cur[j], d);
          cur[j] = Math.max(0, cur[j] - d);
          b.d.push(d); b.h.push(cur[j]);
          if (cur[j] <= 0) { b.ko.push(j); ko[j] = r; }
        }
        round.b = b;
      }
    }
    round.hp = hp;
    rounds.push(round);
  }
  const mvp = dmg.reduce((bi, d, i) => (d > dmg[bi] ? i : bi), 0);
  return { win: hp <= 0, rounds, max, dmg, ko, mvp, press };
}

// ---------- rewards
export interface Reward { stones: number; goods: { key: string; qty: number }[]; rank: number; share: number; items?: LootItem[] /* the Thiên prize pieces this fighter got (lib/raidloot.ts) */ }
/** What one fighter gets: Linh Thạch by level, more for a win and for a bigger share of the damage; goods for a win; a Bí Kíp of the Dị Thú's element for the best three of a win. */
export function rewardOf(boss: Boss, res: Result, fs: Fighter[], i: number, day: string): Reward {
  const f = fs[i], n = fs.length;
  const order = fs.map((_, j) => j).sort((a, b) => res.dmg[b] - res.dmg[a] || a - b), rank = order.indexOf(i) + 1;
  const share = res.dmg[i] / Math.max(1, res.dmg.reduce((a, b) => a + b, 0));
  const c = clamp(share * n, 0, 3);   // 1 = an average share
  const stones = Math.round(f.level * (res.win ? 120 : 50) * (0.7 + 0.3 * c) * (rank === 1 && n > 1 ? 1.5 : 1));
  const goods: Reward['goods'] = [];
  if (res.win) {
    goods.push({ key: 'shop:taming1', qty: 2 }, { key: 'shop:hp1', qty: 2 }, { key: `mat:${boss.mat}`, qty: 3 + Math.min(5, Math.floor(c * 2)) });
    const r = rng(`raid|book|${day}|${f.pid}`)();
    if (rank <= 3 && (rank === 1 || r < 0.5)) {
      const pool = A.ARTS.flatMap((a) => A.attackTechs(a.id)).filter((t) => t.el === boss.el && t.tier >= 1 && t.tier <= 2);
      const own = pool.filter((t) => t.cls === f.cls);
      const list = own.length ? own : pool;
      if (list.length) goods.push({ key: `book:${list[Math.floor(rng(`raid|bk|${day}|${f.pid}`)() * list.length)].name}`, qty: 1 });
    }
  } else goods.push({ key: 'shop:hp0', qty: 2 });
  return { stones, goods, rank, share };
}
