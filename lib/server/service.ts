// Game_Server: the only place where Game_State is read, changed and saved. The browser sends intents; every number comes from here (Requirement 2).
import * as G from '../game';
import * as C from '../content';
import { BALANCE as B } from '../balance';
import { type ErrCode } from '../strings';
import { appendLog, loadAccount, saveAccount, withLock } from './store';
import { savepoint } from './db';
import { type AccountFile, ApiError } from './auth';
import { randomInt } from 'node:crypto';
import { publish } from './ranking';

const T0 = Date.UTC(2026, 0, 1);
// The server clock. TUTIEN_TIME_SCALE speeds time up for development only (ignored in production).
export function serverNow(): number {
  const s = Number(process.env.TUTIEN_TIME_SCALE || 1);
  if (process.env.NODE_ENV === 'production' || !(s > 1)) return Date.now();
  return T0 + (Date.now() - T0) * s;
}

export function createState(gender: 'f' | 'm' | undefined, now: number): G.GameState { return G.newGame(randomInt(1, 2 ** 31 - 1), gender, now); }

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
  const { seed: _s, streams: _r, reqs: _q, pend: _p, auditQ: _a, ledger, ledgerDaily, reports, ...rest } = st;
  return {
    ...rest,
    ledger: ledger.slice(-40), ledgerBalance: G.ledgerSum(st), ledgerDaily,
    pending: reports.filter((r) => !r.seen), decision: decisionView(st, now),
    now, odds: G.oddsOf(st, now), zones: G.zonesView(st, now),
    shop: C.SHOP.map((s) => ({ ...s, sell: G.sellPrice(s) })), materials: C.MATERIALS,
    caps: { bag: B.bagCapacity, stash: B.overflowCapacity, pen: B.penCapacity, party: B.maxParty, stoneMax: B.stoneMax, stackMax: B.stackMax, maxQty: B.maxPurchaseQty },
    config: { tickSec: B.tickSec, pollSec: B.onlinePollSec, confirmPurchase: B.confirmPurchaseThreshold, offlineCapH: B.offlineCapH, minOfflineSec: B.minOfflineSec },
    versions: G.versions(),
  };
}
export type GameView = ReturnType<typeof toView>;
export interface Out { ok: boolean; code?: ErrCode; msg?: string; data?: any; state: GameView | null }

// Saves written before a field existed get its default (so an old account keeps working).
function upgrade(st: G.GameState | null): G.GameState | null {
  if (!st) return st;
  if (st.decision === undefined) st.decision = null;
  if (st.breakSnooze === undefined) st.breakSnooze = 0;
  if (st.set.autoFight === undefined) st.set.autoFight = B.defaults.autoFight;
  if (st.set.hideRank === undefined) st.set.hideRank = false;
  if (st.set.autoLearn === undefined) st.set.autoLearn = B.defaults.autoLearn;
  if (!st.inv.books) st.inv.books = {};
  if (!st.arts) { st.arts = { learned: [], loadout: {}, methods: [], method: '' }; G.initArts(st); }   // an old save starts with the Hoàng technique of the môn of its weapon
  if (st.arts && !st.arts.methods) G.initArts(st);   // a save from before Công Pháp starts with the first one
  return st;
}
async function readAcct(id: string): Promise<AccountFile | null> {
  const a = await loadAccount(id);
  if (a) a.state = upgrade(a.state);
  return a;
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
  mode: (st, b) => G.setMode(st, b.mode),
  zone: (st, b) => G.setZone(st, b.zone),
  settings: (st, b) => G.setSettings(st, b.patch),
  equip: (st, b) => (Number.isInteger(b.id) ? G.equipFromBag(st, b.id) : G.fail('E_BAD_REQUEST')),
  unequip: (st, b) => (typeof b.slot === 'string' && b.slot in st.eq ? G.unequip(st, b.slot) : G.fail('E_BAD_REQUEST')),
  unstash: (st, b) => (Number.isInteger(b.id) ? G.unstash(st, b.id) : G.fail('E_BAD_REQUEST')),
  lock: (st, b) => (Number.isInteger(b.id) ? G.toggleLock(st, b.id) : G.fail('E_BAD_REQUEST')),
  dissolve: (st, b) => (Number.isInteger(b.id) ? G.dissolveBagItem(st, b.id) : G.fail('E_BAD_REQUEST')),
  dissolveMany: (st, b) => G.dissolveMany(st, b.maxTier),
  releaseMany: (st) => G.releaseMany(st),
  decide: (st, b) => G.decide(st, b),
  release: (st, b) => (Number.isInteger(b.id) ? G.releaseBeast(st, b.id) : G.fail('E_BAD_REQUEST')),
  buy: (st, b) => (typeof b.item === 'string' ? G.buy(st, b.item, b.qty) : G.fail('E_BAD_REQUEST')),
  sell: (st, b) => (typeof b.item === 'string' ? G.sell(st, b.item, b.qty) : G.fail('E_BAD_REQUEST')),
  pill: (st, b) => G.useHpPill(st, b.grade),
  break: (st, b) => G.attemptBreakthrough(st, { pill: b.pill === true, trib: b.trib === true, src: 'player' }),
  ack: (st, b) => { const r = st.reports.find((x) => x.id === b.id); if (!r) return G.fail('E_NOT_FOUND'); r.seen = true; return G.ok(''); },
  learn: (st, b) => G.learnBook(st, b.name),
  loadout: (st, b) => G.setLoadout(st, b.cls, b.names),
  method: (st, b) => G.setMethod(st, b.name),
  cosmetic: (st, b) => cosmetic(st, b),
};
const READ_ONLY = new Set(['preview']);

