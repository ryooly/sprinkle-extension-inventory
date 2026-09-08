#!/usr/bin/env bun
// cli/index.ts
//
// Entry point + router for the Sprinkle CLI. It is a pure HTTP client used to
// exercise the running gateway (default http://localhost:3000) so every
// endpoint can be verified before the frontend is built.
//
//   bun run cli/index.ts <command> [args] [--flags]
//   bun run cli/index.ts help
//
// Global flags: --api <url>, --session <path>, --json, --verbose/-v, --help/-h

import { parseArgs, str, bool } from "./lib/args";
import { getConfig, currentConfig, type CliConfig } from "./lib/config";
import * as out from "./lib/output";
import type { CommandDef, CommandContext } from "./lib/util";

import { authCommands } from "./commands/auth";
import { extensionCommands } from "./commands/extensions";
import { metricCommands } from "./commands/metrics";
import { paymentCommands } from "./commands/payment";
import { smokeCommands } from "./commands/smoke";

const COMMANDS: CommandDef[] = [
  ...authCommands,
  ...extensionCommands,
  ...metricCommands,
  ...paymentCommands,
  ...smokeCommands,
];

const GROUP_ORDER: CommandDef["group"][] = [
  "auth",
  "extensions",
  "metrics",
  "payment",
  "system",
];

const GROUP_TITLES: Record<CommandDef["group"], string> = {
  auth: "Auth (/user)",
  extensions: "Extensions (/extensions)",
  metrics: "Metrics (/extensions/:id/...)",
  payment: "Payment (/payment)",
  system: "System",
};

function findCommand(name: string): CommandDef | undefined {
  return COMMANDS.find(
    (cmd) => cmd.name === name || (cmd.aliases ?? []).includes(name),
  );
}

function printBanner(): void {
  const cfg = currentConfig();
  out.log(
    out.c.bold(out.c.cyan("Sprinkle CLI")) +
      out.c.dim(" — backend endpoint tester"),
  );
  out.log(out.c.dim(`API: ${cfg.apiUrl}   Session: ${cfg.sessionPath}`));
}

function printHelp(): void {
  printBanner();
  out.log("");
  out.log(out.c.bold("Usage:"));
  out.log("  bun run cli <command> [args] [--flags]");
  out.log("");

  for (const group of GROUP_ORDER) {
    const cmds = COMMANDS.filter((c) => c.group === group);
    if (!cmds.length) continue;
    out.log(out.c.bold(out.c.magenta(GROUP_TITLES[group])));
    for (const cmd of cmds) {
      const alias = cmd.aliases?.length
        ? out.c.dim(` (${cmd.aliases.join(", ")})`)
        : "";
      out.log(`  ${out.c.green(cmd.name.padEnd(18))}${cmd.summary}${alias}`);
    }
    out.log("");
  }

  out.log(out.c.bold("Global flags:"));
  out.log(`  ${out.c.gray("--api <url>")}       override the backend base URL`);
  out.log(
    `  ${out.c.gray("--session <path>")}  override where the session file is stored`,
  );
  out.log(`  ${out.c.gray("--json")}            print raw JSON responses`);
  out.log(
    `  ${out.c.gray("--verbose, -v")}     print request/response details`,
  );
  out.log(`  ${out.c.gray("--help, -h")}        show this help`);
  out.log("");
  out.log(out.c.bold("Quick start:"));
  out.log(out.c.dim("  bun run cli ping"));
  out.log(
    out.c.dim(
      "  bun run cli register --username me --email me@example.com --password secret123",
    ),
  );
  out.log(out.c.dim("  bun run cli be-builder"));
  out.log(
    out.c.dim(
      "  bun run cli smoke            # verify every endpoint end-to-end",
    ),
  );
  out.log("");
}

function printCommandHelp(cmd: CommandDef): void {
  printBanner();
  out.log("");
  out.log(`${out.c.bold(cmd.name)} — ${cmd.summary}`);
  if (cmd.aliases?.length)
    out.log(out.c.dim(`aliases: ${cmd.aliases.join(", ")}`));
  out.log("");
  out.log(out.c.bold("Usage:"));
  out.log(`  ${cmd.usage}`);
  out.log("");
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const { flags } = parsed;

  // Apply global config overrides before anything reads currentConfig().
  const overrides: Partial<CliConfig> = {
    json: bool(flags, "json"),
    verbose: bool(flags, "verbose"),
  };
  const api = str(flags, "api");
  if (api) overrides.apiUrl = api.replace(/\/+$/, "");
  const session = str(flags, "session");
  if (session) overrides.sessionPath = session;
  getConfig(overrides);

  const commandName = parsed._[0];

  if (!commandName || bool(flags, "help")) {
    if (commandName && commandName !== "help") {
      const cmd = findCommand(commandName);
      if (cmd && bool(flags, "help")) return printCommandHelp(cmd);
    }
    return printHelp();
  }

  if (commandName === "help") {
    const target = parsed._[1];
    if (target) {
      const cmd = findCommand(target);
      if (cmd) return printCommandHelp(cmd);
      out.error(`Unknown command: ${target}`);
      process.exitCode = 1;
      return;
    }
    return printHelp();
  }

  const cmd = findCommand(commandName);
  if (!cmd) {
    out.error(`Unknown command: ${commandName}`);
    out.info("Run `bun run cli help` to see all commands.");
    process.exitCode = 1;
    return;
  }

  const ctx: CommandContext = {
    args: parsed._.slice(1),
    flags,
    json: bool(flags, "json"),
  };

  try {
    await cmd.handler(ctx);
  } catch (err) {
    out.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

await main();
