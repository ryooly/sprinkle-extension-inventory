// src/types/cookie.ts
//
// Cookie security-policy types shared by the auth routes and the auth
// middleware. Kept in src/types/ per the project's type-placement convention.

/** Browser SameSite attribute values the cookie policy can emit. */
export type SameSiteValue = "strict" | "lax" | "none";

/**
 * Deployment mode that drives the default cookie policy:
 *  - "local"        → relaxed for http://localhost dev (secure:false, lax)
 *  - "same-origin"  → frontend + API on one origin      (secure:true, strict)
 *  - "cross-origin" → frontend on a different origin    (secure:true, none)
 */
export type CookieMode = "local" | "same-origin" | "cross-origin";

/** The resolved secure/sameSite pair applied to every session cookie. */
export interface CookiePolicy {
  /** Cookie is only sent over HTTPS (must be true when sameSite is "none"). */
  secure: boolean;
  /** Cross-site sending rule browsers enforce on the cookie. */
  sameSite: SameSiteValue;
}
