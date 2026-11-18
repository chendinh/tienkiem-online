// One-off cleanup: deletes the old "Tu Sĩ máy" accounts (bots) that earlier versions created. The bots themselves are gone from the code.
//   npx tsx scripts/remove-bots.ts            only lists what it would delete
//   npx tsx scripts/remove-bots.ts --remove   deletes those accounts, their saves and their ranking rows
// It uses DATABASE_URL (from .env.local or the environment): the first line it prints is the database host, check it before using --remove.
// Delete this file after it has run on every database that had bots.
try { (process as any).loadEnvFile('.env.local'); } catch {}
(async () => {
  const { closeDb, query, withLock } = await import('../lib/server/db');
  const { removeAccount } = await import('../lib/server/store');
  const { unpublish } = await import('../lib/server/ranking');
  const host = (() => { try { return new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL || '').host; } catch { return '(not set)'; } })();
  const remove = process.argv.includes('--remove');
  console.log(`database: ${host}  mode: ${remove ? 'REMOVE' : 'list'}`);
  const bots = (await query<{ id: string; email: string }>(`SELECT id, email FROM acct_auth WHERE email_key LIKE '%@bot.tienkiem.local' ORDER BY email_key`)).rows;
  for (const b of bots) console.log(`  ${b.email}`);
  console.log(`${bots.length} bots found`);
  if (remove) {
    for (const b of bots) {
      await withLock(`acct:${b.id}`, () => withLock(`auth:${b.id}`, async () => {
        await query('DELETE FROM sessions WHERE acc = $1', [b.id]);
        await query('DELETE FROM acct_auth WHERE id = $1', [b.id]);
        await removeAccount(b.id);
        await unpublish(b.id);
      }));
    }
    await query(`DELETE FROM kv WHERE key = 'bots.at'`);
    console.log(`removed ${bots.length}`);
  }
  await closeDb();
})().catch((e) => { console.error(e); process.exit(1); });
