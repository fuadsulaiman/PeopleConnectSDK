/**
 * PeopleConnectSDK Main Class Tests
 *
 * Verifies SDK instantiation, service property availability,
 * and top-level token management methods.
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
const originalConsoleLog = console.log;

beforeEach(() => {
  global.fetch = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
  console.log = originalConsoleLog;
});

// ===========================================================================
// Constructor & service instantiation
// ===========================================================================

describe("PeopleConnectSDK - constructor", () => {
  test("creates SDK instance without errors", () => {
    expect(() => createSDK()).not.toThrow();
  });

  test("accepts minimal config with only baseUrl", () => {
    const sdk = new PeopleConnectSDK({ baseUrl: "https://api.test.com" });
    expect(sdk).toBeDefined();
  });

  test("accepts full config with all optional callbacks", () => {
    const sdk = new PeopleConnectSDK({
      baseUrl: "https://api.test.com",
      timeout: 5000,
      onTokenRefresh: jest.fn(),
      onUnauthorized: jest.fn(),
      onError: jest.fn(),
    });
    expect(sdk).toBeDefined();
  });
});

// ===========================================================================
// All 14 service properties exist
// ===========================================================================

describe("PeopleConnectSDK - service properties", () => {
  const sdk = createSDK();

  const serviceNames = [
    "auth",
    "users",
    "conversations",
    "messages",
    "contacts",
    "calls",
    "media",
    "notifications",
    "broadcasts",
    "announcements",
    "search",
    "devices",
    "twoFactor",
    "reports",
  ] as const;

  test.each(serviceNames)("has '%s' service property", (name) => {
    expect(sdk[name]).toBeDefined();
    expect(typeof sdk[name]).toBe("object");
  });

  test("all 14 services are accessible", () => {
    let count = 0;
    for (const name of serviceNames) {
      if (sdk[name]) count++;
    }
    expect(count).toBe(14);
  });
});

// ===========================================================================
// Token management via SDK
// ===========================================================================

describe("PeopleConnectSDK - token management", () => {
  test("setTokens and getAccessToken work together", () => {
    const sdk = createSDK();
    expect(sdk.getAccessToken()).toBeNull();

    sdk.setTokens({ accessToken: "my-access-token", refreshToken: "my-refresh-token" });
    expect(sdk.getAccessToken()).toBe("my-access-token");
  });

  test("clearTokens resets accessToken to null", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });
    expect(sdk.getAccessToken()).toBe("at");

    sdk.clearTokens();
    expect(sdk.getAccessToken()).toBeNull();
  });

  test("setTokens overwrites previous tokens", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "first", refreshToken: "rt1" });
    sdk.setTokens({ accessToken: "second", refreshToken: "rt2" });
    expect(sdk.getAccessToken()).toBe("second");
  });

  test("clearTokens can be called when no tokens were set", () => {
    const sdk = createSDK();
    expect(() => sdk.clearTokens()).not.toThrow();
    expect(sdk.getAccessToken()).toBeNull();
  });

  test("clearTokens then setTokens works", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "first", refreshToken: "rt" });
    sdk.clearTokens();
    sdk.setTokens({ accessToken: "new", refreshToken: "new-rt" });
    expect(sdk.getAccessToken()).toBe("new");
  });
});

// ===========================================================================
// Service method existence (spot-checks)
// ===========================================================================

describe("PeopleConnectSDK - key service methods exist", () => {
  const sdk = createSDK();

  test("auth has login, register, logout, getCurrentUser", () => {
    expect(typeof sdk.auth.login).toBe("function");
    expect(typeof sdk.auth.register).toBe("function");
    expect(typeof sdk.auth.logout).toBe("function");
    expect(typeof sdk.auth.getCurrentUser).toBe("function");
  });

  test("conversations has list, get, createDM, createChatroom", () => {
    expect(typeof sdk.conversations.list).toBe("function");
    expect(typeof sdk.conversations.get).toBe("function");
    expect(typeof sdk.conversations.createDM).toBe("function");
    expect(typeof sdk.conversations.createChatroom).toBe("function");
  });

  test("messages has list, send, edit, delete, react", () => {
    expect(typeof sdk.messages.list).toBe("function");
    expect(typeof sdk.messages.send).toBe("function");
    expect(typeof sdk.messages.edit).toBe("function");
    expect(typeof sdk.messages.delete).toBe("function");
    expect(typeof sdk.messages.react).toBe("function");
  });

  test("contacts has list, block, unblock, getBlocked", () => {
    expect(typeof sdk.contacts.list).toBe("function");
    expect(typeof sdk.contacts.block).toBe("function");
    expect(typeof sdk.contacts.unblock).toBe("function");
    expect(typeof sdk.contacts.getBlocked).toBe("function");
  });

  test("media has upload, getDownloadUrl, getThumbnailUrl", () => {
    expect(typeof sdk.media.upload).toBe("function");
    expect(typeof sdk.media.getDownloadUrl).toBe("function");
    expect(typeof sdk.media.getThumbnailUrl).toBe("function");
  });

  test("calls has initiate, accept, reject, end, getHistory", () => {
    expect(typeof sdk.calls.initiate).toBe("function");
    expect(typeof sdk.calls.accept).toBe("function");
    expect(typeof sdk.calls.reject).toBe("function");
    expect(typeof sdk.calls.end).toBe("function");
    expect(typeof sdk.calls.getHistory).toBe("function");
  });

  test("search has search, searchInConversation, searchUsers", () => {
    expect(typeof sdk.search.search).toBe("function");
    expect(typeof sdk.search.searchInConversation).toBe("function");
    expect(typeof sdk.search.searchUsers).toBe("function");
  });

  test("twoFactor has enable, disable, verify", () => {
    expect(typeof sdk.twoFactor.enable).toBe("function");
    expect(typeof sdk.twoFactor.disable).toBe("function");
    expect(typeof sdk.twoFactor.verify).toBe("function");
  });
});

// ===========================================================================
// Multiple SDK instances are independent
// ===========================================================================

describe("PeopleConnectSDK - instance independence", () => {
  test("two SDK instances do not share tokens", () => {
    const sdk1 = createSDK();
    const sdk2 = createSDK();

    sdk1.setTokens({ accessToken: "token-1", refreshToken: "rt-1" });
    expect(sdk1.getAccessToken()).toBe("token-1");
    expect(sdk2.getAccessToken()).toBeNull();
  });

  test("two SDK instances do not share config", () => {
    const onError1 = jest.fn();
    const onError2 = jest.fn();
    const sdk1 = createSDK({ onError: onError1 });
    const sdk2 = createSDK({ onError: onError2 });

    // They are different instances
    expect(sdk1).not.toBe(sdk2);
    expect(sdk1.auth).not.toBe(sdk2.auth);
  });
});

// ===========================================================================
// Media service URL helpers
// ===========================================================================

describe("PeopleConnectSDK - media URL helpers", () => {
  test("getDownloadUrl constructs correct URL with token", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "my-at", refreshToken: "rt" });

    const url = sdk.media.getDownloadUrl("file-123");
    expect(url).toBe("https://api.example.com/api/media/file-123/download?token=my-at");
  });

  test("getThumbnailUrl constructs correct URL with token", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "my-at", refreshToken: "rt" });

    const url = sdk.media.getThumbnailUrl("file-456");
    expect(url).toBe("https://api.example.com/api/media/file-456/thumbnail?token=my-at");
  });

  test("getStreamUrl constructs correct URL with token", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "my-at", refreshToken: "rt" });

    const url = sdk.media.getStreamUrl("file-789");
    expect(url).toBe("https://api.example.com/api/media/file-789/stream?token=my-at");
  });

  test("URL helpers accept explicit token parameter", () => {
    const sdk = createSDK();
    const url = sdk.media.getDownloadUrl("file-1", "explicit-token");
    expect(url).toContain("token=explicit-token");
  });

  test("URL helpers use null token when none set and none provided", () => {
    const sdk = createSDK();
    const url = sdk.media.getDownloadUrl("file-1");
    expect(url).toContain("token=null");
  });
});
