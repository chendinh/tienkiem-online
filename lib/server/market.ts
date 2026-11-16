// Chợ Đêm: players swap items with each other, by offer and answer.
// A seller puts one item on a stall (it leaves their bag and is held in market_listings). Visitors send an OFFER: one item from their own
// bag, held in market_offers until the seller answers. The seller sees every offer on the stall and accepts one (the two items change hands
// and every other offer goes back to its owner) or declines. Nothing is paid and nothing is priced, so no number of the game is created here.
//
// Every write to a save goes through service.actGame (same lock, settlement, idempotency key and commit as any other intent), and the
// only account locked is the caller's: what is owed to ANOTHER player is put in market_inbox, and that player picks it up into their own
// bag later (claim). So a swap never writes someone else's save and two account locks are never needed. Rows are locked in one order
// (the stall first, then its offers). A refusal must happen before any write, because a refusal still commits the transaction.
import * as G from '../game';
import * as C from '../content';
import { BALANCE as B } from '../balance';
import { query, savepoint } from './db';
import { isStack, stackInfo, takeStack, giveStack, stackCount, MAX_QTY, type Stack } from '../goods';

export const MAX_OPEN = 5;                   // stalls one player can keep at once
export const MAX_OFFERS = 5;                 // offers one player can have out at once
export const MAX_PER_STALL = 10;             // offers one stall holds at once
export const TTL_MS = 3 * 86400 * 1000;      // a stall closes after three days; its item and all its offers go back to their owners' mailboxes
export const PAGE = 60;

// A hint the seller leaves for visitors (what they would like to get). It is not enforced: the seller decides by accepting.
export interface Want { tier: number; slot: string }
interface Info { name: string; dao: string; realm: number; sub: number; level: number; g: 'f' | 'm'; av?: string }

const cleanWant = (w: any): Want | null => {
  if (!w || typeof w !== 'object') return null;
  const tier = w.tier === undefined ? 0 : w.tier, slot = w.slot === undefined || w.slot === null ? '' : w.slot;
  if (!Number.isInteger(tier) || tier < 0 || tier > 5) return null;
  if (typeof slot !== 'string' || (slot !== '' && !C.SLOTS.includes(slot))) return null;
  return { tier, slot };
};
// What changes hands is a piece of gear or a counted stack (a Bí Kíp scroll, a material, a pill: see lib/goods.ts).
type Goods = G.Item | Stack;
const nameOf = (g: Goods) => (isStack(g) ? `${g.qty} ${stackInfo(g.key)?.name || 'vật phẩm'}` : g.name);
// What leaves a save: the item without the marks that only mean something inside the old save.
const parcel = <T extends Goods>(g: T): T => { if (isStack(g)) return g; const { locked: _l, rel: _r, ...rest } = g as G.Item; return rest as unknown as T; };
const infoOf = (st: G.GameState): Info => {
  const p = st.player;
  return { name: p.name, dao: p.dao, realm: p.realm, sub: p.sub, level: G.levelOf(p), g: p.look.g, ...(p.avatar && p.avatar.url ? { av: p.avatar.url } : {}) };
};
// What may be taken from a save: gear from the bag or the stash (never what is worn or locked), or a quantity of a counted good the player really holds.
// `take` removes it; it is called only after every refusal has been decided.
type Pick = { goods: Goods; take: () => void; undo: () => void };
function pickGoods(st: G.GameState, id: any, key: any, qty: any): Pick | G.Res {
  if (typeof key === 'string' && key) {
    if (!stackInfo(key)) return G.fail('E_BAD_REQUEST');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return G.fail('E_BAD_QTY');
    if (stackCount(st, key) < qty) return G.fail('E_NO_STOCK');
    return { goods: { stack: true, key, qty }, take: () => { takeStack(st, key, qty); }, undo: () => { giveStack(st, key, qty); } };
  }
  const f = find(st, id);
  if (isRes(f)) return f;
  return { goods: f.it, take: () => { f.list.splice(f.i, 1); }, undo: () => { f.list.splice(f.i, 0, f.it); } };
}
function find(st: G.GameState, id: any): { it: G.Item; list: G.Item[]; i: number } | G.Res {
  if (!Number.isInteger(id)) return G.fail('E_BAD_REQUEST');
  for (const list of [st.bag, st.stash]) {
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) return list[i].locked ? G.fail('E_LOCKED') : { it: list[i], list, i };
  }
  return Object.values(st.eq).some((x) => x && x.id === id) ? G.fail('E_WORN') : G.fail('E_NOT_FOUND');
}
const isRes = (x: any): x is G.Res => x && typeof x.ok === 'boolean';
// Put a received good in the save: gear in the bag, else the stash; a stack onto its counter. Never dissolves anything (unlike a drop found on a journey).
function receive(st: G.GameState, g: Goods): boolean {
  if (isStack(g)) return giveStack(st, g.key, g.qty);
  const mine: G.Item = { ...parcel(g), id: ++st.uid };
  if (st.bag.length < B.bagCapacity) { st.bag.push(mine); return true; }
  if (st.stash.length < B.overflowCapacity) { st.stash.push(mine); return true; }
  st.uid--;
  return false;
}
const mail = (acc: string, item: Goods, kind: 'swap' | 'return', note: any, now: number) =>
  query(`INSERT INTO market_inbox (acc, item, kind, note, created) VALUES ($1, $2::jsonb, $3, $4::jsonb, $5)`, [acc, JSON.stringify(item), kind, JSON.stringify(note), now]);
