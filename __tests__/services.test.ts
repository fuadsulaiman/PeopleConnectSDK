/**
 * Service-Level Unit Tests
 *
 * Tests for key service methods in the PeopleConnect TypeScript SDK.
 * Each service is tested through the SDK's public interface, mocking fetch.
 */

import { PeopleConnectSDK } from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSDK(
  overrides: Partial<ConstructorParameters<typeof PeopleConnectSDK>[0]> = {}
) {
  return new PeopleConnectSDK({
    baseUrl: "https://api.example.com/api",
    ...overrides,
  });
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    redirected: false,
    statusText: "OK",
    type: "basic" as ResponseType,
    url: "",
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    text: jest.fn(),
  } as unknown as Response;
}

function lastFetchCall(): [string, RequestInit] {
  const calls = (global.fetch as jest.Mock).mock.calls;
  return calls[calls.length - 1];
}

function allFetchCalls(): [string, RequestInit][] {
  return (global.fetch as jest.Mock).mock.calls;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
const originalConsoleLog = console.log;

beforeEach(() => {
  global.fetch = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
  console.log = originalConsoleLog;
});

// ===========================================================================
// AuthService
// ===========================================================================

describe("AuthService", () => {
  test("login sets tokens on the SDK after successful response", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "new-at",
        refreshToken: "new-rt",
        user: { id: "u1", name: "Alice", username: "alice", status: "Online" },
        sessionId: "s1",
      })
    );

    const result = await sdk.auth.login({ username: "alice", password: "pass" });
    expect(result.accessToken).toBe("new-at");
    expect(result.refreshToken).toBe("new-rt");
    expect(result.user.username).toBe("alice");
    // Tokens should be stored in the SDK
    expect(sdk.getAccessToken()).toBe("new-at");
  });

  test("login sends portal:user by default", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1" },
        sessionId: "s1",
      })
    );

    await sdk.auth.login({ username: "alice", password: "pass" });
    const [, init] = lastFetchCall();
    const body = JSON.parse(init.body as string);
    expect(body.portal).toBe("user");
  });

  test("login sends custom portal when specified", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1" },
        sessionId: "s1",
      })
    );

    await sdk.auth.login({ username: "admin", password: "pass", portal: "admin" });
    const [, init] = lastFetchCall();
    const body = JSON.parse(init.body as string);
    expect(body.portal).toBe("admin");
  });

  test("register sets tokens on the SDK after successful response", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "reg-at",
        refreshToken: "reg-rt",
        user: { id: "u2", name: "Bob", username: "bob", status: "Online" },
        sessionId: "s2",
      })
    );

    const result = await sdk.auth.register({
      name: "Bob",
      username: "bob",
      password: "secret123",
      email: "bob@example.com",
    });
    expect(result.accessToken).toBe("reg-at");
    expect(sdk.getAccessToken()).toBe("reg-at");
  });

  test("register sends correct request body", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1" },
        sessionId: "s1",
      })
    );

    await sdk.auth.register({
      name: "Bob",
      username: "bob",
      password: "pass",
      email: "bob@test.com",
      invitationCode: "INV-123",
    });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/register");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Bob");
    expect(body.username).toBe("bob");
    expect(body.invitationCode).toBe("INV-123");
  });

  test("logout clears tokens from the SDK", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.auth.logout();
    expect(sdk.getAccessToken()).toBeNull();
  });

  test("logout calls POST /auth/logout", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.auth.logout();
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/logout");
    expect(init.method).toBe("POST");
  });

  test("getCurrentUser calls GET /auth/me", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "u1", name: "Alice", username: "alice" })
    );

    const user = await sdk.auth.getCurrentUser();
    expect(user.id).toBe("u1");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/me");
    expect(init.method).toBe("GET");
  });

  test("checkUsername passes username in URL path", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ available: true })
    );

    const result = await sdk.auth.checkUsername("newuser");
    expect(result.available).toBe(true);
    const [url] = lastFetchCall();
    expect(url).toContain("/auth/check-username/newuser");
  });

  test("verifyTwoFactor sends code and userId", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1" },
        sessionId: "s1",
      })
    );

    await sdk.auth.verifyTwoFactor({ code: "123456", userId: "u1" });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/2fa/verify");
    const body = JSON.parse(init.body as string);
    expect(body.code).toBe("123456");
    expect(body.userId).toBe("u1");
  });

  test("forgotPassword sends identifier", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.auth.forgotPassword("alice@test.com");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/forgot-password");
    const body = JSON.parse(init.body as string);
    expect(body.identifier).toBe("alice@test.com");
  });

  test("changePassword sends current and new password", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.auth.changePassword({
      currentPassword: "old",
      newPassword: "new",
    });
    const [, init] = lastFetchCall();
    const body = JSON.parse(init.body as string);
    expect(body.currentPassword).toBe("old");
    expect(body.newPassword).toBe("new");
  });

  test("deleteAccount calls DELETE /auth/account", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.auth.deleteAccount();
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/account");
    expect(init.method).toBe("DELETE");
  });
});

