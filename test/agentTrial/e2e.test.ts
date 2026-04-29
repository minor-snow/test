/**
 * P23: Pet Agent Trial E2E Tests
 *
 * Tests the full pipeline: scan → contract → scope → verify → feedback → compare.
 * Uses simulated diffs from petTrialScenarios.
 */

import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../../src/changeContract/lite/changeContractLiteBuilder.js";
import { buildAgentScopeLite } from "../../src/diffWorkflow/agentScopeLiteBuilder.js";
import { verifyDiffAgainstScope } from "../../src/diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../../src/agentFeedback/diffFeedbackBuilder.js";
import { validateAgentFeedback } from "../../src/agentFeedback/agentFeedbackValidator.js";
import { compareAttempts, deriveProtocolGapsFromComparison } from "../../src/agentTrial/attemptComparison.js";
import { buildAgentTaskPacket } from "../../src/agentTrial/agentTaskPacketBuilder.js";
import { renderAgentTrialReportMarkdown } from "../../src/agentTrial/agentTrialReportRenderer.js";
import { getScenario, getAllScenarios } from "../../src/agentTrial/petTrialScenarios.js";
import type { GitDiffSummary } from "../../src/diffWorkflow/types.js";
import type { TrialAttempt, TrialViolationKey } from "../../src/agentTrial/types.js";

const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulateDiff(files: readonly { path: string; status: string }[]): GitDiffSummary {
  return {
    base_ref: "HEAD",
    changed_files: files.map(f => ({ path: f.path, status: f.status as "modified" | "added" | "deleted" })),
    warnings: [],
  };
}

function extractViolationKeys(feedback: ReturnType<typeof buildAgentFeedbackFromDiffVerification>): TrialViolationKey[] {
  return feedback.violations.map(v => ({
    kind: v.kind,
    path: v.location.file_path,
    constraint_id: v.constraint.constraint_id,
  }));
}

