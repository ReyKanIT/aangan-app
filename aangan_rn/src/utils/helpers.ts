/**
 * Format phone number for display: +91 XXXXX XXXXX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Mask phone number: +91-XXXX**XXXX
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `+91-${digits.slice(0, 4)}**${digits.slice(6)}`;
}

/**
 * Time ago string in Hindi
 */
export function timeAgoHindi(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'अभी';
  if (diffMin < 60) return `${diffMin} मिनट पहले`;
  if (diffHr < 24) return `${diffHr} घंटे पहले`;
  if (diffDay === 1) return 'कल';
  if (diffDay < 7) return `${diffDay} दिन पहले`;
  if (diffWeek < 4) return `${diffWeek} हफ़्ते पहले`;
  if (diffMonth < 12) return `${diffMonth} महीने पहले`;
  return `${Math.floor(diffMonth / 12)} साल पहले`;
}

/**
 * Time ago in English
 */
export function timeAgoEn(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Format date in Hindi
 */
export function formatDateHindi(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const months = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format date in English
 */
export function formatDateEn(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format bytes to human-readable storage size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Format storage in GB with 1 decimal
 */
export function formatStorageGb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Calculate distance between two GPS coordinates in meters (Haversine formula)
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Generate referral code: AANGAN-{SHORT_ID}-{RANDOM_4}
 */
export function generateReferralCode(userId: string): string {
  const shortId = userId.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AANGAN-${shortId}-${random}`;
}

/**
 * Validate Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Get audience label text
 */
export function getAudienceLabel(type: string, level?: number | null, levelMax?: number | null): string {
  if (type === 'all') return 'सभी परिवार';
  if (type === 'level') {
    if (level && levelMax && level !== levelMax) return `Level ${level}-${levelMax}`;
    if (level) return `Level ${level}`;
    return 'स्तर से';
  }
  return 'व्यक्तिगत';
}

/**
 * Get RSVP status color
 */
export function getRsvpColor(status: string): string {
  switch (status) {
    case 'accepted': return '#7A9A3A';
    case 'declined': return '#E74C3C';
    case 'maybe': return '#FF9800';
    case 'pending': return '#F39C12';
    default: return '#9E9E9E';
  }
}

/**
 * Get notification icon by type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'new_post': return '📝';
    case 'new_comment': return '💬';
    case 'event_invite': return '🎉';
    case 'rsvp_update': return '✅';
    case 'new_family_member': return '👪';
    case 'photo_approved': return '📸';
    case 'storage_upgrade': return '☁️';
    case 'referral_verified': return '🎁';
    default: return '🔔';
  }
}
