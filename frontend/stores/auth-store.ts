import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient, User } from '@/lib/api-client';
import { clearSharedClientState } from '@/lib/session-isolation';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingUserId: string | null;
  loginWithGoogle: () => void;
  loginWithFacebook: () => void;
  completeProfile: (username: string, bio?: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  setPendingUserId: (userId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingUserId: null,

      loginWithGoogle: () => {
        apiClient.loginWithGoogle();
      },

      loginWithFacebook: () => {
        apiClient.loginWithFacebook();
      },

      completeProfile: async (username, bio) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.completeProfile({
            username,
            bio,
          });
          set({
            user: {
              id: response.user_id,
              email: response.email,
              username: response.username,
              is_active: true,
              is_verified: true,
              avatar_url: response.avatar_url,
              bio: response.bio,
              created_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            pendingUserId: null,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const prevId = get().user?.id ?? null;
          const user = await apiClient.getCurrentUser();
          if (prevId !== null && prevId !== user.id) {
            await clearSharedClientState();
          }
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to fetch user:', error);
          await clearSharedClientState().catch(() => {});
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          await clearSharedClientState().catch(() => {});
          set({
            user: null,
            isAuthenticated: false,
            pendingUserId: null,
          });
        }
      },

      setPendingUserId: (userId) => {
        set({ pendingUserId: userId });
      },
    }),
    {
      name: 'auth-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pendingUserId: state.pendingUserId,
      }),
      onRehydrateStorage: () => () => {
        try {
          localStorage.removeItem('auth-storage');
        } catch {
          /* ignore */
        }
      },
    }
  )
);
