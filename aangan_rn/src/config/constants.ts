// App Version — keep in sync with app.json + package.json on every release
export const APP_VERSION = '0.10.0';
export const BUILD_NUMBER = '19';
export const VERSION_NAME = 'Aangan v0.10.0 — WhatsApp deep-link family invites';

// Storage tiers
export const STORAGE_TIERS = {
  base: { gb: 10, referrals: 0 },
  bronze: { gb: 25, referrals: 5 },
  silver: { gb: 50, referrals: 15 },
  gold: { gb: 100, referrals: 30 },
} as const;

// Event bundle pricing (INR)
export const EVENT_BUNDLES = {
  shagun: { price: 499, storageGb: 50, maxPhotos: 500, galleryMonths: 3, video: false },
  mangal: { price: 1499, storageGb: 200, maxPhotos: null, galleryMonths: 12, video: false },
  maharaja: { price: 4999, storageGb: 500, maxPhotos: null, galleryMonths: 36, video: true },
  puja: { price: 199, storageGb: 25, maxPhotos: 200, galleryMonths: 1, video: false },
  gathering: { price: 499, storageGb: 50, maxPhotos: 500, galleryMonths: 3, video: false },
  engagement: { price: 799, storageGb: 100, maxPhotos: 1000, galleryMonths: 6, video: false },
} as const;

// Paid storage add-ons (INR)
export const STORAGE_ADDONS = {
  individual: [
    { gb: 10, monthly: 29, annual: 279 },
    { gb: 25, monthly: 79, annual: 759 },
    { gb: 50, monthly: 149, annual: 1429 },
    { gb: 100, monthly: 249, annual: 2389 },
  ],
  pool: [
    { gb: 50, monthly: 119, annual: 1149 },
    { gb: 100, monthly: 199, annual: 1919 },
    { gb: 250, monthly: 399, annual: 3839 },
    { gb: 500, monthly: 699, annual: 6719 },
  ],
} as const;

// Referral limits
export const REFERRAL_LIMITS = {
  maxEarlyAdopters: 10000,
  maxReferralsPerUser: 100,
  maxInvitesPerDay: 10,
  verificationDays: 7,
  maxResendOtp: 3,
  otpLockMinutes: 5,
  maxWrongOtp: 5,
  otpTimerSeconds: 60,
} as const;

// Validation
export const VALIDATION = {
  phoneRegex: /^[6-9]\d{9}$/,
  phoneLength: 10,
  nameMinLength: 2,
  nameMaxLength: 50,
  bioMaxLength: 200,
  maxPhotoSizeMb: 5,
  maxMediaSizeMb: 10,
  maxPhotosPerUpload: 20,
  maxCeremonies: 20,
  gpsCheckInRadiusMeters: 200,
} as const;

// Event types
export const EVENT_TYPES = [
  { key: 'wedding', icon: 'rings', color: '#C8A84B' },
  { key: 'engagement', icon: 'ring', color: '#E91E63' },
  { key: 'puja', icon: 'om', color: '#FF9800' },
  { key: 'birthday', icon: 'cake', color: '#2196F3' },
  { key: 'gathering', icon: 'people', color: '#7A9A3A' },
  { key: 'mundan', icon: 'scissors', color: '#9C27B0' },
  { key: 'housewarming', icon: 'home', color: '#795548' },
  { key: 'other', icon: 'star', color: '#607D8B' },
] as const;

// Indian states
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