// Into the caller's save when there is room, otherwise into their mailbox. Returns true when it went straight in.
async function deliver(st: G.GameState, acc: string, item: Goods, note: any, now: number): Promise<boolean> {
  if (receive(st, item)) return true;
  await mail(acc, item, 'return', note, now);
  return false;
}
// A Thiên or Tiên relic belongs to one save in the shared pool; when it changes hands the pool follows.
async function moveRelic(it: Goods, from: string, to: string) {
  if (isStack(it) || !it.art || it.art < 1000) return;
  await query('UPDATE relics SET holder = $3 WHERE sig = $1 AND holder = $2', [`${it.tier}|${it.slot}|${it.base}|${it.art}`, from, to]);
}
// Close every open offer on a stall (except one) and send each item back to its owner's mailbox.
const sendBack = (listing: number, status: string, why: string, by: string, now: number, except = 0) =>
  query(
    `WITH x AS (UPDATE market_offers SET status = $2, closed = $3 WHERE listing = $1 AND status = 'open' AND id <> $4 RETURNING bidder, item)
     INSERT INTO market_inbox (acc, item, kind, note, created) SELECT bidder, item, 'return', $5::jsonb, $3 FROM x`,
    [listing, status, now, except, JSON.stringify({ why, by })]);

// ---------- intents (called by service.actGame inside the caller's account lock)
export async function list(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  const want = cleanWant(b.want);
  if (!want) return G.fail('E_BAD_REQUEST');
  const f = pickGoods(st, b.id, b.key, b.qty);
  if (isRes(f)) return f;
  const open = (await query<{ n: string }>(`SELECT count(*) AS n FROM market_listings WHERE seller = $1 AND status = 'open'`, [acc])).rows[0];
  if (Number(open.n) >= MAX_OPEN) return G.fail('E_MARKET_LIMIT');
  const it = f.goods;
  await savepoint(() => query(
    'INSERT INTO market_listings (seller, seller_info, item, want, created, expires) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6)',
    [acc, JSON.stringify(infoOf(st)), JSON.stringify(parcel(it)), JSON.stringify(want), now, now + TTL_MS],
  ));
  f.take();
  return G.ok(`Đã bày ${nameOf(it)} lên quầy Chợ Đêm. Quầy mở ba ngày.`);
}

