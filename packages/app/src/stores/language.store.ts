import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS } from '@voca/shared';

interface LanguageState {
  language: string;
  setLanguage: (code: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_USER_SETTINGS.language,
  setLanguage: (language) => set({ language }),
}));
