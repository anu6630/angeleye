import { create } from 'zustand';

interface ProgressState {
  isUploading: boolean;
  progress: number; // 0 to 100
  label: string | null;
  startUpload: (label: string) => void;
  updateProgress: (progress: number) => void;
  finishUpload: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  isUploading: false,
  progress: 0,
  label: null,
  startUpload: (label) => set({ isUploading: true, progress: 0, label }),
  updateProgress: (progress) => set({ progress }),
  finishUpload: () => {
    set({ progress: 100 });
    setTimeout(() => {
      set({ isUploading: false, progress: 0, label: null });
    }, 500);
  },
}));
