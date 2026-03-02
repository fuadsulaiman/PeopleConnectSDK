# PeopleConnect SDK

Official TypeScript SDK for the PeopleConnect API. A comprehensive, type-safe client for building applications with PeopleConnect's real-time communication platform.

## Features

- **Full TypeScript Support** - Complete type definitions for all API endpoints
- **Authentication** - Login, register, 2FA, password management
- **Messaging** - Send, edit, delete, react, and forward messages
- **Conversations** - Direct messages, chatrooms, participants management
- **Calls** - Voice/video calls with WebRTC and LiveKit support
- **Contacts** - Contact management, blocking, search
- **Media** - File uploads, voice messages, thumbnails
- **Notifications** - Push notifications, read status
- **Broadcasts** - Channel subscriptions, message feeds
- **Search** - Global search across users, conversations, messages
- **Automatic Token Refresh** - Seamless token management

## Installation

```bash
npm install @peopleconnect/sdk
# or
yarn add @peopleconnect/sdk
# or
pnpm add @peopleconnect/sdk
```

## Quick Start

```typescript
import { PeopleConnectSDK } from '@peopleconnect/sdk';

// Initialize the SDK
const sdk = new PeopleConnectSDK({
  baseUrl: 'https://api.example.com/api',
  onTokenRefresh: (tokens) => {
    // Store tokens for persistence
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },
  onUnauthorized: () => {
    // Handle session expiration
    window.location.href = '/login';
  },
});

// Login
const { user, accessToken, refreshToken } = await sdk.auth.login({
  username: 'john',
  password: 'password123',
});

// Get conversations
const conversations = await sdk.conversations.list();

// Send a message
await sdk.messages.send('conversation-id', {
  content: 'Hello, World!',
});
```

## Configuration

```typescript
interface SDKConfig {
  // Required: API base URL
  baseUrl: string;

  // Optional: Request timeout in milliseconds (default: 30000)
  timeout?: number;

  // Optional: Called when tokens are refreshed
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;

  // Optional: Called when user is unauthorized (token expired and refresh failed)
  onUnauthorized?: () => void;

  // Optional: Called on API errors
  onError?: (error: ApiError) => void;
}
```

## API Reference

### Authentication

```typescript
// Login
const response = await sdk.auth.login({
  username: 'john',
  password: 'password123',
});

// Register
const response = await sdk.auth.register({
  name: 'John Doe',
  username: 'john',
  password: 'password123',
  email: 'john@example.com',
});

// Logout
await sdk.auth.logout();

// Get current user
const user = await sdk.auth.getCurrentUser();

// Check username availability
const { available } = await sdk.auth.checkUsername('john');

// Change password
await sdk.auth.changePassword({
  currentPassword: 'oldPassword',
  newPassword: 'newPassword',
});

// Forgot password
await sdk.auth.forgotPassword('john@example.com');

// Reset password
await sdk.auth.resetPassword({
  token: 'reset-token',
  newPassword: 'newPassword',
});

// Verify two-factor code
const response = await sdk.auth.verifyTwoFactor({
  code: '123456',
  userId: 'user-id',
});
```

### Users

```typescript
// Get user profile
const profile = await sdk.users.getProfile();

// Get user by ID
const user = await sdk.users.getUser('user-id');

// Upload avatar
const { avatarUrl } = await sdk.users.uploadAvatar(file);

// Delete avatar
await sdk.users.deleteAvatar();
```

### Conversations

