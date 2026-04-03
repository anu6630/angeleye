import { create } from 'zustand';
import { apiClient, CommentResponse } from '@/lib/api-client';

interface SocialState {
  // Like state
  likedNotebooks: Set<number>;
  notebookLikeCounts: Record<number, number>;

  // Comment state
  comments: Record<number, CommentResponse[]>;
  commentCounts: Record<number, number>;

  // Like actions
  toggleLike: (notebookId: number) => Promise<void>;
  isLiked: (notebookId: number) => boolean;

  // Comment actions
  loadComments: (notebookId: number) => Promise<void>;
  createComment: (notebookId: number, content: string, parentId?: number) => Promise<void>;
  getComments: (notebookId: number) => CommentResponse[];
  getCommentCount: (notebookId: number) => number;

  reset: () => void;
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  likedNotebooks: new Set(),
  notebookLikeCounts: {},
  comments: {},
  commentCounts: {},

  toggleLike: async (notebookId) => {
    const state = get();
    const isLiked = state.likedNotebooks.has(notebookId);
    const currentCount = state.notebookLikeCounts[notebookId] || 0;

    // Optimistic update
    set((prevState) => {
      const newLiked = new Set(prevState.likedNotebooks);
      if (isLiked) {
        newLiked.delete(notebookId);
      } else {
        newLiked.add(notebookId);
      }
      return {
        likedNotebooks: newLiked,
        notebookLikeCounts: {
          ...prevState.notebookLikeCounts,
          [notebookId]: currentCount + (isLiked ? -1 : 1),
        },
      };
    });

    try {
      await apiClient.toggleLike(notebookId);
    } catch (error) {
      // Rollback on error
      set((prevState) => {
        const newLiked = new Set(prevState.likedNotebooks);
        newLiked.delete(notebookId); // Reset to pre-toggle state
        return {
          likedNotebooks: newLiked,
          notebookLikeCounts: {
            ...prevState.notebookLikeCounts,
            [notebookId]: currentCount,
          },
        };
      });
    }
  },

  isLiked: (notebookId) => get().likedNotebooks.has(notebookId),

  loadComments: async (notebookId) => {
    try {
      const comments = await apiClient.getComments(notebookId);
      set((state) => ({
        comments: { ...state.comments, [notebookId]: comments },
        commentCounts: {
          ...state.commentCounts,
          [notebookId]: comments.length,
        },
      }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  },

  createComment: async (notebookId, content, parentId) => {
    const tempId = Date.now();
    const tempComment: CommentResponse = {
      id: tempId,
      notebook_id: notebookId,
      user_id: 0, // Will be replaced by server response
      parent_id: parentId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      username: 'You',
      avatar_url: null,
      replies: [],
    };

    // Optimistic update
    set((state) => {
      const existingComments = state.comments[notebookId] || [];
      if (parentId) {
        // Add to parent's replies
        const updateNested = (comments: CommentResponse[]): CommentResponse[] => {
          return comments.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), tempComment] }
              : c.replies
              ? { ...c, replies: updateNested(c.replies) }
              : c
          );
        };
        return {
          comments: {
            ...state.comments,
            [notebookId]: updateNested(existingComments),
          },
          commentCounts: {
            ...state.commentCounts,
            [notebookId]: (state.commentCounts[notebookId] || 0) + 1,
          },
        };
      } else {
        // Add as top-level comment
        return {
          comments: {
            ...state.comments,
            [notebookId]: [tempComment, ...existingComments],
          },
          commentCounts: {
            ...state.commentCounts,
            [notebookId]: (state.commentCounts[notebookId] || 0) + 1,
          },
        };
      }
    });

    try {
      const comment = await apiClient.createComment({
        notebook_id: notebookId,
        content,
        parent_id: parentId,
      });

      // Replace temp comment with real one
      set((state) => {
        const existingComments = state.comments[notebookId] || [];
        const replaceNested = (comments: CommentResponse[]): CommentResponse[] => {
          return comments.map((c) =>
            c.id === tempId
              ? comment
              : c.replies
              ? { ...c, replies: replaceNested(c.replies) }
              : c
          );
        };
        return {
          comments: {
            ...state.comments,
            [notebookId]: replaceNested(existingComments),
          },
        };
      });
    } catch (error) {
      // Rollback on error
      set((state) => ({
        comments: {
          ...state.comments,
          [notebookId]: (state.comments[notebookId] || []).filter((c) => c.id !== tempId),
        },
        commentCounts: {
          ...state.commentCounts,
          [notebookId]: (state.commentCounts[notebookId] || 1) - 1,
        },
      }));
    }
  },

  getComments: (notebookId) => get().comments[notebookId] || [],
  getCommentCount: (notebookId) => get().commentCounts[notebookId] || 0,

  reset: () =>
    set({
      likedNotebooks: new Set(),
      notebookLikeCounts: {},
      comments: {},
      commentCounts: {},
    }),
}));
