import { describe, expect, it } from "vitest";
import { decideGitHubActionExit } from "../../src/github/githubExitPolicy.js";
function makeCheck(findings, verdict = "requires_review") {
    return {
        schema_version: "pantheon_check.v1",
        verdict,
        intent: "Test",
        summary: { changed_files: findings.length, in_scope: 0, review_required: 0, outside_scope: 0, forbidden: 0 },
        findings,
        artifacts: { task: "", scope: "", report: "", feedback: "" },
        repo: { label: "repo", head_commit: null, state: "checked" },
    };
}
describe("githubExitPolicy", () => {
    it("fails on forbidden finding when configured", () => {
        const decision = decideGitHubActionExit({
            check: makeCheck([{
                    kind: "forbidden_file_modified",
                    severity: "reverse_issue_required",
                    file: "saleor/payment/gateway.py",
                    message: "Forbidden",
                    allowed_actions: ["revert_file"],
                    requires_human: true,
                }]),
            failOn: ["forbidden", "outside_scope"],
        });
        expect(decision.shouldFail).toBe(true);
        expect(decision.matchedConditions).toContain("forbidden");
    });
    it("does not fail on review_required unless configured", () => {
        const decision = decideGitHubActionExit({
            check: makeCheck([{
                    kind: "requires_human_review",
                    severity: "review_required",
                    file: "saleor/order/models.py",
                    message: "Review required",
                    allowed_actions: [],
                    requires_human: true,
                }]),
            failOn: ["forbidden", "outside_scope"],
        });
        expect(decision.shouldFail).toBe(false);
    });
    it("fails on review_required when explicitly configured", () => {
        const decision = decideGitHubActionExit({
            check: makeCheck([{
                    kind: "requires_human_review",
                    severity: "review_required",
                    file: "saleor/order/models.py",
                    message: "Review required",
                    allowed_actions: [],
                    requires_human: true,
                }]),
            failOn: ["review_required"],
        });
        expect(decision.shouldFail).toBe(true);
        expect(decision.matchedConditions).toContain("review_required");
    });
});
//# sourceMappingURL=githubExitPolicy.test.js.map