import { Category, VerificationStatus, BrowserPermission, buildPrompt } from "../../depends/gpt-automation";

export interface ExtensionRepo {
  name: string;
  publisher: string;
  description: string;
  downloadUrl: string;
  category: Category[];
  verified?: VerificationStatus;
  verificationPercentage?: number;
  permissions?: BrowserPermission[];
}

function parseAIResponse(raw: string, fallbackUrl: string): ExtensionRepo | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.name || !parsed.description || !Array.isArray(parsed.category)) {
      return null;
    }

    return {
      name: String(parsed.name),
      publisher: String(parsed.publisher ?? "unknown"),
      description: String(parsed.description),
      downloadUrl: fallbackUrl,
      category: parsed.category as Category[],
      permissions: Array.isArray(parsed.permissions)
        ? (parsed.permissions as BrowserPermission[])
        : undefined,
      verificationPercentage:
        typeof parsed.verificationPercentage === "number"
          ? Math.min(100, Math.max(0, parsed.verificationPercentage))
          : undefined,
      verified: parsed.verified as VerificationStatus | undefined,
    }; // bergantung pada ai bekerja 
  } catch {
    return null;
  }
}

const AVAILABLE_CATEGORIES: Category[] = [
  "productivity",
  "developer-tools",
  "privacy-security",
  "shopping",
  "social-media",
  "entertainment",
  "other",
];

export class GeminiBrowsingProvider {
  name = "gemini-browsing";
  private apiKey: string;
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    this.apiKey = ; /// ganti pake key yang langusng di integrasikan disini 
    this.model = model;
  }

  async generate(link: string, categories: Category[] = AVAILABLE_CATEGORIES): Promise<ExtensionRepo | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const prompt = buildPrompt(link, categories);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ urlContext: {} }, { googleSearch: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    const rawText: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return parseAIResponse(rawText, link);
  }
}

export class GithubAIEngine {
  private provider: GeminiBrowsingProvider;

  constructor(provider: GeminiBrowsingProvider) {
    this.provider = provider;
  }

  async processGithubSearchResults(
    searchResultItems: Array<{ link: string }>, 
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    concurrency: number = 3
  ): Promise<ExtensionRepo[]> {
    const links = searchResultItems.map((item) => item.link);

    return this.analyzeMany(links);
  }

  async analyze(
    link: string,
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    maxRetries: number = 2
  ): Promise<ExtensionRepo | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.provider.generate(link, availableCategories);

        if (result) return result;

        console.warn(`[GithubAIEngine] Percobaan ${attempt + 1} gagal parse untuk ${link}, retry...`);
      } catch (err) {
        console.error(`[GithubAIEngine] Error saat analisis ${link}:`, err);
      }
    }

    console.error(`[GithubAIEngine] Menyerah setelah ${maxRetries + 1}x: ${link}`);
    return null;
  }

  async analyzeMany(
    links: string[],
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    concurrency: number = 3
  ): Promise<ExtensionRepo[]> {
    const results: ExtensionRepo[] = [];

    for (let i = 0; i < links.length; i += concurrency) {
      const batch = links.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((link) => this.analyze(link, availableCategories))
      );
      results.push(...batchResults.filter((r): r is ExtensionRepo => r !== null));
    }

    return results;
  }
}
