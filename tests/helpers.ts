// ── Shared test utilities ────────────────────────────────────────────────────
// Isolated from the core backend – safe to delete entirely.

// The gateway (src/gateway/index.ts) serves all module routes, including
// the /user/* auth routes, on this port.
const AUTH_BASE_URL = "http://localhost:3000";

interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  cookies: Record<string, string>;
}

/**
 * Thin wrapper around fetch for hitting the auth API.
 * Automatically parses JSON and extracts Set-Cookie headers.
 */
export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  cookies?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cookies) {
    headers["Cookie"] = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  const res = await fetch(`${AUTH_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse Set-Cookie headers into a simple map
  const responseCookies: Record<string, string> = {};
  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookieHeaders) {
    const [pair] = raw.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) {
      responseCookies[pair.slice(0, eqIdx).trim()] = pair
        .slice(eqIdx + 1)
        .trim();
    }
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }

  return { status: res.status, ok: res.ok, data, cookies: responseCookies };
}

/** Generate a unique string to avoid username/email collisions across test runs */
export function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Wait for `ms` milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
