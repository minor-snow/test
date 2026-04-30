/**
 * P21: Diff Verifier Tests
 */

import { describe, it, expect } from "vitest";
import { verifyDiffAgainstScope } from "../../src/diffWorkflow/diffVerifier.js";
import type { AgentScopeLite, GitDiffSummary } from "../../src/diffWorkflow/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScope(overrides?: Partial<AgentScopeLite>): AgentScopeLite {
  return {
    schema_version: "agent_scope_lite.v1",
    scope_id: "scope-test-001",
    source_contract_id: "contract-test-001",
    source_observations_hash: "sha256:abc",
    intent: "Test intent",
    allowed_files: ["src/a.ts", "src/b.ts"],
    review_required_files: [],
    forbidden_patterns: [
      { pattern: ".pantheon/**", reason: "Protocol artifacts" },
      { pattern: ".cursor/**", reason: "Cursor adapter" },
    ],
    required_tests: ["test/a.test.ts"],
    instructions: [],
    ...overrides,
  };
}

function makeDiff(paths: string[]): GitDiffSummary {
  return {
    base_ref: "HEAD",
    changed_files: paths.map(p => ({ path: p, status: "modified" as const })),
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("verifyDiffAgainstScope", () => {
  it("pass when all files in allowed_files", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts", "src/b.ts"]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("pass");
    expect(result.reasons).toHaveLength(0);
    expect(result.file_statuses.every(s => s.status === "allowed")).toBe(true);
  });

  it("pass when file is a required test", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts", "test/a.test.ts"]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("pass");
  });

  it("requires_reverse_issue when file outside scope", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts", "src/c.ts"]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("requires_reverse_issue");
    expect(result.file_statuses.find(s => s.path === "src/c.ts")?.status).toBe("outside_scope");
    expect(result.reasons.some(r => r.includes("src/c.ts"))).toBe(true);
  });

  it("requires_reverse_issue when .pantheon/** touched", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts", ".pantheon/contract.json"]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("requires_reverse_issue");
    expect(result.file_statuses.find(s => s.path === ".pantheon/contract.json")?.status).toBe("forbidden");
  });

  it("requires_reverse_issue when .cursor/** touched", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff([".cursor/rules/something.md"]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("requires_reverse_issue");
    expect(result.file_statuses.find(s => s.path === ".cursor/rules/something.md")?.status).toBe("forbidden");
  });

  it("requires_review when review_required file touched", () => {
    const scope = makeScope({
      review_required_files: [
        { path: "src/a.ts", reasons: ["Sensitive path area."] },
      ],
    });
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts"]),
      scope,
    });
    expect(result.verdict).toBe("requires_review");
    expect(result.file_statuses.find(s => s.path === "src/a.ts")?.status).toBe("review_required");
  });

  it("requires_review when file is ONLY in review_required_files (not in allowed_files)", () => {
    const scope = makeScope({
      allowed_files: ["src/b.ts"],
      review_required_files: [
        { path: "src/a.ts", reasons: ["Review only."] },
      ],
    });
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts"]),
      scope,
    });
    expect(result.verdict).toBe("requires_review");
    expect(result.file_statuses.find(s => s.path === "src/a.ts")?.status).toBe("review_required");
  });

  it("requires_reverse_issue wins over requires_review", () => {
    const scope = makeScope({
      review_required_files: [
        { path: "src/a.ts", reasons: ["Sensitive."] },
      ],
    });
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts", "src/outside.ts"]),
      scope,
    });
    expect(result.verdict).toBe("requires_reverse_issue");
  });

  it("empty diff passes", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff([]),
      scope: makeScope(),
    });
    expect(result.verdict).toBe("pass");
  });

  it("required_actions includes scope expansion instruction on outside_scope", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/unknown.ts"]),
      scope: makeScope(),
    });
    expect(result.required_actions.some(a => a.includes("reverse issue"))).toBe(true);
  });

  it("required_actions includes revert instruction on forbidden", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff([".pantheon/x.json"]),
      scope: makeScope(),
    });
    expect(result.required_actions.some(a => a.includes("Revert"))).toBe(true);
  });

  it("returns Lite decision shape", () => {
    const result = verifyDiffAgainstScope({
      diff: makeDiff(["src/a.ts"]),
      scope: makeScope(),
    });
    expect(result.schema_version).toBe("diff_verification_result.v1");
    expect(result.verdict).toBe("pass");
    expect(result.reasons).toEqual([]);
    expect(result.required_actions).toEqual([]);
    expect(result.file_statuses).toEqual([
      { path: "src/a.ts", status: "allowed", reasons: ["Within authorized scope."] },
    ]);
  });
});
