import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../lib/game';
import * as WK from '../lib/work';
import * as J from '../lib/jobs';
import * as C from '../lib/content';
import { PURE_INTENTS, SERVER_FIRST } from '../lib/intents';

const T0 = 1_800_000_000_000;
const fresh = (seed = 42, realm = 2, sub = 1) => { const st = G.newGame(seed, 'f', T0); st.player.realm = realm; st.player.sub = sub; G.settle(st, 1); return st; };   // one tick makes the board
const lvl = (st: G.GameState) => G.levelOf(st.player);
let nextId = 9000;
/** A creature that fits a posting (the species and the element it asks, the level and the Dị Biến it needs), put in the pen. */
const workerFor = (st: G.GameState, p: WK.Post, over: Partial<G.Beast> = {}): G.Beast => {
  const sp = p.ask.sp || C.SPECIES.find((s) => s.el.includes(p.ask.el!))!.id;
  const b = { id: ++nextId, level: Math.max(p.ask.minLv ?? 1, 5), mut: !!p.ask.mut, sp, name: `thú ${nextId}`, apt: [1, 1, 1, 1, 1], cls: 2, power: 50, size: 1, cm: 100, pers: 0, skills: [], stats: [10, 10, 10, 10, 10], size_: 1, ...over } as unknown as G.Beast;
  st.beasts.push(b); return b;
};
const post = (st: G.GameState, tier: number) => st.work!.list.find((p) => p.tier === tier)!;

test('work: the board has six places that keep their difficulty, and it is made again the same way from the same seed', () => {
  const st = fresh(5);
  assert.ok(WK.isBoard(st.work)); assert.deepEqual(st.work!.list.map((p) => p.tier), WK.LAYOUT);
  const twin = fresh(5); assert.deepEqual(twin.work, st.work);
  assert.notDeepEqual(fresh(6).work!.list.map((p) => p.ask), st.work!.list.map((p) => p.ask));
});

test('work: every species has exactly one element, so "the right element and the right species" never needs both', () => {
  for (const s of C.SPECIES) assert.equal(s.el.length, 1, s.id);
  assert.equal(new Set(C.SPECIES.map((s) => s.el[0])).size, 8);
});

test('work: the four tiers ask the four things: an element, a species, a species with a level, a Dị Biến with an element or a species', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const [realm, sub] of [[0, 0], [1, 2], [3, 1]]) {
      const st = fresh(seed, realm, sub), L = lvl(st), at = J.speciesAt(L), els = J.elementsAt(L);
      for (const p of st.work!.list) {
        const a = p.ask;
        if (p.tier === 0) { assert.ok(a.el && els.includes(a.el) && !a.sp && a.minLv === undefined && !a.mut); }
        if (p.tier === 1) { assert.ok(a.sp && at.includes(a.sp) && !a.el && a.minLv === undefined && !a.mut); }
        if (p.tier === 2) {
          assert.ok(a.sp && a.minLv !== undefined && !a.el && !a.mut); assert.ok(a.minLv >= Math.max(1, L - 3) && a.minLv <= L);
          assert.ok(C.ZONES.some((z) => z.minLevel <= L && (z.species[a.sp!] || 0) > 0 && z.lv[1] >= a.minLv!), 'some zone the player can reach has that species at that level');
        }
        if (p.tier === 3) { assert.equal(a.mut, true); assert.ok(!!a.el !== !!a.sp, 'an element or a species, not both'); assert.ok(a.el ? els.includes(a.el) : at.includes(a.sp!)); }
        assert.ok(p.secs >= WK.BASE_SECS[p.tier] * 0.79 && p.secs <= WK.BASE_SECS[p.tier] * 1.21);
        assert.equal(p.secs % 60, 0);
      }
      const t0 = st.work!.list.filter((p) => p.tier === 0), t1 = st.work!.list.filter((p) => p.tier === 1);
      assert.notEqual(JSON.stringify(t0[0].ask), JSON.stringify(t0[1].ask), 'two easy places never ask the same'); assert.notEqual(JSON.stringify(t1[0].ask), JSON.stringify(t1[1].ask));
    }
  }
});

