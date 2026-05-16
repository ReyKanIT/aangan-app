// ─────────────────────────────────────────────────────────────────────────────
// Festival catalogue for 2026 — single source of truth for the public
// SEO pages at /festivals and /festivals/[slug].
//
// CMO Review ICE #3: per-festival landing pages compound SEO. One URL
// per festival, individually indexed, individually shareable.
//
// To add a festival:
//   1. Append a Festival entry below with a unique `slug`
//   2. The /festivals list + /festivals/[slug] route + sitemap pick it up
//      automatically
//   3. Optionally add `pujaVidhi` and `faq[]` to enrich the detail page
//
// Slugs are kebab-case from the English name, lowercased, no diacritics.
// They are PART OF THE URL — once a festival ships, do not change its slug
// or you'll break backlinks.
// ─────────────────────────────────────────────────────────────────────────────

export interface FestivalFAQ {
  q: string;       // Bilingual question, hi + en separated by " · "
  a: string;       // Bilingual answer
}

export interface Festival {
  slug: string;
  date: string;          // Hindi display, e.g. "2 अप्रैल"
  isoDate: string;       // YYYY-MM-DD for schema.org Event
  name: string;          // English
  nameHindi: string;     // Devanagari
  month: string;         // English month
  type: 'major' | 'vrat' | 'regional';
  desc: string;          // One-line Hindi blurb (existing)
  significanceHi?: string;  // Optional 2-paragraph Hindi context
  significanceEn?: string;  // Optional 2-paragraph English context
  pujaVidhi?: string[];     // Optional Hindi steps (string array)
  faq?: FestivalFAQ[];      // Optional structured FAQ (also emitted as FAQPage schema)
}

// Helper — turn an English name into a stable slug.
// Used only at module load (festivals are static).
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Raw entries — keep this ordered chronologically. The slug is auto-derived
// but you can override by setting `slug` explicitly on a row.
type FestivalRaw = Omit<Festival, 'slug'> & { slug?: string };

const RAW: FestivalRaw[] = [
  // April 2026
  { isoDate: '2026-04-02',  date: '2 अप्रैल',  name: 'Ram Navami',          nameHindi: 'राम नवमी',         month: 'April',    type: 'major',    desc: 'भगवान राम का जन्मदिवस। चैत्र शुक्ल नवमी।' },
  { isoDate: '2026-04-06',  date: '6 अप्रैल',  name: 'Mahavir Jayanti',     nameHindi: 'महावीर जयंती',     month: 'April',    type: 'major',    desc: 'भगवान महावीर का जन्मदिवस।' },
  { isoDate: '2026-04-13',  date: '13 अप्रैल', name: 'Baisakhi',            nameHindi: 'बैसाखी',           month: 'April',    type: 'major',    desc: 'पंजाबी नव वर्ष और फसल का त्योहार।' },
  { isoDate: '2026-04-14',  date: '14 अप्रैल', name: 'Ambedkar Jayanti',    nameHindi: 'अम्बेडकर जयंती',   month: 'April',    type: 'major',    desc: 'डॉ. भीमराव अम्बेडकर का जन्मदिवस।' },
  // May 2026
  { isoDate: '2026-05-01',  date: '1 मई',       name: 'Akshaya Tritiya',     nameHindi: 'अक्षय तृतीया',     month: 'May',      type: 'major',    desc: 'अत्यंत शुभ दिन। सोना खरीदने और नए कार्य शुरू करने का दिन।' },
  { isoDate: '2026-05-12',  date: '12 मई',      name: 'Buddha Purnima',      nameHindi: 'बुद्ध पूर्णिमा',   month: 'May',      type: 'major',    desc: 'भगवान बुद्ध का जन्म, ज्ञान प्राप्ति और महापरिनिर्वाण।' },
  // June 2026
  { isoDate: '2026-06-15',  date: '15 जून',     name: 'Nirjala Ekadashi',    nameHindi: 'निर्जला एकादशी',   month: 'June',     type: 'vrat',     desc: 'बिना जल के व्रत। सबसे कठिन एकादशी।' },
  { isoDate: '2026-06-24',  date: '24 जून',     name: 'Jagannath Rath Yatra', nameHindi: 'जगन्नाथ रथ यात्रा', month: 'June',    type: 'major',    desc: 'पुरी में भगवान जगन्नाथ की भव्य रथ यात्रा।' },
  // July
  { isoDate: '2026-07-07',  date: '7 जुलाई',    name: 'Guru Purnima',        nameHindi: 'गुरु पूर्णिमा',    month: 'July',     type: 'major',    desc: 'गुरुओं को समर्पित पूर्णिमा का दिन।' },
  // August
  { isoDate: '2026-08-08',  date: '8 अगस्त',    name: 'Hariyali Teej',       nameHindi: 'हरियाली तीज',      month: 'August',   type: 'regional', desc: 'सावन की तीज। विवाहित महिलाओं का त्योहार।' },
  { isoDate: '2026-08-12',  date: '12 अगस्त',   name: 'Nag Panchami',        nameHindi: 'नाग पंचमी',        month: 'August',   type: 'vrat',     desc: 'नाग देवता की पूजा।' },
  { isoDate: '2026-08-15',  date: '15 अगस्त',   name: 'Independence Day',    nameHindi: 'स्वतंत्रता दिवस',  month: 'August',   type: 'major',    desc: 'भारत का स्वतंत्रता दिवस।' },
  { isoDate: '2026-08-19',  date: '19 अगस्त',   name: 'Raksha Bandhan',      nameHindi: 'रक्षा बंधन',        month: 'August',   type: 'major',    desc: 'भाई-बहन के प्रेम का त्योहार।' },
  { isoDate: '2026-08-27',  date: '27 अगस्त',   name: 'Janmashtami',         nameHindi: 'जन्माष्टमी',        month: 'August',   type: 'major',    desc: 'भगवान कृष्ण का जन्मदिवस।' },
  // September
  { isoDate: '2026-09-06',  date: '6 सितंबर',   name: 'Ganesh Chaturthi',    nameHindi: 'गणेश चतुर्थी',     month: 'September', type: 'major',   desc: 'भगवान गणेश का जन्मोत्सव। 10 दिन तक उत्सव।' },
  // October
  { isoDate: '2026-10-02',  date: '2 अक्टूबर',  name: 'Gandhi Jayanti',      nameHindi: 'गांधी जयंती',       month: 'October',   type: 'major',   desc: 'महात्मा गांधी का जन्मदिवस।' },
  { isoDate: '2026-10-07',  date: '7-15 अक्टूबर', name: 'Navratri',          nameHindi: 'नवरात्रि',          month: 'October',   type: 'major',   desc: 'माँ दुर्गा की 9 दिन की पूजा। गरबा और डांडिया।' },
  { isoDate: '2026-10-15',  date: '15 अक्टूबर', name: 'Dussehra',            nameHindi: 'दशहरा / विजयादशमी', month: 'October',  type: 'major',   desc: 'बुराई पर अच्छाई की जीत। रावण दहन।' },
  { isoDate: '2026-10-20',  date: '20 अक्टूबर', name: 'Karwa Chauth',        nameHindi: 'करवा चौथ',          month: 'October',   type: 'vrat',    desc: 'पति की लंबी उम्र के लिए निर्जला व्रत।' },
  // November
  { isoDate: '2026-11-04',  date: '4 नवंबर',    name: 'Diwali',              nameHindi: 'दीपावली',           month: 'November',  type: 'major',   desc: 'रोशनी का त्योहार। लक्ष्मी पूजा, पटाखे, मिठाई।' },
  { isoDate: '2026-11-06',  date: '6 नवंबर',    name: 'Govardhan Puja',      nameHindi: 'गोवर्धन पूजा',      month: 'November',  type: 'major',   desc: 'दीपावली के अगले दिन। भगवान कृष्ण की पूजा।' },
  { isoDate: '2026-11-07',  date: '7 नवंबर',    name: 'Bhai Dooj',           nameHindi: 'भाई दूज',           month: 'November',  type: 'major',   desc: 'भाई-बहन का त्योहार। रक्षा बंधन जैसा।' },
  { isoDate: '2026-11-14',  date: '14 नवंबर',   name: 'Chhath Puja',         nameHindi: 'छठ पूजा',           month: 'November',  type: 'major',   desc: 'सूर्य देव की पूजा। बिहार और पूर्वी भारत का प्रमुख त्योहार।' },
  // December
  { isoDate: '2026-12-25',  date: '25 दिसंबर',  name: 'Christmas',           nameHindi: 'क्रिसमस',           month: 'December',  type: 'major',   desc: 'ईसा मसीह का जन्मदिवस।' },
];

