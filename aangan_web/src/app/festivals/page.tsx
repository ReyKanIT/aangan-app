import type { Metadata } from 'next';
import PublicShareCTA from '@/components/ui/PublicShareCTA';

export const metadata: Metadata = {
  title: 'भारतीय त्योहार 2026 — Indian Festivals Calendar',
  description: 'भारतीय त्योहारों की पूरी सूची 2026 — हिंदू पंचांग के अनुसार। Comprehensive Indian festival calendar for 2026 with dates, significance, and rituals. Aangan family app.',
  keywords: [
    'indian festivals 2026',
    'भारतीय त्योहार',
    'hindu festivals',
    'हिंदू त्योहार 2026',
    'festival calendar india',
    'त्योहार कैलेंडर',
    'puja dates 2026',
    'व्रत त्योहार',
  ],
  openGraph: {
    title: 'भारतीय त्योहार 2026 — Indian Festivals Calendar',
    description: 'हिंदू पंचांग के अनुसार सभी त्योहारों की तारीखें और जानकारी',
    type: 'article',
    url: 'https://aangan.app/festivals',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Aangan — भारतीय त्योहार 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'भारतीय त्योहार 2026 — Indian Festivals Calendar',
    description: 'हिंदू पंचांग के अनुसार सभी प्रमुख त्योहार और व्रत',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://aangan.app/festivals',
  },
};

interface Festival {
  date: string;
  name: string;
  nameHindi: string;
  month: string;
  type: 'major' | 'vrat' | 'regional';
  desc: string;
}