test('work: a creature fits what is asked, a Dị Biến only the special work, and a species the level', () => {
  const b = { sp: C.SPECIES[0].id, level: 10, mut: false }, el = C.SPECIES[0].el[0], other = C.SPECIES.find((s) => s.el[0] !== el)!;
  assert.ok(WK.fits({ el }, b)); assert.ok(!WK.fits({ el: other.el[0] }, b));
  assert.ok(WK.fits({ sp: b.sp }, b)); assert.ok(!WK.fits({ sp: other.id }, b));
  assert.ok(WK.fits({ sp: b.sp, minLv: 10 }, b)); assert.ok(!WK.fits({ sp: b.sp, minLv: 11 }, b));
  assert.ok(!WK.fits({ mut: true, el }, b)); assert.ok(WK.fits({ mut: true, el }, { ...b, mut: true })); assert.ok(WK.fits({ el }, { ...b, mut: true }), 'a Dị Biến may also do the easy work');
});

test('work: the pay grows with the tier, the special work pays four times as much for each hour, and it is always a multiple of 5', () => {
  const L = 12, hour = (t: WK.Tier) => WK.payFor(L, t, 3600);
  assert.ok(hour(0) < hour(1) && hour(1) < hour(2) && hour(2) < hour(3));
  assert.equal(hour(3), 4 * hour(0)); assert.equal(hour(0), 360);
  for (const t of [0, 1, 2, 3] as WK.Tier[]) for (const s of [WK.BASE_SECS[t] * 0.8, WK.BASE_SECS[t], WK.BASE_SECS[t] * 1.2]) assert.equal(WK.payFor(L, t, s) % 5, 0);
  assert.ok(WK.payFor(30, 2, 3600) > WK.payFor(10, 2, 3600), 'the higher the level, the better the pay');
  const st = fresh(8); for (const p of st.work!.list) assert.equal(p.stones, WK.payFor(lvl(st), p.tier, p.secs));
});

test('work: the special work gives two goods, the others one or none, all of them goods of the shop', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const st = fresh(seed);
    for (const p of st.work!.list) {
      if (p.tier === 3) assert.equal(p.extra!.length, 2); else if (p.tier > 0) assert.equal(p.extra!.length, 1); else assert.ok(!p.extra || p.extra.length === 1);
      for (const x of p.extra || []) assert.ok(x.n >= 1 && ['taming', 'hp', 'trib'].includes(x.kind));
    }
  }
});

test('work: send a creature that fits, it is busy until the pay is collected, and it cannot do two works at once', () => {
  const st = fresh(11), p = post(st, 1), b = workerFor(st, p);
  assert.equal(G.workSend(st, p.id, 99999).code, 'E_NOT_FOUND');
  const wrong = workerFor(st, p, { sp: C.SPECIES.find((s) => s.id !== p.ask.sp)!.id }); assert.equal(G.workSend(st, p.id, wrong.id).code, 'E_WORK_FIT');
  assert.equal(G.workSend(st, p.id, 'x').code, 'E_BAD_REQUEST'); assert.equal(G.workSend(st, 'nope', b.id).code, 'E_WORK_GONE');
  const t = st.clock; assert.ok(G.workSend(st, p.id, b.id).ok);
  assert.equal(p.beast, b.id); assert.equal(p.start, t); assert.equal(p.end, t + p.secs * 1000); assert.equal(WK.stageOf(p, st.clock), 'run');
  assert.equal(G.workSend(st, p.id, b.id).code, 'E_WORK_GONE', 'a posting takes one creature');
  const twin = st.work!.list.find((q) => q !== p && q.tier === 1)!; const same = workerFor(st, twin, { sp: twin.ask.sp });
  assert.ok(G.workSend(st, twin.id, same.id).ok);
  // the same creature cannot take a second posting
  const el = post(st, 0); b.sp = C.SPECIES.find((s) => s.el[0] === el.ask.el)!.id; assert.equal(G.workSend(st, el.id, b.id).code, 'E_BEAST_BUSY');
});

test('work: a creature on a stand of Triển Lãm cannot go to work, and one at work cannot be put on a stand', () => {
  const st = fresh(12), p = post(st, 1), b = workerFor(st, p), c = workerFor(st, p);
  assert.ok(G.expoSet(st, 0, 'beast', c.id).ok); assert.equal(G.workSend(st, p.id, c.id).code, 'E_BEAST_BUSY');
  assert.ok(G.workSend(st, p.id, b.id).ok); assert.equal(G.expoSet(st, 1, 'beast', b.id).code, 'E_BEAST_BUSY');
});

