const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  created_at: string;
}

export type UnifiedSearchResult = 
  | { type: 'notebook'; data: NotebookResponse }
  | { type: 'user'; data: { username: string; display_name: string; avatar_url?: string; id: number } }
  | { type: 'group'; data: { name: string; slug: string; description?: string; icon_url?: string; id: number } };

export interface PublicProfileResponse {
  user_id: number;
  username: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio: string | null;
  published_notebook_count: number;
  likes_received_count: number;
  saved_notebook_count: number;
  group_count: number;
  created_at: string;
}

export interface PublicProfile {
  user_id: number;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  published_notebook_count: number;
  likes_received_count: number;
  saved_notebook_count: number;
  group_count: number;
  created_at: string;
}

export interface ProfileStatsResponse {
  published_notebook_count: number;
  likes_received_count: number;
  saved_notebook_count: number;
  group_count: number;
}

export interface AuthResponse {
  user_id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  banner_url?: string | null;
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

export interface NotebookPresenceResponse {
  online_viewer_count: number;
}

/** Friends & direct messages */
export interface FriendUserBrief {
  id: number;
  username: string;
  avatar_url?: string | null;
}

export interface FriendRequestRow {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: string;
  created_at: string;
  user?: FriendUserBrief | null;
}

export interface FriendRelationship {
  status: string;
  incoming_request_id?: number | null;
}

export interface ConversationListItem {
  conversation_id: number;
  other_user: FriendUserBrief;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  last_message_sender_id?: number | null;
  last_message_delivered_at?: string | null;
  last_message_read_at?: string | null;
}

export interface ChatReaction {
  user_id: number;
  emoji: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  body?: string | null;
  quoted_message_id?: number | null;
  attachment_key?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_filename?: string | null;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  reactions: ChatReaction[];
}

export interface ChatMessagesPage {
  messages: ChatMessage[];
  next_cursor?: number | null;
}

export interface ChatPresignResponse {
  upload_url: string;
  attachment_key: string;
  expires_in: number;
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

