# PeopleConnect TypeScript SDK

The official TypeScript SDK for the PeopleConnect real-time communication platform. Provides a fully typed, zero-dependency client for authentication, messaging, calls, contacts, media, broadcasts, and more.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
  - [Login](#login)
  - [Registration](#registration)
  - [Two-Factor Authentication](#two-factor-authentication)
  - [Password Management](#password-management)
  - [Email Verification](#email-verification)
  - [Account Deletion](#account-deletion)
  - [Token Management](#token-management)
- [Services Reference](#services-reference)
  - [Auth Service](#auth-service)
  - [Users Service](#users-service)
  - [Conversations Service](#conversations-service)
  - [Messages Service](#messages-service)
  - [Contacts Service](#contacts-service)
  - [Calls Service](#calls-service)
  - [Media Service](#media-service)
  - [Notifications Service](#notifications-service)
  - [Broadcasts Service](#broadcasts-service)
  - [Announcements Service](#announcements-service)
  - [Search Service](#search-service)
  - [Devices Service](#devices-service)
  - [Two-Factor Service](#two-factor-service)
  - [Reports Service](#reports-service)
- [Real-Time Integration with SignalR](#real-time-integration-with-signalr)
- [React Native Integration Guide](#react-native-integration-guide)
- [Error Handling](#error-handling)
- [TypeScript Types Reference](#typescript-types-reference)
- [API Endpoint Mapping](#api-endpoint-mapping)
- [Migration Guide](#migration-guide)

---

## Features

- **Zero Dependencies** -- Uses only the built-in `fetch` API; no Axios, no external HTTP libraries
- **Automatic Token Refresh** -- Transparently refreshes expired access tokens and replays failed requests
- **Request Queue During Refresh** -- Concurrent requests that hit a 401 are queued and replayed after the single refresh completes
- **TypeScript-First** -- Complete type definitions for every request, response, and entity
- **Dual Module Format** -- Ships as both ESM (`import`) and CommonJS (`require`) via `tsup`
- **Cross-Platform** -- Works in browsers, Node.js 16+, and React Native (Hermes engine)
- **FormData Support** -- Handles both Web `File` objects and React Native `{ uri, type, name }` file objects
- **API Response Unwrapping** -- Automatically unwraps the `{ success, data }` response envelope from the backend

---

## Requirements

- Node.js >= 16.0.0 (for the `fetch` API and `AbortController`)
- TypeScript >= 5.0 (recommended, but not required at runtime)

---

## Installation

```bash
# npm
npm install @peopleconnect/sdk

# yarn
yarn add @peopleconnect/sdk

# pnpm
pnpm add @peopleconnect/sdk
```

If the package is not published to npm, you can install directly from the Git repository:

```bash
npm install git+https://github.com/fuadsulaiman/PeopleConnectSDK.git
```

Or link locally during development:

```bash
cd PeopleConnectSDK
npm link

cd ../YourProject
npm link @peopleconnect/sdk
```

---

## Quick Start

```typescript
import { PeopleConnectSDK } from '@peopleconnect/sdk';

const sdk = new PeopleConnectSDK({
  baseUrl: 'https://your-server.com/api',
  onTokenRefresh: (tokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },
  onUnauthorized: () => {
    window.location.href = '/login';
  },
});

// Login
const { user, accessToken, refreshToken } = await sdk.auth.login({
  username: 'john',
  password: 'password123',
});

// Tokens are automatically set on the SDK after login.
// For subsequent page loads, restore them manually:
sdk.setTokens({
  accessToken: localStorage.getItem('accessToken')!,
  refreshToken: localStorage.getItem('refreshToken')!,
});

// Fetch conversations
const { items: conversations } = await sdk.conversations.list({ page: 1, pageSize: 20 });

// Send a message
const message = await sdk.messages.send(conversations[0].id, {
  content: 'Hello from the SDK!',
});
```

---

## Configuration

The SDK is configured via a single `SDKConfig` object passed to the constructor.

```typescript
interface SDKConfig {
  /**
   * Required. The base URL of the PeopleConnect API, including the /api path.
   * Example: 'https://your-server.com/api'
   * A trailing slash is stripped automatically.
   */
  baseUrl: string;

  /**
   * Optional. Request timeout in milliseconds. Defaults to 30000 (30 seconds).
   * Requests that exceed this timeout throw an error with message "Request timeout".
   */
  timeout?: number;

  /**
   * Optional. Called whenever the SDK successfully refreshes an expired access token.
   * Use this to persist the new tokens to storage.
   */
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;

  /**
   * Optional. Called when the user's session has fully expired (refresh token
   * is also invalid). Use this to redirect to a login screen.
   */
  onUnauthorized?: () => void;

  /**
   * Optional. Called on every non-2xx API response before the error is thrown.
   * Useful for centralized error logging or analytics.
   */
  onError?: (error: ApiError) => void;
}
```

**Example with all options:**

```typescript
const sdk = new PeopleConnectSDK({
  baseUrl: 'https://your-server.com/api',
  timeout: 15000,
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed');
    saveTokensToStorage(tokens);
  },
  onUnauthorized: () => {
    console.log('Session expired');
    redirectToLogin();
  },
  onError: (error) => {
    console.error('API error:', error.message, error.code);
    reportToAnalytics(error);
  },
});
```

---

## Authentication

### Login

The `login` method authenticates a user and automatically sets the access and refresh tokens on the SDK instance. You do not need to call `setTokens` after a successful login.

```typescript
const response = await sdk.auth.login({
  username: 'john',
  password: 'password123',
  portal: 'user', // Optional. 'user' (default) or 'admin'
});

// response contains:
// {
//   sessionId: string;
//   accessToken: string;
//   refreshToken: string;
//   user: User;
//   requiresTwoFactor?: boolean;
//   requiresPasswordChange?: boolean;
//   requiresTwoFactorSetup?: boolean;
//   warningCount?: number;
//   activeWarnings?: ActiveWarning[];
// }
```

**Handling special login states:**

```typescript
const response = await sdk.auth.login({ username, password });

if (response.requiresTwoFactor) {
  // Prompt for 2FA code, then call sdk.auth.verifyTwoFactor()
  const userId = response.user.id;
  navigate('/two-factor', { userId });
  return;
}

if (response.requiresPasswordChange) {
  // User must change password before continuing
  navigate('/change-password');
  return;
}

if (response.requiresTwoFactorSetup) {
  // Admin requires 2FA, user must set it up
  navigate('/setup-2fa');
  return;
}
```

### Registration

```typescript
const response = await sdk.auth.register({
  name: 'John Doe',
  username: 'john',
  password: 'SecureP@ss123',
  email: 'john@example.com',        // Optional
  mobileNumber: '+1234567890',       // Optional
  invitationCode: 'ABC123',          // Required when invite-only mode is enabled
});

// Tokens are automatically set after successful registration
```

### Two-Factor Authentication

```typescript
// After login returns requiresTwoFactor: true
const response = await sdk.auth.verifyTwoFactor({
  userId: 'user-id-from-login',
  code: '123456',  // 6-digit TOTP code from authenticator app
});

// response is a full LoginResponse with tokens
sdk.setTokens({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
});
```

### Password Management

```typescript
// Change password (authenticated user)
await sdk.auth.changePassword({
  currentPassword: 'oldPassword',
  newPassword: 'newPassword',
});

// Request password reset email (unauthenticated)
await sdk.auth.forgotPassword('john@example.com');

// Reset password with token from email
await sdk.auth.resetPassword({
  token: 'reset-token-from-email',
  newPassword: 'newPassword',
});
```

### Email Verification

```typescript
// Verify email with token from verification email
await sdk.auth.verifyEmail('verification-token');

// Resend verification email
await sdk.auth.resendVerification('john@example.com');
```

### Account Deletion

```typescript
// Permanently delete the authenticated user's account
await sdk.auth.deleteAccount();
```

### Token Management

```typescript
// Manually set tokens (e.g., restoring from storage on app startup)
sdk.setTokens({
  accessToken: 'stored-access-token',
  refreshToken: 'stored-refresh-token',
});

// Get the current access token (useful for SignalR or custom requests)
const token = sdk.getAccessToken(); // string | null

// Clear all tokens (logout without calling the server)
sdk.clearTokens();

// Explicitly refresh the access token
const newTokens = await sdk.auth.refreshToken('current-refresh-token');
```

**Automatic token refresh flow:**

1. A request returns HTTP 401.
2. The SDK sends `POST /auth/refresh` with the stored refresh token.
3. If refresh succeeds, the new tokens are stored, `onTokenRefresh` is called, and the original request is replayed.
4. If refresh fails, `onUnauthorized` is called and the error is thrown.
5. Any concurrent requests that also receive 401 are queued and replayed after the single refresh completes.

---

## Services Reference

The SDK exposes 14 service classes as readonly properties on the main `PeopleConnectSDK` instance.

### Auth Service

Accessible via `sdk.auth`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `login` | `(data: LoginRequest) => Promise<LoginResponse>` | Authenticate and set tokens |
| `register` | `(data: RegisterRequest) => Promise<LoginResponse>` | Create account and set tokens |
| `logout` | `() => Promise<void>` | Invalidate session and clear tokens |
| `refreshToken` | `(refreshToken: string) => Promise<LoginResponse>` | Manually refresh the access token |
| `getCurrentUser` | `() => Promise<UserProfile>` | Get the authenticated user's profile |
| `checkUsername` | `(username: string) => Promise<{ available: boolean }>` | Check if a username is available |
| `verifyTwoFactor` | `(data: TwoFactorVerifyRequest) => Promise<LoginResponse>` | Verify a 2FA code during login |
| `forgotPassword` | `(identifier: string) => Promise<void>` | Send password reset email |
| `resetPassword` | `(data: ResetPasswordRequest) => Promise<void>` | Reset password using a token |
| `changePassword` | `(data: ChangePasswordRequest) => Promise<void>` | Change password for logged-in user |
| `deleteAccount` | `() => Promise<void>` | Delete the authenticated user's account |
| `verifyEmail` | `(token: string) => Promise<void>` | Verify email address with token |
| `resendVerification` | `(email: string) => Promise<void>` | Resend email verification |

**Examples:**

```typescript
// Login
const { user, accessToken, refreshToken } = await sdk.auth.login({
  username: 'john',
  password: 'password123',
});

// Check username availability
const { available } = await sdk.auth.checkUsername('newuser');
if (available) {
  console.log('Username is available!');
}

// Get current authenticated user
const me = await sdk.auth.getCurrentUser();
console.log(`Logged in as ${me.name} (${me.username})`);
```

---

### Users Service

Accessible via `sdk.users`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getProfile` | `() => Promise<UserProfile>` | Get the authenticated user's profile |
| `getUser` | `(userId: string) => Promise<User>` | Get any user by their ID |
| `uploadAvatar` | `(file: File \| { uri, type?, name? }) => Promise<{ avatarUrl: string }>` | Upload a profile avatar |
| `deleteAvatar` | `() => Promise<void>` | Remove the user's avatar |
| `updateProfile` | `(data: UpdateProfileRequest) => Promise<User>` | Update profile fields |

**Upload avatar -- Web:**

```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const { avatarUrl } = await sdk.users.uploadAvatar(file);
console.log('New avatar URL:', avatarUrl);
```

**Upload avatar -- React Native:**

```typescript
import { launchImageLibrary } from 'react-native-image-picker';

const result = await launchImageLibrary({ mediaType: 'photo' });
if (result.assets?.[0]) {
  const asset = result.assets[0];
  const { avatarUrl } = await sdk.users.uploadAvatar({
    uri: asset.uri!,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || 'avatar.jpg',
  });
  console.log('New avatar URL:', avatarUrl);
}
```

**Update profile:**

```typescript
const updatedUser = await sdk.users.updateProfile({
  name: 'John Updated',
  bio: 'Software developer',
  phoneNumber: '+1234567890',
  email: 'john@newdomain.com',
});
```

---

### Conversations Service

Accessible via `sdk.conversations`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(params?: PaginationParams & { type?: string }) => Promise<PaginatedResponse<Conversation>>` | List conversations with pagination |
| `get` | `(id: string) => Promise<ConversationDetail>` | Get a single conversation with full details |
| `createDM` | `(data: CreateDMRequest) => Promise<Conversation>` | Create or get a direct message conversation |
| `createChatroom` | `(data: CreateChatroomRequest) => Promise<Conversation>` | Create a group chatroom |
| `update` | `(id: string, data: UpdateChatroomRequest) => Promise<Conversation>` | Update chatroom name, description, or avatar |
| `delete` | `(id: string) => Promise<void>` | Delete a conversation |
| `leave` | `(id: string) => Promise<void>` | Leave a chatroom |
| `addParticipants` | `(id: string, userIds: string[]) => Promise<void>` | Add members to a chatroom |
| `removeParticipant` | `(id: string, userId: string) => Promise<void>` | Remove a member from a chatroom |
| `updateParticipantRole` | `(id: string, userId: string, role: ParticipantRole) => Promise<void>` | Change a member's role (Member, Admin, Owner) |
| `getMembers` | `(id: string) => Promise<ConversationMember[]>` | Get all members of a conversation |
| `mute` | `(id: string, until?: string) => Promise<void>` | Mute notifications (optionally until a date) |
| `unmute` | `(id: string) => Promise<void>` | Unmute notifications |
| `archive` | `(id: string) => Promise<void>` | Archive a conversation |
| `unarchive` | `(id: string) => Promise<void>` | Unarchive a conversation |
| `clear` | `(id: string) => Promise<void>` | Clear all messages in a conversation |
| `pin` | `(id: string) => Promise<void>` | Pin a conversation to the top of the list |
| `unpin` | `(id: string) => Promise<void>` | Unpin a conversation |
| `markAsRead` | `(id: string, lastMessageId?: string) => Promise<void>` | Mark conversation as read |
| `uploadAvatar` | `(id: string, file: File) => Promise<{ avatarUrl: string }>` | Upload a chatroom avatar image |

**Examples:**

```typescript
// List conversations with pagination
const { items, totalCount } = await sdk.conversations.list({
  page: 1,
  pageSize: 20,
  type: 'DirectMessage', // Optional: 'DirectMessage', 'Chatroom', or omit for all
});

// Create a DM (returns existing if one already exists)
const dm = await sdk.conversations.createDM({ userId: 'other-user-id' });

// Create a group chat
const chatroom = await sdk.conversations.createChatroom({
  name: 'Project Team',
  description: 'Our project discussion group',
  participantIds: ['user-1', 'user-2', 'user-3'],
});

// Update chatroom info
await sdk.conversations.update(chatroom.id, {
  name: 'Project Team - Q2',
  description: 'Updated description',
});

// Add and remove members
await sdk.conversations.addParticipants(chatroom.id, ['user-4', 'user-5']);
await sdk.conversations.removeParticipant(chatroom.id, 'user-4');

// Promote a member to admin
await sdk.conversations.updateParticipantRole(chatroom.id, 'user-2', 'Admin');

// Mute for 24 hours
const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
await sdk.conversations.mute(chatroom.id, until);

// Pin to top
await sdk.conversations.pin(dm.id);

// Mark as read
await sdk.conversations.markAsRead(dm.id, 'latest-message-id');
```

---

### Messages Service

Accessible via `sdk.messages`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(conversationId: string, params?: { limit?, before?, after? }) => Promise<{ items: Message[]; hasMore: boolean }>` | Get messages with cursor-based pagination |
| `get` | `(conversationId: string, messageId: string) => Promise<Message>` | Get a single message by ID |
| `send` | `(conversationId: string, data: SendMessageRequest) => Promise<Message>` | Send a new message |
| `edit` | `(conversationId: string, messageId: string, data: EditMessageRequest) => Promise<Message>` | Edit a message's content |
| `delete` | `(conversationId: string, messageId: string, forEveryone?: boolean) => Promise<void>` | Delete a message |
| `react` | `(conversationId: string, messageId: string, emoji: string) => Promise<void>` | Add a reaction to a message |
| `removeReaction` | `(conversationId: string, messageId: string, emoji: string) => Promise<void>` | Remove a reaction from a message |
| `forward` | `(conversationId: string, messageId: string, targetConversationIds: string[]) => Promise<void>` | Forward a message to other conversations |

**Pagination pattern (cursor-based):**

Messages use cursor-based pagination with `before` and `after` parameters (message IDs), not page numbers.

```typescript
// Load the most recent messages
const { items, hasMore } = await sdk.messages.list('conversation-id', { limit: 50 });

// Load older messages (scroll up)
if (hasMore) {
  const oldestMessageId = items[items.length - 1].id;
  const older = await sdk.messages.list('conversation-id', {
    limit: 50,
    before: oldestMessageId,
  });
}

// Load newer messages (pull to refresh)
const newestMessageId = items[0].id;
const newer = await sdk.messages.list('conversation-id', {
  limit: 50,
  after: newestMessageId,
});
```

**Sending messages:**

```typescript
// Simple text message
const msg = await sdk.messages.send('conversation-id', {
  content: 'Hello!',
});

// Reply to a message
const reply = await sdk.messages.send('conversation-id', {
  content: 'I agree!',
  replyToMessageId: 'original-message-id',
});

// Message with attachments (upload first, then send)
const uploaded = await sdk.media.upload(file, 'conversation-id');
const msg = await sdk.messages.send('conversation-id', {
  content: 'Check out this file',
  attachmentIds: [uploaded.id],
});

// Send a message with a specific type
const msg = await sdk.messages.send('conversation-id', {
  content: 'Location data',
  type: 'Location',
});
```

**Editing, deleting, reacting:**

```typescript
// Edit
await sdk.messages.edit('conversation-id', 'message-id', {
  content: 'Updated text',
});

// Delete for yourself only
await sdk.messages.delete('conversation-id', 'message-id', false);

// Delete for everyone
await sdk.messages.delete('conversation-id', 'message-id', true);

// React
await sdk.messages.react('conversation-id', 'message-id', '👍');

// Remove reaction
await sdk.messages.removeReaction('conversation-id', 'message-id', '👍');

// Forward to multiple conversations
await sdk.messages.forward('conversation-id', 'message-id', [
  'target-conv-1',
  'target-conv-2',
]);
```

---

### Contacts Service

Accessible via `sdk.contacts`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(params?: PaginationParams & { search?: string }) => Promise<PaginatedResponse<Contact>>` | List accepted contacts with optional search |
| `getRequests` | `() => Promise<ContactRequestList>` | Get received and sent contact requests |
| `searchUsers` | `(query: string, limit?: number) => Promise<UserSearchResult[]>` | Search for users to add as contacts |
| `sendRequest` | `(userId: string, nickname?: string) => Promise<Contact>` | Send a contact request |
| `acceptRequest` | `(contactId: string) => Promise<Contact>` | Accept a pending contact request |
| `rejectRequest` | `(contactId: string) => Promise<void>` | Reject a pending contact request |
| `update` | `(contactId: string, nickname?: string) => Promise<Contact>` | Update a contact's nickname |
| `remove` | `(contactId: string) => Promise<void>` | Remove a contact |
| `block` | `(userId: string) => Promise<void>` | Block a user |
| `unblock` | `(userId: string) => Promise<void>` | Unblock a user |
| `getBlocked` | `() => Promise<BlockedContact[]>` | Get list of blocked users |

**Examples:**

```typescript
// Search for a user
const results = await sdk.contacts.searchUsers('jane', 10);
// Each result has: { id, name, username, avatarUrl, isContact, isPending, isOnline }

// Send a contact request with optional nickname
const contact = await sdk.contacts.sendRequest(results[0].id, 'Jane from work');

// View pending requests
const { received, sent } = await sdk.contacts.getRequests();

// Accept a request
await sdk.contacts.acceptRequest(received[0].id);

// List contacts with search
const { items } = await sdk.contacts.list({ search: 'john', page: 1, pageSize: 50 });

// Block and unblock
await sdk.contacts.block('user-id');
const blocked = await sdk.contacts.getBlocked();
await sdk.contacts.unblock('user-id');
```

---

### Calls Service

Accessible via `sdk.calls`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `initiate` | `(data: InitiateCallRequest) => Promise<CallResponse>` | Start a voice or video call |
| `accept` | `(callId: string) => Promise<CallResponse>` | Accept an incoming call |
| `reject` | `(callId: string) => Promise<void>` | Reject an incoming call |
| `end` | `(callId: string) => Promise<void>` | End an active call |
| `getHistory` | `(params?: PaginationParams) => Promise<PaginatedResponse<CallHistoryItem>>` | Get call history |
| `get` | `(callId: string) => Promise<CallHistoryItem>` | Get details of a specific call |
| `delete` | `(callId: string) => Promise<void>` | Delete a call record from history |
| `getIceServers` | `() => Promise<IceServer[]>` | Get STUN/TURN server configuration |
| `getLiveKitToken` | `(conversationId: string) => Promise<LiveKitTokenResponse>` | Get a LiveKit token for group video calls |

**1:1 calls (WebRTC):**

```typescript
// Initiate a call to a specific user
const call = await sdk.calls.initiate({
  targetUserId: 'other-user-id',
  type: 'video', // 'voice' or 'video'
});
// call.callId -- use with SignalR for WebRTC signaling
// call.iceServers -- use to configure RTCPeerConnection

// Or initiate from a conversation
const call = await sdk.calls.initiate({
  conversationId: 'dm-conversation-id',
  type: 'voice',
});

// Accept, reject, or end
await sdk.calls.accept('call-id');
await sdk.calls.reject('call-id');
await sdk.calls.end('call-id');
```

**Group calls (LiveKit):**

```typescript
// Get a LiveKit token for a group call
const { token, url, roomName } = await sdk.calls.getLiveKitToken('chatroom-id');
// Use token and url to connect with the LiveKit client SDK
```

**ICE servers:**

```typescript
// Fetch STUN/TURN configuration from the backend
const iceServers = await sdk.calls.getIceServers();
// Returns: [{ urls: 'stun:...', username?: '...', credential?: '...' }]
```

**Call history:**

```typescript
const { items, totalCount } = await sdk.calls.getHistory({ page: 1, pageSize: 20 });
// Each item: { id, conversationId, type, direction, status, duration, startedAt, participants }

// Delete a call record
await sdk.calls.delete('call-id');
```

---

### Media Service

Accessible via `sdk.media`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `upload` | `(file: File, conversationId?: string, onProgress?: (progress: number) => void) => Promise<UploadResponse>` | Upload a single file |
| `uploadMultiple` | `(files: File[], conversationId?: string) => Promise<{ uploaded: UploadResponse[]; errors: string[] }>` | Upload multiple files at once |
| `uploadVoice` | `(audioBlob: Blob, conversationId: string, duration: number) => Promise<UploadResponse>` | Upload a voice message recording |
| `get` | `(fileId: string) => Promise<UploadResponse>` | Get metadata for an uploaded file |
| `delete` | `(fileId: string) => Promise<void>` | Delete an uploaded file |
| `getConversationMedia` | `(conversationId: string, params?: PaginationParams & { type?: string }) => Promise<PaginatedResponse<Attachment>>` | Get media files in a conversation |
| `getConversationSharedContent` | `(conversationId: string, params?: SharedContentParams) => Promise<ConversationSharedContent>` | Get shared media, links, and documents |
| `getDownloadUrl` | `(fileId: string, token?: string) => string` | Generate a download URL for a file |
| `getThumbnailUrl` | `(fileId: string, token?: string) => string` | Generate a thumbnail URL for an image/video |
| `getStreamUrl` | `(fileId: string, token?: string) => string` | Generate a streaming URL for audio/video |

**Upload flow:**

```typescript
// Upload a file
const uploaded = await sdk.media.upload(file, 'conversation-id');
// uploaded: { id, fileName, originalFileName, contentType, fileSize, downloadUrl, ... }

// Then attach it to a message
await sdk.messages.send('conversation-id', {
  content: 'Here is the document',
  attachmentIds: [uploaded.id],
});
```

**Upload voice message:**

```typescript
// In a web browser
const audioBlob = await recordAudio(); // Your recording logic
const uploaded = await sdk.media.uploadVoice(audioBlob, 'conversation-id', 15); // 15 seconds
```

**URL generation:**

The `getDownloadUrl`, `getThumbnailUrl`, and `getStreamUrl` methods are synchronous and return pre-authenticated URLs using the current access token. They do not make network requests.

```typescript
const downloadUrl = sdk.media.getDownloadUrl('file-id');
// => 'https://your-server.com/api/media/file-id/download?token=...'

const thumbnailUrl = sdk.media.getThumbnailUrl('file-id');
// => 'https://your-server.com/api/media/file-id/thumbnail?token=...'

const streamUrl = sdk.media.getStreamUrl('file-id');
// => 'https://your-server.com/api/media/file-id/stream?token=...'
```

**Shared content:**

```typescript
const shared = await sdk.media.getConversationSharedContent('conversation-id', {
  type: 'all', // 'all', 'media', 'links', 'documents'
  page: 1,
  pageSize: 20,
});
// shared.media -- images, videos, audio files
// shared.links -- URLs shared in messages
// shared.documents -- non-media file attachments
// shared.totalMediaCount, shared.totalLinksCount, shared.totalDocumentsCount
```

---

### Notifications Service

Accessible via `sdk.notifications`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(params?: PaginationParams) => Promise<PaginatedResponse<Notification> & { unreadCount: number }>` | Get notifications with unread count |
| `getUnreadCount` | `() => Promise<number>` | Get the number of unread notifications |
| `markAsRead` | `(notificationId: string) => Promise<void>` | Mark a single notification as read |
| `markAllAsRead` | `() => Promise<void>` | Mark all notifications as read |
| `delete` | `(notificationId: string) => Promise<void>` | Delete a notification |

**Examples:**

```typescript
// Get notifications
const { items, unreadCount } = await sdk.notifications.list({ page: 1, pageSize: 20 });

// Show badge count
const unread = await sdk.notifications.getUnreadCount();
setBadgeCount(unread);

// Mark as read
await sdk.notifications.markAsRead('notification-id');
await sdk.notifications.markAllAsRead();

// Delete
await sdk.notifications.delete('notification-id');
```

---

### Broadcasts Service

Accessible via `sdk.broadcasts`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getChannels` | `() => Promise<BroadcastChannel[]>` | Get all available broadcast channels |
| `getSubscriptions` | `() => Promise<BroadcastChannel[]>` | Get channels the user is subscribed to |
| `subscribe` | `(channelId: string) => Promise<void>` | Subscribe to a broadcast channel |
| `unsubscribe` | `(channelId: string) => Promise<void>` | Unsubscribe from a broadcast channel |
| `getMessages` | `(channelId: string, limit?: number) => Promise<PaginatedResponse<BroadcastMessage>>` | Get messages from a specific channel |
| `getFeed` | `(limit?: number) => Promise<PaginatedResponse<BroadcastMessage>>` | Get aggregated feed from all subscribed channels |

**Examples:**

```typescript
// List all channels
const channels = await sdk.broadcasts.getChannels();

// Subscribe to a channel
await sdk.broadcasts.subscribe(channels[0].id);

// Get feed from all subscribed channels
const { items: feed } = await sdk.broadcasts.getFeed(50);

// Get messages from a specific channel
const { items: messages } = await sdk.broadcasts.getMessages('channel-id', 50);

// Unsubscribe
await sdk.broadcasts.unsubscribe('channel-id');
```

---

### Announcements Service

Accessible via `sdk.announcements`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `(unreadOnly?: boolean) => Promise<Announcement[]>` | Get system announcements |
| `markAsRead` | `(announcementId: string) => Promise<void>` | Mark an announcement as read |
| `dismiss` | `(announcementId: string) => Promise<void>` | Dismiss an announcement |

**Examples:**

```typescript
// Get all announcements
const allAnnouncements = await sdk.announcements.list(false);

// Get only unread announcements
const unread = await sdk.announcements.list(true);

// Mark as read
await sdk.announcements.markAsRead('announcement-id');

// Dismiss (hide permanently)
await sdk.announcements.dismiss('announcement-id');
```

---

### Search Service

Accessible via `sdk.search`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `search` | `(request: GlobalSearchRequest) => Promise<SearchResult>` | Global search across users, conversations, and messages |
| `searchInConversation` | `(request: ConversationSearchRequest) => Promise<MessageSearchResult[]>` | Search for messages within a specific conversation |
| `searchUsers` | `(query: string, limit?: number) => Promise<UserSearchResult[]>` | Convenience method to search only users |

**Examples:**

```typescript
// Global search
const results = await sdk.search.search({
  query: 'project update',
  types: ['users', 'messages', 'conversations'],
  limit: 20,
});
// results.users -- matching users
// results.messages -- matching messages
// results.conversations -- matching conversations

// Search within a conversation
const messages = await sdk.search.searchInConversation({
  conversationId: 'conversation-id',
  query: 'budget',
  limit: 50,
  before: '2026-01-01T00:00:00Z', // Optional date filters
  after: '2025-01-01T00:00:00Z',
});

// Quick user search
const users = await sdk.search.searchUsers('jane', 10);
```

---

### Devices Service

Accessible via `sdk.devices`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `list` | `() => Promise<Device[]>` | Get all active sessions/devices |
| `register` | `(data: RegisterDeviceRequest) => Promise<void>` | Register a device for push notifications |
| `remove` | `(deviceId: string) => Promise<void>` | Terminate a specific session |
| `removeAllOthers` | `() => Promise<void>` | Terminate all sessions except the current one |

**Examples:**

```typescript
// List all active sessions
const devices = await sdk.devices.list();
// Each: { id, name, platform, lastActive, ipAddress, isCurrent, browser }

// Register for push notifications
await sdk.devices.register({
  token: 'fcm-device-token',       // Firebase Cloud Messaging token
  platform: 'android',              // 'web', 'ios', or 'android'
  deviceName: 'Pixel 8 Pro',        // Optional human-readable name
});

// Remove a specific session (remote logout)
const otherDevices = devices.filter(d => !d.isCurrent);
await sdk.devices.remove(otherDevices[0].id);

// Log out of all other devices
await sdk.devices.removeAllOthers();
```

---

### Two-Factor Service

Accessible via `sdk.twoFactor`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `enable` | `(password: string) => Promise<TwoFactorSetupResponse>` | Enable 2FA and get QR code + backup codes |
| `disable` | `(password: string, code: string) => Promise<void>` | Disable 2FA (requires password and current code) |
| `verify` | `(code: string) => Promise<void>` | Verify a 2FA code |
| `getBackupCodes` | `() => Promise<BackupCodesResponse>` | Retrieve existing backup codes |
| `regenerateBackupCodes` | `(password: string) => Promise<BackupCodesResponse>` | Generate new backup codes (invalidates old ones) |

**Examples:**

```typescript
// Enable 2FA
const setup = await sdk.twoFactor.enable('current-password');
// setup.secret -- base32 secret for manual entry
// setup.qrCodeUrl -- URL to display as QR code (otpauth:// URI)
// setup.backupCodes -- one-time backup codes (store securely!)

// Display QR code for user to scan with authenticator app
showQRCode(setup.qrCodeUrl);
showBackupCodes(setup.backupCodes);

// Disable 2FA
await sdk.twoFactor.disable('current-password', '123456');

// Regenerate backup codes
const { codes } = await sdk.twoFactor.regenerateBackupCodes('current-password');
```

---

### Reports Service

Accessible via `sdk.reports`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(data: CreateReportRequest) => Promise<Report>` | Submit a report for a user, message, or conversation |

**Examples:**

```typescript
// Report a user
const report = await sdk.reports.create({
  reportedUserId: 'user-id',
  reportType: 'harassment',
  description: 'This user is sending threatening messages.',
});

// Report a specific message
const report = await sdk.reports.create({
  reportedMessageId: 'message-id',
  reportType: 'spam',
  description: 'This message is unsolicited advertising.',
});

// Report a conversation
const report = await sdk.reports.create({
  reportedConversationId: 'conversation-id',
  reportType: 'inappropriate',
  description: 'This group contains inappropriate content.',
});
```

**Report types:** `'spam'`, `'harassment'`, `'inappropriate'`, `'impersonation'`, `'other'`

---

## Real-Time Integration with SignalR

The SDK handles REST API calls. For real-time features (live messages, typing indicators, presence, call signaling), you need to use SignalR alongside the SDK. The SDK provides the access token that SignalR needs for authentication.

### SignalR Hubs

| Hub | Endpoint | Purpose |
|-----|----------|---------|
| ChatHub | `/hubs/chat` | Messages, typing indicators, reactions, read receipts, message edits/deletes |
| PresenceHub | `/hubs/presence` | Online/offline status, last seen timestamps |
| CallHub | `/hubs/call` | WebRTC signaling for 1:1 voice/video calls |
| NotificationHub | `/hubs/notifications` | Real-time push notifications |

### Browser / Next.js Setup

```typescript
import * as signalR from '@microsoft/signalr';
import { PeopleConnectSDK } from '@peopleconnect/sdk';

const sdk = new PeopleConnectSDK({ baseUrl: 'https://server.com/api', /* ... */ });

// After login, create SignalR connections using the SDK's token
const chatConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://server.com/hubs/chat', {
    accessTokenFactory: () => sdk.getAccessToken() || '',
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .build();

// Listen for real-time messages
chatConnection.on('ReceiveMessage', (message) => {
  console.log('New message:', message);
});

chatConnection.on('MessageEdited', (data) => {
  console.log('Message edited:', data);
});

chatConnection.on('MessageDeleted', (data) => {
  console.log('Message deleted:', data);
});

// Typing indicators
chatConnection.on('UserTyping', (data) => {
  // data: { conversationId, userId, userName }
  showTypingIndicator(data);
});

chatConnection.on('UserStoppedTyping', (data) => {
  hideTypingIndicator(data);
});

// Message delivery and read receipts
chatConnection.on('MessageDelivered', (data) => {
  updateMessageStatus(data.messageId, 'delivered');
});

chatConnection.on('MessageRead', (data) => {
  updateMessageStatus(data.messageId, 'read');
});

await chatConnection.start();

// Send typing indicators via ChatHub
await chatConnection.invoke('StartTyping', conversationId);
await chatConnection.invoke('StopTyping', conversationId);
```

### Key SignalR Events

**ChatHub Events (received from server):**

| Event | Payload | Description |
|-------|---------|-------------|
| `ReceiveMessage` | `Message` | New message in a conversation |
| `MessageEdited` | `{ messageId, content, editedAt }` | Message was edited |
| `MessageDeleted` | `{ messageId, conversationId }` | Message was deleted |
| `MessageDelivered` | `{ messageId, conversationId }` | Message delivery confirmed |
| `MessageRead` | `{ messageId, conversationId }` | Message was read by recipient |
| `MessagesRead` | `{ conversationId, messageIds[], readByUserId }` | Batch read receipt |
| `UserTyping` | `{ conversationId, userId, userName }` | User started typing |
| `UserStoppedTyping` | `{ conversationId, userId, userName }` | User stopped typing |
| `ReactionAdded` | `{ messageId, conversationId, userId, emoji }` | Reaction added to a message |
| `ReactionRemoved` | `{ messageId, conversationId, userId, emoji }` | Reaction removed |
| `ConversationUpdated` | `{ conversationId, ... }` | Conversation metadata changed |
| `ParticipantAdded` | `{ conversationId, userId }` | New member joined a chatroom |
| `ParticipantRemoved` | `{ conversationId, userId }` | Member left or was removed |
| `ViewOnceViewed` | `{ messageId, viewedAt }` | View-once message was viewed |

**ChatHub Methods (invoke on client):**

| Method | Parameters | Description |
|--------|-----------|-------------|
| `StartTyping` | `conversationId: string` | Broadcast typing indicator |
| `StopTyping` | `conversationId: string` | Stop typing indicator |
| `MarkAsRead` | `conversationId: string, messageId: string` | Mark messages as read |

**PresenceHub Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `UserOnline` | `{ userId, username, name }` | User came online |
| `UserOffline` | `{ userId }` | User went offline |
| `OnlineUsers` | `OnlineUserDto[]` | Initial list of online contacts (sent on connect) |

**CallHub Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `IncomingCall` | `{ callId, callerId, callerName, type }` | Incoming 1:1 call |
| `IncomingGroupCall` | `{ conversationId, callerId, callerName, type }` | Incoming group call |
| `CallAccepted` | `{ callId }` | Call was accepted |
| `CallEnded` | `{ callId, reason }` | Call terminated |
| `IceCandidate` | `{ callId, candidate }` | WebRTC ICE candidate |
| `SdpOffer` | `{ callId, sdp }` | WebRTC SDP offer |
| `SdpAnswer` | `{ callId, sdp }` | WebRTC SDP answer |

---

## React Native Integration Guide

### Installation

```bash
npm install @peopleconnect/sdk react-native-keychain
```

### Critical: Lazy Loading Pattern

In React Native (especially with the Hermes engine), top-level SDK imports can cause module initialization failures during hot reload. Always use lazy loading:

```typescript
// BAD - Can crash during hot reload
import { PeopleConnectSDK } from '@peopleconnect/sdk';
const sdk = new PeopleConnectSDK({ /* ... */ });

// GOOD - Lazy loading pattern
let _sdk: import('@peopleconnect/sdk').PeopleConnectSDK | null = null;

function getSDK(): import('@peopleconnect/sdk').PeopleConnectSDK {
  if (_sdk) return _sdk;

  const { PeopleConnectSDK } = require('@peopleconnect/sdk');
  _sdk = new PeopleConnectSDK({
    baseUrl: 'https://your-server.com/api',
    onTokenRefresh: async (tokens) => {
      await Keychain.setGenericPassword(
        'peopleconnect_tokens',
        JSON.stringify(tokens),
      );
    },
    onUnauthorized: () => {
      // Trigger logout in your auth store
    },
  });
  return _sdk;
}
```

### Token Storage with Keychain

Use `react-native-keychain` instead of `AsyncStorage` for secure token storage:

```typescript
import * as Keychain from 'react-native-keychain';

const TOKEN_KEY = 'peopleconnect_tokens';

// Store tokens after login
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  getSDK().setTokens({ accessToken, refreshToken });
  await Keychain.setGenericPassword(
    TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken }),
  );
}

// Restore tokens on app startup
export async function initializeSDK(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials && credentials.password) {
      const tokens = JSON.parse(credentials.password);
      getSDK().setTokens(tokens);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    return false;
  }
}

// Clear tokens on logout
export async function clearTokens(): Promise<void> {
  getSDK().clearTokens();
  await Keychain.resetGenericPassword();
}
```

### Service Proxy Pattern

Expose SDK services as lazy-loaded proxies so the SDK is only initialized when a method is actually called:

```typescript
export const sdk = {
  get auth() { return getSDK().auth; },
  get users() { return getSDK().users; },
  get conversations() { return getSDK().conversations; },
  get messages() { return getSDK().messages; },
  get contacts() { return getSDK().contacts; },
  get calls() { return getSDK().calls; },
  get media() { return getSDK().media; },
  get notifications() { return getSDK().notifications; },
  get broadcasts() { return getSDK().broadcasts; },
  get announcements() { return getSDK().announcements; },
  get search() { return getSDK().search; },
  get devices() { return getSDK().devices; },
  get twoFactor() { return getSDK().twoFactor; },
  get reports() { return getSDK().reports; },
  setTokens: (tokens) => getSDK().setTokens(tokens),
  clearTokens: () => getSDK().clearTokens(),
  getAccessToken: () => getSDK().getAccessToken(),
};
```

### Avatar Upload (React Native)

The SDK's `uploadAvatar` method accepts React Native file objects natively:

```typescript
import { launchImageLibrary } from 'react-native-image-picker';

const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
if (result.assets?.[0]) {
  const { uri, type, fileName } = result.assets[0];
  const { avatarUrl } = await sdk.users.uploadAvatar({
    uri: uri!,
    type: type || 'image/jpeg',
    name: fileName || 'avatar.jpg',
  });
}
```

### SignalR in React Native

```typescript
import * as signalR from '@microsoft/signalr';

// Use lazy loading for token access too
const getToken = () => {
  const sdkModule = require('./sdk');
  return sdkModule.sdk.getAccessToken() || '';
};

const chatConnection = new signalR.HubConnectionBuilder()
  .withUrl('https://your-server.com/hubs/chat', {
    accessTokenFactory: getToken,
    transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .configureLogging(signalR.LogLevel.Warning)
  .build();
```

---

## Error Handling

All SDK methods throw standard JavaScript `Error` objects on failure. The error message contains the server's error message when available.

### Error Structure

```typescript
interface ApiError {
  message: string;                        // Human-readable error message
  code?: string;                          // Machine-readable error code
  details?: Record<string, string[]>;     // Validation errors by field name
}
```

### Catching Errors

```typescript
try {
  await sdk.auth.login({ username: 'john', password: 'wrong' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Login failed:', error.message);
    // error.message might be: "Invalid username or password"
  }
}
```

### Centralized Error Handler

```typescript
const sdk = new PeopleConnectSDK({
  baseUrl: 'https://your-server.com/api',
  onError: (error) => {
    // Called for every non-2xx response, before the error is thrown
    if (error.details) {
      // Validation errors -- show field-level messages
      Object.entries(error.details).forEach(([field, messages]) => {
        console.error(`${field}: ${messages.join(', ')}`);
      });
    } else {
      console.error('API Error:', error.message);
    }
  },
});
```

### Common Error Scenarios

| Scenario | Error Message | How to Handle |
|----------|--------------|---------------|
| Invalid credentials | "Invalid username or password" | Show error on login form |
| Token expired + refresh failed | Triggers `onUnauthorized` callback | Redirect to login |
| Request timeout | "Request timeout" | Retry or show timeout message |
| Network offline | `fetch` network error | Show offline indicator |
| Validation error | Server message + `details` field | Highlight invalid form fields |
| Blocked user | "Cannot send message. This conversation has been blocked." | Disable message input |
| Feature disabled | "Feature X is disabled" | Hide or gray out the feature |
| Rate limited | "Too many requests" | Show retry-after message |

---

## TypeScript Types Reference

All types are exported from the SDK package and can be imported directly:

```typescript
import type {
  // Core entities
  User,
  UserProfile,
  Conversation,
  ConversationDetail,
  Message,
  Contact,
  Attachment,
  Reaction,

  // Enums / union types
  UserStatus,          // 'Online' | 'Away' | 'Busy' | 'Offline'
  MessageType,         // 'Text' | 'Image' | 'Video' | 'Audio' | 'File' | 'Location' | 'System' | 'VoiceCall' | 'VideoCall'
  MessageStatus,       // 'Sent' | 'Delivered' | 'Read' | 'Deleted' | 'Flagged'
  ConversationType,    // 'DirectMessage' | 'Chatroom' | 'BroadcastChannel'
  ContactStatus,       // 'Pending' | 'Accepted' | 'Rejected' | 'Blocked'
  ParticipantRole,     // 'Member' | 'Admin' | 'Owner'
  CallType,            // 'voice' | 'video'
  CallDirection,       // 'incoming' | 'outgoing'
  CallStatus,          // 'completed' | 'missed' | 'rejected' | 'failed'
  ReportType,          // 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other'
  DevicePlatform,      // 'web' | 'ios' | 'android'

  // Request types
  LoginRequest,
  RegisterRequest,
  SendMessageRequest,
  EditMessageRequest,
  CreateDMRequest,
  CreateChatroomRequest,
  UpdateChatroomRequest,
  InitiateCallRequest,
  CreateReportRequest,
  GlobalSearchRequest,
  ConversationSearchRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  TwoFactorVerifyRequest,
  RegisterDeviceRequest,

  // Response types
  LoginResponse,
  CallResponse,
  LiveKitTokenResponse,
  UploadResponse,
  TwoFactorSetupResponse,
  BackupCodesResponse,
  SearchResult,
  ConversationSharedContent,

  // Pagination
  PaginatedResponse,
  PaginationParams,

  // Configuration
  SDKConfig,
  AuthTokens,
  ApiError,
  ApiResponse,
} from '@peopleconnect/sdk';
```

### Key Entity Shapes

**User:**
```typescript
interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  description?: string;
  status: 'Online' | 'Away' | 'Busy' | 'Offline';
  statusMessage?: string;
  twoFactorEnabled?: boolean;
}
```

**Conversation:**
```typescript
interface Conversation {
  id: string;
  type: 'DirectMessage' | 'Chatroom' | 'BroadcastChannel';
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
```

**Message:**
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content?: string;
  type: 'Text' | 'Image' | 'Video' | 'Audio' | 'File' | 'Location' | 'System' | 'VoiceCall' | 'VideoCall';
  replyToMessageId?: string;
  replyToMessage?: Message;
  forwardedFromMessageId?: string;
  status: 'Sent' | 'Delivered' | 'Read' | 'Deleted' | 'Flagged';
  attachments: Attachment[];
  reactions: Reaction[];
  createdAt: string;
  editedAt?: string;
}
```

**Contact:**
```typescript
interface Contact {
  id: string;
  userId: string;
  contactUser: User;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Blocked';
  nickname?: string;
  createdAt: string;
}
```

---

## API Endpoint Mapping

Complete mapping of SDK methods to backend API endpoints.

### Auth Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.auth.login()` | POST | `/auth/login` |
| `sdk.auth.register()` | POST | `/auth/register` |
| `sdk.auth.logout()` | POST | `/auth/logout` |
| `sdk.auth.refreshToken()` | POST | `/auth/refresh` |
| `sdk.auth.getCurrentUser()` | GET | `/auth/me` |
| `sdk.auth.checkUsername()` | GET | `/auth/check-username/{username}` |
| `sdk.auth.verifyTwoFactor()` | POST | `/auth/2fa/verify` |
| `sdk.auth.forgotPassword()` | POST | `/auth/forgot-password` |
| `sdk.auth.resetPassword()` | POST | `/auth/reset-password` |
| `sdk.auth.changePassword()` | POST | `/auth/change-password` |
| `sdk.auth.deleteAccount()` | DELETE | `/auth/account` |
| `sdk.auth.verifyEmail()` | POST | `/auth/verify-email` |
| `sdk.auth.resendVerification()` | POST | `/auth/resend-verification` |

### User Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.users.getProfile()` | GET | `/auth/me` |
| `sdk.users.getUser()` | GET | `/users/{userId}` |
| `sdk.users.uploadAvatar()` | POST | `/auth/avatar` |
| `sdk.users.deleteAvatar()` | DELETE | `/auth/avatar` |
| `sdk.users.updateProfile()` | PUT | `/auth/profile` |

### Conversation Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.conversations.list()` | GET | `/conversations` |
| `sdk.conversations.get()` | GET | `/conversations/{id}` |
| `sdk.conversations.createDM()` | POST | `/conversations/dm` |
| `sdk.conversations.createChatroom()` | POST | `/conversations/chatroom` |
| `sdk.conversations.update()` | PUT | `/conversations/{id}` |
| `sdk.conversations.delete()` | DELETE | `/conversations/{id}` |
| `sdk.conversations.leave()` | POST | `/conversations/{id}/leave` |
| `sdk.conversations.addParticipants()` | POST | `/conversations/{id}/participants` |
| `sdk.conversations.removeParticipant()` | DELETE | `/conversations/{id}/participants/{userId}` |
| `sdk.conversations.updateParticipantRole()` | PATCH | `/conversations/{id}/participants/{userId}/role` |
| `sdk.conversations.getMembers()` | GET | `/conversations/{id}/members` |
| `sdk.conversations.mute()` | POST | `/conversations/{id}/mute` |
| `sdk.conversations.unmute()` | POST | `/conversations/{id}/unmute` |
| `sdk.conversations.archive()` | POST | `/conversations/{id}/archive` |
| `sdk.conversations.unarchive()` | POST | `/conversations/{id}/unarchive` |
| `sdk.conversations.clear()` | POST | `/conversations/{id}/clear` |
| `sdk.conversations.pin()` | POST | `/conversations/{id}/pin` |
| `sdk.conversations.unpin()` | POST | `/conversations/{id}/unpin` |
| `sdk.conversations.markAsRead()` | POST | `/conversations/{id}/read` |
| `sdk.conversations.uploadAvatar()` | POST | `/conversations/{id}/avatar` |

### Message Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.messages.list()` | GET | `/conversations/{id}/messages` |
| `sdk.messages.get()` | GET | `/conversations/{id}/messages/{messageId}` |
| `sdk.messages.send()` | POST | `/conversations/{id}/messages` |
| `sdk.messages.edit()` | PUT | `/conversations/{id}/messages/{messageId}` |
| `sdk.messages.delete()` | DELETE | `/conversations/{id}/messages/{messageId}` |
| `sdk.messages.react()` | POST | `/conversations/{id}/messages/{messageId}/reactions` |
| `sdk.messages.removeReaction()` | DELETE | `/conversations/{id}/messages/{messageId}/reactions` |
| `sdk.messages.forward()` | POST | `/conversations/{id}/messages/{messageId}/forward` |

### Contact Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.contacts.list()` | GET | `/contacts` |
| `sdk.contacts.getRequests()` | GET | `/contacts/requests` |
| `sdk.contacts.searchUsers()` | GET | `/contacts/search` |
| `sdk.contacts.sendRequest()` | POST | `/contacts` |
| `sdk.contacts.acceptRequest()` | POST | `/contacts/requests/{id}/accept` |
| `sdk.contacts.rejectRequest()` | POST | `/contacts/requests/{id}/reject` |
| `sdk.contacts.update()` | PUT | `/contacts/{id}` |
| `sdk.contacts.remove()` | DELETE | `/contacts/{id}` |
| `sdk.contacts.block()` | POST | `/contacts/block/{userId}` |
| `sdk.contacts.unblock()` | DELETE | `/contacts/block/{userId}` |
| `sdk.contacts.getBlocked()` | GET | `/contacts/blocked` |

### Call Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.calls.initiate()` | POST | `/calls/initiate` |
| `sdk.calls.accept()` | POST | `/calls/{id}/accept` |
| `sdk.calls.reject()` | POST | `/calls/{id}/reject` |
| `sdk.calls.end()` | POST | `/calls/{id}/end` |
| `sdk.calls.getHistory()` | GET | `/calls/history` |
| `sdk.calls.get()` | GET | `/calls/{id}` |
| `sdk.calls.delete()` | DELETE | `/calls/{id}` |
| `sdk.calls.getIceServers()` | GET | `/calls/ice-servers` |
| `sdk.calls.getLiveKitToken()` | POST | `/calls/livekit/token` |

### Media Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.media.upload()` | POST | `/media/upload` |
| `sdk.media.uploadMultiple()` | POST | `/media/upload/multiple` |
| `sdk.media.uploadVoice()` | POST | `/media/voice` |
| `sdk.media.get()` | GET | `/media/{id}` |
| `sdk.media.delete()` | DELETE | `/media/{id}` |
| `sdk.media.getConversationMedia()` | GET | `/media/conversation/{id}` |
| `sdk.media.getConversationSharedContent()` | GET | `/media/conversation/{id}/shared` |
| `sdk.media.getDownloadUrl()` | -- | `/media/{id}/download?token=...` (synchronous URL generation) |
| `sdk.media.getThumbnailUrl()` | -- | `/media/{id}/thumbnail?token=...` (synchronous URL generation) |
| `sdk.media.getStreamUrl()` | -- | `/media/{id}/stream?token=...` (synchronous URL generation) |

### Notification Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.notifications.list()` | GET | `/notifications` |
| `sdk.notifications.getUnreadCount()` | GET | `/notifications/count` |
| `sdk.notifications.markAsRead()` | POST | `/notifications/{id}/read` |
| `sdk.notifications.markAllAsRead()` | POST | `/notifications/read-all` |
| `sdk.notifications.delete()` | DELETE | `/notifications/{id}` |

### Broadcast Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.broadcasts.getChannels()` | GET | `/broadcasts/channels` |
| `sdk.broadcasts.getSubscriptions()` | GET | `/broadcasts/channels/subscribed` |
| `sdk.broadcasts.subscribe()` | POST | `/broadcasts/channels/{id}/subscribe` |
| `sdk.broadcasts.unsubscribe()` | DELETE | `/broadcasts/channels/{id}/subscribe` |
| `sdk.broadcasts.getMessages()` | GET | `/broadcasts/channels/{id}/messages` |
| `sdk.broadcasts.getFeed()` | GET | `/broadcasts/messages/feed` |

### Announcement Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.announcements.list()` | GET | `/announcements/my` |
| `sdk.announcements.markAsRead()` | POST | `/announcements/{id}/read` |
| `sdk.announcements.dismiss()` | POST | `/announcements/{id}/dismiss` |

### Search Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.search.search()` | GET | `/search` |
| `sdk.search.searchInConversation()` | GET | `/search/conversations/{id}` |
| `sdk.search.searchUsers()` | GET | `/search` (with type=users) |

### Device Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.devices.list()` | GET | `/auth/sessions` |
| `sdk.devices.register()` | POST | `/devices/register` |
| `sdk.devices.remove()` | DELETE | `/auth/sessions/{id}` |
| `sdk.devices.removeAllOthers()` | DELETE | `/auth/sessions` |

### Two-Factor Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.twoFactor.enable()` | POST | `/auth/2fa/enable` |
| `sdk.twoFactor.disable()` | POST | `/auth/2fa/disable` |
| `sdk.twoFactor.verify()` | POST | `/auth/2fa/verify` |
| `sdk.twoFactor.getBackupCodes()` | GET | `/auth/2fa/backup-codes` |
| `sdk.twoFactor.regenerateBackupCodes()` | POST | `/auth/2fa/backup-codes/regenerate` |

### Report Endpoints

| SDK Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `sdk.reports.create()` | POST | `/reports` |

---

## Migration Guide

If you are migrating from direct `fetch` or Axios calls to this SDK, here is a mapping of common patterns.

### Before (direct fetch)

```typescript
const response = await fetch('https://server.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'john', password: 'pass' }),
});
const data = await response.json();
const { accessToken, refreshToken, user } = data.data; // Unwrap { success, data }
localStorage.setItem('accessToken', accessToken);
```

### After (SDK)

```typescript
const { accessToken, refreshToken, user } = await sdk.auth.login({
  username: 'john',
  password: 'pass',
});
// Tokens are set automatically. Response is already unwrapped.
```

### Before (Axios with interceptors)

```typescript
const api = axios.create({ baseURL: 'https://server.com/api' });
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});
api.interceptors.response.use(
  res => res.data.data, // Unwrap
  async err => {
    if (err.response?.status === 401) {
      // Manual token refresh logic...
    }
    return Promise.reject(err);
  }
);

const conversations = await api.get('/conversations', { params: { page: 1, pageSize: 20 } });
```

### After (SDK)

```typescript
// All of the above is built in
const { items } = await sdk.conversations.list({ page: 1, pageSize: 20 });
```

### Key Differences

| Aspect | Direct API Calls | SDK |
|--------|-----------------|-----|
| Token management | Manual header injection | Automatic |
| Token refresh | Custom interceptor logic | Built-in with request queue |
| Response unwrapping | Manual `data.data` extraction | Automatic |
| Type safety | None (unless you write types) | Full TypeScript types included |
| FormData (React Native) | Manual platform detection | Handles both `File` and `{ uri }` |
| Error format | Raw HTTP response | Parsed `Error` with server message |

---

## License

MIT
