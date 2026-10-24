import { currentConfig } from "./config";
import * as out from "./output";
import { applySetCookieHeaders, cookieHeader, loadSession } from "./session";

export interface RequestOptions {
  method?: string;

  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;

  form?: FormData;

  useSession?: boolean;

  updateSession?: boolean;
  headers?: Record<string, string>;

  timeoutMs?: number;
}

export interface HttpResult {
  status: number;
  ok: boolean;

  data: unknown;
  raw: string;
  headers: Headers;
  setCookie: string[];
}

function buildUrl(pathname: string, query?: RequestOptions["query"]): string {
  const { apiUrl } = currentConfig();
  const url = new URL(
    pathname.replace(/^\//, ""),
    apiUrl.replace(/\/$/, "") + "/",
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function readSetCookies(res: Response): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    const all = h.getSetCookie();
    if (all && all.length) return all;
  }

  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

export async function request(opts: RequestOptions): Promise<HttpResult> {
  const cfg = currentConfig();
  const method = (opts.method ?? "GET").toUpperCase();
  const url = buildUrl(opts.path, opts.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  if (opts.useSession) {
    const cookie = cookieHeader(loadSession());
    if (cookie) headers.Cookie = cookie;
  }

  let bodyText: string | undefined;
  if (opts.body !== undefined) {
    bodyText = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }

  if (cfg.verbose) {
    out.log(out.c.dim(`→ ${method} ${url}`));
    if (headers.Cookie)
      out.log(out.c.dim(`  Cookie: ${redactCookie(headers.Cookie)}`));
    if (bodyText) out.log(out.c.dim(`  Body: ${bodyText}`));
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? cfg.timeoutMs,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.form ?? bodyText,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Network error calling ${method} ${url}: ${message}\n` +
        `Is the gateway running at ${cfg.apiUrl}? (start it with \`bun run dev\`)`,
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();
  let data: unknown = raw;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  const setCookie = readSetCookies(res);
  if (opts.updateSession !== false && setCookie.length) {
    applySetCookieHeaders(setCookie);
  }

  if (cfg.verbose) {
    out.log(out.c.dim(`← ${res.status} ${res.statusText}`));
    if (setCookie.length)
      out.log(
        out.c.dim(`  Set-Cookie: ${setCookie.map(redactCookie).join(", ")}`),
      );
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
    raw,
    headers: res.headers,
    setCookie,
  };
}

// Convenience verb helpers.
export const http = {
  get: (path: string, opts?: Partial<RequestOptions>) =>
    request({ ...opts, method: "GET", path }),
  post: (path: string, body?: unknown, opts?: Partial<RequestOptions>) =>
    request({ ...opts, method: "POST", path, body }),
  postMultipart: (
    path: string,
    form: FormData,
    opts?: Partial<RequestOptions>,
  ) => request({ ...opts, method: "POST", path, form }),
  patch: (path: string, body?: unknown, opts?: Partial<RequestOptions>) =>
    request({ ...opts, method: "PATCH", path, body }),
  delete: (path: string, opts?: Partial<RequestOptions>) =>
    request({ ...opts, method: "DELETE", path }),
};

/** Pull a human-readable message out of a backend error body. */
export function errorMessage(result: HttpResult): string {
  const d = result.data as
    | { message?: string; error?: string }
    | string
    | undefined;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (d && typeof d === "object") {
    if (typeof d.message === "string") return d.message;
    if (typeof d.error === "string") return d.error;
  }
  return result.raw || `${result.status} ${result.ok ? "OK" : "Error"}`;
}

function redactCookie(value: string): string {
  // Show cookie names but hide sensitive values in verbose logs.
  return value
    .split(";")
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return part.trim();
      const name = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      const shown =
        val.length > 8 ? `${val.slice(0, 6)}…${val.slice(-2)}` : "…";
      return `${name}=${shown}`;
    })
    .join("; ");
}
