// cli/lib/session.ts
//
// Persists the auth session captured from the backend's `Set-Cookie` headers.
// The gateway issues three httpOnly cookies (auth / accountId / refreshToken);
// a browser would manage them automatically, so the CLI stores them here and
// replays them on every authenticated request.
//
// Tokens rotate on refresh (see auth-middleware.ts), so callers must write the
// session back after each response via `applySetCookieHeaders`.

import * as fs from "node:fs";
import * as path from "node:path";
import { currentConfig } from "./config";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface SessionData {
  apiUrl: string;
  auth?: string;
  accountId?: string;
  refreshToken?: string;
  user?: SessionUser;
  updatedAt: string;
}

function sessionFile(): string {
  return currentConfig().sessionPath;
}

export function loadSession(): SessionData | null {
  const file = sessionFile();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(data: Partial<SessionData>): SessionData {
  const file = sessionFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const merged: SessionData = {
    apiUrl: data.apiUrl ?? currentConfig().apiUrl,
    auth: data.auth,
    accountId: data.accountId,
    refreshToken: data.refreshToken,
    user: data.user,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2), { mode: 0o600 });
  return merged;
}

export function clearSession(): boolean {
  const file = sessionFile();
  try {
    fs.rmSync(file, { force: true });
    return true;
  } catch {
    return false;
  }
}

/** True when we have the minimum cookies needed to call a protected route. */
export function hasSession(): boolean {
  const s = loadSession();
  return Boolean(s && (s.auth || s.refreshToken) && s.accountId);
}

/** Build the `Cookie` header value from a stored session. */
export function cookieHeader(s: SessionData | null): string | undefined {
  if (!s) return undefined;
  const parts: string[] = [];
  if (s.auth) parts.push(`auth=${s.auth}`);
  if (s.accountId) parts.push(`accountId=${s.accountId}`);
  if (s.refreshToken) parts.push(`refreshToken=${s.refreshToken}`);
  return parts.length ? parts.join("; ") : undefined;
}

/**
 * Parse `Set-Cookie` header lines and merge the auth/accountId/refreshToken
 * values into the stored session (token rotation). Returns the updated session
 * or null when nothing relevant was present.
 */
export function applySetCookieHeaders(setCookie: string[]): SessionData | null {
  if (!setCookie || setCookie.length === 0) return null;

  const current = loadSession() ?? {
    apiUrl: currentConfig().apiUrl,
    updatedAt: new Date().toISOString(),
  };

  let changed = false;
  for (const line of setCookie) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name === "auth" || name === "accountId" || name === "refreshToken") {
      if (current[name] !== value) changed = true;
      current[name] = value;
    }
  }

  return changed ? saveSession(current) : current;
}