// ===========================================================================
// ConversationsService
// ===========================================================================

describe("ConversationsService", () => {
  test("list passes pagination params correctly", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 2, pageSize: 10 })
    );

    await sdk.conversations.list({ page: 2, pageSize: 10 });
    const [url] = lastFetchCall();
    expect(url).toContain("/conversations");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
  });

  test("list with type filter", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
    );

    await sdk.conversations.list({ type: "Chatroom" });
    const [url] = lastFetchCall();
    expect(url).toContain("type=Chatroom");
  });

  test("get fetches a conversation by ID", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "c1", type: "DirectMessage" })
    );

    const result = await sdk.conversations.get("c1");
    expect(result.id).toBe("c1");
    const [url] = lastFetchCall();
    expect(url).toContain("/conversations/c1");
  });

  test("createDM sends userId", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "c1", type: "DirectMessage" })
    );

    await sdk.conversations.createDM({ userId: "u2" });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/dm");
    expect(JSON.parse(init.body as string).userId).toBe("u2");
  });

  test("createChatroom sends name and participantIds", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "c2", type: "Chatroom" })
    );

    await sdk.conversations.createChatroom({
      name: "Test Room",
      participantIds: ["u1", "u2", "u3"],
      description: "A test room",
    });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/chatroom");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Test Room");
    expect(body.participantIds).toEqual(["u1", "u2", "u3"]);
    expect(body.description).toBe("A test room");
  });

  test("addParticipants sends userIds array", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.addParticipants("c1", ["u4", "u5"]);
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/participants");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string).userIds).toEqual(["u4", "u5"]);
  });

  test("removeParticipant uses correct URL", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.removeParticipant("c1", "u4");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/participants/u4");
    expect(init.method).toBe("DELETE");
  });

  test("mute sends until param", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.mute("c1", "2026-12-31");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/mute");
    expect(JSON.parse(init.body as string).until).toBe("2026-12-31");
  });

  test("pin/unpin use correct endpoints", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.pin("c1");
    expect(lastFetchCall()[0]).toContain("/conversations/c1/pin");

    await sdk.conversations.unpin("c1");
    expect(lastFetchCall()[0]).toContain("/conversations/c1/unpin");
  });

  test("archive/unarchive use correct endpoints", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.archive("c1");
    expect(lastFetchCall()[0]).toContain("/conversations/c1/archive");

    await sdk.conversations.unarchive("c1");
    expect(lastFetchCall()[0]).toContain("/conversations/c1/unarchive");
  });

  test("markAsRead sends lastMessageId", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.conversations.markAsRead("c1", "msg-99");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/read");
    expect(JSON.parse(init.body as string).lastMessageId).toBe("msg-99");
  });
});

// ===========================================================================
// MessagesService
// ===========================================================================

describe("MessagesService", () => {
  test("send constructs correct request body", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        id: "m1",
        conversationId: "c1",
        content: "Hello!",
        type: "Text",
      })
    );

    const result = await sdk.messages.send("c1", {
      content: "Hello!",
      type: "Text",
      replyToMessageId: "m0",
      attachmentIds: ["att-1"],
    });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.content).toBe("Hello!");
    expect(body.type).toBe("Text");
    expect(body.replyToMessageId).toBe("m0");
    expect(body.attachmentIds).toEqual(["att-1"]);
    expect(result.id).toBe("m1");
  });

  test("list passes pagination params", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], hasMore: false })
    );

    await sdk.messages.list("c1", { limit: 50, before: "cursor-abc" });
    const [url] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages");
    expect(url).toContain("limit=50");
    expect(url).toContain("before=cursor-abc");
  });

  test("get fetches a single message", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "m1", content: "Hi" })
    );

    const msg = await sdk.messages.get("c1", "m1");
    expect(msg.id).toBe("m1");
    const [url] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1");
  });

  test("edit sends content via PUT", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "m1", content: "Updated" })
    );

    await sdk.messages.edit("c1", "m1", { content: "Updated" });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string).content).toBe("Updated");
  });

  test("delete uses DELETE method with forEveryone param", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.messages.delete("c1", "m1", true);
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1");
    expect(url).toContain("forEveryone=true");
    expect(init.method).toBe("DELETE");
  });

  test("delete defaults forEveryone to false", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.messages.delete("c1", "m1");
    const [url] = lastFetchCall();
    expect(url).toContain("forEveryone=false");
  });

  test("react sends emoji to correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.messages.react("c1", "m1", "thumbsup");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1/reactions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string).emoji).toBe("thumbsup");
  });

  test("removeReaction sends emoji as query param via DELETE", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.messages.removeReaction("c1", "m1", "thumbsup");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1/reactions");
    expect(url).toContain("emoji=thumbsup");
    expect(init.method).toBe("DELETE");
  });

  test("forward sends target conversation IDs", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.messages.forward("c1", "m1", ["c2", "c3"]);
    const [url, init] = lastFetchCall();
    expect(url).toContain("/conversations/c1/messages/m1/forward");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.conversationIds).toEqual(["c2", "c3"]);
  });
});

