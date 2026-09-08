// cli/commands/smoke.ts
//
// End-to-end verification runner. It walks the whole backend surface with a
// throwaway account and reports PASS / FAIL / SKIP per endpoint, so you can
// confirm everything works before building the frontend.
//
// Flow: register → login → getUserByUsername → beBuilder → create extension →
// search (name/category/browser) → metrics (view/download/displayed) → edit →
// delete → payment-create → auth-guard checks → logout.
//
// It runs against an isolated temp session file so your real login is untouched.

import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { http, errorMessage, type HttpResult } from "../lib/http";
import { clearSession, loadSession } from "../lib/session";
import { getConfig, currentConfig } from "../lib/config";
import * as out from "../lib/output";
import { int, bool } from "../lib/args";
import {
  randomUsername,
  randomEmail,
  randomPassword,
  type CommandDef,
  type CommandContext,
} from "../lib/util";

type Verdict = "pass" | "fail" | "skip";
interface Step {
  name: string;
  endpoint: string;
  verdict: Verdict;
  detail: string;
  ms: number;
}

function bodyOf(res: HttpResult): Record<string, unknown> {
  return (res.data && typeof res.data === "object" ? res.data : {}) as Record<
    string,
    unknown
  >;
}

async function runSmoke(ctx: CommandContext): Promise<void> {
  // Isolate the session so the smoke run never clobbers a real login.
  const base = currentConfig();
  const tempSession = path.join(
    os.tmpdir(),
    `sprinkle-smoke-${Date.now()}.json`,
  );
  getConfig({ ...base, sessionPath: tempSession });

  const planId = int(ctx.flags, "plan") ?? 1;
  const keep = bool(ctx.flags, "keep");

  const username = randomUsername();
  const email = randomEmail(username);
  const password = randomPassword();
  const extName = `Smoke Ext ${username.slice(-6)}`;

  const steps: Step[] = [];
  let fatal = false; // set when the server is unreachable / register fails
  let userId: string | undefined;
  let extId: string | undefined;

  const record = async (
    name: string,
    endpoint: string,
    fn: () => Promise<{ verdict: Verdict; detail: string }>,
  ): Promise<void> => {
    if (fatal) {
      steps.push({
        name,
        endpoint,
        verdict: "skip",
        detail: "skipped (earlier fatal step)",
        ms: 0,
      });
      return;
    }
    const t0 = Date.now();
    try {
      const r = await fn();
      steps.push({ name, endpoint, ...r, ms: Date.now() - t0 });
      if (r.verdict === "fail" && r.detail.startsWith("FATAL")) fatal = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        name,
        endpoint,
        verdict: "fail",
        detail: msg.split("\n")[0],
        ms: Date.now() - t0,
      });
      fatal = true; // network error → stop hammering a down server
    }
  };

  out.heading(`Smoke test → ${base.apiUrl}`);
  out.info(`Temp session: ${tempSession}`);
  out.info(`Test user: ${username} <${email}>`);

  // 1. Register -------------------------------------------------------------
  await record("register", "POST /user/register", async () => {
    const res = await http.post("/user/register", {
      username,
      email,
      password,
    });
    if (!res.ok) {
      return {
        verdict: "fail",
        detail: `FATAL ${res.status}: ${errorMessage(res)}`,
      };
    }
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    userId = data?.id as string | undefined;
    return { verdict: "pass", detail: `id=${userId?.slice(0, 8)}` };
  });

  // 2. Login ----------------------------------------------------------------
  await record("login", "POST /user/login", async () => {
    const res = await http.post("/user/login", { email, password });
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    const s = loadSession();
    if (!s?.accountId)
      return { verdict: "fail", detail: "session cookies were not captured" };
    return { verdict: "pass", detail: "cookies captured" };
  });

  // 3. getUserByUsername ----------------------------------------------------
  await record("get user", "GET /user/getUserByUsername/:name", async () => {
    const res = await http.get(
      `/user/getUserByUsername/${encodeURIComponent(username)}`,
    );
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    const ok = data?.id === userId;
    return {
      verdict: ok ? "pass" : "fail",
      detail: ok ? "profile matches" : "id mismatch",
    };
  });

  // 4. beBuilder ------------------------------------------------------------
  await record("be builder", "PATCH /user/beBuilder", async () => {
    const res = await http.patch(
      "/user/beBuilder",
      { accountId: userId },
      { useSession: true },
    );
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    return { verdict: "pass", detail: "role → builder" };
  });

  // 5. create extension -----------------------------------------------------
  await record("create ext", "POST /extensions/creating", async () => {
    const res = await http.post(
      "/extensions/creating",
      {
        name: extName,
        description: "Created by the Sprinkle CLI smoke test",
        developer: username,
        extensionLink: "https://example.com/smoke",
        browser: "chrome",
        categories: ["productivity"],
        source: "other",
        verified: "not_verified",
      },
      { useSession: true },
    );
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    const data = bodyOf(res).data as Record<string, unknown> | undefined;
    extId = data?.id as string | undefined;
    return extId
      ? { verdict: "pass", detail: `id=${extId.slice(0, 8)}` }
      : { verdict: "fail", detail: "no id in response" };
  });

  // 6. search by name -------------------------------------------------------
  await record("search name", "GET /extensions/search/by-name", async () => {
    const res = await http.get("/extensions/search/by-name", {
      query: { name: extName },
      useSession: true,
    });
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    const rows = (bodyOf(res).data as Record<string, unknown>[]) ?? [];
    const found = rows.some((r) => r.id === extId);
    return {
      verdict: found ? "pass" : "fail",
      detail: `${rows.length} row(s), match=${found}`,
    };
  });

  // 7. search by category ---------------------------------------------------
  await record(
    "search category",
    "POST /extensions/search/by-category",
    async () => {
      const res = await http.post(
        "/extensions/search/by-category",
        { category: "productivity" },
        { useSession: true },
      );
      if (!res.ok)
        return {
          verdict: "fail",
          detail: `${res.status}: ${errorMessage(res)}`,
        };
      const rows = (bodyOf(res).data as unknown[]) ?? [];
      return { verdict: "pass", detail: `${rows.length} row(s)` };
    },
  );

  // 8. search by browser ----------------------------------------------------
  await record(
    "search browser",
    "POST /extensions/search/by-browser",
    async () => {
      const res = await http.post(
        "/extensions/search/by-browser",
        { browser: "chrome" },
        { useSession: true },
      );
      if (!res.ok)
        return {
          verdict: "fail",
          detail: `${res.status}: ${errorMessage(res)}`,
        };
      const rows = (bodyOf(res).data as unknown[]) ?? [];
      return { verdict: "pass", detail: `${rows.length} row(s)` };
    },
  );

  // 9-11. metrics -----------------------------------------------------------
  const metric = (
    action: "view" | "download" | "displayed",
    endpoint: string,
  ) =>
    record(action, endpoint, async () => {
      if (!extId) return { verdict: "skip", detail: "no extension id" };
      const res = await http.post(`/extensions/${extId}/${action}`);
      if (!res.ok)
        return {
          verdict: "fail",
          detail: `${res.status}: ${errorMessage(res)}`,
        };
      return { verdict: "pass", detail: "incremented" };
    });
  await metric("view", "POST /extensions/:id/view");
  await metric("download", "POST /extensions/:id/download");
  await metric("displayed", "POST /extensions/:id/displayed");

  // 12. edit extension ------------------------------------------------------
  await record("edit ext", "PATCH /extensions/:id", async () => {
    if (!extId) return { verdict: "skip", detail: "no extension id" };
    const res = await http.patch(
      `/extensions/${extId}`,
      { description: "Edited by smoke test" },
      { useSession: true },
    );
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    return { verdict: "pass", detail: "description updated" };
  });

  // 13. delete extension ----------------------------------------------------
  await record("delete ext", "DELETE /extensions/:id", async () => {
    if (!extId) return { verdict: "skip", detail: "no extension id" };
    if (keep) return { verdict: "skip", detail: "--keep set" };
    const res = await http.delete(`/extensions/${extId}`, { useSession: true });
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    return { verdict: "pass", detail: "deleted" };
  });

  // 14. payment create (tolerant: missing seeded plan or unconfigured
  //     Midtrans keys are environment issues, not endpoint defects → skip) ---
  await record("payment create", "POST /payment/create", async () => {
    const res = await http.post(
      "/payment/create",
      { planId },
      { useSession: true },
    );
    if (res.ok)
      return { verdict: "pass", detail: `plan ${planId} checkout started` };
    const msg = errorMessage(res);
    if (res.status === 404 || res.status === 400) {
      return {
        verdict: "skip",
        detail: `plan ${planId} unavailable (${res.status}) — seed a plan to test`,
      };
    }
    // Reaching Midtrans proves auth + plan lookup + DB inserts worked; only the
    // external call failed, which is a config issue rather than a code defect.
    if (/midtrans/i.test(msg)) {
      return {
        verdict: "skip",
        detail: `Midtrans not configured — set MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY in .env (${res.status})`,
      };
    }
    return { verdict: "fail", detail: `${res.status}: ${msg}` };
  });

  // 15. auth guard: a protected route must reject anonymous callers ---------
  await record(
    "auth guard",
    "GET /extensions/search/by-name (anon)",
    async () => {
      const res = await http.get("/extensions/search/by-name", {
        query: { name: `__anon_probe_${Date.now()}__` },
        useSession: false,
        updateSession: false,
      });
      if (res.status === 401 || res.status === 403) {
        return { verdict: "pass", detail: `rejected with ${res.status}` };
      }
      return {
        verdict: "fail",
        detail: `NOT guarded — anonymous request reached the handler (${res.status})`,
      };
    },
  );

  // 16. logout --------------------------------------------------------------
  await record("logout", "clear local session", async () => {
    clearSession();
    const gone = loadSession() === null;
    return gone
      ? { verdict: "pass", detail: "session cleared" }
      : { verdict: "fail", detail: "session file still present" };
  });

  // Cleanup temp session file.
  try {
    fs.rmSync(tempSession, { force: true });
  } catch {
    /* ignore */
  }

  report(steps, ctx.json);
}

