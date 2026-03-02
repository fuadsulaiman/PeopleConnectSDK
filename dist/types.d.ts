/**
 * PeopleConnect SDK Types
 * Complete type definitions for the PeopleConnect API
 */
type UserStatus = "Online" | "Away" | "Busy" | "Offline";
type MessageType = "Text" | "Image" | "Video" | "Audio" | "File" | "Location" | "System" | "VoiceCall" | "VideoCall";
type MessageStatus = "Sent" | "Delivered" | "Read" | "Deleted" | "Flagged";
type ConversationType = "DirectMessage" | "Chatroom" | "BroadcastChannel";
type ContactStatus = "Pending" | "Accepted" | "Rejected" | "Blocked";
type ParticipantRole = "Member" | "Admin" | "Owner";
type CallType = "voice" | "video";
type CallDirection = "incoming" | "outgoing";
type CallStatus = "completed" | "missed" | "rejected" | "failed";
type ReportType = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";
type DevicePlatform = "web" | "ios" | "android";
type Theme = "light" | "dark" | "system";
type FontSize = "small" | "medium" | "large";
type Visibility = "public" | "contacts" | "private" | "everyone" | "nobody";
type Priority = "low" | "normal" | "high" | "urgent";
interface User {
    id: string;
    name: string;
    username: string;
    email?: string;
    avatarUrl?: string;
    description?: string;
    status: UserStatus;
    statusMessage?: string;
    twoFactorEnabled?: boolean;
}
interface UserProfile extends User {
    mobileNumber?: string;
    languageCode: string;
    createdAt: string;
}
interface UserPreferences {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showOnlineStatus: boolean;
    showReadReceipts: boolean;
    showTypingIndicator: boolean;
    theme: Theme;
    fontSize: FontSize;
    language: string;
}
interface PrivacySettings {
    profileVisibility: Visibility;
    lastSeenVisibility: Visibility;
    readReceiptsEnabled: boolean;
    typingIndicatorEnabled: boolean;
}
interface LoginRequest {
    username: string;
    password: string;
    portal?: "user" | "admin";
}
interface RegisterRequest {
    name: string;
    username: string;
    password: string;
    email?: string;
    mobileNumber?: string;
    invitationCode?: string;
}
interface LoginResponse {
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    user: User;
    requiresTwoFactor?: boolean;
    requiresPasswordChange?: boolean;
    requiresTwoFactorSetup?: boolean;
    warningCount?: number;
    activeWarnings?: ActiveWarning[];
}
interface ActiveWarning {
    id: string;
    reason: string;
    createdAt: string;
    moderatorName: string;
}
interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}
interface TwoFactorVerifyRequest {
    code: string;
    userId: string;
}
interface Conversation {
    id: string;
    type: ConversationType;
    name?: string;
    avatarUrl?: string;
    description?: string;
    lastMessage?: Message;
    lastMessageAt?: string;
    unreadCount: number;
    isMuted?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
    participants: ConversationParticipant[];
}
interface ConversationDetail extends Conversation {
    createdAt: string;
    createdBy?: string;
}
interface ConversationParticipant {
    userId: string;
    user: User;
    role: ParticipantRole;
    joinedAt: string;
    isDeleted?: boolean;
}
interface ConversationMember {
    userId: string;
    username: string;
    name: string;
    avatarUrl?: string;
    role: string;
    joinedAt: string;
    isOnline: boolean;
    isDeleted?: boolean;
}
interface CreateDMRequest {
    userId: string;
}
interface CreateChatroomRequest {
    name: string;
    description?: string;
    participantIds: string[];
}
interface UpdateChatroomRequest {
    name?: string;
    description?: string;
    avatarUrl?: string;
}
interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    sender: User;
    content?: string;
    type: MessageType;
    replyToMessageId?: string;
    replyToMessage?: Message;
    forwardedFromMessageId?: string;
    status: MessageStatus;
    attachments: Attachment[];
    reactions: Reaction[];
    createdAt: string;
    editedAt?: string;
}
interface SendMessageRequest {
    content?: string;
    type?: string;
    replyToMessageId?: string;
    attachmentIds?: string[];
}
interface EditMessageRequest {
    content: string;
}
interface ReactToMessageRequest {
    emoji: string;
}
interface ForwardMessageRequest {
    conversationIds: string[];
}
interface Attachment {
    id: string;
    fileName: string;
    originalFileName: string;
    contentType: string;
    fileSize: number;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    waveform?: number[];
}
interface Reaction {
    userId: string;
    emoji: string;
    createdAt: string;
}
interface Contact {
    id: string;
    userId: string;
    contactUser: User;
    status: ContactStatus;
    nickname?: string;
    createdAt: string;
}
interface BlockedContact {
    id: string;
    userId: string;
    name: string;
    username: string;
    avatarUrl?: string;
    blockedAt: string;
}
interface UserSearchResult {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    isContact: boolean;
    isPending: boolean;
    isOnline?: boolean;
}
interface ContactRequestList {
    received: Contact[];
    sent: Contact[];
}
interface InitiateCallRequest {
    conversationId?: string;
    targetUserId?: string;
    type: CallType;
}
interface CallResponse {
    callId: string;
    conversationId?: string;
    type: CallType;
    status: string;
    iceServers?: IceServer[];
}
interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}
interface CallHistoryItem {
    id: string;
    conversationId: string;
    conversationName?: string;
    type: CallType;
    direction: CallDirection;
    status: CallStatus;
    duration: number;
    startedAt: string;
    endedAt?: string;
    participants: CallParticipant[];
}
interface CallParticipant {
    userId: string;
    userName: string;
    avatarUrl?: string;
    joinedAt: string;
    leftAt?: string;
}
interface LiveKitTokenResponse {
    token: string;
    url: string;
    roomName: string;
}
interface UploadResponse {
    id: string;
    fileName: string;
    originalFileName: string;
    contentType: string;
    fileSize: number;
    downloadUrl: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    waveform?: number[];
}
interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}
interface Notification {
    id: string;
    type: string;
    title: string;
    body?: string;
    data?: string;
    referenceId?: string;
    isRead: boolean;
    createdAt: string;
}
interface NotificationPreferences {
    messageNotifications: boolean;
    callNotifications: boolean;
    contactNotifications: boolean;
    systemNotifications: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showPreview: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}
