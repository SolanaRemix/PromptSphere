import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://promptsphere.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/marketplace', '/docs'],
        disallow: ['/dashboard', '/admin', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
