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

  return process.env.NODE_ENV === "production" ? "same-origin" : "local";
}

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
