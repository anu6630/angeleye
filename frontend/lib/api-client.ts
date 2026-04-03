/**
 * API Client for NotebookSocial
 *
 * Communicates with the FastAPI backend at /api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// User types based on backend schemas
export interface User {
  id: number;
  email: string;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProfileStats {
  published_notebook_count: number;
  likes_received_count: number;
}

export interface PublicProfile extends ProfileStats {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
}

export interface ProfileUpdateRequest {
  username?: string;
  avatar_url?: string;
  bio?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

/**
 * API Client
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for httpOnly auth
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async loginWithGoogle() {
    window.location.href = `${this.baseUrl}/api/v1/auth/google`;
  }

  async loginWithFacebook() {
    window.location.href = `${this.baseUrl}/api/v1/auth/facebook`;
  }

  async logout(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  // Profile endpoints
  async getProfile(): Promise<User> {
    return this.request<User>('/api/v1/profiles/me');
  }

  async updateProfile(data: ProfileUpdateRequest): Promise<User> {
    return this.request<User>('/api/v1/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPublicProfile(username: string): Promise<PublicProfile> {
    return this.request<PublicProfile>(`/api/v1/profiles/${username}`);
  }

  async getProfileStats(): Promise<ProfileStats> {
    return this.request<ProfileStats>('/api/v1/profiles/stats');
  }

  async getMyNotebooks(page: number = 1, perPage: number = 20): Promise<{ notebooks: any[]; total: number; page: number; per_page: number }> {
    return this.request<{ notebooks: any[]; total: number; page: number; per_page: number }>(
      `/api/v1/profiles/notebooks?page=${page}&per_page=${perPage}`
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
