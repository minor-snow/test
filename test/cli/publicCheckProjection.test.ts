/**
 * P24: Public Check Projection Tests
 */

import { describe, it, expect } from "vitest";
import { buildPublicCheck, buildPublicGuardBaseline } from "../../src/cli/publicCheckProjection.js";
import type { DiffVerificationResult } from "../../src/diffWorkflow/types.js";
import type { AgentFeedback } from "../../src/agentFeedback/types.js";

describe("publicCheckProjection", () => {
  const repo = { label: "test-repo", head_commit: "abc123", state: "git_clean" };

  describe("buildPublicCheck", () => {
    it("produces pantheon_check.v1 schema", () => {
      const verification: DiffVerificationResult = {
        schema_version: "diff_verification_result.v1",
        verified_at: new Date().toISOString(),
        source_scope_id: "s-1",
        source_contract_id: "c-1",
        verdict: "pass",
        file_statuses: [
          { path: "src/a.ts", status: "allowed", reasons: ["Within authorized scope."] },
          { path: "src/b.ts", status: "allowed", reasons: ["Within authorized scope."] },
        ],
        reasons: [],
        required_actions: [],
      };

      const feedback: AgentFeedback = {
        schema_version: "agent_feedback.v1",
        feedback_id: "f-1",
        generated_at: new Date().toISOString(),
        source: {
          phase: "diff_verification",
          source_id: "s-1",
        },
        verdict: "pass",
        summary: {
          violation_count: 0,
          blocking_count: 0,
          review_required_count: 0,
          reverse_issue_required_count: 0,
          requires_human_count: 0,
        },
        violations: [],
        repair_plan: [],
        retry_guidance: {
          retry_allowed: false,
          retry_mode: "do_not_retry",
          max_recommended_retries: 0,
          instructions: [],
        },
        human_review_required: false,
      };

      const result = buildPublicCheck({ verification, feedback, intent: "test", repo });

      expect(result.schema_version).toBe("pantheon_check.v1");
      expect(result.verdict).toBe("pass");
      expect(result.summary.changed_files).toBe(2);
      expect(result.summary.in_scope).toBe(2);
      expect(result.summary.outside_scope).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it("maps violations to findings", () => {
      const verification: DiffVerificationResult = {
        schema_version: "diff_verification_result.v1",
        verified_at: new Date().toISOString(),
        source_scope_id: "s-1",
        source_contract_id: "c-1",
        verdict: "requires_reverse_issue",
        file_statuses: [
          { path: "src/a.ts", status: "allowed", reasons: [] },
          { path: "src/ui/x.tsx", status: "outside_scope", reasons: ["not in scope"] },
        ],
        reasons: ["outside scope file"],
        required_actions: ["revert"],
      };

      const feedback: AgentFeedback = {
        schema_version: "agent_feedback.v1",
        feedback_id: "f-2",
        generated_at: new Date().toISOString(),
        source: {
          phase: "diff_verification",
          source_id: "s-1",
        },
        verdict: "requires_reverse_issue",
        summary: {
          violation_count: 1,
          blocking_count: 0,
          review_required_count: 0,
          reverse_issue_required_count: 1,
          requires_human_count: 1,
        },
        violations: [{
          violation_id: "v-0",
          kind: "outside_scope_file",
          severity: "reverse_issue_required",
          location: { file_path: "src/ui/x.tsx" },
          constraint: {
            constraint_id: "scope.allowed_files",
            constraint_kind: "scope",
            description: "File is not in scope.",
          },
          message: "File outside authorized scope: src/ui/x.tsx",
          fix_hint: "Revert this file.",
          allowed_agent_actions: ["revert_file", "request_reverse_issue"],
          requires_human: true,
        }],
        repair_plan: [],
        retry_guidance: {
          retry_allowed: false,
          retry_mode: "requires_reverse_issue",
          max_recommended_retries: 0,
          instructions: [],
        },
        human_review_required: true,
      };

      const result = buildPublicCheck({ verification, feedback, intent: "test", repo });

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].kind).toBe("outside_scope_file");
      expect(result.findings[0].file).toBe("src/ui/x.tsx");
      expect(result.findings[0].requires_human).toBe(true);
      expect(result.findings[0].allowed_actions).toContain("revert_file");
    });

    it("does NOT expose internal fields", () => {
      const verification: DiffVerificationResult = {
        schema_version: "diff_verification_result.v1",
        verified_at: new Date().toISOString(),
        source_scope_id: "s-1",
        source_contract_id: "c-1",
        verdict: "pass",
        file_statuses: [],
        reasons: [],
        required_actions: [],
      };
      const feedback: AgentFeedback = {
        schema_version: "agent_feedback.v1",
        feedback_id: "f-3",
        generated_at: new Date().toISOString(),
        source: {
          phase: "diff_verification",
          source_id: "s-1",
        },
        verdict: "pass",
        summary: { violation_count: 0, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 0, requires_human_count: 0 },
        violations: [],
        repair_plan: [],
        retry_guidance: { retry_allowed: false, retry_mode: "do_not_retry", max_recommended_retries: 0, instructions: [] },
        human_review_required: false,
      };

      const result = buildPublicCheck({ verification, feedback, intent: "test", repo });
      const json = JSON.stringify(result);

      // Must NOT contain internal field names
      expect(json).not.toContain("change_contract");
      expect(json).not.toContain("boundary_graph");
      expect(json).not.toContain("hash_payload");
      expect(json).not.toContain("gate_registry");
      expect(json).not.toContain("observation_hash");
      expect(json).not.toContain("import_edges");
      expect(json).not.toContain("contract_id");
      expect(json).not.toContain("scope_id");
    });

    it("includes artifact paths", () => {
      const verification: DiffVerificationResult = {
        schema_version: "diff_verification_result.v1",
        verified_at: new Date().toISOString(),
        source_scope_id: "s-1",
        source_contract_id: "c-1",
        verdict: "pass",
        file_statuses: [],
        reasons: [],
        required_actions: [],
      };
      const feedback: AgentFeedback = {
        schema_version: "agent_feedback.v1",
        feedback_id: "f-4",
        generated_at: new Date().toISOString(),
        source: { phase: "diff_verification", source_id: "s-1" },
        verdict: "pass",
        summary: { violation_count: 0, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 0, requires_human_count: 0 },
        violations: [],
        repair_plan: [],
        retry_guidance: { retry_allowed: false, retry_mode: "do_not_retry", max_recommended_retries: 0, instructions: [] },
        human_review_required: false,
      };

      const result = buildPublicCheck({ verification, feedback, intent: "test", repo });
      expect(result.artifacts.task).toBe(".pantheon/task.md");
      expect(result.artifacts.scope).toBe(".pantheon/scope.md");
      expect(result.artifacts.report).toBe(".pantheon/report.md");
      expect(result.artifacts.feedback).toBe(".pantheon/feedback.md");
    });
  });

  describe("buildPublicGuardBaseline", () => {
    it("produces guard_created verdict", () => {
      const result = buildPublicGuardBaseline({
        intent: "Add feature",
        allowedCount: 4,
        reviewRequiredCount: 1,
        forbiddenCount: 3,
        repo,
      });

      expect(result.schema_version).toBe("pantheon_check.v1");
      expect(result.verdict).toBe("guard_created");
      expect(result.summary.in_scope).toBe(4);
      expect(result.summary.review_required).toBe(1);
      expect(result.summary.outside_scope).toBe(0);
      expect(result.findings).toHaveLength(0);
    });
  });
});
