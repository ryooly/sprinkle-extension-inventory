import { Category } from "../../db/schema";
import { buildPrompt } from "../../depends/gpt-automation";
import { ExtensionRepo } from "../../github-explorer/api-engine";
import {
  mapAiResponseToExtensionRepo,
  type RepoCandidateContext,
} from "../../depends/ai-response-mapper";
import { validateExtensionRepo } from "../../depends/extension-utils";

const AVAILABLE_CATEGORIES: Category[] = [
  "productivity",
  "developer_tools",
  "communication",
  "design",
  "finance",
  "security",
  "education",
  "entertainment",
  "social",
  "utilities",
  "general",
  "misc",
  "other",
];

export class GeminiBrowsingProvider {
  name = "gemini-browsing";
  private apiKey: string;
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(
    candidate: RepoCandidateContext,
    categories: Category[] = AVAILABLE_CATEGORIES,
  ): Promise<ExtensionRepo | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const prompt = buildPrompt(candidate.link, categories);

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
    const rawText: string =
      json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const mapped = mapAiResponseToExtensionRepo(rawText, candidate);
    if (!mapped) return null;

    const validated = validateExtensionRepo(mapped);
    return validated.valid ? validated.data : null;
  }
}

export class GithubAIEngine {
  private provider: GeminiBrowsingProvider;

  constructor(provider: GeminiBrowsingProvider) {
    this.provider = provider;
  }

  async processGithubSearchResults(
    searchResultItems: RepoCandidateContext[],
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    concurrency: number = 3,
  ): Promise<ExtensionRepo[]> {
    return this.analyzeMany(searchResultItems, availableCategories, concurrency);
  }

  async analyze(
    candidate: RepoCandidateContext,
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    maxRetries: number = 2,
  ): Promise<ExtensionRepo | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.provider.generate(
          candidate,
          availableCategories,
        );

        if (result) return result;

        console.warn(
          `[GithubAIEngine] Attempt ${attempt + 1} failed to parse ${candidate.fullName}, retrying...`,
        );
      } catch (err) {
        console.error(
          `[GithubAIEngine] Error analyzing ${candidate.fullName}:`,
          err,
        );
      }
    }

    console.error(
      `[GithubAIEngine] Gave up after ${maxRetries + 1} attempts: ${candidate.fullName}`,
    );
    return null;
  }

  async analyzeMany(
    candidates: RepoCandidateContext[],
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    concurrency: number = 3,
  ): Promise<ExtensionRepo[]> {
    const results: ExtensionRepo[] = [];

    for (let i = 0; i < candidates.length; i += concurrency) {
      const batch = candidates.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((candidate) =>
          this.analyze(candidate, availableCategories),
        ),
      );
      results.push(
        ...batchResults.filter((result): result is ExtensionRepo => result !== null),
      );
    }

    return results;
  }
}