const FESTIVALS_2026: Festival[] = [
  // April 2026
  { date: '2 अप्रैल', name: 'Ram Navami', nameHindi: 'राम नवमी', month: 'April', type: 'major', desc: 'भगवान राम का जन्मदिवस। चैत्र शुक्ल नवमी।' },
  { date: '6 अप्रैल', name: 'Mahavir Jayanti', nameHindi: 'महावीर जयंती', month: 'April', type: 'major', desc: 'भगवान महावीर का जन्मदिवस।' },
  { date: '13 अप्रैल', name: 'Baisakhi', nameHindi: 'बैसाखी', month: 'April', type: 'major', desc: 'पंजाबी नव वर्ष और फसल का त्योहार।' },
  { date: '14 अप्रैल', name: 'Ambedkar Jayanti', nameHindi: 'अम्बेडकर जयंती', month: 'April', type: 'major', desc: 'डॉ. भीमराव अम्बेडकर का जन्मदिवस।' },
  // May 2026
  { date: '1 मई', name: 'Akshaya Tritiya', nameHindi: 'अक्षय तृतीया', month: 'May', type: 'major', desc: 'अत्यंत शुभ दिन। सोना खरीदने और नए कार्य शुरू करने का दिन।' },
  { date: '12 मई', name: 'Buddha Purnima', nameHindi: 'बुद्ध पूर्णिमा', month: 'May', type: 'major', desc: 'भगवान बुद्ध का जन्म, ज्ञान प्राप्ति और महापरिनिर्वाण।' },
  // June 2026
  { date: '15 जून', name: 'Nirjala Ekadashi', nameHindi: 'निर्जला एकादशी', month: 'June', type: 'vrat', desc: 'बिना जल के व्रत। सबसे कठिन एकादशी।' },
  { date: '24 जून', name: 'Jagannath Rath Yatra', nameHindi: 'जगन्नाथ रथ यात्रा', month: 'June', type: 'major', desc: 'पुरी में भगवान जगन्नाथ की भव्य रथ यात्रा।' },
  // July 2026
  { date: '7 जुलाई', name: 'Guru Purnima', nameHindi: 'गुरु पूर्णिमा', month: 'July', type: 'major', desc: 'गुरुओं को समर्पित पूर्णिमा का दिन।' },
  // August 2026
  { date: '8 अगस्त', name: 'Hariyali Teej', nameHindi: 'हरियाली तीज', month: 'August', type: 'regional', desc: 'सावन की तीज। विवाहित महिलाओं का त्योहार।' },
  { date: '12 अगस्त', name: 'Nag Panchami', nameHindi: 'नाग पंचमी', month: 'August', type: 'vrat', desc: 'नाग देवता की पूजा।' },
  { date: '15 अगस्त', name: 'Independence Day', nameHindi: 'स्वतंत्रता दिवस', month: 'August', type: 'major', desc: 'भारत का स्वतंत्रता दिवस।' },
  { date: '19 अगस्त', name: 'Raksha Bandhan', nameHindi: 'रक्षा बंधन', month: 'August', type: 'major', desc: 'भाई-बहन के प्रेम का त्योहार।' },
  { date: '27 अगस्त', name: 'Janmashtami', nameHindi: 'जन्माष्टमी', month: 'August', type: 'major', desc: 'भगवान कृष्ण का जन्मदिवस।' },
  // September 2026
  { date: '6 सितंबर', name: 'Ganesh Chaturthi', nameHindi: 'गणेश चतुर्थी', month: 'September', type: 'major', desc: 'भगवान गणेश का जन्मोत्सव। 10 दिन तक उत्सव।' },
  // October 2026
  { date: '2 अक्टूबर', name: 'Gandhi Jayanti', nameHindi: 'गांधी जयंती', month: 'October', type: 'major', desc: 'महात्मा गांधी का जन्मदिवस।' },
  { date: '7-15 अक्टूबर', name: 'Navratri', nameHindi: 'नवरात्रि', month: 'October', type: 'major', desc: 'माँ दुर्गा की 9 दिन की पूजा। गरबा और डांडिया।' },
  { date: '15 अक्टूबर', name: 'Dussehra', nameHindi: 'दशहरा / विजयादशमी', month: 'October', type: 'major', desc: 'बुराई पर अच्छाई की जीत। रावण दहन।' },
  { date: '20 अक्टूबर', name: 'Karwa Chauth', nameHindi: 'करवा चौथ', month: 'October', type: 'vrat', desc: 'पति की लंबी उम्र के लिए निर्जला व्रत।' },
  // November 2026
  { date: '4 नवंबर', name: 'Diwali', nameHindi: 'दीपावली', month: 'November', type: 'major', desc: 'रोशनी का त्योहार। लक्ष्मी पूजा, पटाखे, मिठाई।' },
  { date: '6 नवंबर', name: 'Govardhan Puja', nameHindi: 'गोवर्धन पूजा', month: 'November', type: 'major', desc: 'दीपावली के अगले दिन। भगवान कृष्ण की पूजा।' },
  { date: '7 नवंबर', name: 'Bhai Dooj', nameHindi: 'भाई दूज', month: 'November', type: 'major', desc: 'भाई-बहन का त्योहार। रक्षा बंधन जैसा।' },
  { date: '14 नवंबर', name: 'Chhath Puja', nameHindi: 'छठ पूजा', month: 'November', type: 'major', desc: 'सूर्य देव की पूजा। बिहार और पूर्वी भारत का प्रमुख त्योहार।' },
  // December 2026
  { date: '25 दिसंबर', name: 'Christmas', nameHindi: 'क्रिसमस', month: 'December', type: 'major', desc: 'ईसा मसीह का जन्मदिवस।' },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  major: { label: 'प्रमुख त्योहार', color: 'bg-amber-100 text-amber-800' },
  vrat: { label: 'व्रत', color: 'bg-green-100 text-green-800' },
  regional: { label: 'क्षेत्रीय', color: 'bg-blue-100 text-blue-800' },
};

