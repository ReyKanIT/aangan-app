import type { Metadata } from 'next';
import InviteClient from './InviteClient';
import { siteUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'परिवार को आमंत्रित करें — Invite Your Family to Aangan',
  description:
    'अपने परिवार को Aangan पर बुलाएं — WhatsApp पर एक क्लिक में आमंत्रण भेजें। हिंदी-फर्स्ट परिवार सोशल नेटवर्क। Invite your family to Aangan — send a WhatsApp invite in one tap.',
  keywords: [
    'invite family',
    'परिवार आमंत्रण',
    'family invite WhatsApp',
    'Aangan invite',
    'परिवार जोड़ें',
    'WhatsApp family group',
    'Hindi family network',
  ],
  openGraph: {
    title: 'परिवार को आमंत्रित करें — Invite Family to Aangan',
    description:
      'WhatsApp पर एक क्लिक में अपने परिवार को Aangan में बुलाएं। India\'s first Hindi-first family social network.',
    type: 'website',
    url: siteUrl('/invite'),
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan — परिवार को आमंत्रित करें' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'परिवार को Aangan पर आमंत्रित करें',
    description: 'WhatsApp पर एक क्लिक में परिवार को बुलाएं।',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: siteUrl('/invite'),
  },
};

export default function InvitePage() {
  return <InviteClient />;
}
