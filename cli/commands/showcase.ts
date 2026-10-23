import { http, errorMessage, type HttpResult } from "../lib/http";
import { loadSession } from "../lib/session";
import * as out from "../lib/output";
import { str } from "../lib/args";
import type { CommandDef, CommandContext } from "../lib/util";

type Row = Record<string, unknown>;

function bodyOf(res: HttpResult): Row {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Row;
}

function showcaseOf(res: HttpResult): { date: string | null; rows: Row[] } {
  const data = bodyOf(res).data as
    | { date?: string | null; extensions?: unknown }
    | undefined;
  const rows = Array.isArray(data?.extensions)
    ? (data?.extensions as Row[])
    : [];
  return { date: data?.date ?? null, rows };
}

function printShowcase(date: string | null, rows: Row[]): void {
  out.fields({ date: date ?? "none" });
  if (!rows.length) {
    out.info("No extensions pinned for this date.");
    out.info(
      "Run the automation daily job (`bun run automation`) to populate the showcase.",
    );
    return;
  }
  out.table(
    ["name", "developer", "browsers", "status", "link"],
    rows.map((r) => [
      String(r.name ?? ""),
      String(r.developer ?? r.publisher ?? ""),
      Array.isArray(r.supportedBrowsers)
        ? r.supportedBrowsers.map(String).join(",")
        : "",
      String(r.extensionStatus ?? ""),
      String(r.extensionLink ?? r.downloadUrl ?? ""),
    ]),
  );
}

async function getShowcase(ctx: CommandContext): Promise<void> {
  const date = ctx.args[0] ?? str(ctx.flags, "date");
  const res = await http.get("/showcase", { query: { date } });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const { date: shown, rows } = showcaseOf(res);
    out.heading("Daily showcase");
    out.success(`Fetched ${rows.length} pinned extension(s)`);
    printShowcase(shown, rows);
  } else {
    out.error(`Showcase failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function getPremiumShowcase(ctx: CommandContext): Promise<void> {
  const s = loadSession();
  if (!s || (!s.auth && !s.refreshToken)) {
    out.warn("Not logged in — the premium showcase requires a session.");
    out.info("Run `login` first (with an account that holds a subscription).");
    process.exitCode = 1;
    return;
  }

  const date = ctx.args[0] ?? str(ctx.flags, "date");
  const res = await http.get("/showcase/premium", {
    query: { date },
    useSession: true,
  });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const { date: shown, rows } = showcaseOf(res);
    out.heading("Premium showcase");
    out.success(`Fetched ${rows.length} AI-enriched extension(s)`);
    printShowcase(shown, rows);
  } else if (res.status === 403) {
    out.warn(`Premium subscription required (403): ${errorMessage(res)}`);
    out.info("This account has no active subscription — see `payment-create`.");
    process.exitCode = 1;
  } else {
    out.error(`Premium showcase failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

export const showcaseCommands: CommandDef[] = [
  {
    name: "showcase",
    group: "showcase",
    summary: "Get the daily showcase (GET /showcase)",
    usage: "showcase [<YYYY-MM-DD>] [--date <YYYY-MM-DD>]",
    handler: getShowcase,
  },
  {
    name: "showcase-premium",
    group: "showcase",
    summary: "Get the premium showcase (GET /showcase/premium)",
    usage: "showcase-premium [<YYYY-MM-DD>] [--date <YYYY-MM-DD>]",
    handler: getPremiumShowcase,
  },
];
