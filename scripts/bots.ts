// Tu Sĩ máy: characters that play by themselves (lib/bots.ts).
//   npx tsx scripts/bots.ts                 show the bots (and what a create would do)
//   npx tsx scripts/bots.ts --create        make the 10 bots that do not exist yet (--count=N for fewer)
//   npx tsx scripts/bots.ts --step          let every bot play up to now (the server does this by itself while people visit)
//   npx tsx scripts/bots.ts --pictures      redraw every bot's picture from what it wears NOW (costs image money; the server does it every two days by itself)
//   npx tsx scripts/bots.ts --remove        delete all bots
// It uses DATABASE_URL (from .env.local or the environment): check which database that is before changing anything.
try { (process as any).loadEnvFile('.env.local'); } catch {}
(async () => {
  const has = (f: string) => process.argv.includes(f);
  const count = Number((process.argv.find((a) => a.startsWith('--count=')) || '--count=10').slice(8));
  const { closeDb, query } = await import('../lib/server/db');
  const { createBots, removeBots, localAvatars } = await import('../lib/server/botseed');
  const { botAccounts, runBots, patchAvatar } = await import('../lib/server/bots');
  const host = (() => { try { return new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL || '').host; } catch { return '(not set)'; } })();
  const mode = has('--create') ? 'CREATE' : has('--step') ? 'STEP' : has('--pictures') ? 'PICTURES' : has('--remove') ? 'REMOVE' : 'list';
  console.log(`database: ${host}  mode: ${mode}`);
  if (has('--create')) {
    const r = await createBots(count);
    for (const c of r.created) console.log(`  + bot ${c.n}: ${c.name} [${c.dao}] ${c.avatar ? '' : '(no picture)'}`);
    if (r.existing.length) console.log(`  already there: ${r.existing.length}`);
  }
  if (has('--step')) console.log('  ', JSON.stringify(await runBots(Date.now(), 240_000)));
  if (has('--pictures')) {
    for (const b of await botAccounts()) await patchAvatar(b.id, (av) => { av.at = 0; });   // due now
    for (let pass = 1; pass <= 6; pass++) {   // a picture is drawn in the pass that asks for it and stored in the next one
      const r = await runBots(Date.now(), 240_000);
      console.log(`  pass ${pass}:`, JSON.stringify(r));
      if (r.drawing === 0) break;
    }
  }
  if (has('--remove')) console.log(`  removed ${await removeBots()}`);
  const list = await botAccounts();
  console.log(`${list.length} bots in the database; ${localAvatars().length} local pictures to borrow`);
  for (const b of list) {
    const e = (await query<{ entry: any }>('SELECT entry FROM rank_entries WHERE acc = $1', [b.id])).rows[0]?.entry;
    if (e) console.log(`  ${b.email}: ${e.name} · Lv${e.level} · chiến lực ${e.power}`);
  }
  await closeDb();
})().catch((e) => { console.error(e); process.exit(1); });
