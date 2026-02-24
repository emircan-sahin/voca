import { create } from 'zustand';
import { DEFAULT_USER_SETTINGS } from '@voca/shared';

export type Provider = 'groq' | 'deepgram';

interface ProviderState {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: DEFAULT_USER_SETTINGS.provider,
  setProvider: (provider) => set({ provider }),
}));
