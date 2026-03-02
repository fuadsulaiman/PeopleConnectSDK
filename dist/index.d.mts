import { SDKConfig, AuthTokens, UploadProgress, LoginRequest, LoginResponse, RegisterRequest, UserProfile, TwoFactorVerifyRequest, ResetPasswordRequest, ChangePasswordRequest, User, UpdateProfileRequest, PaginationParams, PaginatedResponse, Conversation, ConversationDetail, CreateDMRequest, CreateChatroomRequest, UpdateChatroomRequest, ParticipantRole, ConversationMember, Message, SendMessageRequest, EditMessageRequest, Contact, ContactRequestList, UserSearchResult, BlockedContact, InitiateCallRequest, CallResponse, CallHistoryItem, IceServer, LiveKitTokenResponse, UploadResponse, Attachment, SharedContentParams, ConversationSharedContent, Notification, BroadcastChannel, BroadcastMessage, Announcement, GlobalSearchRequest, SearchResult, ConversationSearchRequest, MessageSearchResult, Device, RegisterDeviceRequest, TwoFactorSetupResponse, BackupCodesResponse, CreateReportRequest, Report } from './types.mjs';
export { ActiveWarning, ApiError, ApiResponse, CallDirection, CallParticipant, CallStatus, CallType, ContactStatus, ConversationParticipant, ConversationSearchResult, ConversationType, CreateInvitationRequest, DevicePlatform, FontSize, ForwardMessageRequest, Invitation, InvitationListParams, InvitationListResponse, InvitationStats, InvitationStatus, MessageStatus, MessageType, NotificationPreferences, Priority, PrivacySettings, ReactToMessageRequest, Reaction, ReportType, ResendInvitationRequest, SharedDocumentItem, SharedLinkItem, SharedMediaItem, Theme, UserPreferences, UserStatus, Visibility } from './types.mjs';

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

