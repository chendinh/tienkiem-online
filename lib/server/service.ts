// Game_Server: the only place where Game_State is read, changed and saved. The browser sends intents; every number comes from here (Requirement 2).
import * as G from '../game';
import * as W from '../weekly';
import * as C from '../content';
import { BALANCE as B } from '../balance';
import { type ErrCode } from '../strings';
import { appendLog, loadAccount, saveAccount, withLock } from './store';
import { savepoint } from './db';
import { type AccountFile, ApiError } from './auth';
import { randomInt, createHash } from 'node:crypto';
import { publish } from './ranking';
import * as M from './market';
import { PURE_INTENTS } from '../intents';
import { ensureDaily, claimRelic, giveRelic, releaseHeld } from './dailystore';
import { dailyVersion, dailyPacks, relicSig } from '../daily';
const dailyArtCount = () => dailyPacks().filter((p) => p.beast && p.beast.art).length;   // changes when a picture arrives, so the browser reloads /api/daily

const T0 = Date.UTC(2026, 0, 1);
// The server clock. TUTIEN_TIME_SCALE speeds time up for development only (ignored in production).
export function serverNow(): number {
  const s = Number(process.env.TUTIEN_TIME_SCALE || 1);
  if (process.env.NODE_ENV === 'production' || !(s > 1)) return Date.now();
  return T0 + (Date.now() - T0) * s;
}

export function createState(gender: 'f' | 'm' | undefined, now: number, email?: string): G.GameState { return G.newGame(randomInt(1, 2 ** 31 - 1), gender, now, email); }

// What the browser may see: no seeds, no RNG positions, no request cache (Requirement 13.16).
// The open question with the numbers the player needs, all computed here (Requirement 31.8).
function decisionView(st: G.GameState, now: number) {
  const d = st.decision;
  if (!d) return null;
  if (d.kind === 'tame') { const sp = G.SP(d.beast.sp); return { ...d, grades: B.tameGradeMult.map((_, g) => ({ grade: g, have: st.inv.taming[g], p: G.tameProb(st, sp, d.beast, g) })), penFull: st.beasts.length >= B.penCapacity, msLeft: Math.max(0, Math.min(B.tameDecisionSec * 1000, (d.until ?? now + B.tameDecisionSec * 1000) - now)) }; }
  if (d.kind === 'npc') { const S = G.pstats(st); return { ...d, mine: S.atk + S.def + S.spd + Math.round(S.maxHp / 8), hp: st.player.hp, maxHp: S.maxHp }; }
  const pv = G.previewBreakthrough(st);
  return { ...d, preview: pv.ok ? pv.data : null };
}
export function toView(st: G.GameState, now: number) {
  const { seed: _s, streams: _r, reqs: _q, pend: _p, auditQ: _a, relicQ: _rq, ledger, ledgerDaily, reports, ...rest } = st;
  return {
    ...rest,
    ledger: ledger.slice(-40), ledgerBalance: G.ledgerSum(st), ledgerDaily,
    pending: reports.filter((r) => !r.seen), decision: decisionView(st, now),
    now, odds: G.oddsOf(st, now), zones: G.zonesView(st, now), events: G.eventsView(now), week: W.weekView(now),
    shop: C.SHOP.map((s) => ({ ...s, sell: G.sellPrice(s) })), materials: C.MATERIALS,
    caps: { bag: B.bagCapacity, stash: B.overflowCapacity, pen: B.penCapacity, party: B.maxParty, stoneMax: B.stoneMax, stackMax: B.stackMax, maxQty: B.maxPurchaseQty },
    config: { tickSec: B.tickSec, pollSec: B.onlinePollSec, confirmPurchase: B.confirmPurchaseThreshold, offlineCapH: B.offlineCapH, minOfflineSec: B.minOfflineSec },
    versions: G.versions(),
    dailyVer: dailyVersion() + '|' + dailyArtCount(),
  };
}
export type GameView = ReturnType<typeof toView>;
export interface Out { ok: boolean; code?: ErrCode; msg?: string; data?: any; state: GameView | null }

