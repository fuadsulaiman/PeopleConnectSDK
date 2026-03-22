/**
 * PeopleConnect SDK
 *
 * A comprehensive TypeScript SDK for interacting with the PeopleConnect API.
 * Supports authentication, messaging, calls, contacts, media, and more.
 *
 * @example
 * ```typescript
 * import { PeopleConnectSDK } from '@peopleconnect/sdk';
 *
 * const sdk = new PeopleConnectSDK({
 *   baseUrl: 'https://api.example.com/api',
 *   onTokenRefresh: (tokens) => localStorage.setItem('tokens', JSON.stringify(tokens)),
 * });
 *
 * // Login
 * const { user, accessToken } = await sdk.auth.login({
 *   username: 'john',
 *   password: 'password123',
 * });
 *
 * // Set tokens
 * sdk.setTokens({ accessToken, refreshToken });
 *
 * // Get conversations
 * const conversations = await sdk.conversations.list();
 * ```
 */

import type * as Types from './types';

export * from './types';

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (tokens: Types.AuthTokens) => void;
  private onUnauthorized?: () => void;
  private onError?: (error: Types.ApiError) => void;
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: Types.SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout || 30000;
    this.onTokenRefresh = config.onTokenRefresh;
    this.onUnauthorized = config.onUnauthorized;
    this.onError = config.onError;
  }

  setTokens(tokens: Types.AuthTokens | null): void {
    this.accessToken = tokens?.accessToken || null;
    this.refreshToken = tokens?.refreshToken || null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    const fullUrl = new URL(url.startsWith('http') ? url : `${this.baseUrl}${url}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }
    return fullUrl.toString();
  }

  private async request<T>(config: RequestConfig): Promise<T> {
    const { method, url, data, params, headers = {} } = config;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let body: BodyInit | undefined;
    if (data) {
      // Check for FormData - use constructor name for React Native compatibility
      const isFormData = data instanceof FormData || 
        (data && typeof data === 'object' && data.constructor && data.constructor.name === 'FormData');
      
      if (isFormData) {
        body = data as FormData;
        // Don't set Content-Type for FormData, let the runtime set it with boundary
      } else {
        requestHeaders['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fullUrl = this.buildUrl(url, params);
      console.log('[HTTP] Request:', method, fullUrl);
      console.log('[HTTP] Headers:', JSON.stringify(requestHeaders));
      console.log('[HTTP] Body type:', body ? (body instanceof FormData ? 'FormData' : typeof body) : 'none');
      
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body,
        signal: controller.signal,
      });
      
      console.log('[HTTP] Response status:', response.status);

      clearTimeout(timeoutId);

      if (response.status === 401 && this.refreshToken && !url.includes('/auth/refresh')) {
        return this.handleTokenRefresh<T>(config);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: Types.ApiError = {
          message: errorData.message || `HTTP ${response.status}`,
          code: errorData.code,
          details: errorData.details,
        };
        this.onError?.(error);
        throw new Error(error.message);
      }

      const responseData = await response.json().catch(() => ({}));

      // Unwrap API response if wrapped
      if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
        return responseData.data as T;
      }

      return responseData as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private async handleTokenRefresh<T>(config: RequestConfig): Promise<T> {
    if (this.isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        this.refreshQueue.push({
          resolve: (token: string) => {
            this.accessToken = token;
            this.request<T>(config).then(resolve).catch(reject);
          },
          reject,
        });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await this.request<Types.LoginResponse>({
        method: 'POST',
        url: '/auth/refresh',
        data: { refreshToken: this.refreshToken },
      });

      this.accessToken = response.accessToken;
      this.refreshToken = response.refreshToken;
      this.onTokenRefresh?.({ accessToken: response.accessToken, refreshToken: response.refreshToken });

      this.refreshQueue.forEach(({ resolve }) => resolve(response.accessToken));
      this.refreshQueue = [];

      return this.request<T>(config);
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      this.refreshQueue = [];
      this.onUnauthorized?.();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async get<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>({ method: 'GET', url, params });
  }

  async post<T>(url: string, data?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, params });
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  async delete<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>({ method: 'DELETE', url, params });
  }

  async upload<T>(url: string, formData: FormData, _onProgress?: (progress: Types.UploadProgress) => void): Promise<T> {
    return this.request<T>({ method: 'POST', url, data: formData });
  }
}

// ============================================================================
// Auth Service
// ============================================================================

class AuthService {
  constructor(private http: HttpClient) {}

  /**
   * Login with username and password
   */
  async login(data: Types.LoginRequest): Promise<Types.LoginResponse> {
    const response = await this.http.post<Types.LoginResponse>('/auth/login', {
      ...data,
      portal: data.portal || 'user',
    });
    this.http.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    return response;
  }

  /**
   * Register a new user account
   */
  async register(data: Types.RegisterRequest): Promise<Types.LoginResponse> {
    const response = await this.http.post<Types.LoginResponse>('/auth/register', data);
    this.http.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    return response;
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    await this.http.post('/auth/logout');
    this.http.setTokens(null);
  }

  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken: string): Promise<Types.LoginResponse> {
    return this.http.post<Types.LoginResponse>('/auth/refresh', { refreshToken });
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<Types.UserProfile> {
    return this.http.get<Types.UserProfile>('/auth/me');
  }

  /**
   * Check if a username is available
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`/auth/check-username/${username}`);
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(data: Types.TwoFactorVerifyRequest): Promise<Types.LoginResponse> {
    return this.http.post<Types.LoginResponse>('/auth/2fa/verify', data);
  }

  /**
   * Request password reset email
   */
  async forgotPassword(identifier: string): Promise<void> {
    await this.http.post('/auth/forgot-password', { identifier });
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: Types.ResetPasswordRequest): Promise<void> {
    await this.http.post('/auth/reset-password', data);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(data: Types.ChangePasswordRequest): Promise<void> {
    await this.http.post('/auth/change-password', data);
  }

  /**
   * Delete the user's account
   */
  async deleteAccount(): Promise<void> {
    await this.http.delete('/auth/account');
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    await this.http.post('/auth/verify-email', { token });
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<void> {
    await this.http.post('/auth/resend-verification', { email });
  }
}

// ============================================================================
// User Service
// ============================================================================

class UserService {
  constructor(private http: HttpClient) {}

  /**
   * Get user profile
   */
  async getProfile(): Promise<Types.UserProfile> {
    return this.http.get<Types.UserProfile>('/auth/me');
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<Types.User> {
    return this.http.get<Types.User>(`/users/${userId}`);
  }

  /**
   * Upload user avatar
   * @param file - File object (web) or object with uri, type, name (React Native)
   */
  async uploadAvatar(file: File | { uri: string; type?: string; name?: string }): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    // Check if it's a React Native file object (has uri property)
    if ('uri' in file && typeof (file as any).uri === 'string') {
      // React Native format
      const fileObj = {
        uri: (file as any).uri,
        type: (file as any).type || 'image/jpeg',
        name: (file as any).name || 'avatar.jpg',
      };
      console.log('[SDK] Uploading avatar (RN format):', fileObj);
      formData.append('file', fileObj as any);
    } else {
      // Web File object
      console.log('[SDK] Uploading avatar (Web format)');
      formData.append('file', file as File);
    }
    console.log('[SDK] Calling upload endpoint...');
    const response = await this.http.upload<{ url: string }>('/auth/avatar', formData);
    console.log('[SDK] Upload response:', response);
    return { avatarUrl: response.url };
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<void> {
    await this.http.delete('/auth/avatar');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Types.UpdateProfileRequest): Promise<Types.User> {
    return this.http.put<Types.User>('/auth/profile', data);
  }
}

// ============================================================================
// Conversations Service
// ============================================================================

class ConversationsService {
  constructor(private http: HttpClient) {}

  /**
   * List all conversations
   */
  async list(params?: Types.PaginationParams & { type?: string }): Promise<Types.PaginatedResponse<Types.Conversation>> {
    return this.http.get<Types.PaginatedResponse<Types.Conversation>>('/conversations', params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get a conversation by ID
   */
  async get(id: string): Promise<Types.ConversationDetail> {
    return this.http.get<Types.ConversationDetail>(`/conversations/${id}`);
  }

  /**
   * Create a direct message conversation
   */
  async createDM(data: Types.CreateDMRequest): Promise<Types.Conversation> {
    return this.http.post<Types.Conversation>('/conversations/dm', data);
  }

  /**
   * Create a chatroom
   */
  async createChatroom(data: Types.CreateChatroomRequest): Promise<Types.Conversation> {
    return this.http.post<Types.Conversation>('/conversations/chatroom', data);
  }

  /**
   * Update a chatroom
   */
  async update(id: string, data: Types.UpdateChatroomRequest): Promise<Types.Conversation> {
    return this.http.put<Types.Conversation>(`/conversations/${id}`, data);
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/conversations/${id}`);
  }

  /**
   * Leave a conversation
   */
  async leave(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/leave`);
  }

  /**
   * Add participants to a chatroom
   */
  async addParticipants(id: string, userIds: string[]): Promise<void> {
    await this.http.post(`/conversations/${id}/participants`, { userIds });
  }

  /**
   * Remove a participant from a chatroom
   */
  async removeParticipant(id: string, userId: string): Promise<void> {
    await this.http.delete(`/conversations/${id}/participants/${userId}`);
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(id: string, userId: string, role: Types.ParticipantRole): Promise<void> {
    await this.http.patch(`/conversations/${id}/participants/${userId}/role`, { role });
  }

  /**
   * Get conversation members
   */
  async getMembers(id: string): Promise<Types.ConversationMember[]> {
    return this.http.get<Types.ConversationMember[]>(`/conversations/${id}/members`);
  }

  /**
   * Mute a conversation
   */
  async mute(id: string, until?: string): Promise<void> {
    await this.http.post(`/conversations/${id}/mute`, { until });
  }

  /**
   * Unmute a conversation
   */
  async unmute(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/unmute`);
  }

  /**
   * Archive a conversation
   */
  async archive(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/archive`);
  }

  /**
   * Unarchive a conversation
   */
  async unarchive(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/unarchive`);
  }

  /**
   * Clear conversation messages
   */
  async clear(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/clear`);
  }

  /**
   * Pin a conversation
   */
  async pin(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/pin`);
  }

  /**
   * Unpin a conversation
   */
  async unpin(id: string): Promise<void> {
    await this.http.post(`/conversations/${id}/unpin`);
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(id: string, lastMessageId?: string): Promise<void> {
    await this.http.post(`/conversations/${id}/read`, { lastMessageId });
  }

  /**
   * Upload chatroom avatar
   */
  async uploadAvatar(id: string, file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.upload<{ avatarUrl: string }>(`/conversations/${id}/avatar`, formData);
  }
}