// The seller takes the stall down: the item comes back, every offer on it goes back to its owner.
export async function cancel(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  if (!Number.isInteger(b.listing)) return G.fail('E_BAD_REQUEST');
  const row = (await query<{ item: Goods }>(`SELECT item FROM market_listings WHERE id = $1 AND seller = $2 AND status = 'open' FOR UPDATE`, [b.listing, acc])).rows[0];
  if (!row) return G.fail('E_MARKET_GONE');
  let back = false;
  await savepoint(async () => {
    await query(`UPDATE market_listings SET status = 'cancelled', closed = $2 WHERE id = $1`, [b.listing, now]);
    await sendBack(b.listing, 'declined', 'closed', st.player.name, now);
    back = await deliver(st, acc, row.item, { why: 'closed' }, now);
  });
  return G.ok(back ? `Đã rút ${nameOf(row.item)} về túi.` : `Túi đã đầy: ${nameOf(row.item)} nằm trong hòm thư Chợ Đêm, dọn chỗ rồi nhận.`);
}

// A visitor offers one of their items for the stall. The item is held until the seller answers or the visitor withdraws it.
export async function offer(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  if (!Number.isInteger(b.listing)) return G.fail('E_BAD_REQUEST');
  const l = (await query<{ seller: string; item: Goods; expires: string }>(`SELECT seller, item, expires FROM market_listings WHERE id = $1 AND status = 'open' FOR UPDATE`, [b.listing])).rows[0];
  if (!l || Number(l.expires) < now) return G.fail('E_MARKET_GONE');
  if (l.seller === acc) return G.fail('E_MARKET_OWN');
  const f = pickGoods(st, b.give, b.giveKey, b.giveQty);
  if (isRes(f)) return f;
  const mine = (await query<{ n: string; here: string }>(`SELECT count(*) AS n, count(*) FILTER (WHERE listing = $2) AS here FROM market_offers WHERE bidder = $1 AND status = 'open'`, [acc, b.listing])).rows[0];
  if (Number(mine.here) > 0) return G.fail('E_MARKET_DUP');
  if (Number(mine.n) >= MAX_OFFERS) return G.fail('E_MARKET_OFFER_LIMIT');
  const all = (await query<{ n: string }>(`SELECT count(*) AS n FROM market_offers WHERE listing = $1 AND status = 'open'`, [b.listing])).rows[0];
  if (Number(all.n) >= MAX_PER_STALL) return G.fail('E_MARKET_FULL');
  const it = f.goods;
  await savepoint(() => query('INSERT INTO market_offers (listing, bidder, bidder_info, item, created) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)', [b.listing, acc, JSON.stringify(infoOf(st)), JSON.stringify(parcel(it)), now]));
  f.take();
  return G.ok(`Đã gửi ${nameOf(it)} làm đề nghị đổi ${nameOf(l.item)}. Món này được giữ cho tới khi chủ quầy trả lời, ngươi có thể rút về bất cứ lúc nào.`);
}

// The visitor takes an offer back.
export async function withdraw(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  if (!Number.isInteger(b.offer)) return G.fail('E_BAD_REQUEST');
  const o = (await query<{ item: Goods }>(`SELECT item FROM market_offers WHERE id = $1 AND bidder = $2 AND status = 'open' FOR UPDATE`, [b.offer, acc])).rows[0];
  if (!o) return G.fail('E_MARKET_GONE');
  let back = false;
  await savepoint(async () => {
    await query(`UPDATE market_offers SET status = 'withdrawn', closed = $2 WHERE id = $1`, [b.offer, now]);
    back = await deliver(st, acc, o.item, { why: 'withdrawn' }, now);
  });
  return G.ok(back ? `Đã rút ${nameOf(o.item)} về túi.` : `Túi đã đầy: ${nameOf(o.item)} nằm trong hòm thư Chợ Đêm, dọn chỗ rồi nhận.`);
}

