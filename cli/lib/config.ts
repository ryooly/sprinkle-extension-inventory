import * as os from "node:os";
import * as path from "node:path";

export interface CliConfig {

  apiUrl: string;

  sessionPath: string;

  color: boolean;

  verbose: boolean;

  json: boolean;

  timeoutMs: number;
}

const DEFAULT_API_URL = "http://localhost:3000";

function resolveSessionPath(): string {
  const explicit = process.env.SPRINKLE_CLI_SESSION;
  if (explicit && explicit.trim().length > 0) return explicit;

  return path.join(os.homedir(), ".sprinkle-cli", "session.json");
}

let cached: CliConfig | null = null;

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

export function currentConfig(): CliConfig {
  return cached ?? getConfig();
}
