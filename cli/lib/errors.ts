import type { HttpResult } from "./http";

export interface ErrorEnvelope {
  success: false;
  message: string;
  status: number;
}

export type ErrorShapeResult =
  | { ok: true; envelope: ErrorEnvelope }
  | { ok: false; reason: string };

export function checkErrorShape(res: HttpResult): ErrorShapeResult {
  const body: unknown = res.data;

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      reason: `body is not a JSON object (got ${describe(body)})`,
    };
  }

  const b = body as Record<string, unknown>;

  if (b.success !== false) {
    return {
      ok: false,
      reason: `success !== false (got ${describe(b.success)})`,
    };
  }
  if (typeof b.message !== "string" || b.message.trim().length === 0) {
    return { ok: false, reason: "message is not a non-empty string" };
  }
  if (typeof b.status !== "number") {
    return {
      ok: false,
      reason: `status is not a number (got ${describe(b.status)})`,
    };
  }
  if (b.status !== res.status) {
    return {
      ok: false,
      reason: `body.status ${b.status} does not match HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    envelope: { success: false, message: b.message, status: b.status },
  };
}

function describe(value: unknown): string {
  if (typeof value === "string")
    return `string ${JSON.stringify(value.slice(0, 40))}`;
  return value === null ? "null" : typeof value;
}
