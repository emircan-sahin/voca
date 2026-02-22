import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MicrophoneState {
  deviceId: string;
  setDeviceId: (id: string) => void;
}

export const useMicrophoneStore = create<MicrophoneState>()(
  persist(
    (set) => ({
      deviceId: '',
      setDeviceId: (deviceId) => set({ deviceId }),
    }),
    { name: 'voca-microphone' }
  )
);
