// Makes and removes the bot accounts (lib/bots.ts). Used by scripts/bots.ts and the tests.
// A bot is a row in acct_auth (so its e-mail is taken and nobody can register it), a row in accounts (the save) and a row in rank_entries (the board).
// Its password hash is random and thrown away, so nobody can log in as a bot.
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PERSONAS, botEmail, newBot } from '../bots';
import { query, withLock } from './db';
import { saveAccount, removeAccount } from './store';
import { publish, unpublish } from './ranking';
import { hasImage, putImage } from './images';
import { botAccounts } from './bots';

export interface BotAvatar { id: string; g: 'f' | 'm'; crop: number }
const DIR = path.join(process.cwd(), 'data', 'gen', 'avatar');

// The pictures already drawn for earlier characters (data/gen/avatar). A bot borrows one that no other character shows, so no picture is drawn and nothing is paid.
export function localAvatars(): BotAvatar[] {
  if (!existsSync(DIR)) return [];
  const out: BotAvatar[] = [];
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
    try {
      const j = JSON.parse(readFileSync(path.join(DIR, f), 'utf8')), id = f.slice(0, -5);
      if (!existsSync(path.join(DIR, `${id}.jpg`))) continue;
      const g = /\byoung woman\b/i.test(j.prompt || '') ? 'f' : /\byoung man\b/i.test(j.prompt || '') ? 'm' : null;
      if (g) out.push({ id, g, crop: typeof j.crop === 'number' ? j.crop : 0 });
    } catch { /* a broken sidecar is skipped */ }
  }
  return out;
}
async function usedAvatars(): Promise<Set<string>> {
  const rows = (await query<{ av: string | null }>(`SELECT entry->>'av' AS av FROM rank_entries`)).rows;
  return new Set(rows.map((r) => (r.av || '').replace('/api/img/', '')).filter(Boolean));
}
async function ensureImage(a: BotAvatar) {
  if (await hasImage(a.id)) return;
  const meta = JSON.parse(readFileSync(path.join(DIR, `${a.id}.json`), 'utf8'));
  await putImage({ id: a.id, kind: 'avatar', folder: 'avatar', ext: 'jpg', data: readFileSync(path.join(DIR, `${a.id}.jpg`)), meta });
}

export interface MadeBots { created: { n: number; email: string; name: string; dao: string; avatar: boolean }[]; existing: string[] }
// Makes bots 1..count that do not exist yet. `withAvatars: false` leaves them without a picture (the tests). Safe to run again.
export async function createBots(count: number, now = Date.now(), withAvatars = true): Promise<MadeBots> {
  const out: MadeBots = { created: [], existing: [] };
  const have = new Set((await botAccounts()).map((b) => b.email));
  const taken = withAvatars ? await usedAvatars() : new Set<string>();
  const pool = withAvatars ? localAvatars() : [];
  for (const ps of PERSONAS.filter((p) => p.n <= count)) {
    const email = botEmail(ps.n);
    if (have.has(email)) { out.existing.push(email); continue; }
    const pic = pool.find((a) => a.g === ps.gender && !taken.has(a.id));
    if (pic) { taken.add(pic.id); await ensureImage(pic); }
    const id = randomBytes(12).toString('hex');
    const st = newBot(ps.n, now, pic ? { url: `/api/img/${pic.id}`, crop: pic.crop } : undefined);
    await withLock(`auth:${id}`, async () => {
      const ins = await query('INSERT INTO acct_auth (id, email, email_key, salt, hash, created) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email_key) DO NOTHING', [id, email, email, randomBytes(16).toString('hex'), randomBytes(64).toString('hex'), now]);
      if (!ins.rowCount) return;
      await saveAccount({ id, email, created: now, state: st });
      await publish(id, st, now);
      out.created.push({ n: ps.n, email, name: st.player.name, dao: st.player.dao, avatar: !!pic });
    });
  }
  return out;
}

export async function removeBots(): Promise<number> {
  let n = 0;
  for (const b of await botAccounts()) {
    await withLock(`acct:${b.id}`, () => withLock(`auth:${b.id}`, async () => {
      await query('DELETE FROM sessions WHERE acc = $1', [b.id]);
      await query('DELETE FROM acct_auth WHERE id = $1', [b.id]);
      await removeAccount(b.id);
      await unpublish(b.id);
      n++;
    }));
  }
  return n;
}
