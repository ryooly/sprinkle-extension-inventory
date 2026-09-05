// ── Search Safety Tests ─────────────────────────────────────────────────────
// Verifies that LIKE wildcards in user search input are neutralised, so a
// search term matches literally instead of changing the query semantics
// (e.g. `?name=%` must not return every row).
//
// Pure unit tests – no database or HTTP layer required.
//
// Run:  bun test tests/search.test.ts

import { describe, expect, test } from "bun:test";
import { escapeLikePattern } from "../src/modules/automation-engine/depends/sanitize";

describe("escapeLikePattern – wildcard neutralisation", () => {
  test("escapes the % wildcard", () => {
    expect(escapeLikePattern("%")).toBe("\\%");
  });

  test("escapes the _ wildcard", () => {
    expect(escapeLikePattern("_")).toBe("\\_");
  });

  test("escapes the backslash escape character itself", () => {
    expect(escapeLikePattern("\\")).toBe("\\\\");
  });

  test("escapes every metacharacter in a combined payload", () => {
    expect(escapeLikePattern("%_%\\")).toBe("\\%\\_\\%\\\\");
  });

  test("leaves ordinary search terms untouched", () => {
    expect(escapeLikePattern("ad blocker")).toBe("ad blocker");
  });

  test("handles an empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });
});

describe("search pattern construction", () => {
  const buildPattern = (term: string) => `%${escapeLikePattern(term)}%`;

  test("a bare % no longer produces a match-all pattern", () => {
    expect(buildPattern("%")).toBe("%\\%%");
  });

  test("a bare _ no longer produces a single-char wildcard", () => {
    expect(buildPattern("_")).toBe("%\\_%");
  });

  test("a normal term still produces a substring pattern", () => {
    expect(buildPattern("blocker")).toBe("%blocker%");
  });
});
