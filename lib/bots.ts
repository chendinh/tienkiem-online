// Tu Sĩ máy ("bot"): characters that play by themselves so the world and the Bảng Phong Thần are not empty.
// A bot is an ordinary account with an ordinary save. It follows the same rules as a player: the same engine ticks, the same drops, the same prices.
// The only difference is who presses the buttons: `stepBot` below does what a careful player does between two visits
// (buy talismans and pills, wear upgrades, dissolve the rest, sell surplus beasts, brew pills, learn books, pick a zone, try the breakthrough).
// Pure functions of the save (no database), so they are easy to test; lib/server/bots.ts stores and schedules them.
import * as G from './game';
import * as C from './content';
import { BALANCE as B } from './balance';
import { equipSig } from './avatarSpec';

export const BOT_DOMAIN = 'bot.tienkiem.local';
export type TameStyle = 'strong' | 'collect' | 'all';
export interface Persona {
  n: number;              // 1..10, also the number in the e-mail
  gender: 'f' | 'm';
  diligence: number;      // share of the elapsed time the bot really plays (the rest it is "away"): keeps bots behind the keen players
  tame: TameStyle;
  grade: number;          // the talisman grade it prefers for ordinary beasts
  bold: number;           // how many Levels above itself it dares to go (zone choice)
  retreatPct: number;     // goes to recover below this share of health
  retreatShare: number;   // share of the time spent in Bế Quan instead of Lịch Luyện
  dissolveTier: number;   // dissolves what it does not wear up to this rarity
  thrift: number;         // share of its Linh Thạch it keeps back from the shop
}

// Ten different temperaments. Names, looks, elements and đạo hiệu come from the character itself (seed and e-mail), not from here.
export const PERSONAS: Persona[] = [
  { n: 1, gender: 'f', diligence: 0.85, tame: 'strong', grade: 1, bold: 2, retreatPct: 35, retreatShare: 0.10, dissolveTier: 2, thrift: 0.30 },
  { n: 2, gender: 'm', diligence: 0.70, tame: 'collect', grade: 0, bold: 1, retreatPct: 40, retreatShare: 0.15, dissolveTier: 2, thrift: 0.40 },
  { n: 3, gender: 'f', diligence: 0.55, tame: 'all', grade: 0, bold: 0, retreatPct: 50, retreatShare: 0.45, dissolveTier: 1, thrift: 0.50 },
  { n: 4, gender: 'm', diligence: 0.90, tame: 'strong', grade: 2, bold: 3, retreatPct: 30, retreatShare: 0.05, dissolveTier: 3, thrift: 0.20 },
  { n: 5, gender: 'f', diligence: 0.40, tame: 'collect', grade: 1, bold: 1, retreatPct: 45, retreatShare: 0.30, dissolveTier: 2, thrift: 0.35 },
  { n: 6, gender: 'm', diligence: 0.60, tame: 'strong', grade: 0, bold: 0, retreatPct: 40, retreatShare: 0.25, dissolveTier: 1, thrift: 0.45 },
  { n: 7, gender: 'f', diligence: 0.75, tame: 'all', grade: 1, bold: 2, retreatPct: 35, retreatShare: 0.10, dissolveTier: 3, thrift: 0.25 },
  { n: 8, gender: 'f', diligence: 0.30, tame: 'collect', grade: 0, bold: 0, retreatPct: 55, retreatShare: 0.50, dissolveTier: 2, thrift: 0.55 },
  { n: 9, gender: 'm', diligence: 0.80, tame: 'strong', grade: 1, bold: 2, retreatPct: 30, retreatShare: 0.10, dissolveTier: 2, thrift: 0.30 },
  { n: 10, gender: 'f', diligence: 0.50, tame: 'all', grade: 2, bold: 1, retreatPct: 45, retreatShare: 0.20, dissolveTier: 4, thrift: 0.35 },
];
export const botEmail = (n: number) => `tu-si-${String(n).padStart(2, '0')}@${BOT_DOMAIN}`;
export const isBotEmail = (email: string) => String(email).toLowerCase().endsWith('@' + BOT_DOMAIN);
export const personaOfEmail = (email: string) => { const m = /^tu-si-(\d+)@/i.exec(String(email)); return m ? PERSONAS.find((p) => p.n === Number(m[1])) : undefined; };
// the same seed always gives the same character, so the ten bots can be rebuilt after a database is wiped
export const botSeed = (n: number) => 810_000 + n * 7_919;
export function newBot(n: number, now: number, avatar?: { url: string; crop: number }): G.GameState {
  const ps = PERSONAS.find((p) => p.n === n);
  if (!ps) throw new Error(`no bot number ${n}`);
  const st = G.newGame(botSeed(n), ps.gender, now, botEmail(n));
  applySettings(st, ps);
  if (avatar) st.player.avatar = { base: avatar.url, url: avatar.url, crop: avatar.crop, at: now + pictureStagger(n) };
  return st;
}

