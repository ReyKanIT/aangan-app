/**
 * Aangan Panchang Service
 * ─────────────────────────────────────────────────────────────────
 * Self-contained Vedic calendar engine — no external API required.
 * Calculates: Tithi, Nakshatra, Yoga, Karana, Vara, Vikram Samvat,
 *             Sunrise/Sunset, Masa (month name), Paksha.
 *
 * Based on: Jean Meeus "Astronomical Algorithms" (low-precision)
 * Accuracy: ±1° for sun/moon → ~±30 min on tithi/nakshatra boundaries.
 *
 * Uses Lahiri (Chitrapaksha) ayanamsa — the official Indian government
 * ayanamsa (Rashtriya Panchang). All nakshatra / yoga / saura-masa
 * calculations are sidereal (nirayana). Tithi is elongation-based and
 * identical in tropical and sidereal systems.
 * ─────────────────────────────────────────────────────────────────
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

// ─── Core Astronomy ───────────────────────────────────────────────────────────

/** Julian Day Number for a Gregorian date at a given UT hour */
function julianDay(year: number, month: number, day: number, hour = 12): number {
  let y = year;
  let m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716))
    + Math.floor(30.6001 * (m + 1))
    + day + hour / 24 + B - 1524.5;
}

/** Julian centuries from J2000.0 */
function T(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/** Normalize degrees to [0, 360) */
function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

/**
 * Apparent solar longitude (degrees, low precision ±0.01°)
 * Meeus "Astronomical Algorithms" Chapter 25
 */
function sunLongitude(jd: number): number {
  const t = T(jd);
  const L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const M  = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * DEG;
  const C  = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(M)
           + (0.019993 - 0.000101 * t) * Math.sin(2 * M)
           + 0.000289 * Math.sin(3 * M);
  // Apparent longitude (aberration + nutation)
  const omega = (125.04 - 1934.136 * t) * DEG;
  const apparent = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return norm360(apparent);
}

/**
 * Moon longitude (degrees, ~±1°)
 * Meeus Chapter 47 (abridged)
 */
function moonLongitude(jd: number): number {
  const t = T(jd);
  const L  = norm360(218.3164477 + 481267.88123421 * t);
  const D  = norm360(297.8501921 + 445267.1114034  * t) * DEG;
  const M  = norm360(357.5291092 +  35999.0502909  * t) * DEG;
  const Mm = norm360(134.9633964 + 477198.8675055  * t) * DEG;
  const F  = norm360( 93.2720950 + 483202.0175233  * t) * DEG;

  const dL =
      6.288774 * Math.sin(Mm)
    + 1.274027 * Math.sin(2 * D - Mm)
    + 0.658314 * Math.sin(2 * D)
    + 0.213618 * Math.sin(2 * Mm)
    - 0.185116 * Math.sin(M)
    - 0.114332 * Math.sin(2 * F)
    + 0.058793 * Math.sin(2 * D - 2 * Mm)
    + 0.057066 * Math.sin(2 * D - M - Mm)
    + 0.053322 * Math.sin(2 * D + Mm)
    + 0.045758 * Math.sin(2 * D - M)
    - 0.040923 * Math.sin(M - Mm)
    - 0.034720 * Math.sin(D)
    - 0.030383 * Math.sin(M + Mm)
    + 0.015327 * Math.sin(2 * D - 2 * F)
    - 0.012528 * Math.sin(Mm + 2 * F)
    + 0.010980 * Math.sin(Mm - 2 * F)
    + 0.010675 * Math.sin(4 * D - Mm)
    + 0.010034 * Math.sin(3 * Mm)
    + 0.008548 * Math.sin(4 * D - 2 * Mm)
    - 0.007888 * Math.sin(2 * D + M - Mm)
    - 0.006766 * Math.sin(2 * D + M)
    - 0.005163 * Math.sin(D - Mm)
    + 0.004987 * Math.sin(D + M)
    + 0.004036 * Math.sin(2 * D - M + Mm)
    + 0.003994 * Math.sin(2 * D + 2 * Mm)
    + 0.003861 * Math.sin(4 * D)
    + 0.003665 * Math.sin(2 * D - 3 * Mm)
    - 0.002689 * Math.sin(M - 2 * Mm)
    - 0.002602 * Math.sin(2 * D - Mm + 2 * F)
    + 0.002390 * Math.sin(2 * D - M - 2 * Mm)
    - 0.002348 * Math.sin(D + Mm)
    + 0.002236 * Math.sin(2 * D - 2 * M)
    - 0.002120 * Math.sin(M + 2 * Mm);

  return norm360(L + dL);
}

/** Elongation (moon - sun), always [0, 360) */
function elongation(jd: number): number {
  return norm360(moonLongitude(jd) - sunLongitude(jd));
}

/**
 * Lahiri (Chitrapaksha) ayanamsa — the official Indian government ayanamsa.
 *
 * Linear approximation anchored at J2000.0 with IAU precession rate.
 *   • J2000.0 value: 23°51'10.55" = 23.8529° (Rashtriya Panchang committee)
 *   • Rate: 50.290966"/year = 0.0139697°/year
 *
 * Accuracy vs. Swiss Ephemeris / Drik Panchang: ±0.02° (~1 arcmin) over
 * 1950–2050 — well inside the 13.333° width of a nakshatra. Verified
 * against drikpanchang.com for 2026-04-15: computes 24.220° vs Drik's
 * 24.231° (diff 40", 0.08% of a nakshatra).
 */
function lahiriAyanamsa(jd: number): number {
  return 23.85293 + ((jd - 2451545.0) / 365.25) * 0.0139697;
}

// ─── Sunrise / Sunset ─────────────────────────────────────────────────────────

/**
 * Sunrise and sunset times in local hours (24h) for a given date and location.
 * Returns null if sun doesn't rise/set (polar day/night).
 * lat/lon in degrees. utcOffset in hours (e.g. India = +5.5).
 */
function sunriseSunset(
  year: number,
  month: number,
  day: number,
  lat: number,
  lon: number,
  utcOffset: number,
): { sunrise: string; sunset: string } {
  const jd = julianDay(year, month, day, 0);
  const t = T(jd);

  // Solar declination and equation of time
  const L0 = norm360(280.46646 + 36000.76983 * t);
  const M  = (357.52911 + 35999.05029 * t) * DEG;
  const C  = 1.914602 * Math.sin(M) + 0.019993 * Math.sin(2 * M);
  const sunLon = (L0 + C) * DEG;
  const sinDec = Math.sin(23.439 * DEG) * Math.sin(sunLon);
  const dec = Math.asin(sinDec);

  // Hour angle for h = -0.833° (standard atmospheric refraction)
  const cosHA = (Math.sin(-0.833 * DEG) - Math.sin(lat * DEG) * Math.sin(dec))
    / (Math.cos(lat * DEG) * Math.cos(dec));

  // If |cosHA| > 1, polar day or night
  if (Math.abs(cosHA) > 1) {
    return { sunrise: '—', sunset: '—' };
  }

  const HA = Math.acos(cosHA) / DEG; // degrees

  // Equation of time (minutes)
  const y = Math.tan((23.439 * DEG) / 2) ** 2;
  const e = 0.016708634;
  const EqT = 4 * (
    y * Math.sin(2 * L0 * DEG)
    - 2 * e * Math.sin(M)
    + 4 * e * y * Math.sin(M) * Math.cos(2 * L0 * DEG)
    - 0.5 * y * y * Math.sin(4 * L0 * DEG)
    - 1.25 * e * e * Math.sin(2 * M)
  );

  const solarNoon = 12 - lon / 15 - EqT / 60 + utcOffset;
  const rise = solarNoon - HA / 15;
  const set  = solarNoon + HA / 15;

  function toHHMM(h: number): string {
    const total = Math.round(((h % 24) + 24) % 24 * 60);
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  return { sunrise: toHHMM(rise), sunset: toHHMM(set) };
}

// ─── Vedic Panchang Tables ────────────────────────────────────────────────────

const TITHI_NAMES: string[] = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'अमावस्या',
];

const NAKSHATRA_NAMES: string[] = [
  'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा',
  'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा',
  'पूर्वाफाल्गुनी', 'उत्तराफाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति',
  'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा',
  'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वाभाद्रपद',
  'उत्तराभाद्रपद', 'रेवती',
];

const YOGA_NAMES: string[] = [
  'विष्कम्भ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन',
  'अतिगण्ड', 'सुकर्मा', 'धृति', 'शूल', 'गण्ड',
  'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र',
  'सिद्धि', 'व्यतीपात', 'वरीयान', 'परिघ', 'शिव',
  'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल', 'ब्रह्म',
  'इन्द्र', 'वैधृति',
];

const VARA_NAMES: string[] = [
  'रविवार', 'सोमवार', 'मंगलवार', 'बुधवार',
  'गुरुवार', 'शुक्रवार', 'शनिवार',
];

const MASA_NAMES: string[] = [
  'चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़',
  'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक',
  'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन',
];

// ─── Vikram Samvat ────────────────────────────────────────────────────────────

/**
 * Returns the Vikram Samvat year for a Gregorian date.
 * VS new year falls on Chaitra Shukla Pratipada (~March–April).
 * Before that: VS = Gregorian + 56; after: VS = Gregorian + 57.
 */
function vikramSamvat(year: number, month: number, day: number): number {
  // Approximate: VS new year is ~mid-March to mid-April
  // Use April 1 as rough boundary (good enough for UI)
  if (month < 4 || (month === 4 && day < 1)) {
    return year + 56;
  }
  return year + 57;
}

/**
 * Current Saura Masa (solar month) based on sidereal sun longitude.
 *
 * Convention (Indian Astronomical Ephemeris / Surya Siddhanta):
 *   Sun in Mesha (Aries)      → Vaishakha
 *   Sun in Vrishabha (Taurus) → Jyeshtha
 *   Sun in Mithuna (Gemini)   → Ashadha
 *   … etc (+1 offset from rashi index).
 *
 * NOTE: This is Saura Masa, not Chandra Masa. Matches Purnimanta reckoning
 * ~75% of the year (±15 days at each month boundary). A precise Purnimanta/
 * Amanta split requires tracking the most recent Purnima's nakshatra — a
 * P1 follow-up beyond this fix's scope.
 */
function getCurrentMasa(sunLonSidereal: number): string {
  const rashi = Math.floor(sunLonSidereal / 30) % 12;
  return MASA_NAMES[(rashi + 1) % 12];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface PanchangData {
  vikramSamvat: number;
  maas: string;
  paksha: string;           // शुक्ल पक्ष / कृष्ण पक्ष
  tithi: string;
  tithiNumber: number;      // 1–30
  nakshatra: string;
  yoga: string;
  vara: string;             // day of week in Hindi
  sunrise: string;          // "HH:MM"
  sunset: string;           // "HH:MM"
  moonPhasePercent: number; // 0–100 (0=new moon, 100=full moon, wraps)
}

export interface PanchangLocation {
  lat: number;
  lon: number;
  utcOffset: number; // hours
}

// Default: New Delhi
export const DELHI: PanchangLocation = { lat: 28.6139, lon: 77.2090, utcOffset: 5.5 };

/**
 * Calculate full Panchang for today (or any given date).
 * @param date — JS Date object (defaults to today)
 * @param location — lat/lon/utcOffset (defaults to Delhi)
 */
export function getPanchang(
  date: Date = new Date(),
  location: PanchangLocation = DELHI,
): PanchangData {
  const year  = date.getFullYear();
  const month = date.getMonth() + 1; // 1-based
  const day   = date.getDate();
  const hour  = date.getHours() + date.getMinutes() / 60;

  const jd = julianDay(year, month, day, hour - location.utcOffset); // convert to UT

  // Sun & Moon — tropical (sayana) from Meeus
  const sunLon  = sunLongitude(jd);
  const moonLon = moonLongitude(jd);

  // Convert to sidereal (nirayana) via Lahiri ayanamsa.
  // Vedic panchang is sidereal — nakshatra, yoga, and saura-masa MUST use
  // sidereal longitudes. Tithi (elongation-based) is invariant.
  const ayan    = lahiriAyanamsa(jd);
  const sunSid  = norm360(sunLon  - ayan);
  const moonSid = norm360(moonLon - ayan);

  // Tithi (each = 12°) — elongation is identical in tropical/sidereal
  const elong    = norm360(moonLon - sunLon);
  const tithiIdx = Math.floor(elong / 12); // 0–29
  const tithi    = TITHI_NAMES[tithiIdx];
  const paksha   = tithiIdx < 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';

  // Nakshatra (each = 360/27 ≈ 13.333°) — sidereal moon
  const nakshatraIdx = Math.floor((moonSid * 27) / 360) % 27;
  const nakshatra    = NAKSHATRA_NAMES[nakshatraIdx];

  // Yoga (each = 360/27 ≈ 13.333°) — sidereal (sun + moon)
  const yogaIdx = Math.floor((norm360(sunSid + moonSid) * 27) / 360) % 27;
  const yoga    = YOGA_NAMES[yogaIdx];

  // Vara (day of week) — JD 0 was a Monday
  const varaIdx = ((Math.floor(jd + 1.5)) % 7 + 7) % 7;
  const vara    = VARA_NAMES[varaIdx];

  // Sunrise / Sunset
  const { sunrise, sunset } = sunriseSunset(year, month, day, location.lat, location.lon, location.utcOffset);

  // Moon phase percent (0 = new, 50 = full, loops)
  const moonPhasePercent = Math.round((elong / 360) * 100);

  return {
    vikramSamvat: vikramSamvat(year, month, day),
    maas: getCurrentMasa(sunSid),
    paksha,
    tithi,
    tithiNumber: tithiIdx + 1,
    nakshatra,
    yoga,
    vara,
    sunrise,
    sunset,
    moonPhasePercent,
  };
}

/**
 * Get moon phase emoji based on elongation
 */
export function moonPhaseEmoji(percent: number): string {
  if (percent < 3 || percent > 97) return '🌑'; // New moon
  if (percent < 25) return '🌒';                 // Waxing crescent
  if (percent < 45) return '🌓';                 // First quarter
  if (percent < 55) return '🌔';                 // Waxing gibbous
  if (percent < 60) return '🌕';                 // Full moon
  if (percent < 75) return '🌖';                 // Waning gibbous
  if (percent < 85) return '🌗';                 // Last quarter
  return '🌘';                                   // Waning crescent
}

/**
 * Returns auspiciousness note for current yoga
 */
export function yogaDescription(yoga: string): string {
  const auspicious = new Set(['शोभन', 'सुकर्मा', 'धृति', 'वृद्धि', 'ध्रुव', 'हर्षण', 'सिद्धि', 'सिद्ध', 'साध्य', 'शुभ', 'ब्रह्म', 'इन्द्र', 'प्रीति', 'आयुष्मान', 'सौभाग्य']);
  const inauspicious = new Set(['विष्कम्भ', 'अतिगण्ड', 'शूल', 'गण्ड', 'व्याघात', 'वज्र', 'व्यतीपात', 'परिघ', 'वैधृति']);
  if (auspicious.has(yoga)) return 'शुभ';
  if (inauspicious.has(yoga)) return 'अशुभ';
  return 'सामान्य';
}