// Reverse-relationship map.
//
// Bug fixed 2026-04-30: this map was previously keyed by HINDI labels
// (`'पिता'`, `'माता'`, …) but every caller in the app passes the ENGLISH
// `relationship_type` key (e.g. `'father'`). The lookup never matched, so
// `addMember` fell back to passing the SAME relationship as the reverse —
// which meant every bidirectional pair stored both rows with identical
// `relationship_type`. If A said "B is my father", DB ended up with
// `A→B = father` AND `B→A = father` (B's tree showed A as B's father).
//
// This English-keyed map mirrors the working version in
// `aangan_web/src/components/family/AddMemberDrawer.tsx:17` and extends it
// with the Indian-specific in-law relations.
//
// Gender note: many reverses are gender-asymmetric (mother ↔ son for sons,
// mother ↔ daughter for daughters). Without `users.gender` we default to the
// male form (matches the existing web behavior). Future enhancement:
// gender-aware reverse lookup using `users.gender` of the target member —
// see TODO in `add_family_member_bidirectional` SQL.
export const RELATIONSHIP_MAP: Record<string, string> = {
  // ── L1 immediate ──
  father: 'son',
  mother: 'son',
  son: 'father',
  daughter: 'father',
  brother: 'brother',
  sister: 'brother',
  husband: 'wife',
  wife: 'husband',
  stepfather: 'son',
  stepmother: 'son',
  stepson: 'father',
  stepdaughter: 'father',
  stepbrother: 'brother',
  stepsister: 'brother',
  half_brother: 'half_brother',
  half_sister: 'half_brother',
  adopted_son: 'father',
  adopted_daughter: 'father',

  // ── L2 grandparents / grandchildren ──
  grandfather_paternal: 'grandson_paternal',
  grandmother_paternal: 'grandson_paternal',
  grandfather_maternal: 'grandson_maternal',
  grandmother_maternal: 'grandson_maternal',
  grandson_paternal: 'grandfather_paternal',
  granddaughter_paternal: 'grandfather_paternal',
  grandson_maternal: 'grandfather_maternal',
  granddaughter_maternal: 'grandfather_maternal',
  grandson: 'grandfather_paternal',
  granddaughter: 'grandfather_paternal',

  // ── L2 in-laws ──
  father_in_law: 'son_in_law',
  mother_in_law: 'daughter_in_law',
  son_in_law: 'father_in_law',
  daughter_in_law: 'mother_in_law',

  // ── L2 siblings-in-law (Indian-specific) ──
  jeth: 'bhabhi',
  jethani: 'devar',
  devar: 'bhabhi',
  devrani: 'jeth',
  nanad: 'bhabhi',
  bhabhi: 'devar',
  jija: 'saala',
  saala: 'jija',
  saali: 'jija',
  sandhu: 'sandhu',
  brother_in_law: 'brother_in_law',
  sister_in_law: 'brother_in_law',

  // ── L3 great-grandparents ──
  great_grandfather_paternal: 'great_grandson_paternal',
  great_grandmother_paternal: 'great_grandson_paternal',
  great_grandfather_maternal: 'great_grandson_maternal',
  great_grandmother_maternal: 'great_grandson_maternal',

  // ── L3 uncles/aunts (paternal) ──
  tau: 'bhatija',
  tai: 'bhatija',
  uncle_paternal: 'bhatija',
  aunt_paternal: 'bhatija',
  bua: 'bhatija',
  fufa: 'bhatija',

  // ── L3 uncles/aunts (maternal) ──
  uncle_maternal: 'bhanja',
  aunt_maternal: 'bhanja',
  mausi: 'bhanja',
  mausa: 'bhanja',

  // ── L3 nephews/nieces ──
  bhatija: 'tau',
  bhatiji: 'tau',
  bhanja: 'uncle_maternal',
  bhanji: 'uncle_maternal',
  nephew: 'uncle_paternal',
  niece: 'uncle_paternal',

  // ── L3 cousins (symmetric) ──
  cousin_brother_paternal: 'cousin_brother_paternal',
  cousin_sister_paternal: 'cousin_brother_paternal',
  cousin_brother_maternal: 'cousin_brother_maternal',
  cousin_sister_maternal: 'cousin_brother_maternal',
  cousin: 'cousin',

  // ── L3 samdhi/samdhan ──
  samdhi: 'samdhi',
  samdhan: 'samdhi',

  // ── Other / fallback ──
  other: 'other',
};