```typescript
// List conversations
const { items, totalCount } = await sdk.conversations.list({
  page: 1,
  pageSize: 20,
});

// Get conversation details
const conversation = await sdk.conversations.get('conversation-id');

// Create DM
const dm = await sdk.conversations.createDM({ userId: 'user-id' });

// Create chatroom
const chatroom = await sdk.conversations.createChatroom({
  name: 'My Group',
  description: 'A test group',
  participantIds: ['user-1', 'user-2'],
});

// Update chatroom
await sdk.conversations.update('chatroom-id', {
  name: 'New Name',
  description: 'New description',
});

// Add participants
await sdk.conversations.addParticipants('chatroom-id', ['user-3', 'user-4']);

// Remove participant
await sdk.conversations.removeParticipant('chatroom-id', 'user-3');

// Update participant role
await sdk.conversations.updateParticipantRole('chatroom-id', 'user-2', 'Admin');

// Get members
const members = await sdk.conversations.getMembers('chatroom-id');

// Mute/unmute
await sdk.conversations.mute('conversation-id', '2024-12-31T23:59:59Z');
await sdk.conversations.unmute('conversation-id');

// Archive/unarchive
await sdk.conversations.archive('conversation-id');
await sdk.conversations.unarchive('conversation-id');

// Pin/unpin
await sdk.conversations.pin('conversation-id');
await sdk.conversations.unpin('conversation-id');

// Mark as read
await sdk.conversations.markAsRead('conversation-id', 'last-message-id');

// Leave conversation
await sdk.conversations.leave('conversation-id');

// Delete conversation
await sdk.conversations.delete('conversation-id');
```

### Messages

```typescript
// List messages
const { items, hasMore } = await sdk.messages.list('conversation-id', {
  limit: 50,
  before: 'message-id', // For pagination
});

// Get single message
const message = await sdk.messages.get('conversation-id', 'message-id');

// Send message
const message = await sdk.messages.send('conversation-id', {
  content: 'Hello!',
});

// Send message with attachments
const message = await sdk.messages.send('conversation-id', {
  content: 'Check this out!',
  attachmentIds: ['attachment-1', 'attachment-2'],
});

// Reply to message
const reply = await sdk.messages.send('conversation-id', {
  content: 'This is a reply',
  replyToMessageId: 'original-message-id',
});

// Edit message
await sdk.messages.edit('conversation-id', 'message-id', {
  content: 'Edited content',
});

// Delete message
await sdk.messages.delete('conversation-id', 'message-id', false); // For self
await sdk.messages.delete('conversation-id', 'message-id', true);  // For everyone

// React to message
await sdk.messages.react('conversation-id', 'message-id', '👍');

// Remove reaction
await sdk.messages.removeReaction('conversation-id', 'message-id', '👍');

// Forward message
await sdk.messages.forward('conversation-id', 'message-id', ['conv-2', 'conv-3']);
```

### Contacts

```typescript
// List contacts
const { items } = await sdk.contacts.list({
  page: 1,
  pageSize: 50,
  search: 'john',
});

// Get contact requests
const { received, sent } = await sdk.contacts.getRequests();

// Search users
const users = await sdk.contacts.searchUsers('john', 20);

// Send contact request
const contact = await sdk.contacts.sendRequest('user-id', 'Johnny');

// Accept/reject request
await sdk.contacts.acceptRequest('contact-id');
await sdk.contacts.rejectRequest('contact-id');

// Update contact
await sdk.contacts.update('contact-id', 'New Nickname');

// Remove contact
await sdk.contacts.remove('contact-id');

// Block/unblock
await sdk.contacts.block('user-id');
await sdk.contacts.unblock('user-id');

// Get blocked contacts
const blocked = await sdk.contacts.getBlocked();
```

### Calls

```typescript
// Initiate call
const call = await sdk.calls.initiate({
  targetUserId: 'user-id',
  type: 'video',
});

// Initiate group call
const call = await sdk.calls.initiate({
  conversationId: 'chatroom-id',
  type: 'video',
});

// Accept call
const call = await sdk.calls.accept('call-id');

// Reject call
await sdk.calls.reject('call-id');

// End call
await sdk.calls.end('call-id');

// Get call history
const { items } = await sdk.calls.getHistory({ page: 1, pageSize: 20 });

// Get ICE servers (for WebRTC)
const iceServers = await sdk.calls.getIceServers();

// Get LiveKit token (for group calls)
const { token, url, roomName } = await sdk.calls.getLiveKitToken('conversation-id');
```

### Media

```typescript
// Upload file
const file = await sdk.media.upload(fileInput, 'conversation-id', (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

// Upload multiple files
const { uploaded, errors } = await sdk.media.uploadMultiple(files, 'conversation-id');

// Upload voice message
const voice = await sdk.media.uploadVoice(audioBlob, 'conversation-id', durationInSeconds);

// Get file info
const fileInfo = await sdk.media.get('file-id');

// Delete file
await sdk.media.delete('file-id');

// Get conversation media
const { items } = await sdk.media.getConversationMedia('conversation-id', {
  type: 'image', // 'image', 'video', 'audio', 'file'
  page: 1,
  pageSize: 20,
});

// Get URLs
const downloadUrl = sdk.media.getDownloadUrl('file-id');
const thumbnailUrl = sdk.media.getThumbnailUrl('file-id');
const streamUrl = sdk.media.getStreamUrl('file-id');
```

