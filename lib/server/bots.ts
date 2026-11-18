// Runs the bots (lib/bots.ts) on the server. There is no always-on process: a bot is brought up to date whenever somebody looks at the world.
// kickBots() is called (after the response) by the ranking and game routes; at most one server instance per BOT_EVERY_MS actually does the work,
// decided by one row in kv. The daily cron calls runBots() too, so the bots also move on a day nobody plays.
import * as G from '../game';
import { stepBot, personaOfEmail, pictureDue, pictureStagger, BOT_DOMAIN, PICTURE_EVERY_MS, PICTURE_RETRY_MS } from '../bots';
import { outfitSpec, equipSig, ART_V } from '../avatarSpec';
import { request, idle } from '../imagegen';
import { query, withLock } from './db';
import { loadAccount, saveAccount } from './store';
import { publish } from './ranking';
import { drainRelics } from './service';

export const BOT_EVERY_MS = 10 * 60 * 1000;
const AWAY_CAP_H = 6;   // a bot catches up at most this much at once, so one visit stays short

export async function botAccounts(): Promise<{ id: string; email: string }[]> {
  return (await query<{ id: string; email: string }>(`SELECT id, email FROM acct_auth WHERE email_key LIKE $1 ORDER BY email_key`, [`%@${BOT_DOMAIN}`])).rows;
}

// Bring one bot up to `now`. Takes the same lock as a player's request, so nothing else writes the save meanwhile.
export async function stepAccount(id: string, now: number): Promise<number> {
  return withLock(`acct:${id}`, async () => {
    const a = await loadAccount(id);
    if (!a || !a.state) return 0;
    const ps = personaOfEmail(a.email);
    if (!ps) return 0;
    const st: G.GameState = a.state;
    st.clock = Math.max(st.clock, now - AWAY_CAP_H * 3600 * 1000);   // time before this is lost, like a player away for more than the offline cap
    const played = stepBot(st, ps, now);
    await drainRelics(id, st);
    await saveAccount(a);
    try { await publish(id, st, now); } catch (e) { console.error('[tutien] bots ranking', e); }
    return played;
  });
}

export async function patchAvatar(id: string, f: (av: G.Avatar) => void) {
  await withLock(`acct:${id}`, async () => {
    const a = await loadAccount(id);
    if (!a || !a.state || !a.state.player.avatar) return;
    f(a.state.player.avatar);
    await saveAccount(a);
    try { await publish(id, a.state, Date.now()); } catch (e) { console.error('[tutien] bots ranking', e); }
  });
}

// Redraw the picture of a bot from what it wears, at most once every two days (see pictureDue). It goes through the same request() as a player's picture, so it
// obeys the same image budget and hourly limits, and a picture that already exists costs nothing. 'pending': it is being drawn, ask again at the next visit.
export async function refreshPicture(id: string, now: number): Promise<'none' | 'updated' | 'pending' | 'retry'> {
  const a = await loadAccount(id), ps = a && personaOfEmail(a.email), st: G.GameState | null = a && a.state;
  if (!a || !ps || !st || !st.player.avatar || !st.player.avatar.base) return 'none';
  if (st.player.avatar.at === undefined) { await patchAvatar(id, (av) => { if (av.at === undefined) av.at = now + pictureStagger(ps.n); }); return 'none'; }   // a bot made before pictures were redrawn
  if (!pictureDue(st, now)) return 'none';
  const sig = equipSig(st), r = await request(outfitSpec(st));
  if (r.status === 'pending') return 'pending';
  if (r.status !== 'ready' || !r.url) { await patchAvatar(id, (av) => { av.at = now - PICTURE_EVERY_MS + PICTURE_RETRY_MS; }); return 'retry'; }
  await patchAvatar(id, (av) => { av.url = r.url; av.sig = sig; av.art = ART_V; if (typeof r.crop === 'number') av.crop = r.crop; av.at = now; });
  return 'updated';
}

// idleMs: how long to wait for pictures that are being drawn (the function must stay alive until they are finished).
export async function runBots(now = Date.now(), idleMs = 50_000): Promise<{ bots: number; ticks: number; failed: number; pictures: number; drawing: number }> {
  const out = { bots: 0, ticks: 0, failed: 0, pictures: 0, drawing: 0 };
  for (const b of await botAccounts()) {
    try {
      out.ticks += await stepAccount(b.id, now); out.bots++;
      const pic = await refreshPicture(b.id, now);
      if (pic === 'updated') out.pictures++; else if (pic === 'pending') out.drawing++;
    } catch (e) { out.failed++; console.error('[tutien] bot', b.email, e); }
  }
  if (out.drawing > 0) await idle(idleMs);   // the picture is drawn in the background of this function: keep it alive until it is finished
  return out;
}

// The cheap check that the routes call on every request. One instance wins the claim and runs the bots; the others return at once.
const L: { running: boolean; at: number } = ((globalThis as any).__tutienBots ||= { running: false, at: 0 });
// Bots are OFF unless BOTS_ENABLED=1: each run loads and saves every bot's whole save, which used up the database quota.
export const botsEnabled = () => process.env.BOTS_ENABLED === '1';
export async function kickBots(now = Date.now()): Promise<void> {
  if (!botsEnabled()) return;
  if (L.running || now - L.at < 60_000) return;   // this instance looked recently
  L.at = now; L.running = true;
  try {
    const won = await query(
      `INSERT INTO kv (key, value) VALUES ('bots.at', to_jsonb($1::bigint)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value WHERE (kv.value #>> '{}')::bigint <= $2::bigint RETURNING 1`,
      [now, now - BOT_EVERY_MS],
    );
    if (won.rowCount) await runBots(now);
  } catch (e) { console.error('[tutien] bots', e); }
  finally { L.running = false; }
}
