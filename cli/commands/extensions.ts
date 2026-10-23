import { http, errorMessage, type HttpResult } from "../lib/http";
import { loadSession } from "../lib/session";
import * as out from "../lib/output";
import { ask } from "../lib/prompt";
import { str, bool, list } from "../lib/args";
import {
  CATEGORIES,
  BROWSERS,
  isBrowser,
  isCategory,
  isSource,
  type CommandDef,
  type CommandContext,
} from "../lib/util";

type Row = Record<string, unknown>;

function bodyOf(res: HttpResult): Row {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Row;
}

function requireSession(): boolean {
  const s = loadSession();
  if (!s || (!s.auth && !s.accountId)) {
    out.warn("Not logged in — extension routes require a builder session.");
    out.info("Run `login` (and `be-builder` once) first.");
    return false;
  }
  return true;
}

function printExtensions(rows: Row[]): void {
  if (!rows.length) {
    out.info("No extensions returned.");
    return;
  }
  out.table(
    ["id", "name", "browsers", "developer", "views", "downloads"],
    rows.map((r) => [
      String(r.id ?? "").slice(0, 8),
      String(r.name ?? ""),
      formatBrowsers(r.supportedBrowsers),
      String(r.developer ?? ""),
      String(r.views ?? r.view ?? 0),
      String(r.downloads ?? r.download ?? 0),
    ]),
  );
}

function formatBrowsers(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join(",") : "";
}

function printOne(r: Row): void {
  out.fields({
    id: r.id,
    name: r.name,
    description: r.description,
    developer: r.developer,
    link: r.extensionLink,
    browsers: formatBrowsers(r.supportedBrowsers),
    source: r.source,
    views: r.views,
    downloads: r.downloads,
  });
}