// Saves written before a field existed get its default (so an old account keeps working).
function upgrade(st: G.GameState | null, email = ''): G.GameState | null {
  if (!st) return st;
  if (email && (!st.player.daoFix || !st.player.dao)) G.adoptDao(st, email);   // the đạo hiệu follows the e-mail address
  if (st.decision === undefined) st.decision = null;
  if (st.breakSnooze === undefined) st.breakSnooze = 0;
  if (st.set.autoFight === undefined) st.set.autoFight = B.defaults.autoFight;
  if (st.set.autoLearn === undefined) st.set.autoLearn = B.defaults.autoLearn;
  if (st.set.autoBuyPill === undefined) st.set.autoBuyPill = B.defaults.autoBuyPill;
  if (st.set.autoBuyTal === undefined) st.set.autoBuyTal = B.defaults.autoBuyTal;
  if (!st.inv.books) st.inv.books = {};
  while (st.inv.bt.length < B.shop.breakthrough.length) st.inv.bt.push(0);   // one Phá Cảnh Đan slot per realm that can be entered
  if (st.feed.length > B.feedSize) st.feed.length = B.feedSize;   // an older save kept more journey entries
  if (st.set.tame.strong === undefined) st.set.tame.strong = false;
  if (st.set.retreatPct < B.minRetreatPct) st.set.retreatPct = B.minRetreatPct;   // below 30% of health the character never goes out to fight
  if (st.set.resumePct <= st.set.retreatPct) st.set.resumePct = Math.min(100, st.set.retreatPct + 1);
  if (!st.arts) { st.arts = { learned: [], loadout: {}, methods: [], method: '' }; G.initArts(st); }   // an old save starts with the Hoàng technique of the môn of its weapon
  if (st.arts && !st.arts.methods) G.initArts(st);   // a save from before Công Pháp starts with the first one
  return st;
}
async function readAcct(id: string): Promise<AccountFile | null> {
  const a = await loadAccount(id);
  if (a) a.state = upgrade(a.state, a.email);
  return a;
}
// The Dị Biến beasts of a player (Linh Thú Viên): read without settling the journey, so a page that asks every few seconds stays cheap.
export async function mutantsOf(id: string): Promise<G.Beast[] | null> {
  const a = await readAcct(id);
  return a?.state ? a.state.beasts.filter((b) => b.mut) : null;
}
const AVATAR_URL = /^\/api\/img\/[a-f0-9]{20}$/;
function cleanAvatar(a: any): G.Avatar | null {
  if (!a || typeof a !== 'object') return null;
  const out: G.Avatar = {};
  for (const k of ['base', 'pose', 'url'] as const) if (a[k] !== undefined) { if (typeof a[k] !== 'string' || !AVATAR_URL.test(a[k])) return null; out[k] = a[k]; }
  if (a.sig !== undefined) { if (typeof a.sig !== 'string' || a.sig.length > 1500) return null; out.sig = a.sig; }
  if (a.crop !== undefined) { if (typeof a.crop !== 'number' || !(a.crop >= 0 && a.crop < 0.9)) return null; out.crop = a.crop; }
  if (a.art !== undefined) { if (!Number.isInteger(a.art) || a.art < 0 || a.art > 100) return null; out.art = a.art; }
  return out;
}
const str = (x: any, max: number) => typeof x === 'string' && x.length > 0 && x.length <= max;

// Presentation data the player may set: portrait pictures, biography, diary chapters, prologue flag. None of it changes a game number.
function cosmetic(st: G.GameState, b: any): G.Res {
  const p = st.player;
  if (b.avatar !== undefined) { const a = cleanAvatar(b.avatar); if (!a) return G.fail('E_BAD_COSMETIC'); p.avatar = a; }
  if (b.bio !== undefined && !p.bio) {
    const x = b.bio;
    if (!x || !str(x.bio, 6000) || !str(x.motto, 400) || !str(x.secret, 800)) return G.fail('E_BAD_COSMETIC');
    p.bio = { bio: x.bio, motto: x.motto, secret: x.secret };
  }
  if (b.chapter !== undefined) {
    const c = b.chapter;
    if (!c || !Number.isInteger(c.realm) || c.realm < 1 || c.realm > p.realm || !str(c.text, 4000)) return G.fail('E_BAD_COSMETIC');
    p.chapters = p.chapters || [];
    if (!p.chapters.some((x) => x.realm === c.realm)) {
      p.chapters.push({ realm: c.realm, text: c.text });
      st.feed.unshift({ id: ++st.uid, tick: st.tick, kind: 'story', text: c.text }); if (st.feed.length > B.feedSize) st.feed.length = B.feedSize;
    }
  }
  if (b.prologueSeen === true) p.prologueSeen = true;
  return G.ok('');
}