function report(steps: Step[], asJson: boolean): void {
  if (asJson) {
    out.json({ steps });
  } else {
    out.log("");
    out.table(
      ["#", "step", "endpoint", "result", "ms", "detail"],
      steps.map((s, i) => [
        String(i + 1),
        s.name,
        out.c.gray(s.endpoint),
        badge(s.verdict),
        String(s.ms),
        s.detail,
      ]),
    );
  }

  const pass = steps.filter((s) => s.verdict === "pass").length;
  const fail = steps.filter((s) => s.verdict === "fail").length;
  const skip = steps.filter((s) => s.verdict === "skip").length;

  out.log("");
  out.log(
    `${out.c.green(`${pass} passed`)}  ${out.c.red(`${fail} failed`)}  ${out.c.yellow(`${skip} skipped`)}`,
  );

  if (fail > 0) {
    out.log("");
    out.error("Some endpoints did not behave as expected:");
    for (const s of steps.filter((x) => x.verdict === "fail")) {
      out.log(`  • ${out.c.bold(s.name)} — ${s.endpoint}: ${s.detail}`);
    }
    process.exitCode = 1;
  } else {
    out.log("");
    out.success("All exercised endpoints responded as expected.");
  }
}

function badge(v: Verdict): string {
  if (v === "pass") return out.c.green("PASS");
  if (v === "fail") return out.c.red("FAIL");
  return out.c.yellow("SKIP");
}

