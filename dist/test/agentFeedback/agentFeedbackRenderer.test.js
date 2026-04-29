/**
 * P22: Agent Feedback Renderer Tests
 */
import { describe, it, expect } from "vitest";
import { renderAgentFeedbackMarkdown } from "../../src/agentFeedback/agentFeedbackRenderer.js";
function makePassFeedback() {
    return {
        schema_version: "agent_feedback.v1",
        feedback_id: "fb-001",
        generated_at: "2026-01-01T00:00:00Z",
        source: { phase: "diff_verification", source_id: "c-001" },
        verdict: "pass",
        summary: { violation_count: 0, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 0, requires_human_count: 0 },
        violations: [],
        repair_plan: [],
        retry_guidance: { retry_allowed: false, retry_mode: "do_not_retry", max_recommended_retries: 0, instructions: ["No repair needed."] },
        human_review_required: false,
    };
}
function makeViolationFeedback() {
    return {
        schema_version: "agent_feedback.v1",
        feedback_id: "fb-002",
        generated_at: "2026-01-01T00:00:00Z",
        source: { phase: "diff_verification", source_id: "c-001" },
        verdict: "requires_reverse_issue",
        summary: { violation_count: 1, blocking_count: 0, review_required_count: 0, reverse_issue_required_count: 1, requires_human_count: 1 },
        violations: [{
                violation_id: "v-0",
                kind: "outside_scope_file",
                severity: "reverse_issue_required",
                location: { file_path: "src/outside.ts" },
                constraint: { constraint_id: "scope.allowed_files", constraint_kind: "scope", description: "Not authorized" },
                expected: "File in allowed_files",
                actual: "Not in scope",
                message: "File outside authorized scope: src/outside.ts",
                fix_hint: "Revert or request reverse issue.",
                allowed_agent_actions: ["revert_file", "request_reverse_issue"],
                requires_human: true,
            }],
        repair_plan: [{
                action_id: "r-0",
                action: "remove_out_of_scope_change",
                target: { file_path: "src/outside.ts" },
                reason: "Remove out-of-scope change.",
                priority: "high",
                requires_human: true,
            }],
        retry_guidance: { retry_allowed: false, retry_mode: "requires_reverse_issue", max_recommended_retries: 0, instructions: ["Revert changes."] },
        human_review_required: true,
    };
}
describe("renderAgentFeedbackMarkdown", () => {
    it("renders verdict", () => {
        const md = renderAgentFeedbackMarkdown(makePassFeedback());
        expect(md).toContain("## Verdict");
        expect(md).toContain("pass");
    });
    it("renders summary", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("## Summary");
        expect(md).toContain("Violations:");
        expect(md).toContain("Requires human:");
    });
    it("renders requires_human count", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("Requires human:** 1");
    });
    it("renders repair plan", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("## Repair Plan");
        expect(md).toContain("remove_out_of_scope_change");
        expect(md).toContain("src/outside.ts");
    });
    it("renders violation details", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("### outside_scope_file");
        expect(md).toContain("src/outside.ts");
    });
    it("renders expected / actual", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("Expected:");
        expect(md).toContain("Actual:");
    });
    it("renders fix_hint", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("Fix hint:");
        expect(md).toContain("Revert or request reverse issue.");
    });
    it("renders allowed actions", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("Allowed actions:");
        expect(md).toContain("revert_file");
    });
    it("renders retry guidance", () => {
        const md = renderAgentFeedbackMarkdown(makeViolationFeedback());
        expect(md).toContain("## Retry Guidance");
        expect(md).toContain("requires_reverse_issue");
    });
    it("renders advisory notice", () => {
        const md = renderAgentFeedbackMarkdown(makePassFeedback());
        expect(md).toContain("repair_plan is advisory");
        expect(md).toContain("allowed_agent_actions is authoritative");
    });
});
//# sourceMappingURL=agentFeedbackRenderer.test.js.map