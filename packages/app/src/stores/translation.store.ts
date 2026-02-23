import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TranslationTone = 'developer' | 'personal';

interface TranslationState {
  enabled: boolean;
  targetLanguage: string;
  tone: TranslationTone;
  setEnabled: (enabled: boolean) => void;
  setTargetLanguage: (code: string) => void;
  setTone: (tone: TranslationTone) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
      enabled: false,
      targetLanguage: 'en',
      tone: 'developer',
      setEnabled: (enabled) => set({ enabled }),
      setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
      setTone: (tone) => set({ tone }),
    }),
    { name: 'voca-translation' }
  )
);
