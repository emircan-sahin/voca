import { create } from 'zustand';

interface RecordingState {
  isProcessing: boolean;
  setProcessing: (v: boolean) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isProcessing: false,
  setProcessing: (v) => set({ isProcessing: v }),
}));
