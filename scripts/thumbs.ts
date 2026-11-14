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
  // interface frames (buttons, seals): the black around the object is cut away (a flood fill from the edges, so the dark inside of the object stays), then trimmed and shrunk
  // public/art/ui/{btn_a,...}.jpg -> public/art/ui/cut/{btn_a,...}.png
  for (const id of Object.keys(C.PROP_EN).filter((k) => k.startsWith('ui_')).map((k) => k.slice(3))) {
    const from = path.join(root, C.uiArt(id)), to = path.join(root, 'art/ui/cut', `${id}.png`);
    if (!fs.existsSync(from) || (!force && fs.existsSync(to) && fs.statSync(to).mtimeMs >= fs.statSync(from).mtimeMs)) continue;
    const { data, info } = await sharp(from).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, seen = new Uint8Array(W * H), q: number[] = [];
    const dark = (p: number) => data[p * 4] + data[p * 4 + 1] + data[p * 4 + 2] < 66;
    const push = (x: number, y: number) => { const p = y * W + x; if (!seen[p] && dark(p)) { seen[p] = 1; q.push(p); } };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (q.length) { const p = q.pop()!, x = p % W, y = (p / W) | 0; if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1); }
    for (let p = 0; p < W * H; p++) if (seen[p]) data[p * 4 + 3] = 0;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const wide = id.startsWith('btn') || id.startsWith('lbl');
    await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }).resize(wide ? 420 : 160, undefined, { fit: 'inside' }).png({ compressionLevel: 9, palette: false }).toFile(to);
    made++; bytesFrom += fs.statSync(from).size; bytesTo += fs.statSync(to).size;
  }
  console.log(made ? `${made} thumbnails: ${(bytesFrom / 1024).toFixed(0)} KB of originals -> ${(bytesTo / 1024).toFixed(0)} KB` : 'thumbnails are up to date');
})();
