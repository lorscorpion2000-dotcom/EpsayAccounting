import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getThemeByKey, themeToCssVariables, DEFAULT_THEME_KEY, Theme } from '@/themes/themes';
import { api } from '@/services/api';

interface ThemeState {
  themeKey: string;
  theme: Theme;
  setTheme: (key: string, syncToServer?: boolean) => void;
  applyTheme: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeKey: DEFAULT_THEME_KEY,
      theme: getThemeByKey(DEFAULT_THEME_KEY),

      setTheme: (key, syncToServer = true) => {
        const theme = getThemeByKey(key);
        set({ themeKey: key, theme });
        get().applyTheme();

        // Sync to server
        if (syncToServer) {
          api.patch('/auth/preferences', { themePreference: key }).catch(() => {
            // Silent fail â€” the theme is still applied locally
          });
        }
      },

      applyTheme: () => {
        const { theme } = get();
        const vars = themeToCssVariables(theme);
        const root = document.documentElement;
        Object.entries(vars).forEach(([k, v]) => {
          root.style.setProperty(k, v);
        });
      },

      init: () => {
        get().applyTheme();
      },
    }),
    {
      name: 'epsay-theme',
      onRehydrateStorage: () => (state) => {
        state?.applyTheme();
      },
    },
  ),
);