// ===========================================================================
// MediaService
// ===========================================================================

describe("MediaService", () => {
  test("upload creates FormData with file", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        id: "file-1",
        fileName: "test.png",
        originalFileName: "test.png",
        contentType: "image/png",
        fileSize: 1024,
        downloadUrl: "https://example.com/file-1",
      })
    );

    const file = new File(["data"], "test.png", { type: "image/png" });
    const result = await sdk.media.upload(file, "c1");
    expect(result.id).toBe("file-1");

    const [url, init] = lastFetchCall();
    expect(url).toContain("/media/upload");
    expect(url).toContain("conversationId=c1");
    expect(init.body).toBeInstanceOf(FormData);
  });

  test("upload without conversationId omits query param", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "file-1" })
    );

    const file = new File(["data"], "test.png", { type: "image/png" });
    await sdk.media.upload(file);
    const [url] = lastFetchCall();
    expect(url).toContain("/media/upload");
    expect(url).not.toContain("conversationId");
  });

  test("uploadMultiple sends multiple files", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ uploaded: [], errors: [] })
    );

    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.jpg", { type: "image/jpeg" }),
    ];
    await sdk.media.uploadMultiple(files, "c1");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/media/upload/multiple");
    expect(url).toContain("conversationId=c1");
    expect(init.body).toBeInstanceOf(FormData);
  });

  test("uploadVoice sends with duration param", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "voice-1" })
    );

    const blob = new Blob(["audio"], { type: "audio/webm" });
    await sdk.media.uploadVoice(blob, "c1", 15);
    const [url] = lastFetchCall();
    expect(url).toContain("/media/voice");
    expect(url).toContain("conversationId=c1");
    expect(url).toContain("durationSeconds=15");
  });

  test("delete calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.media.delete("file-1");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/media/file-1");
    expect(init.method).toBe("DELETE");
  });

  test("getConversationMedia passes params correctly", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
    );

    await sdk.media.getConversationMedia("c1", { page: 1, pageSize: 20, type: "image" });
    const [url] = lastFetchCall();
    expect(url).toContain("/media/conversation/c1");
    expect(url).toContain("type=image");
  });

  test("getConversationSharedContent fetches shared content", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        media: [],
        links: [],
        documents: [],
        totalMediaCount: 0,
        totalLinksCount: 0,
        totalDocumentsCount: 0,
      })
    );

    await sdk.media.getConversationSharedContent("c1", { type: "media" });
    const [url] = lastFetchCall();
    expect(url).toContain("/media/conversation/c1/shared");
    expect(url).toContain("type=media");
  });
});

// ===========================================================================
// ContactsService
// ===========================================================================

describe("ContactsService", () => {
  test("block calls POST /contacts/block/{userId}", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.contacts.block("u123");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/contacts/block/u123");
    expect(init.method).toBe("POST");
  });

  test("unblock calls DELETE /contacts/block/{userId}", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.contacts.unblock("u123");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/contacts/block/u123");
    expect(init.method).toBe("DELETE");
  });

  test("getBlocked returns array of blocked contacts", async () => {
    const sdk = createSDK();
    const blocked = [
      { id: "b1", userId: "u1", name: "Bob", username: "bob", blockedAt: "" },
    ];
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(blocked));

    const result = await sdk.contacts.getBlocked();
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u1");
  });

  test("list passes search and pagination params", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
    );

    await sdk.contacts.list({ page: 1, pageSize: 20, search: "alice" });
    const [url] = lastFetchCall();
    expect(url).toContain("/contacts");
    expect(url).toContain("search=alice");
    expect(url).toContain("page=1");
  });

  test("sendRequest sends UserId and Nickname", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "contact-1", userId: "u2", status: "Pending" })
    );

    await sdk.contacts.sendRequest("u2", "Alice");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/contacts");
    const body = JSON.parse(init.body as string);
    expect(body.UserId).toBe("u2");
    expect(body.Nickname).toBe("Alice");
  });

  test("acceptRequest uses correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "c1", status: "Accepted" })
    );

    await sdk.contacts.acceptRequest("c1");
    const [url] = lastFetchCall();
    expect(url).toContain("/contacts/requests/c1/accept");
  });

  test("searchUsers sends query and limit", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse([]));

    await sdk.contacts.searchUsers("bob", 10);
    const [url] = lastFetchCall();
    expect(url).toContain("/contacts/search");
    expect(url).toContain("query=bob");
    expect(url).toContain("limit=10");
  });
});

