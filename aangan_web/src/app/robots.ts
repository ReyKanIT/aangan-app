import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // /events and /kuldevi are publicly shareable — they have generateMetadata
      // set up for WhatsApp / Googlebot preview. Blocking them killed the viral
      // loop (every forwarded event link rendered a plain-text fallback).
      allow: ['/', '/invite', '/festivals', '/panchang', '/login', '/demo', '/privacy', '/terms', '/support', '/tithi-reminders', '/chatbot', '/events', '/kuldevi'],
      disallow: ['/feed', '/family', '/settings', '/admin', '/profile-setup', '/otp', '/auth', '/notifications', '/upload', '/messages', '/api/'],
    },
    sitemap: 'https://aangan.app/sitemap.xml',
  };
}
