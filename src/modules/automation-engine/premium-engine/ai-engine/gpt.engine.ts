/**
 * ============================================================
 *  GITHUB AI ENGINE (Browsing-capable AI does everything)
 *
 *  Engine ini SIMPEL: nerima 1 link GitHub -> lempar ke AI yang
 *  emang bisa "menelusuri" repo itu sendiri (mis. Gemini dengan
 *  tool url_context, atau agent lain yang punya browsing tool)
 *  -> AI balikin JSON lengkap: name, publisher, description,
 *  category, verificationPercentage, permissions.
 *
 *  Fokus kita di sini cuma 2 hal:
 *  1. Ngasih AI kemampuan buka link itu sendiri (tool config)
 *  2. Nulis prompt yang jelas soal FAKTOR PENILAIAN keamanan,
 *     biar verificationPercentage gak ngasal.
 * ============================================================
 */

// ------------------------------------------------------------
// 1. TYPES
// ------------------------------------------------------------

export type Category =
  | "productivity"
  | "developer-tools"
  | "privacy-security"
  | "shopping"
  | "social-media"
  | "entertainment"
  | "other";

export type VerificationStatus = "verified" | "unverified" | "flagged" | "pending";

export type BrowserPermission =
  | "storage"
  | "tabs"
  | "activeTab"
  | "cookies"
  | "history"
  | "webRequest"
  | "clipboardRead"
  | "clipboardWrite"
  | "geolocation"
  | "notifications";

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

// ------------------------------------------------------------
// 2. PROMPT — di sini letak "otak" penilaiannya (ditulis dalam
//    bahasa Inggris karena model AI umumnya lebih konsisten &
//    akurat mengikuti instruksi kompleks dalam bahasa Inggris)
// ------------------------------------------------------------
// Kita gak nyuruh AI browsing lewat instruksi teks doang (itu gak
// akan jalan kalau modelnya emang gak dikasih tool). Browsing-nya
// diaktifkan lewat KONFIGURASI API (lihat GeminiBrowsingProvider
// di bawah). Prompt ini isinya instruksi APA yang harus dinilai
// dan BAGAIMANA menilainya.

function buildPrompt(link: string, availableCategories: Category[]): string {
  return `
You are an AI security auditor for browser extensions. Open and thoroughly
investigate the following GitHub repository: ${link}

Read the README, manifest.json (or the manifest for Firefox), package.json,
commit/activity history, star/fork counts, issues, and license if available.

=== WHAT YOU MUST DETERMINE ===

1. name — the actual PRODUCT name of the extension (not just the repo folder
   name; look for the real name in the README/manifest/official website if
   mentioned).
2. publisher — the actual publisher/author/organization name.
3. description — a clear summary (max 2 sentences) of what the extension does,
   rewritten in your own words. DO NOT invent features that are never
   mentioned in the repo.
4. category — you MUST pick one or more categories ONLY from this list we
   provide (do not invent new categories outside this list):
   ${availableCategories.join(", ")}
   Match it based on the context of the extension's function as you read it
   from the README/code.
5. permissions — the browser permissions this extension actually requests
   (read the "permissions"/"host_permissions" field in manifest.json if
   available, or infer from the code/README if no manifest is found).
   Choose ONLY from: storage, tabs, activeTab, cookies, history, webRequest,
   clipboardRead, clipboardWrite, geolocation, notifications

6. verificationPercentage (0-100) — CALCULATE this based on a COMBINATION of
   the following factors, do not just guess a single number:

   a) Permission-to-function alignment (heaviest weight)
      - Are the requested permissions reasonable for the described function?
      - Sensitive permissions (webRequest, clipboardRead, history, all-sites
        access) without a clear explanation = score drops significantly.

   b) Transparency & documentation
      - Is there a clear README? Is there an open-source license? Is the
        code publicly readable?
      - A private/empty/undocumented repo = low score.

   c) Community trust signals
      - Number of stars, forks, watchers.
      - Widely used/referenced by other projects = positive signal.

   d) Activity & maintenance
      - When was the last commit? Is it actively maintained or long dead?
      - A long-abandoned repo requesting broad permissions = red flag.

   e) Suspicious indicators
      - Obfuscated/minified code without clear source?
      - Suspicious dependencies or unclear data requests to external servers?
      - README/description that doesn't match what the code actually does?

   Reflect this implicitly through the number (more red flags from factor e
   should lower the score even if other factors look good).

7. verified — derive this from verificationPercentage:
   - 80-100 -> "verified"
   - 50-79  -> "unverified"
   - below 50 with clear red flags -> "flagged"
   - too little information to judge -> "pending"

IMPORTANT: Respond with ONLY valid JSON, no markdown, no backticks, no extra
text. Format EXACTLY like this:

{
  "name": string,
  "publisher": string,
  "description": string,
  "category": string[],
  "permissions": string[],
  "verificationPercentage": number,
  "verified": string
}
`.trim();
}

