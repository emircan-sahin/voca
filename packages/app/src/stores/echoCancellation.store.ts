import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS } from '@voca/shared';

interface EchoCancellationState {
  enabled: boolean;
  toggle: () => void;
}

export const useEchoCancellationStore = create<EchoCancellationState>((set) => ({
  enabled: DEFAULT_USER_SETTINGS.echoCancellation,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
}));
