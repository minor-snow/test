/**
 * P18.5-C / P18.5-B: Repair → Audit E2E Test
 *
 * Validates the complete chain:
 *   AgentBugReport → BugFinding → RepairContract → HumanAuditDecision → revised contract
 *
 * Key invariants tested:
 *   1. agent_hypothesis does NOT enter confirmed_facts
 *   2. human audit decisions are append-only (revision increments)
 *   3. forbidden scope entries cause verdict=fail
 *   4. audit_weight does not affect verdict
 *
 * ref: P18.5
 */

import { describe, it, expect } from "vitest";
import { buildBugFinding } from "../../src/repair/bugFindingBuilder.js";
import { applyHumanAuditDecision } from "../../src/repair/repairPlanRevisioner.js";
import { verifyRepairDiff } from "../../src/repair/repairVerifier.js";
import { BUG_FINDING_V1_LIMITATION } from "../../src/repair/types.js";
import type { RepairContract, HumanAuditDecision } from "../../src/repair/types.js";
import type { ValidatedSourceBugReport } from "../../src/repair/agentBugReportValidator.js";
import { sanitizeArtifact } from "../../src/artifacts/artifactSanitizer.js";

// ---------------------------------------------------------------------------
// E2E: Bug Report → Finding → Contract → Audit → Verify
// ---------------------------------------------------------------------------