test('work: collect only when the time is up; then the Linh Thạch and the goods come and the creature is free', () => {
  const st = fresh(13), p = post(st, 2), b = workerFor(st, p); assert.ok(G.workSend(st, p.id, b.id).ok);
  assert.equal(G.workCollect(st, p.id).code, 'E_WORK_NOT_YET');
  st.clock = p.end! - 1; assert.equal(G.workCollect(st, p.id).code, 'E_WORK_NOT_YET');
  st.clock = p.end!; assert.equal(WK.stageOf(p, st.clock), 'ready');
  const stones = st.stones, inv = JSON.stringify(st.inv), x = p.extra![0];
  const r = G.workCollect(st, p.id); assert.ok(r.ok, r.msg);
  assert.equal(st.stones, stones + p.stones); assert.equal(r.data.stones, p.stones);
  const had = (key: string) => (JSON.parse(inv) as any)[key];
  if (x.kind === 'taming') assert.equal(st.inv.taming[x.idx], had('taming')[x.idx] + x.n); else if (x.kind === 'hp') assert.equal(st.inv.hp[x.idx], had('hp')[x.idx] + x.n);
  assert.equal(p.done, true); assert.ok(!WK.bookedIds(st.work).has(b.id)); assert.equal(G.workCollect(st, p.id).code, 'E_WORK_GONE');
  assert.ok(st.beasts.some((q) => q.id === b.id), 'the creature is still the player\'s');
});

test('work: a finished place gets a new posting of the same kind on the next tick, and an offline night finishes the work', () => {
  const st = fresh(14), p = post(st, 1), b = workerFor(st, p), slot = st.work!.list.indexOf(p); assert.ok(G.workSend(st, p.id, b.id).ok);
  G.settle(st, 8 * 3600 / 5);   // eight hours, 5 seconds a tick: the work took at most 72 minutes
  assert.equal(WK.stageOf(st.work!.list[slot], st.clock), 'ready'); assert.equal(st.work!.list[slot], p, 'nothing is thrown away while it waits to be collected');
  assert.ok(G.workCollect(st, p.id).ok); G.settle(st, 1);
  const q = st.work!.list[slot]; assert.notEqual(q.id, p.id); assert.equal(q.tier, 1); assert.equal(q.beast, undefined);
});

test('work: a creature at work cannot be sold, let go in bulk or handed over to a buyer of Tìm thú', () => {
  const st = fresh(15), p = post(st, 1), b = workerFor(st, p, { power: 1 }); assert.ok(G.workSend(st, p.id, b.id).ok);
  assert.equal(G.releaseBeast(st, b.id).code, 'E_BEAST_BUSY');
  const spare = workerFor(st, p, { power: 2 }); const before = st.beasts.length;
  for (let i = 0; i < 6; i++) workerFor(st, p, { power: 100 + i });   // the Party is stronger than the two
  G.releaseMany(st); assert.ok(st.beasts.some((x) => x.id === b.id), 'bulk release keeps it'); assert.ok(!st.beasts.some((x) => x.id === spare.id)); assert.ok(st.beasts.length > before - 1);
  const j = st.jobs!.list.find((x) => x.type === 'beast')!; j.ask = { t: 'beast', want: [{ el: J.speciesEls(b.sp)[0], n: 1, got: 0 }] }; j.need = 1;
  assert.equal(G.fillJob(st, j.id, { ids: [b.id] }).code, 'E_BEAST_BUSY');
});

test('work: no way out: a posting cannot be sent away and a creature at work cannot be called back', () => {
  assert.equal((G as any).workDismiss, undefined); assert.equal(PURE_INTENTS.workDismiss, undefined);   // neither the engine nor the server table has it
  const st = fresh(16), p = post(st, 1), b = workerFor(st, p);
  assert.ok(G.workSend(st, p.id, b.id).ok);
  assert.equal(G.releaseBeast(st, b.id).code, 'E_BEAST_BUSY');   // locked until the pay is collected
  G.settle(st, 12); const q = st.work!.list.find((x) => x.id === p.id)!; assert.equal(q.beast, b.id); assert.ok(WK.isOpen(q));   // nothing takes it off the board
  st.clock = q.end!; assert.ok(G.workCollect(st, q.id).ok); assert.ok(!WK.bookedIds(st.work).has(b.id));   // only finishing frees it
  // a saved posting that was sent away before this rule is still replaced by a new one
  const old = post(st, 0); old.left = true; G.settle(st, 1); assert.ok(!st.work!.list.some((x) => x.id === old.id));
});