// ============================================================================
// Messages Service
// ============================================================================

class MessagesService {
  constructor(private http: HttpClient) {}

  /**
   * Get messages in a conversation
   */
  async list(conversationId: string, params?: { limit?: number; before?: string; after?: string }): Promise<{ items: Types.Message[]; hasMore: boolean }> {
    return this.http.get<{ items: Types.Message[]; hasMore: boolean }>(`/conversations/${conversationId}/messages`, params);
  }

  /**
   * Get a single message
   */
  async get(conversationId: string, messageId: string): Promise<Types.Message> {
    return this.http.get<Types.Message>(`/conversations/${conversationId}/messages/${messageId}`);
  }

  /**
   * Send a message
   */
  async send(conversationId: string, data: Types.SendMessageRequest): Promise<Types.Message> {
    return this.http.post<Types.Message>(`/conversations/${conversationId}/messages`, data);
  }

  /**
   * Edit a message
   */
  async edit(conversationId: string, messageId: string, data: Types.EditMessageRequest): Promise<Types.Message> {
    return this.http.put<Types.Message>(`/conversations/${conversationId}/messages/${messageId}`, data);
  }

  /**
   * Delete a message
   */
  async delete(conversationId: string, messageId: string, forEveryone: boolean = false): Promise<void> {
    await this.http.delete(`/conversations/${conversationId}/messages/${messageId}`, { forEveryone });
  }

