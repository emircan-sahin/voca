import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NoiseSuppressionState {
  enabled: boolean;
  toggle: () => void;
}

export const useNoiseSuppressionStore = create<NoiseSuppressionState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'voca-noise-suppression' }
  )
);
