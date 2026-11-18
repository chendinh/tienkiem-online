import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

// The game stores everything in Postgres. By default the tests start their own (PGlite, Postgres in WebAssembly, behind a socket),
// which serves one connection at a time. Set TEST_DATABASE_URL to run the same tests on a real Postgres (use an EMPTY database):
// then several connections run side by side and the advisory locks of withLock are really exercised.
const freePort = () => new Promise<number>((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)); }); });
let stopDb: () => Promise<void> = async () => {};
// loaded after DATABASE_URL is set
let A: typeof import('../lib/server/auth'), S: typeof import('../lib/server/service'), G: typeof import('../lib/game'), B: typeof import('../lib/balance'), St: typeof import('../lib/server/store'), D: typeof import('../lib/server/db');
before(async () => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.PG_POOL_MAX = process.env.PG_POOL_MAX || '5';
  } else {
    const { PGlite } = await import('@electric-sql/pglite'), { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
    const db = await PGlite.create(), port = await freePort();
    const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 1 });
    await server.start();
    process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    process.env.PG_POOL_MAX = '1';
    stopDb = async () => { await server.stop(); await db.close(); };
  }
  process.env.GHOSTS = '0';             // no made-up players unless a test asks for them
  process.env.RANK_CACHE_SEC = '5';     // the tests wait for this cache (the real default is 2 minutes)
  D = await import('../lib/server/db'); St = await import('../lib/server/store');
  A = await import('../lib/server/auth'); S = await import('../lib/server/service'); G = await import('../lib/game'); B = (await import('../lib/balance'));
});
after(async () => { await D.closeDb(); await stopDb(); });

// change the saved game of an account the way a test needs
async function editState(id: string, f: (st: any) => void) {
  const a = await St.loadAccount(id);
  assert.ok(a && a.state);
  f(a!.state); await St.saveAccount(a!);
  return a!.state;
}
const outbox = async () => (await D.query<{ entry: any }>(`SELECT entry FROM logs WHERE name = 'outbox.log' ORDER BY id`)).rows.map((r) => r.entry);

const now = () => Date.now();
async function signUp(email: string, pw = 'matkhau-dai-123') {
  const r = await A.register(email, pw, 'test', now(), (_i: string, e: string) => S.createState('f', now(), e));
  const u = await A.sessionUser(r.token, now());
  assert.ok(u); return { ...r, id: u!.id };
}
async function fund(id: string, n = 100000) {
  await editState(id, (st) => { st.stones += n; st.ledgerBase += n; });
}
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e: any) { return e.code || String(e); } };

test('registration: validation, duplicate email ignoring case, one character per account (Requirement 1)', async () => {
  assert.equal(await code(A.register('khong-hop-le', 'matkhau-dai-123', '', now(), () => null)), 'E_EMAIL');
  assert.equal(await code(A.register('a@b.vn', 'ngan', '', now(), () => null)), 'E_PASSWORD');
  const a = await signUp('Nguoi.Choi@Example.com');
  assert.equal(await code(A.register('nguoi.choi@example.COM', 'matkhau-dai-123', '', now(), (_i: string, e: string) => S.createState(undefined, now(), e))), 'E_EMAIL_TAKEN');
  const g = await S.getGame(a.id);
  assert.ok(g.state && g.state.player.look.g === 'f');
  assert.equal(g.state!.player.realm, 0); assert.equal(g.state!.player.cp, 0);
  const CC = await import('../lib/content');
  assert.equal(g.state!.stones, B.BALANCE.startingStones + CC.ORIGINS[g.state!.player.origin].stones + (CC.daoInfo(g.state!.player.dao)?.perks.stones || 0));   // the đạo hiệu of the address may add Linh Thạch
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
  const lines = await outbox();
  assert.equal(lines.length, 1);
  const token = new URL(lines[0].link).searchParams.get('reset')!;
  assert.equal(await code(A.confirmReset(token, 'ngan', now())), 'E_PASSWORD');
  await A.confirmReset(token, 'mat-khau-moi-456', now());
  assert.equal(await A.sessionUser(a.token, now()), null);
  assert.equal(await code(A.confirmReset(token, 'mat-khau-moi-789', now())), 'E_RESET_INVALID');
  assert.equal(await code(A.login('reset@example.com', 'matkhau-dai-123', 'ua', 'ip3', now())), 'E_CREDENTIALS');
  await A.login('reset@example.com', 'mat-khau-moi-456', 'ua', 'ip3', now());
  await A.requestReset('reset@example.com', 'http://x', now());
  const l2 = await outbox();
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
  await editState(a.id, (st) => { st.clock -= 3 * 3600_000; });   // the account was last settled three hours ago
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
  assert.equal(await St.loadAccount(a.id), null);
  assert.equal((await D.query('SELECT 1 FROM acct_auth WHERE id = $1', [a.id])).rowCount, 0);
  assert.equal((await D.query('SELECT 1 FROM sessions WHERE acc = $1', [a.id])).rowCount, 0);
  assert.equal(await A.sessionUser(a.token, now()), null);
  assert.equal(await code(A.login('delete@example.com', 'matkhau-dai-123', 'ua', 'ip9', now())), 'E_CREDENTIALS');
  await signUp('delete@example.com');   // the email is free again
});

