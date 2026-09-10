export interface InsertionResult {
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
