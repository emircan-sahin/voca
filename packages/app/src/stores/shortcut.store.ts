import { create } from 'zustand';

interface ShortcutState {
  config: ShortcutConfig | null;
  loading: boolean;
  load: () => Promise<void>;
  updateBinding: (action: ShortcutAction, binding: Partial<ShortcutBinding>) => Promise<void>;
  toggleEnabled: (action: ShortcutAction) => Promise<void>;
  reset: () => Promise<void>;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  config: null,
  loading: true,
  load: async () => {
    const config = await window.electronAPI.shortcuts.getConfig();
    set({ config, loading: false });
  },
  updateBinding: async (action, binding) => {
    const current = get().config;
    if (!current) return;
    const updated: ShortcutConfig = {
      ...current,
      [action]: { ...current[action], ...binding },
    };
    const saved = await window.electronAPI.shortcuts.updateConfig(updated);
    set({ config: saved });
  },
  toggleEnabled: async (action) => {
    const current = get().config;
    if (!current) return;
    const updated: ShortcutConfig = {
      ...current,
      [action]: { ...current[action], enabled: !current[action].enabled },
    };
    const saved = await window.electronAPI.shortcuts.updateConfig(updated);
    set({ config: saved });
  },
  reset: async () => {
    const config = await window.electronAPI.shortcuts.resetConfig();
    set({ config });
  },
}));
