import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TranslationTone } from '@voca/shared';

interface TranslationState {
  enabled: boolean;
  targetLanguage: string;
  tone: TranslationTone;
  numeric: boolean;
  planning: boolean;
  setEnabled: (enabled: boolean) => void;
  setTargetLanguage: (code: string) => void;
  setTone: (tone: TranslationTone) => void;
  setNumeric: (numeric: boolean) => void;
  setPlanning: (planning: boolean) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
      enabled: false,
      targetLanguage: 'en',
      tone: 'developer',
      numeric: false,
      planning: false,
      setEnabled: (enabled) => set({ enabled }),
      setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
      setTone: (tone) => set({ tone }),
      setNumeric: (numeric) => set({ numeric }),
      setPlanning: (planning) => set({ planning }),
    }),
    { name: 'voca-translation' }
  )
);
