export interface Festival {
  id: string;
  name: string;
  nameHindi: string;
  date: string; // ISO date
  icon: string; // emoji
  color: string;
  description?: string;
}

// Upcoming festivals for 2026 (static data)
export const FESTIVALS_2026: Festival[] = [
  {
    id: 'ram-navami-2026',
    name: 'Ram Navami',
    nameHindi: 'राम नवमी',
    date: '2026-04-02',
    icon: '🏹',
    color: '#FF9800',
  },
  {
    id: 'hanuman-jayanti-2026',
    name: 'Hanuman Jayanti',
    nameHindi: 'हनुमान जयंती',
    date: '2026-04-04',
    icon: '🙏',
    color: '#E65100',
  },
  {
    id: 'baisakhi-2026',
    name: 'Baisakhi',
    nameHindi: 'बैसाखी',
    date: '2026-04-14',
    icon: '🌾',
    color: '#7A9A3A',
  },
  {
    id: 'akshaya-tritiya-2026',
    name: 'Akshaya Tritiya',
    nameHindi: 'अक्षय तृतीया',
    date: '2026-04-25',
    icon: '✨',
    color: '#C8A84B',
  },
  {
    id: 'buddha-purnima-2026',
    name: 'Buddha Purnima',
    nameHindi: 'बुद्ध पूर्णिमा',
    date: '2026-05-12',
    icon: '☸️',
    color: '#2196F3',
  },
  {
    id: 'rath-yatra-2026',
    name: 'Rath Yatra',
    nameHindi: 'रथ यात्रा',
    date: '2026-06-22',
    icon: '🛕',
    color: '#9C27B0',
  },
  {
    id: 'guru-purnima-2026',
    name: 'Guru Purnima',
    nameHindi: 'गुरु पूर्णिमा',
    date: '2026-07-11',
    icon: '📿',
    color: '#FF5722',
  },
  {
    id: 'raksha-bandhan-2026',
    name: 'Raksha Bandhan',
    nameHindi: 'रक्षा बंधन',
    date: '2026-08-12',
    icon: '🎀',
    color: '#E91E63',
  },
  {
    id: 'janmashtami-2026',
    name: 'Janmashtami',
    nameHindi: 'जन्माष्टमी',
    date: '2026-08-22',
    icon: '🪈',
    color: '#1565C0',
  },
  {
    id: 'ganesh-chaturthi-2026',
    name: 'Ganesh Chaturthi',
    nameHindi: 'गणेश चतुर्थी',
    date: '2026-09-07',
    icon: '🐘',
    color: '#FF5722',
  },
  {
    id: 'navratri-2026',
    name: 'Navratri',
    nameHindi: 'नवरात्रि',
    date: '2026-10-08',
    icon: '🪔',
    color: '#D32F2F',
  },
  {
    id: 'dussehra-2026',
    name: 'Dussehra',
    nameHindi: 'दशहरा',
    date: '2026-10-17',
    icon: '🔥',
    color: '#BF360C',
  },
  {
    id: 'karwa-chauth-2026',
    name: 'Karwa Chauth',
    nameHindi: 'करवा चौथ',
    date: '2026-10-27',
    icon: '🌙',
    color: '#C8A84B',
  },
  {
    id: 'diwali-2026',
    name: 'Diwali',
    nameHindi: 'दिवाली',
    date: '2026-11-05',
    icon: '🪔',
    color: '#FFC107',
  },
  {
    id: 'bhai-dooj-2026',
    name: 'Bhai Dooj',
    nameHindi: 'भाई दूज',
    date: '2026-11-07',
    icon: '👫',
    color: '#4CAF50',
  },
  {
    id: 'chhath-puja-2026',
    name: 'Chhath Puja',
    nameHindi: 'छठ पूजा',
    date: '2026-11-09',
    icon: '☀️',
    color: '#FF9800',
  },
  {
    id: 'makar-sankranti-2027',
    name: 'Makar Sankranti',
    nameHindi: 'मकर संक्रांति',
    date: '2027-01-14',
    icon: '🪁',
    color: '#00BCD4',
  },
  {
    id: 'republic-day-2027',
    name: 'Republic Day',
    nameHindi: 'गणतंत्र दिवस',
    date: '2027-01-26',
    icon: '🇮🇳',
    color: '#FF9800',
  },
  {
    id: 'maha-shivaratri-2027',
    name: 'Maha Shivaratri',
    nameHindi: 'महा शिवरात्रि',
    date: '2027-02-17',
    icon: '🔱',
    color: '#3F51B5',
  },
  {
    id: 'holi-2027',
    name: 'Holi',
    nameHindi: 'होली',
    date: '2027-03-04',
    icon: '🎨',
    color: '#E91E63',
  },
];

/**
 * Returns festivals occurring within the next N days from today.
 */
export function getUpcomingFestivals(daysAhead: number = 30): Festival[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return FESTIVALS_2026.filter((f) => {
    const festDate = new Date(f.date);
    return festDate >= today && festDate <= cutoff;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Formats a date string to a short Hindi-friendly format.
 */
export function formatFestivalDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
