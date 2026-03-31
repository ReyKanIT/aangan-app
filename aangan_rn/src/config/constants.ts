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

// Relationship types with reverse mappings
export const RELATIONSHIP_MAP: Record<string, string> = {
  'पिता': 'बेटा',
  'माता': 'बेटा',
  'बेटा': 'पिता',
  'बेटी': 'पिता',
  'भाई': 'भाई',
  'बहन': 'भाई',
  'पत्नी': 'पति',
  'पति': 'पत्नी',
  'दादा': 'पोता',
  'दादी': 'पोता',
  'नाना': 'नाती',
  'नानी': 'नाती',
  'चाचा': 'भतीजा',
  'चाची': 'भतीजा',
  'मामा': 'भांजा',
  'मामी': 'भांजा',
  'बुआ': 'भतीजा',
  'फूफा': 'भतीजा',
  'पोता': 'दादा',
  'पोती': 'दादा',
  'नाती': 'नाना',
  'नातिन': 'नाना',
  'भतीजा': 'चाचा',
  'भतीजी': 'चाचा',
  'भांजा': 'मामा',
  'भांजी': 'मामा',
};
