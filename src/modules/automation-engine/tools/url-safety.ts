import axios from "axios";
import { logger } from "@/logger";

const SAFE_BROWSING_ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const CLIENT_ID = "sprinkle-automation-engine";
const CLIENT_VERSION = "1.0.0";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const;

export type UrlSafetyCheckOptions = {
  key?: string;
  timeoutMs?: number;
};

export type UrlSafetyBatchOptions = UrlSafetyCheckOptions & {
  delayMs?: number;
};

export type UrlThreatMatch = {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  cacheDuration?: string;
};

export type UrlSafetyVerdict = {
  url: string;
  safe: boolean;
  threats: UrlThreatMatch[];
  checkedAt: string;
  skippedOnError: boolean;
};

type SafeBrowsingResponse = {
  matches?: UrlThreatMatch[];
};

function resolveKey(key?: string): string | undefined {
  const trimmed =
    key?.trim() || process.env.GOOGLE_SAFE_BROWSING_KEY?.trim() || "";

  return trimmed.length > 0 ? trimmed : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkUrlSafety(
  urlToScan: string,
  options: UrlSafetyCheckOptions = {},
): Promise<UrlSafetyVerdict> {
  const url = urlToScan?.trim() ?? "";
  const base = { url, checkedAt: new Date().toISOString() };

  if (!url) {
    return { ...base, safe: true, threats: [], skippedOnError: true };
  }

  const key = resolveKey(options.key);

  if (!key) {
    logger.warn(
      { url },
      "Google Safe Browsing key missing (GOOGLE_SAFE_BROWSING_KEY); check skipped",
    );
    return { ...base, safe: true, threats: [], skippedOnError: true };
  }

  try {
    const { data } = await axios.post<SafeBrowsingResponse>(
      SAFE_BROWSING_ENDPOINT,
      {
        client: { clientId: CLIENT_ID, clientVersion: CLIENT_VERSION },
        threatInfo: {
          threatTypes: [...THREAT_TYPES],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      },
      {
        params: { key },
        timeout: options.timeoutMs ?? 8000,
      },
    );

    const threats = data?.matches ?? [];
    const safe = threats.length === 0;

    if (!safe) {
      logger.warn(
        { url, threats },
        "Google Safe Browsing flagged URL as unsafe",
      );
    }

    return { ...base, safe, threats, skippedOnError: false };
  } catch (error) {
    logger.warn(
      {
        url,
        err: axios.isAxiosError(error) ? error.message : String(error),
      },
      "Google Safe Browsing check failed; treating URL as safe",
    );

    return { ...base, safe: true, threats: [], skippedOnError: true };
  }
}

export async function checkUrlsSafety(
  urls: string[],
  options: UrlSafetyBatchOptions = {},
): Promise<UrlSafetyVerdict[]> {
  const delayMs = options.delayMs ?? 1000;
  const verdicts: UrlSafetyVerdict[] = [];

  for (let i = 0; i < urls.length; i++) {
    verdicts.push(
      await checkUrlSafety(urls[i], {
        key: options.key,
        timeoutMs: options.timeoutMs,
      }),
    );

    if (i < urls.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  return verdicts;
}
