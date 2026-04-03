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

export interface AuthResponse {
  user_id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface ProfileCompletionData {
  username: string;
  avatar_url?: string;
  bio?: string;
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
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  cells?: NotebookCell[];
  user?: {
    id: number;
    username: string;
    avatar_url?: string | null;
  };
}

export interface NotebookCard {
  id: number;
  title: string;
  username: string;
  avatar_url?: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface FeedResponse {
  items: NotebookCard[];
  next_cursor: string | null;
  has_more: boolean;
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
  task_id: string;
  state: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';
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
  auto_invalidate?: boolean;
}

export interface PublishResponse {
  notebook_id: number;
  is_published: boolean;
  output_url: string;
  invalidation_id?: string;
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
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || 'Request failed');
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

  async getProfileStats(): Promise<{ published_notebook_count: number; likes_received_count: number }> {
    return this.request('/profiles/stats');
  }

  async getPublicProfile(username: string): Promise<User> {
    return this.request<User>(`/profiles/${username}`);
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

  async updateNotebook(id: number, data: NotebookUpdate): Promise<NotebookResponse> {
    return this.request<NotebookResponse>(`/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNotebook(id: number): Promise<void> {
    return this.request(`/notebooks/${id}`, { method: 'DELETE' });
  }

  async getUserNotebooks(): Promise<NotebookResponse[]> {
    return this.request<NotebookResponse[]>('/notebooks');
  }

  // Feed endpoint
  async getFeed(cursor?: string): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    const query = params.toString();
    return this.request<FeedResponse>(`/notebooks/feed${query ? `?${query}` : ''}`);
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
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || 'Request failed');
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
}

export const apiClient = new ApiClient();
