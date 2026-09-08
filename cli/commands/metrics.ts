// cli/commands/metrics.ts
//
// Automation-engine metric counters (backend prefix `/extensions`, public —
// these routes are registered without the auth middleware):
//   POST /extensions/:id/view       → increment views
//   POST /extensions/:id/download   → increment downloads
//   POST /extensions/:id/displayed  → increment amountDisplayed

import { http, errorMessage, type HttpResult } from "../lib/http";
import * as out from "../lib/output";
import { str } from "../lib/args";
import type { CommandDef, CommandContext } from "../lib/util";

function bodyOf(res: HttpResult): Record<string, unknown> {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Record<
    string,
    unknown
  >;
}

async function bump(
  ctx: CommandContext,
  action: "view" | "download" | "displayed",
  label: string,
): Promise<void> {
  const id = ctx.args[0] ?? str(ctx.flags, "id");
  if (!id) {
    out.error(`Usage: metric-${action} <extensionId>`);
    process.exitCode = 1;
    return;
  }

  const res = await http.post(
    `/extensions/${encodeURIComponent(id)}/${action}`,
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    out.heading(label);
    out.success(`Incremented ${action} for ${id}`);
    if (data) {
      out.fields({
        views: data.views,
        downloads: data.downloads,
        amountDisplayed: data.amountDisplayed,
      });
    }
  } else {
    out.error(`${action} failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

export const metricCommands: CommandDef[] = [
  {
    name: "metric-view",
    group: "metrics",
    summary: "Increment view count (POST /extensions/:id/view)",
    usage: "metric-view <extensionId>",
    handler: (ctx) => bump(ctx, "view", "View +1"),
  },
  {
    name: "metric-download",
    group: "metrics",
    summary: "Increment download count (POST /extensions/:id/download)",
    usage: "metric-download <extensionId>",
    handler: (ctx) => bump(ctx, "download", "Download +1"),
  },
  {
    name: "metric-displayed",
    group: "metrics",
    summary: "Increment displayed count (POST /extensions/:id/displayed)",
    usage: "metric-displayed <extensionId>",
    handler: (ctx) => bump(ctx, "displayed", "Displayed +1"),
  },
];
