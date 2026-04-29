/**
 * P28.1-B: Repair Output Sanitizer Tests
 *
 * Validates that rendered repair artifacts (task, report, scope) pass
 * the P18.5 artifact sanitizer in public mode.
 *
 * ref: P28.1-B
 */

import { describe, it, expect } from "vitest";
import { renderRepairTaskMarkdown, renderRepairScopeMarkdown, renderConsistencyChecklistMarkdown } from "../../src/repair/repairTaskRenderer.js";
import { renderRepairReportMarkdown } from "../../src/repair/repairReportRenderer.js";
import { sanitizeArtifact } from "../../src/artifacts/artifactSanitizer.js";
import { REPAIR_RELATION_GRAPH_V1_LIMITATION } from "../../src/repair/types.js";
import type { BugFinding, RepairContract, RepairSourceReport, RepairCheck, GraphBuildStats } from "../../src/repair/types.js";

function makeReport(): RepairSourceReport {
  return {
    schema_version: "user_bug_report@0.1.0",
    report_id: "report_san_test",
    reported_by: { operator_id: "user" },
    summary: "Fix cache invalidation in user service",
    evidence: [{ kind: "failing_test", path: "tests/user/test_cache.py" }],
    suspected_files: [{ path: "src/user/cache.py", confidence: "high", reason: "Cache logic" }],
    must_preserve: ["TTL settings"],
    requested_action: "repair_analysis",
  };
}

function makeFinding(): BugFinding {
  return {
    schema_version: "bug_finding@0.1.0",
    finding_id: "finding_san_test",
    source_report_id: "report_san_test",
    status: "accepted",
    limitation: "BugFinding v1 validates report structure and references; it does not prove the bug is real.",
    confirmed_facts: ["File src/user/cache.py exists"],
    unverified_claims: [],
    invalid_references: [],
    evidence_quality: "medium",
    next_action: "repair_analysis",
  };
}

function makeContract(overrides?: Partial<RepairContract>): RepairContract {
  return {
    schema_version: "repair_contract@0.1.0",
    repair_id: "repair_san_test",
    revision: 1,
    source: { kind: "user_bug_report", id: "report_san_test" },
    intent: "Fix cache invalidation",
    bug_finding_id: "finding_san_test",
    suspect_surface: {
      files: [{ path: "src/user/cache.py", confidence: "high", reason: "Cache logic", evidence: ["explicit"] }],
      reason: "test",
    },
    repair_relation_graph: [
      { from: "src/user/cache.py", to: "src/user/cache.py", relation: "explicit_user_reference", confidence: "high", reason: "User reference", evidence: ["explicit"] },
      { from: "src/user/cache.py", to: "src/user/service.py", relation: "same_package", confidence: "medium", reason: "Same package", evidence: ["same_directory:src/user"] },
    ],
    graph_build_stats: {
      observed_files: 100,
      patterns_evaluated: 5,
      edges_generated: 12,
      edges_after_dedup: 10,
      truncation_entries: [],
      limitation: REPAIR_RELATION_GRAPH_V1_LIMITATION,
      duration_ms: 15,
    },
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
        { pattern: "src/user/cache.py", source: "suspect_surface", confidence: "high", audit_weight: "critical", reason: "Primary suspect", evidence: ["test"] },
      ],
      review_required: [],
      forbidden: [
        { pattern: "src/payment/**", source: "default_policy", confidence: "high", audit_weight: "critical", reason: "Money flow", evidence: ["default"] },
      ],
    },
    must_preserve: ["TTL settings"],
    consistency_checks: [
      { id: "check_1", statement: "Cache invalidation must not reduce TTL", source: "user_must_preserve", severity: "hard", evidence: ["user"], reason: "User requirement" },
    ],
    test_signals: { related: ["tests/user/test_cache.py"], recommended: [], missing_mapping: [] },
    repo_state: {
      base_sha: null,
      head_sha: null,
      diff_base: null,
      working_tree_status: "unknown",
      created_at: new Date().toISOString(),
      source: "unknown",
    },
    audit_status: "approved_repair_plan",
    source_refs: { repo_observations_hash: "hash", repo_label: "user-service", head_commit_hash: "abc123" },
    ...overrides,
  };
}

function makeCheck(): RepairCheck {
  return {
    schema_version: "repair_check.v1",
    repair_id: "repair_san_test",
    verdict: "pass",
    generated_at: new Date().toISOString(),
    summary: { changed_files: 1, allowed: 1, review_required: 0, forbidden: 0, outside_scope: 0, warnings: 0 },
    findings: [],
    concurrent_findings: [],
    changed_files: ["src/user/cache.py"],
    audit_status: "approved_repair_plan",
  };
}

