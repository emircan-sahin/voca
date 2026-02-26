import { create } from 'zustand';
import i18n from 'i18next';
import { AppLocale } from '@voca/shared';
import { detectSystemLocale } from '~/i18n/config';

interface ProgramLanguageState {
  programLanguage: AppLocale;
  setProgramLanguage: (code: AppLocale) => void;
}

export const useProgramLanguageStore = create<ProgramLanguageState>((set) => ({
  programLanguage: detectSystemLocale(),
  setProgramLanguage: (code) => {
    i18n.changeLanguage(code);
    set({ programLanguage: code });
  },
}));
