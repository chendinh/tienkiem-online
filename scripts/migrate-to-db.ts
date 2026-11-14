// Copies a data/ folder of the file version (accounts, sessions, ranking, spend ledger, story cache, generated pictures) into Postgres.
//   DATABASE_URL=postgres://... npm run db:migrate                 copy ./data into that database
//   npm run db:migrate -- --dir /path/to/data                      read another data folder
//   npm run db:migrate -- --dry                                    count what would be copied, write nothing
//   npm run db:migrate -- --overwrite                              replace rows that already exist (default: keep what the database has)
//   npm run db:migrate -- --only pictures,story                    copy only some parts: accounts, ledger, story, audit, pictures (default: all)
// Safe to run again: existing rows are kept, so a second run never puts an old save over a newer one. DATABASE_URL on the command
// line wins over .env.local. Passwords were never stored in clear, so players keep their password; sessions carry over too.
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import { query, closeDb } from '../lib/server/db';
import { GEN_OTHER, kindFolder, folderFor } from '../lib/imagegen';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const DIR = path.resolve(args.includes('--dir') ? args[args.indexOf('--dir') + 1] : 'data');
const dry = flag('--dry'), over = flag('--overwrite');
// --only pictures,story   copy just those parts (default: everything). Parts: accounts (logins, sessions, saved games, ranking), ledger, story, audit, pictures
const PARTS = ['accounts', 'ledger', 'story', 'audit', 'pictures'];
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map((s) => s.trim()).filter(Boolean) : PARTS;
const bad = only.filter((p) => !PARTS.includes(p));
if (bad.length) { console.error(`unknown part: ${bad.join(', ')}. Parts: ${PARTS.join(', ')}`); process.exit(1); }
const want = (p: string) => only.includes(p);
const readJson = (f: string): any => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const count: Record<string, number> = {};
const bump = (k: string, n = 1) => { count[k] = (count[k] || 0) + n; };
// what to do when the row exists already
const onConflict = (cols: string, key: string) => (over ? `ON CONFLICT (${key}) DO UPDATE SET ${cols}` : `ON CONFLICT (${key}) DO NOTHING`);

async function run(sql: string, params: any[], what: string) {
  if (dry) { bump(what); return; }
  const r = await query(sql, params);
  bump(what, r.rowCount ?? 0);
}

async function auth() {
  const db = readJson(path.join(DIR, 'auth.json'));
  if (!db) { console.log('no auth.json: no accounts to copy'); return; }
  const idOf = Object.fromEntries(Object.entries(db.users || {}).map(([k, v]) => [v as string, k]));
  for (const [id, m] of Object.entries<any>(db.accts || {})) {
    const key = idOf[id] || String(m.email).trim().toLowerCase();
    await run(`INSERT INTO acct_auth (id, email, email_key, salt, hash, created) VALUES ($1, $2, $3, $4, $5, $6) ${onConflict('email = EXCLUDED.email, salt = EXCLUDED.salt, hash = EXCLUDED.hash', 'id')}`, [id, m.email, key, m.salt, m.hash, m.created], 'logins');
  }
  for (const [h, s] of Object.entries<any>(db.sessions || {})) {
    if (!db.accts?.[s.acc]) continue;
    await run(`INSERT INTO sessions (token_hash, acc, created, last_at, ua) VALUES ($1, $2, $3, $4, $5) ${onConflict('last_at = EXCLUDED.last_at', 'token_hash')}`, [h, s.acc, s.created, s.last, s.ua || ''], 'sessions');
  }
  for (const [h, r] of Object.entries<any>(db.resets || {})) {
    if (!db.accts?.[r.acc]) continue;
    await run(`INSERT INTO resets (token_hash, acc, exp, used) VALUES ($1, $2, $3, $4) ${onConflict('used = EXCLUDED.used', 'token_hash')}`, [h, r.acc, r.exp, !!r.used], 'reset links');
  }
}

async function accounts() {
  const d = path.join(DIR, 'accounts');
  if (!fs.existsSync(d)) return;
  for (const n of fs.readdirSync(d)) {
    if (!n.endsWith('.json')) continue;
    const a = readJson(path.join(d, n));
    if (!a || !a.id) { console.warn('skipped unreadable', n); continue; }
    await run(`INSERT INTO accounts (id, email, created, state) VALUES ($1, $2, $3, $4) ${onConflict('email = EXCLUDED.email, state = EXCLUDED.state', 'id')}`, [a.id, a.email, a.created, a.state == null ? null : JSON.stringify(a.state)], 'saved games');
  }
}

