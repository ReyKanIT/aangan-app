import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'hi' | 'en';

interface LanguageState {
  language: Language;
  isHindi: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  loadLanguage: () => Promise<void>;
}

const LANGUAGE_KEY = '@aangan_language';

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'hi',
  isHindi: true,

  setLanguage: async (lang: Language) => {
    set({ language: lang, isHindi: lang === 'hi' });
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  },

  toggleLanguage: async () => {
    const newLang = get().language === 'hi' ? 'en' : 'hi';
    await get().setLanguage(newLang);
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved === 'en' || saved === 'hi') {
        set({ language: saved, isHindi: saved === 'hi' });
      }
    } catch {
      // Default to Hindi
    }
  },
}));