async function createExtension(ctx: CommandContext): Promise<void> {
  if (!requireSession()) {
    process.exitCode = 1;
    return;
  }
  const interactive = !bool(ctx.flags, "no-prompt");
  const name =
    str(ctx.flags, "name") ?? (interactive ? await ask("Name") : undefined);
  const description =
    str(ctx.flags, "description") ??
    (interactive ? await ask("Description") : undefined);
  const developer =
    str(ctx.flags, "developer") ??
    (interactive ? await ask("Developer") : undefined);
  const extensionLink =
    str(ctx.flags, "link") ??
    (interactive ? await ask("Extension link (url)") : undefined);
  const browsers = list(ctx.flags, "browsers") ?? list(ctx.flags, "browser");
  const categories = list(ctx.flags, "categories");
  const source = str(ctx.flags, "source");

  if (!name || !description || !developer || !extensionLink) {
    out.error(
      "Missing required field(s): --name --description --developer --link",
    );
    process.exitCode = 1;
    return;
  }
  if (!browsers || !browsers.length) {
    out.error(
      `--browsers is required (comma-separated). Options: ${BROWSERS.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }
  for (const browser of browsers) {
    if (!isBrowser(browser)) {
      out.error(`--browsers values must be one of: ${BROWSERS.join(", ")}`);
      process.exitCode = 1;
      return;
    }
  }
  if (!categories || !categories.length) {
    out.error(
      `--categories is required (comma-separated). Options: ${CATEGORIES.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }
  for (const cat of categories) {
    if (!isCategory(cat)) {
      out.error(`Unknown category "${cat}". Options: ${CATEGORIES.join(", ")}`);
      process.exitCode = 1;
      return;
    }
  }
  if (source && !isSource(source)) {
    out.error(`--source must be one of: github, gitlab, bitbucket, other`);
    process.exitCode = 1;
    return;
  }

  const payload: Row = {
    name,
    description,
    developer,
    extensionLink,
    supportedBrowsers: browsers,
    categories,
    ...(source ? { source } : {}),
  };

  const res = await http.post("/extensions/creating", payload, {
    useSession: true,
  });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Extension created");
    out.success(`Created "${name}"`);
    printOne(bodyOf(res).data as Row);
  } else {
    out.error(`Create failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function editExtension(ctx: CommandContext): Promise<void> {
  if (!requireSession()) {
    process.exitCode = 1;
    return;
  }
  const id = ctx.args[0] ?? str(ctx.flags, "id");
  if (!id) {
    out.error(
      "Usage: edit-extension <id> [--name ...] [--description ...] [--categories a,b]",
    );
    process.exitCode = 1;
    return;
  }

  const data: Row = {};
  const name = str(ctx.flags, "name");
  const description = str(ctx.flags, "description");
  const developer = str(ctx.flags, "developer");
  const link = str(ctx.flags, "link");
  const source = str(ctx.flags, "source");
  const browsers = list(ctx.flags, "browsers") ?? list(ctx.flags, "browser");
  const categories = list(ctx.flags, "categories");

  if (name) data.name = name;
  if (description) data.description = description;
  if (developer) data.developer = developer;
  if (link) data.extensionLink = link;
  if (source) data.source = source;

  if (browsers) {
    for (const browser of browsers) {
      if (!isBrowser(browser)) {
        out.error(`--browsers values must be one of: ${BROWSERS.join(", ")}`);
        process.exitCode = 1;
        return;
      }
    }
    data.supportedBrowsers = browsers;
  }

  if (categories) {
    for (const cat of categories) {
      if (!isCategory(cat)) {
        out.error(
          `Unknown category "${cat}". Options: ${CATEGORIES.join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
    }
    data.categories = categories;
  }

  if (Object.keys(data).length === 0) {
    out.error("Nothing to update — pass at least one field to change.");
    process.exitCode = 1;
    return;
  }

  const res = await http.patch(`/extensions/${encodeURIComponent(id)}`, data, {
    useSession: true,
  });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Extension updated");
    out.success(`Updated ${id}`);
    printOne(bodyOf(res).data as Row);
  } else {
    out.error(`Update failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function deleteExtension(ctx: CommandContext): Promise<void> {
  if (!requireSession()) {
    process.exitCode = 1;
    return;
  }
  const id = ctx.args[0] ?? str(ctx.flags, "id");
  if (!id) {
    out.error("Usage: delete-extension <id>");
    process.exitCode = 1;
    return;
  }

  const res = await http.delete(`/extensions/${encodeURIComponent(id)}`, {
    useSession: true,
  });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading("Extension deleted");
    out.success(`Deleted ${id}`);
  } else {
    out.error(`Delete failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function searchByName(ctx: CommandContext): Promise<void> {
  const name = ctx.args[0] ?? str(ctx.flags, "name");
  if (!name) {
    out.error("Usage: search-name <name>");
    process.exitCode = 1;
    return;
  }
  const res = await http.get("/extensions/search/by-name", {
    query: { name },
    useSession: true,
  });
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading(`Search by name: "${name}"`);
    printExtensions((bodyOf(res).data as Row[]) ?? []);
  } else {
    out.error(`Search failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function searchByCategory(ctx: CommandContext): Promise<void> {
  const category = ctx.args[0] ?? str(ctx.flags, "category");
  if (!category || !isCategory(category)) {
    out.error(
      `Usage: search-category <category>. Options: ${CATEGORIES.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }
  const res = await http.post(
    "/extensions/search/by-category",
    { category },
    { useSession: true },
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading(`Search by category: "${category}"`);
    printExtensions((bodyOf(res).data as Row[]) ?? []);
  } else {
    out.error(`Search failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

async function searchByBrowser(ctx: CommandContext): Promise<void> {
  const browser = ctx.args[0] ?? str(ctx.flags, "browser");
  if (!browser || !isBrowser(browser)) {
    out.error(
      `Usage: search-browser <browser>. Options: ${BROWSERS.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }
  const res = await http.post(
    "/extensions/search/by-browser",
    { browser },
    { useSession: true },
  );
  if (ctx.json) return out.json(res.data);

  if (res.ok) {
    out.heading(`Search by browser: "${browser}"`);
    printExtensions((bodyOf(res).data as Row[]) ?? []);
  } else {
    out.error(`Search failed (${res.status}): ${errorMessage(res)}`);
    process.exitCode = 1;
  }
}

export const extensionCommands: CommandDef[] = [
  {
    name: "create-extension",
    group: "extensions",
    summary: "Create an extension (POST /extensions/creating)",
    usage:
      "create-extension --name <n> --description <d> --developer <dev> --link <url> --browsers <chrome,edge> --categories <a,b> [--source <s>]",
    handler: createExtension,
  },
  {
    name: "edit-extension",
    group: "extensions",
    summary: "Edit an extension (PATCH /extensions/:id)",
    usage:
      "edit-extension <id> [--name] [--description] [--developer] [--link] [--categories a,b] [--source] [--browsers a,b]",
    handler: editExtension,
  },
  {
    name: "delete-extension",
    aliases: ["rm-extension"],
    group: "extensions",
    summary: "Delete an extension (DELETE /extensions/:id)",
    usage: "delete-extension <id>",
    handler: deleteExtension,
  },
  {
    name: "search-name",
    group: "extensions",
    summary: "Search extensions by name (GET /extensions/search/by-name)",
    usage: "search-name <name>",
    handler: searchByName,
  },
  {
    name: "search-category",
    group: "extensions",
    summary:
      "Search extensions by category (POST /extensions/search/by-category)",
    usage: "search-category <category>",
    handler: searchByCategory,
  },
  {
    name: "search-browser",
    group: "extensions",
    summary:
      "Search extensions by browser (POST /extensions/search/by-browser)",
    usage: "search-browser <chrome|opera|edge>",
    handler: searchByBrowser,
  },
];
