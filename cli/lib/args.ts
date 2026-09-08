// cli/lib/args.ts
//
// Minimal, dependency-free argument parser.
//   • Positional args are collected in order into `_`.
//   • `--flag value`, `--flag=value` and boolean `--flag` are supported.
//   • `-v` style short flags map to a long name via `aliases`.
//   • Unknown `--flags` are still captured so commands can validate them.

export interface ParsedArgs {
  /** Positional arguments (everything not attached to a flag). */
  _: string[];
  /** Flag values keyed by their long name. Booleans when valueless. */
  flags: Record<string, string | boolean>;
}

const SHORT_ALIASES: Record<string, string> = {
  h: "help",
  v: "verbose",
  j: "json",
  u: "username",
  e: "email",
  p: "password",
};

/** Flags that never consume a following value. */
const BOOLEAN_FLAGS = new Set([
  "help",
  "verbose",
  "json",
  "yes",
  "force",
  "keep",
]);

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [], flags: {} };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === "--") {
      // Everything after `--` is positional.
      result._.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq !== -1) {
        result.flags[body.slice(0, eq)] = body.slice(eq + 1);
        continue;
      }
      const name = body;
      if (BOOLEAN_FLAGS.has(name)) {
        result.flags[name] = true;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        result.flags[name] = argv[++i];
      } else {
        result.flags[name] = true;
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const short = token.slice(1); // e.g. "-v" -> "v"
      const name = SHORT_ALIASES[short] ?? short;
      if (BOOLEAN_FLAGS.has(name)) {
        result.flags[name] = true;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        result.flags[name] = argv[++i];
      } else {
        result.flags[name] = true;
      }
      continue;
    }

    result._.push(token);
  }

  return result;
}

/** Read a flag as a string, returning undefined when absent/boolean-only. */
export function str(
  flags: ParsedArgs["flags"],
  name: string,
): string | undefined {
  const v = flags[name];
  if (v === undefined || typeof v === "boolean") return undefined;
  return v;
}

/** Read a flag as a boolean presence check. */
export function bool(flags: ParsedArgs["flags"], name: string): boolean {
  return Boolean(flags[name]);
}

/** Read a flag as an integer, returning undefined when absent/NaN. */
export function int(
  flags: ParsedArgs["flags"],
  name: string,
): number | undefined {
  const v = str(flags, name);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/** Split a comma-separated flag into a trimmed, de-duplicated list. */
export function list(
  flags: ParsedArgs["flags"],
  name: string,
): string[] | undefined {
  const v = str(flags, name);
  if (v === undefined) return undefined;
  const items = v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length ? [...new Set(items)] : undefined;
}