  async uploadMyBanner(file: File, cropData: { crop_x: number; crop_y: number; crop_width: number; crop_height: number }): Promise<{ banner_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('crop_x', String(Math.round(cropData.crop_x)));
    formData.append('crop_y', String(Math.round(cropData.crop_y)));
    formData.append('crop_width', String(Math.round(cropData.crop_width)));
    formData.append('crop_height', String(Math.round(cropData.crop_height)));

    const response = await fetch(`${this.baseUrl}/profiles/me/banner`, {
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

  async deleteMyBanner(): Promise<void> {
    await this.request('/profiles/me/banner', { method: 'DELETE' });
  }

  async getProfileStats(): Promise<ProfileStatsResponse> {
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

  async globalSearch(
    query: string,
    limit: number = 30
  ): Promise<{ hits: UnifiedSearchResult[]; total: number }> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    return this.request<{ hits: UnifiedSearchResult[]; total: number }>(
      `/search/global?${params.toString()}`
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

  async getNotebookPresence(notebookId: number): Promise<NotebookPresenceResponse> {
    return this.request<NotebookPresenceResponse>(`/notebooks/${notebookId}/presence`);
  }

  async postNotebookPresenceHeartbeat(
    notebookId: number,
    body?: { anonymous_id?: string }
  ): Promise<void> {
    return this.request<void>(`/notebooks/${notebookId}/presence/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  }

  async deleteNotebookPresence(notebookId: number, anonymousId?: string): Promise<void> {
    const q =
      anonymousId !== undefined && anonymousId !== ''
        ? `?anonymous_id=${encodeURIComponent(anonymousId)}`
        : '';
    return this.request<void>(`/notebooks/${notebookId}/presence${q}`, {
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

  // Friends
  async listFriends(): Promise<FriendUserBrief[]> {
    return this.request<FriendUserBrief[]>('/friends');
  }

  async listOnlineFriends(): Promise<FriendUserBrief[]> {
    return this.request<FriendUserBrief[]>('/friends/online');
  }

  async getFriendRelationship(otherUserId: number): Promise<FriendRelationship> {
    return this.request<FriendRelationship>(`/friends/relationship/${otherUserId}`);
  }

  async sendFriendRequest(addresseeId: number): Promise<FriendRequestRow> {
    return this.request<FriendRequestRow>('/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ addressee_id: addresseeId }),
    });
  }

  async listFriendRequests(direction: 'incoming' | 'outgoing'): Promise<FriendRequestRow[]> {
    return this.request<FriendRequestRow[]>(`/friends/requests?direction=${direction}`);
  }

  async acceptFriendRequest(requestId: number): Promise<void> {
    await this.request(`/friends/requests/${requestId}/accept`, { method: 'POST' });
  }

  async rejectFriendRequest(requestId: number): Promise<void> {
    await this.request(`/friends/requests/${requestId}/reject`, { method: 'POST' });
  }

  async cancelFriendRequest(requestId: number): Promise<void> {
    await this.request(`/friends/requests/${requestId}`, { method: 'DELETE' });
  }

  async removeFriend(otherUserId: number): Promise<void> {
    await this.request(`/friends/${otherUserId}`, { method: 'DELETE' });
  }

  // Conversations / chat
  async listConversations(): Promise<ConversationListItem[]> {
    return this.request<ConversationListItem[]>('/conversations');
  }

  async openDirectConversation(otherUserId: number): Promise<{ conversation_id: number }> {
    return this.request<{ conversation_id: number }>('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ other_user_id: otherUserId }),
    });
  }

  async getConversationMessages(
    conversationId: number,
    cursor?: number,
    limit?: number
  ): Promise<ChatMessagesPage> {
    const p = new URLSearchParams();
    if (cursor != null) p.set('cursor', String(cursor));
    if (limit != null) p.set('limit', String(limit));
    const q = p.toString();
    return this.request<ChatMessagesPage>(
      `/conversations/${conversationId}/messages${q ? `?${q}` : ''}`
    );
  }

  async postConversationMessage(
    conversationId: number,
    payload: {
      body?: string | null;
      quoted_message_id?: number | null;
      attachment_key?: string | null;
      attachment_mime?: string | null;
      attachment_size?: number | null;
      attachment_filename?: string | null;
    }
  ): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async presignChatAttachment(
    conversationId: number,
    payload: { filename: string; content_type: string; size_bytes: number }
  ): Promise<ChatPresignResponse> {
    return this.request<ChatPresignResponse>(
      `/conversations/${conversationId}/attachments/presign`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async uploadToPresignedUrl(
    uploadUrl: string,
    file: File,
    contentType: string
  ): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }
  }

  async addMessageReaction(messageId: number, emoji: string): Promise<ChatReaction> {
    return this.request<ChatReaction>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeMessageReaction(messageId: number, emoji: string): Promise<void> {
    const q = encodeURIComponent(emoji);
    await this.request<void>(`/messages/${messageId}/reactions?emoji=${q}`, { method: 'DELETE' });
  }

  async getUserPublicNotebooks(username: string, cursor?: string, limit: number = 20): Promise<FeedResponse> {
    const p = new URLSearchParams();
    p.set('limit', String(limit));
    if (cursor) p.set('cursor', cursor);
    const q = p.toString();
    return this.request<FeedResponse>(`/notebooks/users/${username}/public${q ? `?${q}` : ''}`);
  }

  async registerPublicKey(publicKeyJwk: string): Promise<void> {
    await this.request<unknown>('/users/me/public-key', {
      method: 'POST',
      body: JSON.stringify({ public_key: publicKeyJwk }),
    });
  }

  async getUserPublicKey(userId: number): Promise<{ user_id: number; public_key: string | null }> {
    return this.request<{ user_id: number; public_key: string | null }>(`/users/${userId}/public-key`);
  }
}

export const apiClient = new ApiClient();
