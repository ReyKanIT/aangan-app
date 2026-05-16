// Per-festival SEO landing page — one URL per festival, individually indexed.
// CMO Review ICE #3 growth bet.
//
// Each page is statically generated at build time (generateStaticParams),
// has its own Metadata (title + description + OG image), JSON-LD Event +
// FAQPage schemas, and a Daily Panchang opt-in CTA to convert SEO visits
// into recurring touchpoints.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  FESTIVALS_2026,
  FESTIVALS_BY_SLUG,
  defaultSignificance,
  upcomingFestivals,
  type Festival,
} from '@/data/festivals2026';
import DailyPanchangOptIn from '@/components/panchang/DailyPanchangOptIn';
import { RELEASES } from '@/data/versions';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render all festival pages at build time → fully static, no runtime DB hit.
export function generateStaticParams() {
  return FESTIVALS_2026.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const f = FESTIVALS_BY_SLUG.get(slug);
  if (!f) return { title: 'Festival not found' };

  const yearIso = f.isoDate.slice(0, 4);
  const title = `${f.nameHindi} ${yearIso} — ${f.name} | तारीख, महत्व, पूजा विधि`;
  const description = `${f.nameHindi} ${yearIso}: ${f.date} को मनाया जाएगा। ${f.desc} | ${f.name} ${yearIso} date, significance and how to celebrate with your family — Aangan आँगन.`;

  return {
    title,
    description,
    keywords: [
      f.name,
      f.nameHindi,
      `${f.name} ${yearIso}`,
      `${f.nameHindi} ${yearIso}`,
      `${f.name} date`,
      `${f.nameHindi} तारीख`,
      `${f.name} significance`,
      'hindu festival',
      'भारतीय त्योहार',
      'panchang',
      'aangan',
    ],
    openGraph: {
      title: `${f.nameHindi} ${yearIso} — ${f.name}`,
      description: `${f.date} · ${f.desc}`,
      type: 'article',
      url: `https://aangan.app/festivals/${f.slug}`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${f.name} ${yearIso}` }],
      locale: 'hi_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${f.nameHindi} ${yearIso} — ${f.name}`,
      description: f.desc,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `https://aangan.app/festivals/${f.slug}`,
    },
  };
}

function FestivalCard({ f }: { f: Festival }) {
  return (
    <Link
      href={`/festivals/${f.slug}`}
      className="block bg-white rounded-xl border border-haldi-gold/15 p-4 hover:border-haldi-gold/40 hover:shadow-sm transition-all"
    >
      <p className="text-sm text-haldi-gold-dark font-heading">{f.date}</p>
      <p className="text-base font-semibold text-brown mt-1">{f.nameHindi}</p>
      <p className="text-sm text-brown-light">{f.name}</p>
    </Link>
  );
}

