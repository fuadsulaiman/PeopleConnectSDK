import "./chunk-WBQAMGXK.mjs";

// src/index.ts
var HttpClient = class {
  constructor(config) {
    this.accessToken = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshQueue = [];
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeout = config.timeout || 3e4;
    this.onTokenRefresh = config.onTokenRefresh;
    this.onUnauthorized = config.onUnauthorized;
    this.onError = config.onError;
  }
  setTokens(tokens) {
    this.accessToken = tokens?.accessToken || null;
    this.refreshToken = tokens?.refreshToken || null;
  }
  getAccessToken() {
    return this.accessToken;
  }
  buildUrl(url, params) {
    const fullUrl = new URL(url.startsWith("http") ? url : `${this.baseUrl}${url}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== void 0) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }
    return fullUrl.toString();
  }
  async request(config) {
    const { method, url, data, params, headers = {} } = config;
    const requestHeaders = {
      ...headers
    };
    if (this.accessToken) {
      requestHeaders["Authorization"] = `Bearer ${this.accessToken}`;
    }
    let body;
    if (data) {
      const isFormData = data instanceof FormData || data && typeof data === "object" && data.constructor && data.constructor.name === "FormData";
      if (isFormData) {
        body = data;
      } else {
        requestHeaders["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const fullUrl = this.buildUrl(url, params);
      console.log("[HTTP] Request:", method, fullUrl);
      console.log("[HTTP] Headers:", JSON.stringify(requestHeaders));
      console.log("[HTTP] Body type:", body ? body instanceof FormData ? "FormData" : typeof body : "none");
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body,
        signal: controller.signal
      });
      console.log("[HTTP] Response status:", response.status);
      clearTimeout(timeoutId);
      if (response.status === 401 && this.refreshToken && !url.includes("/auth/refresh")) {
        return this.handleTokenRefresh(config);
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          message: errorData.message || `HTTP ${response.status}`,
          code: errorData.code,
          details: errorData.details
        };
        this.onError?.(error);
        throw new Error(error.message);
      }
      const responseData = await response.json().catch(() => ({}));
      if (responseData && typeof responseData === "object" && "success" in responseData && "data" in responseData) {
        return responseData.data;
      }
      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }
  async handleTokenRefresh(config) {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({
          resolve: (token) => {
            this.accessToken = token;
            this.request(config).then(resolve).catch(reject);
          },
          reject
        });
      });
    }
    this.isRefreshing = true;
    try {
      const response = await this.request({
        method: "POST",
        url: "/auth/refresh",
        data: { refreshToken: this.refreshToken }
      });
      this.accessToken = response.accessToken;
      this.refreshToken = response.refreshToken;
      this.onTokenRefresh?.({ accessToken: response.accessToken, refreshToken: response.refreshToken });
      this.refreshQueue.forEach(({ resolve }) => resolve(response.accessToken));
      this.refreshQueue = [];
      return this.request(config);
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error));
      this.refreshQueue = [];
      this.onUnauthorized?.();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
  async get(url, params) {
    return this.request({ method: "GET", url, params });
  }
  async post(url, data, params) {
    return this.request({ method: "POST", url, data, params });
  }
  async put(url, data) {
    return this.request({ method: "PUT", url, data });
  }
  async patch(url, data) {
    return this.request({ method: "PATCH", url, data });
  }
  async delete(url, params) {
    return this.request({ method: "DELETE", url, params });
  }
  async upload(url, formData, _onProgress) {
    return this.request({ method: "POST", url, data: formData });
  }
};
var AuthService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Login with username and password
   */
  async login(data) {
    const response = await this.http.post("/auth/login", {
      ...data,
      portal: data.portal || "user"
    });
    this.http.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    return response;
  }
  /**
   * Register a new user account
   */
  async register(data) {
    const response = await this.http.post("/auth/register", data);
    this.http.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    return response;
  }
  /**
   * Logout the current user
   */
  async logout() {
    await this.http.post("/auth/logout");
    this.http.setTokens(null);
  }
  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken) {
    return this.http.post("/auth/refresh", { refreshToken });
  }
  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    return this.http.get("/auth/me");
  }
  /**
   * Check if a username is available
   */
  async checkUsername(username) {
    return this.http.get("/auth/check-username", { username });
  }
  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(data) {
    return this.http.post("/two-factor/verify", data);
  }
  /**
   * Request password reset email
   */
  async forgotPassword(identifier) {
    await this.http.post("/auth/forgot-password", { identifier });
  }
  /**
   * Reset password with token
   */
  async resetPassword(data) {
    await this.http.post("/auth/reset-password", data);
  }
  /**
   * Change password for authenticated user
   */
  async changePassword(data) {
    await this.http.post("/auth/change-password", data);
  }
  /**
   * Delete the user's account
   */
  async deleteAccount() {
    await this.http.delete("/auth/account");
  }
  /**
   * Verify email address
   */
  async verifyEmail(token) {
    await this.http.post("/auth/verify-email", { token });
  }
  /**
   * Resend verification email
   */
  async resendVerification(email) {
    await this.http.post("/auth/resend-verification", { email });
  }
};
var UserService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get user profile
   */
  async getProfile() {
    return this.http.get("/auth/me");
  }
  /**
   * Get a user by ID
   */
  async getUser(userId) {
    return this.http.get(`/users/${userId}`);
  }
  /**
   * Upload user avatar
   * @param file - File object (web) or object with uri, type, name (React Native)
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    if ("uri" in file && typeof file.uri === "string") {
      const fileObj = {
        uri: file.uri,
        type: file.type || "image/jpeg",
        name: file.name || "avatar.jpg"
      };
      console.log("[SDK] Uploading avatar (RN format):", fileObj);
      formData.append("file", fileObj);
    } else {
      console.log("[SDK] Uploading avatar (Web format)");
      formData.append("file", file);
    }
    console.log("[SDK] Calling upload endpoint...");
    const response = await this.http.upload("/auth/avatar", formData);
    console.log("[SDK] Upload response:", response);
    return { avatarUrl: response.url };
  }
  /**
   * Delete user avatar
   */
  async deleteAvatar() {
    await this.http.delete("/auth/avatar");
  }
  /**
   * Update user profile
   */
  async updateProfile(data) {
    return this.http.put("/auth/profile", data);
  }
};
var ConversationsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List all conversations
   */
  async list(params) {
    return this.http.get("/conversations", params);
  }
  /**
   * Get a conversation by ID
   */
  async get(id) {
    return this.http.get(`/conversations/${id}`);
  }
  /**
   * Create a direct message conversation
   */
  async createDM(data) {
    return this.http.post("/conversations/dm", data);
  }
  /**
   * Create a chatroom
   */
  async createChatroom(data) {
    return this.http.post("/conversations/chatroom", data);
  }
  /**
   * Update a chatroom
   */
  async update(id, data) {
    return this.http.put(`/conversations/${id}`, data);
  }
  /**
   * Delete a conversation
   */
  async delete(id) {
    await this.http.delete(`/conversations/${id}`);
  }
  /**
   * Leave a conversation
   */
  async leave(id) {
    await this.http.post(`/conversations/${id}/leave`);
  }
  /**
   * Add participants to a chatroom
   */
  async addParticipants(id, userIds) {
    await this.http.post(`/conversations/${id}/participants`, { userIds });
  }
  /**
   * Remove a participant from a chatroom
   */
  async removeParticipant(id, userId) {
    await this.http.delete(`/conversations/${id}/participants/${userId}`);
  }
  /**
   * Update participant role
   */
  async updateParticipantRole(id, userId, role) {
    await this.http.patch(`/conversations/${id}/participants/${userId}/role`, { role });
  }
  /**
   * Get conversation members
   */
  async getMembers(id) {
    return this.http.get(`/conversations/${id}/members`);
  }
  /**
   * Mute a conversation
   */
  async mute(id, until) {
    await this.http.post(`/conversations/${id}/mute`, { until });
  }
  /**
   * Unmute a conversation
   */
  async unmute(id) {
    await this.http.post(`/conversations/${id}/unmute`);
  }
  /**
   * Archive a conversation
   */
  async archive(id) {
    await this.http.post(`/conversations/${id}/archive`);
  }
  /**
   * Unarchive a conversation
   */
  async unarchive(id) {
    await this.http.post(`/conversations/${id}/unarchive`);
  }
  /**
   * Clear conversation messages
   */
  async clear(id) {
    await this.http.post(`/conversations/${id}/clear`);
  }
  /**
   * Pin a conversation
   */
  async pin(id) {
    await this.http.post(`/conversations/${id}/pin`);
  }
  /**
   * Unpin a conversation
   */
  async unpin(id) {
    await this.http.post(`/conversations/${id}/unpin`);
  }
  /**
   * Mark conversation as read
   */
  async markAsRead(id, lastMessageId) {
    await this.http.post(`/conversations/${id}/read`, { lastMessageId });
  }
  /**
   * Upload chatroom avatar
   */
  async uploadAvatar(id, file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.upload(`/conversations/${id}/avatar`, formData);
  }
};
var MessagesService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get messages in a conversation
   */
  async list(conversationId, params) {
    return this.http.get(`/conversations/${conversationId}/messages`, params);
  }
  /**
   * Get a single message
   */
  async get(conversationId, messageId) {
    return this.http.get(`/conversations/${conversationId}/messages/${messageId}`);
  }
  /**
   * Send a message
   */
  async send(conversationId, data) {
    return this.http.post(`/conversations/${conversationId}/messages`, data);
  }
  /**
   * Edit a message
   */
  async edit(conversationId, messageId, data) {
    return this.http.put(`/conversations/${conversationId}/messages/${messageId}`, data);
  }
  /**
   * Delete a message
   */
  async delete(conversationId, messageId, forEveryone = false) {
    await this.http.delete(`/conversations/${conversationId}/messages/${messageId}`, { forEveryone });
  }
  /**
   * React to a message
   */
  async react(conversationId, messageId, emoji) {
    await this.http.post(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  }
  /**
   * Remove reaction from a message
   */
  async removeReaction(conversationId, messageId, emoji) {
    await this.http.delete(`/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
  }
  /**
   * Forward a message to other conversations
   */
  async forward(conversationId, messageId, targetConversationIds) {
    await this.http.post(`/conversations/${conversationId}/messages/${messageId}/forward`, {
      conversationIds: targetConversationIds
    });
  }
};
var ContactsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List contacts
   */
  async list(params) {
    return this.http.get("/contacts", params);
  }
  /**
   * Get contact requests (received and sent)
   */
  async getRequests() {
    return this.http.get("/contacts/requests");
  }
  /**
   * Search for users to add as contacts
   */
  async searchUsers(query, limit = 20) {
    return this.http.get("/contacts/search", { query, limit });
  }
  /**
   * Send a contact request
   */
  async sendRequest(userId, nickname) {
    return this.http.post("/contacts", { UserId: userId, Nickname: nickname });
  }
  /**
   * Accept a contact request
   */
  async acceptRequest(contactId) {
    return this.http.post(`/contacts/requests/${contactId}/accept`);
  }
  /**
   * Reject a contact request
   */
  async rejectRequest(contactId) {
    await this.http.post(`/contacts/requests/${contactId}/reject`);
  }
  /**
   * Update contact nickname
   */
  async update(contactId, nickname) {
    return this.http.put(`/contacts/${contactId}`, { Nickname: nickname });
  }
  /**
   * Remove a contact
   */
  async remove(contactId) {
    await this.http.delete(`/contacts/${contactId}`);
  }
  /**
   * Block a user
   */
  async block(userId) {
    await this.http.post(`/contacts/block/${userId}`);
  }
  /**
   * Unblock a user
   */
  async unblock(userId) {
    await this.http.delete(`/contacts/block/${userId}`);
  }
  /**
   * Get blocked contacts
   */
  async getBlocked() {
    return this.http.get("/contacts/blocked");
  }
};
var CallsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Initiate a call
   */
  async initiate(data) {
    return this.http.post("/calls/initiate", data);
  }
  /**
   * Accept a call
   */
  async accept(callId) {
    return this.http.post(`/calls/${callId}/accept`);
  }
  /**
   * Reject a call
   */
  async reject(callId) {
    await this.http.post(`/calls/${callId}/reject`);
  }
  /**
   * End a call
   */
  async end(callId) {
    await this.http.post(`/calls/${callId}/end`);
  }
  /**
   * Get call history
   */
  async getHistory(params) {
    return this.http.get("/calls/history", params);
  }
  /**
   * Get call details
   */
  async get(callId) {
    return this.http.get(`/calls/${callId}`);
  }
  /**
   * Delete call record
   */
  async delete(callId) {
    await this.http.delete(`/calls/${callId}`);
  }
  /**
   * Get ICE servers for WebRTC
   */
  async getIceServers() {
    return this.http.get("/calls/ice-servers");
  }
  /**
   * Get LiveKit token for group calls
   */
  async getLiveKitToken(conversationId) {
    return this.http.post("/calls/livekit/token", { conversationId });
  }
};
var MediaService = class {
  constructor(http, baseUrl) {
    this.http = http;
    this.baseUrl = baseUrl;
  }
  /**
   * Upload a file
   */
  async upload(file, conversationId, _onProgress) {
    const formData = new FormData();
    formData.append("file", file);
    const url = `/media/upload${conversationId ? `?conversationId=${conversationId}` : ""}`;
    return this.http.upload(url, formData);
  }
  /**
   * Upload multiple files
   */
  async uploadMultiple(files, conversationId) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const url = `/media/upload/multiple${conversationId ? `?conversationId=${conversationId}` : ""}`;
    return this.http.upload(url, formData);
  }
  /**
   * Upload a voice message
   */
  async uploadVoice(audioBlob, conversationId, duration) {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-message.webm");
    return this.http.upload(
      `/media/voice?conversationId=${conversationId}&durationSeconds=${duration}`,
      formData
    );
  }
  /**
   * Get file info
   */
  async get(fileId) {
    return this.http.get(`/media/${fileId}`);
  }
  /**
   * Delete a file
   */
  async delete(fileId) {
    await this.http.delete(`/media/${fileId}`);
  }
  /**
   * Get media in a conversation
   */
  async getConversationMedia(conversationId, params) {
    return this.http.get(`/media/conversation/${conversationId}`, params);
  }
  /**
   * Get all shared content (media, links, documents) for a conversation
   * Supports both regular conversations and broadcast channels
   */
  async getConversationSharedContent(conversationId, params) {
    return this.http.get(
      `/media/conversation/${conversationId}/shared`,
      params
    );
  }
  /**
   * Get file download URL
   */
  getDownloadUrl(fileId, token) {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/download?token=${accessToken}`;
  }
  /**
   * Get file thumbnail URL
   */
  getThumbnailUrl(fileId, token) {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/thumbnail?token=${accessToken}`;
  }
  /**
   * Get file stream URL
   */
  getStreamUrl(fileId, token) {
    const accessToken = token || this.http.getAccessToken();
    return `${this.baseUrl}/media/${fileId}/stream?token=${accessToken}`;
  }
};
var NotificationsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get notifications
   */
  async list(params) {
    return this.http.get("/notifications", params);
  }
  /**
   * Get unread count
   */
  async getUnreadCount() {
    const response = await this.http.get("/notifications/count");
    return response.unread;
  }
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    await this.http.post(`/notifications/${notificationId}/read`);
  }
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    await this.http.post("/notifications/read-all");
  }
  /**
   * Delete a notification
   */
  async delete(notificationId) {
    await this.http.delete(`/notifications/${notificationId}`);
  }
};
var BroadcastsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get all broadcast channels
   */
  async getChannels() {
    const response = await this.http.get("/broadcasts/channels");
    return response.items || [];
  }
  /**
   * Get subscribed channels
   */
  async getSubscriptions() {
    return this.http.get("/broadcasts/channels/subscribed");
  }
  /**
   * Subscribe to a channel
   */
  async subscribe(channelId) {
    await this.http.post(`/broadcasts/channels/${channelId}/subscribe`);
  }
  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelId) {
    await this.http.delete(`/broadcasts/channels/${channelId}/subscribe`);
  }
  /**
   * Get channel messages
   */
  async getMessages(channelId, limit = 50) {
    const messages = await this.http.get(`/broadcasts/channels/${channelId}/messages`, { limit });
    return { items: messages, totalCount: messages.length, page: 1, pageSize: limit };
  }
  /**
   * Get feed from all subscribed channels
   */
  async getFeed(limit = 50) {
    const messages = await this.http.get("/broadcasts/messages/feed", { limit });
    return { items: messages, totalCount: messages.length, page: 1, pageSize: limit };
  }
};
var AnnouncementsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get announcements
   */
  async list(unreadOnly = false) {
    return this.http.get("/announcements/my", { unreadOnly });
  }
  /**
   * Mark announcement as read
   */
  async markAsRead(announcementId) {
    await this.http.post(`/announcements/${announcementId}/read`);
  }
  /**
   * Dismiss announcement
   */
  async dismiss(announcementId) {
    await this.http.post(`/announcements/${announcementId}/dismiss`);
  }
};
var SearchService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Global search across users, conversations, and messages
   */
  async search(request) {
    return this.http.get("/search", {
      q: request.query,
      type: request.types?.[0],
      limit: request.limit
    });
  }
  /**
   * Search within a conversation
   */
  async searchInConversation(request) {
    return this.http.get(`/search/conversations/${request.conversationId}`, {
      q: request.query,
      limit: request.limit,
      before: request.before,
      after: request.after
    });
  }
  /**
   * Search users only
   */
  async searchUsers(query, limit = 20) {
    const result = await this.search({ query, types: ["users"], limit });
    return result.users || [];
  }
};
var DevicesService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get all devices/sessions
   */
  async list() {
    return this.http.get("/auth/sessions");
  }
  /**
   * Register a device for push notifications
   */
  async register(data) {
    await this.http.post("/devices/register", {
      DeviceToken: data.token,
      Platform: data.platform,
      DeviceName: data.deviceName
    });
  }
  /**
   * Remove a device/session
   */
  async remove(deviceId) {
    await this.http.delete(`/auth/sessions/${deviceId}`);
  }
  /**
   * Remove all other sessions
   */
  async removeAllOthers() {
    await this.http.delete("/auth/sessions");
  }
};
var TwoFactorService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Enable two-factor authentication
   */
  async enable(password) {
    return this.http.post("/two-factor/enable", { password });
  }
  /**
   * Disable two-factor authentication
   */
  async disable(password, code) {
    await this.http.post("/two-factor/disable", { password, code });
  }
  /**
   * Verify two-factor code
   */
  async verify(code) {
    await this.http.post("/two-factor/verify", { code });
  }
  /**
   * Get backup codes
   */
  async getBackupCodes() {
    return this.http.get("/two-factor/backup-codes");
  }
  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(password) {
    return this.http.post("/two-factor/regenerate-backup-codes", { password });
  }
};
var ReportsService = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Create a report
   */
  async create(data) {
    return this.http.post("/reports", data);
  }
};
var PeopleConnectSDK = class {
  constructor(config) {
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
  setTokens(tokens) {
    this.http.setTokens(tokens);
  }
  /**
   * Clear authentication tokens
   */
  clearTokens() {
    this.http.setTokens(null);
  }
  /**
   * Get current access token
   */
  getAccessToken() {
    return this.http.getAccessToken();
  }
};
var index_default = PeopleConnectSDK;
export {
  PeopleConnectSDK,
  index_default as default
};
