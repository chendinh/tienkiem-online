// CI data check (Requirement 6.4, 7.13, 20.15, 21.18, 22.16, 23.16, 24.16 ...): `npm run check` exits 1 when Balance_Config or the Content_Catalog is invalid.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateBalance } from '../lib/balance';
import { validateCatalog } from '../lib/validate';
import { validateSkillFx, usedTextures } from '../lib/skillfx';
import { ERR } from '../lib/strings';

const problems: string[] = [...validateBalance().map((m) => `Balance_Config: ${m}`), ...validateCatalog().map((m) => `Content_Catalog: ${m}`), ...validateSkillFx()];
// A missing effect picture is not fatal (the stage falls back to the plain icon), so it is only a warning: run `npm run gen:skillfx`.
const noTex = usedTextures().filter((t) => !existsSync(join(__dirname, '..', 'public', 'art', 'fx', `${t}.webp`)));
if (noTex.length) console.warn(`Cảnh báo: thiếu ${noTex.length} ảnh hiệu ứng chiêu thức (${noTex.join(', ')}). Chạy: npm run gen:skillfx`);

// every error code the server can return must have a Vietnamese message in the string table (Requirement 31.11)
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
const root = join(__dirname, '..');
const used = new Set<string>();
for (const f of [...walk(join(root, 'lib')), ...walk(join(root, 'app'))]) {
  if (f.endsWith('strings.ts')) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/['"`](E_[A-Z_]+)['"`]/g)) used.add(m[1]);
}
for (const code of used) if (!(code in ERR)) problems.push(`String table: mã lỗi ${code} chưa có thông báo tiếng Việt`);

if (problems.length) { console.error(`${problems.length} lỗi dữ liệu:\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log(`Balance_Config và Content_Catalog hợp lệ. ${used.size} mã lỗi đều có thông báo.`);
