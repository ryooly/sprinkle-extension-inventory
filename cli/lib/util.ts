// cli/lib/util.ts
//
// Shared helpers for commands: enum whitelists that mirror the backend Zod/
// TypeBox schemas, a JWT payload decoder (no verification — display only), and
// random credential generators used by the smoke test.

import { randomUUID } from "node:crypto";
import type { ParsedArgs } from "./args";

/** Command handlers receive this context from the router in index.ts. */
export interface CommandContext {
  /** Positional arguments after the command name. */
  args: string[];
  /** Parsed flags for this command. */
  flags: ParsedArgs["flags"];
  /** True when the global --json flag was passed. */
  json: boolean;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;

export interface CommandDef {
  name: string;
  aliases?: string[];
  group: "auth" | "extensions" | "metrics" | "payment" | "system";
  summary: string;
  usage: string;
  handler: CommandHandler;
}

// --- Enum whitelists (kept in sync with the backend request validators) -----

export const CATEGORIES = [
  "productivity",
  "developer_tools",
  "communication",
  "design",
  "finance",
  "security",
  "education",
  "entertainment",
  "social",
  "utilities",
  "general",
  "misc",
  "other",
] as const;

export const BROWSERS = ["chrome", "opera", "edge"] as const;

export const SOURCES = ["github", "gitlab", "bitbucket", "other"] as const;

export const VERIFIED = ["verified", "not_verified"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Browser = (typeof BROWSERS)[number];

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
export function isBrowser(v: string): v is Browser {
  return (BROWSERS as readonly string[]).includes(v);
}
export function isSource(v: string): boolean {
  return (SOURCES as readonly string[]).includes(v);
}
export function isVerified(v: string): boolean {
  return (VERIFIED as readonly string[]).includes(v);
}

// --- JWT helpers ------------------------------------------------------------

export interface JwtPayload {
  userId?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/** Decode (not verify) a JWT and return its payload, or null if malformed. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Human-readable "expires in Xm" from a JWT `exp` claim. */
export function describeExpiry(exp?: number): string {
  if (!exp) return "unknown";
  const ms = exp * 1000 - Date.now();
  if (ms <= 0) return "expired";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ~${mins}m`;
  const hours = Math.round(mins / 60);
  return `in ~${hours}h`;
}

// --- Random credential generators (smoke test) ------------------------------

function shortId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8);
}

export function randomUsername(): string {
  return `cli_${shortId()}`.slice(0, 50);
}

export function randomEmail(username: string): string {
  return `${username}@example.com`;
}

export function randomPassword(): string {
  // >= 8 chars, mixes classes so it satisfies the backend minLength rule.
  return `Cli!${shortId()}${shortId().slice(0, 4)}`;
}
