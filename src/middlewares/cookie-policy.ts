// src/middlewares/cookie-policy.ts
//
// Env-driven cookie security policy — the single source of truth for the
// `secure` / `sameSite` attributes of every session cookie, so the auth routes
// and the auth middleware never hardcode them again.
//
// Mode selection via COOKIE_MODE:
//   local        → { secure: false, sameSite: "lax"   }  // http://localhost dev
//   same-origin  → { secure: true,  sameSite: "strict" }  // prod, one origin
//   cross-origin → { secure: true,  sameSite: "none"   }  // prod, split origins
//
// When COOKIE_MODE is unset it defaults to "same-origin" under NODE_ENV=
// production and "local" otherwise. COOKIE_SECURE / COOKIE_SAMESITE are
// optional escape hatches that override the derived values.
//
// Env is read on every call (never snapshotted at import time) so runtime
// overrides and tests behave predictably.

import type { CookieMode, CookiePolicy, SameSiteValue } from "@/types/cookie";

const POLICY_BY_MODE: Record<CookieMode, CookiePolicy> = {
  local: { secure: false, sameSite: "lax" },
  "same-origin": { secure: true, sameSite: "strict" },
  "cross-origin": { secure: true, sameSite: "none" },
};

function isCookieMode(value: string): value is CookieMode {
  return (
    value === "local" || value === "same-origin" || value === "cross-origin"
  );
}

function isSameSite(value: string): value is SameSiteValue {
  return value === "strict" || value === "lax" || value === "none";
}

function resolveMode(): CookieMode {
  const raw = (process.env.COOKIE_MODE ?? "").trim().toLowerCase();
  if (isCookieMode(raw)) return raw;
  // Sensible default: locked down in production, relaxed for local dev.
  return process.env.NODE_ENV === "production" ? "same-origin" : "local";
}

/** Resolve the cookie policy for the current environment. */
export function getCookiePolicy(): CookiePolicy {
  const base = POLICY_BY_MODE[resolveMode()];

  const secureRaw = process.env.COOKIE_SECURE?.trim().toLowerCase();
  const sameSiteRaw = process.env.COOKIE_SAMESITE?.trim().toLowerCase();

  return {
    secure:
      secureRaw === "true" ? true : secureRaw === "false" ? false : base.secure,
    sameSite:
      sameSiteRaw && isSameSite(sameSiteRaw) ? sameSiteRaw : base.sameSite,
  };
}
