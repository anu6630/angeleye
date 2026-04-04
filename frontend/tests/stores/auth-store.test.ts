import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    loginWithGoogle: vi.fn(),
    loginWithFacebook: vi.fn(),
    completeProfile: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
  User: {},
}));

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingUserId: null,
    });
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.pendingUserId).toBeNull();
    });
  });

  describe('loginWithGoogle', () => {
    it('calls apiClient.loginWithGoogle', () => {
      const store = useAuthStore.getState();

      store.loginWithGoogle();

      expect(apiClient.loginWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  describe('loginWithFacebook', () => {
    it('calls apiClient.loginWithFacebook', () => {
      const store = useAuthStore.getState();

      store.loginWithFacebook();

      expect(apiClient.loginWithFacebook).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeProfile', () => {
    it('successfully completes profile and updates state', async () => {
      const mockResponse = {
        user_id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
      };

      vi.mocked(apiClient.completeProfile).mockResolvedValueOnce(mockResponse);

      const store = useAuthStore.getState();

      await store.completeProfile('testuser', 'https://example.com/avatar.jpg', 'Test bio');

      expect(apiClient.completeProfile).toHaveBeenCalledWith({
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        is_verified: true,
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        created_at: expect.any(String),
      });
      expect(state.isAuthenticated).toBe(true);
      expect(state.pendingUserId).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading to true during completion', async () => {
      vi.mocked(apiClient.completeProfile).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const store = useAuthStore.getState();

      store.completeProfile('testuser', 'https://example.com/avatar.jpg', 'Test bio');

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('handles completion errors and resets loading state', async () => {
      const mockError = new Error('Profile completion failed');
      vi.mocked(apiClient.completeProfile).mockRejectedValueOnce(mockError);

      const store = useAuthStore.getState();

      await expect(
        store.completeProfile('testuser', 'https://example.com/avatar.jpg', 'Test bio')
      ).rejects.toThrow('Profile completion failed');

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('handles completion without optional parameters', async () => {
      const mockResponse = {
        user_id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        avatar_url: null,
        bio: null,
      };

      vi.mocked(apiClient.completeProfile).mockResolvedValueOnce(mockResponse);

      const store = useAuthStore.getState();

      await store.completeProfile('testuser');

      expect(apiClient.completeProfile).toHaveBeenCalledWith({
        username: 'testuser',
        avatar_url: undefined,
        bio: undefined,
      });

      const state = useAuthStore.getState();
      expect(state.user?.username).toBe('testuser');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('fetchUser', () => {
    it('successfully fetches user and updates state', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        is_verified: true,
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.getCurrentUser).mockResolvedValueOnce(mockUser);

      const store = useAuthStore.getState();

      await store.fetchUser();

      expect(apiClient.getCurrentUser).toHaveBeenCalledTimes(1);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading to true during fetch', async () => {
      vi.mocked(apiClient.getCurrentUser).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const store = useAuthStore.getState();

      store.fetchUser();

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('handles unauthenticated state and clears user data', async () => {
      const mockError = new Error('Not authenticated');
      vi.mocked(apiClient.getCurrentUser).mockRejectedValueOnce(mockError);

      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          is_verified: true,
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Test bio',
          created_at: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isLoading: false,
        pendingUserId: null,
      });

      const store = useAuthStore.getState();

      await store.fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('successfully logs out and clears state', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          is_verified: true,
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Test bio',
          created_at: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isLoading: false,
        pendingUserId: 'pending-123',
      });

      vi.mocked(apiClient.logout).mockResolvedValueOnce(undefined);

      const store = useAuthStore.getState();

      await store.logout();

      expect(apiClient.logout).toHaveBeenCalledTimes(1);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.pendingUserId).toBeNull();
    });

    it('handles logout errors and still clears state', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          is_active: true,
          is_verified: true,
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Test bio',
          created_at: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isLoading: false,
        pendingUserId: 'pending-123',
      });

      const mockError = new Error('Logout failed');
      vi.mocked(apiClient.logout).mockRejectedValueOnce(mockError);

      const store = useAuthStore.getState();

      await store.logout();

      // State should still be cleared even if API call fails
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.pendingUserId).toBeNull();
    });
  });

  describe('setPendingUserId', () => {
    it('sets pending user ID', () => {
      const store = useAuthStore.getState();

      store.setPendingUserId('pending-123');

      expect(useAuthStore.getState().pendingUserId).toBe('pending-123');
    });

    it('clears pending user ID when set to null', () => {
      useAuthStore.setState({ pendingUserId: 'pending-123' });

      const store = useAuthStore.getState();
      store.setPendingUserId(null);

      expect(useAuthStore.getState().pendingUserId).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('persists isAuthenticated and user to localStorage', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        is_active: true,
        is_verified: true,
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Set authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        pendingUserId: null,
      });

      // Check localStorage was called
      const storedData = localStorage.getItem('auth-storage');
      expect(storedData).toBeTruthy();

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.isAuthenticated).toBe(true);
        expect(parsed.state.user).toEqual(mockUser);
      }
    });

    it('does not persist isLoading and pendingUserId', () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        pendingUserId: 'pending-123',
      });

      const storedData = localStorage.getItem('auth-storage');
      expect(storedData).toBeTruthy();

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.isLoading).toBeUndefined();
        expect(parsed.state.pendingUserId).toBeUndefined();
      }
    });
  });
});
