const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  bio?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface PublicProfile {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  published_notebook_count: number;
  likes_received_count: number;
  created_at: string;
}

export interface AuthResponse {
  user_id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface ProfileCompletionData {
  username: string;
  bio?: string;
}

export interface AvatarUploadResponse {
  avatar_url: string;
}

export interface AvatarCropData {
  crop_x: number;
  crop_y: number;
  crop_size: number;
}

export interface NotebookCell {
  id?: number;
  cell_type: 'code' | 'markdown';
  content: string;
  order_index: number;
}

export interface NotebookCreate {
  title: string;
  cells?: NotebookCell[];
}

export interface NotebookUpdate {
  title?: string;
  is_published?: boolean;
}

export interface NotebookResponse {
  id: number;
  title: string;
  user_id: number;
  is_published: boolean;
  output_url?: string | null;
  output_s3_key?: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  view_count?: number;
  cells?: NotebookCell[];
  user?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  };
  username?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_thumbnail_url?: string | null;
  parent_id?: number | null;
  root_id?: number | null;
}

export interface NotebookCard {
  id: number;
  title: string;
  username: string;
  avatar_url?: string | null;
  like_count: number;
  comment_count: number;
  view_count?: number;
  banner_thumbnail_url?: string | null;
  output_url?: string | null;
  created_at: string;
  parent_id?: number | null;
  root_id?: number | null;
}

export interface BannerUploadResponse {
  banner_url: string;
  banner_thumbnail_url: string;
  banner_uploaded_at: string | null;
}

