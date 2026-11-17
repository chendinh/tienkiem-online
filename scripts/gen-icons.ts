// Draws the round medallion icons of the header buttons (the same family as public/art/ui/ico_rank, ico_quest and ico_bag) into public/art/ui/ico_{id}.jpg.
// Standalone, like gen-skillfx: talks to fal.ai directly (FAL_KEY in .env.local), has its own cap, skips finished files.
//   npx tsx scripts/gen-icons.ts --dry            list what would be drawn and the estimated cost
//   npx tsx scripts/gen-icons.ts                  draw every missing icon
//   npx tsx scripts/gen-icons.ts --only market,pen --force
try { (process as any).loadEnvFile('.env.local'); } catch {}
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : '');
const OUT = path.join(process.cwd(), 'public', 'art', 'ui');
const MODEL = process.env.FAL_FX_MODEL || 'google/nano-banana-2.1';
const NANO = /nano-banana/.test(MODEL);
const PRICE = Number(process.env.FAL_FX_PRICE || (NANO ? 0.05 : 0.03));
const MAX_USD = Number(opt('--max-usd') || 1);
const ICONS: Record<string, string> = {
  market: 'a heap of gleaming gold ingots and glowing blue spirit stones, a red silk shop awning and a hanging red lantern above them',
  alchemy: 'an ancient bronze three-legged alchemy cauldron with a roaring green-gold flame beneath it and glowing round elixir pills floating above',
  night: 'a luminous crescent moon above a night market of small lantern-lit stalls, deep violet and indigo sky with drifting stars',
  arts: 'a flying immortal sword wrapped in swirling blue-white qi and a fork of lightning, with an open scroll of glowing talismans behind it',
  pen: 'the majestic head of a mythical spirit beast, a qilin with a flowing mane and jade horn, glowing eyes, wreathed in green mist',
  story: 'an ancient open book of heaven with golden glowing characters rising from its pages, tied with a red silk cord, soft light rays',
  odds: 'a bagua eight-trigram wheel with a pair of jade dice and an ancient coin in the centre, glowing azure runes',
  settings: 'an ornate bronze luopan geomantic compass with fine concentric rings, gear teeth and a glowing jade needle',
};
const STYLE = ' Game UI icon: a single perfectly round medallion centered on a pure solid black background (#000000), about 80 percent of the frame, nothing else in the picture. Ornate polished gold rim carved with traditional Chinese xianxia cloud and key patterns, a thin inner gold ring, an enamel inner disc in deep jade green and cinnabar red, rich painterly 3D rendering with soft rim light and a faint glow, high detail, no text, no letters, no watermark.';
const promptOf = (id: string) => `A round fantasy medallion icon showing ${ICONS[id]}.${STYLE}`;
const seedOf = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 29) % 1_000_000;
async function draw(id: string): Promise<Buffer> {
  const { fal } = await import('@fal-ai/client');
  const input: any = NANO
    ? { prompt: promptOf(id), aspect_ratio: '1:1', resolution: '1K', seed: seedOf(id), num_images: 1, output_format: 'jpeg', ...(/nano-banana-2\.1/.test(MODEL) ? { thinking_level: process.env.FAL_THINKING || 'medium' } : {}) }
    : { prompt: promptOf(id), image_size: { width: 1024, height: 1024 }, seed: seedOf(id), num_images: 1, output_format: 'jpeg', enable_safety_checker: true };
  const res: any = await fal.subscribe(MODEL, { input });
  const url = res?.data?.images?.[0]?.url;
  if (!url) throw new Error('no image in the answer');
  if (!/(^|\.)fal\.(media|ai|run)$/.test(new URL(url).hostname)) throw new Error('unexpected image host');
  let last: any;
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`download ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}
(async () => {
  const only = opt('--only') ? opt('--only').split(',').map((s) => s.trim()).filter(Boolean) : [];
  const bad = only.filter((id) => !ICONS[id]);
  if (bad.length) { console.error(`unknown icon: ${bad.join(', ')}`); process.exit(1); }
  const ids = (only.length ? only : Object.keys(ICONS)).filter((id) => flag('--force') || !fs.existsSync(path.join(OUT, `ico_${id}.jpg`)));
  const est = ids.length * PRICE;
  console.log(`model ${MODEL} | to draw ${ids.length} | estimated $${est.toFixed(2)} (cap $${MAX_USD})`);
  if (flag('--dry')) { ids.forEach((id) => console.log(' ', id)); return; }
  if (!ids.length) { console.log('nothing to do'); return; }
  if (est > MAX_USD) { console.error('over the cap: raise it with --max-usd'); process.exit(1); }
  if (!process.env.FAL_KEY) { console.error('FAL_KEY is missing (.env.local)'); process.exit(1); }
  const failed: string[] = []; const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const buf = await draw(id);
        await sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 88 }).toFile(path.join(OUT, `ico_${id}.jpg`));
        console.log('drawn', id);
      } catch (e: any) { failed.push(id); console.log('failed', id, String(e?.message || e).slice(0, 140)); }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log(failed.length ? `DONE with ${failed.length} not drawn: ${failed.join(', ')}` : 'DONE', `| about $${((ids.length - failed.length) * PRICE).toFixed(2)}`);
  process.exit(failed.length ? 2 : 0);
})();
