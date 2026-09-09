export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export interface InsertionResult {
  isPremium: boolean;
  inserted: number;
  failed: number;
  skipped: number;
  failures: Array<{ name: string; reason: string }>;
}

export interface CleanupResult {
  deleted: number;
}

export interface HourlyJobResult {
  insertion: InsertionResult | null;
  cleanup: CleanupResult | null;
  errors: string[];
}

export interface DailyJobResult {
  success: boolean;
  count: number;
  error?: string;
}