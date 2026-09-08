// cli/commands/auth.ts
//
// Auth endpoints (all under the backend's `/user` prefix):
//   POST  /user/register                 → create account, sets session cookies
//   POST  /user/login                    → authenticate, sets session cookies
//   PATCH /user/beBuilder                → upgrade the account role to "builder"
//   GET   /user/getUserByUsername/:name  → public profile lookup
//
// NOTE: the backend has no logout endpoint. `logout` therefore clears the
// locally stored session (cookies). The server-side refresh token simply
// expires on its own (7 days) — see the note printed by the command.

import { http, errorMessage, type HttpResult } from "../lib/http";
import {
  clearSession,
  loadSession,
  saveSession,
  type SessionUser,
} from "../lib/session";
import { currentConfig } from "../lib/config";
import * as out from "../lib/output";
import { ask, askPassword } from "../lib/prompt";
import { str, bool } from "../lib/args";
import {
  decodeJwt,
  describeExpiry,
  type CommandDef,
  type CommandContext,
} from "../lib/util";

// The account row returned by register/login includes the password hash; keep
// only the safe, useful fields in the local session.
function pickUser(account: unknown): SessionUser | undefined {
  if (!account || typeof account !== "object") return undefined;
  const a = account as Record<string, unknown>;
  if (typeof a.id !== "string") return undefined;
  return {
    id: a.id,
    username: String(a.username ?? ""),
    email: String(a.email ?? ""),
    role: String(a.role ?? "users"),
  };
}

function bodyOf(res: HttpResult): Record<string, unknown> {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Record<
    string,
    unknown
  >;
}

// Persist the logged-in user alongside the cookies captured by the http layer.
function storeUser(res: HttpResult): SessionUser | undefined {
  const user = pickUser(bodyOf(res).data);
  const existing = loadSession();
  saveSession({ ...(existing ?? {}), apiUrl: currentConfig().apiUrl, user });
  return user;
}

