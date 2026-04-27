import type { Metadata } from 'next';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI } from '@/services/panchangService';
import PublicShareCTA from '@/components/ui/PublicShareCTA';
import { RELEASES } from '@/data/versions';

function formatDateHindi(d: Date): string {
  const months = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateEnglish(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
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
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan पंचांग — आज का पंचांग' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `आज का पंचांग — ${dateHindi}`,
      description: `तिथि: ${panchang.tithi} | नक्षत्र: ${panchang.nakshatra}`,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: 'https://aangan.app/panchang',
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
    { label: 'तिथि / Tithi', value: `${panchang.paksha} ${panchang.tithi}`, sub: `${panchang.tithiEndTime} तक` },
    { label: 'नक्षत्र / Nakshatra', value: panchang.nakshatra, sub: `${panchang.nakshatraEndTime} तक` },
    { label: 'योग / Yoga', value: `${panchang.yoga} (${yogaNote})`, sub: `${panchang.yogaEndTime} तक` },
    { label: 'करण / Karana', value: panchang.karana, sub: `${panchang.karanaEndTime} तक` },
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
            className="px-5 py-2 min-h-dadi inline-flex items-center justify-center rounded-full bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors"
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
          <p className="text-base text-brown-light">{dateEnglish}</p>
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
              <span className="text-brown-light text-base">{row.label}</span>
              <div className="text-right">
                <span className="font-heading text-brown font-semibold text-base md:text-lg">
                  {row.value}
                </span>
                {row.sub && (
                  <p className="text-xs text-brown-light/70 mt-0.5">{row.sub}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Location note */}
        <p className="text-center text-sm text-brown-light/60 mt-4">
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

        {/* Share + CTA */}
        <div className="mt-10 text-center space-y-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`आज का पंचांग — ${dateHindi}\nतिथि: ${panchang.tithi} | नक्षत्र: ${panchang.nakshatra}\nhttps://aangan.app/panchang`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 min-h-[52px] rounded-2xl bg-[#25D366] text-white font-semibold text-lg hover:bg-[#1DA851] transition-colors shadow-lg shadow-[#25D366]/25"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            पंचांग WhatsApp पर भेजें
          </a>
          <div>
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
      </div>

      <PublicShareCTA
        titleHi="आज का पंचांग परिवार को भेजें"
        titleEn="Share today's panchang with your family"
        shareMessage={`आज का पंचांग — तिथि: ${panchang.tithi}, नक्षत्र: ${panchang.nakshatra}। पूरा padhein:`}
        loginLabel="Daily reminders के लिए login करें"
      />

      {/* Footer */}
      <footer className="py-8 px-4 bg-brown text-cream mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
          <span className="font-heading text-haldi-gold">Aangan आँगन</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-haldi-gold transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-haldi-gold transition-colors">Terms</a>
          </div>
          <p>&copy; 2026 ReyKan IT &middot; v{RELEASES[0].version}</p>
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