declare class HttpClient {
    private baseUrl;
    private timeout;
    private accessToken;
    private refreshToken;
    private onTokenRefresh?;
    private onUnauthorized?;
    private onError?;
    private isRefreshing;
    private refreshQueue;
    constructor(config: SDKConfig);
    setTokens(tokens: AuthTokens | null): void;
    getAccessToken(): string | null;
    private buildUrl;
    private request;
    private handleTokenRefresh;
    get<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    post<T>(url: string, data?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    put<T>(url: string, data?: unknown): Promise<T>;
    patch<T>(url: string, data?: unknown): Promise<T>;
    delete<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    upload<T>(url: string, formData: FormData, _onProgress?: (progress: UploadProgress) => void): Promise<T>;
}
declare class AuthService {
    private http;
    constructor(http: HttpClient);
    /**
     * Login with username and password
     */
    login(data: LoginRequest): Promise<LoginResponse>;
    /**
     * Register a new user account
     */
    register(data: RegisterRequest): Promise<LoginResponse>;
    /**
     * Logout the current user
     */
    logout(): Promise<void>;
    /**
     * Refresh the access token
     */
    refreshToken(refreshToken: string): Promise<LoginResponse>;
    /**
     * Get the current authenticated user
     */
    getCurrentUser(): Promise<UserProfile>;
    /**
     * Check if a username is available
     */
    checkUsername(username: string): Promise<{
        available: boolean;
    }>;
    /**
     * Verify two-factor authentication code
     */
    verifyTwoFactor(data: TwoFactorVerifyRequest): Promise<LoginResponse>;
    /**
     * Request password reset email
     */
    forgotPassword(identifier: string): Promise<void>;
    /**
     * Reset password with token
     */
    resetPassword(data: ResetPasswordRequest): Promise<void>;
    /**
     * Change password for authenticated user
     */
    changePassword(data: ChangePasswordRequest): Promise<void>;
    /**
     * Delete the user's account
     */
    deleteAccount(): Promise<void>;
    /**
     * Verify email address
     */
    verifyEmail(token: string): Promise<void>;
    /**
     * Resend verification email
     */
    resendVerification(email: string): Promise<void>;
}
declare class UserService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get user profile
     */
    getProfile(): Promise<UserProfile>;
    /**
     * Get a user by ID
     */
    getUser(userId: string): Promise<User>;
    /**
     * Upload user avatar
     * @param file - File object (web) or object with uri, type, name (React Native)
     */
    uploadAvatar(file: File | {
        uri: string;
        type?: string;
        name?: string;
    }): Promise<{
        avatarUrl: string;
    }>;
    /**
     * Delete user avatar
     */
    deleteAvatar(): Promise<void>;
    /**
     * Update user profile
     */
    updateProfile(data: UpdateProfileRequest): Promise<User>;
}
declare class ConversationsService {
    private http;
    constructor(http: HttpClient);
    /**
     * List all conversations
     */
    list(params?: PaginationParams & {
        type?: string;
    }): Promise<PaginatedResponse<Conversation>>;
    /**
     * Get a conversation by ID
     */
    get(id: string): Promise<ConversationDetail>;
    /**
     * Create a direct message conversation
     */
    createDM(data: CreateDMRequest): Promise<Conversation>;
    /**
     * Create a chatroom
     */
    createChatroom(data: CreateChatroomRequest): Promise<Conversation>;
    /**
     * Update a chatroom
     */
    update(id: string, data: UpdateChatroomRequest): Promise<Conversation>;
    /**
     * Delete a conversation
     */
    delete(id: string): Promise<void>;
    /**
     * Leave a conversation
     */
    leave(id: string): Promise<void>;
    /**
     * Add participants to a chatroom
     */
    addParticipants(id: string, userIds: string[]): Promise<void>;
    /**
     * Remove a participant from a chatroom
     */
    removeParticipant(id: string, userId: string): Promise<void>;
    /**
     * Update participant role
     */
    updateParticipantRole(id: string, userId: string, role: ParticipantRole): Promise<void>;
    /**
     * Get conversation members
     */
    getMembers(id: string): Promise<ConversationMember[]>;
    /**
     * Mute a conversation
     */
    mute(id: string, until?: string): Promise<void>;
    /**
     * Unmute a conversation
     */
    unmute(id: string): Promise<void>;
    /**
     * Archive a conversation
     */
    archive(id: string): Promise<void>;
    /**
     * Unarchive a conversation
     */
    unarchive(id: string): Promise<void>;
    /**
     * Clear conversation messages
     */
    clear(id: string): Promise<void>;
    /**
     * Pin a conversation
     */
    pin(id: string): Promise<void>;
    /**
     * Unpin a conversation
     */
    unpin(id: string): Promise<void>;
    /**
     * Mark conversation as read
     */
    markAsRead(id: string, lastMessageId?: string): Promise<void>;
    /**
     * Upload chatroom avatar
     */
    uploadAvatar(id: string, file: File): Promise<{
        avatarUrl: string;
    }>;
}
declare class MessagesService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get messages in a conversation
     */
    list(conversationId: string, params?: {
        limit?: number;
        before?: string;
        after?: string;
    }): Promise<{
        items: Message[];
        hasMore: boolean;
    }>;
    /**
     * Get a single message
     */
    get(conversationId: string, messageId: string): Promise<Message>;
    /**
     * Send a message
     */
    send(conversationId: string, data: SendMessageRequest): Promise<Message>;
    /**
     * Edit a message
     */
    edit(conversationId: string, messageId: string, data: EditMessageRequest): Promise<Message>;
    /**
     * Delete a message
     */
    delete(conversationId: string, messageId: string, forEveryone?: boolean): Promise<void>;
    /**
     * React to a message
     */
    react(conversationId: string, messageId: string, emoji: string): Promise<void>;
    /**
     * Remove reaction from a message
     */
    removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void>;
    /**
     * Forward a message to other conversations
     */
    forward(conversationId: string, messageId: string, targetConversationIds: string[]): Promise<void>;
}
declare class ContactsService {
    private http;
    constructor(http: HttpClient);
    /**
     * List contacts
     */
    list(params?: PaginationParams & {
        search?: string;
    }): Promise<PaginatedResponse<Contact>>;
    /**
     * Get contact requests (received and sent)
     */
    getRequests(): Promise<ContactRequestList>;
    /**
     * Search for users to add as contacts
     */
    searchUsers(query: string, limit?: number): Promise<UserSearchResult[]>;
    /**
     * Send a contact request
     */
    sendRequest(userId: string, nickname?: string): Promise<Contact>;
    /**
     * Accept a contact request
     */
    acceptRequest(contactId: string): Promise<Contact>;
    /**
     * Reject a contact request
     */
    rejectRequest(contactId: string): Promise<void>;
    /**
     * Update contact nickname
     */
    update(contactId: string, nickname?: string): Promise<Contact>;
    /**
     * Remove a contact
     */
    remove(contactId: string): Promise<void>;
    /**
     * Block a user
     */
    block(userId: string): Promise<void>;
    /**
     * Unblock a user
     */
    unblock(userId: string): Promise<void>;
    /**
     * Get blocked contacts
     */
    getBlocked(): Promise<BlockedContact[]>;
}
declare class CallsService {
    private http;
    constructor(http: HttpClient);
    /**
     * Initiate a call
     */
    initiate(data: InitiateCallRequest): Promise<CallResponse>;
    /**
     * Accept a call
     */
    accept(callId: string): Promise<CallResponse>;
    /**
     * Reject a call
     */
    reject(callId: string): Promise<void>;
    /**
     * End a call
     */
    end(callId: string): Promise<void>;
    /**
     * Get call history
     */
    getHistory(params?: PaginationParams): Promise<PaginatedResponse<CallHistoryItem>>;
    /**
     * Get call details
     */
    get(callId: string): Promise<CallHistoryItem>;
    /**
     * Delete call record
     */
    delete(callId: string): Promise<void>;
    /**
     * Get ICE servers for WebRTC
     */
    getIceServers(): Promise<IceServer[]>;
    /**
     * Get LiveKit token for group calls
     */
    getLiveKitToken(conversationId: string): Promise<LiveKitTokenResponse>;
}
declare class MediaService {
    private http;
    private baseUrl;
    constructor(http: HttpClient, baseUrl: string);
    /**
     * Upload a file
     */
    upload(file: File, conversationId?: string, _onProgress?: (progress: number) => void): Promise<UploadResponse>;
    /**
     * Upload multiple files
     */
    uploadMultiple(files: File[], conversationId?: string): Promise<{
        uploaded: UploadResponse[];
        errors: string[];
    }>;
    /**
     * Upload a voice message
     */
    uploadVoice(audioBlob: Blob, conversationId: string, duration: number): Promise<UploadResponse>;
    /**
     * Get file info
     */
    get(fileId: string): Promise<UploadResponse>;
    /**
     * Delete a file
     */
    delete(fileId: string): Promise<void>;
    /**
     * Get media in a conversation
     */
    getConversationMedia(conversationId: string, params?: PaginationParams & {
        type?: string;
    }): Promise<PaginatedResponse<Attachment>>;
    /**
     * Get all shared content (media, links, documents) for a conversation
     * Supports both regular conversations and broadcast channels
     */
    getConversationSharedContent(conversationId: string, params?: SharedContentParams): Promise<ConversationSharedContent>;
    /**
     * Get file download URL
     */
    getDownloadUrl(fileId: string, token?: string): string;
    /**
     * Get file thumbnail URL
     */
    getThumbnailUrl(fileId: string, token?: string): string;
    /**
     * Get file stream URL
     */
    getStreamUrl(fileId: string, token?: string): string;
}
declare class NotificationsService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get notifications
     */
    list(params?: PaginationParams): Promise<PaginatedResponse<Notification> & {
        unreadCount: number;
    }>;
    /**
     * Get unread count
     */
    getUnreadCount(): Promise<number>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string): Promise<void>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(): Promise<void>;
    /**
     * Delete a notification
     */
    delete(notificationId: string): Promise<void>;
}
declare class BroadcastsService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get all broadcast channels
     */
    getChannels(): Promise<BroadcastChannel[]>;
    /**
     * Get subscribed channels
     */
    getSubscriptions(): Promise<BroadcastChannel[]>;
    /**
     * Subscribe to a channel
     */
    subscribe(channelId: string): Promise<void>;
    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channelId: string): Promise<void>;
    /**
     * Get channel messages
     */
    getMessages(channelId: string, limit?: number): Promise<PaginatedResponse<BroadcastMessage>>;
    /**
     * Get feed from all subscribed channels
     */
    getFeed(limit?: number): Promise<PaginatedResponse<BroadcastMessage>>;
}
declare class AnnouncementsService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get announcements
     */
    list(unreadOnly?: boolean): Promise<Announcement[]>;
    /**
     * Mark announcement as read
     */
    markAsRead(announcementId: string): Promise<void>;
    /**
     * Dismiss announcement
     */
    dismiss(announcementId: string): Promise<void>;
}
declare class SearchService {
    private http;
    constructor(http: HttpClient);
    /**
     * Global search across users, conversations, and messages
     */
    search(request: GlobalSearchRequest): Promise<SearchResult>;
    /**
     * Search within a conversation
     */
    searchInConversation(request: ConversationSearchRequest): Promise<MessageSearchResult[]>;
    /**
     * Search users only
     */
    searchUsers(query: string, limit?: number): Promise<UserSearchResult[]>;
}
declare class DevicesService {
    private http;
    constructor(http: HttpClient);
    /**
     * Get all devices/sessions
     */
    list(): Promise<Device[]>;
    /**
     * Register a device for push notifications
     */
    register(data: RegisterDeviceRequest): Promise<void>;
    /**
     * Remove a device/session
     */
    remove(deviceId: string): Promise<void>;
    /**
     * Remove all other sessions
     */
    removeAllOthers(): Promise<void>;
}
declare class TwoFactorService {
    private http;
    constructor(http: HttpClient);
    /**
     * Enable two-factor authentication
     */
    enable(password: string): Promise<TwoFactorSetupResponse>;
    /**
     * Disable two-factor authentication
     */
    disable(password: string, code: string): Promise<void>;
    /**
     * Verify two-factor code
     */
    verify(code: string): Promise<void>;
    /**
     * Get backup codes
     */
    getBackupCodes(): Promise<BackupCodesResponse>;
    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(password: string): Promise<BackupCodesResponse>;
}
declare class ReportsService {
    private http;
    constructor(http: HttpClient);
    /**
     * Create a report
     */
    create(data: CreateReportRequest): Promise<Report>;
}
declare class PeopleConnectSDK {
    private http;
    readonly auth: AuthService;
    readonly users: UserService;
    readonly conversations: ConversationsService;
    readonly messages: MessagesService;
    readonly contacts: ContactsService;
    readonly calls: CallsService;
    readonly media: MediaService;
    readonly notifications: NotificationsService;
    readonly broadcasts: BroadcastsService;
    readonly announcements: AnnouncementsService;
    readonly search: SearchService;
    readonly devices: DevicesService;
    readonly twoFactor: TwoFactorService;
    readonly reports: ReportsService;
    constructor(config: SDKConfig);
    /**
     * Set authentication tokens
     */
    setTokens(tokens: AuthTokens): void;
    /**
     * Clear authentication tokens
     */
    clearTokens(): void;
    /**
     * Get current access token
     */
    getAccessToken(): string | null;
}

export { Announcement, Attachment, AuthTokens, BackupCodesResponse, BlockedContact, BroadcastChannel, BroadcastMessage, CallHistoryItem, CallResponse, ChangePasswordRequest, Contact, ContactRequestList, Conversation, ConversationDetail, ConversationMember, ConversationSearchRequest, ConversationSharedContent, CreateChatroomRequest, CreateDMRequest, CreateReportRequest, Device, EditMessageRequest, GlobalSearchRequest, IceServer, InitiateCallRequest, LiveKitTokenResponse, LoginRequest, LoginResponse, Message, MessageSearchResult, Notification, PaginatedResponse, PaginationParams, ParticipantRole, PeopleConnectSDK, RegisterDeviceRequest, RegisterRequest, Report, ResetPasswordRequest, SDKConfig, SearchResult, SendMessageRequest, SharedContentParams, TwoFactorSetupResponse, TwoFactorVerifyRequest, UpdateChatroomRequest, UpdateProfileRequest, UploadProgress, UploadResponse, User, UserProfile, UserSearchResult, PeopleConnectSDK as default };
