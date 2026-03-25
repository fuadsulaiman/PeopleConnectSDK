/**
 * HttpClient Unit Tests
 *
 * Tests for the internal HttpClient class used by PeopleConnectSDK.
 * Since HttpClient is not exported directly, we test it through the SDK's
 * public interface and by observing fetch calls.
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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
const originalConsoleLog = console.log;

beforeEach(() => {
  global.fetch = jest.fn();
  // Silence SDK console.log debug statements during tests
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
// Token management
// ===========================================================================

describe("HttpClient - token management", () => {
  test("getAccessToken returns null initially", () => {
    const sdk = createSDK();
    expect(sdk.getAccessToken()).toBeNull();
  });

  test("setTokens stores accessToken", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at-123", refreshToken: "rt-456" });
    expect(sdk.getAccessToken()).toBe("at-123");
  });

  test("clearTokens removes tokens", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });
    sdk.clearTokens();
    expect(sdk.getAccessToken()).toBeNull();
  });

  test("setTokens can be called multiple times", () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "first", refreshToken: "rt1" });
    expect(sdk.getAccessToken()).toBe("first");
    sdk.setTokens({ accessToken: "second", refreshToken: "rt2" });
    expect(sdk.getAccessToken()).toBe("second");
  });
});

// ===========================================================================
// URL construction & query params
// ===========================================================================

describe("HttpClient - URL construction", () => {
  test("trailing slash is stripped from base URL", async () => {
    const sdk = createSDK({ baseUrl: "https://api.example.com/api/" });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: 1 }));

    await sdk.auth.getCurrentUser();
    const [url] = lastFetchCall();
    expect(url).toMatch(/^https:\/\/api\.example\.com\/api\/auth\/me/);
    expect(url).not.toContain("api//auth");
  });

  test("query params are appended to URL", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    );

    await sdk.conversations.list({ page: 2, pageSize: 25, type: "Chatroom" });
    const [url] = lastFetchCall();
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("type=Chatroom");
  });

  test("undefined params are omitted from URL", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 10 })
    );

    await sdk.conversations.list({ page: 1, pageSize: undefined });
    const [url] = lastFetchCall();
    expect(url).toContain("page=1");
    expect(url).not.toContain("pageSize");
  });

  test("boolean params are stringified correctly", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse([]));

    await sdk.announcements.list(true);
    const [url] = lastFetchCall();
    expect(url).toContain("unreadOnly=true");
  });

  test("numeric params are stringified", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ items: [], totalCount: 0, page: 1, pageSize: 50 })
    );

    await sdk.calls.getHistory({ page: 3, pageSize: 50 });
    const [url] = lastFetchCall();
    expect(url).toContain("page=3");
    expect(url).toContain("pageSize=50");
  });
});

// ===========================================================================
// Authorization header
// ===========================================================================

describe("HttpClient - Authorization header", () => {
  test("no Authorization header when no token is set", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));

    await sdk.auth.getCurrentUser();
    const [, init] = lastFetchCall();
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  test("Bearer token included after setTokens", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "my-token", refreshToken: "rt" });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));

    await sdk.auth.getCurrentUser();
    const [, init] = lastFetchCall();
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-token");
  });

  test("Authorization header updates when tokens change", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));

    sdk.setTokens({ accessToken: "token-1", refreshToken: "rt" });
    await sdk.auth.getCurrentUser();
    let headers = lastFetchCall()[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token-1");

    sdk.setTokens({ accessToken: "token-2", refreshToken: "rt" });
    await sdk.auth.getCurrentUser();
    headers = lastFetchCall()[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token-2");
  });

  test("no Authorization header after clearTokens", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });
    sdk.clearTokens();

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));
    await sdk.auth.getCurrentUser();
    const headers = lastFetchCall()[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });
});

// ===========================================================================
// Response unwrapping
// ===========================================================================

describe("HttpClient - response unwrapping", () => {
  test("unwraps { success, data } wrapper", async () => {
    const sdk = createSDK();
    const payload = { id: "u1", name: "Alice" };
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ success: true, data: payload })
    );

    const result = await sdk.auth.getCurrentUser();
    expect(result).toEqual(payload);
  });

  test("returns raw response when there is no wrapper", async () => {
    const sdk = createSDK();
    const payload = { id: "u1", name: "Alice" };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(payload));

    const result = await sdk.auth.getCurrentUser();
    expect(result).toEqual(payload);
  });

  test("returns empty object when body is unparseable", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
      headers: new Headers(),
    } as unknown as Response);

    const result = await sdk.auth.getCurrentUser();
    expect(result).toEqual({});
  });

  test("unwraps even when success is false but data is present", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ success: false, data: { error: "some detail" } })
    );

    const result = await sdk.auth.getCurrentUser();
    expect(result).toEqual({ error: "some detail" });
  });
});

// ===========================================================================
// 401 handling & token refresh
// ===========================================================================

describe("HttpClient - 401 handling and token refresh", () => {
  test("on 401, refreshes token and retries the original request", async () => {
    const onTokenRefresh = jest.fn();
    const sdk = createSDK({ onTokenRefresh });
    sdk.setTokens({ accessToken: "old-at", refreshToken: "valid-rt" });

    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return mockResponse({ message: "Unauthorized" }, 401);
      }
      if (url.includes("/auth/refresh")) {
        return mockResponse({
          accessToken: "new-at",
          refreshToken: "new-rt",
          user: { id: "u1" },
          sessionId: "s1",
        });
      }
      return mockResponse({
        id: "u1",
        name: "Alice",
        username: "alice",
        status: "Online",
        languageCode: "en",
        createdAt: "",
      });
    });

    const result = await sdk.auth.getCurrentUser();
    expect(result.name).toBe("Alice");
    expect(onTokenRefresh).toHaveBeenCalledWith({
      accessToken: "new-at",
      refreshToken: "new-rt",
    });
    expect(sdk.getAccessToken()).toBe("new-at");
  });

  test("401 without refreshToken throws and invokes onError", async () => {
    const onError = jest.fn();
    const sdk = createSDK({ onError });
    // Empty string for refreshToken is falsy, so no refresh attempt
    sdk.setTokens({ accessToken: "at", refreshToken: "" });

    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ message: "Unauthorized" }, 401)
    );

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow();
    expect(onError).toHaveBeenCalled();
  });

  test("refresh failure calls onUnauthorized", async () => {
    const onUnauthorized = jest.fn();
    const sdk = createSDK({ onUnauthorized });
    sdk.setTokens({ accessToken: "old-at", refreshToken: "bad-rt" });

    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return mockResponse({}, 401);
      // Refresh endpoint also fails
      return mockResponse({ message: "Invalid refresh token" }, 401);
    });

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  test("concurrent requests queue during refresh and all resolve", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "old-at", refreshToken: "valid-rt" });

    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      callCount++;
      if (callCount <= 2) return mockResponse({}, 401);
      if (url.includes("/auth/refresh")) {
        return mockResponse({
          accessToken: "new-at",
          refreshToken: "new-rt",
          user: { id: "u1" },
          sessionId: "s1",
        });
      }
      return mockResponse({ id: "u1", name: "Test" });
    });

    const [r1, r2] = await Promise.all([
      sdk.auth.getCurrentUser(),
      sdk.users.getProfile(),
    ]);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
  });

  test("does not attempt refresh for /auth/refresh endpoint itself", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });

    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ message: "Refresh failed" }, 401)
    );

    // Calling refreshToken directly should not trigger refresh loop
    await expect(
      sdk.auth.refreshToken("rt")
    ).rejects.toThrow();

    // Only 1 fetch call, no recursive refresh
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
  });
});

// ===========================================================================
// Timeout
// ===========================================================================

describe("HttpClient - timeout", () => {
  test("throws Request timeout when fetch is aborted", async () => {
    const sdk = createSDK({ timeout: 1 });

    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          }, 50);
        })
    );

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow("Request timeout");
  });

  test("default timeout is 30000ms", () => {
    // We cannot directly inspect the private timeout field,
    // but we verify it does not immediately time out
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));

    // If default timeout were 0 or very small, this would fail
    return expect(sdk.auth.getCurrentUser()).resolves.toBeDefined();
  });
});

// ===========================================================================
// FormData detection
// ===========================================================================

describe("HttpClient - FormData handling", () => {
  test("does not set Content-Type for FormData bodies", async () => {
    const sdk = createSDK();
    sdk.setTokens({ accessToken: "at", refreshToken: "rt" });
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({ avatarUrl: "http://example.com/av.jpg" })
    );

    const file = new File(["data"], "avatar.png", { type: "image/png" });
    await sdk.conversations.uploadAvatar("conv-1", file);

    const [, init] = lastFetchCall();
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  test("sets Content-Type application/json for JSON bodies", async () => {
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
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(typeof init.body).toBe("string");
  });

  test("JSON body is properly stringified", async () => {
    const sdk = createSDK();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse({
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1" },
        sessionId: "s1",
      })
    );

    await sdk.auth.login({ username: "alice", password: "secret123" });
    const [, init] = lastFetchCall();
    const parsed = JSON.parse(init.body as string);
    expect(parsed.username).toBe("alice");
    expect(parsed.password).toBe("secret123");
    expect(parsed.portal).toBe("user");
  });
});

// ===========================================================================
// Error callbacks
// ===========================================================================

describe("HttpClient - error callbacks", () => {
  test("onError receives ApiError shape on non-ok response", async () => {
    const onError = jest.fn();
    const sdk = createSDK({ onError });
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(
        { message: "Not Found", code: "RESOURCE_NOT_FOUND", details: { id: ["invalid"] } },
        404
      )
    );

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow("Not Found");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Not Found",
        code: "RESOURCE_NOT_FOUND",
        details: { id: ["invalid"] },
      })
    );
  });

  test("error message defaults to HTTP status when body has no message", async () => {
    const onError = jest.fn();
    const sdk = createSDK({ onError });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
      headers: new Headers(),
    } as unknown as Response);

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow("HTTP 500");
  });

  test("handles unparseable error body", async () => {
    const onError = jest.fn();
    const sdk = createSDK({ onError });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: jest.fn().mockRejectedValue(new SyntaxError("bad")),
      headers: new Headers(),
    } as unknown as Response);

    await expect(sdk.auth.getCurrentUser()).rejects.toThrow("HTTP 502");
  });

  test("onError is not called on successful responses", async () => {
    const onError = jest.fn();
    const sdk = createSDK({ onError });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({ id: "u1" }));

    await sdk.auth.getCurrentUser();
    expect(onError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// HTTP methods
// ===========================================================================

describe("HttpClient - HTTP methods", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse({}));
  });

  test("GET request has no body", async () => {
    const sdk = createSDK();
    await sdk.auth.getCurrentUser();
    const [, init] = lastFetchCall();
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  test("POST request includes JSON body", async () => {
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
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toHaveProperty("username", "alice");
  });

  test("PUT request uses PUT method", async () => {
    const sdk = createSDK();
    await sdk.users.updateProfile({ name: "New Name" });
    const [, init] = lastFetchCall();
    expect(init.method).toBe("PUT");
  });

  test("DELETE request uses DELETE method", async () => {
    const sdk = createSDK();
    await sdk.auth.deleteAccount();
    const [, init] = lastFetchCall();
    expect(init.method).toBe("DELETE");
  });

  test("PATCH request uses PATCH method", async () => {
    const sdk = createSDK();
    await sdk.conversations.updateParticipantRole("c1", "u1", "Admin");
    const [, init] = lastFetchCall();
    expect(init.method).toBe("PATCH");
  });
});
