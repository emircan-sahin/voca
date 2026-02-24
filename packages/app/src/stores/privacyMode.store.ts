import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS } from '@voca/shared';

interface PrivacyModeState {
  enabled: boolean;
  toggle: () => void;
}

export const usePrivacyModeStore = create<PrivacyModeState>((set) => ({
  enabled: DEFAULT_USER_SETTINGS.privacyMode,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
}));
