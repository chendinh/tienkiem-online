/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets test builds run without touching the .next folder of a running dev server
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Trial build: ask search engines not to index any page, image or API response.
  async headers() { return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]; },
};
export default nextConfig;
