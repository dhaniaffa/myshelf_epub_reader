import { create } from 'zustand';

export type SyncPhase = 'idle' | 'scanning' | 'importing';

export interface SyncProgressState {
  phase: SyncPhase;
  current: number;
  total: number;
  fileName?: string;
  foundCount: number;
}

interface SyncStore {
  isSyncing: boolean;
  progress: SyncProgressState;
  abortController: AbortController | null;
  startSync: () => AbortSignal;
  updateProgress: (progress: Partial<SyncProgressState>) => void;
  stopSync: () => void;
  cancelSync: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  isSyncing: false,
  progress: {
    phase: 'idle',
    current: 0,
    total: 0,
    fileName: undefined,
    foundCount: 0,
  },
  abortController: null,
  startSync: () => {
    const existing = get().abortController;
    if (existing) {
      try {
        existing.abort();
      } catch {
        // ignore
      }
    }
    const controller = new AbortController();
    set({
      isSyncing: true,
      abortController: controller,
      progress: {
        phase: 'scanning',
        current: 0,
        total: 0,
        fileName: undefined,
        foundCount: 0,
      },
    });
    return controller.signal;
  },
  updateProgress: (partial) => {
    set((state) => ({
      progress: { ...state.progress, ...partial },
    }));
  },
  stopSync: () => {
    set({
      isSyncing: false,
      abortController: null,
      progress: {
        phase: 'idle',
        current: 0,
        total: 0,
        fileName: undefined,
        foundCount: 0,
      },
    });
  },
  cancelSync: () => {
    const controller = get().abortController;
    if (controller) {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }
    set({
      isSyncing: false,
      abortController: null,
      progress: {
        phase: 'idle',
        current: 0,
        total: 0,
        fileName: undefined,
        foundCount: 0,
      },
    });
  },
}));
