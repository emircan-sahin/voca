import { create } from 'zustand';

export type View = 'dashboard' | 'history' | 'settings' | 'billing';

interface NavigationState {
  view: View;
  setView: (v: View) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
}));
