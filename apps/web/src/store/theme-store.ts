import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  mode: string;
  setMode: (mode: string) => void;

  accent: string;
  setAccent: (accent: string) => void;

  fontScale: number;
  setFontScale: (scale: number) => void;

  avatarStyle: string;
  setAvatarStyle: (style: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => set({ mode }),

      accent: 'cyan',
      setAccent: (accent) => set({ accent }),

      fontScale: 1,
      setFontScale: (fontScale) => set({ fontScale }),

      avatarStyle: 'bot',
      setAvatarStyle: (avatarStyle) => set({ avatarStyle }),
    }),
    {
      name: 'theme-store',
    }
  )
);