describe("P18.5 E2E: Repair → Audit chain", () => {
  // Step 1: Build a BugFinding from an AgentBugReport
  const hypothesisText = "The cache is stale and causes intermittent failures";
  const validated: ValidatedSourceBugReport = {
    report: {
      schema_version: "agent_bug_report@0.1.0",
      report_id: "e2e_report_001",
      reported_by: { agent: "claude_code_v1" },
      summary: "Cache invalidation bug in user service",
      observed_behavior: "Users see stale data after profile update",
      expected_behavior: "Updated profile data should be visible immediately",
      evidence: [
        { kind: "failing_test", path: "tests/user/test_profile.py", test_name: "test_profile_update" },
        { kind: "code_observation", path: "src/user/cache.py", summary: "No invalidation on write" },
      ],
      suspected_files: [
        { path: "src/user/cache.py", confidence: "high", reason: "Cache logic" },
        { path: "src/user/service.py", confidence: "medium", reason: "Calls cache" },
      ],
      agent_hypothesis: hypothesisText,
      requested_action: "repair_analysis",
    },
    status: "accepted",
    confirmedFacts: [
      "File src/user/cache.py exists",
      "Test test_profile_update is failing",
    ],
    unverifiedClaims: [hypothesisText],
    invalidReferences: [],
    evidenceQuality: "medium",
  };

  const finding = buildBugFinding(validated);

  it("Step 1: BugFinding preserves fact/hypothesis separation", () => {
    expect(finding.limitation).toBe(BUG_FINDING_V1_LIMITATION);
    expect(finding.limitation.length).toBeGreaterThan(0);
    expect(finding.confirmed_facts).not.toContain(hypothesisText);
    expect(finding.unverified_claims).toContain(hypothesisText);
    expect(finding.status).toBe("accepted");
  });

  // Step 2: Build a RepairContract (simulated)
  const contract: RepairContract = {
    schema_version: "repair_contract@0.1.0",
    repair_id: "repair_e2e_001",
    revision: 1,
    source: { kind: "agent_bug_report", id: "e2e_report_001" },
    intent: "Fix cache invalidation bug",
    bug_finding_id: finding.finding_id,
    suspect_surface: {
      files: [
        { path: "src/user/cache.py", confidence: "high", reason: "Cache logic", evidence: ["code_observation"] },
      ],
      reason: "Agent identified cache.py",
    },
    repair_relation_graph: [],
    impact_surface: {
      evidence_level: "bootstrap_conservative",
      direct_files: [
        { path: "src/user/cache.py", confidence: "high", reason: "Direct suspect", evidence: ["suspect"] },
      ],
      related_files: [
        { path: "src/user/service.py", confidence: "medium", reason: "Calls cache", evidence: ["import_analysis"] },
      ],
      related_tests: [
        { path: "tests/user/test_cache.py", confidence: "high", reason: "Cache test", evidence: ["test_mapping"] },
      ],
      risk_areas: [],
      unknowns: [],
    },
    repair_scope: {
      allowed: [
        {
          pattern: "src/user/cache.py",
          source: "suspect_surface",
          confidence: "high",
          audit_weight: "critical",
          reason: "Primary suspect",
          evidence: ["suspect"],
        },
        {
          pattern: "src/user/service.py",
          source: "impact_candidate",
          confidence: "medium",
          audit_weight: "normal",
          reason: "Related service",
          evidence: ["import"],
        },
      ],
      review_required: [],
      forbidden: [
        {
          pattern: "src/payment/**",
          source: "default_policy",
          confidence: "high",
          audit_weight: "critical",
          reason: "Money flow",
          evidence: ["default"],
        },
      ],
    },
    must_preserve: ["Cache TTL settings must not decrease"],
    consistency_checks: [],
    test_signals: {
      related: ["tests/user/test_cache.py"],
      recommended: [],
      missing_mapping: [],
    },
    repo_state: {
      base_sha: "abc123",
      head_sha: "abc123",
      diff_base: "abc123",
      working_tree_status: "clean",
      created_at: new Date().toISOString(),
      source: "git",
    },
    audit_status: "pending_plan_audit",
    source_refs: {
      repo_observations_hash: "obs_hash",
      repo_label: "user-service",
      head_commit_hash: "abc123",
    },
  };

  it("Step 2: Contract has valid structure", () => {
    expect(contract.revision).toBe(1);
    expect(contract.repair_scope.allowed.length).toBeGreaterThan(0);
    expect(contract.repair_scope.forbidden.length).toBeGreaterThan(0);
    expect(contract.must_preserve.length).toBeGreaterThan(0);
  });

  // Step 3: Human audit decision
  const auditDecision: HumanAuditDecision = {
    schema_version: "human_audit_decision@0.1.0",
    decision_id: "audit_e2e_001",
    repair_id: "repair_e2e_001",
    target_revision: 1,
    gate: "repair_plan",
    decision: "expand_review_scope",
    operator_id: "tech_lead",
    reason: "Also review the API layer that calls cache",
    changes_to_scope: {
      add_review: ["src/user/api.py"],
      add_forbid: [],
    },
    added_must_preserve: ["API response format must not change"],
    created_at: new Date().toISOString(),
  };

  const revisedContract = applyHumanAuditDecision(contract, auditDecision);

  it("Step 3: Human audit produces revision increment", () => {
    expect(revisedContract.revision).toBe(2);
    expect(revisedContract.audit_status).toBe("approved_with_modifications");
  });

  it("Step 3: Audit decision is append-only for review scope", () => {
    const reviewPatterns = revisedContract.repair_scope.review_required.map(e => e.pattern);
    expect(reviewPatterns).toContain("src/user/api.py");
  });

  it("Step 3: Audit decision is append-only for must_preserve", () => {
    expect(revisedContract.must_preserve).toContain("Cache TTL settings must not decrease");
    expect(revisedContract.must_preserve).toContain("API response format must not change");
  });

  it("Step 3: Original forbidden entries are preserved", () => {
    const forbiddenPatterns = revisedContract.repair_scope.forbidden.map(e => e.pattern);
    expect(forbiddenPatterns).toContain("src/payment/**");
  });

  // Step 4: Verify a diff against the revised contract
  it("Step 4: Allowed file passes", () => {
    const result = verifyRepairDiff({
      contract: revisedContract,
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/user/cache.py", status: "modified" }],
        warnings: [],
      },
    });
    expect(result.check.verdict).toBe("pass");
  });

  it("Step 4: Forbidden file fails", () => {
    const result = verifyRepairDiff({
      contract: revisedContract,
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/payment/billing.py", status: "modified" }],
        warnings: [],
      },
    });
    expect(result.check.verdict).toBe("fail");
  });

  it("Step 4: Review-required file produces requires_review", () => {
    const result = verifyRepairDiff({
      contract: revisedContract,
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/user/api.py", status: "modified" }],
        warnings: [],
      },
    });
    expect(result.check.verdict).toBe("requires_review");
  });

  it("Step 4: audit_weight does NOT affect verdict", () => {
    // Both cache.py (critical weight) and service.py (normal weight) are allowed
    const result = verifyRepairDiff({
      contract: revisedContract,
      diff: {
        base_ref: "HEAD",
        changed_files: [
          { path: "src/user/cache.py", status: "modified" },
          { path: "src/user/service.py", status: "modified" },
        ],
        warnings: [],
      },
    });
    expect(result.check.verdict).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// E2E: Public Artifact Export
// ---------------------------------------------------------------------------

describe("P18.5 E2E: Public artifact export sanitization", () => {
  it("clean repair report passes sanitization", () => {
    const reportContent = [
      "# Repair Report: repair_e2e_001",
      "",
      "## Summary",
      "- Verdict: pass",
      "- Changed files: 2",
      "- Allowed: 2",
      "- Forbidden violations: 0",
      "",
      "## Changed Files",
      "- src/user/cache.py (allowed, critical audit weight)",
      "- src/user/service.py (allowed, normal audit weight)",
    ].join("\n");

    const result = sanitizeArtifact(reportContent, "public");
    expect(result.clean).toBe(true);
  });

  it("report with leaked local path fails sanitization", () => {
    const reportContent = [
      "# Repair Report",
      "",
      "Generated at H:\\Boom\\pantheon\\data\\output\\report.md",
      "Verdict: pass",
    ].join("\n");

    const result = sanitizeArtifact(reportContent, "public");
    expect(result.clean).toBe(false);
    expect(result.violations.some(v => v.kind === "windows_absolute_path")).toBe(true);
  });

  it("report with debug payload fails sanitization", () => {
    const reportContent = [
      "# Repair Report",
      '{"debug": true, "internal_observation": "raw data"}',
    ].join("\n");

    const result = sanitizeArtifact(reportContent, "public");
    expect(result.clean).toBe(false);
  });
});
