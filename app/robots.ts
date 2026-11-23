import type { MetadataRoute } from 'next';

// Trial build: ask all crawlers to stay out.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
