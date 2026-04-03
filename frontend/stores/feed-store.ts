import { create } from 'zustand';
import { apiClient, NotebookCard } from '@/lib/api-client';

interface FeedState {
  notebooks: NotebookCard[];
  cursor: string | null;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;

  loadFeed: (cursor?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  prependNotebook: (notebook: NotebookCard) => void;
  updateNotebook: (id: number, updates: Partial<NotebookCard>) => void;
  removeNotebook: (id: number) => void;
  reset: () => void;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  notebooks: [],
  cursor: null,
  isLoading: false,
  hasMore: true,
  error: null,

  loadFeed: async (cursor) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getFeed(cursor);
      set({
        notebooks: response.items,
        cursor: response.next_cursor,
        hasMore: response.has_more,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoading || !state.hasMore) return;

    set({ isLoading: true });
    try {
      const response = await apiClient.getFeed(state.cursor);
      set((prevState) => ({
        notebooks: [...prevState.notebooks, ...response.items],
        cursor: response.next_cursor,
        hasMore: response.has_more,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  prependNotebook: (notebook) =>
    set((state) => ({
      notebooks: [notebook, ...state.notebooks],
    })),

  updateNotebook: (id, updates) =>
    set((state) => ({
      notebooks: state.notebooks.map((nb) =>
        nb.id === id ? { ...nb, ...updates } : nb
      ),
    })),

  removeNotebook: (id) =>
    set((state) => ({
      notebooks: state.notebooks.filter((nb) => nb.id !== id),
    })),

  reset: () =>
    set({
      notebooks: [],
      cursor: null,
      isLoading: false,
      hasMore: true,
      error: null,
    }),
}));