type Handler = (st: G.GameState, b: any, now: number) => G.Res;
const INTENTS: Record<string, Handler> = {
  ...PURE_INTENTS,
  decide: (st, b) => G.decide(st, b),
  break: (st, b) => G.attemptBreakthrough(st, { pill: b.pill === true, trib: b.trib === true, src: 'player' }),
  ack: (st, b) => { const r = st.reports.find((x) => x.id === b.id); if (!r) return G.fail('E_NOT_FOUND'); r.seen = true; return G.ok(''); },
  cosmetic: (st, b) => cosmetic(st, b),
};
// Intents that also touch tables outside the save (Chợ Đêm). Same pipeline: they run inside the account lock, on a copy of the state.
// They must refuse BEFORE writing to those tables (see market.ts), because a refusal still commits the transaction.
type AsyncHandler = (acc: string, st: G.GameState, b: any, now: number) => Promise<G.Res>;
const ASYNC_INTENTS: Record<string, AsyncHandler> = {
  market_list: M.list, market_cancel: M.cancel, market_offer: M.offer, market_withdraw: M.withdraw, market_accept: M.accept, market_decline: M.decline, market_claim: M.claim,
};
const READ_ONLY = new Set(['preview']);

// One save per request. The ranking row is refreshed after it; a failure there never undoes the save (see ranking.publish).
async function commit(id: string, acct: AccountFile, st: G.GameState) { acct.state = st; await saveAccount(acct); try { await publish(id, st, Date.now()); } catch (e) { console.error('[tutien] ranking', e); } }
// Settle this save's dealings with the shared relic pool before it is stored. A relic found here is claimed for this save; when another save claimed it
// first, the item keeps its numbers but gets a new look of its own (name and picture derived from the save id), so no two saves ever show the same relic.
const everyItem = (st: G.GameState): G.Item[] => [...st.bag, ...st.stash, ...Object.values(st.eq).filter((x): x is G.Item => !!x)];
function rerollLook(it: G.Item, id: string) {
  const h = createHash('sha1').update(`${it.rel}|${id}`).digest();
  it.name = `${C.PROPER1[h[0] % C.PROPER1.length]} ${C.PROPER2[h[1] % C.PROPER2.length]} ${it.base}`;
  if (it.tier === 5) { it.tien = C.TIEN_VAN[h[2] % C.TIEN_VAN.length]; it.name += ` · ${it.tien.replace(' Tiên Văn', '')}`; }
  it.art = 1000 + (h.readUInt32BE(4) % (2 ** 30 - 1000));
}
export async function drainRelics(id: string, st: G.GameState) {
  const q = st.relicQ; if (!q || !q.length) return;
  st.relicQ = [];
  const lost = new Set<string>();
  for (const e of q) {
    try {
      if (e.op === 'take') { if (!(await claimRelic(e.sig, id))) lost.add(e.sig); }
      else if (!lost.has(relicSig(e))) await giveRelic(e, id);   // a look that was not ours never goes back to the pool
    } catch (err) { console.error('[tutien] relics', err); if (e.op === 'take') lost.add(e.sig); }   // no answer from the database: the relic is not ours to keep
  }
  for (const it of everyItem(st)) if (it.rel) { if (lost.has(it.rel)) rerollLook(it, id); delete it.rel; }
  if (lost.size) await ensureDaily(true);
}
async function drainAudit(id: string, st: G.GameState, now: number) {
  await drainRelics(id, st);
  const q = st.auditQ; st.auditQ = [];
  for (const e of q) await appendLog('audit.log', { at: now, acc: id, ...e, versions: G.versions() });
}

// Bring the account up to the server clock. Runs on a copy: when anything throws, the saved state stays as it was (Requirement 5.7).
function settleCopy(st: G.GameState, now: number): { work: G.GameState; out: G.SettleOut } {
  const work = structuredClone(st);
  const out = G.settleTo(work, now);
  return { work, out };
}

// GET: Settlement, then the state.
// Settlement is a pure function of the saved state and the clock (splitting it changes nothing, Requirement 5.2), so an ordinary poll does not have to save:
// it settles a copy and returns it without taking the lock or writing, and the next request replays the same few ticks. It saves only after a minute of
// game time (so the ranking and the stored clock keep up) or after an offline absence (the report is stored with it). Before, every 5 s poll took the account lock
// and wrote the whole save (200 KB or more), which also made every click wait behind a poll.
export async function getGame(id: string): Promise<Out> {
  await ensureDaily();
  const acct0 = await readAcct(id);
  if (!acct0) throw new ApiError('E_AUTH', 401);
  if (!acct0.state) return { ok: true, state: null };
  const now0 = serverNow();
  const peek = settleCopy(acct0.state, now0);
  if (!peek.out.offline && peek.out.ticks < B.pollSaveTicks) return { ok: true, state: toView(peek.work, now0) };
  return withLock(`acct:${id}`, async () => {
    const acct = await readAcct(id);
    if (!acct) throw new ApiError('E_AUTH', 401);
    if (!acct.state) return { ok: true, state: null };
    const now = serverNow();
    const { work, out } = settleCopy(acct.state, now);
    if (out.ticks > 0) {
      if (out.offline && out.report) await appendLog('audit.log', { at: now, acc: id, type: 'settlement', id: out.report.id, ticks: out.ticks, versions: G.versions() });
      await drainAudit(id, work, now);
      await commit(id, acct, work);
    }
    return { ok: true, state: toView(acct.state, now) };
  });
}

