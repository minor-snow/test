/**
 * P22: Agent Feedback Validator Tests
 */

import { describe, it, expect } from "vitest";
import { validateAgentFeedback } from "../../src/agentFeedback/agentFeedbackValidator.js";
import type { AgentFeedback } from "../../src/agentFeedback/types.js";

function makeValidFeedback(overrides?: Partial<AgentFeedback>): AgentFeedback {
  return {
    schema_version: "agent_feedback.v1",
    feedback_id: "test-fb-001",
    generated_at: "2026-01-01T00:00:00Z",
    source: { phase: "diff_verification", source_id: "c-001" },
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
      instructions: ["No repair needed."],
    },
    human_review_required: false,
    ...overrides,
  };
}

function makeViolation(overrides?: Record<string, unknown>) {
  return {
    violation_id: "v-0",
    kind: "outside_scope_file" as const,
    severity: "reverse_issue_required" as const,
    location: { file_path: "src/x.ts" },
    constraint: { constraint_id: "scope.allowed_files", constraint_kind: "scope" as const, description: "Not authorized" },
    message: "File outside scope",
    fix_hint: "Revert or request reverse issue.",
    allowed_agent_actions: ["revert_file" as const, "request_reverse_issue" as const],
    requires_human: true,
    ...overrides,
  };
}

describe("validateAgentFeedback", () => {
  it("valid feedback passes", () => {
    const result = validateAgentFeedback(makeValidFeedback());
    expect(result.status).toBe("valid");
    expect(result.errors).toHaveLength(0);
  });

  it("missing fix_hint fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ fix_hint: "" })],
      summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 1 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("fix_hint"))).toBe(true);
  });

  it("empty allowed_agent_actions fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ allowed_agent_actions: [] })],
      summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 1 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("allowed_agent_actions"))).toBe(true);
  });

  it("summary count mismatch fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation()],
      summary: { violation_count: 0, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 0, requires_human_count: 0 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("violation_count"))).toBe(true);
  });

  it("requires_human_count mismatch fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ requires_human: true })],
      summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 0 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("requires_human_count"))).toBe(true);
  });

  it("reverse issue severity without valid action fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ severity: "reverse_issue_required", allowed_agent_actions: ["ask_human_review"] })],
      summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 1 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("reverse_issue_required"))).toBe(true);
  });

  it("blocking violation with retry_allowed true fails", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ severity: "blocking", allowed_agent_actions: ["do_not_retry"] })],
      summary: { violation_count: 1, blocking_count: 1, review_required_count: 0, reverse_issue_required_count: 0, requires_human_count: 1 },
      retry_guidance: { retry_allowed: true, retry_mode: "safe_retry" as const, max_recommended_retries: 1, instructions: [] },
    });
    const result = validateAgentFeedback(fb);
    expect(result.status).toBe("invalid");
    expect(result.errors.some(e => e.includes("Blocking"))).toBe(true);
  });

  it("raw stack trace in message warns", () => {
    const fb = makeValidFeedback({
      violations: [makeViolation({ message: "Error at src/foo.ts:42" })],
      summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 1 },
    });
    const result = validateAgentFeedback(fb);
    expect(result.warnings.some(w => w.includes("stack trace"))).toBe(true);
  });
});
