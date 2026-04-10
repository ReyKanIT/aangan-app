import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/feed', '/family', '/events', '/settings', '/admin', '/profile-setup', '/otp', '/auth', '/notifications', '/upload'],
    },
    sitemap: 'https://aangan.app/sitemap.xml',
  };
}
