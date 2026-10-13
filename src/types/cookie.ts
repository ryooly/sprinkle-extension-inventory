export type SameSiteValue = "strict" | "lax" | "none";

export type CookieMode = "local" | "same-origin" | "cross-origin";

export interface CookiePolicy {

  secure: boolean;

  sameSite: SameSiteValue;
}
