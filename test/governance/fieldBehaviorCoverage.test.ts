/**
 * P18.5-A: Field Behavior Coverage Tests
 *
 * Validates that the field behavior registry is internally consistent
 * and that critical forbidden behaviors are mechanically enforced.
 *
 * ref: P18.5-A
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FIELD_BEHAVIOR_REGISTRY,
  getFieldBehaviorById,
  getFieldBehaviorsBySchema,
  getCriticalFieldBehaviors,
  getFieldBehaviorsWithForbidden,
} from "../../src/governance/fieldBehaviorRegistry.js";
import { verifyRepairDiff } from "../../src/repair/repairVerifier.js";
import { buildBugFinding } from "../../src/repair/bugFindingBuilder.js";
import { BUG_FINDING_V1_LIMITATION } from "../../src/repair/types.js";
import type { RepairContract } from "../../src/repair/types.js";
import type { ValidatedSourceBugReport } from "../../src/repair/agentBugReportValidator.js";

const ROOT = join(import.meta.dirname, "../..");

// ---------------------------------------------------------------------------
// Registry structural integrity
// ---------------------------------------------------------------------------

describe("P18.5-A: Field Behavior Registry — Structural", () => {
  it("has at least 10 entries", () => {
    expect(FIELD_BEHAVIOR_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });

  it("all ids are unique", () => {
    const ids = FIELD_BEHAVIOR_REGISTRY.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a non-empty id, schema, field", () => {
    for (const entry of FIELD_BEHAVIOR_REGISTRY) {
      expect(entry.id.length, `empty id`).toBeGreaterThan(0);
      expect(entry.schema.length, `${entry.id}: empty schema`).toBeGreaterThan(0);
      expect(entry.field.length, `${entry.id}: empty field`).toBeGreaterThan(0);
    }
  });

  it("every entry has expected_behavior", () => {
    for (const entry of FIELD_BEHAVIOR_REGISTRY) {
      expect(entry.expected_behavior.length, `${entry.id}: empty expected_behavior`).toBeGreaterThan(0);
    }
  });

  it("critical entries with forbidden_behavior have at least one negative test", () => {
    const criticalWithForbidden = FIELD_BEHAVIOR_REGISTRY.filter(
      e => e.severity === "critical" && e.forbidden_behavior,
    );
    expect(criticalWithForbidden.length).toBeGreaterThan(0);
    for (const entry of criticalWithForbidden) {
      expect(
        entry.negative_tests.length,
        `${entry.id}: critical + forbidden_behavior but no negative_tests`,
      ).toBeGreaterThan(0);
    }
  });

  it("every positive_test file exists", () => {
    const seen = new Set<string>();
    for (const entry of FIELD_BEHAVIOR_REGISTRY) {
      for (const file of entry.positive_tests) {
        if (seen.has(file)) continue;
        seen.add(file);
        expect(existsSync(join(ROOT, file)), `${entry.id}: ${file} does not exist`).toBe(true);
      }
    }
  });

  it("every negative_test file exists", () => {
    const seen = new Set<string>();
    for (const entry of FIELD_BEHAVIOR_REGISTRY) {
      for (const file of entry.negative_tests) {
        if (seen.has(file)) continue;
        seen.add(file);
        expect(existsSync(join(ROOT, file)), `${entry.id}: ${file} does not exist`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

describe("P18.5-A: Field Behavior Registry — Lookups", () => {
  it("getFieldBehaviorById returns correct entry", () => {
    const entry = getFieldBehaviorById("audit_weight_no_verdict");
    expect(entry).toBeDefined();
    expect(entry!.schema).toBe("RepairScopeEntry");
  });

  it("getFieldBehaviorById returns undefined for unknown id", () => {
    expect(getFieldBehaviorById("nonexistent_field")).toBeUndefined();
  });

  it("getFieldBehaviorsBySchema returns correct entries", () => {
    const entries = getFieldBehaviorsBySchema("BugFinding");
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(entries.every(e => e.schema === "BugFinding")).toBe(true);
  });

  it("getCriticalFieldBehaviors returns only critical entries", () => {
    const critical = getCriticalFieldBehaviors();
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.every(e => e.severity === "critical")).toBe(true);
  });

  it("getFieldBehaviorsWithForbidden returns entries with forbidden_behavior", () => {
    const withForbidden = getFieldBehaviorsWithForbidden();
    expect(withForbidden.length).toBeGreaterThan(0);
    expect(withForbidden.every(e => e.forbidden_behavior !== undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Negative behavior tests: audit_weight must not affect verdict
// ---------------------------------------------------------------------------

describe("P18.5-A: audit_weight must NOT affect verdict", () => {
  function makeContract(overrides?: Partial<RepairContract>): RepairContract {
    return {
      schema_version: "repair_contract@0.1.0",
      repair_id: "field_behavior_test",
      revision: 1,
      source: { kind: "user_bug_report", id: "report_test" },
      intent: "Field behavior coverage test",
      bug_finding_id: "finding_test",
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
        allowed: [
          {
            pattern: "src/a.ts",
            source: "suspect_surface",
            confidence: "high",
            audit_weight: "normal",
            reason: "allowed",
            evidence: ["test"],
          },
        ],
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
        repo_label: "test",
        head_commit_hash: null,
      },
      ...overrides,
    };
  }

  it("verdict is 'pass' regardless of audit_weight=normal", () => {
    const result = verifyRepairDiff({
      contract: makeContract(),
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/a.ts", status: "modified" }],
        warnings: [],
      },
    });
    expect(result.check.verdict).toBe("pass");
  });

  it("verdict is still 'pass' when audit_weight is elevated to 'critical'", () => {
    const contract = makeContract({
      repair_scope: {
        allowed: [
          {
            pattern: "src/a.ts",
            source: "suspect_surface",
            confidence: "high",
            audit_weight: "critical",
            reason: "critical weight but still allowed",
            evidence: ["test"],
          },
        ],
        review_required: [],
        forbidden: [],
      },
    });
    const result = verifyRepairDiff({
      contract,
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/a.ts", status: "modified" }],
        warnings: [],
      },
    });
    // Key assertion: audit_weight=critical does NOT change the verdict
    expect(result.check.verdict).toBe("pass");
  });

  it("repairVerifier source code does not reference audit_weight", () => {
    const verifierPath = join(ROOT, "src/repair/repairVerifier.ts");
    const content = readFileSync(verifierPath, "utf-8");
    expect(content).not.toContain("audit_weight");
  });
});

// ---------------------------------------------------------------------------
// Negative behavior tests: agent_hypothesis must not enter confirmed_facts
// ---------------------------------------------------------------------------

describe("P18.5-A: agent_hypothesis must NOT enter confirmed_facts", () => {
  it("buildBugFinding never puts agent_hypothesis text into confirmed_facts", () => {
    const hypothesisText = "I suspect the parser is failing due to a regex edge case";
    const validated: ValidatedSourceBugReport = {
      report: {
        schema_version: "agent_bug_report@0.1.0",
        report_id: "report_hypo_test",
        reported_by: { agent: "test_agent" },
        summary: "Parser fails on special input",
        observed_behavior: "Crash on regex",
        expected_behavior: "No crash",
        evidence: [{ kind: "code_observation", path: "src/parser.ts", summary: "line 42 regex" }],
        suspected_files: [{ path: "src/parser.ts", confidence: "high", reason: "regex" }],
        agent_hypothesis: hypothesisText,
        requested_action: "repair_analysis",
      },
      status: "accepted",
      confirmedFacts: ["File src/parser.ts exists", "Code observation at line 42"],
      unverifiedClaims: [hypothesisText],
      invalidReferences: [],
      evidenceQuality: "medium",
    };

    const finding = buildBugFinding(validated);

    // Key assertion: agent_hypothesis text is NOT in confirmed_facts
    expect(finding.confirmed_facts).not.toContain(hypothesisText);
    // But it IS in unverified_claims
    expect(finding.unverified_claims).toContain(hypothesisText);
  });
});

// ---------------------------------------------------------------------------
// Negative behavior tests: BugFinding.limitation must not be empty
// ---------------------------------------------------------------------------

describe("P18.5-A: BugFinding.limitation must always be set", () => {
  it("buildBugFinding always sets limitation to the v1 constant", () => {
    const validated: ValidatedSourceBugReport = {
      report: {
        schema_version: "agent_bug_report@0.1.0",
        report_id: "report_lim_test",
        reported_by: { agent: "test_agent" },
        summary: "Bug",
        observed_behavior: "Crash",
        expected_behavior: "No crash",
        evidence: [],
        suspected_files: [],
        requested_action: "repair_analysis",
      },
      status: "rejected",
      confirmedFacts: [],
      unverifiedClaims: [],
      invalidReferences: [],
      evidenceQuality: "low",
    };

    const finding = buildBugFinding(validated);
    expect(finding.limitation).toBe(BUG_FINDING_V1_LIMITATION);
    expect(finding.limitation.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Negative behavior tests: forbidden scope MUST cause verdict=fail
// ---------------------------------------------------------------------------

describe("P18.5-A: forbidden scope entries MUST produce verdict=fail", () => {
  it("touching a forbidden file always results in fail, regardless of audit_weight", () => {
    const contract: RepairContract = {
      schema_version: "repair_contract@0.1.0",
      repair_id: "field_behavior_forbidden_test",
      revision: 1,
      source: { kind: "user_bug_report", id: "report_test" },
      intent: "Test forbidden enforcement",
      bug_finding_id: "finding_test",
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
        allowed: [
          {
            pattern: "src/safe.ts",
            source: "suspect_surface",
            confidence: "high",
            audit_weight: "normal",
            reason: "allowed",
            evidence: ["test"],
          },
        ],
        review_required: [],
        forbidden: [
          {
            pattern: "src/payment/**",
            source: "human_audit_decision",
            confidence: "high",
            audit_weight: "normal",
            reason: "Money flow forbidden",
            evidence: ["forbid"],
          },
        ],
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
        repo_label: "test",
        head_commit_hash: null,
      },
    };

    const result = verifyRepairDiff({
      contract,
      diff: {
        base_ref: "HEAD",
        changed_files: [{ path: "src/payment/billing.ts", status: "modified" }],
        warnings: [],
      },
    });

    expect(result.check.verdict).toBe("fail");
  });
});