  /**
   * React to a message
   */
  async react(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await this.http.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await this.http.delete(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  }

  /**
   * Forward a message to other conversations
   */
  async forward(conversationId: string, messageId: string, targetConversationIds: string[]): Promise<void> {
    await this.http.post(`/conversations/${conversationId}/messages/${messageId}/forward`, {
      conversationIds: targetConversationIds,
    });
  }
}

// ============================================================================
// Contacts Service
// ============================================================================

class ContactsService {
  constructor(private http: HttpClient) {}

  /**
   * List contacts
   */
  async list(params?: Types.PaginationParams & { search?: string }): Promise<Types.PaginatedResponse<Types.Contact>> {
    return this.http.get<Types.PaginatedResponse<Types.Contact>>('/contacts', params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get contact requests (received and sent)
   */
  async getRequests(): Promise<Types.ContactRequestList> {
    return this.http.get<Types.ContactRequestList>('/contacts/requests');
  }

  /**
   * Search for users to add as contacts
   */
  async searchUsers(query: string, limit: number = 20): Promise<Types.UserSearchResult[]> {
    return this.http.get<Types.UserSearchResult[]>('/contacts/search', { query, limit });
  }

  /**
   * Send a contact request
   */
  async sendRequest(userId: string, nickname?: string): Promise<Types.Contact> {
    return this.http.post<Types.Contact>('/contacts', { UserId: userId, Nickname: nickname });
  }

  /**
   * Accept a contact request
   */
  async acceptRequest(contactId: string): Promise<Types.Contact> {
    return this.http.post<Types.Contact>(`/contacts/requests/${contactId}/accept`);
  }

  /**
   * Reject a contact request
   */
  async rejectRequest(contactId: string): Promise<void> {
    await this.http.post(`/contacts/requests/${contactId}/reject`);
  }

  /**
   * Update contact nickname
   */
  async update(contactId: string, nickname?: string): Promise<Types.Contact> {
    return this.http.put<Types.Contact>(`/contacts/${contactId}`, { Nickname: nickname });
  }

  /**
   * Remove a contact
   */
  async remove(contactId: string): Promise<void> {
    await this.http.delete(`/contacts/${contactId}`);
  }

  /**
   * Block a user
   */
  async block(userId: string): Promise<void> {
    await this.http.post(`/contacts/block/${userId}`);
  }

  /**
   * Unblock a user
   */
  async unblock(userId: string): Promise<void> {
    await this.http.delete(`/contacts/block/${userId}`);
  }

  /**
   * Get blocked contacts
   */
  async getBlocked(): Promise<Types.BlockedContact[]> {
    return this.http.get<Types.BlockedContact[]>('/contacts/blocked');
  }
}

// ============================================================================
// Calls Service
// ============================================================================

class CallsService {
  constructor(private http: HttpClient) {}

  /**
   * Initiate a call
   */
  async initiate(data: Types.InitiateCallRequest): Promise<Types.CallResponse> {
    return this.http.post<Types.CallResponse>('/calls/initiate', data);
  }

  /**
   * Accept a call
   */
  async accept(callId: string): Promise<Types.CallResponse> {
    return this.http.post<Types.CallResponse>(`/calls/${callId}/accept`);
  }

  /**
   * Reject a call
   */
  async reject(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/reject`);
  }

  /**
   * End a call
   */
  async end(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/end`);
  }

  /**
   * Get call history
   */
  async getHistory(params?: Types.PaginationParams): Promise<Types.PaginatedResponse<Types.CallHistoryItem>> {
    return this.http.get<Types.PaginatedResponse<Types.CallHistoryItem>>('/calls/history', params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get call details
   */
  async get(callId: string): Promise<Types.CallHistoryItem> {
    return this.http.get<Types.CallHistoryItem>(`/calls/${callId}`);
  }

  /**
   * Delete call record
   */
  async delete(callId: string): Promise<void> {
    await this.http.delete(`/calls/${callId}`);
  }

  /**
   * Get ICE servers for WebRTC
   */
  async getIceServers(): Promise<Types.IceServer[]> {
    return this.http.get<Types.IceServer[]>('/calls/ice-servers');
  }

  /**
   * Get LiveKit token for group calls
   */
  async getLiveKitToken(conversationId: string): Promise<Types.LiveKitTokenResponse> {
    return this.http.post<Types.LiveKitTokenResponse>('/calls/livekit/token', { conversationId });
  }
}

// ============================================================================
// Media Service
// ============================================================================

class MediaService {
  constructor(private http: HttpClient, private baseUrl: string) {}

  /**
   * Upload a file
   */
  async upload(file: File, conversationId?: string, _onProgress?: (progress: number) => void): Promise<Types.UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `/media/upload${conversationId ? `?conversationId=${conversationId}` : ''}`;
    return this.http.upload<Types.UploadResponse>(url, formData);
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: File[], conversationId?: string): Promise<{ uploaded: Types.UploadResponse[]; errors: string[] }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const url = `/media/upload/multiple${conversationId ? `?conversationId=${conversationId}` : ''}`;
    return this.http.upload<{ uploaded: Types.UploadResponse[]; errors: string[] }>(url, formData);
  }

  /**
   * Upload a voice message
   */
  async uploadVoice(audioBlob: Blob, conversationId: string, duration: number): Promise<Types.UploadResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-message.webm');

    return this.http.upload<Types.UploadResponse>(
      `/media/voice?conversationId=${conversationId}&durationSeconds=${duration}`,
      formData
    );
  }