// POST: Settlement, then one intent applied all or nothing, saved together with the new state (Requirement 2.5, 2.6).
// The settlement and the intent are saved in ONE write. When the intent is refused the settlement is still saved by itself.
export async function actGame(id: string, body: any): Promise<Out> {
  if (!body || typeof body !== 'object' || typeof body.type !== 'string') throw new ApiError('E_BAD_REQUEST');
  await ensureDaily();
  return withLock(`acct:${id}`, async () => {
    const acct = await readAcct(id);
    if (!acct) throw new ApiError('E_AUTH', 401);
    const now = serverNow();
    if (body.type === 'restart') {
      // making the character again is closed: it was used to roll for a better start. Only an account without a character may make one.
      if (acct.state) return { ok: false, code: 'E_HAS_CHARACTER', state: toView(acct.state, now) };
      const st = createState(body.gender === 'f' || body.gender === 'm' ? body.gender : undefined, now, acct.email);
      try { await releaseHeld(id); } catch (err) { console.error('[tutien] relics', err); }
      await M.purge(id);
      await commit(id, acct, st);
      return { ok: true, state: toView(st, now) };
    }
    if (!acct.state) return { ok: false, code: 'E_NO_CHARACTER', state: null };
    const { work: st0, out } = settleCopy(acct.state, now);
    let unsaved = out.ticks > 0;
    const logSettlement = async () => { if (out.offline && out.report) await appendLog('audit.log', { at: now, acc: id, type: 'settlement', id: out.report.id, ticks: out.ticks, versions: G.versions() }); };
    // every way out that does not save the intent saves the settlement first
    const leave = async (o: Out): Promise<Out> => {
      if (unsaved) { unsaved = false; await logSettlement(); await drainAudit(id, st0, now); await commit(id, acct, st0); }
      return o;
    };
    const view = (s: G.GameState) => toView(s, now);
    if (body.type === 'preview') { const r = G.previewBreakthrough(st0); return leave({ ok: r.ok, code: r.code, msg: r.msg, data: r.data, state: view(st0) }); }
    const ah = ASYNC_INTENTS[body.type], h = ah ? undefined : INTENTS[body.type];
    if ((!h && !ah) || READ_ONLY.has(body.type)) return leave({ ok: false, code: 'E_BAD_REQUEST', state: view(st0) });
    // a repeated Request_Id returns the first result and changes nothing (Requirement 2.7, 2.8)
    const rid = typeof body.rid === 'string' && body.rid.length >= 8 && body.rid.length <= 80 ? body.rid : null;
    if (body.type !== 'cosmetic' && body.type !== 'ack' && !rid) return leave({ ok: false, code: 'E_BAD_REQUEST', state: view(st0) });
    if (rid && st0.reqs[rid]) { const r = st0.reqs[rid].res; return leave({ ok: r.ok, code: r.code, msg: r.msg, data: r.data, state: view(st0) }); }
    const work = structuredClone(st0);
    let res: G.Res;
    try { res = ah ? await ah(id, work, body, now) : h!(work, body, now); } catch { return leave({ ok: false, code: 'E_SERVER', state: view(st0) }); }
    if (!res.ok) return leave({ ok: false, code: res.code, msg: res.msg, state: view(st0) });
    G.flushLedger(work, rid || `${body.type}:${now}`, now);
    if (rid) {
      work.reqs[rid] = { t: now, res: { ok: res.ok, code: res.code, msg: res.msg, data: res.data } };
      for (const [k, v] of Object.entries(work.reqs)) if (now - v.t > B.requestRetentionSec * 1000) delete work.reqs[k];
      const keys = Object.keys(work.reqs); if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete work.reqs[k];
    }
    if (unsaved) await logSettlement();
    await drainAudit(id, work, now);
    await commit(id, acct, work);
    return { ok: true, msg: res.msg, data: res.data, state: view(work) };
  });
}
