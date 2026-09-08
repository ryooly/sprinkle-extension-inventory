// cli/lib/prompt.ts
//
// Interactive prompts built on node:readline (works under Bun). Used when a
// command is invoked without the flags it needs, so the CLI is comfortable for
// manual exploration while staying fully scriptable via flags.

import * as readline from "node:readline";
import { stdout, stdin } from "node:process";

function withInterface<T>(
  fn: (rl: readline.Interface) => Promise<T>,
): Promise<T> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return fn(rl).finally(() => rl.close());
}

/** Ask a question and return the trimmed answer. Repeats while empty. */
export async function ask(
  question: string,
  opts: { default?: string } = {},
): Promise<string> {
  const suffix = opts.default ? ` ${dim(`(${opts.default})`)}` : "";
  return withInterface(async (rl) => {
    for (;;) {
      const answer = await question_(rl, `${question}${suffix}: `);
      const value = answer.trim();
      if (value.length > 0) return value;
      if (opts.default !== undefined) return opts.default;
      stdout.write(dim("  Value is required.\n"));
    }
  });
}

/** Ask for a password with echo disabled (falls back to visible on non-TTY). */
export async function askPassword(question: string): Promise<string> {
  if (!(stdin as { isTTY?: boolean }).isTTY) {
    // Non-interactive: read a line normally (used when piping input).
    return ask(question);
  }
  return withInterface(async (rl) => {
    for (;;) {
      await muteStdout(true);
      const answer = await question_(rl, `${question}: `);
      await muteStdout(false);
      stdout.write("\n");
      if (answer.trim().length > 0) return answer;
      stdout.write(dim("  Value is required.\n"));
    }
  });
}

/** Yes/no confirmation. Defaults to `false` when the user just presses enter. */
export async function confirm(
  question: string,
  defaultValue = false,
): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = await ask(`${question} ${dim(`[${hint}]`)}`);
  const v = answer.trim().toLowerCase();
  if (v === "") return defaultValue;
  return v === "y" || v === "yes";
}

function question_(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

// Toggle terminal echo so passwords are not displayed while typing.
function muteStdout(mute: boolean): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (mute) {
        (
          stdin as unknown as { setRawMode?: (m: boolean) => void }
        ).setRawMode?.(true);
        stdout.write("\x1b[8m"); // ANSI hidden text
      } else {
        stdout.write("\x1b[0m");
        (
          stdin as unknown as { setRawMode?: (m: boolean) => void }
        ).setRawMode?.(false);
      }
    } catch {
      /* ignore: not all environments support raw mode */
    }
    resolve();
  });
}

function dim(text: string): string {
  return process.env.NO_COLOR ? text : `\x1b[2m${text}\x1b[0m`;
}