test('work: only a Dị Biến can do the special work, and its pay is the biggest', () => {
  const st = fresh(17), p = post(st, 3), plain = workerFor(st, p, { mut: false });
  assert.equal(G.workSend(st, p.id, plain.id).code, 'E_WORK_FIT');
  const dị = workerFor(st, p, { mut: true }); assert.ok(G.workSend(st, p.id, dị.id).ok);
  assert.ok(p.stones > st.work!.list.filter((x) => x.tier < 3).reduce((m, x) => Math.max(m, x.stones), 0), 'the special work pays more than any other posting');
  st.clock = p.end!; const inv = JSON.stringify(st.inv); assert.ok(G.workCollect(st, p.id).ok); assert.notEqual(JSON.stringify(st.inv), inv, 'and gives goods');
});

test('work: the candidates are the free creatures that fit, the weakest first and the Dị Biến last', () => {
  const st = fresh(18), p = post(st, 0), a = workerFor(st, p, { power: 30 }), b = workerFor(st, p, { power: 10 }), m = workerFor(st, p, { power: 5, mut: true });
  const busy = workerFor(st, p, { power: 1 });
  assert.deepEqual(WK.candidates(p, st.beasts, new Set([busy.id])).map((x) => x.id), [b.id, a.id, m.id]);
  assert.deepEqual(WK.candidates(p, st.beasts, new Set(), new Set([a.id])).map((x) => x.id), [busy.id, b.id, m.id]);
});

test('work: durations and the actions are pure intents', () => {
  assert.equal(WK.durText(30), '30 giây'); assert.equal(WK.durText(60), '1 phút'); assert.equal(WK.durText(61), '2 phút'); assert.equal(WK.durText(3600), '1 giờ'); assert.equal(WK.durText(3900), '1 giờ 5 phút');
  for (const k of ['workSend', 'workCollect']) assert.equal(typeof PURE_INTENTS[k], 'function', k);
  const st = fresh(19); assert.equal(PURE_INTENTS.workSend(st, null).code, 'E_WORK_GONE'); assert.equal(PURE_INTENTS.workCollect(st, undefined).code, 'E_WORK_GONE');
  const p = post(st, 1), b = workerFor(st, p); assert.ok(PURE_INTENTS.workSend(st, { id: p.id, beast: b.id }).ok);
});

test('work: the words: what is asked, in plain Vietnamese', () => {
  const sp = C.SPECIES[0];
  assert.match(WK.askText({ el: 'Hỏa' }), /hệ Hỏa/); assert.match(WK.askText({ sp: sp.id }), new RegExp(sp.name));
  assert.match(WK.askText({ sp: sp.id, minLv: 9 }), /từ cấp 9/); assert.match(WK.askText({ mut: true, el: 'Thủy' }), /Dị Biến hệ Thủy/); assert.match(WK.askText({ mut: true, sp: sp.id }), /Dị Biến/);
  assert.equal(WK.askArt({ el: 'Hỏa' }), ''); assert.ok(WK.askArt({ sp: sp.id }).length > 0);
  const st = fresh(20); for (const p of st.work!.list) { assert.ok(p.job.length > 3); assert.ok(WK.lineOf(p).length > 10); }
});

test('work: sending a creature waits for the server, which runs the same handler', () => {
  // the screen does not do it ahead of the server (so a refusal is told, never a creature that just vanishes), but the server table must know it
  assert.ok(SERVER_FIRST.has('workSend'));
  for (const t of SERVER_FIRST) assert.equal(typeof PURE_INTENTS[t], 'function', `${t} is run by the server from PURE_INTENTS`);
  // the same body the browser sends ({ type, rid, id, beast }) works through the handler table, and what it sets survives a save and a later settle
  const st = fresh(61), p = st.work!.list.find((x) => x.tier === 0)!, b = workerFor(st, p);
  const body = JSON.parse(JSON.stringify({ type: 'workSend', rid: 'r-12345678', id: p.id, beast: b.id }));
  const saved = JSON.parse(JSON.stringify(st)) as G.GameState;
  const w = structuredClone(saved); const r = PURE_INTENTS.workSend(w, body); assert.ok(r.ok, r.msg);
  const again = JSON.parse(JSON.stringify(w)) as G.GameState; G.settleTo(again, again.clock + 3 * 3600_000);
  const q = again.work!.list.find((x) => x.id === p.id); assert.ok(q && q.beast === b.id, 'the creature is still at the posting');
  assert.ok(again.beasts.some((x) => x.id === b.id), 'and still in the pen');
});
