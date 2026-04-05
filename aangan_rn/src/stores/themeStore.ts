import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = '@aangan_theme';

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  isDark: false,

  setTheme: async (theme: ThemeMode) => {
    // For now, 'system' defaults to light (can be enhanced with Appearance API)
    const isDark = theme === 'dark';
    set({ theme, isDark });
    await AsyncStorage.setItem(THEME_KEY, theme);
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        const isDark = saved === 'dark';
        set({ theme: saved, isDark });
      }
    } catch {
      // Default to light
    }
  },
}));