// The seller picks one offer: the stall's item goes to the visitor, the offered item to the seller, every other offer goes back.
export async function accept(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  if (!Number.isInteger(b.offer)) return G.fail('E_BAD_REQUEST');
  const o0 = (await query<{ listing: string }>(`SELECT listing FROM market_offers WHERE id = $1`, [b.offer])).rows[0];
  if (!o0) return G.fail('E_MARKET_GONE');
  const l = (await query<{ id: string; item: Goods; expires: string }>(`SELECT id, item, expires FROM market_listings WHERE id = $1 AND seller = $2 AND status = 'open' FOR UPDATE`, [o0.listing, acc])).rows[0];
  if (!l) return G.fail('E_MARKET_GONE');
  const o = (await query<{ bidder: string; item: Goods; bidder_info: Info }>(`SELECT bidder, item, bidder_info FROM market_offers WHERE id = $1 AND status = 'open' FOR UPDATE`, [b.offer])).rows[0];
  if (!o) return G.fail('E_MARKET_GONE');
  const lid = Number(l.id);
  let got = false;
  await savepoint(async () => {
    await query(`UPDATE market_listings SET status = 'done', closed = $2 WHERE id = $1`, [lid, now]);
    await query(`UPDATE market_offers SET status = 'accepted', closed = $2 WHERE id = $1`, [b.offer, now]);
    await mail(o.bidder, l.item, 'swap', { by: st.player.name, took: nameOf(o.item) }, now);
    await sendBack(lid, 'declined', 'other', st.player.name, now, b.offer);
    await moveRelic(l.item, acc, o.bidder);
    await moveRelic(o.item, o.bidder, acc);
    got = await deliver(st, acc, o.item, { why: 'accepted' }, now);
  });
  return G.ok(`Đã đổi ${nameOf(l.item)} lấy ${nameOf(o.item)} của ${o.bidder_info.name}.${got ? '' : ' Túi đầy nên món nhận được nằm trong hòm thư Chợ Đêm.'}`);
}

// The seller turns one offer down; the stall stays open.
export async function decline(acc: string, st: G.GameState, b: any, now: number): Promise<G.Res> {
  if (!Number.isInteger(b.offer)) return G.fail('E_BAD_REQUEST');
  const o0 = (await query<{ listing: string }>(`SELECT listing FROM market_offers WHERE id = $1`, [b.offer])).rows[0];
  if (!o0) return G.fail('E_MARKET_GONE');
  const l = (await query<{ item: Goods }>(`SELECT item FROM market_listings WHERE id = $1 AND seller = $2 AND status = 'open' FOR UPDATE`, [o0.listing, acc])).rows[0];
  if (!l) return G.fail('E_MARKET_GONE');
  const o = (await query<{ bidder: string; item: Goods }>(`SELECT bidder, item FROM market_offers WHERE id = $1 AND status = 'open' FOR UPDATE`, [b.offer])).rows[0];
  if (!o) return G.fail('E_MARKET_GONE');
  await savepoint(async () => {
    await query(`UPDATE market_offers SET status = 'declined', closed = $2 WHERE id = $1`, [b.offer, now]);
    await mail(o.bidder, o.item, 'return', { why: 'declined', by: st.player.name, listing: nameOf(l.item) }, now);
  });
  return G.ok(`Đã từ chối ${nameOf(o.item)}, món đó về hòm thư của người gửi.`);
}

export async function claim(acc: string, st: G.GameState, _b: any, _now: number): Promise<G.Res> {
  const rows = (await query<{ id: string; item: Goods }>('SELECT id, item FROM market_inbox WHERE acc = $1 ORDER BY id FOR UPDATE', [acc])).rows;
  if (!rows.length) return G.fail('E_MARKET_EMPTY');
  const done: string[] = [];
  for (const r of rows) { if (!receive(st, r.item)) break; done.push(r.id); }
  if (!done.length) return G.fail('E_BAG_FULL');
  await savepoint(() => query('DELETE FROM market_inbox WHERE id = ANY($1::bigint[])', [done]));
  return G.ok(done.length === rows.length ? `Đã nhận ${done.length} món từ hòm thư Chợ Đêm.` : `Đã nhận ${done.length}/${rows.length} món, túi đã đầy.`);
}

// A save that starts over (or is deleted) loses its items, so whatever it had on the market goes too (the relic pool is freed by the same
// restart). Offers other players made on its stalls go back to them.
export async function purge(acc: string) {
  const now = Date.now();
  const mine = (await query<{ id: string }>(`SELECT id FROM market_listings WHERE seller = $1 AND status = 'open'`, [acc])).rows;
  for (const l of mine) await sendBack(Number(l.id), 'declined', 'closed', '', now);
  await query('DELETE FROM market_offers WHERE bidder = $1 AND status = $2', [acc, 'open']);
  await query('DELETE FROM market_listings WHERE seller = $1', [acc]);
  await query('DELETE FROM market_inbox WHERE acc = $1', [acc]);
}

