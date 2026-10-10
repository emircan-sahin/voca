import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  completed: boolean;
  // Set by "Show tutorial again" so the wizard also opens for accounts that skip it by default
  replay: boolean;
  complete: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      replay: false,
      complete: () => set({ completed: true, replay: false }),
      reset: () => set({ completed: false, replay: true }),
    }),
    { name: 'voca-onboarding' }
  )
);
