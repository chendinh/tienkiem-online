// Small copies of the creature pictures for lists: public/art/monsters/sm/{sp}.jpg and {sp}_mut.jpg (192 px). The popup uses the originals.
//   npm run thumbs        makes the missing ones, --force makes all again. `npm run pregen` runs it after drawing.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as C from '../lib/content';
const force = process.argv.includes('--force');
const root = path.join(process.cwd(), 'public');
(async () => {
  let made = 0, bytesFrom = 0, bytesTo = 0;
  for (const s of C.SPECIES) for (const mut of [false, true]) {
    const from = path.join(root, C.monsterArt(s.id, mut)), to = path.join(root, C.monsterArt(s.id, mut, true));
    if (!fs.existsSync(from) || (!force && fs.existsSync(to) && fs.statSync(to).mtimeMs >= fs.statSync(from).mtimeMs)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    await sharp(from).resize(192, 192, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toFile(to);
    made++; bytesFrom += fs.statSync(from).size; bytesTo += fs.statSync(to).size;
  }
  console.log(made ? `${made} thumbnails: ${(bytesFrom / 1024).toFixed(0)} KB of originals -> ${(bytesTo / 1024).toFixed(0)} KB` : 'thumbnails are up to date');
})();
