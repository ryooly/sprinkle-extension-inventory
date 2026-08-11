export type Category =
  | "productivity"
  | "developer-tools"
  | "privacy-security"
  | "shopping"
  | "social-media"
  | "entertainment"
  | "other";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "flagged"
  | "pending";

export type BrowserPermission =
  | "storage"
  | "tabs"
  | "activeTab"
  | "cookies"
  | "history"
  | "webRequest"
  | "clipboardRead"
  | "clipboardWrite"
  | "geolocation"
  | "notifications";

export function buildPrompt(link: string, availableCategories: Category[]): string {
  return `
  You are an AI security auditor for browser extensions. Open and thoroughly
  investigate the following GitHub repository: ${link}
  
  Read the README, manifest.json (or the manifest for Firefox), package.json,
  commit/activity history, star/fork counts, issues, and license if available.
  
  === WHAT YOU MUST DETERMINE ===
  
  1. name — the actual PRODUCT name of the extension (not just the repo folder
     name; look for the real name in the README/manifest/official website if
     mentioned).
  2. publisher — the actual publisher/author/organization name.
  3. description — a clear summary (max 2 sentences) of what the extension does,
     rewritten in your own words. DO NOT invent features that are never
     mentioned in the repo.
  4. category — you MUST pick one or more categories ONLY from this list we
     provide (do not invent new categories outside this list):
     ${availableCategories.join(", ")}
     Match it based on the context of the extension's function as you read it
     from the README/code.
  5. permissions — the browser permissions this extension actually requests
     (read the "permissions"/"host_permissions" field in manifest.json if
     available, or infer from the code/README if no manifest is found).
     Choose ONLY from: storage, tabs, activeTab, cookies, history, webRequest,
     clipboardRead, clipboardWrite, geolocation, notifications
  
  6. verificationPercentage (0-100) — CALCULATE this based on a COMBINATION of
     the following factors, do not just guess a single number:
  
     a) Permission-to-function alignment (heaviest weight)
        - Are the requested permissions reasonable for the described function?
        - Sensitive permissions (webRequest, clipboardRead, history, all-sites
          access) without a clear explanation = score drops significantly.
  
     b) Transparency & documentation
        - Is there a clear README? Is there an open-source license? Is the
          code publicly readable?
        - A private/empty/undocumented repo = low score.
  
     c) Community trust signals
        - Number of stars, forks, watchers.
        - Widely used/referenced by other projects = positive signal.
  
     d) Activity & maintenance
        - When was the last commit? Is it actively maintained or long dead?
        - A long-abandoned repo requesting broad permissions = red flag.
  
     e) Suspicious indicators
        - Obfuscated/minified code without clear source?
        - Suspicious dependencies or unclear data requests to external servers?
        - README/description that doesn't match what the code actually does?
  
     Reflect this implicitly through the number (more red flags from factor e
     should lower the score even if other factors look good).
  
  7. verified — derive this from verificationPercentage:
     - 80-100 -> "verified"
     - 50-79  -> "unverified"
     - below 50 with clear red flags -> "flagged"
     - too little information to judge -> "pending"
  
  IMPORTANT: Respond with ONLY valid JSON, no markdown, no backticks, no extra
  text. Format EXACTLY like this:
  
  {
    "name": string,
    "publisher": string,
    "description": string,
    "category": string[],
    "permissions": string[],
    "verificationPercentage": number,
    "verified": string
  }
  `.trim();
}
