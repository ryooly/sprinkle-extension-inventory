// ── Auth API Integration Tests ──────────────────────────────────────────────
// Tests the auth module endpoints: /user/register, /user/login,
// /user/beBuilder, /user/getUserByUsername/:username
//
// Prerequisites:
//   1. Auth server running on localhost:3001  (bun run dev)
//   2. Database migrated                       (bun run migrate)
//
// Run:  bun test tests/auth.test.ts

import { describe, expect, test, beforeAll } from "bun:test";
import { apiRequest, unique } from "./helpers";

// ── Fixtures ────────────────────────────────────────────────────────────────

const testUser = {
  username: unique("testuser"),
  email: unique("test") + "@test.com",
  password: "securepassword123",
};

let accountCookies: Record<string, string> = {};
let accountId: string = "";

// ── POST /user/register ─────────────────────────────────────────────────────

describe("POST /user/register", () => {
  test("should register a new user and return cookies", async () => {
    const res = await apiRequest<{ success: boolean; data: { id: string } }>(
      "POST",
      "/user/register",
      testUser,
    );

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.id).toBeDefined();

    accountId = res.data.data.id;

    // Server should set auth + accountId cookies
    expect(res.cookies["auth"]).toBeDefined();
    expect(res.cookies["accountId"]).toBeDefined();

    accountCookies = res.cookies;
  });

  test("should reject duplicate username", async () => {
    const res = await apiRequest("POST", "/user/register", {
      username: testUser.username,
      email: unique("other") + "@test.com",
      password: "anotherpassword123",
    });

    expect(res.ok).toBe(false);
  });

  test("should reject duplicate email", async () => {
    const res = await apiRequest("POST", "/user/register", {
      username: unique("other"),
      email: testUser.email,
      password: "anotherpassword123",
    });

    expect(res.ok).toBe(false);
  });

  test("should reject short password (< 8 chars)", async () => {
    const res = await apiRequest("POST", "/user/register", {
      username: unique("short"),
      email: unique("short") + "@test.com",
      password: "abc",
    });

    expect(res.ok).toBe(false);
  });

  test("should reject invalid email format", async () => {
    const res = await apiRequest("POST", "/user/register", {
      username: unique("bademail"),
      email: "not-an-email",
      password: "securepassword123",
    });

    expect(res.ok).toBe(false);
  });
});

// ── POST /user/login ────────────────────────────────────────────────────────

describe("POST /user/login", () => {
  test("should login with valid credentials", async () => {
    const res = await apiRequest<{
      success: boolean;
      data: { id: string; email: string };
    }>("POST", "/user/login", {
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.email).toBe(testUser.email);

    // Fresh cookies should be issued
    expect(res.cookies["auth"]).toBeDefined();
    expect(res.cookies["accountId"]).toBeDefined();
  });

  test("should reject wrong password", async () => {
    const res = await apiRequest("POST", "/user/login", {
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.ok).toBe(false);
  });

  test("should reject non-existent email", async () => {
    const res = await apiRequest("POST", "/user/login", {
      email: "ghost@nowhere.com",
      password: "securepassword123",
    });

    expect(res.ok).toBe(false);
  });
});

// ── PATCH /user/beBuilder ───────────────────────────────────────────────────

describe("PATCH /user/beBuilder", () => {
  test("should promote user to builder role", async () => {
    const res = await apiRequest<{ success: boolean; massage: string }>(
      "PATCH",
      "/user/beBuilder",
      { accountId },
    );

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
  });

  test("should reject promoting same user twice", async () => {
    const res = await apiRequest("PATCH", "/user/beBuilder", { accountId });

    // Already a builder → should fail
    expect(res.ok).toBe(false);
  });

  test("should reject invalid UUID", async () => {
    const res = await apiRequest("PATCH", "/user/beBuilder", {
      accountId: "not-a-uuid",
    });

    expect(res.ok).toBe(false);
  });
});

// ── GET /user/getUserByUsername/:username ───────────────────────────────────

describe("GET /user/getUserByUsername/:username", () => {
  test("should return user by username", async () => {
    const res = await apiRequest<{
      success: boolean;
      data: { username: string; role: string };
    }>("GET", `/user/getUserByUsername/${testUser.username}`);

    expect(res.ok).toBe(true);
    expect(res.data.success).toBe(true);
    expect(res.data.data.username).toBe(testUser.username);
    expect(res.data.data.role).toBe("builder"); // promoted earlier
  });

  test("should return 404 for non-existent user", async () => {
    const res = await apiRequest(
      "GET",
      `/user/getUserByUsername/${unique("nonexistent")}`,
    );

    expect(res.ok).toBe(false);
  });
});
