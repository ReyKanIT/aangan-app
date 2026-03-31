// Panchang (Indian Calendar) data for 2026
// Pre-calculated Tithi tables - upgrade to API (drikpanchang.com) later

export interface PanchangDay {
  date: string; // YYYY-MM-DD
  vikramSamvat: number;
  maas: string;
  maasEn: string;
  tithi: string;
  tithiEn: string;
  paksha: string;
  pakshaEn: string;
  nakshatra: string;
  nakshatraEn: string;
  yoga: string;
  yogaEn: string;
  sunrise: string;
  sunset: string;
}

// Simplified Panchang data - covers key dates in 2026
// In production, use a Panchang API or comprehensive dataset
const PANCHANG_DATA: PanchangDay[] = [
  // March 2026
  { date: '2026-03-29', vikramSamvat: 2083, maas: 'चैत्र', maasEn: 'Chaitra', tithi: 'शुक्ल प्रतिपदा', tithiEn: 'Shukla Pratipada', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'अश्विनी', nakshatraEn: 'Ashwini', yoga: 'शुभ', yogaEn: 'Shubh', sunrise: '06:12', sunset: '18:34' },
  { date: '2026-03-30', vikramSamvat: 2083, maas: 'चैत्र', maasEn: 'Chaitra', tithi: 'शुक्ल द्वितीया', tithiEn: 'Shukla Dwitiya', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'भरणी', nakshatraEn: 'Bharani', yoga: 'शुक्ल', yogaEn: 'Shukla', sunrise: '06:11', sunset: '18:35' },
  { date: '2026-03-31', vikramSamvat: 2083, maas: 'चैत्र', maasEn: 'Chaitra', tithi: 'शुक्ल तृतीया', tithiEn: 'Shukla Tritiya', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'कृत्तिका', nakshatraEn: 'Krittika', yoga: 'ब्रह्म', yogaEn: 'Brahma', sunrise: '06:10', sunset: '18:35' },
  // April 2026
  { date: '2026-04-01', vikramSamvat: 2083, maas: 'चैत्र', maasEn: 'Chaitra', tithi: 'शुक्ल चतुर्थी', tithiEn: 'Shukla Chaturthi', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'रोहिणी', nakshatraEn: 'Rohini', yoga: 'इंद्र', yogaEn: 'Indra', sunrise: '06:09', sunset: '18:36' },
  { date: '2026-04-06', vikramSamvat: 2083, maas: 'चैत्र', maasEn: 'Chaitra', tithi: 'शुक्ल नवमी', tithiEn: 'Shukla Navami', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'पुष्य', nakshatraEn: 'Pushya', yoga: 'शुभ', yogaEn: 'Shubh', sunrise: '06:05', sunset: '18:38' },
  { date: '2026-04-14', vikramSamvat: 2083, maas: 'वैशाख', maasEn: 'Vaishakh', tithi: 'शुक्ल प्रतिपदा', tithiEn: 'Shukla Pratipada', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'चित्रा', nakshatraEn: 'Chitra', yoga: 'विष्कुम्भ', yogaEn: 'Vishkumbh', sunrise: '06:00', sunset: '18:41' },
  // May 2026
  { date: '2026-05-12', vikramSamvat: 2083, maas: 'वैशाख', maasEn: 'Vaishakh', tithi: 'शुक्ल पूर्णिमा', tithiEn: 'Shukla Purnima', paksha: 'शुक्ल पक्ष', pakshaEn: 'Shukla Paksha', nakshatra: 'विशाखा', nakshatraEn: 'Vishakha', yoga: 'शिव', yogaEn: 'Shiva', sunrise: '05:44', sunset: '18:54' },
  // Generic fallback for any other date
];

// Hindu months cycle
const HINDU_MONTHS = [
  { hi: 'चैत्र', en: 'Chaitra' },
  { hi: 'वैशाख', en: 'Vaishakh' },
  { hi: 'ज्येष्ठ', en: 'Jyeshtha' },
  { hi: 'आषाढ़', en: 'Ashadha' },
  { hi: 'श्रावण', en: 'Shravana' },
  { hi: 'भाद्रपद', en: 'Bhadrapada' },
  { hi: 'आश्विन', en: 'Ashwin' },
  { hi: 'कार्तिक', en: 'Kartik' },
  { hi: 'मार्गशीर्ष', en: 'Margashirsha' },
  { hi: 'पौष', en: 'Paush' },
  { hi: 'माघ', en: 'Magha' },
  { hi: 'फाल्गुन', en: 'Phalguna' },
];

const TITHIS = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा/अमावस्या',
];

