/**
 * P22: Diff Feedback Builder Tests
 */

import { describe, it, expect } from "vitest";
import { buildAgentFeedbackFromDiffVerification } from "../../src/agentFeedback/diffFeedbackBuilder.js";
import { validateAgentFeedback } from "../../src/agentFeedback/agentFeedbackValidator.js";
import type { DiffVerificationResult, AgentScopeLite } from "../../src/diffWorkflow/types.js";
import type { ChangeContractLite } from "../../src/changeContract/lite/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContract(): ChangeContractLite {
  return {
    schema_version: "change_contract_lite.v1",
    contract_id: "c-test",
    mode: "bootstrap",
    created_at: "2026-01-01T00:00:00Z",
    intent: "Test",
    refs: { repo_observations_hash: "sha256:abc", head_commit_hash: null, repo_state: "working_tree_only", has_uncommitted_changes: null },
    changed_files: ["src/a.ts"],
    observed_scope: {
      touched_buckets: ["src"], touched_sensitive_paths: [], related_tests: [],
      owner_hints: [], unknowns: [],
      changed_file_statuses: [{ path: "src/a.ts", status: "observed", reason: "ok" }],
    },
    decision: { verdict: "pass", reasons: [], required_actions: [] },
  };
}

function makeScope(overrides?: Partial<AgentScopeLite>): AgentScopeLite {
  return {
    schema_version: "agent_scope_lite.v1",
    scope_id: "scope-test",
    source_contract_id: "c-test",
    source_observations_hash: "sha256:abc",
    intent: "Test",
    allowed_files: ["src/a.ts"],
    review_required_files: [],
    forbidden_patterns: [
      { pattern: ".pantheon/**", reason: "Protocol" },
    ],
    required_tests: ["test/a.test.ts"],
    instructions: [],
    ...overrides,
  };
}

function makeVerification(
  verdict: DiffVerificationResult["verdict"],
  fileStatuses: DiffVerificationResult["file_statuses"],
): DiffVerificationResult {
  return {
    schema_version: "diff_verification_result.v1",
    verified_at: "2026-01-01T00:00:00Z",
    source_scope_id: "scope-test",
    source_contract_id: "c-test",
    verdict,
    reasons: [],
    required_actions: [],
    file_statuses: fileStatuses,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildAgentFeedbackFromDiffVerification", () => {
  it("pass produces no violations", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("pass", [
        { path: "src/a.ts", status: "allowed", reasons: ["ok"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    expect(feedback.verdict).toBe("pass");
    expect(feedback.violations).toHaveLength(0);
    expect(feedback.repair_plan).toHaveLength(0);
    expect(feedback.retry_guidance.retry_allowed).toBe(false);
    expect(feedback.retry_guidance.retry_mode).toBe("do_not_retry");
  });

  it("outside_scope file produces outside_scope_file violation", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_reverse_issue", [
        { path: "src/a.ts", status: "allowed", reasons: ["ok"] },
        { path: "src/outside.ts", status: "outside_scope", reasons: ["Not authorized"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    expect(feedback.verdict).toBe("requires_reverse_issue");
    const v = feedback.violations.find(v => v.kind === "outside_scope_file");
    expect(v).toBeDefined();
    expect(v!.location.file_path).toBe("src/outside.ts");
    expect(v!.severity).toBe("reverse_issue_required");
    expect(v!.allowed_agent_actions).toContain("revert_file");
    expect(v!.allowed_agent_actions).toContain("request_reverse_issue");
    expect(v!.requires_human).toBe(true);
  });

  it("forbidden file produces forbidden_file_modified violation", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_reverse_issue", [
        { path: ".pantheon/x.json", status: "forbidden", reasons: ["Protocol"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    const v = feedback.violations.find(v => v.kind === "forbidden_file_modified");
    expect(v).toBeDefined();
    expect(v!.allowed_agent_actions).toContain("revert_file");
    expect(v!.requires_human).toBe(true);
  });

  it("review_required file uses violation_hints when present", () => {
    const scope = makeScope({
      violation_hints: [
        { path: "src/a.ts", violation_kind: "missing_test_mapping", context: { expected: "Should have test", actual: "No test found" } },
      ],
    });
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_review", [
        { path: "src/a.ts", status: "review_required", reasons: ["Review"] },
      ]),
      scope,
      contract: makeContract(),
    });
    const v = feedback.violations.find(v => v.kind === "missing_test_mapping");
    expect(v).toBeDefined();
    expect(v!.severity).toBe("review_required");
    expect(v!.expected).toBe("Should have test");
    expect(v!.actual).toBe("No test found");
    expect(v!.allowed_agent_actions).toContain("add_required_test");
  });

  it("review_required fallback produces requires_human_review", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_review", [
        { path: "src/a.ts", status: "review_required", reasons: ["Review"] },
      ]),
      scope: makeScope(),  // no violation_hints
      contract: makeContract(),
    });
    const v = feedback.violations.find(v => v.kind === "requires_human_review");
    expect(v).toBeDefined();
    expect(v!.requires_human).toBe(true);
    expect(v!.allowed_agent_actions).toContain("ask_human_review");
  });

  it("reverse issue result sets retry_allowed false", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_reverse_issue", [
        { path: "src/x.ts", status: "outside_scope", reasons: ["no"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    expect(feedback.retry_guidance.retry_allowed).toBe(false);
    expect(feedback.retry_guidance.retry_mode).toBe("requires_reverse_issue");
  });

  it("review with agent-fixable violations allows safe_retry", () => {
    const scope = makeScope({
      violation_hints: [
        { path: "src/a.ts", violation_kind: "missing_test_mapping", context: { expected: "test", actual: "none" } },
      ],
    });
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_review", [
        { path: "src/a.ts", status: "review_required", reasons: ["Review"] },
      ]),
      scope,
      contract: makeContract(),
    });
    expect(feedback.retry_guidance.retry_allowed).toBe(true);
    expect(feedback.retry_guidance.retry_mode).toBe("safe_retry");
  });

  it("does not parse verification.reasons", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("pass", [
        { path: "src/a.ts", status: "allowed", reasons: ["ok"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    // No violations from reason parsing
    expect(feedback.violations).toHaveLength(0);
  });

  it("generated feedback validates", () => {
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_reverse_issue", [
        { path: "src/x.ts", status: "outside_scope", reasons: ["no"] },
      ]),
      scope: makeScope(),
      contract: makeContract(),
    });
    const result = validateAgentFeedback(feedback);
    expect(result.status).toBe("valid");
  });

  it("undeclared package violation from hints", () => {
    const scope = makeScope({
      violation_hints: [
        { path: "src/a.ts", violation_kind: "undeclared_package", context: { package_name: "lodash" } },
      ],
    });
    const feedback = buildAgentFeedbackFromDiffVerification({
      verification: makeVerification("requires_review", [
        { path: "src/a.ts", status: "review_required", reasons: ["Review"] },
      ]),
      scope,
      contract: makeContract(),
    });
    const v = feedback.violations.find(v => v.kind === "undeclared_package");
    expect(v).toBeDefined();
    expect(v!.message).toContain("lodash");
    expect(v!.allowed_agent_actions).toContain("update_package_manifest");
    expect(v!.requires_human).toBe(false);
  });
});