// The ranking keeps its secret: the public ids players see in profile links stay the same. Only done into an empty ranking.
async function ranking() {
  const idx = readJson(path.join(DIR, 'ranking.json'));
  if (!idx || !idx.entries) return;
  if (!dry) {
    const has = (await query('SELECT 1 FROM rank_entries LIMIT 1')).rowCount;
    if (has && !over) { console.log('ranking: the database already has entries, kept as they are'); return; }
    await query(`INSERT INTO kv (key, value) VALUES ('rank.secret', to_jsonb($1::text)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [idx.secret]);
  }
  for (const e of Object.values<any>(idx.entries)) await run('INSERT INTO rank_entries (acc, entry) VALUES ($1, $2::jsonb) ON CONFLICT (acc) DO UPDATE SET entry = EXCLUDED.entry', [e.acc, JSON.stringify(e)], 'ranking lines');
}

async function ledger() {
  const u = readJson(path.join(DIR, 'usage.json'));
  if (!u) return;
  await run(`INSERT INTO kv (key, value) VALUES ('usage', $1::jsonb) ${onConflict('value = EXCLUDED.value', 'key')}`, [JSON.stringify({ spentUsd: u.spentUsd || 0, imageUsd: u.imageUsd || 0 })], 'spend ledger');
}

async function story() {
  const d = path.join(DIR, 'story');
  if (!fs.existsSync(d)) return;
  for (const n of fs.readdirSync(d)) {
    if (!n.endsWith('.json')) continue;
    const v = readJson(path.join(d, n));
    if (v) await run(`INSERT INTO story_cache (id, value) VALUES ($1, $2::jsonb) ${onConflict('value = EXCLUDED.value', 'id')}`, [n.slice(0, -5), JSON.stringify(v)], 'stories');
  }
}

async function audit() {
  const f = path.join(DIR, 'audit.log');
  if (!fs.existsSync(f)) return;   // outbox.log is not copied: it holds password reset links
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (!dry && !over && (await query(`SELECT 1 FROM logs WHERE name = 'audit.log' LIMIT 1`)).rowCount) { console.log('audit log: the database already has lines, not copied again'); return; }
  for (let i = 0; i < lines.length; i += 500) {
    const part = lines.slice(i, i + 500);
    await run(`INSERT INTO logs (name, entry) SELECT 'audit.log', x FROM jsonb_array_elements($1::jsonb) x`, [JSON.stringify(part)], 'audit lines');
    if (dry) bump('audit lines', part.length - 1);
  }
}

// pictures: <folder>/<id>.jpg|png|webp, <id>.json (how it was made), <id>.sm.jpg (small copy), in any folder under data/gen
async function pictures() {
  const root = path.join(DIR, 'gen');
  if (!fs.existsSync(root)) return;
  const IMG = /^([a-f0-9]{20})\.(jpg|png|webp)$/, SM = /^([a-f0-9]{20})\.sm\.jpg$/;
  const found = new Map<string, { file: string; ext: string; dir: string }>();
  const smalls = new Map<string, string>();
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      let m = SM.exec(e.name);
      if (m) { smalls.set(m[1], full); continue; }
      m = IMG.exec(e.name);
      if (m && !found.has(m[1])) found.set(m[1], { file: full, ext: m[2], dir: d });
    }
  };
  walk(root);
  let bytes = 0, n = 0;
  for (const [id, f] of found) {
    const meta = readJson(path.join(f.dir, `${id}.json`)) || {};
    const rel = path.relative(root, f.dir);
    const folder = rel || (meta && meta.kind ? folderFor(meta) : GEN_OTHER);
    const data = fs.readFileSync(f.file), sm = smalls.has(id) ? fs.readFileSync(smalls.get(id)!) : null;
    bytes += data.length + (sm ? sm.length : 0);
    await run(`INSERT INTO images (id, kind, folder, ext, data, sm, meta) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) ${onConflict('data = EXCLUDED.data, sm = EXCLUDED.sm, meta = EXCLUDED.meta, ext = EXCLUDED.ext', 'id')}`, [id, kindFolder(meta.kind || folder.split(path.sep)[0]), folder, f.ext, data, sm, JSON.stringify(meta)], 'pictures');
    if (!dry && ++n % 100 === 0) console.log(`  pictures ${n}/${found.size}`);
  }
  console.log(`pictures found: ${found.size} (${(bytes / 1048576).toFixed(1)} MB with small copies)`);
}

(async () => {
  if (!fs.existsSync(DIR)) { console.error('no such folder: ' + DIR); process.exit(1); }
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const target = (process.env.DATABASE_URL || process.env.POSTGRES_URL)!.replace(/\/\/[^@]*@/, '//***@');
  console.log(`${dry ? 'DRY RUN, nothing is written. ' : ''}from ${DIR} to ${target}${over ? ' (overwriting existing rows)' : ''}`);
  if (want('accounts')) { await auth(); await accounts(); await ranking(); }
  if (want('ledger')) await ledger();
  if (want('story')) await story();
  if (want('audit')) await audit();
  if (want('pictures')) await pictures();
  console.log(dry ? 'would copy:' : 'copied (rows written; rows that already existed are not counted):', JSON.stringify(count));
  await closeDb();
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