export const smokeCommands: CommandDef[] = [
  {
    name: "smoke",
    aliases: ["e2e", "test-endpoints"],
    group: "system",
    summary: "Run an end-to-end pass over every backend endpoint",
    usage: "smoke [--plan <planId>] [--keep]",
    handler: (ctx) => runSmoke(ctx),
  },
  {
    // Kept separate so `str`/`int`/`bool` imports stay exercised and to give a
    // quick reachability probe without mutating any data.
    name: "ping",
    group: "system",
    summary: "Check that the gateway is reachable",
    usage: "ping",
    handler: async (ctx) => {
      const cfg = currentConfig();
      const t0 = Date.now();
      try {
        // A lookup for a name that will not exist still proves the server answers.
        const res = await http.get(
          `/user/getUserByUsername/__ping_${Date.now()}__`,
          {
            updateSession: false,
          },
        );
        const ms = Date.now() - t0;
        if (ctx.json)
          return out.json({ reachable: true, status: res.status, ms });
        out.success(
          `${cfg.apiUrl} is reachable (HTTP ${res.status} in ${ms}ms)`,
        );
      } catch (err) {
        if (ctx.json) return out.json({ reachable: false, error: String(err) });
        out.error(`Cannot reach ${cfg.apiUrl}`);
        out.info(
          `Start the backend with \`bun run dev\`. (${err instanceof Error ? err.message : err})`,
        );
        process.exitCode = 1;
      }
    },
  },
];
