import { Elysia, t } from "elysia";
import { db } from "@/db/client";
import { extensions } from "@/models";
import { sql, desc } from "drizzle-orm";
import { AppError } from "@/errorhandler";
import { logger } from "@/logger";
import type { ControllerResult } from "../algorithm-engine/controller/controller";
import { convertTextToJson, isJsonRecord } from "./text-to-json";

export type SourceStat = {
  source: string;
  totalExtensions: number;
  verified: number;
  views: number;
  downloads: number;
  amountDisplayed: number;
};

export type UsageStat = {
  id: string;
  name: string;
  developer: string;
  browser: string;
  views: number;
  downloads: number;
  amountDisplayed: number;
};

export type SourceInsight = {
  source: string;
  verdict: string;
  note: string;
};

export type UsageInsight = {
  pattern: string;
  evidence: string;
};

export type AnalyticsInsight = {
  summary: string;
  sourceInsights: SourceInsight[];
  usageInsights: UsageInsight[];
  recommendations: string[];
};

export type AnalyticsTotals = {
  extensions: number;
  views: number;
  downloads: number;
  amountDisplayed: number;
};

export type AnalyticsResult = {
  generatedAt: string;
  totals: AnalyticsTotals;
  sources: SourceStat[];
  topUsage: UsageStat[];
  analysis: AnalyticsInsight | null;
};

const DEFAULT_USAGE_LIMIT = 10;
const MAX_USAGE_LIMIT = 25;

const ANALYSIS_FORMAT_PROMPT = `
{
  "summary": string,
  "sourceInsights": [
    { "source": string, "verdict": "healthy" | "moderate" | "risky", "note": string }
  ],
  "usageInsights": [
    { "pattern": string, "evidence": string }
  ],
  "recommendations": string[]
}
`.trim();

function isSourceInsight(value: unknown): value is SourceInsight {
  if (!isJsonRecord(value)) return false;
  return (
    typeof value.source === "string" &&
    typeof value.verdict === "string" &&
    typeof value.note === "string"
  );
}

function isUsageInsight(value: unknown): value is UsageInsight {
  if (!isJsonRecord(value)) return false;
  return (
    typeof value.pattern === "string" && typeof value.evidence === "string"
  );
}

export function isAnalyticsInsight(value: unknown): value is AnalyticsInsight {
  if (!isJsonRecord(value)) return false;
  if (typeof value.summary !== "string") return false;
  if (!Array.isArray(value.sourceInsights)) return false;
  if (!value.sourceInsights.every(isSourceInsight)) return false;
  if (!Array.isArray(value.usageInsights)) return false;
  if (!value.usageInsights.every(isUsageInsight)) return false;
  return (
    Array.isArray(value.recommendations) &&
    value.recommendations.every((item) => typeof item === "string")
  );
}

export async function collectSourceStats(): Promise<SourceStat[]> {
  const rows = await db
    .select({
      source: extensions.source,
      totalExtensions: sql<number>`count(*)::int`,
      verified: sql<number>`count(*) filter (where ${extensions.verified} = 'verified')::int`,
      views: sql<number>`coalesce(sum(${extensions.views}), 0)::int`,
      downloads: sql<number>`coalesce(sum(${extensions.downloads}), 0)::int`,
      amountDisplayed: sql<number>`coalesce(sum(${extensions.amountDisplayed}), 0)::int`,
    })
    .from(extensions)
    .groupBy(extensions.source);

  return rows.map((row) => ({
    source: row.source,
    totalExtensions: Number(row.totalExtensions),
    verified: Number(row.verified),
    views: Number(row.views),
    downloads: Number(row.downloads),
    amountDisplayed: Number(row.amountDisplayed),
  }));
}

export async function collectUsageStats(limit: number): Promise<UsageStat[]> {
  const rows = await db.query.extensions.findMany({
    columns: {
      id: true,
      name: true,
      developer: true,
      browser: true,
      views: true,
      downloads: true,
      amountDisplayed: true,
    },
    orderBy: desc(sql`${extensions.views} + ${extensions.downloads}`),
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    developer: row.developer,
    browser: row.browser,
    views: row.views,
    downloads: row.downloads,
    amountDisplayed: row.amountDisplayed,
  }));
}

function buildTotals(sources: SourceStat[]): AnalyticsTotals {
  return sources.reduce<AnalyticsTotals>(
    (totals, source) => ({
      extensions: totals.extensions + source.totalExtensions,
      views: totals.views + source.views,
      downloads: totals.downloads + source.downloads,
      amountDisplayed: totals.amountDisplayed + source.amountDisplayed,
    }),
    { extensions: 0, views: 0, downloads: 0, amountDisplayed: 0 },
  );
}

function renderStatsText(sources: SourceStat[], usage: UsageStat[]): string {
  const sourceLines = sources.map(
    (s) =>
      `- source=${s.source} extensions=${s.totalExtensions} verified=${s.verified} views=${s.views} downloads=${s.downloads} displayed=${s.amountDisplayed}`,
  );

  const usageLines = usage.map(
    (u) =>
      `- "${u.name}" (developer=${u.developer}, browser=${u.browser}) views=${u.views} downloads=${u.downloads} displayed=${u.amountDisplayed}`,
  );

  return [
    "Browser extension catalog metrics collected from the sprinkle database.",
    "",
    "=== SOURCE STATS ===",
    sourceLines.length ? sourceLines.join("\n") : "(no sources found)",
    "",
    "=== TOP USAGE ===",
    usageLines.length ? usageLines.join("\n") : "(no usage data found)",
  ].join("\n");
}

export async function handleSourcesUsageAnalytics(
  limit: number = DEFAULT_USAGE_LIMIT,
): Promise<ControllerResult<AnalyticsResult>> {
  try {
    const sources = await collectSourceStats();
    const topUsage = await collectUsageStats(limit);

    let analysis: AnalyticsInsight | null = null;
    try {
      analysis = await convertTextToJson(
        {
          text: renderStatsText(sources, topUsage),
          formatPrompt: ANALYSIS_FORMAT_PROMPT,
        },
        isAnalyticsInsight,
      );
    } catch (err) {
      logger.warn(
        `[analytics] AI analysis unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: buildTotals(sources),
        sources,
        topUsage,
        analysis,
      },
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to analyze sources and usage", 500, {
      cause: err,
    });
  }
}

function parseUsageLimit(raw?: string): number {
  if (raw === undefined) return DEFAULT_USAGE_LIMIT;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_USAGE_LIMIT) {
    throw new AppError(
      `limit must be an integer between 1 and ${MAX_USAGE_LIMIT}`,
      400,
    );
  }

  return parsed;
}

export const aiAnalyticsRoutes = new Elysia({ prefix: "/analytics" }).get(
  "/sources-usage",
  async ({ query }) => {
    const limit = parseUsageLimit(query.limit);
    return handleSourcesUsageAnalytics(limit);
  },
  {
    query: t.Object({
      limit: t.Optional(t.String()),
    }),
  },
);
