import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Provider = 'groq' | 'deepgram';

interface ProviderState {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      provider: 'groq',
      setProvider: (provider) => set({ provider }),
    }),
    { name: 'voice-provider' }
  )
);