### Notifications

```typescript
// List notifications
const { items, unreadCount } = await sdk.notifications.list({
  page: 1,
  pageSize: 20,
});

// Get unread count
const count = await sdk.notifications.getUnreadCount();

// Mark as read
await sdk.notifications.markAsRead('notification-id');

// Mark all as read
await sdk.notifications.markAllAsRead();

// Delete notification
await sdk.notifications.delete('notification-id');
```

### Broadcasts

```typescript
// Get all channels
const channels = await sdk.broadcasts.getChannels();

// Get subscribed channels
const subscriptions = await sdk.broadcasts.getSubscriptions();

// Subscribe/unsubscribe
await sdk.broadcasts.subscribe('channel-id');
await sdk.broadcasts.unsubscribe('channel-id');

// Get channel messages
const { items } = await sdk.broadcasts.getMessages('channel-id', 50);

// Get feed (all subscribed channels)
const { items } = await sdk.broadcasts.getFeed(50);
```

### Announcements

```typescript
// Get announcements
const announcements = await sdk.announcements.list(false); // false = all, true = unread only

// Mark as read
await sdk.announcements.markAsRead('announcement-id');

// Dismiss
await sdk.announcements.dismiss('announcement-id');
```

### Search

```typescript
// Global search
const { users, messages, conversations } = await sdk.search.search({
  query: 'hello',
  types: ['users', 'messages', 'conversations'],
  limit: 20,
});

// Search in conversation
const messages = await sdk.search.searchInConversation({
  conversationId: 'conversation-id',
  query: 'hello',
  limit: 20,
});

// Search users only
const users = await sdk.search.searchUsers('john', 20);
```

### Devices

```typescript
// List devices/sessions
const devices = await sdk.devices.list();

// Register device (for push notifications)
await sdk.devices.register({
  token: 'fcm-token',
  platform: 'android', // 'web', 'ios', 'android'
  deviceName: 'Pixel 6',
});

// Remove device
await sdk.devices.remove('device-id');

// Remove all other sessions
await sdk.devices.removeAllOthers();
```

### Two-Factor Authentication

```typescript
// Enable 2FA
const { secret, qrCodeUrl, backupCodes } = await sdk.twoFactor.enable('password');

// Disable 2FA
await sdk.twoFactor.disable('password', '123456');

// Verify code
await sdk.twoFactor.verify('123456');

// Get backup codes
const { codes } = await sdk.twoFactor.getBackupCodes();

// Regenerate backup codes
const { codes } = await sdk.twoFactor.regenerateBackupCodes('password');
```

### Reports

```typescript
// Report a user
const report = await sdk.reports.create({
  reportedUserId: 'user-id',
  reportType: 'harassment',
  description: 'This user is sending harassing messages.',
});

// Report a message
const report = await sdk.reports.create({
  reportedMessageId: 'message-id',
  reportType: 'spam',
  description: 'This is spam.',
});
```

## Error Handling

```typescript
try {
  await sdk.auth.login({ username: 'john', password: 'wrong' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Login failed:', error.message);
  }
}

// Or use the onError callback
const sdk = new PeopleConnectSDK({
  baseUrl: 'https://api.example.com/api',
  onError: (error) => {
    console.error('API Error:', error.message, error.code);
  },
});
```

## Token Management

```typescript
// Set tokens manually (e.g., from storage)
sdk.setTokens({
  accessToken: localStorage.getItem('accessToken')!,
  refreshToken: localStorage.getItem('refreshToken')!,
});

// Clear tokens (logout)
sdk.clearTokens();

// Get current access token
const token = sdk.getAccessToken();
```

## TypeScript Support

All types are exported for use in your application:

```typescript
import type {
  User,
  Conversation,
  Message,
  Contact,
  CallHistoryItem,
  // ... and many more
} from '@peopleconnect/sdk';
```

## License

MIT
