import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { FESTIVALS_2026 } from '@/data/festivals2026';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  // Per-festival landing pages — one URL per festival, indexed individually
  // for SEO long-tail. CMO Review ICE #3 growth bet.
  const festivalEntries: MetadataRoute.Sitemap = FESTIVALS_2026.map((f) => ({
    url: `${base}/festivals/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));
  // Static public routes only. Event detail pages are crawlable
  // (see robots.ts) but we don't enumerate them here because they
  // require auth-aware RLS reads and may leak private events if we
  // listed every UUID. Googlebot discovers them via shared WhatsApp
  // links, which is exactly the viral path we want.
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/invite`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/panchang`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/festivals`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/kuldevi`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/chatbot`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/support`, lastModified: new Date(), priority: 0.6 },
    { url: `${base}/tithi-reminders`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
    ...festivalEntries,
  ];
}
