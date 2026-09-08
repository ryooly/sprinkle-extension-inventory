// cli/lib/output.ts
//
// Small, dependency-free console helpers: colors, headings, success/error
// lines, key/value panels, tables and JSON dumping. All color usage respects
// the `color` flag resolved in config.ts.

import { currentConfig } from "./config";

const CODES = {
  reset: 0,
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
} as const;

type ColorName = keyof typeof CODES;

function paint(text: string, ...styles: ColorName[]): string {
  if (!currentConfig().color) return text;
  const prefix = styles.map((s) => `\x1b[${CODES[s]}m`).join("");
  return `${prefix}${text}\x1b[0m`;
}

export const c = {
  bold: (t: string) => paint(t, "bold"),
  dim: (t: string) => paint(t, "dim"),
  red: (t: string) => paint(t, "red"),
  green: (t: string) => paint(t, "green"),
  yellow: (t: string) => paint(t, "yellow"),
  blue: (t: string) => paint(t, "blue"),
  magenta: (t: string) => paint(t, "magenta"),
  cyan: (t: string) => paint(t, "cyan"),
  gray: (t: string) => paint(t, "gray"),
};

export function log(...args: unknown[]): void {
  console.log(...args);
}

export function heading(title: string): void {
  log("");
  log(c.bold(c.cyan(title)));
  log(c.gray("─".repeat(Math.max(title.length, 24))));
}

export function success(message: string): void {
  log(`${c.green("✔")} ${message}`);
}

export function warn(message: string): void {
  log(`${c.yellow("▲")} ${message}`);
}

export function error(message: string): void {
  log(`${c.red("✖")} ${message}`);
}

export function info(message: string): void {
  log(`${c.blue("ℹ")} ${message}`);
}

/** Print an aligned `key: value` panel, skipping null/undefined values. */
export function fields(rows: Record<string, unknown>): void {
  const entries = Object.entries(rows).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return;
  const width = Math.max(...entries.map(([k]) => k.length));
  for (const [key, value] of entries) {
    log(`  ${c.gray(key.padEnd(width))}  ${formatValue(value)}`);
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return c.dim("—");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Render a simple table given a header row and data rows. */
export function table(headers: string[], rows: (string | number)[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(
      stripAnsi(h).length,
      ...rows.map((r) => stripAnsi(String(r[i] ?? "")).length),
    ),
  );
  // Pad using the visible (ANSI-stripped) length so colors don't break columns.
  const colorLine = (cells: (string | number)[]) =>
    "  " +
    cells
      .map((cell, i) => {
        const raw = String(cell ?? "");
        const pad = Math.max(0, widths[i] - stripAnsi(raw).length);
        return raw + " ".repeat(pad);
      })
      .join("  ");

  log(colorLine(headers.map((h) => c.bold(h))));
  log("  " + widths.map((w) => c.gray("─".repeat(w))).join("  "));
  for (const row of rows) log(colorLine(row));
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

/** Print any value as formatted JSON, honoring the --json global flag. */
export function json(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
