/**
 * PeopleConnect SDK Types
 * Complete type definitions for the PeopleConnect API
 */

// ============================================================================
// Core Types
// ============================================================================

export type UserStatus = "Online" | "Away" | "Busy" | "Offline";
export type MessageType = "Text" | "Image" | "Video" | "Audio" | "File" | "Location" | "System" | "VoiceCall" | "VideoCall";
export type MessageStatus = "Sent" | "Delivered" | "Read" | "Deleted" | "Flagged";
export type ConversationType = "DirectMessage" | "Chatroom" | "BroadcastChannel";
export type ContactStatus = "Pending" | "Accepted" | "Rejected" | "Blocked";
export type ParticipantRole = "Member" | "Admin" | "Owner";
export type CallType = "voice" | "video";
export type CallDirection = "incoming" | "outgoing";
export type CallStatus = "completed" | "missed" | "rejected" | "failed";
export type ReportType = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";
export type DevicePlatform = "web" | "ios" | "android";
export type Theme = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type Visibility = "public" | "contacts" | "private" | "everyone" | "nobody";
export type Priority = "low" | "normal" | "high" | "urgent";

// ============================================================================
// User Types
// ============================================================================

export interface User {
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

export interface UserProfile extends User {
  mobileNumber?: string;
  languageCode: string;
  createdAt: string;
}

export interface UserPreferences {
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

export interface PrivacySettings {
  profileVisibility: Visibility;
  lastSeenVisibility: Visibility;
  readReceiptsEnabled: boolean;
  typingIndicatorEnabled: boolean;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
  portal?: "user" | "admin";
}

export interface RegisterRequest {
  name: string;
  username: string;
  password: string;
  email?: string;
  mobileNumber?: string;
  invitationCode?: string;
}

export interface LoginResponse {
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

export interface ActiveWarning {
  id: string;
  reason: string;
  createdAt: string;
  moderatorName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
  userId: string;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
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

export interface ConversationDetail extends Conversation {
  createdAt: string;
  createdBy?: string;
}

export interface ConversationParticipant {
  userId: string;
  user: User;
  role: ParticipantRole;
  joinedAt: string;
  isDeleted?: boolean;
}

export interface ConversationMember {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string;
  role: string;
  joinedAt: string;
  isOnline: boolean;
  isDeleted?: boolean;
}

export interface CreateDMRequest {
  userId: string;
}

export interface CreateChatroomRequest {
  name: string;
  description?: string;
  participantIds: string[];
}

export interface UpdateChatroomRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
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

export interface SendMessageRequest {
  content?: string;
  type?: string;
  replyToMessageId?: string;
  attachmentIds?: string[];
}

export interface EditMessageRequest {
  content: string;
}

export interface ReactToMessageRequest {
  emoji: string;
}

export interface ForwardMessageRequest {
  conversationIds: string[];
}

export interface Attachment {
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

export interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

// ============================================================================
// Contact Types
// ============================================================================

export interface Contact {
  id: string;
  userId: string;
  contactUser: User;
  status: ContactStatus;
  nickname?: string;
  createdAt: string;
}

export interface BlockedContact {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  blockedAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isContact: boolean;
  isPending: boolean;
  isOnline?: boolean;
}

export interface ContactRequestList {
  received: Contact[];
  sent: Contact[];
}

// ============================================================================
// Call Types
// ============================================================================

export interface InitiateCallRequest {
  conversationId?: string;
  targetUserId?: string;
  type: CallType;
}

export interface CallResponse {
  callId: string;
  conversationId?: string;
  type: CallType;
  status: string;
  iceServers?: IceServer[];
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallHistoryItem {
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

export interface CallParticipant {
  userId: string;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
  leftAt?: string;
}

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

// ============================================================================
// Media Types
// ============================================================================

export interface UploadResponse {
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

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
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

// ============================================================================
// Broadcast Types
// ============================================================================

export interface BroadcastChannel {
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

export interface BroadcastMessage {
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

// ============================================================================
// Announcement Types
// ============================================================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  priority: number;
  createdAt: string;
  hasRead: boolean;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  users: UserSearchResult[];
  messages: MessageSearchResult[];
  conversations: ConversationSearchResult[];
}

export interface MessageSearchResult {
  id: string;
  conversationId: string;
  conversationName: string;
  content: string;
  senderName: string;
  sentAt: string;
}

export interface ConversationSearchResult {
  id: string;
  name: string;
  type: string;
  imageUrl?: string;
  participantCount: number;
}

export interface GlobalSearchRequest {
  query: string;
  types?: ("users" | "conversations" | "messages")[];
  limit?: number;
}

export interface ConversationSearchRequest {
  conversationId: string;
  query: string;
  limit?: number;
  before?: string;
  after?: string;
}

// ============================================================================
// Device Types
// ============================================================================

export interface Device {
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

export interface RegisterDeviceRequest {
  token: string;
  platform: DevicePlatform;
  deviceName?: string;
}

// ============================================================================
// Two-Factor Types
// ============================================================================

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface BackupCodesResponse {
  codes: string[];
  generatedAt: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface CreateReportRequest {
  reportedUserId?: string;
  reportedMessageId?: string;
  reportedConversationId?: string;
  reportType: ReportType;
  description: string;
}

export interface Report {
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

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// ============================================================================
// SDK Configuration Types
// ============================================================================

export interface SDKConfig {
  baseUrl: string;
  timeout?: number;
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;
  onUnauthorized?: () => void;
  onError?: (error: ApiError) => void;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Invitation Types
// ============================================================================

export interface Invitation {
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

export interface InvitationListResponse {
  items: Invitation[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InvitationStats {
  total: number;
  pending: number;
  used: number;
  expired: number;
}

export interface CreateInvitationRequest {
  email: string;
  expiryDays?: number;
}

export interface ResendInvitationRequest {
  expiryDays?: number;
}

export type InvitationStatus = 'all' | 'pending' | 'used' | 'expired';

export interface InvitationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InvitationStatus;
}

// Shared Content Types (for conversation info sheet)
export interface SharedMediaItem {
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

export interface SharedLinkItem {
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

export interface SharedDocumentItem {
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

export interface ConversationSharedContent {
  media: SharedMediaItem[];
  links: SharedLinkItem[];
  documents: SharedDocumentItem[];
  totalMediaCount: number;
  totalLinksCount: number;
  totalDocumentsCount: number;
}

export interface SharedContentParams {
  type?: 'all' | 'media' | 'links' | 'documents';
  page?: number;
  pageSize?: number;
}

// Profile Update
export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  phoneNumber?: string;
  email?: string;
}
