import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    loginWithGoogle: vi.fn(),
    loginWithFacebook: vi.fn(),
    completeProfile: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('auth-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.getState().logout()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.pendingUserId).toBeNull()
  })

  it('calls loginWithGoogle', () => {
    const loginWithGoogle = useAuthStore.getState().loginWithGoogle
    loginWithGoogle()
    expect(apiClient.loginWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('calls loginWithFacebook', () => {
    const loginWithFacebook = useAuthStore.getState().loginWithFacebook
    loginWithFacebook()
    expect(apiClient.loginWithFacebook).toHaveBeenCalledTimes(1)
  })

  it('completes profile and sets user', async () => {
    const mockResponse = {
      user_id: 123,
      email: 'test@example.com',
      username: 'testuser',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
    }

    vi.mocked(apiClient.completeProfile).mockResolvedValue(mockResponse)

    const state = useAuthStore.getState()
    await state.completeProfile('testuser', 'Test bio')

    const newState = useAuthStore.getState()
    expect(newState.user).toEqual({
      id: 123,
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      is_verified: true,
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      created_at: expect.any(String),
    })
    expect(newState.isAuthenticated).toBe(true)
    expect(newState.pendingUserId).toBeNull()
  })

  it('fetches user successfully', async () => {
    const mockUser = {
      id: 123,
      email: 'test@example.com',
      username: 'testuser',
      is_active: true,
      is_verified: true,
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      created_at: '2024-01-01T00:00:00Z',
    }

    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUser)

    const state = useAuthStore.getState()
    await state.fetchUser()

    const newState = useAuthStore.getState()
    expect(newState.user).toEqual(mockUser)
    expect(newState.isAuthenticated).toBe(true)
    expect(newState.isLoading).toBe(false)
  })

  it('handles fetchUser error when not authenticated', async () => {
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(new Error('Not authenticated'))

    const state = useAuthStore.getState()
    await state.fetchUser()

    const newState = useAuthStore.getState()
    expect(newState.user).toBeNull()
    expect(newState.isAuthenticated).toBe(false)
    expect(newState.isLoading).toBe(false)
  })

  it('logs out and clears state', async () => {
    vi.mocked(apiClient.logout).mockResolvedValue(undefined)

    // Set authenticated state first
    useAuthStore.setState({
      user: { id: 123, email: 'test@example.com', username: 'testuser', is_active: true, is_verified: true },
      isAuthenticated: true,
      isLoading: false,
      pendingUserId: 'test-pending-id',
    })

    const state = useAuthStore.getState()
    await state.logout()

    const newState = useAuthStore.getState()
    expect(newState.user).toBeNull()
    expect(newState.isAuthenticated).toBe(false)
    expect(newState.pendingUserId).toBeNull()
  })

  it('sets pending user ID', () => {
    const state = useAuthStore.getState()
    state.setPendingUserId('test-pending-id')

    expect(useAuthStore.getState().pendingUserId).toBe('test-pending-id')
  })
})