// ------------------------------------------------------------
// 3. PARSE & VALIDASI HASIL AI
// ------------------------------------------------------------

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
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// 4. PROVIDER — Gemini dengan tool "url_context" (bisa buka link sendiri)
// ------------------------------------------------------------
// Ini kuncinya: kita AKTIFKAN tool url_context/google_search di request
// API-nya, biar model beneran bisa "membuka" link yang kita kasih,
// bukan cuma modal baca teks link doang.

// Kategori kita definisikan sebagai ARRAY beneran (bukan type),
// biar bisa dipakai saat runtime (dikirim ke buildPrompt & AI).
// Taruh ini di satu tempat biar gampang di-maintain / ditarik dari DB.
const AVAILABLE_CATEGORIES: Category[] = [
  "productivity",
  "developer-tools",
  "privacy-security",
  "shopping",
  "social-media",
  "entertainment",
  "other",
];

class GeminiBrowsingProvider {
  name = "gemini-browsing";
  private apiKey: string;
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    this.apiKey = ; /// ganti pake key yang langusng di integrasikan disini 
    this.model = model;
  }

  // Nerima link, balikin ExtensionRepo yang udah jadi (atau null kalau gagal).
  // Semua proses (prompt building, fetch, extract text, parse JSON)
  // dibungkus di sini biar pemanggilnya cukup: provider.generate(link)
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

    // 1. Response dari fetch harus di-.json() dulu buat dapetin body-nya
    const json = await res.json();

    // 2. Baru ambil teks jawaban AI dari struktur response Gemini
    const rawText: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // 3. Baru teks itu (bukan objek Response) yang dikupas jadi ExtensionRepo
    return parseAIResponse(rawText, link);
  }
}

// ------------------------------------------------------------
// 5. ENGINE UTAMA — beneran cuma "nerima link, teruskan ke AI"
// ------------------------------------------------------------

class GithubAIEngine {
  private provider: GeminiBrowsingProvider;

  constructor(provider: GeminiBrowsingProvider) {
    this.provider = provider;
  }

  // Tipe minimal item hasil GitHub search -- kita cuma butuh html_url,
  // sisanya (README, manifest, dll) udah diurus sendiri sama AI di
  // dalam provider.generate(), jadi gak perlu ambil field lain di sini.
  // Pakai `unknown & { html_url: string }` biar cocok dipass langsung
  // dari octokit.rest.search.repos tanpa perlu import tipe Octokit-nya.

  // ============================================================
  // ENTRY POINT UTAMA -- INI YANG LO PANGGIL DARI LUAR
  // ============================================================
  // Tinggal drop `data.items` dari hasil octokit.rest.search.repos
  // ke sini. Fungsi ini yang loop, ambil link tiap repo, dan proses
  // semuanya lewat AI (analyzeMany) sampai jadi array ExtensionRepo.
  async processGithubSearchResults(
    searchResultItems: Array<{ link: string }>,
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    concurrency: number = 3
  ): Promise<ExtensionRepo[]> {
    // 1. Ambil link doang dari tiap item hasil search GitHub
    const links = searchResultItems.map((item) => item.link);

    // 2. Lempar semua link ke pipeline AI yang udah ada (analyzeMany).
    //    Dari sini ke bawah, TIDAK ADA lagi input dari luar yang
    //    dibutuhkan -- semuanya (browsing, cross-check, kalkulasi
    //    keamanan) dikerjakan AI sendiri lewat provider.generate().
    return this.analyzeMany(links);
  }

  async analyze(
    link: string,
    availableCategories: Category[] = AVAILABLE_CATEGORIES,
    maxRetries: number = 2
  ): Promise<ExtensionRepo | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Tinggal panggil provider.generate(link) -> dia yang urus
        // prompt building, fetch ke Gemini, extract text, sampe parse JSON.
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
