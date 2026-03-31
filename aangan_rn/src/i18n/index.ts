import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import hi from './hi';
import en from './en';

// ─── Language Resources ─────────────────────────────────
const resources = {
  hi: { translation: hi },
  en: { translation: en },
};

// ─── i18next Configuration ──────────────────────────────
// Hindi is the PRIMARY language (दादी टेस्ट — Hindi-first UI)
// English is the FALLBACK language
i18n.use(initReactI18next).init({
  resources,
  lng: 'hi', // Default language: Hindi
  fallbackLng: 'en', // Fallback: English
  interpolation: {
    escapeValue: false, // React already escapes by default
  },
  react: {
    useSuspense: false, // Avoid Suspense for faster initial render
  },
});

export default i18n;

// ─── Helper: get current language ───────────────────────
export const getCurrentLanguage = (): string => i18n.language;

// ─── Helper: switch language ────────────────────────────
export const switchLanguage = (lang: 'hi' | 'en'): Promise<any> =>
  i18n.changeLanguage(lang);

// ─── Helper: typed translation keys ─────────────────────
// Usage: import { TranslationKeys } from '@/i18n';
export type TranslationKeys = typeof hi;
