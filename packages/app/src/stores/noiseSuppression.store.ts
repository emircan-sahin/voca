import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS } from '@voca/shared';

interface NoiseSuppressionState {
  enabled: boolean;
  toggle: () => void;
}

export const useNoiseSuppressionStore = create<NoiseSuppressionState>((set) => ({
  enabled: DEFAULT_USER_SETTINGS.noiseSuppression,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
}));