// The picture of a bot is redrawn from what it wears, like a player's, but at most once every two days. The ten bots are spread over about a day
// (bot 1 first, bot 10 last) so they do not all draw at the same time. Nothing is drawn while the worn items look the same as in the picture.
export const PICTURE_EVERY_MS = 2 * 86400_000;
export const PICTURE_RETRY_MS = 3600_000;          // when the picture could not be drawn (budget, limit, failure) it asks again after an hour
export const pictureStagger = (n: number) => (n - 1) * 3 * 3600_000;
export function pictureDue(st: G.GameState, now: number): boolean {
  const av = st.player.avatar;
  if (!av || !av.base || av.at === undefined) return false;
  return now - av.at >= PICTURE_EVERY_MS && equipSig(st) !== av.sig;
}

const CHUNK = 60;                       // ticks between two "visits" of the bot (5 minutes of game time)
const hash = (st: G.GameState, k: string) => G.hash01(`${st.seed}|bot|${k}|${st.tick}`);

function applySettings(st: G.GameState, ps: Persona) {
  const species = new Set(Object.entries(st.best).filter(([, b]) => b.tamed > 0).map(([id]) => id)).size;
  const grade = [3, 2, 1, 0].find((g) => g <= ps.grade && st.inv.taming[g] >= 3) ?? 0;
  const patch = {
    autoTame: true, autoFight: true, autoEquip: true, autoPill: true, autoLearn: true, autoBreak: true,
    retreatPct: Math.max(B.minRetreatPct, ps.retreatPct), resumePct: 80, dissolveMax: ps.dissolveTier,
    tame: { strong: ps.tame === 'strong', newOnly: ps.tame === 'collect' && species < 14, alwaysMut: true, sizes: [0, 1, 2, 3, 4], grade, species: [] as string[] },
  };
  const r = G.setSettings(st, patch);
  if (!r.ok) throw new Error(`bot settings refused: ${r.code}`);
}

// Buy up to `want` of a shop item, never spending below `keep` Linh Thạch.
function stockUp(st: G.GameState, id: string, have: number, want: number, keep: number) {
  const item = C.SHOP_ITEM(id); if (!item || have >= want) return;
  const q = Math.min(want - have, Math.floor((st.stones - keep) / item.price), B.maxPurchaseQty, B.stackMax - have);
  if (q >= 1) G.buy(st, id, q);
}

