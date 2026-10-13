import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { dailyShowcase, extensions, premiumExtensions } from "@/models";
import type {
  Extension,
  Category,
  BrowserPermission,
  VerificationStatus,
} from "@/models";

export async function insertShowcaseExtensions(
  extensionIds: string[],
  showcaseDate: string,
): Promise<{ inserted: number }> {
  if (extensionIds.length === 0) return { inserted: 0 };

  const values = extensionIds.map((extensionId) => ({
    extensionId,
    showcaseDate,
  }));

  const rows = await db
    .insert(dailyShowcase)
    .values(values)
    .onConflictDoNothing({
      target: [dailyShowcase.extensionId, dailyShowcase.showcaseDate],
    })
    .returning({ id: dailyShowcase.id });

  return { inserted: rows.length };
}

export async function getLatestShowcaseDate(): Promise<string | null> {
  const [row] = await db
    .select({
      showcaseDate: sql<string | null>`max(${dailyShowcase.showcaseDate})`,
    })
    .from(dailyShowcase);

  return row?.showcaseDate ?? null;
}

export async function findShowcaseByDate(showcaseDate: string) {
  return await db
    .select({ extension: extensions })
    .from(dailyShowcase)
    .innerJoin(extensions, eq(dailyShowcase.extensionId, extensions.id))
    .where(eq(dailyShowcase.showcaseDate, showcaseDate))
    .orderBy(desc(dailyShowcase.createdAt));
}

export interface PremiumShowcaseRow {
  premium: typeof premiumExtensions.$inferSelect;
  extension: Extension;
}

export interface PremiumExtensionInput {
  extensionId: string;
  premiumDate: string;
  aiDescription: string;
  verified: VerificationStatus;
  verificationPercentage?: number;
  categories: Category[];
  permissions: BrowserPermission[];
  licenseKey?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
}

export async function findPremiumByDate(
  premiumDate: string,
): Promise<PremiumShowcaseRow[]> {
  return await db
    .select({ premium: premiumExtensions, extension: extensions })
    .from(premiumExtensions)
    .innerJoin(extensions, eq(premiumExtensions.extensionId, extensions.id))
    .where(eq(premiumExtensions.premiumDate, premiumDate))
    .orderBy(desc(premiumExtensions.createdAt));
}

export async function insertPremiumExtensions(
  rows: PremiumExtensionInput[],
): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 };

  const inserted = await db
    .insert(premiumExtensions)
    .values(rows)
    .onConflictDoNothing({
      target: [premiumExtensions.extensionId, premiumExtensions.premiumDate],
    })
    .returning({ id: premiumExtensions.id });

  return { inserted: inserted.length };
}
