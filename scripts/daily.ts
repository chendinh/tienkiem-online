// Run the daily job by hand (or from any scheduler: crontab, GitHub Actions) against the database in .env.local / the environment.
//   npm run daily                  today (UTC), writes the pack and draws the picture
//   npm run daily -- --no-art      text only
//   npm run daily -- --no-new      story only (no new creature or weapon); --new forces them. Left out, the job decides by the picture credit.
//   npm run daily -- --day=2026-11-20 --force    rewrite the pack of a day
import { runDaily } from '../lib/server/dailygen';
import { dayKey } from '../lib/daily';
try { (process as any).loadEnvFile('.env.local'); } catch {}

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const day = arg('day') || dayKey(Date.now());
runDaily(day, { art: !process.argv.includes('--no-art'), force: process.argv.includes('--force'), ...(process.argv.includes('--no-new') ? { fresh: false } : process.argv.includes('--new') ? { fresh: true } : {}) })
  .then((r) => { console.log(JSON.stringify(r, null, 1)); process.exit(r.story === 'failed' ? 1 : 0); })
  .catch((e) => { console.error(e); process.exit(1); });
