/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets test builds run without touching the .next folder of a running dev server
const nextConfig = { reactStrictMode: true, distDir: process.env.NEXT_DIST_DIR || '.next' };
export default nextConfig;
