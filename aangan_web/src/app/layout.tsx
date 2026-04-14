import type { Metadata, Viewport } from 'next';
import { Poppins, Tiro_Devanagari_Hindi } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: ['400'],
  variable: '--font-tiro',
  display: 'swap',
});

const APP_URL = 'https://aangan.app';
const APP_NAME = 'Aangan आँगन';
const APP_TAGLINE = 'Your Family\'s Digital Home';
const APP_DESCRIPTION =
  'Aangan आँगन — भारत का पहला हिंदी-फर्स्ट परिवार सोशल नेटवर्क। परिवार से जुड़ें, पल साझा करें, पंचांग देखें, त्योहार मनाएं। India\'s first Hindi-first family social network — connect with family, share moments, track Panchang, manage events. Designed so even grandmothers can use it.';

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

  manifest: '/manifest.json',

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': APP_NAME,
  },
};

// JSON-LD structured data — multiple schemas for richer SEO snippets
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'ReyKan IT',
      url: APP_URL,
      logo: `${APP_URL}/icons/icon-512x512.png`,
      sameAs: [APP_URL],
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: APP_NAME,
      description: APP_DESCRIPTION,
      inLanguage: ['hi-IN', 'en-IN'],
      publisher: { '@id': `${APP_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${APP_URL}/festivals?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'MobileApplication',
      '@id': `${APP_URL}/#app`,
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
      author: { '@id': `${APP_URL}/#organization` },
      featureList: [
        'Hindi voice-to-text posts',
        'Family tree (3 levels)',
        'Hindu Panchang & festival calendar',
        'Voice messages',
        'Events with RSVP',
        'Kuldevi tradition tracking',
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" className={`${poppins.variable} ${tiro.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={poppins.className}>{children}</body>
    </html>
  );
}