  /**
   * Get file info
   */
  async get(fileId: string): Promise<Types.UploadResponse> {
    return this.http.get<Types.UploadResponse>(`/media/${fileId}`);
  }

  /**
   * Delete a file
   */
  async delete(fileId: string): Promise<void> {
    await this.http.delete(`/media/${fileId}`);
  }

  /**
   * Get media in a conversation
   */
  async getConversationMedia(conversationId: string, params?: Types.PaginationParams & { type?: string }): Promise<Types.PaginatedResponse<Types.Attachment>> {
    return this.http.get<Types.PaginatedResponse<Types.Attachment>>(`/media/conversation/${conversationId}`, params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get all shared content (media, links, documents) for a conversation
   * Supports both regular conversations and broadcast channels
   */
  async getConversationSharedContent(
    conversationId: string,
    params?: Types.SharedContentParams
  ): Promise<Types.ConversationSharedContent> {
    return this.http.get<Types.ConversationSharedContent>(
      `/media/conversation/${conversationId}/shared`,
      params as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Get file download URL
   */
  getDownloadUrl(fileId: string, token?: string): string {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/download?token=${accessToken}`;
  }

  /**
   * Get file thumbnail URL
   */
  getThumbnailUrl(fileId: string, token?: string): string {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/thumbnail?token=${accessToken}`;
  }

  /**
   * Get file stream URL
   */
  getStreamUrl(fileId: string, token?: string): string {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/stream?token=${accessToken}`;
  }
}

// ============================================================================
// Notifications Service
// ============================================================================

class NotificationsService {
  constructor(private http: HttpClient) {}

  /**
   * Get notifications
   */
  async list(params?: Types.PaginationParams): Promise<Types.PaginatedResponse<Types.Notification> & { unreadCount: number }> {
    return this.http.get<Types.PaginatedResponse<Types.Notification> & { unreadCount: number }>('/notifications', params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await this.http.get<{ total: number; unread: number }>('/notifications/count');
    return response.unread;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.http.post(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await this.http.post('/notifications/read-all');
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    await this.http.delete(`/notifications/${notificationId}`);
  }
}

// ============================================================================
// Broadcasts Service
// ============================================================================

class BroadcastsService {
  constructor(private http: HttpClient) {}

  /**
   * Get all broadcast channels
   */
  async getChannels(): Promise<Types.BroadcastChannel[]> {
    const response = await this.http.get<Types.PaginatedResponse<Types.BroadcastChannel>>('/broadcasts/channels');
    return response.items || [];
  }

  /**
   * Get subscribed channels
   */
  async getSubscriptions(): Promise<Types.BroadcastChannel[]> {
    return this.http.get<Types.BroadcastChannel[]>('/broadcasts/channels/subscribed');
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channelId: string): Promise<void> {
    await this.http.post(`/broadcasts/channels/${channelId}/subscribe`);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelId: string): Promise<void> {
    await this.http.delete(`/broadcasts/channels/${channelId}/subscribe`);
  }

  /**
   * Get channel messages
   */
  async getMessages(channelId: string, limit: number = 50): Promise<Types.PaginatedResponse<Types.BroadcastMessage>> {
    const messages = await this.http.get<Types.BroadcastMessage[]>(`/broadcasts/channels/${channelId}/messages`, { limit });
    return { items: messages, totalCount: messages.length, page: 1, pageSize: limit };
  }

  /**
   * Get feed from all subscribed channels
   */
  async getFeed(limit: number = 50): Promise<Types.PaginatedResponse<Types.BroadcastMessage>> {
    const messages = await this.http.get<Types.BroadcastMessage[]>('/broadcasts/messages/feed', { limit });
    return { items: messages, totalCount: messages.length, page: 1, pageSize: limit };
  }
}

// ============================================================================
// Announcements Service
// ============================================================================

class AnnouncementsService {
  constructor(private http: HttpClient) {}

  /**
   * Get announcements
   */
  async list(unreadOnly: boolean = false): Promise<Types.Announcement[]> {
    return this.http.get<Types.Announcement[]>('/announcements/my', { unreadOnly });
  }

  /**
   * Mark announcement as read
   */
  async markAsRead(announcementId: string): Promise<void> {
    await this.http.post(`/announcements/${announcementId}/read`);
  }

  /**
   * Dismiss announcement
   */
  async dismiss(announcementId: string): Promise<void> {
    await this.http.post(`/announcements/${announcementId}/dismiss`);
  }
}

// ============================================================================
// Search Service
// ============================================================================

class SearchService {
  constructor(private http: HttpClient) {}

  /**
   * Global search across users, conversations, and messages
   */
  async search(request: Types.GlobalSearchRequest): Promise<Types.SearchResult> {
    return this.http.get<Types.SearchResult>('/search', {
      q: request.query,
      type: request.types?.[0],
      limit: request.limit,
    });
  }

  /**
   * Search within a conversation
   */
  async searchInConversation(request: Types.ConversationSearchRequest): Promise<Types.MessageSearchResult[]> {
    return this.http.get<Types.MessageSearchResult[]>(`/search/conversations/${request.conversationId}`, {
      q: request.query,
      limit: request.limit,
      before: request.before,
      after: request.after,
    });
  }

  /**
   * Search users only
   */
  async searchUsers(query: string, limit: number = 20): Promise<Types.UserSearchResult[]> {
    const result = await this.search({ query, types: ['users'], limit });
    return result.users || [];
  }
}

// ============================================================================
// Devices Service
// ============================================================================

class DevicesService {
  constructor(private http: HttpClient) {}

  /**
   * Get all devices/sessions
   */
  async list(): Promise<Types.Device[]> {
    return this.http.get<Types.Device[]>('/auth/sessions');
  }

  /**
   * Register a device for push notifications
   */
  async register(data: Types.RegisterDeviceRequest): Promise<void> {
    await this.http.post('/devices/register', {
      DeviceToken: data.token,
      Platform: data.platform,
      DeviceName: data.deviceName,
    });
  }

  /**
   * Remove a device/session
   */
  async remove(deviceId: string): Promise<void> {
    await this.http.delete(`/auth/sessions/${deviceId}`);
  }

  /**
   * Remove all other sessions
   */
  async removeAllOthers(): Promise<void> {
    await this.http.delete('/auth/sessions');
  }
}

// ============================================================================
// Two-Factor Service
// ============================================================================

class TwoFactorService {
  constructor(private http: HttpClient) {}

  /**
   * Enable two-factor authentication
   */
  async enable(password: string): Promise<Types.TwoFactorSetupResponse> {
    return this.http.post<Types.TwoFactorSetupResponse>('/auth/2fa/enable', { password });
  }

  /**
   * Disable two-factor authentication
   */
  async disable(password: string, code: string): Promise<void> {
    await this.http.post('/auth/2fa/disable', { password, code });
  }

  /**
   * Verify two-factor code
   */
  async verify(code: string): Promise<void> {
    await this.http.post('/auth/2fa/verify', { code });
  }

  /**
   * Get backup codes
   */
  async getBackupCodes(): Promise<Types.BackupCodesResponse> {
    return this.http.get<Types.BackupCodesResponse>('/auth/2fa/backup-codes');
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(password: string): Promise<Types.BackupCodesResponse> {
    return this.http.post<Types.BackupCodesResponse>('/auth/2fa/backup-codes/regenerate', { password });
  }
}

// ============================================================================
// Reports Service
// ============================================================================

class ReportsService {
  constructor(private http: HttpClient) {}

  /**
   * Create a report
   */
  async create(data: Types.CreateReportRequest): Promise<Types.Report> {
    return this.http.post<Types.Report>('/reports', data);
  }
}

// ============================================================================
// Main SDK Class
// ============================================================================

export class PeopleConnectSDK {
  private http: HttpClient;

  public readonly auth: AuthService;
  public readonly users: UserService;
  public readonly conversations: ConversationsService;
  public readonly messages: MessagesService;
  public readonly contacts: ContactsService;
  public readonly calls: CallsService;
  public readonly media: MediaService;
  public readonly notifications: NotificationsService;
  public readonly broadcasts: BroadcastsService;
  public readonly announcements: AnnouncementsService;
  public readonly search: SearchService;
  public readonly devices: DevicesService;
  public readonly twoFactor: TwoFactorService;
  public readonly reports: ReportsService;

  constructor(config: Types.SDKConfig) {
    this.http = new HttpClient(config);

    this.auth = new AuthService(this.http);
    this.users = new UserService(this.http);
    this.conversations = new ConversationsService(this.http);
    this.messages = new MessagesService(this.http);
    this.contacts = new ContactsService(this.http);
    this.calls = new CallsService(this.http);
    this.media = new MediaService(this.http, config.baseUrl);
    this.notifications = new NotificationsService(this.http);
    this.broadcasts = new BroadcastsService(this.http);
    this.announcements = new AnnouncementsService(this.http);
    this.search = new SearchService(this.http);
    this.devices = new DevicesService(this.http);
    this.twoFactor = new TwoFactorService(this.http);
    this.reports = new ReportsService(this.http);
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: Types.AuthTokens): void {
    this.http.setTokens(tokens);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.http.setTokens(null);
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.http.getAccessToken();
  }
}

// Default export
export default PeopleConnectSDK;