function runAttempt(
  observations: ReturnType<typeof scanRepo>,
  scenario: ReturnType<typeof getScenario>,
  attemptNum: number,
): TrialAttempt {
  const simDiff = scenario.simulated_diffs.find(d => d.attempt === attemptNum)!;
  const contract = buildChangeContractLite({
    observations,
    changedFiles: scenario.planned_changed_files as string[],
    intent: scenario.intent,
  });
  const scope = buildAgentScopeLite({ contract, observations });
  const diff = simulateDiff(simDiff.changed_files);
  const verification = verifyDiffAgainstScope({ diff, scope });
  const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
  const validationResult = validateAgentFeedback(feedback);
  if (validationResult.status !== "valid") {
    throw new Error(`Feedback validation failed in attempt ${attemptNum}: ${JSON.stringify(validationResult)}`);
  }

  return {
    attempt_number: attemptNum,
    started_at: new Date().toISOString(),
    actual_diff: {
      changed_files: simDiff.changed_files.map(f => f.path),
      diff_source: "simulated",
    },
    verification_verdict: verification.verdict,
    violation_count: feedback.violations.length,
    violations: extractViolationKeys(feedback),
    feedback_generated: true,
    feedback_verdict: feedback.verdict,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("P23 E2E: Pet Agent Protocol Usability Trial", () => {
  const observations = scanRepo({ repoRoot: FIXTURE_ROOT });

  it("has 3 scenarios", () => {
    expect(getAllScenarios()).toHaveLength(3);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: out-of-scope → retry
  // -------------------------------------------------------------------------
  describe("Scenario 1: out-of-scope → retry", () => {
    const scenario = getScenario("pet_out_of_scope_retry");
    const attempt1 = runAttempt(observations, scenario, 1);
    const attempt2 = runAttempt(observations, scenario, 2);
    const comparison = compareAttempts(attempt1, attempt2);

    it("attempt 1 has outside_scope violation", () => {
      expect(attempt1.verification_verdict).toBe("requires_reverse_issue");
      expect(attempt1.violations.some(v => v.kind === "outside_scope_file")).toBe(true);
    });

    it("attempt 2 resolves outside_scope violation", () => {
      expect(attempt2.violations.every(v => v.kind !== "outside_scope_file")).toBe(true);
    });

    it("comparison shows resolved violations", () => {
      expect(comparison.resolved_violations.length).toBeGreaterThan(0);
      expect(comparison.resolved_violations.some(v => v.kind === "outside_scope_file")).toBe(true);
    });

    it("feedback_effect is improved or mixed", () => {
      expect(["improved", "mixed"]).toContain(comparison.feedback_effect);
    });

    it("no protocol gaps for improvement", () => {
      const gaps = deriveProtocolGapsFromComparison(comparison);
      expect(gaps.filter(g => g.kind === "feedback_ambiguous")).toHaveLength(0);
    });

    it("task packet attempt 1 has no previous_feedback_ref", () => {
      const contract = buildChangeContractLite({
        observations,
        changedFiles: scenario.planned_changed_files as string[],
        intent: scenario.intent,
      });
      const scope = buildAgentScopeLite({ contract, observations });
      const packet = buildAgentTaskPacket({ scenario, scope, attempt: 1 });
      expect(packet.previous_feedback_ref).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: missing-test → retry
  // -------------------------------------------------------------------------
  describe("Scenario 2: missing-test → retry", () => {
    const scenario = getScenario("pet_missing_test_retry");
    const attempt1 = runAttempt(observations, scenario, 1);
    const attempt2 = runAttempt(observations, scenario, 2);
    const comparison = compareAttempts(attempt1, attempt2);

    it("attempt 1 has violations (outside_scope for queue.ts)", () => {
      expect(attempt1.violation_count).toBeGreaterThan(0);
      // queue.ts is not in planned_changed_files → outside_scope
      expect(attempt1.violations.some(v => v.kind === "outside_scope_file")).toBe(true);
    });

    it("attempt 2 removes outside_scope violation", () => {
      expect(attempt2.violations.every(v => v.kind !== "outside_scope_file")).toBe(true);
    });

    it("feedback_effect is improved or mixed", () => {
      // Improved: resolved outside_scope, no new violations
      // Mixed: if unmapped review violations remain but outside_scope resolved
      expect(["improved", "mixed"]).toContain(comparison.feedback_effect);
    });

    it("violation_count_delta is negative or zero (fewer violations after retry)", () => {
      expect(comparison.violation_count_delta).toBeLessThanOrEqual(0);
    });

    it("resolved violations include outside_scope", () => {
      expect(comparison.resolved_violations.some(v => v.kind === "outside_scope_file")).toBe(true);
    });

    it("no feedback_ambiguous gaps (not regressed)", () => {
      const gaps = deriveProtocolGapsFromComparison(comparison);
      expect(gaps.filter(g => g.kind === "feedback_ambiguous")).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: compliant baseline
  // -------------------------------------------------------------------------
  describe("Scenario 3: compliant baseline", () => {
    const scenario = getScenario("pet_compliant_baseline");
    const attempt1 = runAttempt(observations, scenario, 1);

    it("attempt 1 has no outside_scope or forbidden violations", () => {
      expect(attempt1.violations.every(v =>
        v.kind !== "outside_scope_file" && v.kind !== "forbidden_file_modified",
      )).toBe(true);
    });

    it("verdict is pass or requires_review", () => {
      // working_tree_only may produce review hints
      expect(["pass", "requires_review"]).toContain(attempt1.verification_verdict);
    });
  });

  // -------------------------------------------------------------------------
  // Report rendering
  // -------------------------------------------------------------------------
  describe("Trial report rendering", () => {
    it("renders markdown with fixture context", () => {
      const report = {
        schema_version: "agent_trial_report.v1" as const,
        trial_id: "trial-001",
        generated_at: "2026-01-01T00:00:00Z",
        fixture_context: {
          repo_kind: "controlled_fixture" as const,
          file_count: 30,
          source_file_count: 12,
          test_file_count: 6,
          known_limitations: ["Small controlled repo"],
        },
        base_repo_state: {
          head_commit_hash: null,
          has_uncommitted_changes: null,
          observation_hash: "sha256:test",
        },
        scenario: {
          id: "pet_out_of_scope_retry" as const,
          description: "Test scenario",
          intent: "Test intent",
        },
        attempts: [],
        comparisons: [],
        final: {
          verdict: "pass",
          agent_followed_scope: true,
          agent_used_feedback: "unknown" as const,
          feedback_effect: "unknown" as const,
          protocol_gaps_observed: [],
          recommended_protocol_changes: [],
        },
      };
      const md = renderAgentTrialReportMarkdown(report);
      expect(md).toContain("Pantheon Agent Trial Report");
      expect(md).toContain("controlled_fixture");
      expect(md).toContain("Small controlled repo");
      expect(md).toContain("protocol usability");
    });
  });
});
