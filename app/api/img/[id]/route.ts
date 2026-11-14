import fs from 'node:fs/promises';
import { fileFor } from '@/lib/imagegen';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' };
// A small copy for lists, made on first request and kept next to the original (data/gen/<kind>/<id>.sm.jpg). Popups use the original picture.
const SIZES: Record<string, { px: number; q: number }> = { sm: { px: 128, q: 72 } };
const pending = new Map<string, Promise<string | null>>();

async function variant(file: string, name: string): Promise<string | null> {
  const spec = SIZES[name], out = file.replace(/\.(jpg|png|webp)$/, `.${name}.jpg`);
  try { await fs.access(out); return out; } catch {}
  let job = pending.get(out);
  if (!job) {
    job = (async () => {
      try {
        const sharp = (await import('sharp')).default;
        const tmp = `${out}.${process.pid}.tmp`;
        await sharp(file).resize(spec.px, spec.px, { fit: 'cover' }).jpeg({ quality: spec.q, mozjpeg: true }).toFile(tmp);
        await fs.rename(tmp, out);
        return out;
      } catch { return null; }   // no image library: the original is served instead
    })().finally(() => pending.delete(out));
    pending.set(out, job);
  }
  return job;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const f = fileFor(id);
  if (!f) return new Response('not found', { status: 404 });
  const size = new URL(req.url).searchParams.get('s') || '';
  let file = f.file, ext = f.ext;
  if (size in SIZES) { const v = await variant(f.file, size); if (v) { file = v; ext = 'jpg'; } }
  const buf = await fs.readFile(file);
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': MIME[ext] || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
