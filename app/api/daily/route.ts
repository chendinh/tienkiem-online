import { dailyPacks } from '@/lib/daily';
import { ensureDaily } from '@/lib/server/dailystore';
import { json, guard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// What the browser needs of the daily content: every creature (saved pens may hold old ones) and the latest chronicle chapters.
// The journey beats stay on the server: the engine writes them into the feed.
export async function GET() {
  return guard(async () => {
    await ensureDaily();
    const packs = dailyPacks();
    return json({ ok: true, packs: packs.map((p, i) => ({ day: p.day, title: p.title, chronicle: i >= packs.length - 30 ? p.chronicle : '', tales: {}, beast: p.beast })) }, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  });
}