const NAKSHATRAS = [
  { hi: 'अश्विनी', en: 'Ashwini' }, { hi: 'भरणी', en: 'Bharani' },
  { hi: 'कृत्तिका', en: 'Krittika' }, { hi: 'रोहिणी', en: 'Rohini' },
  { hi: 'मृगशिरा', en: 'Mrigashira' }, { hi: 'आर्द्रा', en: 'Ardra' },
  { hi: 'पुनर्वसु', en: 'Punarvasu' }, { hi: 'पुष्य', en: 'Pushya' },
  { hi: 'आश्लेषा', en: 'Ashlesha' }, { hi: 'मघा', en: 'Magha' },
  { hi: 'पूर्वा फाल्गुनी', en: 'Purva Phalguni' }, { hi: 'उत्तरा फाल्गुनी', en: 'Uttara Phalguni' },
  { hi: 'हस्त', en: 'Hasta' }, { hi: 'चित्रा', en: 'Chitra' },
  { hi: 'स्वाती', en: 'Swati' }, { hi: 'विशाखा', en: 'Vishakha' },
  { hi: 'अनुराधा', en: 'Anuradha' }, { hi: 'ज्येष्ठा', en: 'Jyeshtha' },
  { hi: 'मूल', en: 'Mula' }, { hi: 'पूर्वाषाढ़ा', en: 'Purvashadha' },
  { hi: 'उत्तराषाढ़ा', en: 'Uttarashadha' }, { hi: 'श्रवण', en: 'Shravana' },
  { hi: 'धनिष्ठा', en: 'Dhanishtha' }, { hi: 'शतभिषा', en: 'Shatabhisha' },
  { hi: 'पूर्वा भाद्रपद', en: 'Purva Bhadrapada' }, { hi: 'उत्तरा भाद्रपद', en: 'Uttara Bhadrapada' },
  { hi: 'रेवती', en: 'Revati' },
];

const YOGAS = [
  { hi: 'विष्कुम्भ', en: 'Vishkumbh' }, { hi: 'प्रीति', en: 'Preeti' },
  { hi: 'आयुष्मान', en: 'Ayushman' }, { hi: 'सौभाग्य', en: 'Saubhagya' },
  { hi: 'शोभन', en: 'Shobhan' }, { hi: 'अतिगण्ड', en: 'Atigand' },
  { hi: 'सुकर्मा', en: 'Sukarma' }, { hi: 'धृति', en: 'Dhriti' },
  { hi: 'शूल', en: 'Shool' }, { hi: 'गण्ड', en: 'Gand' },
  { hi: 'वृद्धि', en: 'Vriddhi' }, { hi: 'ध्रुव', en: 'Dhruva' },
  { hi: 'व्याघात', en: 'Vyaghata' }, { hi: 'हर्षण', en: 'Harshan' },
  { hi: 'वज्र', en: 'Vajra' }, { hi: 'सिद्धि', en: 'Siddhi' },
  { hi: 'व्यतीपात', en: 'Vyatipat' }, { hi: 'वरीयान', en: 'Variyan' },
  { hi: 'परिघ', en: 'Parigha' }, { hi: 'शिव', en: 'Shiva' },
  { hi: 'सिद्ध', en: 'Siddh' }, { hi: 'साध्य', en: 'Sadhya' },
  { hi: 'शुभ', en: 'Shubh' }, { hi: 'शुक्ल', en: 'Shukla' },
  { hi: 'ब्रह्म', en: 'Brahma' }, { hi: 'इंद्र', en: 'Indra' },
  { hi: 'वैधृति', en: 'Vaidhriti' },
];

/**
 * Get Panchang for a specific date.
 * First checks pre-calculated data, then generates approximate values.
 */
export function getPanchangForDate(dateStr: string): PanchangDay {
  // Check pre-calculated data first
  const exact = PANCHANG_DATA.find(p => p.date === dateStr);
  if (exact) return exact;

  // Generate approximate Panchang (for dates not in the dataset)
  const date = new Date(dateStr);
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Approximate Hindu month (shifts ~15 days from Gregorian)
  const monthIndex = ((date.getMonth() + 10) % 12); // Chaitra starts ~March
  const month = HINDU_MONTHS[monthIndex];

  // Approximate Tithi (lunar day - cycles every ~29.5 days)
  const lunarDay = ((dayOfYear * 12 / 354) % 30) + 1;
  const tithiIndex = Math.floor(lunarDay % 15);
  const paksha = lunarDay <= 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  const pakshaEn = lunarDay <= 15 ? 'Shukla Paksha' : 'Krishna Paksha';
  const tithiPrefix = lunarDay <= 15 ? 'शुक्ल' : 'कृष्ण';

  // Approximate Nakshatra (cycles every ~27.3 days)
  const nakshatraIndex = Math.floor((dayOfYear * 27 / 365)) % 27;
  const nakshatra = NAKSHATRAS[nakshatraIndex];

  // Approximate Yoga (cycles every ~27 days)
  const yogaIndex = Math.floor((dayOfYear * 27 / 365 + 5)) % 27;
  const yoga = YOGAS[yogaIndex];

  // Vikram Samvat = Gregorian + 57 (approximately)
  const vs = date.getFullYear() + 57;

  return {
    date: dateStr,
    vikramSamvat: vs,
    maas: month.hi,
    maasEn: month.en,
    tithi: `${tithiPrefix} ${TITHIS[tithiIndex]}`,
    tithiEn: `${pakshaEn.split(' ')[0]} ${TITHIS[tithiIndex]}`,
    paksha,
    pakshaEn,
    nakshatra: nakshatra.hi,
    nakshatraEn: nakshatra.en,
    yoga: yoga.hi,
    yogaEn: yoga.en,
    sunrise: '06:10',
    sunset: '18:30',
  };
}

export function getTodayPanchang(): PanchangDay {
  const today = new Date().toISOString().split('T')[0];
  return getPanchangForDate(today);
}
