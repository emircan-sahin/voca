import { create } from 'zustand';

interface NoiseSuppressionState {
  enabled: boolean;
  toggle: () => void;
}

export const useNoiseSuppressionStore = create<NoiseSuppressionState>((set) => ({
  enabled: false,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
}));
