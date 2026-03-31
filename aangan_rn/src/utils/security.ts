/**
 * Security utilities for input validation and sanitization
 */

// Allowed image MIME types for uploads
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

/**
 * Validate that a file is an allowed image type
 */
export function isAllowedImageType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Sanitize file extension — strip anything that isn't alphanumeric
 */
export function sanitizeFileExtension(filename: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  return ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg';
}

/**
 * Validate file size in bytes
 */
export function isFileSizeValid(sizeBytes: number | undefined, maxMb: number): boolean {
  if (!sizeBytes) return true; // Size unknown, let server handle
  return sizeBytes <= maxMb * 1024 * 1024;
}

/**
 * Sanitize PostgREST filter query to prevent injection
 */
export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%_.,()\\'"`;]/g, '').trim();
}

/**
 * Validate that a URL is safe (HTTPS only, no user-controlled schemes)
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Production-safe logger — only logs in __DEV__ mode
 */
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