// Hindi labels for each reverse, keyed by the English reverse_key returned
// from RELATIONSHIP_MAP. Used by addMember to write the reverse row's Hindi
// column correctly.
export const RELATIONSHIP_HINDI_LABEL: Record<string, string> = {
  father: 'पिता', mother: 'माँ', son: 'बेटा', daughter: 'बेटी',
  brother: 'भाई', sister: 'बहन', husband: 'पति', wife: 'पत्नी',
  stepfather: 'सौतेला पिता', stepmother: 'सौतेली माँ',
  stepson: 'सौतेला बेटा', stepdaughter: 'सौतेली बेटी',
  stepbrother: 'सौतेला भाई', stepsister: 'सौतेली बहन',
  half_brother: 'सौतेला भाई', half_sister: 'सौतेली बहन',
  adopted_son: 'गोद लिया बेटा', adopted_daughter: 'गोद ली बेटी',
  grandfather_paternal: 'दादा', grandmother_paternal: 'दादी',
  grandfather_maternal: 'नाना', grandmother_maternal: 'नानी',
  grandson_paternal: 'पोता', granddaughter_paternal: 'पोती',
  grandson_maternal: 'नाती', granddaughter_maternal: 'नातिन',
  grandson: 'पोता/नाती', granddaughter: 'पोती/नातिन',
  father_in_law: 'ससुर', mother_in_law: 'सास',
  son_in_law: 'दामाद', daughter_in_law: 'बहू',
  jeth: 'जेठ', jethani: 'जेठानी', devar: 'देवर', devrani: 'देवरानी',
  nanad: 'ननद', bhabhi: 'भाभी', jija: 'जीजा', saala: 'साला', saali: 'साली',
  sandhu: 'साढू', brother_in_law: 'देवर/जीजा', sister_in_law: 'ननद/भाभी',
  great_grandfather_paternal: 'परदादा', great_grandmother_paternal: 'परदादी',
  great_grandfather_maternal: 'परनाना', great_grandmother_maternal: 'परनानी',
  great_grandson_paternal: 'परपोता', great_grandson_maternal: 'परनाती',
  tau: 'ताऊ', tai: 'ताई',
  uncle_paternal: 'चाचा', aunt_paternal: 'चाची',
  bua: 'बुआ', fufa: 'फूफा',
  uncle_maternal: 'मामा', aunt_maternal: 'मामी',
  mausi: 'मौसी', mausa: 'मौसा',
  bhatija: 'भतीजा', bhatiji: 'भतीजी',
  bhanja: 'भांजा', bhanji: 'भांजी',
  nephew: 'भतीजा', niece: 'भतीजी',
  cousin_brother_paternal: 'चचेरा भाई', cousin_sister_paternal: 'चचेरी बहन',
  cousin_brother_maternal: 'ममेरा भाई', cousin_sister_maternal: 'ममेरी बहन',
  cousin: 'चचेरा भाई/बहन',
  samdhi: 'समधी', samdhan: 'समधन',
  other: 'अन्य',
};

// Content report reasons
export const REPORT_REASONS = [
  { key: 'inappropriate', labelEn: 'Inappropriate Content', labelHi: 'अनुचित सामग्री' },
  { key: 'spam', labelEn: 'Spam', labelHi: 'स्पैम' },
  { key: 'harassment', labelEn: 'Harassment', labelHi: 'उत्पीड़न' },
  { key: 'fake_account', labelEn: 'Fake Account', labelHi: 'नकली अकाउंट' },
  { key: 'privacy_violation', labelEn: 'Privacy Violation', labelHi: 'गोपनीयता का उल्लंघन' },
  { key: 'other', labelEn: 'Other', labelHi: 'अन्य' },
] as const;

// Feedback categories
export const FEEDBACK_CATEGORIES = [
  { key: 'bug', labelEn: 'Bug Report', labelHi: 'बग रिपोर्ट' },
  { key: 'feature', labelEn: 'Feature Request', labelHi: 'सुविधा अनुरोध' },
  { key: 'feedback', labelEn: 'General Feedback', labelHi: 'सामान्य प्रतिक्रिया' },
  { key: 'other', labelEn: 'Other', labelHi: 'अन्य' },
] as const;

// Security constants
export const SECURITY = {
  maxLoginAttempts: 5,
  loginBlockMinutes: 15,
  maxReportsPerDay: 10,
  maxPostsPerHour: 20,
  maxOtpAttempts: 5,
  otpBlockMinutes: 5,
  sessionTimeoutMinutes: 30,
  minAppVersion: '0.2.0',
} as const;

// Support contacts
export const SUPPORT = {
  email: 'support@aangan.app',
  legalEmail: 'legal@aangan.app',
  privacyEmail: 'privacy@aangan.app',
  website: 'https://aangan.app',
} as const;

// Web app base URL — used for QR code guest upload links
export const WEB_URL = 'https://aangan.app';
