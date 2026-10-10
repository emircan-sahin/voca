import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vocabularyEntrySchema, VOCABULARY_MAX_ENTRIES } from '@voca/shared';

interface VocabularyState {
  words: string[];
  add: (raw: string) => void;
  remove: (word: string) => void;
}

// Local only on purpose: personal names and jargon never reach the settings DB.
export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set) => ({
      words: [],
      add: (raw) =>
        set((state) => {
          const parsed = vocabularyEntrySchema.safeParse(raw);
          if (!parsed.success || state.words.length >= VOCABULARY_MAX_ENTRIES) return state;
          const key = parsed.data.toLowerCase();
          if (state.words.some((w) => w.toLowerCase() === key)) return state;
          return { words: [...state.words, parsed.data] };
        }),
      remove: (word) => set((state) => ({ words: state.words.filter((w) => w !== word) })),
    }),
    { name: 'voca-vocabulary' }
  )
);
