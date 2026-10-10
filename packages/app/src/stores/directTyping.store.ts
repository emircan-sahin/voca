import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DirectTypingState {
  enabled: boolean;
  toggle: () => void;
}

export const useDirectTypingStore = create<DirectTypingState>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'voca-direct-typing' }
  )
);
