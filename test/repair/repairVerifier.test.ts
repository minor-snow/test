import { describe, expect, it } from "vitest";
import { verifyRepairDiff } from "../../src/repair/repairVerifier.js";
import type { RepairContract } from "../../src/repair/types.js";

function makeContract(overrides?: Partial<RepairContract>): RepairContract {
  return {
    schema_version: "repair_contract@0.1.0",
    repair_id: "repair_test",
    revision: 1,
    source: {
      kind: "user_bug_report",
      id: "report_test",
    },
    intent: "Fix formatting bug",
    bug_finding_id: "finding_test",
    suspect_surface: {
      files: [
        {
          path: "src/utils/format.ts",
          confidence: "high",
          reason: "Explicit suspect",
          evidence: ["explicit"],
        },
      ],
      reason: "test",
    },
    repair_relation_graph: [],
    impact_surface: {
      evidence_level: "bootstrap_conservative",
      direct_files: [],
      related_files: [],
      related_tests: [],
      risk_areas: [],
      unknowns: [],
    },
    repair_scope: {
      allowed: [
        {
          pattern: "src/utils/format.ts",
          source: "suspect_surface",
          confidence: "high",
          audit_weight: "critical",
          reason: "Allowed suspect file",
          evidence: ["suspect"],
        },
      ],
      review_required: [
        {
          pattern: "src/auth/login.ts",
          source: "human_audit_decision",
          confidence: "high",
          audit_weight: "normal",
          reason: "Review path",
          evidence: ["review"],
        },
      ],
      forbidden: [
        {
          pattern: "src/payment/billing.ts",
          source: "human_audit_decision",
          confidence: "high",
          audit_weight: "critical",
          reason: "Forbidden path",
          evidence: ["forbid"],
        },
      ],
    },
    must_preserve: [],
    consistency_checks: [],
    test_signals: {
      related: ["tests/utils/format.test.ts"],
      recommended: [],
      missing_mapping: [],
    },
    repo_state: {
      base_sha: null,
      head_sha: null,
      diff_base: null,
      working_tree_status: "unknown",
      created_at: new Date().toISOString(),
      source: "unknown",
    },
    audit_status: "approved_repair_plan",
    source_refs: {
      repo_observations_hash: "obs",
      repo_label: "repo",
      head_commit_hash: null,
    },
    ...overrides,
  };
}

describe("verifyRepairDiff", () => {
  it("uses bucket semantics, not audit_weight, for an allowed change", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/utils/format.ts", status: "modified" }],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("pass");
  });

  it("marks review bucket as requires_review", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/auth/login.ts", status: "modified" }],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("requires_review");
  });

  it("marks forbidden bucket as fail", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/payment/billing.ts", status: "modified" }],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("fail");
  });

  it("marks changes outside scope as requires_scope_expansion", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/elsewhere/other.ts", status: "modified" }],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("requires_scope_expansion");
  });

  it("marks mixed bootstrap + business files as requires_replan by default", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [
          { path: "src/utils/format.ts", status: "modified" },
          { path: "pantheon.alpha.json", status: "modified" }
        ],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("requires_replan");
    const finding = result.check.findings.find(f => f.kind === "bootstrap_scope_mixed_with_repair");
    expect(finding).toBeDefined();
  });

  it("fails if mixed bootstrap has a forbidden file (precedence fail > requires_replan)", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [
          { path: "src/payment/billing.ts", status: "modified" }, // forbidden => fail
          { path: "AGENTS.md", status: "modified" }               // mixed => requires_replan
        ],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("fail");
    const mixedFinding = result.check.findings.find(f => f.kind === "bootstrap_scope_mixed_with_repair");
    expect(mixedFinding).toBeDefined();
    const forbiddenFinding = result.check.findings.find(f => f.kind === "forbidden_file");
    expect(forbiddenFinding).toBeDefined();
  });

  it("does not flag bootstrap_scope_mixed_with_repair for bootstrap-only changes", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [
          { path: "pantheon.alpha.json", status: "modified" },
          { path: "AGENTS.md", status: "modified" }
        ],
        warnings: [],
      },
    });

    const mixedFinding = result.check.findings.find(f => f.kind === "bootstrap_scope_mixed_with_repair");
    expect(mixedFinding).toBeUndefined();
    // It will likely be outside_scope_file, which is fine
  });

  it("does not flag bootstrap_scope_mixed_with_repair for business-only changes", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [
          { path: "src/utils/format.ts", status: "modified" },
          { path: "src/elsewhere/other.ts", status: "modified" }
        ],
        warnings: [],
      },
    });

    const mixedFinding = result.check.findings.find(f => f.kind === "bootstrap_scope_mixed_with_repair");
    expect(mixedFinding).toBeUndefined();
  });
});
