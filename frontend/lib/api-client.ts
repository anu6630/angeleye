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
  user_id: number;
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
  is_saved?: boolean;
  save_count?: number;
  group_id?: number | null;
  group?: { slug: string; name: string } | null;
}

export interface NotebookCard {
  id: number;
  title: string;
  username: string;
  user_id?: number;
  user?: NotebookResponse['user'];
  avatar_url?: string | null;
  like_count: number;
  comment_count: number;
  view_count?: number;
  banner_thumbnail_url?: string | null;
  output_url?: string | null;
  created_at: string;
  parent_id?: number | null;
  root_id?: number | null;
  is_saved?: boolean;
  save_count?: number;
  group_id?: number | null;
  group?: { slug: string; name: string } | null;
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
  /** Post to a group (omit or null = main feed + global discovery). */
  group_id?: number | null;
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

/** Groups (social) */
export interface GroupPublic {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  visibility: string;
  join_policy: string;
  icon_url?: string | null;
  banner_url?: string | null;
  member_count: number;
  created_at?: string | null;
  is_member: boolean;
  is_admin: boolean;
  can_join: boolean;
  role?: string;
}

export interface GroupListApiResponse {
  items: GroupPublic[];
  total: number;
  limit: number;
  offset: number;
}

export interface GroupInvitePending {
  id: number;
  group: GroupPublic;
  inviter: { id: number; username: string; avatar_url?: string | null };
  created_at: string | null;
}

export interface GroupAdminPromoPending {
  id: number;
  group: GroupPublic;
  proposer: { id: number; username: string; avatar_url?: string | null };
  created_at: string | null;
}

export interface GroupMeResponse {
  groups: GroupPublic[];
  pending_invites: GroupInvitePending[];
  pending_admin_promotions: GroupAdminPromoPending[];
}

export interface GroupCreatePayload {
  name: string;
  slug?: string;
  description?: string;
  visibility?: string;
  join_policy?: string;
}

export interface GroupUpdatePayload {
  name?: string;
  description?: string;
  visibility?: string;
  join_policy?: string;
}

export interface GroupPresenceResponse {
  online_user_count: number;
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

  async saveNotebook(notebookId: number): Promise<{ message: string; notebook_id: number }> {
    return this.request<{ message: string; notebook_id: number }>('/saves', {
      method: 'POST',
      body: JSON.stringify({ notebook_id: notebookId }),
    });
  }

  async unsaveNotebook(notebookId: number): Promise<{ message: string; notebook_id: number }> {
    return this.request<{ message: string; notebook_id: number }>(`/saves/${notebookId}`, {
      method: 'DELETE',
    });
  }

  async getSavedNotebooks(cursor?: string, limit: number = 50): Promise<FeedResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return this.request<FeedResponse>(`/saves?${params.toString()}`);
  }

  async checkNotebookSaved(notebookId: number): Promise<{ is_saved: boolean }> {
    return this.request<{ is_saved: boolean }>(`/saves/check/${notebookId}`);
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

  // Groups
  async listGroups(limit: number = 50, offset: number = 0): Promise<GroupListApiResponse> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return this.request<GroupListApiResponse>(`/groups?${params}`);
  }

  async getMyGroupsHub(): Promise<GroupMeResponse> {
    return this.request<GroupMeResponse>('/groups/me');
  }

  async getGroup(slug: string): Promise<GroupPublic> {
    return this.request<GroupPublic>(`/groups/${encodeURIComponent(slug)}`);
  }

