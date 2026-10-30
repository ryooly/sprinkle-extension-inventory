import { logger } from "@/logger";

const MARKER = "login-dbg";

const DEBUG_OFF = ["false", "0", "off"];

function enabled(): boolean {
  const fallback = process.env.NODE_ENV === "production" ? "false" : "true";
  const raw = (process.env.LOGIN_DEBUG ?? fallback).trim().toLowerCase();

  return !DEBUG_OFF.includes(raw);
}

export function loginDbg(
  event: string,
  data: Record<string, unknown> = {},
): void {
  if (!enabled()) return;

  logger.info({ marker: MARKER, ...data }, `[${MARKER}] ${event}`);
}

export function loginDbgTrace(
  event: string,
  data: Record<string, unknown> = {},
): void {
  if (!enabled()) return;

  logger.debug({ marker: MARKER, ...data }, `[${MARKER}] ${event}`);
}

export function dbgFields(body: unknown): string {
  if (!body || typeof body !== "object") return "(no body)";
  return Object.keys(body).sort().join(",");
}

export function dbgChars(value: unknown): number {
  return typeof value === "string" ? value.length : -1;
}