// What the bot does at each visit.
export function thinkBot(st: G.GameState, ps: Persona) {
  const p = st.player, L = G.levelOf(p);
  // 1. wear upgrades that were waiting for a Level (the engine only compares when an item drops); unlock them so later upgrades are taken too
  for (const it of [...st.bag, ...st.stash]) {
    const cur = st.eq[it.slot];
    if (it.level <= L && (!cur || it.power > cur.power) && G.equipFromBag(st, it.id).ok) { const w = st.eq[it.slot]; if (w) w.locked = false; }
  }
  // 2. tidy: dissolve what is not worn (the engine keeps nothing back for upgrades here, they were just worn), sell surplus beasts
  if (st.bag.length + st.stash.length > 0) G.dissolveMany(st, ps.dissolveTier);
  if (st.bag.length > 70) G.dissolveMany(st, 5);
  if (st.beasts.length > 30) G.releaseMany(st);
  // 3. brew pills from materials, best recipe first
  for (const r of [...C.RECIPES].reverse()) {
    const q = Math.min(...Object.entries(r.need).map(([m, n]) => Math.floor((st.inv.mat[m] || 0) / n)), B.stackMax - st.inv.hp[r.grade], 50);
    if (q >= 1) G.craft(st, r.id, q);
  }
  // 4. read the books that were waiting (the Level was too low when they dropped)
  for (const name of Object.keys(st.inv.books)) G.learnBook(st, name);
  // 5. shopping with what is left after the reserve
  // close to a breakthrough it saves for what the next realm costs (the Phá Cảnh Đan and, from the second realm on, the Độ Kiếp Phù) before buying anything else
  const price = (id: string) => C.SHOP_ITEM(id)!.price;
  const nearBreak = p.sub >= 2 && L < B.playableLevelCap;
  const saving = nearBreak ? (G.targetIsTribulation(st) && st.inv.trib <= 0 ? price('trib') : 0) + (st.inv.bt[p.realm] <= 0 && price(`bt${p.realm}`) <= 5000 ? price(`bt${p.realm}`) : 0) : 0;   // the dearest pills are not worth waiting for
  const keep = Math.max(Math.floor(st.stones * ps.thrift), saving);
  if (st.inv.taming[0] > 80) G.sell(st, 'taming0', st.inv.taming[0] - 60);   // far more Hoàng talismans than it will ever use
  const wantTal = [40, 16, 6, 2], wantHp = [25, 10, 4];
  for (let g = 3; g >= 0; g--) if (g <= Math.max(ps.grade, L >= 12 ? 3 : 0)) stockUp(st, `taming${g}`, st.inv.taming[g], wantTal[g], keep);
  stockUp(st, 'taming0', st.inv.taming[0], 25, keep);
  for (let g = 2; g >= 0; g--) stockUp(st, `hp${g}`, st.inv.hp[g], wantHp[g], keep);
  // 6. the breakthrough: autoBreak handles the easy ones; for the rest the bot goes in with a Phá Cảnh Đan (and an Độ Kiếp Phù when the realm needs one)
  if (G.atBottleneck(st) && p.heartDemon <= 0 && p.hp >= B.autoBreakMinHp * G.pstats(st).maxHp) {
    if (G.targetIsTribulation(st) && st.inv.trib <= 0) stockUp(st, 'trib', 0, 1, 0);
    if (st.inv.bt[p.realm] <= 0) stockUp(st, `bt${p.realm}`, 0, 1, G.targetIsTribulation(st) && st.inv.trib <= 0 ? 0 : Math.floor(st.stones * 0.1));
    const tribOk = !G.targetIsTribulation(st) || st.inv.trib > 0;
    if (tribOk) G.attemptBreakthrough(st, { pill: st.inv.bt[p.realm] > 0, trib: G.targetIsTribulation(st), src: 'player' });
  }
  // 7. zone: the farthest one it dares, mode: some time in seclusion
  const open = C.ZONES.filter((z) => z.minLevel <= L);
  const zone = [...open].reverse().find((z) => z.lv[0] <= L + ps.bold) || open[0];
  if (zone && zone.id !== st.zone) G.setZone(st, zone.id);
  G.setMode(st, hash(st, 'mode') < ps.retreatShare ? 'retreat' : 'adventure');
  applySettings(st, ps);
  if (st.decision) st.decision = null;    // a bot never leaves a question open (every automatic setting is on, so this only clears one that was saved before)
}

// Let the bot play from its saved clock up to `now`. It plays only `diligence` of that time; the rest it was away, so its clock simply moves on.
// Returns the number of ticks it played.
export function stepBot(st: G.GameState, ps: Persona, now: number): number {
  const away = Math.min((now - st.clock) / 1000, B.offlineCapH * 3600);
  if (!(away >= B.tickSec)) return 0;
  let left = Math.floor((away * ps.diligence) / B.tickSec), played = 0;
  while (left > 0) {
    const n = Math.min(CHUNK, left);
    G.settle(st, n); played += n; left -= n;
    thinkBot(st, ps);
  }
  if (!played) thinkBot(st, ps);
  st.clock = Math.max(st.clock, now);
  G.flushLedger(st, `bot${st.tick}`, now);
  st.reports = []; st.auditQ = []; st.reqs = {};   // nobody reads a bot's reports; keep the save small
  return played;
}