interface BroadcastChannel {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    subscriberCount: number;
    isSubscribed: boolean;
    imageUrl?: string;
    isPublic?: boolean;
    isActive?: boolean;
    type?: string;
}
interface BroadcastMessage {
    id: string;
    channelId: string;
    channelName?: string;
    title?: string;
    content: string;
    priority?: Priority;
    createdAt: string;
    publishedAt?: string;
    publisherId?: string;
    publisherName?: string;
    imageUrl?: string;
    mediaUrls: string[];
}
interface Announcement {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    priority: number;
    createdAt: string;
    hasRead: boolean;
}
interface SearchResult {
    users: UserSearchResult[];
    messages: MessageSearchResult[];
    conversations: ConversationSearchResult[];
}
interface MessageSearchResult {
    id: string;
    conversationId: string;
    conversationName: string;
    content: string;
    senderName: string;
    sentAt: string;
}
interface ConversationSearchResult {
    id: string;
    name: string;
    type: string;
    imageUrl?: string;
    participantCount: number;
}
interface GlobalSearchRequest {
    query: string;
    types?: ("users" | "conversations" | "messages")[];
    limit?: number;
}
interface ConversationSearchRequest {
    conversationId: string;
    query: string;
    limit?: number;
    before?: string;
    after?: string;
}
interface Device {
    id: string;
    name: string;
    platform: DevicePlatform;
    lastActive: string;
    ipAddress?: string;
    location?: string;
    isCurrent: boolean;
    createdAt: string;
    browser?: string;
}
interface RegisterDeviceRequest {
    token: string;
    platform: DevicePlatform;
    deviceName?: string;
}
interface TwoFactorSetupResponse {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
interface BackupCodesResponse {
    codes: string[];
    generatedAt: string;
}
interface CreateReportRequest {
    reportedUserId?: string;
    reportedMessageId?: string;
    reportedConversationId?: string;
    reportType: ReportType;
    description: string;
}
interface Report {
    id: string;
    reporterId: string;
    reportedUserId?: string;
    reportedMessageId?: string;
    reportedConversationId?: string;
    reportType: string;
    description: string;
    status: string;
    createdAt: string;
}
interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore?: boolean;
}
interface PaginationParams {
    page?: number;
    pageSize?: number;
}
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
}
interface SDKConfig {
    baseUrl: string;
    timeout?: number;
    onTokenRefresh?: (tokens: {
        accessToken: string;
        refreshToken: string;
    }) => void;
    onUnauthorized?: () => void;
    onError?: (error: ApiError) => void;
}
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
interface Invitation {
    id: string;
    code: string;
    email: string;
    isUsed: boolean;
    usedAt?: string;
    expiresAt: string;
    isExpired: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    usedByUserId?: string;
    usedByName?: string;
}
interface InvitationListResponse {
    items: Invitation[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
interface InvitationStats {
    total: number;
    pending: number;
    used: number;
    expired: number;
}
interface CreateInvitationRequest {
    email: string;
    expiryDays?: number;
}
interface ResendInvitationRequest {
    expiryDays?: number;
}
type InvitationStatus = 'all' | 'pending' | 'used' | 'expired';
interface InvitationListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: InvitationStatus;
}
interface SharedMediaItem {
    id: string;
    url: string;
    thumbnailUrl?: string;
    type: 'image' | 'video' | 'audio';
    fileName?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    duration?: number;
    createdAt: string;
    senderId?: string;
    senderName?: string;
}
interface SharedLinkItem {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    domain?: string;
    createdAt: string;
    senderId?: string;
    senderName?: string;
    messageId?: string;
}
interface SharedDocumentItem {
    id?: string;
    url: string;
    fileName: string;
    friendlyName?: string;
    extension?: string;
    fileSize?: number;
    createdAt: string;
    senderId?: string;
    senderName?: string;
}
interface ConversationSharedContent {
    media: SharedMediaItem[];
    links: SharedLinkItem[];
    documents: SharedDocumentItem[];
    totalMediaCount: number;
    totalLinksCount: number;
    totalDocumentsCount: number;
}
interface SharedContentParams {
    type?: 'all' | 'media' | 'links' | 'documents';
    page?: number;
    pageSize?: number;
}
interface UpdateProfileRequest {
    name?: string;
    bio?: string;
    phoneNumber?: string;
    email?: string;
}

export type { ActiveWarning, Announcement, ApiError, ApiResponse, Attachment, AuthTokens, BackupCodesResponse, BlockedContact, BroadcastChannel, BroadcastMessage, CallDirection, CallHistoryItem, CallParticipant, CallResponse, CallStatus, CallType, ChangePasswordRequest, Contact, ContactRequestList, ContactStatus, Conversation, ConversationDetail, ConversationMember, ConversationParticipant, ConversationSearchRequest, ConversationSearchResult, ConversationSharedContent, ConversationType, CreateChatroomRequest, CreateDMRequest, CreateInvitationRequest, CreateReportRequest, Device, DevicePlatform, EditMessageRequest, FontSize, ForwardMessageRequest, GlobalSearchRequest, IceServer, InitiateCallRequest, Invitation, InvitationListParams, InvitationListResponse, InvitationStats, InvitationStatus, LiveKitTokenResponse, LoginRequest, LoginResponse, Message, MessageSearchResult, MessageStatus, MessageType, Notification, NotificationPreferences, PaginatedResponse, PaginationParams, ParticipantRole, Priority, PrivacySettings, ReactToMessageRequest, Reaction, RegisterDeviceRequest, RegisterRequest, Report, ReportType, ResendInvitationRequest, ResetPasswordRequest, SDKConfig, SearchResult, SendMessageRequest, SharedContentParams, SharedDocumentItem, SharedLinkItem, SharedMediaItem, Theme, TwoFactorSetupResponse, TwoFactorVerifyRequest, UpdateChatroomRequest, UpdateProfileRequest, UploadProgress, UploadResponse, User, UserPreferences, UserProfile, UserSearchResult, UserStatus, Visibility };