// ===========================================================================
// CallsService
// ===========================================================================

describe("CallsService", () => {
  test("initiate sends call request", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ callId: "call-1", type: "voice", status: "ringing" })
    );

    const result = await sdk.calls.initiate({
      targetUserId: "u2",
      type: "voice",
    });
    expect(result.callId).toBe("call-1");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/calls/initiate");
    expect(init.method).toBe("POST");
  });

  test("getHistory uses correct endpoint with pagination", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 })
    );

    await sdk.calls.getHistory({ page: 1, pageSize: 20 });
    const [url] = lastFetchCall();
    expect(url).toContain("/calls/history");
    expect(url).toContain("page=1");
  });

  test("getIceServers calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse([{ urls: "stun:stun.example.com" }])
    );

    const servers = await sdk.calls.getIceServers();
    expect(servers).toHaveLength(1);
    expect(lastFetchCall()[0]).toContain("/calls/ice-servers");
  });

  test("getLiveKitToken sends conversationId", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ token: "lk-token", url: "wss://lk.example.com", roomName: "room-1" })
    );

    const result = await sdk.calls.getLiveKitToken("c1");
    expect(result.token).toBe("lk-token");
    const body = JSON.parse(lastFetchCall()[1].body as string);
    expect(body.conversationId).toBe("c1");
  });

  test("accept/reject/end use correct endpoints", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ callId: "call-1" })
    );

    await sdk.calls.accept("call-1");
    expect(lastFetchCall()[0]).toContain("/calls/call-1/accept");

    await sdk.calls.reject("call-1");
    expect(lastFetchCall()[0]).toContain("/calls/call-1/reject");

    await sdk.calls.end("call-1");
    expect(lastFetchCall()[0]).toContain("/calls/call-1/end");
  });
});

// ===========================================================================
// NotificationsService
// ===========================================================================

describe("NotificationsService", () => {
  test("list returns paginated notifications", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        items: [{ id: "n1", type: "message", title: "New msg" }],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        unreadCount: 5,
      })
    );

    const result = await sdk.notifications.list({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.unreadCount).toBe(5);
  });

  test("getUnreadCount returns number", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ total: 10, unread: 3 })
    );

    const count = await sdk.notifications.getUnreadCount();
    expect(count).toBe(3);
  });

  test("markAsRead calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.notifications.markAsRead("n1");
    expect(lastFetchCall()[0]).toContain("/notifications/n1/read");
  });

  test("markAllAsRead calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.notifications.markAllAsRead();
    expect(lastFetchCall()[0]).toContain("/notifications/read-all");
  });
});

// ===========================================================================
// BroadcastsService
// ===========================================================================

describe("BroadcastsService", () => {
  test("getChannels returns array from paginated response", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        items: [{ id: "ch1", name: "News" }],
        totalCount: 1,
        page: 1,
        pageSize: 20,
      })
    );

    const channels = await sdk.broadcasts.getChannels();
    expect(channels).toHaveLength(1);
    expect(channels[0].name).toBe("News");
  });

  test("subscribe/unsubscribe use correct endpoints", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.broadcasts.subscribe("ch1");
    expect(lastFetchCall()[0]).toContain("/broadcasts/channels/ch1/subscribe");
    expect(lastFetchCall()[1].method).toBe("POST");

    await sdk.broadcasts.unsubscribe("ch1");
    expect(lastFetchCall()[0]).toContain("/broadcasts/channels/ch1/subscribe");
    expect(lastFetchCall()[1].method).toBe("DELETE");
  });
});

// ===========================================================================
// SearchService
// ===========================================================================