// ---------------------------------------------------------------------------
// Sanitizer: rendered repair_task.md
// ---------------------------------------------------------------------------

describe("P28.1-B: repair_task.md passes artifact sanitizer", () => {
  it("standard repair task is sanitizer-clean", () => {
    const output = renderRepairTaskMarkdown({
      report: makeReport(),
      finding: makeFinding(),
      contract: makeContract(),
    });

    const result = sanitizeArtifact(output, "public");
    expect(result.clean, `Violations: ${result.violations.map(v => v.message).join("; ")}`).toBe(true);
  });

  it("repair task with graph truncation is sanitizer-clean", () => {
    const contract = makeContract({
      graph_build_stats: {
        observed_files: 4248,
        patterns_evaluated: 37,
        edges_generated: 1500,
        edges_after_dedup: 200,
        truncation_entries: [
          { relation: "risk_preset", pattern: "**/migrations/**", total_matches: 1422, displayed_edges: 50, truncated: true, omitted_count: 1372 },
        ],
        limitation: REPAIR_RELATION_GRAPH_V1_LIMITATION,
        duration_ms: 218,
      },
    });

    const output = renderRepairTaskMarkdown({
      report: makeReport(),
      finding: makeFinding(),
      contract,
    });

    const result = sanitizeArtifact(output, "public");
    expect(result.clean, `Violations: ${result.violations.map(v => v.message).join("; ")}`).toBe(true);
    expect(output).toContain("Truncated areas");
    expect(output).toContain("1422");
    expect(output).toContain(REPAIR_RELATION_GRAPH_V1_LIMITATION);
  });
});

// ---------------------------------------------------------------------------
// Sanitizer: rendered repair_report.md
// ---------------------------------------------------------------------------

describe("P28.1-B: repair_report.md passes artifact sanitizer", () => {
  it("standard repair report is sanitizer-clean", () => {
    const output = renderRepairReportMarkdown({
      report: makeReport(),
      contract: makeContract(),
      check: makeCheck(),
    });

    const result = sanitizeArtifact(output, "public");
    expect(result.clean, `Violations: ${result.violations.map(v => v.message).join("; ")}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sanitizer: rendered repair_scope.md
// ---------------------------------------------------------------------------

describe("P28.1-B: repair_scope.md passes artifact sanitizer", () => {
  it("standard scope doc is sanitizer-clean", () => {
    const output = renderRepairScopeMarkdown(makeContract());
    const result = sanitizeArtifact(output, "public");
    expect(result.clean, `Violations: ${result.violations.map(v => v.message).join("; ")}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sanitizer: rendered consistency_checklist.md
// ---------------------------------------------------------------------------

describe("P28.1-B: consistency_checklist.md passes artifact sanitizer", () => {
  it("standard checklist is sanitizer-clean", () => {
    const output = renderConsistencyChecklistMarkdown(makeContract());
    const result = sanitizeArtifact(output, "public");
    expect(result.clean, `Violations: ${result.violations.map(v => v.message).join("; ")}`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Output size control
// ---------------------------------------------------------------------------

describe("P28.1-B: Output size control", () => {
  it("large allowed list is capped at 25 with summary", () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({
      pattern: `src/large/file_${i.toString().padStart(2, "0")}.ts`,
      source: "suspect_surface" as const,
      confidence: "high" as const,
      audit_weight: "normal" as const,
      reason: `File ${i}`,
      evidence: ["test"],
    }));

    const contract = makeContract({
      repair_scope: {
        allowed: entries,
        review_required: [],
        forbidden: [],
      },
    });

    const output = renderRepairTaskMarkdown({
      report: makeReport(),
      finding: makeFinding(),
      contract,
    });

    // Should contain the "N more" summary
    expect(output).toContain("15 more allowed entries");
    // Should NOT list all 40
    expect(output).not.toContain("file_39");
  });

  it("large forbidden list is capped at 25 with summary", () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      pattern: `src/forbidden/zone_${i.toString().padStart(2, "0")}/**`,
      source: "default_policy" as const,
      confidence: "high" as const,
      audit_weight: "critical" as const,
      reason: `Forbidden ${i}`,
      evidence: ["default"],
    }));

    const contract = makeContract({
      repair_scope: {
        allowed: [
          { pattern: "src/a.ts", source: "suspect_surface" as const, confidence: "high" as const, audit_weight: "normal" as const, reason: "allowed", evidence: ["test"] },
        ],
        review_required: [],
        forbidden: entries,
      },
    });

    const output = renderRepairTaskMarkdown({
      report: makeReport(),
      finding: makeFinding(),
      contract,
    });

    expect(output).toContain("5 more forbidden entries");
    expect(output).not.toContain("zone_29");
  });
});
