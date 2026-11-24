import fs from 'node:fs';
import path from 'node:path';

// The files shipped in public/art ('books/x.jpg' ...), as JSON. The owner's page (app/api/admin/art) tells which fixed pictures are still missing from it: a serverless function
// has no public folder to look at, so the list is taken when the site is built.
function artFiles() {
  const out = [], root = path.join(process.cwd(), 'public', 'art');
  const walk = (dir, rel) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`); else out.push(rel + e.name); } };
  try { walk(root, ''); } catch {}
  return JSON.stringify(out);
}

/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets test builds run without touching the .next folder of a running dev server
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: { ART_FILES: artFiles() },
  // A fixed picture whose file is not in this build (the owner had the server draw it): only then is the request sent on to app/api/art, which looks it up in the database.
  async rewrites() { return { beforeFiles: [], afterFiles: [], fallback: [{ source: '/art/:path*', destination: '/api/art/:path*' }] }; },
  // Trial build: ask search engines not to index any page, image or API response.
  async headers() { return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]; },
};
export default nextConfig;