async function commit(id: string, acct: AccountFile, st: G.GameState) { acct.state = st; await saveAccount(acct); try { await savepoint(() => publish(id, st, Date.now())); } catch (e) { console.error('[tutien] ranking', e); } }
async function drainAudit(id: string, st: G.GameState, now: number) {
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
export async function getGame(id: string): Promise<Out> {
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
export async function actGame(id: string, body: any): Promise<Out> {
  if (!body || typeof body !== 'object' || typeof body.type !== 'string') throw new ApiError('E_BAD_REQUEST');
  return withLock(`acct:${id}`, async () => {
    const acct = await readAcct(id);
    if (!acct) throw new ApiError('E_AUTH', 401);
    const now = serverNow();
    if (body.type === 'restart') {
      const st = createState(body.gender === 'f' || body.gender === 'm' ? body.gender : undefined, now);
      await commit(id, acct, st);
      return { ok: true, state: toView(st, now) };
    }
    if (!acct.state) return { ok: false, code: 'E_NO_CHARACTER', state: null };
    const { work: settled, out } = settleCopy(acct.state, now);
    if (out.ticks > 0) {
      acct.state = settled;
      if (out.offline && out.report) await appendLog('audit.log', { at: now, acc: id, type: 'settlement', id: out.report.id, ticks: out.ticks, versions: G.versions() });
      await drainAudit(id, settled, now);
      await commit(id, acct, settled);
    }
    const st0: G.GameState = acct.state;
    const view = (s: G.GameState) => toView(s, now);
    if (body.type === 'preview') { const r = G.previewBreakthrough(st0); return { ok: r.ok, code: r.code, msg: r.msg, data: r.data, state: view(st0) }; }
    const h = INTENTS[body.type];
    if (!h || READ_ONLY.has(body.type)) return { ok: false, code: 'E_BAD_REQUEST', state: view(st0) };
    // a repeated Request_Id returns the first result and changes nothing (Requirement 2.7, 2.8)
    const rid = typeof body.rid === 'string' && body.rid.length >= 8 && body.rid.length <= 80 ? body.rid : null;
    if (body.type !== 'cosmetic' && body.type !== 'ack' && !rid) return { ok: false, code: 'E_BAD_REQUEST', state: view(st0) };
    if (rid && st0.reqs[rid]) { const r = st0.reqs[rid].res; return { ok: r.ok, code: r.code, msg: r.msg, data: r.data, state: view(st0) }; }
    const work = structuredClone(st0);
    let res: G.Res;
    try { res = h(work, body, now); } catch { return { ok: false, code: 'E_SERVER', state: view(st0) }; }
    if (!res.ok) return { ok: false, code: res.code, msg: res.msg, state: view(st0) };
    G.flushLedger(work, rid || `${body.type}:${now}`, now);
    if (rid) {
      work.reqs[rid] = { t: now, res: { ok: res.ok, code: res.code, msg: res.msg, data: res.data } };
      for (const [k, v] of Object.entries(work.reqs)) if (now - v.t > B.requestRetentionSec * 1000) delete work.reqs[k];
      const keys = Object.keys(work.reqs); if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete work.reqs[k];
    }
    await drainAudit(id, work, now);
    await commit(id, acct, work);
    return { ok: true, msg: res.msg, data: res.data, state: view(work) };
  });
}
