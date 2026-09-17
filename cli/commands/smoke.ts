// cli/commands/smoke.ts
//
// End-to-end verification runner. It walks the whole backend surface with a
// throwaway account and reports PASS / FAIL / SKIP per endpoint, so you can
// confirm everything works before building the frontend.
//
// Flow: error-contract probe → register → login → getUserByUsername →
// beBuilder → create extension → search (name/category/browser) → metrics
// (view/download/displayed) → edit → delete → payment-create → showcase
// (public + premium gate) → premium-showcase 200 (seeded demo) → webhook
// signature → auth-guard checks (each asserting the canonical error envelope)
// → logout.
//
// It runs against an isolated temp session file so your real login is untouched.

import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { http, errorMessage, type HttpResult } from "../lib/http";
import { checkErrorShape } from "../lib/errors";
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

// Assert the response body matches the one canonical error envelope
// ({ success: false, message, status }). Returns null when it conforms, or a
// short reason describing the mismatch so it can go straight into a detail.
function errorShapeProblem(res: HttpResult): string | null {
  const check = checkErrorShape(res);
  return check.ok ? null : check.reason;
}

// Premium demo account provisioned by `bun run seed` (src/db/seed.ts). Keep
// these in sync with the DEMO_* constants there — the runner logs in as this
// account to exercise the 200 premium-showcase path.
const PREMIUM_DEMO_EMAIL = "premium_demo@sprinkle.local";
const PREMIUM_DEMO_PASSWORD = "premium123";
// A date with no pinned showcase rows: getPremiumShowcase returns 200 with an
// empty set and never reaches the AI-enrichment stage, so the 200 gate check is
// deterministic and offline.
const EMPTY_SHOWCASE_DATE = "1970-01-01";

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

  // 0. Error contract -------------------------------------------------------
  // Database-independent pre-flight: a malformed register body is rejected by
  // schema validation before any handler runs, so this proves the gateway
  // speaks the one canonical error envelope even with an empty/unmigrated DB.
  await record(
    "error shape",
    "POST /user/register (invalid body)",
    async () => {
      const res = await http.post(
        "/user/register",
        { username: "x", email: "not-an-email", password: "1" },
        { updateSession: false },
      );
      if (res.ok)
        return {
          verdict: "fail",
          detail: `expected a 4xx error but got ${res.status}`,
        };
      const problem = errorShapeProblem(res);
      if (problem)
        return {
          verdict: "fail",
          detail: `non-canonical error body: ${problem}`,
        };
      return {
        verdict: "pass",
        detail: `${res.status} → { success:false, message, status }`,
      };
    },
  );

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

  // 15. daily showcase (public) — the visible end-to-end output of the
  //     automation engine's daily job. An empty pool is still a healthy 200
  //     with success=true, so this passes even before the cron has run. ------
  await record("showcase", "GET /showcase", async () => {
    const res = await http.get("/showcase");
    if (!res.ok)
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    const payload = bodyOf(res);
    if (payload.success !== true)
      return { verdict: "fail", detail: "response missing success=true" };
    const data = payload.data as
      | { date?: string | null; extensions?: unknown }
      | undefined;
    const rows = Array.isArray(data?.extensions)
      ? (data?.extensions as unknown[])
      : [];
    const date = data?.date ?? null;
    return {
      verdict: "pass",
      detail: date
        ? `${rows.length} extension(s) @ ${date}`
        : "empty pool (200 OK)",
    };
  });

  await record("showcase premium", "GET /showcase/premium", async () => {
    const res = await http.get("/showcase/premium", { useSession: true });
    if (res.status === 403) {
      const problem = errorShapeProblem(res);
      return problem
        ? { verdict: "fail", detail: `non-canonical 403 body: ${problem}` }
        : {
            verdict: "pass",
            detail: "gated: premium required (canonical body)",
          };
    }
    if (res.ok)
      return { verdict: "pass", detail: "premium data returned (200)" };
    if (res.status === 401)
      return {
        verdict: "fail",
        detail: "session rejected (401) — login cookie not honoured",
      };
    return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
  });

  // 17. premium showcase (anonymous) — must be guarded by authMiddleware. ----
  await record(
    "showcase premium (anon)",
    "GET /showcase/premium (anon)",
    async () => {
      const res = await http.get("/showcase/premium", {
        useSession: false,
        updateSession: false,
      });
      if (res.status === 401 || res.status === 403) {
        const problem = errorShapeProblem(res);
        return problem
          ? {
              verdict: "fail",
              detail: `non-canonical ${res.status} body: ${problem}`,
            }
          : {
              verdict: "pass",
              detail: `rejected with ${res.status} (canonical body)`,
            };
      }
      return {
        verdict: "fail",
        detail: `NOT guarded — anonymous request reached premium showcase (${res.status})`,
      };
    },
  );

  // 18. premium showcase (200) — proves a seeded ACTIVE subscription flips the
  //     gate from 403 to 200. Logs in as the demo account created by
  //     `bun run seed`; skips (not fails) when that account is absent so the
  //     suite still runs on a fresh DB. An empty historical date is requested so
  //     the AI-enrichment stage is skipped deterministically (no Gemini key or
  //     network needed) — we assert the gate + envelope, not the AI output.
  await record(
    "premium showcase (200)",
    "GET /showcase/premium (seeded premium)",
    async () => {
      const login = await http.post("/user/login", {
        email: PREMIUM_DEMO_EMAIL,
        password: PREMIUM_DEMO_PASSWORD,
      });
      if (login.status === 401 || login.status === 404) {
        return {
          verdict: "skip",
          detail: "premium demo account absent — run `bun run seed`",
        };
      }
      if (!login.ok) {
        return {
          verdict: "fail",
          detail: `demo login failed (${login.status}): ${errorMessage(login)}`,
        };
      }

      const res = await http.get("/showcase/premium", {
        query: { date: EMPTY_SHOWCASE_DATE },
        useSession: true,
      });
      if (res.ok) {
        if (bodyOf(res).success !== true)
          return { verdict: "fail", detail: "200 but missing success=true" };
        return { verdict: "pass", detail: "premium gate open (200)" };
      }
      if (res.status === 403)
        return {
          verdict: "fail",
          detail: "still gated (403) — seeded subscription is not active",
        };
      if (res.status === 401)
        return {
          verdict: "fail",
          detail: "demo session rejected (401) — login cookie not honoured",
        };
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    },
  );

  // 19. webhook signature — /payment/gateway is registered before authMiddleware
  //     and authenticates via Midtrans' signature_key. A forged signature must be
  //     rejected with 403 (canonical body) BEFORE any DB lookup, so this step is
  //     DB- and Midtrans-independent. The accept path is unit-tested in
  //     tests/payment-webhook.test.ts.
  await record(
    "webhook signature",
    "POST /payment/gateway (bad signature)",
    async () => {
      const res = await http.post(
        "/payment/gateway",
        {
          order_id: `SMOKE-${Date.now()}`,
          transaction_id: "smoke-txn",
          transaction_status: "settlement",
          payment_type: "bank_transfer",
          gross_amount: "99000.00",
          status_code: "200",
          signature_key: "0".repeat(128), // deliberately forged
        },
        { useSession: false, updateSession: false },
      );
      if (res.status === 403) {
        const problem = errorShapeProblem(res);
        return problem
          ? { verdict: "fail", detail: `non-canonical 403 body: ${problem}` }
          : {
              verdict: "pass",
              detail: "forged signature rejected (403, canonical body)",
            };
      }
      if (res.ok)
        return {
          verdict: "fail",
          detail: "forged signature ACCEPTED — webhook is not verifying",
        };
      return { verdict: "fail", detail: `${res.status}: ${errorMessage(res)}` };
    },
  );

  // 20. auth guard: a protected route must reject anonymous callers ---------
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
        const problem = errorShapeProblem(res);
        return problem
          ? {
              verdict: "fail",
              detail: `non-canonical ${res.status} body: ${problem}`,
            }
          : {
              verdict: "pass",
              detail: `rejected with ${res.status} (canonical body)`,
            };
      }
      return {
        verdict: "fail",
        detail: `NOT guarded — anonymous request reached the handler (${res.status})`,
      };
    },
  );

  // 21. logout --------------------------------------------------------------
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
