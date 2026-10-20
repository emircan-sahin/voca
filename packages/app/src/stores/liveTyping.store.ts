import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LiveTypingState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useLiveTypingStore = create<LiveTypingState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'voca-live-typing' }
  )
);
