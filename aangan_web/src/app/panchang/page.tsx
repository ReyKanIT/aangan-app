import type { Metadata } from 'next';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI } from '@/services/panchangService';

function formatDateHindi(d: Date): string {
  const months = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateEnglish(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const panchang = getPanchang(now, DELHI);
  const dateHindi = formatDateHindi(now);

  return {
    title: `आज का पंचांग — ${dateHindi} | ${panchang.tithi}, ${panchang.nakshatra}`,
    description: `${dateHindi} का पंचांग: तिथि ${panchang.tithi}, नक्षत्र ${panchang.nakshatra}, योग ${panchang.yoga}, विक्रम संवत ${panchang.vikramSamvat}। सूर्योदय ${panchang.sunrise}, सूर्यास्त ${panchang.sunset}। Daily Hindu Panchang by Aangan.`,
    keywords: [
      'आज का पंचांग',
      'today panchang',
      'hindu calendar',
      'tithi today',
      'nakshatra today',
      'पंचांग',
      panchang.tithi,
      panchang.nakshatra,
      'विक्रम संवत',
      'aangan panchang',
    ],
    openGraph: {
      title: `आज का पंचांग — ${dateHindi}`,
      description: `तिथि: ${panchang.tithi} | नक्षत्र: ${panchang.nakshatra} | योग: ${panchang.yoga}`,
      type: 'article',
      url: 'https://aangan.app/panchang',
    },
  };
}

export const revalidate = 3600; // re-generate every hour

export default function PanchangPage() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const panchang = getPanchang(now, DELHI);
  const moonEmoji = moonPhaseEmoji(panchang.moonPhasePercent);
  const yogaNote = yogaDescription(panchang.yoga);
  const dateHindi = formatDateHindi(now);
  const dateEnglish = formatDateEnglish(now);

  const rows = [
    { label: 'तिथि / Tithi', value: `${panchang.paksha} ${panchang.tithi}` },
    { label: 'नक्षत्र / Nakshatra', value: panchang.nakshatra },
    { label: 'योग / Yoga', value: `${panchang.yoga} (${yogaNote})` },
    { label: 'वार / Day', value: panchang.vara },
    { label: 'मास / Month', value: panchang.maas },
    { label: 'विक्रम संवत', value: String(panchang.vikramSamvat) },
    { label: 'सूर्योदय / Sunrise', value: panchang.sunrise },
    { label: 'सूर्यास्त / Sunset', value: panchang.sunset },
  ];

  return (
    <main className="min-h-screen bg-cream font-body text-brown">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-haldi-gold/20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-heading text-2xl text-haldi-gold tracking-wide">
            Aangan <span className="text-haldi-gold-dark">आँगन</span>
          </a>
          <a
            href="/login"
            className="px-5 py-2 rounded-full bg-haldi-gold text-white font-semibold text-sm hover:bg-haldi-gold-dark transition-colors"
          >
            Login / Sign Up
          </a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-6xl">{moonEmoji}</span>
          <h1 className="font-heading text-4xl md:text-5xl text-haldi-gold mt-4">
            आज का पंचांग
          </h1>
          <p className="text-lg text-brown-light mt-2">Today&rsquo;s Hindu Panchang</p>
          <p className="font-heading text-xl text-haldi-gold-dark mt-3">{dateHindi}</p>
          <p className="text-sm text-brown-light">{dateEnglish}</p>
        </div>

        {/* Panchang Table */}
        <div className="bg-white rounded-2xl border border-haldi-gold/20 overflow-hidden shadow-sm">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex justify-between items-center px-6 py-4 ${
                i < rows.length - 1 ? 'border-b border-cream-dark' : ''
              }`}
            >
              <span className="text-brown-light text-sm md:text-base">{row.label}</span>
              <span className="font-heading text-brown font-semibold text-base md:text-lg text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Location note */}
        <p className="text-center text-xs text-brown-light/60 mt-4">
          स्थान: नई दिल्ली (28.61°N, 77.21°E) &middot; Location: New Delhi
        </p>

        {/* About section for SEO */}
        <section className="mt-12 bg-white rounded-2xl border border-haldi-gold/10 p-6 md:p-8">
          <h2 className="font-heading text-2xl text-haldi-gold mb-4">
            पंचांग क्या है? / What is Panchang?
          </h2>
          <p className="text-brown-light leading-relaxed mb-4">
            पंचांग हिंदू कैलेंडर का आधार है। &ldquo;पंच&rdquo; (पाँच) + &ldquo;अंग&rdquo; (भाग) — पाँच अंगों से मिलकर बना है:
            तिथि, वार, नक्षत्र, योग और करण। यह शुभ मुहूर्त, व्रत और त्योहार निर्धारित करने में सहायक है।
          </p>
          <p className="text-brown-light leading-relaxed">
            Panchang is the traditional Hindu calendar system based on five elements:
            Tithi (lunar day), Vara (weekday), Nakshatra (lunar mansion), Yoga (sun-moon combination),
            and Karana (half-tithi). It guides auspicious timings for rituals, fasts, and festivals.
          </p>
        </section>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-brown-light mb-4">
            Aangan ऐप में रोज़ पंचांग देखें — परिवार के साथ!
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-haldi-gold text-white font-semibold text-lg hover:bg-haldi-gold-dark transition-colors shadow-lg shadow-haldi-gold/25"
          >
            Download Aangan
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 bg-brown text-cream">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
          <span className="font-heading text-haldi-gold">Aangan आँगन</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-haldi-gold transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-haldi-gold transition-colors">Terms</a>
          </div>
          <p>&copy; 2026 ReyKan IT &middot; v0.7.0</p>
        </div>
      </footer>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `आज का पंचांग — ${dateHindi}`,
            description: `तिथि: ${panchang.tithi}, नक्षत्र: ${panchang.nakshatra}, योग: ${panchang.yoga}`,
            datePublished: now.toISOString(),
            author: { '@type': 'Organization', name: 'ReyKan IT', url: 'https://aangan.app' },
            publisher: { '@type': 'Organization', name: 'Aangan', url: 'https://aangan.app' },
            mainEntityOfPage: 'https://aangan.app/panchang',
            inLanguage: ['hi', 'en'],
          }),
        }}
      />
    </main>
  );
}
