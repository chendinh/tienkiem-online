// Gives every account the đạo hiệu of its e-mail (and the starting privileges, once).
//   npx tsx scripts/dao-backfill.ts            list what would change (nothing is written)
//   npx tsx scripts/dao-backfill.ts --apply    do it
// It uses DATABASE_URL (from .env.local or the environment): check which database that is before using --apply.
try { (process as any).loadEnvFile('.env.local'); } catch {}
(async () => {
  const apply = process.argv.includes('--apply');
  const { backfillDao } = await import('../lib/server/daobackfill');
  const { closeDb } = await import('../lib/server/db');
  const host = (() => { try { return new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL || '').host; } catch { return '(not set)'; } })();
  console.log(`database: ${host}  mode: ${apply ? 'APPLY' : 'dry run'}`);
  const r = await backfillDao(apply);
  console.log(`${r.total} accounts, ${r.changed.length} ${apply ? 'changed' : 'would change'}`);
  for (const c of r.changed.slice(0, 50)) console.log(`  ${c.email}: ${c.from || '(none)'} -> ${c.to || '(none)'}`);
  if (r.changed.length > 50) console.log(`  ... and ${r.changed.length - 50} more`);
  await closeDb();
})().catch((e) => { console.error(e); process.exit(1); });
