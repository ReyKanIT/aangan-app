/**
 * Referral attribution — captures `?ref=<code>` once and holds it through the
 * signup funnel. Clears itself after profile-setup so we don't back-date later
 * signups to the same referrer.
 *
 * Stored in both sessionStorage (primary — cleared on tab close) and a
 * 90-day cookie (so the ref survives if the user bounces between a shared
 * WhatsApp link, closes the tab, and comes back later from Instagram).
 */

const KEY = 'aangan_ref';
const COOKIE = 'aangan_ref';
const COOKIE_MAX_AGE_SEC = 90 * 24 * 60 * 60; // 90 days

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

/**
 * Called on landing/login mount — pulls `?ref=` from the URL and stashes it.
 * No-op if already set (don't let a later bare click overwrite the original
 * inviter's credit).
 */
export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const incoming = url.searchParams.get('ref');
  if (!incoming) return getStoredReferral();

  const existing = getStoredReferral();
  // First-touch attribution — if already captured, keep the original.
  if (existing) return existing;

  try {
    sessionStorage.setItem(KEY, incoming);
    writeCookie(COOKIE, incoming, COOKIE_MAX_AGE_SEC);
  } catch { /* storage disabled (Safari private) — nothing to do */ }
  return incoming;
}

export function getStoredReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = sessionStorage.getItem(KEY);
    if (fromSession) return fromSession;
  } catch { /* ignore */ }
  return readCookie(COOKIE);
}

export function clearStoredReferral() {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  deleteCookie(COOKIE);
}