// ---------- reading
// Stalls past their time close; the item goes to the owner's mailbox and every offer back to its owner. One statement, safe on any instance.
async function sweep(now: number) {
  await query(
    `WITH l AS (UPDATE market_listings SET status = 'expired', closed = $1 WHERE status = 'open' AND expires < $1 RETURNING id, seller, item),
          o AS (UPDATE market_offers SET status = 'expired', closed = $1 WHERE status = 'open' AND listing IN (SELECT id FROM l) RETURNING bidder, item),
          r AS (INSERT INTO market_inbox (acc, item, kind, note, created) SELECT bidder, item, 'return', '{"why":"expired"}'::jsonb, $1 FROM o)
     INSERT INTO market_inbox (acc, item, kind, note, created) SELECT seller, item, 'return', '{"why":"expired"}'::jsonb, $1 FROM l`, [now]);
}
const num = (x: any) => Number(x);
const count = async (sql: string, p: any[]) => num((await query<{ n: string }>(sql, p)).rows[0].n);
const counters = async (acc: string) => ({
  inbox: await count('SELECT count(*) AS n FROM market_inbox WHERE acc = $1', [acc]),
  offersIn: await count(`SELECT count(*) AS n FROM market_offers o JOIN market_listings l ON l.id = o.listing WHERE l.seller = $1 AND l.status = 'open' AND o.status = 'open'`, [acc]),
});

export async function browse(acc: string, now: number) {
  await sweep(now);
  const r = await query<any>(
    `SELECT l.id, l.seller, l.seller_info, l.item, l.want, l.expires,
            (SELECT count(*) FROM market_offers o WHERE o.listing = l.id AND o.status = 'open') AS offers,
            (SELECT json_build_object('id', o.id, 'item', o.item) FROM market_offers o WHERE o.listing = l.id AND o.status = 'open' AND o.bidder = $2 LIMIT 1) AS my
     FROM market_listings l WHERE l.status = 'open' AND l.expires >= $1 ORDER BY l.id DESC LIMIT ${PAGE}`, [now, acc]);
  const rows = r.rows.map((x) => ({ id: num(x.id), item: x.item, want: x.want, seller: x.seller_info, mine: x.seller === acc, expires: num(x.expires), offers: num(x.offers), my: x.my ? { id: num(x.my.id), item: x.my.item } : null }));
  return { rows, ...(await counters(acc)), max: MAX_OPEN };
}

export async function mine(acc: string, now: number) {
  await sweep(now);
  const open = (await query<any>(`SELECT id, seller_info, item, want, expires FROM market_listings WHERE seller = $1 AND status = 'open' ORDER BY id DESC`, [acc])).rows;
  const offs = open.length ? (await query<any>(`SELECT id, listing, bidder_info, item, created FROM market_offers WHERE status = 'open' AND listing = ANY($1::bigint[]) ORDER BY id`, [open.map((x) => x.id)])).rows : [];
  const sent = (await query<any>(
    `SELECT o.id, o.item, l.item AS target, l.seller_info FROM market_offers o JOIN market_listings l ON l.id = o.listing WHERE o.bidder = $1 AND o.status = 'open' ORDER BY o.id DESC`, [acc])).rows;
  const inbox = (await query<any>('SELECT id, item, kind, note FROM market_inbox WHERE acc = $1 ORDER BY id', [acc])).rows;
  return {
    open: open.map((l) => ({ id: num(l.id), item: l.item, want: l.want, expires: num(l.expires), offers: offs.filter((o) => o.listing === l.id).map((o) => ({ id: num(o.id), item: o.item, from: o.bidder_info, at: num(o.created) })) })),
    sent: sent.map((o) => ({ id: num(o.id), item: o.item, target: o.target, seller: o.seller_info })),
    inbox: inbox.map((x) => ({ id: num(x.id), item: x.item, kind: x.kind, note: x.note })),
    max: MAX_OPEN, maxOffers: MAX_OFFERS,
  };
}
