import type { Metadata, Viewport } from 'next';
import './globals.css';

const APP_URL = 'https://aangan.app';
const APP_NAME = 'Aangan आँगन';
const APP_TAGLINE = 'Your Family\'s Digital Home';
const APP_DESCRIPTION =
  'India\'s first Hindi-first family social network. Connect with your family, share moments, track Hindu Panchang, manage family events with RSVP, and build your family tree. Designed so even grandmothers can use it.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C8A84B',
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'family social network',
    'Indian family app',
    'Hindu calendar',
    'panchang',
    'family tree',
    'परिवार',
    'आँगन',
    'hindi app',
    'family events',
    'RSVP',
    'voice messages',
    'दादी टेस्ट',
    'kuldevi',
  ],
  authors: [{ name: 'ReyKan IT' }],
  creator: 'ReyKan IT',
  publisher: 'ReyKan IT',
  applicationName: APP_NAME,
  category: 'Social Networking',

  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    url: APP_URL,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    locale: 'hi_IN',
    alternateLocale: 'en_IN',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aangan आँगन — परिवार से जुड़ें, पल साझा करें',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },

  alternates: {
    canonical: APP_URL,
  },

  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': APP_NAME,
  },
};

// JSON-LD structured data for the app
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: APP_URL,
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Android',
  inLanguage: ['hi', 'en'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
  author: {
    '@type': 'Organization',
    name: 'ReyKan IT',
    url: APP_URL,
  },
  aggregateRating: undefined, // add when ratings are available
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