  async getGroupPosts(
    slug: string,
    options?: { cursor?: string | null; limit?: number }
  ): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit != null) params.set('limit', String(options.limit));
    const q = params.toString();
    return this.request<FeedResponse>(
      `/groups/${encodeURIComponent(slug)}/posts${q ? `?${q}` : ''}`
    );
  }

  async createGroup(payload: GroupCreatePayload): Promise<GroupPublic> {
    return this.request<GroupPublic>('/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateGroup(slug: string, payload: GroupUpdatePayload): Promise<GroupPublic> {
    return this.request<GroupPublic>(`/groups/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async joinGroup(slug: string): Promise<GroupPublic> {
    return this.request<GroupPublic>(`/groups/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
    });
  }

  async leaveGroup(slug: string): Promise<void> {
    return this.request<void>(`/groups/${encodeURIComponent(slug)}/members/me`, {
      method: 'DELETE',
    });
  }

  async getGroupPresence(slug: string): Promise<GroupPresenceResponse> {
    return this.request<GroupPresenceResponse>(`/groups/${encodeURIComponent(slug)}/presence`);
  }

  async postGroupPresenceHeartbeat(slug: string): Promise<void> {
    return this.request<void>(`/groups/${encodeURIComponent(slug)}/presence/heartbeat`, {
      method: 'POST',
    });
  }

  async deleteGroupPresence(slug: string): Promise<void> {
    return this.request<void>(`/groups/${encodeURIComponent(slug)}/presence`, {
      method: 'DELETE',
    });
  }

  async createGroupInvite(slug: string, inviteeUserId: number): Promise<{
    id: number;
    group: GroupPublic;
    invitee_user_id: number;
    status: string;
  }> {
    return this.request(`/groups/${encodeURIComponent(slug)}/invites`, {
      method: 'POST',
      body: JSON.stringify({ invitee_user_id: inviteeUserId }),
    });
  }

  async acceptGroupInvite(slug: string, inviteId: number): Promise<GroupPublic> {
    return this.request<GroupPublic>(
      `/groups/${encodeURIComponent(slug)}/invites/${inviteId}/accept`,
      { method: 'POST' }
    );
  }

  async rejectGroupInvite(slug: string, inviteId: number): Promise<void> {
    return this.request<void>(
      `/groups/${encodeURIComponent(slug)}/invites/${inviteId}/reject`,
      { method: 'POST' }
    );
  }

  async createGroupAdminRequest(slug: string, candidateUserId: number): Promise<{
    id: number;
    group: GroupPublic;
    candidate_user_id: number;
    status: string;
  }> {
    return this.request(`/groups/${encodeURIComponent(slug)}/admin-requests`, {
      method: 'POST',
      body: JSON.stringify({ candidate_user_id: candidateUserId }),
    });
  }

  async acceptGroupAdminRequest(slug: string, requestId: number): Promise<GroupPublic> {
    return this.request<GroupPublic>(
      `/groups/${encodeURIComponent(slug)}/admin-requests/${requestId}/accept`,
      { method: 'POST' }
    );
  }

  async rejectGroupAdminRequest(slug: string, requestId: number): Promise<void> {
    return this.request<void>(
      `/groups/${encodeURIComponent(slug)}/admin-requests/${requestId}/reject`,
      { method: 'POST' }
    );
  }

  async uploadGroupIcon(slug: string, file: File): Promise<{ icon_url: string }> {
    const form = new FormData();
    form.append('file', file);
    const url = `${this.baseUrl}/groups/${encodeURIComponent(slug)}/icon`;
    const response = await fetch(url, { method: 'POST', credentials: 'include', body: form });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async uploadGroupBanner(slug: string, file: File): Promise<{ banner_url: string }> {
    const form = new FormData();
    form.append('file', file);
    const url = `${this.baseUrl}/groups/${encodeURIComponent(slug)}/banner`;
    const response = await fetch(url, { method: 'POST', credentials: 'include', body: form });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async deleteGroupIcon(slug: string): Promise<void> {
    return this.request<void>(`/groups/${encodeURIComponent(slug)}/icon`, { method: 'DELETE' });
  }

  async deleteGroupBanner(slug: string): Promise<void> {
    return this.request<void>(`/groups/${encodeURIComponent(slug)}/banner`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
