import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://aangan.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/invite`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/panchang`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/festivals`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/chatbot`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/support`, lastModified: new Date(), priority: 0.6 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
  ];
}