export interface FeedResponse {
  items: NotebookCard[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface UserNotebooksResponse {
  notebooks: NotebookResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface NotebookForksResponse {
  forks: NotebookResponse[];
  total: number;
}

export interface ForkChainResponse {
  chain: NotebookResponse[];
  total: number;
}

export interface CommentCreate {
  notebook_id: number;
  content: string;
  parent_id?: number;
}

export interface CommentResponse {
  id: number;
  notebook_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  avatar_url?: string | null;
  replies?: CommentResponse[];
}

// Dataset interfaces (NOTE-03: User can upload datasets)
export interface Dataset {
  id: number;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
  row_count: number | null;
  created_at: string;
  download_url: string | null;
}

export interface DatasetListResponse {
  datasets: Dataset[];
  total: number;
}

// Compilation interfaces (NOTE-04: User can compile notebooks)
export interface CompilationRequest {
  notebook_id: number;
  dataset_id?: number;
}

export interface AsyncCompilationResponse {
  task_id: string;
  notebook_id: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
}

export interface CompilationStatusResponse {
  task_id?: string;
  state: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | string;
  result?: CompilationResult;
  error?: string;
}

export interface CompilationResult {
  status: 'success' | 'failed';
  notebook_id: number;
  output_url?: string;
  output_key?: string;
  error?: string;
}

// Publish interfaces (NOTE-05: User can publish notebooks)
export interface PublishRequest {
  notebook_id: number;
  output_key: string;
  dataset_id?: number;
  auto_invalidate?: boolean;
}

export interface PublishResponse {
  notebook_id: number;
  is_published: boolean;
  output_url: string;
  invalidation_id?: string;
}

export interface FollowersCountResponse {
  followers_count: number;
}

export interface FollowingCountResponse {
  following_count: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Important for httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || error.detail || JSON.stringify(error);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error(`API Request failed: ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    // Handle 204 No Content (DELETE)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints (calls backend from Plan 04)
  async loginWithGoogle(): Promise<void> {
    // OAuth flow initiates via redirect to backend endpoint
    window.location.href = `${this.baseUrl}/auth/google`;
  }

  async loginWithFacebook(): Promise<void> {
    // OAuth flow initiates via redirect to backend endpoint
    window.location.href = `${this.baseUrl}/auth/facebook`;
  }

  async completeProfile(data: ProfileCompletionData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  // Profile endpoints
  async getProfile(): Promise<User> {
    return this.request<User>('/profiles/me');
  }

  async updateProfile(data: Partial<ProfileCompletionData>): Promise<User> {
    return this.request<User>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadMyAvatar(file: File, cropData: AvatarCropData): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('crop_x', String(Math.round(cropData.crop_x)));
    formData.append('crop_y', String(Math.round(cropData.crop_y)));
    formData.append('crop_size', String(Math.round(cropData.crop_size)));

    const response = await fetch(`${this.baseUrl}/profiles/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      let errorMessage = 'Failed to upload avatar';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || error.detail || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async deleteMyAvatar(): Promise<void> {
    await this.request('/profiles/me/avatar', { method: 'DELETE' });
  }

  async getProfileStats(): Promise<{ published_notebook_count: number; likes_received_count: number }> {
    return this.request('/profiles/stats');
  }

  async getPublicProfile(username: string): Promise<PublicProfile> {
    return this.request<PublicProfile>(`/profiles/${username}`);
  }

  // Notebook endpoints
  async createNotebook(data: NotebookCreate): Promise<NotebookResponse> {
    return this.request<NotebookResponse>('/notebooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNotebook(id: number): Promise<NotebookResponse> {
    return this.request<NotebookResponse>(`/notebooks/${id}`);
  }

  async saveNotebookCells(id: number, cells: { cell_type: string; content: string; order_index: number }[]): Promise<void> {
    await this.request<unknown>(`/notebooks/${id}/cells`, {
      method: 'PUT',
      body: JSON.stringify(cells),
    });
  }

  async updateNotebook(id: number, data: NotebookUpdate): Promise<NotebookResponse> {
    return this.request<NotebookResponse>(`/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNotebook(id: number): Promise<void> {
    return this.request(`/notebooks/${id}`, { method: 'DELETE' });
  }

  async uploadBanner(notebookId: number, file: File): Promise<BannerUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/notebooks/${notebookId}/banner`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload banner';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || error.detail || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async deleteBanner(notebookId: number): Promise<void> {
    return this.request(`/notebooks/${notebookId}/banner`, { method: 'DELETE' });
  }

  async getUserNotebooks(skip: number = 0, limit: number = 20): Promise<UserNotebooksResponse> {
    const raw = await this.request<UserNotebooksResponse | NotebookResponse[]>(
      `/notebooks?skip=${skip}&limit=${limit}`
    );
    if (Array.isArray(raw)) {
      return {
        notebooks: raw,
        total: raw.length,
        skip,
        limit,
      };
    }
    return {
      notebooks: raw.notebooks ?? [],
      total: raw.total ?? raw.notebooks?.length ?? 0,
      skip: raw.skip ?? skip,
      limit: raw.limit ?? limit,
    };
  }

  // Feed endpoint
  async getFeed(cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    const query = params.toString();
    return this.request<FeedResponse>(`/feed${query ? `?${query}` : ''}`);
  }

  // Like endpoint
  async toggleLike(notebookId: number): Promise<{ liked: boolean; like_count: number }> {
    return this.request('/likes/toggle', {
      method: 'POST',
      body: JSON.stringify({ notebook_id: notebookId }),
    });
  }

  // Comment endpoints
  async createComment(data: CommentCreate): Promise<CommentResponse> {
    return this.request<CommentResponse>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getComments(notebookId: number): Promise<CommentResponse[]> {
    return this.request<CommentResponse[]>(`/comments/${notebookId}`);
  }

  async getCommentCount(notebookId: number): Promise<{ count: number }> {
    return this.request(`/comments/${notebookId}/count`);
  }

  // Dataset methods (NOTE-03: User can upload datasets)
  async uploadDataset(file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/datasets`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || error.detail || JSON.stringify(error);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error(`API Request failed: ${url}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getDatasets(): Promise<DatasetListResponse> {
    return this.request<DatasetListResponse>('/datasets');
  }

  async getDataset(id: number): Promise<Dataset> {
    return this.request<Dataset>(`/datasets/${id}`);
  }

  async deleteDataset(id: number): Promise<void> {
    return this.request(`/datasets/${id}`, { method: 'DELETE' });
  }

  // Compilation methods (NOTE-04: User can compile notebooks)
  async compileNotebookAsync(request: CompilationRequest): Promise<AsyncCompilationResponse> {
    return this.request<AsyncCompilationResponse>('/compilation/compile/async', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getCompilationStatus(taskId: string): Promise<CompilationStatusResponse> {
    return this.request<CompilationStatusResponse>(`/compilation/status/${taskId}`);
  }

  // Publish methods (NOTE-05: User can publish notebooks)
  async publishNotebook(request: PublishRequest): Promise<PublishResponse> {
    return this.request<PublishResponse>('/compilation/publish', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async compileAndPublish(notebookId: number, datasetId?: number): Promise<AsyncCompilationResponse> {
    return this.compileNotebookAsync({ notebook_id: notebookId, dataset_id: datasetId });
  }

  // Fork operations (FORK-01, FORK-02, FORK-03)
  async forkNotebook(notebookId: number): Promise<NotebookResponse> {
    return this.request<NotebookResponse>(`/notebooks/${notebookId}/fork`, {
      method: 'POST',
    });
  }

  async getNotebookForks(notebookId: number, limit: number = 50): Promise<NotebookForksResponse> {
    return this.request<NotebookForksResponse>(`/notebooks/${notebookId}/forks?limit=${limit}`);
  }

  async getForkChain(notebookId: number): Promise<ForkChainResponse> {
    return this.request<ForkChainResponse>(`/notebooks/${notebookId}/chain`);
  }

  // Follow operations (DISC-03)
  async followUser(userId: number): Promise<{ message: string; following_id: number }> {
    return this.request<{ message: string; following_id: number }>('/follows', {
      method: 'POST',
      body: JSON.stringify({ following_id: userId }),
    });
  }

  async unfollowUser(userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/follows/${userId}`, {
      method: 'DELETE',
    });
  }

  async getUserFollowers(userId: number): Promise<FollowersCountResponse> {
    return this.request<FollowersCountResponse>(`/follows/followers/${userId}`);
  }

  async getUserFollowing(userId: number): Promise<FollowingCountResponse> {
    return this.request<FollowingCountResponse>(`/follows/following/${userId}`);
  }

  async checkFollowing(userId: number): Promise<{ is_following: boolean }> {
    return this.request<{ is_following: boolean }>(`/follows/check/${userId}`);
  }

  // Search operations (DISC-04, DISC-05)
  async searchNotebooks(
    query: string,
    tab: string = 'all',
    limit: number = 50
  ): Promise<{ notebooks: NotebookResponse[]; total: number; empty_state: boolean; message?: string }> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (tab) params.append('tab', tab);
    params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request<{ notebooks: NotebookResponse[]; total: number; empty_state: boolean; message?: string }>(
      `/search${queryString ? `?${queryString}` : ''}`
    );
  }
}

export const apiClient = new ApiClient();
