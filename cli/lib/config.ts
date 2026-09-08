// cli/lib/config.ts
//
// Runtime configuration for the Sprinkle CLI. Everything is resolved from
// environment variables (with sensible defaults) so the CLI can be pointed at
// any backend instance without touching code.
//
// The CLI is a pure HTTP client: it never imports backend modules, so it can
// exercise the running gateway exactly like the future frontend will.

import * as os from "node:os";
import * as path from "node:path";

export interface CliConfig {
  /** Base URL of the running gateway, e.g. http://localhost:3000 */
  apiUrl: string;
  /** Absolute path of the JSON file that stores the auth session. */
  sessionPath: string;
  /** Emit ANSI colors (disabled when NO_COLOR is set or not a TTY). */
  color: boolean;
  /** Print full request/response details. */
  verbose: boolean;
  /** Print raw JSON bodies instead of human-friendly summaries. */
  json: boolean;
  /** Network timeout in milliseconds. */
  timeoutMs: number;
}

// Allow an explicit override, otherwise fall back to the same default the
// backend `config.ts` uses so both stay in sync out of the box.
const DEFAULT_API_URL = "http://localhost:3000";

function resolveSessionPath(): string {
  const explicit = process.env.SPRINKLE_CLI_SESSION;
  if (explicit && explicit.trim().length > 0) return explicit;
  // Keep tokens out of the repo by default: store under the user's home dir.
  return path.join(os.homedir(), ".sprinkle-cli", "session.json");
}

let cached: CliConfig | null = null;

/**
 * Build the CLI config. Global flags parsed in `index.ts` are merged on top of
 * environment variables via `overrides`.
 */
export function getConfig(overrides: Partial<CliConfig> = {}): CliConfig {
  const envColor =
    !process.env.NO_COLOR && (process.stdout.isTTY ?? false) !== false;

  const base: CliConfig = {
    apiUrl: (
      process.env.API_BASE_URL ??
      process.env.SPRINKLE_API_URL ??
      DEFAULT_API_URL
    ).replace(/\/+$/, ""),
    sessionPath: resolveSessionPath(),
    color: envColor,
    verbose: false,
    json: false,
    timeoutMs: Number(process.env.SPRINKLE_CLI_TIMEOUT ?? 15000),
  };

  cached = { ...base, ...overrides };
  return cached;
}

/** Return the last resolved config (or a fresh default one). */
export function currentConfig(): CliConfig {
  return cached ?? getConfig();
}
