import { create } from 'zustand';

export type Provider = 'groq' | 'deepgram';

interface ProviderState {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: 'deepgram',
  setProvider: (provider) => set({ provider }),
}));