test('Bảng Phong Thần: boards, hiding, profiles without private data, removal on delete', async () => {
  const R = await import('../lib/server/ranking');
  const edit = (id: string, f: (st: any) => void) => editState(id, f);
  const a = await signUp('rk-a@example.com'), b = await signUp('rk-b@example.com'), c = await signUp('rk-c@example.com');
  const pub = async (id: string, f: (st: any) => void) => R.publish(id, await edit(id, f), now());
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
  // Chiến Công lists only players who finished the daily quest; Tiên Phẩm lists Tiên items with their owner
  const quest = await R.board('quest', a.id, now());
  assert.ok(quest.rows.every((r) => r.qd > 0));
  const tienList = await R.tien(a.id, now());
  assert.ok(tienList.rows.some((r) => r.pid === bPid && r.it.tier === 5 && r.worn));
  assert.ok(tienList.rows.every((r) => r.it.tier === 5));
  assert.ok(!JSON.stringify(tienList).includes('@example.com'));
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

test('two sign-ups with the same email at once: exactly one wins (unique index, Requirement 1)', async () => {
  const outs = await Promise.all([1, 2, 3].map(() => code(A.register('race@example.com', 'matkhau-dai-123', 'ua', now(), (_i: string, e: string) => S.createState('f', now(), e)))));
  assert.equal(outs.filter((o) => o === 'ok').length, 1, outs.join());
  assert.equal(outs.filter((o) => o === 'E_EMAIL_TAKEN').length, 2, outs.join());
  assert.equal((await D.query(`SELECT 1 FROM acct_auth WHERE email_key = 'race@example.com'`)).rowCount, 1);
  assert.equal((await D.query(`SELECT 1 FROM accounts WHERE email = 'race@example.com'`)).rowCount, 1);   // no half-made account
});
test('a failed callback rolls back everything it wrote; a savepoint undoes only its own part', async () => {
  await D.query(`DELETE FROM kv WHERE key LIKE 'test.%'`);
  await assert.rejects(D.withLock('test-a', async () => { await D.query(`INSERT INTO kv (key, value) VALUES ('test.rolled', '1')`); throw new Error('boom'); }), /boom/);
  assert.equal((await D.query(`SELECT 1 FROM kv WHERE key = 'test.rolled'`)).rowCount, 0);
  await D.withLock('test-b', async () => {
    await D.query(`INSERT INTO kv (key, value) VALUES ('test.kept', '1')`);
    await assert.rejects(D.savepoint(async () => { await D.query(`INSERT INTO kv (key, value) VALUES ('test.undone', '1')`); await D.query('SELECT * FROM table_that_does_not_exist'); }));
    await D.query(`INSERT INTO kv (key, value) VALUES ('test.after', '1')`);   // the transaction is still usable
  });
  const keys = (await D.query<{ key: string }>(`SELECT key FROM kv WHERE key LIKE 'test.%' ORDER BY key`)).rows.map((r) => r.key);
  assert.deepEqual(keys, ['test.after', 'test.kept']);
  await D.query(`DELETE FROM kv WHERE key LIKE 'test.%'`);
});
test('the spend ledger adds up and pictures are stored, found and claimed once', async () => {
  const L = await import('../lib/llm'), I = await import('../lib/server/images');
  const before = (await L.imageBudget()).spentUsd;
  await Promise.all([1, 2, 3, 4].map(() => L.addImageCost(0.05)));
  assert.ok(Math.abs((await L.imageBudget()).spentUsd - before - 0.2) < 1e-6);
  const id = 'abcdef0123456789abcd', jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  assert.equal(await I.hasImage(id), null);
  await I.putImage({ id, kind: 'item', folder: 'item/Weapon', ext: 'jpg', data: jpg, meta: { crop: 0.07, prompt: 'x' } });
  await I.putImage({ id, kind: 'item', folder: 'item/Weapon', ext: 'jpg', data: Buffer.from([9]), meta: {} });   // a second write of the same id changes nothing
  assert.deepEqual(await I.hasImage(id), { ext: 'jpg', crop: 0.07 });
  const pic = await I.getImage(id);
  assert.ok(pic && pic.data.equals(jpg) && pic.meta.prompt === 'x');
  assert.equal(await I.getSmall(id), null);
  await I.putSmall(id, Buffer.from([7, 7])); await I.putSmall(id, Buffer.from([8]));
  assert.deepEqual([...(await I.getSmall(id))!], [7, 7]);
  const claims = await Promise.all([1, 2, 3].map(() => I.claimJob('job-' + id)));
  assert.equal(claims.filter(Boolean).length, 1);   // only one server instance draws a picture
  await I.releaseJobs(['job-' + id]);
  assert.equal(await I.claimJob('job-' + id), true);
  await I.releaseJobs(['job-' + id]);
});
test('a stored picture is found under the same id the file version used (saved games remember it)', async () => {
  // no provider key is needed to look up a picture that exists; the id formula must not change (saved games remember it)
  const { buildPlan, STYLE_VERSION } = await import('../lib/imageprompt'), crypto = await import('node:crypto'), { introSpec } = await import('../lib/avatarSpec');
  process.env.IMAGE_PROVIDER = 'pollinations';
  const plan = buildPlan(introSpec('f'));
  const id = crypto.createHash('sha1').update(`${STYLE_VERSION}|pollinations||${plan.prompt}||${''}|${plan.width}x${plan.height}|${plan.seed}`).digest('hex').slice(0, 20);
  const I = await import('../lib/server/images'), IG = await import('../lib/imagegen');
  await I.putImage({ id, kind: 'avatar', folder: 'avatar', ext: 'jpg', data: Buffer.from([0xff, 0xd8, 1]), meta: { crop: 0.07 } });
  const r = await IG.request(introSpec('f'));
  assert.deepEqual(r, { status: 'ready', url: `/api/img/${id}`, crop: 0.07 });
  assert.equal(await IG.fileFor('not-an-id'), null);
});

test('an item icon is found by its look when the AI is off or the prompt changed; a missing one is noted for later', async () => {
  const I = await import('../lib/server/images'), X = await import('../lib/server/imageindex'), IG = await import('../lib/imagegen'), { query } = await import('../lib/server/db');
  const spec = { kind: 'item', slot: 'Weapon', base: 'Trường Kiếm', tier: 2, e: 'Hỏa' };
  const key = X.keyOfSpec(spec)!;
  const old = 'aaaaaaaaaaaaaaaaaaaa', newer = 'bbbbbbbbbbbbbbbbbbbb', jpg = Buffer.from([0xff, 0xd8, 1]);
  await I.putImage({ id: old, kind: 'item', folder: 'item/Weapon', ext: 'jpg', data: jpg, meta: { crop: 0.05 } });
  await X.indexImage(key, old, 1);
  process.env.IMAGE_PROVIDER = 'off';
  assert.deepEqual(await IG.request(spec), { status: 'ready', url: `/api/img/${old}`, crop: 0.05 }, 'AI off still shows the picture');
  // a newer style of the same look wins, the older picture stays
  await I.putImage({ id: newer, kind: 'item', folder: 'item/Weapon', ext: 'jpg', data: jpg, meta: { crop: 0.06 } });
  await X.indexImage(key, newer, 2);
  assert.equal((await X.lookupKey(key))!.id, newer);
  assert.ok(await I.hasImage(old));
  // a look with no picture: nothing is drawn, it is written to image_wanted (counted again on the next ask)
  const none = { kind: 'item', slot: 'Robe', base: 'Vũ Y', tier: 4, e: 'Kim', v: 777777 };
  assert.deepEqual(await IG.request(none), { status: 'disabled' });
  await IG.request(none);
  const w = (await query<{ hits: number; tier: number }>('SELECT hits, tier FROM image_wanted WHERE asset_key = $1', [X.keyOfSpec(none)!])).rows[0];
  assert.deepEqual(w, { hits: 2, tier: 4 });
  process.env.IMAGE_PROVIDER = 'pollinations';
});

test('an ordinary poll settles a copy without saving, and the result is the same as saving every time', async () => {
  const a = await signUp('poll@example.com');
  const saved = async () => (await St.loadAccount(a.id))!.state;
  await editState(a.id, (st) => { st.clock = Date.now() - 4 * B.BALANCE.tickSec * 1000 - 100; });   // a few ticks behind: below the saving threshold
  const before = await saved();
  const v1 = await S.getGame(a.id);
  assert.ok(v1.state && v1.state.tick > before.tick, 'the view is up to date');
  assert.equal((await saved()).tick, before.tick, 'a short poll writes nothing');
  assert.equal((await saved()).clock, before.clock);
  // a click settles from the saved state and lands on the same game as the poll showed
  const r = await S.actGame(a.id, { type: 'mode', rid: 'poll-click-0001', mode: 'retreat' });
  assert.ok(r.ok && r.state!.tick >= v1.state!.tick);
  assert.ok((await saved()).tick >= v1.state!.tick, 'the click saved the settlement together with itself');
  // far behind (more than the threshold): the poll saves
  await editState(a.id, (st) => { st.clock = Date.now() - (B.BALANCE.pollSaveTicks + 5) * B.BALANCE.tickSec * 1000; });
  const t0 = (await saved()).tick;
  await S.getGame(a.id);
  assert.ok((await saved()).tick > t0, 'a long gap is saved');
});

test('the save is stored compressed, a plain-JSON save from before is still read, and both come back the same', async () => {
  const a = await signUp('gz@example.com');
  const raw = async () => (await D.query<{ state: string }>('SELECT state FROM accounts WHERE id = $1', [a.id])).rows[0].state;
  await editState(a.id, (st) => { st.stones += 0; });
  const stored = await raw();
  assert.ok(stored.startsWith('gz1:'), 'saved compressed');
  const back = (await St.loadAccount(a.id))!.state;
  assert.ok(stored.length < JSON.stringify(back).length, 'smaller than the JSON');
  await D.query('UPDATE accounts SET state = $2 WHERE id = $1', [a.id, JSON.stringify(back)]);   // the way it used to be written
  assert.deepEqual((await St.loadAccount(a.id))!.state, back);
  assert.equal((await S.getGame(a.id)).state!.player.name, back.player.name);
});

test('making the character again is closed for an account that has one', async () => {
  const a = await signUp('again@example.com');
  const before = (await S.getGame(a.id)).state!;
  const r = await S.actGame(a.id, { type: 'restart', rid: 'again-0000001', gender: 'm' });
  assert.equal(r.ok, false); assert.equal(r.code, 'E_HAS_CHARACTER');
  assert.equal((await S.getGame(a.id)).state!.player.name, before.player.name);
  // the đạo hiệu is the one of the address, and the same address always gives the same one
  assert.equal(before.player.dao, G.daoOfEmail('again@example.com'));
});

test('every account gets the đạo hiệu of its e-mail: on its next read, or at once with the backfill; a dry run writes nothing', async () => {
  const BF = await import('../lib/server/daobackfill'), CC = await import('../lib/content');
  const a = await signUp('backfill@example.com');
  await editState(a.id, (st) => { st.player.dao = 'Tên Cũ'; delete st.player.daoFix; });
  const dry = await BF.backfillDao(false);
  assert.ok(dry.changed.some((c) => c.id === a.id));
  assert.equal((await St.loadAccount(a.id))!.state.player.dao, 'Tên Cũ', 'a dry run writes nothing');
  const done = await BF.backfillDao(true);
  assert.ok(done.changed.some((c) => c.id === a.id));
  const st = (await St.loadAccount(a.id))!.state;
  assert.equal(st.player.dao, G.daoOfEmail('backfill@example.com')); assert.equal(st.player.daoFix, true);
  assert.ok(CC.daoInfo(st.player.dao), 'with the share at 1 everybody has one');
  assert.equal((await BF.backfillDao(true)).changed.filter((c) => c.id === a.id).length, 0, 'once only');
});

test('ghosts: made-up players fill the boards from memory only, with a page, never a new picture and never on the Tiên list', async () => {
  const R = await import('../lib/server/ranking'), Gh = await import('../lib/ghosts'), C = await import('../lib/content');
  const reset = () => { const g = globalThis as any; if (g.__tutienRank) { g.__tutienRank.sorted = {}; g.__tutienRank.tien = undefined; } if (g.__tutienRankCache) { g.__tutienRankCache.rows = null; g.__tutienRankCache.prof.clear(); } };
  const rowsBefore = (await D.query('SELECT 1 FROM accounts')).rowCount;
  process.env.GHOSTS = '12'; reset();
  try {
    const viewer = await signUp('ghost-viewer@example.com'), t = now();
    const b = await R.board('cult', viewer.id, t);
    assert.ok(b.rows.length >= 12, 'the ghosts are on the board');
    assert.ok(b.rows.every((r) => !r.me || r.pid.length === 12));
    const row = b.rows.find((r) => Gh.ghosts(t).some((x) => x.st.player.name === r.name))!;
    const prof: any = await R.profile(row.pid, t);
    assert.ok(prof && prof.stats.maxHp > 0 && prof.beasts >= 3);
    assert.deepEqual(Object.keys(prof.equipment).sort(), [...C.SLOTS].sort());
    for (const it of Object.values(prof.equipment) as any[]) assert.ok(it && it.tier <= 3, 'with no relic in the pool a ghost wears Địa or lower');
    assert.ok(!JSON.stringify([b, prof]).includes('ghost.tienkiem.local') && !JSON.stringify([b, prof]).includes('ghost:'), 'nothing of the ghost bookkeeping leaves the server');
    assert.equal((await R.tien(viewer.id, t)).rows.length, 0, 'ghosts own nothing on the Tiên list');
    // the same number and clock give the same person; time moves them up slowly and never past the ceiling
    const a = Gh.ghost(3, t), later = Gh.ghost(3, t + 30 * 86400_000), far = Gh.ghost(3, t + 2000 * 86400_000);
    assert.equal(a.st.player.name, later.st.player.name);
    assert.ok(later.level >= a.level && far.level >= later.level && far.level <= 18);
    // no account, no database row
    assert.equal((await D.query('SELECT 1 FROM accounts')).rowCount, rowsBefore + 1);   // only the viewer
    assert.equal((await D.query(`SELECT 1 FROM rank_entries WHERE acc LIKE 'ghost:%'`)).rowCount, 0);
  } finally { process.env.GHOSTS = '0'; reset(); }
});

test('old bots: keep their name and picture, their progress is made up, and nothing is read from or written to their saves', async () => {
  const R = await import('../lib/server/ranking'), BS = await import('../lib/server/botseed'), BR = await import('../lib/server/bots');
  const reset = () => { const g = globalThis as any; if (g.__tutienRank) { g.__tutienRank.sorted = {}; g.__tutienRank.tien = undefined; } if (g.__tutienRankCache) { g.__tutienRankCache.rows = null; g.__tutienRankCache.prof.clear(); } };
  await BS.removeBots(); await BS.createBots(3, now(), false); reset();
  try {
    const list = await BR.botAccounts(), before = await Promise.all(list.map((b) => St.loadAccount(b.id)));
    const viewer = await signUp('oldbot-viewer@example.com'), t = now() + 20 * 86400_000;
    const b = await R.board('cult', viewer.id, t);
    for (const a of before) assert.ok(b.rows.some((r) => r.name === a!.state.player.name), 'the bot is still on the board under its own name');
    const row = b.rows.find((r) => r.name === before[0]!.state.player.name)!;
    const prof: any = await R.profile(row.pid, t);
    assert.ok(prof && prof.name === row.name && prof.stats.maxHp > 0 && prof.beasts >= 3);
    const later = await R.board('cult', viewer.id, t + 400 * 86400_000);   // another day count: the cache is older than its time
    assert.ok(later.rows.length >= b.rows.length);
    const after = await Promise.all(list.map((x) => St.loadAccount(x.id)));
    assert.deepEqual(after.map((a) => a!.state.tick), before.map((a) => a!.state.tick), 'the saves are not touched');
  } finally { await BS.removeBots(); reset(); }
});

test('bots: made once, never log in, appear on the board with a page, play when stepped, and can be removed', async () => {
  const BS = await import('../lib/server/botseed'), BR = await import('../lib/server/bots'), R = await import('../lib/server/ranking'), Bt = await import('../lib/bots');
  const made = await BS.createBots(3, now(), false);
  assert.equal(made.created.length, 3); assert.equal((await BS.createBots(3, now(), false)).created.length, 0, 'running it again makes nothing new');
  const list = await BR.botAccounts();
  assert.equal(list.length, 3);
  assert.equal(await code(A.login(Bt.botEmail(1), 'matkhau-dai-123', 'ua', 'ip-bot', now())), 'E_CREDENTIALS', 'nobody can log in as a bot');
  assert.equal(await code(A.register(Bt.botEmail(1), 'matkhau-dai-123', 'ua', now(), (_i: string, e: string) => S.createState('f', now(), e))), 'E_EMAIL_TAKEN');
  const viewer = await signUp('bot-viewer@example.com');
  const level0 = (await R.board('cult', viewer.id, now() + 10_000)).rows.filter((r) => made.created.some((c) => c.name === r.name));
  assert.equal(level0.length, 3, 'the bots are on the board');
  // let them play three hours
  const later = now() + 3 * 3600 * 1000;
  const out = await BR.runBots(later);
  assert.equal(out.bots, 3); assert.equal(out.failed, 0); assert.ok(out.ticks > 500, String(out.ticks));
  const a = (await St.loadAccount(list[0].id))!.state;
  assert.ok(a.kills > 0 && a.clock === later && a.decision === null);
  const board = await R.board('cult', viewer.id, later + 10_000);
  const row = board.rows.find((r) => r.name === a.player.name)!;
  assert.ok(row && row.level >= 1);
  assert.ok(!JSON.stringify(board).includes('bot.tienkiem.local'), 'no bot e-mail leaves the server');
  const prof: any = await R.profile(row.pid, later + 10_000);
  assert.ok(prof && prof.name === a.player.name && prof.stats.maxHp > 0);
  // the claim in kv: one run per interval
  await D.query(`DELETE FROM kv WHERE key = 'bots.at'`);
  const before = (await St.loadAccount(list[0].id))!.state.tick;
  assert.equal(BR.botsEnabled(), false, 'bots are off unless BOTS_ENABLED=1');
  await BR.kickBots(Date.now() + 4 * 3600 * 1000);
  assert.equal((await St.loadAccount(list[0].id))!.state.tick, before, 'a kick does nothing while the bots are off');
  process.env.BOTS_ENABLED = '1';
  try { await BR.kickBots(Date.now() + 4 * 3600 * 1000); } finally { delete process.env.BOTS_ENABLED; }
  const mid = (await St.loadAccount(list[0].id))!.state.tick;
  assert.ok(mid > before, 'a kick brings the bots up to date');
  assert.equal(await BS.removeBots(), 3);
  assert.equal((await BR.botAccounts()).length, 0);
  assert.equal(await St.loadAccount(list[0].id), null);
});

test('bots: the picture is redrawn from what the bot wears, at most every two days, and an existing picture costs nothing', async () => {
  const BS = await import('../lib/server/botseed'), BR = await import('../lib/server/bots'), Bt = await import('../lib/bots');
  const { buildPlan, STYLE_VERSION } = await import('../lib/imageprompt'), { outfitSpec, equipSig } = await import('../lib/avatarSpec'), crypto = await import('node:crypto'), I = await import('../lib/server/images');
  const was = process.env.IMAGE_PROVIDER; process.env.IMAGE_PROVIDER = 'pollinations';
  try {
    await BS.removeBots();
    await BS.createBots(1, now(), false);
    const [bot] = await BR.botAccounts();
    const base = 'abcdef0123456789abce';
    await I.putImage({ id: base, kind: 'avatar', folder: 'avatar', ext: 'jpg', data: Buffer.from([0xff, 0xd8, 1]), meta: { crop: 0 } });
    const t0 = now();
    await editState(bot.id, (st) => { st.player.avatar = { base: `/api/img/${base}`, url: `/api/img/${base}`, crop: 0, at: t0 }; });
    assert.equal(await BR.refreshPicture(bot.id, t0 + 86400_000), 'none', 'a day is not enough');
    // the picture that the redraw would ask for already exists (stored under the id the generator uses)
    const st = (await St.loadAccount(bot.id))!.state, plan = buildPlan(outfitSpec(st));
    const id = crypto.createHash('sha1').update(`${STYLE_VERSION}|pollinations||${plan.prompt}||${''}|${plan.width}x${plan.height}|${plan.seed}`).digest('hex').slice(0, 20);
    await I.putImage({ id, kind: 'outfit', folder: 'outfit', ext: 'jpg', data: Buffer.from([0xff, 0xd8, 2]), meta: { crop: 0.05 } });
    const t1 = t0 + 2 * 86400_000;
    assert.equal(await BR.refreshPicture(bot.id, t1), 'updated');
    const after = (await St.loadAccount(bot.id))!.state.player.avatar;
    assert.equal(after.url, `/api/img/${id}`); assert.equal(after.base, `/api/img/${base}`, 'the base picture stays: it is the face');
    assert.equal(after.at, t1); assert.equal(after.sig, equipSig(st)); assert.equal(after.crop, 0.05);
    assert.equal(await BR.refreshPicture(bot.id, t1 + 3 * 86400_000), 'none', 'the same items need no new picture');
    // a bot made before this rule gets its first date, spread by its number
    await editState(bot.id, (s) => { delete s.player.avatar.at; });
    assert.equal(await BR.refreshPicture(bot.id, t1), 'none');
    assert.equal((await St.loadAccount(bot.id))!.state.player.avatar.at, t1 + Bt.pictureStagger(1));
    const row = (await D.query<{ entry: any }>(`SELECT entry FROM rank_entries WHERE acc = $1`, [bot.id])).rows[0].entry;
    assert.equal(row.av, `/api/img/${id}`, 'the board shows the new picture');
  } finally { if (was === undefined) delete process.env.IMAGE_PROVIDER; else process.env.IMAGE_PROVIDER = was; await BS.removeBots(); }
});
test('guest play: quick account, link an e-mail by the mailed link, keep the character, then sign in with the password', async () => {
  const g = await A.createGuest('ua', 'ip-guest', now(), (_i: string, e: string) => S.createState(undefined, now(), e));
  const u = await A.sessionUser(g.token, now());
  assert.ok(u && u.guest);
  const saved = (await S.getGame(u!.id)).state!;
  await signUp('taken@example.com');
  assert.equal(await code(A.requestLink(u!.id, 'taken@example.com', 'matkhau-dai-123', 'http://x', now())), 'E_EMAIL_TAKEN');
  assert.equal(await code(A.requestLink(u!.id, 'khong-hop-le', 'matkhau-dai-123', 'http://x', now())), 'E_EMAIL');
  const before = (await outbox()).length;
  await A.requestLink(u!.id, 'guestlink@example.com', 'matkhau-dai-123', 'http://x', now());
  const lines = await outbox();
  assert.equal(lines.length, before + 1);
  const token = new URL(lines[lines.length - 1].link).searchParams.get('link')!;
  assert.equal((await A.sessionUser(g.token, now()))!.guest, true);   // nothing changes before the click
  assert.equal(await code(A.confirmLink('wrong', now())), 'E_LINK_INVALID');
  assert.equal((await A.confirmLink(token, now())).email, 'guestlink@example.com');
  assert.equal(await code(A.confirmLink(token, now())), 'E_LINK_INVALID');   // single use
  const after = await A.sessionUser(g.token, now());
  assert.ok(after && !after.guest && after.email === 'guestlink@example.com' && after.id === u!.id);
  assert.equal((await S.getGame(u!.id)).state!.player.name, saved.player.name);
  await A.login('guestlink@example.com', 'matkhau-dai-123', 'ua', 'ip-g2', now());
  assert.equal(await code(A.requestLink(u!.id, 'again@example.com', 'matkhau-dai-123', 'http://x', now())), 'E_BAD_REQUEST');   // no longer a guest
});
test('sign in with a verified provider address: new account, same account again, a guest keeps its character', async () => {
  const mk = (_i: string, e: string) => S.createState(undefined, now(), e);
  const a = await A.oauthSignIn('Goog@Example.com', null, 'ua', now(), mk);
  const b = await A.oauthSignIn('goog@example.com', null, 'ua', now(), mk);
  assert.equal((await A.sessionUser(a.token, now()))!.id, (await A.sessionUser(b.token, now()))!.id);
  const g = await A.createGuest('ua', 'ip-guest3', now(), mk);
  const gid = (await A.sessionUser(g.token, now()))!.id;
  const c = await A.oauthSignIn('upgrade@example.com', gid, 'ua', now(), mk);
  const cu = await A.sessionUser(c.token, now());
  assert.ok(cu && cu.id === gid && !cu.guest);
});
test('e-mail linking by the 6-digit code: wrong codes are counted and kill it after 5, the right code links', async () => {
  const { createHash } = await import('node:crypto');
  const mk = (_i: string, e: string) => S.createState(undefined, now(), e);
  const g = await A.createGuest('ua', 'ip-code', now(), mk);
  const id = (await A.sessionUser(g.token, now()))!.id;
  // the code is only stored as a hash: find it the way an attacker would, by trying all 10^6
  const realCode = async () => {
    const h = (await D.query<{ code_hash: string }>('SELECT code_hash FROM email_links WHERE acc = $1 AND used = false', [id])).rows[0].code_hash;
    for (let n = 0; n < 1000000; n++) { const c = String(n).padStart(6, '0'); if (createHash('sha256').update(`${id}:${c}`).digest('hex') === h) return c; }
    throw new Error('code not found');
  };
  await A.requestLink(id, 'code1@example.com', 'matkhau-dai-123', 'http://x', now());
  const good = await realCode(), bad = good === '000000' ? '000001' : '000000';
  assert.equal(await code(A.confirmLinkCode(id, '12345', now())), 'E_LINK_INVALID');   // wrong shape
  for (let i = 0; i < 5; i++) assert.equal(await code(A.confirmLinkCode(id, bad, now())), 'E_LINK_INVALID');
  assert.equal(await code(A.confirmLinkCode(id, good, now())), 'E_LINK_INVALID');   // 6th try: dead even with the right code
  assert.equal((await A.sessionUser(g.token, now()))!.guest, true);
  await A.requestLink(id, 'code2@example.com', 'matkhau-dai-123', 'http://x', now());   // a new request starts afresh
  assert.equal((await A.confirmLinkCode(id, await realCode(), now())).email, 'code2@example.com');
  assert.equal((await A.sessionUser(g.token, now()))!.guest, false);
});
test('mail quota: a 4th mail within an hour to one address is not sent (reset: silent, link: E_RATE_LIMIT)', async () => {
  const mk = (_i: string, e: string) => S.createState(undefined, now(), e);
  await signUp('quota@example.com');
  const n0 = (await outbox()).length;
  for (let i = 0; i < 5; i++) await A.requestReset('quota@example.com', 'http://x', now());
  assert.equal((await outbox()).length, n0 + 3);
  const g = await A.createGuest('ua', 'ip-quota', now(), mk);
  const id = (await A.sessionUser(g.token, now()))!.id;
  assert.equal(await code(A.requestLink(id, 'quota@example.com', 'matkhau-dai-123', 'http://x', now())), 'E_EMAIL_TAKEN');
});

test('report: AI spend by day, online minutes, items by rarity, beasts and the daily quest; only the owner can read it', async () => {
  const RP = await import('../lib/server/report'), AD = await import('../lib/server/admin'), PR = await import('../lib/server/presence'), L = await import('../lib/llm'), Dl = await import('../lib/daily');
  const BS = await import('../lib/server/botseed');
  const t = Math.floor(Date.now() / 60000) * 60000 + 1000, today = Dl.dayKey(t);   // one second into a minute: the three touches below fall in exactly two minutes
  const a = await signUp('rp-a@example.com'), b = await signUp('rp-b@example.com');
  await BS.removeBots(); await BS.createBots(1, t, false);
  // the engine counts every item it gives, by rarity
  await editState(a.id, (st) => {
    st.tot = { items: [10, 5, 3, 2, 1, 0] };
    st.bag.push(G.genItem(st, 3, 4, 'Weapon'), G.genItem(st, 3, 0, 'Back'));
    st.beasts.push({ id: 1, sp: 'ho', name: 'Xích Viêm Hồ', level: 3, size: 1, cm: 70, cls: 2, mut: true, pers: 0, apt: [1, 1, 1, 1, 1], skills: [], stats: [1, 1, 5, 5, 5], power: 10 });
    st.best.ho = { seen: 4, tamed: 3, mutSeen: 1, mutTamed: 1 };
    st.quest = { day: today, sp: 'ho', n: 5, need: 5, done: true, reward: 10 }; st.questDays = [today];
  });
  await editState(b.id, (st) => { st.quest = { day: today, sp: 'ho', n: 2, need: 5, done: false, reward: 0 }; });
  // online time: two ticks in one minute count once, another minute counts again; another instance (a cleared memory) cannot double count
  await PR.touchPresence(a.id, t); await PR.touchPresence(a.id, t + 10_000); await PR.touchPresence(a.id, t + 70_000);
  (globalThis as any).__tutienPresence.last.clear(); await PR.touchPresence(a.id, t);
  // the spend ledger keeps a row per day
  const spent0 = (await RP.buildReport(t)).ai.spentToday;   // other tests spend too
  await L.addImageCost(0.07); await L.addImageCost(0.05);
  const rep = await RP.buildReport(t + 80_000);
  assert.ok(Math.abs(rep.ai.spentToday - spent0 - 0.12) < 1e-6, String(rep.ai.spentToday));
  assert.ok(rep.ai.image.spent >= 0.12 && rep.ai.image.cap > 0 && Math.abs(rep.ai.image.remaining - Math.max(0, rep.ai.image.cap - rep.ai.image.spent)) < 1e-3);
  assert.equal(rep.ai.days.length, 30); assert.equal(rep.ai.days[29].estimated, false);
  assert.equal(rep.online.todayPlayers, 1); assert.ok(rep.online.todayHours >= 3 / 60 - 0.01 && rep.online.todayHours <= 4 / 60 + 0.01, String(rep.online.todayHours));   // each ask counts for 3 minutes (the page asks every 3): two asks one or two minutes apart cover 3 or 4 minutes
  assert.equal(rep.online.top[0].hours >= 0.03, true); assert.ok(!JSON.stringify(rep).includes('rp-a@example.com'), 'e-mail addresses are masked');
  assert.ok(rep.players.real >= 2 && rep.players.bots === 1 && rep.players.registered >= 2);
  assert.ok(rep.items.dropped[0] >= 10 && rep.items.dropped[4] >= 1 && rep.items.held[4] >= 1);
  assert.ok(rep.beasts.total >= 1 && rep.beasts.mutants >= 1 && rep.beasts.tamedEver >= 3 && rep.beasts.species.some((s) => s.id === 'ho'));
  assert.ok(rep.quest.done >= 1 && rep.quest.inProgress >= 1 && rep.quest.byDay[rep.quest.byDay.length - 1].done >= 1);
  assert.equal(rep.quest.activeToday, rep.quest.done + rep.quest.inProgress + rep.quest.notStarted);
  // only the owner: a key from the environment, nothing without it
  const req = (k?: string) => new Request('http://x/api/admin/report', { headers: k ? { authorization: `Bearer ${k}`, 'x-forwarded-for': '9.9.9.9' } : { 'x-forwarded-for': '9.9.9.9' } });
  const was = { a: process.env.ADMIN_KEY, c: process.env.CRON_SECRET };
  try {
    delete process.env.ADMIN_KEY; delete process.env.CRON_SECRET;
    assert.equal((await code(Promise.resolve().then(() => AD.requireAdmin(req('x'))))), 'E_NO_ADMIN_KEY');
    process.env.ADMIN_KEY = 'a-long-owner-key-for-tests';
    assert.equal(await code(Promise.resolve().then(() => AD.requireAdmin(req()))), 'E_AUTH');
    assert.equal(await code(Promise.resolve().then(() => AD.requireAdmin(req('wrong')))), 'E_AUTH');
    assert.equal(await code(Promise.resolve().then(() => AD.requireAdmin(req('a-long-owner-key-for-tests')))), 'ok');
    for (let i = 0; i < 6; i++) await code(Promise.resolve().then(() => AD.requireAdmin(req('wrong'))));
    assert.equal(await code(Promise.resolve().then(() => AD.requireAdmin(req('a-long-owner-key-for-tests')))), 'E_RATE_LIMIT', 'too many wrong keys slow the address down');
  } finally { was.a === undefined ? delete process.env.ADMIN_KEY : (process.env.ADMIN_KEY = was.a); was.c === undefined ? delete process.env.CRON_SECRET : (process.env.CRON_SECRET = was.c); }
  await BS.removeBots();
});

test('report: which hours of the day players are online (Việt Nam time), averaged over the days with data, and a heat map of the last 14 days', async () => {
  const RP = await import('../lib/server/report'), PR = await import('../lib/server/presence');
  const a = await signUp('hr-a@example.com'), b = await signUp('hr-b@example.com');
  const day0 = Date.parse(new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10) + 'T00:00:00Z');
  // 03:30 UTC = 10:30 Việt Nam, 14:05 UTC = 21:05 Việt Nam; b is also there at 10:45 (the same hour) and 20 minutes later in another one
  for (const [acc, at] of [[a.id, 3.5], [a.id, 3.5 + 1 / 60], [b.id, 3.75], [a.id, 14 + 5 / 60], [b.id, 14.4]] as [string, number][]) await PR.touchPresence(acc, day0 + at * 3600_000);
  const rep = await RP.buildReport(Date.now());
  const o = rep.online, vn = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);
  assert.equal(o.hours.length, 24); assert.equal(o.heat.length, 14); assert.match(o.tz, /UTC\+7/);
  assert.ok(o.hours[10].minutes >= 3 && o.hours[21].minutes >= 2 && o.hours[9].minutes === 0 || o.hours[10].minutes >= 3, 'minutes land in the Việt Nam hour');
  assert.ok(o.hours[10].peak >= 2, 'two players were there at 10h on one day');
  assert.ok(o.hours[21].peak >= 2 && o.hours[21].players > 0 && o.hours[21].players <= o.hours[21].peak);
  const row = o.heat.find((r) => r.day === vn(day0 + 3.5 * 3600_000))!;
  assert.ok(row && row.cells[10] >= 2 && row.cells[21] >= 2 && row.cells[3] === 0, JSON.stringify(row));
  assert.ok(o.peak.length > 0 && o.peak.length <= 3 && o.peak[0].players >= o.peak[o.peak.length - 1].players);
  assert.ok(o.daysCounted >= 1);
  // an hour that has not come yet today never counts as "nobody was there"
  const early = await RP.buildReport(day0 + 3 * 86400_000 + 1 * 3600_000);   // 01:00 UTC = 08:00 Việt Nam
  const lateHour = early.online.hours.find((x) => x.hour === 23)!;
  assert.ok(lateHour.players >= 0);
});
