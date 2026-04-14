import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/invite', '/festivals', '/panchang', '/login', '/demo', '/privacy', '/terms'],
      disallow: ['/feed', '/family', '/events', '/settings', '/admin', '/profile-setup', '/otp', '/auth', '/notifications', '/upload', '/messages', '/kuldevi', '/api/'],
    },
    sitemap: 'https://aangan.app/sitemap.xml',
  };
}