export default async function FestivalDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const f = FESTIVALS_BY_SLUG.get(slug);
  if (!f) notFound();

  const sig = f.significanceHi
    ? { hi: f.significanceHi, en: f.significanceEn ?? '' }
    : defaultSignificance(f);

  const yearIso = f.isoDate.slice(0, 4);
  const fullDateEn = new Date(f.isoDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Days until this festival (positive if upcoming, 0 if today, negative if past).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const festDate = new Date(f.isoDate);
  const daysUntil = Math.round((festDate.getTime() - today.getTime()) / 86400000);

  // Three upcoming festivals for "Related" section (excluding self)
  const related = upcomingFestivals()
    .filter((u) => u.slug !== f.slug)
    .slice(0, 3);

  const shareText = `${f.nameHindi} ${yearIso} — ${f.date} | ${f.desc}\nhttps://aangan.app/festivals/${f.slug}`;

  return (
    <main className="min-h-screen bg-cream font-body text-brown">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-haldi-gold/20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl text-haldi-gold tracking-wide">
            Aangan <span className="text-haldi-gold-dark">आँगन</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-dadi px-5 py-2 rounded-full bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
          >
            Login / Sign Up
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-sm text-brown-light/70 mb-4">
          <Link href="/" className="hover:text-haldi-gold">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/festivals" className="hover:text-haldi-gold">{'त्योहार · Festivals'}</Link>
          <span className="mx-2">›</span>
          <span className="text-brown">{f.nameHindi}</span>
        </nav>

        {/* Hero */}
        <header className="mb-8">
          <p className="text-base text-haldi-gold-dark font-heading mb-1">{f.date} {yearIso}</p>
          <h1 className="font-heading text-4xl md:text-5xl text-haldi-gold">
            {f.nameHindi}
          </h1>
          <p className="text-xl text-brown mt-2">{f.name}</p>
          <p className="text-base text-brown-light mt-1">{fullDateEn}</p>
          {daysUntil > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mehndi-green/10 border border-mehndi-green/30">
              <span className="text-mehndi-green font-semibold text-base">
                {daysUntil === 1 ? 'कल ही!' : `${daysUntil} दिन बाकी`}
              </span>
              <span className="text-brown-light text-sm">
                {daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days to go`}
              </span>
            </div>
          )}
          {daysUntil === 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-haldi-gold/15 border border-haldi-gold/40">
              <span className="text-haldi-gold-dark font-semibold text-base">{'आज है!'}</span>
              <span className="text-brown-light text-sm">Today!</span>
            </div>
          )}
          {daysUntil < 0 && daysUntil >= -7 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-dark border border-haldi-gold/20">
              <span className="text-brown-light text-base">{Math.abs(daysUntil)} दिन पहले हुआ · {Math.abs(daysUntil)} days ago</span>
            </div>
          )}
        </header>

        {/* Significance */}
        <section className="bg-white rounded-2xl border border-haldi-gold/20 p-6 md:p-8 mb-6">
          <h2 className="font-heading text-2xl text-haldi-gold mb-3">
            {f.nameHindi} का महत्व · Significance
          </h2>
          <p className="text-base text-brown-light leading-relaxed mb-4">{sig.hi}</p>
          {sig.en && <p className="text-base text-brown-light leading-relaxed">{sig.en}</p>}
        </section>

        {/* Puja Vidhi (optional) */}
        {f.pujaVidhi && f.pujaVidhi.length > 0 && (
          <section className="bg-white rounded-2xl border border-haldi-gold/20 p-6 md:p-8 mb-6">
            <h2 className="font-heading text-2xl text-haldi-gold mb-3">{'पूजा विधि · How to celebrate'}</h2>
            <ol className="list-decimal list-inside space-y-2 text-base text-brown-light">
              {f.pujaVidhi.map((step, i) => (<li key={i}>{step}</li>))}
            </ol>
          </section>
        )}

        {/* FAQ (optional) */}
        {f.faq && f.faq.length > 0 && (
          <section className="bg-white rounded-2xl border border-haldi-gold/20 p-6 md:p-8 mb-6">
            <h2 className="font-heading text-2xl text-haldi-gold mb-3">{'सवाल-जवाब · FAQ'}</h2>
            <dl className="space-y-4">
              {f.faq.map((qa, i) => (
                <div key={i}>
                  <dt className="font-semibold text-brown text-base mb-1">{qa.q}</dt>
                  <dd className="text-base text-brown-light">{qa.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Share */}
        <section className="text-center my-8">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 min-h-dadi rounded-2xl bg-[#25D366] text-white font-semibold text-base hover:bg-[#1DA851] transition-colors shadow-lg shadow-[#25D366]/25"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
            </svg>
            {'WhatsApp पर भेजें · Share'}
          </a>
        </section>

        {/* Opt-in CTA */}
        <DailyPanchangOptIn source="festival_page" />

        {/* Related festivals */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-xl text-haldi-gold-dark mb-3">
              {'आगामी त्योहार · Upcoming festivals'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {related.map((rf) => (<FestivalCard key={rf.slug} f={rf} />))}
            </div>
          </section>
        )}

        {/* Footer link back */}
        <p className="text-center text-sm text-brown-light/70 mt-10">
          <Link href="/festivals" className="text-haldi-gold hover:underline">
            {'← सभी त्योहार देखें · See all festivals'}
          </Link>
        </p>
      </div>

      <footer className="py-8 px-4 bg-brown text-cream mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
          <span className="font-heading text-haldi-gold">Aangan आँगन</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-haldi-gold transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-haldi-gold transition-colors">Terms</Link>
          </div>
          <p>© 2026 ReyKan IT &middot; v{RELEASES[0].version}</p>
        </div>
      </footer>

      {/* JSON-LD: Event + BreadcrumbList + (optional) FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: `${f.nameHindi} (${f.name}) ${yearIso}`,
            startDate: f.isoDate,
            endDate: f.isoDate,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
            description: sig.en || sig.hi,
            location: { '@type': 'VirtualLocation', url: `https://aangan.app/festivals/${f.slug}` },
            organizer: { '@type': 'Organization', name: 'Aangan आँगन', url: 'https://aangan.app' },
            image: 'https://aangan.app/og-image.png',
            inLanguage: ['hi', 'en'],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aangan.app' },
              { '@type': 'ListItem', position: 2, name: 'Festivals', item: 'https://aangan.app/festivals' },
              { '@type': 'ListItem', position: 3, name: f.name, item: `https://aangan.app/festivals/${f.slug}` },
            ],
          }),
        }}
      />
      {f.faq && f.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: f.faq.map((qa) => ({
                '@type': 'Question',
                name: qa.q,
                acceptedAnswer: { '@type': 'Answer', text: qa.a },
              })),
            }),
          }}
        />
      )}
    </main>
  );
}
