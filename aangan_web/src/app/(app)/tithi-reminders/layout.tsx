import type { Metadata } from 'next';
import { siteUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'तिथि अनुस्मारक — Tithi Reminders | Aangan आँगन',
  description:
    'हिंदू तिथि के अनुसार जन्मदिन, श्राद्ध, जयंती और त्योहारों के अनुस्मारक सेट करें। Remember birthdays, shraddha, anniversaries by Hindu tithi — never miss a lunar date.',
  keywords: [
    'tithi reminders',
    'तिथि अनुस्मारक',
    'hindu birthday',
    'shraddha reminder',
    'tithi birthday',
    'lunar calendar reminder',
    'पंचांग अनुस्मारक',
  ],
  openGraph: {
    title: 'तिथि अनुस्मारक — Tithi Reminders',
    description: 'हिंदू तिथि के अनुसार जन्मदिन, श्राद्ध और त्योहारों के अनुस्मारक',
    url: siteUrl('/tithi-reminders'),
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan — तिथि अनुस्मारक' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'तिथि अनुस्मारक — Tithi Reminders | Aangan',
    description: 'Set reminders by Hindu tithi — birthdays, shraddha, festivals',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: siteUrl('/tithi-reminders'),
  },
};

export default function TithiRemindersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
