import { query } from '@/lib/server/db';
import { parseRange } from '@/lib/anim';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A clip of the lab, served in pieces. iPhone Safari refuses to play a video unless the server answers Range requests with 206 and a Content-Range,
// and a serverless answer has a size limit, so each answer carries at most one piece (parseRange cuts it). Like pictures, a clip never changes
// (its id is a hash of what went into it), so it may be kept for ever. Public, like /api/img: the id is the only way to ask for it.
const TYPE: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm' };
const headers = (ext: string) => ({ 'Content-Type': TYPE[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{20}$/.test(id)) return new Response('not found', { status: 404 });
  try {
    const head = (await query<{ ext: string; n: number; url: string | null }>(`SELECT ext, octet_length(data) AS n, meta->'blob'->>'url' AS url FROM images WHERE id = $1`, [id])).rows[0];
    if (!head || !TYPE[head.ext]) return new Response('not found', { status: 404 });
    // a clip kept in Blob is served by the CDN: this function only points to it (no bytes leave the database)
    if (head.url) return new Response(null, { status: 302, headers: { Location: head.url, 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
    const size = Number(head.n);
    const range = parseRange(req.headers.get('range'), size);
    if (range === 'bad') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const [start, end] = range ? [range.start, range.end] : [0, size - 1];
    // only the piece is read from the database (substring of bytea counts from 1)
    const part = (await query<{ part: Buffer }>('SELECT substring(data FROM $2::int FOR $3::int) AS part FROM images WHERE id = $1', [id, start + 1, end - start + 1])).rows[0]?.part;
    if (!part) return new Response('not found', { status: 404 });
    return new Response(new Uint8Array(part), range
      ? { status: 206, headers: { ...headers(head.ext), 'Content-Length': String(part.length), 'Content-Range': `bytes ${start}-${end}/${size}` } }
      : { status: 200, headers: { ...headers(head.ext), 'Content-Length': String(part.length) } });
  } catch (e) {
    console.error('[tutien] clip', id, e);
    return new Response('error', { status: 500 });
  }
}
