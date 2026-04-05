/**
 * Security utilities for input validation, sanitization, and abuse prevention
 * Aangan v0.2 — Enhanced security layer
 */

import { REFERRAL_LIMITS, VALIDATION } from '../config/constants';

// ─── File Validation ───────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

const BLOCKED_FILE_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'jar', 'apk', 'dmg', 'iso',
  'msi', 'dll', 'scr', 'com', 'pif', 'hta', 'cpl', 'inf', 'reg',
];

export function isAllowedImageType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

export function sanitizeFileExtension(filename: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  return ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg';
}

export function isFileSizeValid(sizeBytes: number | undefined, maxMb: number): boolean {
  if (!sizeBytes) return true;
  return sizeBytes <= maxMb * 1024 * 1024;
}

export function isBlockedFileExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BLOCKED_FILE_EXTENSIONS.includes(ext);
}

// ─── Input Sanitization ────────────────────────────────────────

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%_.,()\\'"`;]/g, '').trim();
}

export function sanitizeDisplayName(name: string): string {
  return name
    .replace(/[<>'"`;\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, VALIDATION.nameMaxLength);
}

export function sanitizeBio(bio: string): string {
  return bio
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, VALIDATION.bioMaxLength);
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── URL Validation ────────────────────────────────────────────

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeDeepLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedSchemes = ['https:', 'mailto:', 'tel:'];
    return allowedSchemes.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Phone & OTP Validation ────────────────────────────────────

export function isValidIndianPhone(phone: string): boolean {
  return VALIDATION.phoneRegex.test(phone);
}

export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length < 4) return '****';
  return phone.slice(0, 2) + '****' + phone.slice(-2);
}

// ─── Client-Side Rate Limiting ─────────────────────────────────

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkClientRateLimit(
  action: string,
  maxAttempts: number = REFERRAL_LIMITS.maxResendOtp,
  windowMs: number = REFERRAL_LIMITS.otpTimerSeconds * 1000,
  blockMs: number = REFERRAL_LIMITS.otpLockMinutes * 60 * 1000,
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(action);

  if (entry) {
    // Check if blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return false;
    }

    // Check if window expired — reset
    if (now - entry.windowStart > windowMs) {
      rateLimitStore.set(action, { attempts: 1, windowStart: now, blockedUntil: null });
      return true;
    }

    // Increment
    entry.attempts += 1;
    if (entry.attempts > maxAttempts) {
      entry.blockedUntil = now + blockMs;
      return false;
    }
    return true;
  }

  rateLimitStore.set(action, { attempts: 1, windowStart: now, blockedUntil: null });
  return true;
}

export function getRateLimitRemaining(action: string): number {
  const entry = rateLimitStore.get(action);
  if (!entry?.blockedUntil) return 0;
  const remaining = entry.blockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function clearRateLimit(action: string): void {
  rateLimitStore.delete(action);
}

// ─── Content Security ──────────────────────────────────────────

const SUSPICIOUS_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /on\w+\s*=/i,
  /<script/i,
  /<iframe/i,
  /document\.(cookie|location|write)/i,
  /window\.(location|open)/i,
  /eval\s*\(/i,
];

export function containsSuspiciousContent(text: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(text));
}

export function sanitizePostContent(content: string): string {
  let sanitized = content.trim();
  if (containsSuspiciousContent(sanitized)) {
    // Strip potentially dangerous content but keep the text
    sanitized = sanitized
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  return sanitized;
}

// ─── Session Security ──────────────────────────────────────────

export function isSessionExpired(lastActivity: number, maxIdleMinutes: number = 30): boolean {
  const idleMs = Date.now() - lastActivity;
  return idleMs > maxIdleMinutes * 60 * 1000;
}

// ─── Safe Error Messages ───────────────────────────────────────

/**
 * Never expose raw DB/network error messages to users.
 * Logs the real error in dev, returns a safe user-facing string.
 */
export function safeError(error: unknown, userMessage: string): string {
  if (__DEV__) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[Store Error]', msg);
  }
  return userMessage;
}

// ─── Secure Logging ────────────────────────────────────────────

declare const __DEV__: boolean;

export const secureLog = {
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) console.error(...args);
  },
  info: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
};