export const FESTIVALS_2026: Festival[] = RAW.map((f) => ({
  ...f,
  slug: f.slug ?? slugify(f.name),
}));

// Cheap lookup map for the dynamic route — built once at module load.
export const FESTIVALS_BY_SLUG: Map<string, Festival> = new Map(
  FESTIVALS_2026.map((f) => [f.slug, f]),
);

/** Templated cultural-significance fallback when a festival doesn't have
 * explicit `significanceHi`/`significanceEn`. Keeps the per-festival page
 * substantive enough for Google indexing even before Kumar writes detailed
 * content for each one.
 */
export function defaultSignificance(f: Festival): { hi: string; en: string } {
  const typeLabelHi = f.type === 'vrat' ? 'व्रत' : f.type === 'regional' ? 'क्षेत्रीय पर्व' : 'प्रमुख त्योहार';
  const typeLabelEn = f.type === 'vrat' ? 'fasting observance' : f.type === 'regional' ? 'regional festival' : 'major festival';
  return {
    hi: `${f.nameHindi} (${f.name}) भारत का एक ${typeLabelHi} है, जो ${f.date} को मनाया जाता है। ${f.desc} परिवार के सदस्यों के साथ यह दिन परंपराओं, पूजा-पाठ और मिठाइयों के साथ मनाया जाता है। आँगन (Aangan) ऐप पर परिवार के साथ इस दिन की तस्वीरें और बधाई संदेश साझा करें।`,
    en: `${f.name} (${f.nameHindi}) is a ${typeLabelEn} celebrated across India on ${new Date(f.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. ${f.desc} Families come together to observe rituals, share traditional sweets, and exchange greetings. Use Aangan to share moments and reminders with your family.`,
  };
}

/** Sort upcoming festivals first (today onward), then by date asc. */
export function upcomingFestivals(now: Date = new Date()): Festival[] {
  const today = now.toISOString().slice(0, 10);
  return [...FESTIVALS_2026]
    .filter((f) => f.isoDate >= today)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}
