// For the OLD file version only (the pictures now live in the database, see npm run db:migrate): look after the pictures in data/gen, one folder per kind and item icons one folder per slot.
//   npm run gen:report      what is there: files, size and cost per folder, plus anything odd. Changes nothing.
//   npm run gen:organize    moves every file to the folder it belongs in (safe to run again, never overwrites, never deletes).
// The server can run meanwhile: it looks in every folder, so a picture is found before, during and after the move.
import fs from 'node:fs';
import path from 'node:path';
import { GEN_ROOT, folderFor } from '../lib/imagegen';

const apply = process.argv.includes('--apply');
const IMG = /^([a-f0-9]{20})\.(jpg|png|webp)$/, SMALL = /^([a-f0-9]{20})\.(?:sm|md|lg)\.jpg$/, META = /^([a-f0-9]{20})\.json$/;
const mb = (n: number) => (n / 1e6).toFixed(1) + ' MB';
const read = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const size = (f: string) => { try { return fs.statSync(f).size; } catch { return 0; } };

type Rec = { id: string; img?: string; small: string[]; meta?: string };
const recs = new Map<string, Rec>(), odd: string[] = [];
(function walk(dir: string) {
  let entries: fs.Dirent[] = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    const m = IMG.exec(e.name) || SMALL.exec(e.name) || META.exec(e.name);
    if (!m) { odd.push(`${e.name.endsWith('.tmp') ? 'unfinished download' : 'not a picture file'}: ${path.relative(GEN_ROOT, full)}`); continue; }
    const r = recs.get(m[1]) || { id: m[1], small: [] }; recs.set(m[1], r);
    if (IMG.test(e.name)) r.img = full; else if (META.test(e.name)) r.meta = full; else r.small.push(full);
  }
})(GEN_ROOT);

// where each picture belongs, from its description file; a picture without one goes to "other"
const metaOf = new Map<string, any>();
const folderOf = (r: Rec) => { if (!metaOf.has(r.id)) metaOf.set(r.id, r.meta ? read(r.meta) : null); const m = metaOf.get(r.id); return m ? folderFor(m) : 'other'; };
const moves: { from: string; to: string }[] = [];
for (const r of recs.values()) {
  const dest = path.join(GEN_ROOT, folderOf(r));
  for (const f of [r.img, r.meta, ...r.small]) if (f && path.dirname(f) !== dest) moves.push({ from: f, to: path.join(dest, path.basename(f)) });
}

if (apply) {
  let done = 0, clash = 0;
  for (const m of moves) {
    fs.mkdirSync(path.dirname(m.to), { recursive: true });
    if (fs.existsSync(m.to)) { clash++; console.warn('exists, left in place:', path.relative(GEN_ROOT, m.from)); continue; }
    fs.renameSync(m.from, m.to); done++;
  }
  console.log(`moved ${done} file(s)${clash ? `, ${clash} left because the target already exists` : ''}`);
  for (const d of [path.join(GEN_ROOT, 'item')]) { try { for (const s of fs.readdirSync(d, { withFileTypes: true })) if (s.isDirectory() && fs.readdirSync(path.join(d, s.name)).length === 0) fs.rmdirSync(path.join(d, s.name)); } catch {} }
} else if (moves.length) {
  const by = new Map<string, number>(); for (const m of moves) { const k = path.relative(GEN_ROOT, path.dirname(m.to)); by.set(k, (by.get(k) || 0) + 1); }
  console.log(`${moves.length} file(s) are not in their folder yet and would move: ${[...by].map(([k, n]) => `${k} ${n}`).join(', ')}.\nRun npm run gen:organize to do it.`);
} else console.log('every file is already in its folder.');

// what is in each folder (a dry run shows it as it would be after the move)
type Row = { n: number; small: number; bytes: number; cost: number; models: Set<string>; first: string; last: string };
const rows = new Map<string, Row>(), problems = [...odd];
for (const r of recs.values()) {
  const key = folderOf(r), R = rows.get(key) || { n: 0, small: 0, bytes: 0, cost: 0, models: new Set<string>(), first: '', last: '' }; rows.set(key, R);
  const m = metaOf.get(r.id);
  if (r.img) { R.n++; R.bytes += size(r.img); } else problems.push(`${r.id}: description exists but the picture is missing`);
  for (const s of r.small) { R.small++; R.bytes += size(s); if (!r.img) problems.push(`${r.id}: small copy without the original`); }
  if (r.img && !r.meta) problems.push(`${r.id}: picture without a description file (kept in "other")`);
  if (m) { R.cost += Number(m.cost) || 0; if (m.model) R.models.add(m.model); const d = String(m.date || ''); if (d && (!R.first || d < R.first)) R.first = d; if (d > R.last) R.last = d; }
}
console.log('\nfolder'.padEnd(18) + 'pictures'.padStart(9) + 'small'.padStart(7) + 'size'.padStart(11) + 'cost USD'.padStart(10) + '  models / dates');
let tn = 0, tb = 0, tc = 0;
for (const k of [...rows.keys()].sort()) {
  const r = rows.get(k)!; tn += r.n; tb += r.bytes; tc += r.cost;
  console.log(k.padEnd(18) + String(r.n).padStart(9) + String(r.small).padStart(7) + mb(r.bytes).padStart(11) + r.cost.toFixed(2).padStart(10) + `  ${[...r.models].join(', ') || '-'} (${r.first.slice(0, 10)} to ${r.last.slice(0, 10)})`);
}
console.log('total'.padEnd(18) + String(tn).padStart(9) + ''.padStart(7) + mb(tb).padStart(11) + tc.toFixed(2).padStart(10));
if (problems.length) { console.log(`\n${problems.length} thing(s) to look at:`); for (const p of problems.slice(0, 40)) console.log('  - ' + p); if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`); }
