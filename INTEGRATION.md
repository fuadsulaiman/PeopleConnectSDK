# PeopleConnect SDK Integration Guide

Step-by-step integration guides for React Native and Next.js applications, covering authentication, real-time messaging, calls, media handling, and more.

## Table of Contents

- [React Native Integration](#react-native-integration)
  - [1. Project Setup](#1-project-setup)
  - [2. SDK Wrapper Service](#2-sdk-wrapper-service)
  - [3. Authentication Store](#3-authentication-store)
  - [4. SignalR Real-Time Service](#4-signalr-real-time-service)
  - [5. Chat Implementation](#5-chat-implementation)
  - [6. WebRTC 1:1 Calls](#6-webrtc-11-calls)
  - [7. LiveKit Group Calls](#7-livekit-group-calls)
  - [8. Push Notifications](#8-push-notifications)
  - [9. Media and File Uploads](#9-media-and-file-uploads)
- [Next.js Integration](#nextjs-integration)
  - [1. Project Setup](#1-project-setup-1)
  - [2. API Client Setup](#2-api-client-setup)
  - [3. Authentication with Zustand](#3-authentication-with-zustand)
  - [4. SignalR Service](#4-signalr-service)
  - [5. Chat Page Implementation](#5-chat-page-implementation)
- [Authentication Flow](#authentication-flow)
  - [Standard Login Flow](#standard-login-flow)
  - [Two-Factor Authentication Flow](#two-factor-authentication-flow)
  - [Token Refresh Flow](#token-refresh-flow)
  - [Session Expiration Flow](#session-expiration-flow)
- [Token Refresh Mechanism](#token-refresh-mechanism)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)

---

## React Native Integration

### 1. Project Setup

**Install dependencies:**

```bash
npm install @peopleconnect/sdk
npm install react-native-keychain        # Secure token storage
npm install @microsoft/signalr           # Real-time messaging
npm install react-native-webrtc          # 1:1 voice/video calls
npm install @livekit/react-native        # Group video calls
npm install @livekit/react-native-webrtc # WebRTC for LiveKit
npm install react-native-incall-manager  # Call audio routing
npm install zustand                      # State management
npm install @react-native-firebase/messaging  # Push notifications (optional)
```

**iOS additional setup:**

```bash
cd ios && pod install
```

Add to `ios/YourApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Required for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Required for voice and video calls</string>
```

**Android additional setup:**

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### 2. SDK Wrapper Service

Create `src/services/sdk.ts`:

```typescript
import * as Keychain from 'react-native-keychain';

const TOKEN_KEY = 'peopleconnect_tokens';

// Callback for unauthorized handling (set after auth store is ready)
let onUnauthorizedCallback: (() => void) | null = null;

// Lazy-loaded SDK instance
let _sdk: import('@peopleconnect/sdk').PeopleConnectSDK | null = null;

function getSDK(): import('@peopleconnect/sdk').PeopleConnectSDK {
  if (_sdk) return _sdk;

  const { PeopleConnectSDK } = require('@peopleconnect/sdk');

  _sdk = new PeopleConnectSDK({
    baseUrl: 'https://your-server.com/api',

    onTokenRefresh: async (tokens) => {
      try {
        await Keychain.setGenericPassword(
          TOKEN_KEY,
          JSON.stringify(tokens),
        );
      } catch (error) {
        console.error('Failed to store refreshed tokens:', error);
      }
    },

    onUnauthorized: () => {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    },
  });

  return _sdk;
}

// Public SDK proxy
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
  setTokens: (tokens: { accessToken: string; refreshToken: string }) =>
    getSDK().setTokens(tokens),
  clearTokens: () => getSDK().clearTokens(),
  getAccessToken: () => getSDK().getAccessToken(),
};

export function setOnUnauthorizedCallback(callback: () => void): void {
  onUnauthorizedCallback = callback;
}

export async function initializeSDK(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials && credentials.password) {
      const tokens = JSON.parse(credentials.password);
      sdk.setTokens(tokens);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    return false;
  }
}

export async function storeTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  sdk.setTokens({ accessToken, refreshToken });
  await Keychain.setGenericPassword(
    TOKEN_KEY,
    JSON.stringify({ accessToken, refreshToken }),
  );
}

export async function clearTokens(): Promise<void> {
  sdk.clearTokens();
  await Keychain.resetGenericPassword();
}

export default sdk;
```

### 3. Authentication Store

Create `src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';

// Lazy loading to prevent hot-reload crashes
const getSDK = () => require('../services/sdk');

interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  tempUserId: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  verify2FA: (userId: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  requiresTwoFactor: false,
  tempUserId: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { sdk, storeTokens, setOnUnauthorizedCallback } = getSDK();

      // Register the unauthorized callback
      setOnUnauthorizedCallback(() => get().logout());

      const response = await sdk.auth.login({ username, password });

      if (response.requiresTwoFactor) {
        set({
          requiresTwoFactor: true,
          tempUserId: response.user?.id || username,
          isLoading: false,
        });
        return false;
      }

      if (response.user && response.accessToken) {
        await storeTokens(response.accessToken, response.refreshToken);
        set({
          user: {
            id: response.user.id,
            username: response.user.username,
            name: response.user.name,
            email: response.user.email,
            avatarUrl: response.user.avatarUrl,
          },
          isAuthenticated: true,
          isLoading: false,
          requiresTwoFactor: false,
          tempUserId: null,
        });
        return true;
      }

      set({ isLoading: false });
      return false;
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  verify2FA: async (userId, code) => {
    set({ isLoading: true, error: null });
    try {
      const { sdk, storeTokens } = getSDK();
      const response = await sdk.auth.verifyTwoFactor({ userId, code });

      await storeTokens(response.accessToken, response.refreshToken);

      // Fetch the full user profile
      const profile = await sdk.auth.getCurrentUser();

      set({
        user: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
        },
        isAuthenticated: true,
        isLoading: false,
        requiresTwoFactor: false,
        tempUserId: null,
      });
      return true;
    } catch (error: any) {
      set({
        error: error.message || '2FA verification failed',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      const { sdk, clearTokens } = getSDK();
      await sdk.auth.logout().catch(() => {}); // Server logout (best-effort)
      await clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        requiresTwoFactor: false,
        tempUserId: null,
      });
    }
  },

  checkAuth: async () => {
    try {
      const { initializeSDK, sdk } = getSDK();
      const hasTokens = await initializeSDK();
      if (!hasTokens) {
        set({ isLoading: false });
        return false;
      }

      const profile = await sdk.auth.getCurrentUser();
      set({
        user: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));
```

### 4. SignalR Real-Time Service

Create `src/services/signalr.ts`:

```typescript
import * as signalR from '@microsoft/signalr';

const getSDK = () => require('./sdk').sdk;

class SignalRService {
  private chatConnection: signalR.HubConnection | null = null;
  private presenceConnection: signalR.HubConnection | null = null;
  private callConnection: signalR.HubConnection | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private typingHandlers: ((data: any) => void)[] = [];
  private presenceHandlers: ((userId: string, isOnline: boolean) => void)[] = [];
  private callHandlers: Map<string, ((data: any) => void)[]> = new Map();

  async connect(): Promise<void> {
    const sdk = getSDK();
    const token = sdk.getAccessToken();
    if (!token) return;

    const getToken = () => {
      try {
        return getSDK().getAccessToken() || '';
      } catch {
        return '';
      }
    };

    // Chat Hub
    this.chatConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://your-server.com/hubs/chat', {
        accessTokenFactory: getToken,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupChatHandlers();
    await this.chatConnection.start();

    // Presence Hub
    this.presenceConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://your-server.com/hubs/presence', {
        accessTokenFactory: getToken,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupPresenceHandlers();
    await this.presenceConnection.start();

    // Call Hub
    this.callConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://your-server.com/hubs/call', {
        accessTokenFactory: getToken,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupCallHandlers();
    await this.callConnection.start();
  }

  private setupChatHandlers(): void {
    if (!this.chatConnection) return;

    this.chatConnection.on('ReceiveMessage', (message) => {
      this.messageHandlers.forEach((h) => h(message));
    });

    this.chatConnection.on('MessageEdited', (data) => {
      this.messageHandlers.forEach((h) => h({ ...data, edited: true }));
    });

    this.chatConnection.on('MessageDeleted', (data) => {
      this.messageHandlers.forEach((h) => h({ ...data, deleted: true }));
    });

    this.chatConnection.on('UserTyping', (data) => {
      this.typingHandlers.forEach((h) => h(data));
    });

    this.chatConnection.on('UserStoppedTyping', (data) => {
      this.typingHandlers.forEach((h) => h({ ...data, stoppedTyping: true }));
    });
  }

  private setupPresenceHandlers(): void {
    if (!this.presenceConnection) return;

    this.presenceConnection.on('UserOnline', (data) => {
      this.presenceHandlers.forEach((h) => h(data.userId, true));
    });

    this.presenceConnection.on('UserOffline', (data) => {
      this.presenceHandlers.forEach((h) => h(data.userId, false));
    });

    this.presenceConnection.on('OnlineUsers', (users) => {
      users.forEach((u: any) => {
        this.presenceHandlers.forEach((h) => h(u.userId, true));
      });
    });
  }

  private setupCallHandlers(): void {
    if (!this.callConnection) return;

    const callEvents = [
      'IncomingCall',
      'IncomingGroupCall',
      'CallAccepted',
      'CallEnded',
      'IceCandidate',
      'SdpOffer',
      'SdpAnswer',
    ];

    callEvents.forEach((event) => {
      this.callConnection!.on(event, (data) => {
        const handlers = this.callHandlers.get(event) || [];
        handlers.forEach((h) => h(data));
      });
    });
  }

  // Public API: register handlers
  onMessage(handler: (message: any) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onTyping(handler: (data: any) => void): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter((h) => h !== handler);
    };
  }

  onPresence(handler: (userId: string, isOnline: boolean) => void): () => void {
    this.presenceHandlers.push(handler);
    return () => {
      this.presenceHandlers = this.presenceHandlers.filter((h) => h !== handler);
    };
  }

  onCallEvent(event: string, handler: (data: any) => void): () => void {
    if (!this.callHandlers.has(event)) {
      this.callHandlers.set(event, []);
    }
    this.callHandlers.get(event)!.push(handler);
    return () => {
      const handlers = this.callHandlers.get(event) || [];
      this.callHandlers.set(event, handlers.filter((h) => h !== handler));
    };
  }

  // Send typing indicator
  async startTyping(conversationId: string): Promise<void> {
    await this.chatConnection?.invoke('StartTyping', conversationId);
  }

  async stopTyping(conversationId: string): Promise<void> {
    await this.chatConnection?.invoke('StopTyping', conversationId);
  }

  // Mark messages as read
  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    await this.chatConnection?.invoke('MarkAsRead', conversationId, messageId);
  }

  // WebRTC signaling
  async sendIceCandidate(callId: string, candidate: any): Promise<void> {
    await this.callConnection?.invoke('SendIceCandidate', callId, JSON.stringify(candidate));
  }

  async sendSdpOffer(callId: string, sdp: string): Promise<void> {
    await this.callConnection?.invoke('SendSdpOffer', callId, sdp);
  }

  async sendSdpAnswer(callId: string, sdp: string): Promise<void> {
    await this.callConnection?.invoke('SendSdpAnswer', callId, sdp);
  }

  async disconnect(): Promise<void> {
    await this.chatConnection?.stop().catch(() => {});
    await this.presenceConnection?.stop().catch(() => {});
    await this.callConnection?.stop().catch(() => {});
    this.chatConnection = null;
    this.presenceConnection = null;
    this.callConnection = null;
  }

  isConnected(): boolean {
    return this.chatConnection?.state === signalR.HubConnectionState.Connected;
  }
}

export const signalRService = new SignalRService();
export default signalRService;
```

### 5. Chat Implementation

Create `src/stores/chatStore.ts`:

```typescript
import { create } from 'zustand';
import type { Conversation, Message } from '@peopleconnect/sdk';

const getSDK = () => require('../services/sdk').sdk;

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // keyed by conversationId
  activeConversationId: string | null;
  isLoading: boolean;
  hasMore: Record<string, boolean>;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, replyToId?: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  addIncomingMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  hasMore: {},

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const sdk = getSDK();
      const { items } = await sdk.conversations.list({ page: 1, pageSize: 50 });
      set({ conversations: items, isLoading: false });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      set({ isLoading: false });
    }
  },

  loadMessages: async (conversationId) => {
    set({ isLoading: true });
    try {
      const sdk = getSDK();
      const { items, hasMore } = await sdk.messages.list(conversationId, { limit: 50 });
      set((state) => ({
        messages: { ...state.messages, [conversationId]: items },
        hasMore: { ...state.hasMore, [conversationId]: hasMore },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false });
    }
  },

  loadOlderMessages: async (conversationId) => {
    const state = get();
    const currentMessages = state.messages[conversationId] || [];
    if (currentMessages.length === 0 || !state.hasMore[conversationId]) return;

    try {
      const sdk = getSDK();
      const oldestId = currentMessages[currentMessages.length - 1].id;
      const { items, hasMore } = await sdk.messages.list(conversationId, {
        limit: 50,
        before: oldestId,
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: [...(s.messages[conversationId] || []), ...items],
        },
        hasMore: { ...s.hasMore, [conversationId]: hasMore },
      }));
    } catch (error) {
      console.error('Failed to load older messages:', error);
    }
  },

  sendMessage: async (conversationId, content, replyToId) => {
    try {
      const sdk = getSDK();
      const msg = await sdk.messages.send(conversationId, {
        content,
        replyToMessageId: replyToId,
      });
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [msg, ...(state.messages[conversationId] || [])],
        },
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addIncomingMessage: (message) => {
    set((state) => {
      const convMessages = state.messages[message.conversationId] || [];
      // Avoid duplicates
      if (convMessages.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [message, ...convMessages],
        },
      };
    });
  },
}));
```

**Wire SignalR to the chat store in your root component:**

```typescript
// In App.tsx or a provider component
import { signalRService } from './services/signalr';
import { useChatStore } from './stores/chatStore';
import { useAuthStore } from './stores/authStore';

useEffect(() => {
  if (isAuthenticated) {
    signalRService.connect();

    const unsubMessage = signalRService.onMessage((message) => {
      if (!message.deleted && !message.edited) {
        useChatStore.getState().addIncomingMessage(message);
      }
    });

    return () => {
      unsubMessage();
      signalRService.disconnect();
    };
  }
}, [isAuthenticated]);
```

### 6. WebRTC 1:1 Calls

```typescript
import { mediaDevices, RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import { sdk } from '../services/sdk';
import { signalRService } from '../services/signalr';

async function startCall(userId: string, type: 'voice' | 'video') {
  // 1. Get ICE servers from backend
  const iceServers = await sdk.calls.getIceServers();

  // 2. Create peer connection
  const pc = new RTCPeerConnection({
    iceServers: iceServers.map((s) => ({
      urls: s.urls,
      username: s.username || undefined,
      credential: s.credential || undefined,
    })),
  });

  // 3. Get local media
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video',
  });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  // 4. Initiate call via REST API
  const call = await sdk.calls.initiate({ targetUserId: userId, type });

  // 5. Create and send SDP offer via SignalR
  const offer = await pc.createOffer({});
  await pc.setLocalDescription(offer);
  await signalRService.sendSdpOffer(call.callId, JSON.stringify(offer));

  // 6. Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      signalRService.sendIceCandidate(call.callId, event.candidate);
    }
  };

  // 7. Listen for answer via SignalR
  signalRService.onCallEvent('SdpAnswer', async (data) => {
    const answer = JSON.parse(data.sdp);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  signalRService.onCallEvent('IceCandidate', async (data) => {
    const candidate = JSON.parse(data.candidate);
    await pc.addIceCandidate(candidate);
  });

  return { pc, stream, callId: call.callId };
}
```

### 7. LiveKit Group Calls

```typescript
import { Room, RoomEvent, VideoPresets } from '@livekit/react-native';
import { sdk } from '../services/sdk';

async function joinGroupCall(conversationId: string) {
  // 1. Get LiveKit token from backend
  const { token, url, roomName } = await sdk.calls.getLiveKitToken(conversationId);

  // 2. Create and connect to the LiveKit room
  const room = new Room();

  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    // Handle new remote track (render video/audio)
  });

  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    // Handle track removal
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    // Handle participant leaving
  });

  await room.connect(url, token, {
    autoSubscribe: true,
  });

  // 3. Enable camera and microphone
  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);

  return room;
}

// Leave the call
async function leaveGroupCall(room: Room) {
  // Disable tracks before disconnecting
  await room.localParticipant.setCameraEnabled(false);
  await room.localParticipant.setMicrophoneEnabled(false);
  await room.disconnect();
}
```

### 8. Push Notifications

```typescript
import messaging from '@react-native-firebase/messaging';
import { sdk } from '../services/sdk';

async function setupPushNotifications() {
  // 1. Request permission
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  // 2. Get FCM token
  const fcmToken = await messaging().getToken();

  // 3. Register with backend
  await sdk.devices.register({
    token: fcmToken,
    platform: 'android', // or 'ios'
    deviceName: 'My Phone',
  });

  // 4. Handle token refresh
  messaging().onTokenRefresh(async (newToken) => {
    await sdk.devices.register({
      token: newToken,
      platform: 'android',
    });
  });

  // 5. Handle incoming notifications
  messaging().onMessage(async (remoteMessage) => {
    // Handle foreground notification
    console.log('Notification received:', remoteMessage);
  });

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    // Handle background notification
    console.log('Background notification:', remoteMessage);
  });
}
```

### 9. Media and File Uploads

```typescript
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { sdk } from '../services/sdk';

// Upload an image from gallery
async function uploadImage(conversationId: string) {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
  });

  if (!result.assets?.[0]) return;
  const { uri, type, fileName } = result.assets[0];

  // For React Native, create a FormData manually
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: type || 'image/jpeg',
    name: fileName || 'photo.jpg',
  } as any);

  // Upload and send as message
  const uploaded = await sdk.media.upload(formData as any, conversationId);
  await sdk.messages.send(conversationId, {
    content: '',
    type: 'Image',
    attachmentIds: [uploaded.id],
  });
}

// Upload a document
async function uploadDocument(conversationId: string) {
  const result = await DocumentPicker.pick({
    type: [DocumentPicker.types.allFiles],
  });

  const file = result[0];
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'application/octet-stream',
    name: file.name || 'document',
  } as any);

  const uploaded = await sdk.media.upload(formData as any, conversationId);
  await sdk.messages.send(conversationId, {
    content: file.name || 'Document',
    type: 'File',
    attachmentIds: [uploaded.id],
  });
}

// Display media with authenticated URLs
function getMediaUrl(fileId: string): string {
  return sdk.media.getDownloadUrl(fileId);
}

function getThumbnailUrl(fileId: string): string {
  return sdk.media.getThumbnailUrl(fileId);
}
```

---

## Next.js Integration

### 1. Project Setup

```bash
npx create-next-app@latest my-chat-app --typescript --tailwind
cd my-chat-app

npm install @peopleconnect/sdk
npm install @microsoft/signalr
npm install zustand
```

### 2. API Client Setup

Create `src/lib/sdk.ts`:

```typescript
import { PeopleConnectSDK } from '@peopleconnect/sdk';

let sdkInstance: PeopleConnectSDK | null = null;

export function getSDK(): PeopleConnectSDK {
  if (sdkInstance) return sdkInstance;

  sdkInstance = new PeopleConnectSDK({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://your-server.com/api',
    timeout: 30000,

    onTokenRefresh: (tokens) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
    },

    onUnauthorized: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    },
  });

  // Restore tokens from storage
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      sdkInstance.setTokens({ accessToken, refreshToken });
    }
  }

  return sdkInstance;
}

export const sdk = new Proxy({} as PeopleConnectSDK, {
  get(_, prop: keyof PeopleConnectSDK) {
    return getSDK()[prop];
  },
});

export default sdk;
```

### 3. Authentication with Zustand

Create `src/store/auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@peopleconnect/sdk';
import { getSDK } from '@/lib/sdk';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        const sdk = getSDK();
        try {
          const response = await sdk.auth.login({ username, password });

          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const sdk = getSDK();
        await sdk.auth.logout().catch(() => {});
        sdk.clearTokens();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

### 4. SignalR Service

Create `src/services/signalr-service.ts`:

```typescript
import * as signalR from '@microsoft/signalr';
import { getSDK } from '@/lib/sdk';

const SIGNALR_URL =
  process.env.NEXT_PUBLIC_SIGNALR_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ||
  '';

class SignalRService {
  private chatConnection: signalR.HubConnection | null = null;
  private presenceConnection: signalR.HubConnection | null = null;

  async connect(): Promise<void> {
    const sdk = getSDK();
    const getToken = () => sdk.getAccessToken() || '';

    // Chat Hub
    this.chatConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}/hubs/chat`, {
        accessTokenFactory: getToken,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // Presence Hub
    this.presenceConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}/hubs/presence`, {
        accessTokenFactory: getToken,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    await Promise.all([
      this.chatConnection.start(),
      this.presenceConnection.start(),
    ]);
  }

  onMessage(handler: (message: any) => void): void {
    this.chatConnection?.on('ReceiveMessage', handler);
  }

  onMessageEdited(handler: (data: any) => void): void {
    this.chatConnection?.on('MessageEdited', handler);
  }

  onMessageDeleted(handler: (data: any) => void): void {
    this.chatConnection?.on('MessageDeleted', handler);
  }

  onTyping(handler: (data: any) => void): void {
    this.chatConnection?.on('UserTyping', handler);
    this.chatConnection?.on('UserStoppedTyping', (data: any) => {
      handler({ ...data, stoppedTyping: true });
    });
  }

  onPresence(handler: (data: any) => void): void {
    this.presenceConnection?.on('UserOnline', (data) => handler({ ...data, isOnline: true }));
    this.presenceConnection?.on('UserOffline', (data) => handler({ ...data, isOnline: false }));
  }

  async startTyping(conversationId: string): Promise<void> {
    await this.chatConnection?.invoke('StartTyping', conversationId);
  }

  async stopTyping(conversationId: string): Promise<void> {
    await this.chatConnection?.invoke('StopTyping', conversationId);
  }

  async disconnect(): Promise<void> {
    await this.chatConnection?.stop().catch(() => {});
    await this.presenceConnection?.stop().catch(() => {});
  }
}

export const signalRService = new SignalRService();
export default signalRService;
```

### 5. Chat Page Implementation

Create `src/app/(chat)/chat/page.tsx`:

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { sdk } from '@/lib/sdk';
import { signalRService } from '@/services/signalr-service';
import { useAuthStore } from '@/store/auth-store';
import type { Conversation, Message } from '@peopleconnect/sdk';

export default function ChatPage() {
  const { isAuthenticated } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasMore, setHasMore] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!isAuthenticated) return;

    sdk.conversations.list({ page: 1, pageSize: 50 }).then(({ items }) => {
      setConversations(items);
    });
  }, [isAuthenticated]);

  // Connect SignalR
  useEffect(() => {
    if (!isAuthenticated) return;

    signalRService.connect();

    signalRService.onMessage((message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [message, ...prev];
      });
    });

    return () => {
      signalRService.disconnect();
    };
  }, [isAuthenticated]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return;

    sdk.messages.list(activeConv, { limit: 50 }).then(({ items, hasMore: more }) => {
      setMessages(items);
      setHasMore(more);
    });
  }, [activeConv]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    try {
      const msg = await sdk.messages.send(activeConv, { content: input });
      setMessages((prev) => [msg, ...prev]);
      setInput('');
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  // Load older messages (infinite scroll)
  const loadMore = async () => {
    if (!activeConv || !hasMore || messages.length === 0) return;
    const oldestId = messages[messages.length - 1].id;
    const { items, hasMore: more } = await sdk.messages.list(activeConv, {
      limit: 50,
      before: oldestId,
    });
    setMessages((prev) => [...prev, ...items]);
    setHasMore(more);
  };

  return (
    <div className="flex h-screen">
      {/* Conversation List */}
      <div className="w-80 border-r overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setActiveConv(conv.id)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${
              activeConv === conv.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="font-medium">{conv.name || 'Direct Message'}</div>
            <div className="text-sm text-gray-500 truncate">
              {conv.lastMessage?.content}
            </div>
            {conv.unreadCount > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-2 text-xs">
                {conv.unreadCount}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
          {messages.map((msg) => (
            <div key={msg.id} className="mb-2">
              <span className="font-medium">{msg.sender?.name}: </span>
              <span>{msg.content}</span>
            </div>
          ))}
          {hasMore && (
            <button onClick={loadMore} className="text-blue-500">
              Load older messages
            </button>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Type a message..."
          />
          <button onClick={handleSend} className="bg-blue-500 text-white px-4 py-2 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Authentication Flow

### Standard Login Flow

```
User                   SDK                    Backend
 |                      |                       |
 |-- login(user,pass) ->|                       |
 |                      |-- POST /auth/login -->|
 |                      |                       |-- Validate credentials
 |                      |                       |-- Generate JWT tokens
 |                      |<-- LoginResponse -----|
 |                      |                       |
 |                      |-- Store tokens        |
 |                      |   internally          |
 |                      |                       |
 |                      |-- onTokenRefresh() -->|  (callback to persist)
 |                      |                       |
 |<-- LoginResponse ----|                       |
 |                      |                       |
 |-- sdk.conversations  |                       |
 |   .list()           >|                       |
 |                      |-- GET /conversations  |
 |                      |   (with Bearer token) |
 |                      |<-- Conversations -----|
 |<-- conversations ----|                       |
```

### Two-Factor Authentication Flow

```
User                   SDK                    Backend
 |                      |                       |
 |-- login(user,pass) ->|                       |
 |                      |-- POST /auth/login -->|
 |                      |<-- requiresTwoFactor  |
 |                      |    = true             |
 |<-- requiresTwoFactor |                       |
 |                      |                       |
 |  (show 2FA input)    |                       |
 |                      |                       |
 |-- verifyTwoFactor    |                       |
 |   (userId, code) --->|                       |
 |                      |-- POST /auth/2fa      |
 |                      |   /verify ----------->|
 |                      |                       |-- Validate TOTP code
 |                      |                       |-- Generate JWT tokens
 |                      |<-- LoginResponse -----|
 |                      |                       |
 |<-- LoginResponse ----|                       |
 |                      |                       |
 |-- setTokens() ------>|                       |
 |                      |-- Store tokens        |
```

### Token Refresh Flow

```
User                   SDK                    Backend
 |                      |                       |
 |-- any API call ----->|                       |
 |                      |-- GET /api/... ------>|
 |                      |<-- 401 Unauthorized --|
 |                      |                       |
 |                      |-- POST /auth/refresh  |
 |                      |   (refreshToken) ---->|
 |                      |                       |-- Validate refresh token
 |                      |                       |-- Issue new tokens
 |                      |<-- New tokens --------|
 |                      |                       |
 |                      |-- onTokenRefresh() -->|  (persist new tokens)
 |                      |                       |
 |                      |-- Replay original     |
 |                      |   request with new -->|
 |                      |   access token        |
 |                      |<-- Original response -|
 |                      |                       |
 |<-- Original result --|                       |
```

### Session Expiration Flow

```
User                   SDK                    Backend
 |                      |                       |
 |-- any API call ----->|                       |
 |                      |-- GET /api/... ------>|
 |                      |<-- 401 Unauthorized --|
 |                      |                       |
 |                      |-- POST /auth/refresh  |
 |                      |   (refreshToken) ---->|
 |                      |<-- 401 (expired) -----|
 |                      |                       |
 |                      |-- onUnauthorized() -->|  (callback triggered)
 |                      |                       |
 |<-- Error thrown -----|                       |
 |                      |                       |
 |  (redirect to login) |                       |
```

---

## Token Refresh Mechanism

The SDK implements a sophisticated token refresh system with request queuing.

### How It Works

1. **Detection**: When any API request receives a 401 response and a refresh token is available, the SDK initiates a token refresh automatically.

2. **Single Refresh**: Only one refresh request is made at a time. If multiple requests fail with 401 simultaneously, only the first triggers a refresh; the rest are queued.

3. **Queue and Replay**: Queued requests wait for the refresh to complete, then replay with the new access token.

4. **Callback**: After successful refresh, the `onTokenRefresh` callback is invoked with the new tokens so you can persist them.

5. **Failure**: If the refresh itself fails (e.g., refresh token expired), the `onUnauthorized` callback is invoked, and all queued requests are rejected.

### Concurrency Handling

```
Time ------>

Request A: GET /conversations  --> 401  --> [QUEUED]
Request B: GET /contacts       --> 401  --> [QUEUED]
Request C: GET /notifications  --> 401  --> [QUEUED]

                                    |
                        POST /auth/refresh  (single request)
                                    |
                               New tokens
                                    |
                        +-----------+-----------+
                        |           |           |
                   Replay A    Replay B    Replay C
                   (new token) (new token) (new token)
```

### Refresh Exclusion

The refresh token endpoint (`/auth/refresh`) is excluded from the automatic refresh logic to prevent infinite loops. If you call `sdk.auth.refreshToken()` directly and it fails, the error is thrown as-is.

---

## Best Practices

### 1. Always Use Lazy Loading in React Native

```typescript
// Always use require() instead of import for the SDK in React Native
const getSDK = () => require('./sdk').sdk;
```

This prevents crashes during React Native hot reload where module re-initialization fails.

### 2. Handle All Login Response States

```typescript
const response = await sdk.auth.login({ username, password });

if (response.requiresTwoFactor) { /* show 2FA screen */ }
if (response.requiresPasswordChange) { /* show change password screen */ }
if (response.requiresTwoFactorSetup) { /* show 2FA setup screen */ }
if (response.activeWarnings?.length) { /* show warning dialog */ }
```

### 3. Upload Before Send

Always upload media files first, get the attachment ID, then include it in the message:

```typescript
// Correct: upload first, then send
const uploaded = await sdk.media.upload(file, conversationId);
await sdk.messages.send(conversationId, {
  content: 'Photo',
  attachmentIds: [uploaded.id],
});
```

### 4. Use Cursor-Based Pagination for Messages

Messages use `before`/`after` (message IDs) not `page`/`pageSize`:

```typescript
// First load
const { items, hasMore } = await sdk.messages.list(convId, { limit: 50 });

// Load older (scroll up)
const older = await sdk.messages.list(convId, {
  limit: 50,
  before: items[items.length - 1].id,
});
```

### 5. Register the onUnauthorized Callback Early

Set up the callback as soon as your auth store is ready:

```typescript
setOnUnauthorizedCallback(() => {
  useAuthStore.getState().logout();
});
```

### 6. Clean Up SignalR on Logout

Always disconnect SignalR when logging out:

```typescript
const logout = async () => {
  await signalRService.disconnect();
  await sdk.auth.logout();
  await clearTokens();
};
```

### 7. Deduplicate SignalR Messages

SignalR may deliver a message that was also returned by the `send()` call:

```typescript
signalRService.onMessage((message) => {
  setMessages((prev) => {
    if (prev.some((m) => m.id === message.id)) return prev; // Skip duplicate
    return [message, ...prev];
  });
});
```

### 8. Use Media URL Helpers

The SDK provides synchronized URL generators that embed the current access token:

```typescript
// These are synchronous -- no network request
const url = sdk.media.getDownloadUrl(fileId);
const thumb = sdk.media.getThumbnailUrl(fileId);
const stream = sdk.media.getStreamUrl(fileId);
```

Note: These URLs contain the access token as a query parameter. They will stop working when the token expires. Regenerate URLs when the token is refreshed.

---

## Common Pitfalls

### 1. Top-Level Import Crashes in React Native

**Problem:** Importing the SDK at the top level of a file causes crashes during hot reload.

```typescript
// This causes crashes:
import { PeopleConnectSDK } from '@peopleconnect/sdk';
```

**Solution:** Use `require()` inside a function:

```typescript
const getSDK = () => {
  const { PeopleConnectSDK } = require('@peopleconnect/sdk');
  return new PeopleConnectSDK({ ... });
};
```

### 2. Forgetting to Restore Tokens on App Startup

**Problem:** After closing and reopening the app, the user is logged out because tokens were not restored.

**Solution:** Call `initializeSDK()` or manually `setTokens()` before making any API calls:

```typescript
// In your app startup
const hasTokens = await initializeSDK();
if (hasTokens) {
  // User is still logged in -- verify with getCurrentUser
  const user = await sdk.auth.getCurrentUser();
}
```

### 3. Not Handling the requiresTwoFactor Response

**Problem:** After login, the app proceeds as if authenticated but the user needs to verify 2FA.

**Solution:** Always check `requiresTwoFactor` in the login response:

```typescript
const response = await sdk.auth.login({ username, password });
if (response.requiresTwoFactor) {
  // Do NOT proceed to the main screen
  // Show the 2FA verification screen instead
}
```

### 4. Calling setTokens After login()

**Problem:** Calling `setTokens` after `login()` is redundant because `login()` already sets tokens internally.

**Solution:** Only call `setTokens` when restoring tokens from storage, not after login/register:

```typescript
// After login -- tokens are already set
const response = await sdk.auth.login({ ... });
// Just persist to storage
await storeTokens(response.accessToken, response.refreshToken);

// On app startup -- tokens need to be restored
sdk.setTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
```

### 5. Using Page-Based Pagination for Messages

**Problem:** Using `page` and `pageSize` for messages causes inconsistent results as new messages arrive.

**Solution:** Use cursor-based pagination with `before`/`after`:

```typescript
// Correct
const { items } = await sdk.messages.list(convId, { limit: 50, before: lastMessageId });

// Incorrect -- do not do this for messages
const { items } = await sdk.messages.list(convId, { page: 2, pageSize: 50 });
```

### 6. Not Sanitizing ICE Servers for Android

**Problem:** Android WebRTC crashes if ICE server objects contain `null` values for `username` or `credential`.

**Solution:** Filter out null/undefined values:

```typescript
const iceServers = await sdk.calls.getIceServers();
const sanitized = iceServers.map((server) => {
  const clean: any = { urls: server.urls };
  if (server.username) clean.username = server.username;
  if (server.credential) clean.credential = server.credential;
  return clean;
});
```

### 7. SignalR Event Name Casing

**Problem:** The server may send events with different casing (e.g., `MessageRead` vs `messageread`).

**Solution:** Register handlers for both casings:

```typescript
connection.on('MessageRead', handler);
connection.on('messageread', handler);
```

### 8. Media URLs Expiring After Token Refresh

**Problem:** Media URLs generated with `getDownloadUrl()` contain the access token and stop working after token refresh.

**Solution:** Regenerate media URLs when you detect a token refresh:

```typescript
const sdk = new PeopleConnectSDK({
  baseUrl: '...',
  onTokenRefresh: (tokens) => {
    saveTokens(tokens);
    // Trigger a re-render to regenerate media URLs
    eventEmitter.emit('tokens-refreshed');
  },
});
```

---

## License

MIT
