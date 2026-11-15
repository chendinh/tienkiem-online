import { getImage, getSmall, putSmall } from '@/lib/server/images';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' };
// A small copy for lists, made on first request and kept in the database next to the original. Popups use the original picture.
const SIZES: Record<string, { px: number; q: number }> = { sm: { px: 128, q: 72 } };
const pending = new Map<string, Promise<Buffer | null>>();

async function variant(id: string, data: Buffer, name: string): Promise<Buffer | null> {
  const spec = SIZES[name], key = `${id}.${name}`;
  const have = await getSmall(id);
  if (have) return have;
  let job = pending.get(key);
  if (!job) {
    job = (async () => {
      try {
        const sharp = (await import('sharp')).default;
        const out = await sharp(data).resize(spec.px, spec.px, { fit: 'cover' }).jpeg({ quality: spec.q, mozjpeg: true }).toBuffer();
        await putSmall(id, out);
        return out;
      } catch { return null; }   // no image library: the original is served instead
    })().finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}

// The face of a portrait: the head and shoulders from the top middle of the full-length picture, as a square (the 'sm' copy takes the middle of the picture, which is the chest).
const faces = new Map<string, Promise<Buffer | null>>();
function face(id: string, data: Buffer): Promise<Buffer | null> {
  let job = faces.get(id);
  if (!job) {
    job = (async () => {
      try {
        const sharp = (await import('sharp')).default, m = await sharp(data).metadata();
        const w = m.width || 0, h = m.height || 0;
        if (!w || !h) return null;
        const side = Math.min(Math.round(w * 0.38), h), left = Math.round((w - side) / 2), top = Math.min(Math.round(h * 0.05), h - side);
        return await sharp(data).extract({ left, top, width: side, height: side }).resize(192, 192).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      } catch { return null; }
    })().finally(() => setTimeout(() => faces.delete(id), 60000));
    faces.set(id, job);
  }
  return job;
}
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{20}$/.test(id)) return new Response('not found', { status: 404 });
  try {
    const pic = await getImage(id);
    if (!pic) return new Response('not found', { status: 404 });
    const size = new URL(req.url).searchParams.get('s') || '';
    let body: Buffer = pic.data, ext = pic.ext;
    if (size === 'face') { const v = await face(id, pic.data); if (v) { body = v; ext = 'jpg'; } }
    else if (size in SIZES) { const v = await variant(id, pic.data, size); if (v) { body = v; ext = 'jpg'; } }
    // The id is a hash of everything that went into the picture, so a picture never changes: browsers and the CDN may keep it for ever.
    return new Response(new Uint8Array(body), { headers: { 'Content-Type': MIME[ext] || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
  } catch (e) {
    console.error('[tutien] picture', id, e);
    return new Response('error', { status: 500 });
  }
}
