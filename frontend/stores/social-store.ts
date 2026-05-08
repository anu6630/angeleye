import { create } from 'zustand';
import { apiClient, CommentResponse } from '@/lib/api-client';

interface SocialState {
  // Like state
  likedNotebooks: Set<number>;
  notebookLikeCounts: Record<number, number>;

  // Comment state
  comments: Record<number, CommentResponse[]>;
  commentCounts: Record<number, number>;
  isLoading: boolean;
  loadingNotebooks: Set<number>;

  // Follow state (DISC-03)
  followingIds: Set<number>;
  followersCount: Record<number, number>;
  followingCount: Record<number, number>;

  // Like actions
  toggleLike: (notebookId: number) => Promise<void>;
  isLiked: (notebookId: number) => boolean;

  // Comment actions
  loadComments: (notebookId: number) => Promise<void>;
  createComment: (notebookId: number, content: string, parentId?: number) => Promise<void>;
  getComments: (notebookId: number) => CommentResponse[];
  getCommentCount: (notebookId: number) => number;

  // Follow actions (DISC-03)
  setFollowingIds: (ids: number[]) => void;
  toggleFollow: (userId: number) => Promise<void>;
  isFollowing: (userId: number) => boolean;
  initializeFollows: () => Promise<void>;

  reset: () => void;
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  likedNotebooks: new Set(),
  notebookLikeCounts: {},
  comments: {},
  commentCounts: {},
  isLoading: false,
  loadingNotebooks: new Set(),
  followingIds: new Set(),
  followersCount: {},
  followingCount: {},

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
    const { loadingNotebooks } = get();
    if (loadingNotebooks.has(notebookId)) return;

    set((state) => ({
      isLoading: true,
      loadingNotebooks: new Set(state.loadingNotebooks).add(notebookId),
    }));

    try {
      const comments = await apiClient.getComments(notebookId);
      set((state) => {
        const newLoading = new Set(state.loadingNotebooks);
        newLoading.delete(notebookId);
        return {
          comments: { ...state.comments, [notebookId]: comments },
          commentCounts: {
            ...state.commentCounts,
            [notebookId]: comments.length,
          },
          isLoading: newLoading.size > 0,
          loadingNotebooks: newLoading,
        };
      });
    } catch (error) {
      console.error('Failed to load comments:', error);
      set((state) => {
        const newLoading = new Set(state.loadingNotebooks);
        newLoading.delete(notebookId);
        return {
          isLoading: newLoading.size > 0,
          loadingNotebooks: newLoading,
        };
      });
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

  // Follow actions (DISC-03)
  setFollowingIds: (ids) =>
    set({
      followingIds: new Set(ids),
    }),

  toggleFollow: async (userId) => {
    const state = get();
    const isFollowing = state.followingIds.has(userId);

    // Optimistic update
    set((prevState) => {
      const newFollowing = new Set(prevState.followingIds);
      if (isFollowing) {
        newFollowing.delete(userId);
      } else {
        newFollowing.add(userId);
      }
      return {
        followingIds: newFollowing,
        followersCount: {
          ...prevState.followersCount,
          [userId]: (prevState.followersCount[userId] || 0) + (isFollowing ? -1 : 1),
        },
      };
    });

    try {
      if (isFollowing) {
        await apiClient.unfollowUser(userId);
      } else {
        await apiClient.followUser(userId);
      }
    } catch (error) {
      // Rollback on error
      set((prevState) => {
        const newFollowing = new Set(prevState.followingIds);
        if (isFollowing) {
          newFollowing.add(userId);
        } else {
          newFollowing.delete(userId);
        }
        return {
          followingIds: newFollowing,
          followersCount: {
            ...prevState.followersCount,
            [userId]: (prevState.followersCount[userId] || 0) + (isFollowing ? 1 : -1),
          },
        };
      });
      throw error;
    }
  },

  isFollowing: (userId) => get().followingIds.has(userId),

  initializeFollows: async () => {
    try {
      const user = await apiClient.getCurrentUser();
      // Backend currently exposes follow counts, not full following user lists.
      const following = await apiClient.getUserFollowing(user.id);
      set({
        followingIds: new Set(),
        followingCount: {
          [user.id]: following.following_count,
        },
      });
    } catch (error) {
      console.error('Failed to initialize follows:', error);
    }
  },

  reset: () =>
    set({
      likedNotebooks: new Set(),
      notebookLikeCounts: {},
      comments: {},
      commentCounts: {},
      followingIds: new Set(),
      followersCount: {},
      followingCount: {},
    }),
}));
