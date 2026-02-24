import { create } from 'zustand';
import { TranslationTone, DEFAULT_USER_SETTINGS } from '@voca/shared';

const dt = DEFAULT_USER_SETTINGS.translation;

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

export const useTranslationStore = create<TranslationState>((set) => ({
  enabled: dt.enabled,
  targetLanguage: dt.targetLanguage,
  tone: dt.tone,
  numeric: dt.numeric,
  planning: dt.planning,
  setEnabled: (enabled) => set({ enabled }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
  setTone: (tone) => set({ tone }),
  setNumeric: (numeric) => set({ numeric }),
  setPlanning: (planning) => set({ planning }),
}));
