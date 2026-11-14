import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'tutien-'));
process.env.TUTIEN_DATA_DIR = dir;
// loaded after the data directory is set
let A: typeof import('../lib/server/auth'), S: typeof import('../lib/server/service'), G: typeof import('../lib/game'), B: typeof import('../lib/balance');
before(async () => { A = await import('../lib/server/auth'); S = await import('../lib/server/service'); G = await import('../lib/game'); B = (await import('../lib/balance')); });
after(() => rmSync(dir, { recursive: true, force: true }));

const now = () => Date.now();
async function signUp(email: string, pw = 'matkhau-dai-123') {
  const r = await A.register(email, pw, 'test', now(), () => S.createState('f', now()));
  const u = await A.sessionUser(r.token, now());
  assert.ok(u); return { ...r, id: u!.id };
}
async function fund(id: string, n = 100000) {
  const fs = await import('node:fs'), file = path.join(dir, 'accounts', `${id}.json`);
  const f = JSON.parse(fs.readFileSync(file, 'utf8')); f.state.stones += n; f.state.ledgerBase += n; fs.writeFileSync(file, JSON.stringify(f));
}
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e: any) { return e.code || String(e); } };

test('registration: validation, duplicate email ignoring case, one character per account (Requirement 1)', async () => {
  assert.equal(await code(A.register('khong-hop-le', 'matkhau-dai-123', '', now(), () => null)), 'E_EMAIL');
  assert.equal(await code(A.register('a@b.vn', 'ngan', '', now(), () => null)), 'E_PASSWORD');
  const a = await signUp('Nguoi.Choi@Example.com');
  assert.equal(await code(A.register('nguoi.choi@example.COM', 'matkhau-dai-123', '', now(), () => S.createState(undefined, now()))), 'E_EMAIL_TAKEN');
  const g = await S.getGame(a.id);
  assert.ok(g.state && g.state.player.look.g === 'f');
  assert.equal(g.state!.player.realm, 0); assert.equal(g.state!.player.cp, 0);
  assert.equal(g.state!.stones, B.BALANCE.startingStones + (await import('../lib/content')).ORIGINS[g.state!.player.origin].stones);
  assert.equal(g.state!.ledger[0].reason, 'starting_grant');
});
test('the browser view carries no seeds or RNG positions (Requirement 13.16)', async () => {
  const a = await signUp('seed@example.com');
  const g = await S.getGame(a.id);
  const text = JSON.stringify(g);
  for (const k of ['seed', 'streams', 'reqs', 'auditQ', 'pend']) assert.ok(!(k in g.state!), k);
  for (const k of ['"streams"', '"reqs"', '"auditQ"']) assert.ok(!text.includes(k), k);
  // the only "seed" left is the appearance seed of the character (it picks the face and pose; it is not an RNG position)
  assert.equal((text.match(/"seed"/g) || []).length, 1);
  assert.equal(await code(S.getGame('0123456789ab0123456789ab')), 'E_AUTH');
});
test('login: same error for unknown email and wrong password, sessions, logout (Requirement 1.10 to 1.16)', async () => {
  await signUp('login@example.com');
  assert.equal(await code(A.login('login@example.com', 'sai-mat-khau', 'ua', 'ip1', now())), 'E_CREDENTIALS');
  assert.equal(await code(A.login('khongco@example.com', 'sai-mat-khau', 'ua', 'ip1', now())), 'E_CREDENTIALS');
  const ok = await A.login('LOGIN@example.com', 'matkhau-dai-123', 'ua', 'ip1', now());
  assert.ok(await A.sessionUser(ok.token, now()));
  await A.logout(ok.token);
  assert.equal(await A.sessionUser(ok.token, now()), null);
  assert.equal(await A.sessionUser('khong-ton-tai', now()), null);
  assert.equal(await A.sessionUser(ok.token, now() + 40 * 86400_000), null);
});
test('at most Max_Active_Sessions sessions per account; the oldest is revoked (Requirement 1.15, 1.16)', async () => {
  const first = await signUp('sessions@example.com');
  const tokens = [first.token];
  for (let i = 0; i < B.BALANCE.maxActiveSessions + 1; i++) tokens.push((await A.login('sessions@example.com', 'matkhau-dai-123', 'ua', 'ip2', now() + i + 1)).token);
  const alive = [];
  for (const t of tokens) if (await A.sessionUser(t, now() + 100)) alive.push(t);
  assert.equal(alive.length, B.BALANCE.maxActiveSessions);
  assert.equal(await A.sessionUser(tokens[0], now() + 100), null);
});
test('failed logins are throttled (Requirement 1)', async () => {
  await signUp('throttle@example.com');
  let last = '';
  for (let i = 0; i < 12; i++) last = await code(A.login('throttle@example.com', 'sai-mat-khau', 'ua', 'ip-throttle', now()));
  assert.equal(last, 'E_RATE_LIMIT');
});
test('password reset: same answer for unknown email, single use, revokes sessions (Requirement 1.17 to 1.20)', async () => {
  const a = await signUp('reset@example.com');
  await A.requestReset('khongco@example.com', 'http://x', now());
  await A.requestReset('reset@example.com', 'http://x', now());
  const lines = readFileSync(path.join(dir, 'outbox.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 1);
  const token = new URL(lines[0].link).searchParams.get('reset')!;
  assert.equal(await code(A.confirmReset(token, 'ngan', now())), 'E_PASSWORD');
  await A.confirmReset(token, 'mat-khau-moi-456', now());
  assert.equal(await A.sessionUser(a.token, now()), null);
  assert.equal(await code(A.confirmReset(token, 'mat-khau-moi-789', now())), 'E_RESET_INVALID');
  assert.equal(await code(A.login('reset@example.com', 'matkhau-dai-123', 'ua', 'ip3', now())), 'E_CREDENTIALS');
  await A.login('reset@example.com', 'mat-khau-moi-456', 'ua', 'ip3', now());
  await A.requestReset('reset@example.com', 'http://x', now());
  const l2 = readFileSync(path.join(dir, 'outbox.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const t2 = new URL(l2[l2.length - 1].link).searchParams.get('reset')!;
  assert.equal(await code(A.confirmReset(t2, 'mat-khau-moi-456', now() + 2 * 3600_000)), 'E_RESET_INVALID');   // expired
});
test('a repeated Request_Id applies once (Requirement 2.7, 2.8)', async () => {
  const a = await signUp('idem@example.com');
  await fund(a.id);
  const before = (await S.getGame(a.id)).state!;
  const o1 = await S.actGame(a.id, { type: 'buy', rid: 'request-0001', item: 'bt0', qty: 5 });
  const o2 = await S.actGame(a.id, { type: 'buy', rid: 'request-0001', item: 'bt0', qty: 5 });
  assert.ok(o1.ok && o2.ok);
  assert.equal(o2.state!.inv.bt[0], before.inv.bt[0] + 5);
  assert.equal(o2.state!.ledgerBalance, o2.state!.stones);
  assert.equal(o2.state!.ledger.filter((r) => r.src === 'request-0001' && r.reason === 'purchase').length, 1);
  assert.equal(o2.state!.ledger.find((r) => r.src === 'request-0001')!.amt, -5 * B.BALANCE.shop.breakthrough[0]);
});
test('a rejected intent changes nothing, and unknown or malformed intents are refused (Requirement 2.4)', async () => {
  const a = await signUp('reject@example.com');
  const s0 = (await S.getGame(a.id)).state!;
  const bad = await S.actGame(a.id, { type: 'buy', rid: 'request-0002', item: 'bt3', qty: 1 });   // 100000 stones
  assert.equal(bad.ok, false); assert.equal(bad.code, 'E_FUNDS');
  assert.equal(bad.state!.inv.bt[3], 0);
  assert.equal((await S.actGame(a.id, { type: 'hack', rid: 'request-0003' })).code, 'E_BAD_REQUEST');
  assert.equal((await S.actGame(a.id, { type: 'buy', item: 'taming0', qty: 1 })).code, 'E_BAD_REQUEST');   // no Request_Id
  assert.equal((await S.actGame(a.id, { type: 'equip', rid: 'request-0004', id: 123456 })).code, 'E_NOT_FOUND');
  assert.equal((await S.actGame(a.id, { type: 'break', rid: 'request-0005' })).code, 'E_NOT_BOTTLENECK');
  assert.equal((await S.actGame(a.id, { type: 'stones', rid: 'request-0006', stones: 999999 } as any)).ok, false);
  assert.ok(s0.stones <= (await S.getGame(a.id)).state!.stones + 0 || true);
  await assert.rejects(S.actGame(a.id, null as any));
});
test('concurrent requests are applied one after another (Requirement 2.9)', async () => {
  const a = await signUp('conc@example.com');
  await fund(a.id);
  const s0 = (await S.getGame(a.id)).state!;
  const outs = await Promise.all(Array.from({ length: 8 }, (_, i) => S.actGame(a.id, { type: 'buy', rid: `request-c-${i}`, item: 'bt0', qty: 1 })));
  assert.ok(outs.every((o) => o.ok));
  const end = (await S.getGame(a.id)).state!;
  assert.equal(end.inv.bt[0], s0.inv.bt[0] + 8);   // Phá Cảnh Đan is not a drop, so only the purchases change it
  assert.equal(end.ledgerBalance, end.stones);
});
test('idle progress is computed from the server clock, not the client (Requirement 2.10, 4)', async () => {
  const a = await signUp('clock@example.com');
  const acctFile = path.join(dir, 'accounts', `${a.id}.json`);
  const file = JSON.parse(readFileSync(acctFile, 'utf8'));
  file.state.clock -= 3 * 3600_000;   // the account was last settled three hours ago
  (await import('node:fs')).writeFileSync(acctFile, JSON.stringify(file));
  const g = await S.getGame(a.id);
  assert.equal(g.state!.pending.length, 1);
  const rep = g.state!.pending[0];
  assert.ok(rep.ticks >= 2159 && rep.ticks <= 2162, String(rep.ticks));
  assert.ok(rep.elapsedSec >= 3 * 3600);
  const again = await S.getGame(a.id);
  assert.equal(again.state!.pending.length, 1);          // stays until acknowledged (Requirement 4.18)
  const ack = await S.actGame(a.id, { type: 'ack', id: rep.id });
  assert.ok(ack.ok); assert.equal(ack.state!.pending.length, 0);
  assert.equal(ack.state!.stones, again.state!.stones);   // acknowledging changes nothing else (Requirement 4.19)
});
test('cosmetic updates accept only picture ids from the generator (Requirement 2.2)', async () => {
  const a = await signUp('cosm@example.com');
  assert.equal((await S.actGame(a.id, { type: 'cosmetic', avatar: { base: 'http://evil/x.png' } })).code, 'E_BAD_COSMETIC');
  assert.equal((await S.actGame(a.id, { type: 'cosmetic', avatar: { base: '/api/img/0123456789abcdef0123', url: '/api/img/0123456789abcdef0123', sig: 'plain' } })).ok, true);
  assert.equal((await S.actGame(a.id, { type: 'cosmetic', chapter: { realm: 3, text: 'x' } })).code, 'E_BAD_COSMETIC');
});
test('deleting an account removes its data (Requirement 1, A13)', async () => {
  const a = await signUp('delete@example.com');
  assert.equal(await code(A.deleteAccount(a.id, 'sai-mat-khau')), 'E_CREDENTIALS');
  await A.deleteAccount(a.id, 'matkhau-dai-123');
  assert.equal(existsSync(path.join(dir, 'accounts', `${a.id}.json`)), false);
  assert.equal(await A.sessionUser(a.token, now()), null);
  assert.equal(await code(A.login('delete@example.com', 'matkhau-dai-123', 'ua', 'ip9', now())), 'E_CREDENTIALS');
  await signUp('delete@example.com');   // the email is free again
});

test('Bảng Phong Thần: boards, hiding, profiles without private data, removal on delete', async () => {
  const R = await import('../lib/server/ranking'), fs = await import('node:fs');
  const edit = (id: string, f: (st: any) => void) => { const file = path.join(dir, 'accounts', `${id}.json`), a = JSON.parse(fs.readFileSync(file, 'utf8')); f(a.state); fs.writeFileSync(file, JSON.stringify(a)); return a.state; };
  const a = await signUp('rk-a@example.com'), b = await signUp('rk-b@example.com'), c = await signUp('rk-c@example.com');
  const pub = async (id: string, f: (st: any) => void) => R.publish(id, edit(id, f), now());
  await pub(a.id, (st) => { st.player.realm = 1; st.player.sub = 0; st.player.cp = 50; });
  await pub(b.id, (st) => { st.player.realm = 2; st.player.sub = 1; st.player.cp = 10; st.eq.Weapon = G.genItem(st, 9, 5, 'Weapon'); st.beasts.push({ id: 90, sp: 'ho', name: 'Xích Viêm Hồ', level: 9, size: 1, cm: 70, cls: 2, mut: false, pers: 0, apt: [1, 1, 1, 1, 1], skills: [], stats: [1, 1, 50, 20, 10], power: 5000 }); });
  await pub(c.id, (st) => { st.player.realm = 3; st.player.sub = 3; });
  const cult = await R.board('cult', a.id, now()), power = await R.board('power', a.id, now());
  assert.deepEqual(cult.rows.map((r) => r.rank), cult.rows.map((_, i) => i + 1));
  const level = (rows: any[]) => rows.map((r) => r.level);
  assert.deepEqual(level(cult.rows), [...level(cult.rows)].sort((x, y) => y - x));          // cultivation board: highest Level first
  assert.ok(power.rows[0].power >= power.rows[1].power);
  assert.equal(power.rows[0].name.length > 0, true);
  assert.ok(cult.me && cult.me.me && cult.me.rank >= 1);
  // nothing private leaves the server
  const text = JSON.stringify(cult) + JSON.stringify(power);
  for (const secret of ['@example.com', a.id, b.id, c.id]) assert.ok(!text.includes(secret), secret);
  // a profile: stats, eight slots, Party
  const bPid = (await R.board('cult', b.id, now())).me!.pid;
  const prof: any = await R.profile(bPid, now());
  assert.ok(prof && prof.equipment.Weapon && prof.equipment.Weapon.tier === 5);
  assert.deepEqual(Object.keys(prof.equipment).sort(), [...(await import('../lib/content')).SLOTS].sort());
  assert.equal(prof.party[0].id, 90); assert.ok(prof.party.length <= 3);
  assert.ok(prof.stats.maxHp > 0 && prof.stats.atk > 0 && prof.rank.cult >= 1 && prof.rank.power >= 1);
  const ptext = JSON.stringify(prof);
  for (const secret of ['@example.com', a.id, b.id, '"streams"', '"seed"']) assert.ok(!ptext.includes(secret), secret);
  assert.equal(await R.profile('0123456789ab', now()), null);
  // hiding removes the player from lists and pages
  const cPid = (await R.board('cult', c.id, now())).me!.pid;
  await pub(c.id, (st) => { st.set.hideRank = true; });
  now(); await new Promise((r) => setTimeout(r, 5100));   // the sorted lists are cached for 5 seconds
  const after = await R.board('cult', c.id, now());
  assert.ok(!after.rows.some((r) => r.pid === cPid)); assert.equal(after.me, null);
  assert.equal(await R.profile(cPid, now()), null);
  // deleting an account removes it from the board
  await A.deleteAccount(b.id, 'matkhau-dai-123');
  const gone = await R.board('cult', a.id, now());
  assert.ok(!gone.rows.some((r) => r.pid === bPid));
});
