'use client';

// ─────────────────────────────────────────────────────────────────────────────
// LanguageToggle — header pill that lets visitors pick Hindi or English.
//
// v0.13.18 scope (first iteration):
//   - Persists choice to localStorage as `aangan_lang_pref` ('hi' | 'en')
//   - Sets <html lang="..."> on the document so screen readers + Chrome
//     translate UI behave correctly
//   - Visual indicator of current preference (gold pill on the active option)
//
// What this DOES NOT do yet:
//   - Full UI translation. Most landing-page copy is bilingual ("Hindi —
//     English") so the choice doesn't dramatically change what users see
//     yet. Full i18n via next-intl is a multi-week project planned for
//     v0.14.x. Until then this toggle captures intent so we can:
//       (a) measure preference distribution via Vercel Analytics
//       (b) flip language order (Hindi-first vs English-first) per future ask
//       (c) gate Hindi-only festival/panchang content for English users
//
// Why on the LANDING page header (not /login or /settings):
//   - Kumar's spec: "language selection on the first page itself"
//   - Most users land here first via SEO / shared link
//   - Authenticated users get a richer language switcher in /settings
//     (TBD in v0.14.x)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aangan_lang_pref';
type Lang = 'hi' | 'en';

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'hi';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'en' ? 'en' : 'hi';
}

export default function LanguageToggle({ className = '' }: { className?: string }) {
  // Hydration-safe default: render the SSR'd value first, then sync to
  // localStorage on mount. Without this, server renders 'hi' and client
  // would mismatch if the user previously picked 'en' → React warning.
  const [lang, setLang] = useState<Lang>('hi');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLang();
    setLang(stored);
    setHydrated(true);
    document.documentElement.lang = stored === 'en' ? 'en' : 'hi';
  }, []);

  const choose = useCallback((next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be blocked (private mode); the in-memory state
      // still holds for the rest of the session.
    }
    document.documentElement.lang = next === 'en' ? 'en' : 'hi';
  }, []);

  const isHi = lang === 'hi';

  return (
    <div
      className={`inline-flex items-center rounded-full border border-haldi-gold/40 bg-cream p-1 ${className}`}
      role="group"
      aria-label={'भाषा चुनें — Choose language'}
      data-testid="landing-language-toggle"
      // Suppress hydration warning for the inner buttons since they mount
      // with the SSR default and immediately swap to the stored value.
      suppressHydrationWarning
    >
      <button
        type="button"
        onClick={() => choose('hi')}
        aria-pressed={hydrated && isHi}
        data-testid="lang-toggle-hi"
        className={`min-h-[40px] px-3 py-1 rounded-full font-body font-semibold text-sm transition-colors ${
          hydrated && isHi
            ? 'bg-haldi-gold text-white shadow-sm'
            : 'text-brown hover:text-haldi-gold-dark'
        }`}
      >
        🇮🇳 {'हिंदी'}
      </button>
      <button
        type="button"
        onClick={() => choose('en')}
        aria-pressed={hydrated && !isHi}
        data-testid="lang-toggle-en"
        className={`min-h-[40px] px-3 py-1 rounded-full font-body font-semibold text-sm transition-colors ${
          hydrated && !isHi
            ? 'bg-haldi-gold text-white shadow-sm'
            : 'text-brown hover:text-haldi-gold-dark'
        }`}
      >
        EN
      </button>
    </div>
  );
}