export default function FestivalsPage() {
  const months = [...new Set(FESTIVALS_2026.map(f => f.month))];

  return (
    <main className="min-h-screen bg-cream font-body text-brown">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-haldi-gold/20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-heading text-2xl text-haldi-gold tracking-wide">
            Aangan <span className="text-haldi-gold-dark">आँगन</span>
          </a>
          <a href="/login" className="px-5 py-2 rounded-full bg-haldi-gold text-white font-semibold text-base hover:bg-haldi-gold-dark transition-colors">
            Login / Sign Up
          </a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl md:text-5xl text-haldi-gold">
            भारतीय त्योहार 2026
          </h1>
          <p className="text-lg text-brown-light mt-2">Indian Festivals Calendar 2026</p>
          <p className="text-sm text-brown-light/60 mt-1">
            हिंदू पंचांग के अनुसार सभी प्रमुख त्योहार और व्रत
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {Object.entries(TYPE_LABELS).map(([key, { label, color }]) => (
            <span key={key} className={`px-3 py-1 rounded-full text-base font-semibold ${color}`}>
              {label}
            </span>
          ))}
        </div>

        {/* Festival list by month */}
        {months.map(month => {
          const monthFestivals = FESTIVALS_2026.filter(f => f.month === month);
          return (
            <section key={month} className="mb-8">
              <h2 className="font-heading text-xl text-haldi-gold-dark mb-3 border-b border-haldi-gold/20 pb-2">
                {month} 2026
              </h2>
              <div className="space-y-3">
                {monthFestivals.map((f, i) => {
                  const typeInfo = TYPE_LABELS[f.type];
                  return (
                    <div key={i} className="bg-white rounded-xl border border-haldi-gold/10 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-heading text-base font-semibold text-brown">{f.nameHindi}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                          </div>
                          <p className="text-base text-brown-light">{f.name}</p>
                          <p className="text-base text-brown-light/70 mt-1">{f.desc}</p>
                        </div>
                        <span className="font-heading text-base text-haldi-gold whitespace-nowrap">{f.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* About */}
        <section className="mt-12 bg-white rounded-2xl border border-haldi-gold/10 p-6 md:p-8">
          <h2 className="font-heading text-2xl text-haldi-gold mb-4">
            Aangan में त्योहार ट्रैक करें
          </h2>
          <p className="text-brown-light leading-relaxed mb-4">
            Aangan ऐप में सभी त्योहार आपके फ़ीड में दिखते हैं। परिवार के साथ मिलकर त्योहार मनाएं —
            इवेंट बनाएं, RSVP करें, और फ़ोटो शेयर करें।
          </p>
          <p className="text-brown-light leading-relaxed">
            Track all Indian festivals in the Aangan app. Plan celebrations with your family —
            create events, manage RSVPs, and share photos together.
          </p>
        </section>

        {/* Share + CTA */}
        <div className="mt-10 text-center space-y-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent('भारतीय त्योहार 2026 — सभी प्रमुख त्योहारों की तारीखें और जानकारी\nIndian Festivals Calendar 2026\nhttps://aangan.app/festivals')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 min-h-[52px] rounded-2xl bg-[#25D366] text-white font-semibold text-lg hover:bg-[#1DA851] transition-colors shadow-lg shadow-[#25D366]/25"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            त्योहार सूची WhatsApp पर भेजें
          </a>
          <div>
            <a href="/" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-haldi-gold text-white font-semibold text-lg hover:bg-haldi-gold-dark transition-colors shadow-lg shadow-haldi-gold/25">
              Download Aangan
            </a>
          </div>
        </div>
      </div>

      <PublicShareCTA
        titleHi="त्योहार कैलेंडर परिवार को भेजें"
        titleEn="Share this festivals calendar with your family"
        shareMessage="2026 के सभी प्रमुख भारतीय त्योहार एक जगह — शुभ मुहूर्त, तिथियां। Aangan पर देखें:"
        loginLabel="Festival reminders के लिए login करें"
      />

      {/* Footer */}
      <footer className="py-8 px-4 bg-brown text-cream mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-dark">
          <span className="font-heading text-haldi-gold">Aangan आँगन</span>
          <div className="flex gap-4">
            <a href="/panchang" className="hover:text-haldi-gold transition-colors">Panchang</a>
            <a href="/privacy" className="hover:text-haldi-gold transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-haldi-gold transition-colors">Terms</a>
          </div>
          <p>&copy; 2026 ReyKan IT &middot; v0.12.1</p>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'भारतीय त्योहार 2026 — Indian Festivals Calendar',
            description: 'हिंदू पंचांग के अनुसार 2026 के सभी प्रमुख भारतीय त्योहार',
            author: { '@type': 'Organization', name: 'ReyKan IT', url: 'https://aangan.app' },
            publisher: { '@type': 'Organization', name: 'Aangan', url: 'https://aangan.app' },
            mainEntityOfPage: 'https://aangan.app/festivals',
            inLanguage: ['hi', 'en'],
          }),
        }}
      />
    </main>
  );
}
