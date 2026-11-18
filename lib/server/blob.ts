// Big files (the lab's clips) live in Vercel Blob, not in Postgres: Postgres is billed by what it sends out (Neon Free: 5 GB a month), and a phone asks a video for
// byte ranges, which the CDN does not cache in front of a function, so every piece came from the database. Blob is served from the CDN.
// Needs BLOB_READ_WRITE_TOKEN (Vercel: Storage > Blob > connect to the project). Without it the clips stay in the database, as before.
import { put } from '@vercel/blob';

export const blobOn = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export interface Stored { url: string; size: number }

export async function putBlob(pathname: string, data: Buffer, contentType: string): Promise<Stored> {
  const r = await put(pathname, data, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
  blobHost(r.url);
  return { url: r.url, size: data.length };
}
// Only our own store is ever read back (the url comes from the database, but a url is still a url).
export const blobHost = (u: string) => { const h = new URL(u).hostname; if (!/\.blob\.vercel-storage\.com$/.test(h)) throw new Error('blob: unexpected host'); };
export async function readBlob(url: string): Promise<Buffer> {
  blobHost(url);
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`blob ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
