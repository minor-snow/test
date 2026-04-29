import { describe, expect, it } from "vitest";
import { detectActiveScopePatternOverlaps, detectActualChangedFileOverlaps } from "../../../src/repair/session/activeRepairOverlapDetector.js";
import type { RepairContract } from "../../../src/repair/types.js";

function makeContract(
  repairId: string,
  overrides?: Partial<RepairContract>,
): RepairContract {
  return {
    schema_version: "repair_contract@0.1.0",
    repair_id: repairId,
    revision: 1,
    source: { kind: "user_bug_report", id: `${repairId}_report` },
    intent: "Overlap detector test",
    bug_finding_id: `${repairId}_finding`,
    suspect_surface: { files: [], reason: "test" },
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
      allowed: [],
      review_required: [],
      forbidden: [],
    },
    must_preserve: [],
    consistency_checks: [],
    test_signals: { related: [], recommended: [], missing_mapping: [] },
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
      repo_observations_hash: "hash",
      repo_label: "repo",
      head_commit_hash: null,
    },
    ...overrides,
  };
}

describe("activeRepairOverlapDetector", () => {
  it("marks allowed pattern overlap as a warning", () => {
    const findings = detectActiveScopePatternOverlaps({
      contract: makeContract("repair_a", {
        repair_scope: {
          allowed: [{ pattern: "src/auth/**", source: "suspect_surface", confidence: "high", audit_weight: "normal", reason: "auth", evidence: ["test"] }],
          review_required: [],
          forbidden: [],
        },
      }),
      otherContracts: [
        makeContract("repair_b", {
          repair_scope: {
            allowed: [{ pattern: "src/auth/**", source: "suspect_surface", confidence: "high", audit_weight: "normal", reason: "auth", evidence: ["test"] }],
            review_required: [],
            forbidden: [],
          },
        }),
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("active_scope_pattern_overlap");
    expect(findings[0]?.severity).toBe("warning");
  });

  it("marks actual file overlap with review scope as requires_human_audit", () => {
    const findings = detectActualChangedFileOverlaps({
      repairId: "repair_a",
      changedFiles: ["src/models/user.ts"],
      otherContracts: [
        makeContract("repair_b", {
          repair_scope: {
            allowed: [],
            review_required: [{ pattern: "src/models/**", source: "impact_candidate", confidence: "medium", audit_weight: "elevated", reason: "models", evidence: ["test"] }],
            forbidden: [],
          },
        }),
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("actual_changed_file_overlap");
    expect(findings[0]?.severity).toBe("requires_human_audit");
  });

  it("marks actual file overlap with forbidden scope as blocking", () => {
    const findings = detectActualChangedFileOverlaps({
      repairId: "repair_a",
      changedFiles: ["src/payment/billing.ts"],
      otherContracts: [
        makeContract("repair_b", {
          repair_scope: {
            allowed: [],
            review_required: [],
            forbidden: [{ pattern: "src/payment/**", source: "human_audit_decision", confidence: "high", audit_weight: "critical", reason: "payment", evidence: ["test"] }],
          },
        }),
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("actual_changed_file_overlap");
    expect(findings[0]?.severity).toBe("blocking");
  });
});