async function register(ctx: CommandContext): Promise<void> {
  const interactive = !bool(ctx.flags, "no-prompt");
  const username =
    str(ctx.flags, "username") ??
    (interactive ? await ask("Username") : undefined);
  const email =
    str(ctx.flags, "email") ?? (interactive ? await ask("Email") : undefined);
  const password =
    str(ctx.flags, "password") ??
    (interactive ? await askPassword("Password (min 8 chars)") : undefined);

  if (!username || !email || !password) {
    out.error("Missing --username, --email or --password.");
    process.exitCode = 1;
    return;
  }

  const res = await http.post("/user/register", { username, email, password });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const user = storeUser(res);
    out.heading("Registered");
    out.success(`Account created for ${out.c.bold(username)}`);
    out.fields({
      id: user?.id,
      username: user?.username,
      email: user?.email,
      role: user?.role,
      session: "cookies saved",
    });
  } else {
    out.error(`Registration failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function login(ctx: CommandContext): Promise<void> {
  const interactive = !bool(ctx.flags, "no-prompt");
  const email =
    str(ctx.flags, "email") ?? (interactive ? await ask("Email") : undefined);
  const password =
    str(ctx.flags, "password") ??
    (interactive ? await askPassword("Password") : undefined);

  if (!email || !password) {
    out.error("Missing --email or --password.");
    process.exitCode = 1;
    return;
  }

  const res = await http.post("/user/login", { email, password });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const user = storeUser(res);
    out.heading("Logged in");
    out.success(`Welcome back, ${out.c.bold(user?.username ?? email)}`);
    out.fields({
      id: user?.id,
      role: user?.role,
      session: "cookies saved",
    });
  } else {
    out.error(`Login failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function logout(ctx: CommandContext): Promise<void> {
  const had = loadSession();
  clearSession();
  if (ctx.json) return out.json({ success: true, cleared: Boolean(had) });

  out.heading("Logged out");
  if (had?.user?.username)
    out.success(`Cleared local session for ${had.user.username}`);
  else out.success("Cleared local session");
  out.info(
    "The backend has no logout route, so the server-side refresh token is not " +
      "revoked — it just expires on its own (7 days).",
  );
}

async function whoami(ctx: CommandContext): Promise<void> {
  const session = loadSession();
  if (!session || (!session.auth && !session.accountId)) {
    if (ctx.json) return out.json({ authenticated: false });
    out.warn("Not logged in. Run `login` or `register` first.");
    process.exitCode = 1;
    return;
  }

  const payload = session.auth ? decodeJwt(session.auth) : null;

  // Try to fetch the freshest profile from the server using the stored username.
  let profile: Record<string, unknown> | undefined;
  if (session.user?.username) {
    const res = await http.get(
      `/user/getUserByUsername/${encodeURIComponent(session.user.username)}`,
      { useSession: true },
    );
    if (res.ok) profile = bodyOf(res).data as Record<string, unknown>;
  }

  if (ctx.json) {
    return out.json({
      authenticated: true,
      session: { ...session, auth: undefined, refreshToken: undefined },
      token: payload,
      profile,
    });
  }

  out.heading("Current session");
  out.fields({
    username: profile?.username ?? session.user?.username,
    email: profile?.email ?? session.user?.email,
    role: profile?.role ?? session.user?.role,
    id: session.accountId,
    "access token": payload ? `expires ${describeExpiry(payload.exp)}` : "n/a",
    "refresh token": session.refreshToken ? "present" : "missing",
    "api url": session.apiUrl,
  });
}

async function beBuilder(ctx: CommandContext): Promise<void> {
  const session = loadSession();
  const accountId = str(ctx.flags, "account-id") ?? session?.accountId;
  if (!accountId) {
    out.error("No account id. Log in first or pass --account-id <uuid>.");
    process.exitCode = 1;
    return;
  }

  const res = await http.patch(
    "/user/beBuilder",
    { accountId },
    { useSession: true },
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Upgrade to builder");
    out.success(
      bodyOf(res).message
        ? String(bodyOf(res).message)
        : "Account is now a builder",
    );
    // Reflect the new role locally.
    if (session?.user)
      saveSession({ ...session, user: { ...session.user, role: "builder" } });
  } else {
    out.error(`beBuilder failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function getUser(ctx: CommandContext): Promise<void> {
  const username = ctx.args[0] ?? str(ctx.flags, "username");
  if (!username) {
    out.error("Usage: user <username>");
    process.exitCode = 1;
    return;
  }

  const res = await http.get(
    `/user/getUserByUsername/${encodeURIComponent(username)}`,
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    out.heading(`User: ${username}`);
    out.fields({
      id: data?.id,
      username: data?.username,
      email: data?.email,
      role: data?.role,
      verified: data?.isVerified,
      created: data?.createdAt,
    });
  } else {
    out.error(`Lookup failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

export const authCommands: CommandDef[] = [
  {
    name: "register",
    group: "auth",
    summary: "Create a new account (POST /user/register)",
    usage:
      "register [--username <u>] [--email <e>] [--password <p>] [--no-prompt]",
    handler: register,
  },
  {
    name: "login",
    aliases: ["signin"],
    group: "auth",
    summary: "Log in and store session cookies (POST /user/login)",
    usage: "login [--email <e>] [--password <p>] [--no-prompt]",
    handler: login,
  },
  {
    name: "logout",
    group: "auth",
    summary: "Clear the local session (no backend logout route exists)",
    usage: "logout",
    handler: logout,
  },
  {
    name: "whoami",
    aliases: ["me"],
    group: "auth",
    summary: "Show the current stored session and profile",
    usage: "whoami",
    handler: whoami,
  },
  {
    name: "be-builder",
    aliases: ["builder"],
    group: "auth",
    summary: "Upgrade the account role to builder (PATCH /user/beBuilder)",
    usage: "be-builder [--account-id <uuid>]",
    handler: beBuilder,
  },
  {
    name: "user",
    group: "auth",
    summary: "Look up a user by username (GET /user/getUserByUsername/:name)",
    usage: "user <username>",
    handler: getUser,
  },
];