describe("SearchService", () => {
  test("search sends query params correctly", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ users: [], messages: [], conversations: [] })
    );

    await sdk.search.search({ query: "hello", types: ["users"], limit: 10 });
    const [url] = lastFetchCall();
    expect(url).toContain("/search");
    expect(url).toContain("q=hello");
    expect(url).toContain("type=users");
    expect(url).toContain("limit=10");
  });

  test("searchInConversation includes conversationId in URL", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse([]));

    await sdk.search.searchInConversation({
      conversationId: "c1",
      query: "test",
    });
    const [url] = lastFetchCall();
    expect(url).toContain("/search/conversations/c1");
    expect(url).toContain("q=test");
  });

  test("searchUsers delegates to search and extracts users", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        users: [{ id: "u1", name: "Alice", username: "alice" }],
        messages: [],
        conversations: [],
      })
    );

    const users = await sdk.search.searchUsers("alice", 5);
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe("alice");
  });
});

// ===========================================================================
// DevicesService
// ===========================================================================

describe("DevicesService", () => {
  test("list calls GET /auth/sessions", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse([]));

    await sdk.devices.list();
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/sessions");
    expect(init.method).toBe("GET");
  });

  test("register sends device registration data", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.devices.register({
      token: "fcm-token-123",
      platform: "android",
      deviceName: "Pixel 7",
    });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/devices/register");
    const body = JSON.parse(init.body as string);
    expect(body.DeviceToken).toBe("fcm-token-123");
    expect(body.Platform).toBe("android");
    expect(body.DeviceName).toBe("Pixel 7");
  });

  test("removeAllOthers calls DELETE /auth/sessions", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.devices.removeAllOthers();
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/sessions");
    expect(init.method).toBe("DELETE");
  });
});

// ===========================================================================
// TwoFactorService
// ===========================================================================

describe("TwoFactorService", () => {
  test("enable sends password", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ secret: "ABCD", qrCodeUrl: "otpauth://...", backupCodes: [] })
    );

    const result = await sdk.twoFactor.enable("my-password");
    expect(result.secret).toBe("ABCD");
    const body = JSON.parse(lastFetchCall()[1].body as string);
    expect(body.password).toBe("my-password");
  });

  test("disable sends password and code", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.twoFactor.disable("my-password", "123456");
    const body = JSON.parse(lastFetchCall()[1].body as string);
    expect(body.password).toBe("my-password");
    expect(body.code).toBe("123456");
  });
});

// ===========================================================================
// ReportsService
// ===========================================================================

describe("ReportsService", () => {
  test("create sends report data", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "r1", status: "pending" })
    );

    await sdk.reports.create({
      reportedUserId: "u1",
      reportType: "spam",
      description: "Spamming messages",
    });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/reports");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.reportedUserId).toBe("u1");
    expect(body.reportType).toBe("spam");
    expect(body.description).toBe("Spamming messages");
  });
});

// ===========================================================================
// UserService
// ===========================================================================

describe("UserService", () => {
  test("getUser fetches by userId", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "u1", name: "Alice", username: "alice", status: "Online" })
    );

    const user = await sdk.users.getUser("u1");
    expect(user.id).toBe("u1");
    expect(lastFetchCall()[0]).toContain("/users/u1");
  });

  test("updateProfile sends profile data via PUT", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ id: "u1", name: "New Name" })
    );

    await sdk.users.updateProfile({ name: "New Name", bio: "Hello" });
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/profile");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("New Name");
    expect(body.bio).toBe("Hello");
  });

  test("deleteAvatar calls DELETE /auth/avatar", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.users.deleteAvatar();
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/avatar");
    expect(init.method).toBe("DELETE");
  });

  test("uploadAvatar sends FormData", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ url: "https://example.com/avatar.jpg" })
    );

    const file = new File(["img"], "avatar.jpg", { type: "image/jpeg" });
    const result = await sdk.users.uploadAvatar(file);
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    const [url, init] = lastFetchCall();
    expect(url).toContain("/auth/avatar");
    expect(init.body).toBeInstanceOf(FormData);
  });
});

// ===========================================================================
// AnnouncementsService
// ===========================================================================

describe("AnnouncementsService", () => {
  test("list fetches announcements", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse([
        { id: "a1", title: "Update", content: "New version", priority: 1 },
      ])
    );

    const result = await sdk.announcements.list();
    expect(result).toHaveLength(1);
    const [url] = lastFetchCall();
    expect(url).toContain("/announcements/my");
  });

  test("markAsRead calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.announcements.markAsRead("a1");
    expect(lastFetchCall()[0]).toContain("/announcements/a1/read");
  });

  test("dismiss calls correct endpoint", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));

    await sdk.announcements.dismiss("a1");
    expect(lastFetchCall()[0]).toContain("/announcements/a1/dismiss");
  });
});
