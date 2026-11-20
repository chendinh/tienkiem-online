// Draw the pictures of Vạn Giới Tinh Đồ again with the image model, into public/art/galaxy (then commit them).
//   npm run gen:galaxy -- thienhuyen          both sizes of one picture
//   npm run gen:galaxy -- thienhuyen 1k       one size
//   npm run gen:galaxy -- all                 everything (about 2 USD)
// Needs FAL_KEY in .env.local. Names: map, thienhuyen, huyenminh, xichdiem, thanhde, tutieu, hondon.
import { GX_ART_NAMES } from '../lib/galaxyArt';
import { draw } from '../lib/server/galaxyArt';

try { (process as any).loadEnvFile('.env.local'); } catch {}

async function main() {
  const [a, b] = process.argv.slice(2);
  const names = !a || a === 'all' ? GX_ART_NAMES : [a];
  const sizes = b === '2k' || b === '1k' ? [b] : (['2k', '1k'] as const);
  let total = 0;
  for (const n of names) for (const s of sizes) {
    process.stdout.write(`${n} ${s} … `);
    const r = await draw(n, s as '2k' | '1k');
    total += r.cost;
    console.log(r.files.join(', '));
  }
  console.log(`done, about ${total.toFixed(2)} USD`);
}
main().catch((e) => { console.error(e?.code || e); process.exit(1); });
