/**
 * P24: User-facing Markdown Renderer Tests
 */
import { describe, it, expect } from "vitest";
import { renderPublicTaskMarkdown, renderPublicScopeMarkdown, renderPublicReportMarkdown, renderPublicFeedbackMarkdown, groupByDirectory, } from "../../src/cli/markdownRenderers.js";
describe("markdownRenderers", () => {
    describe("renderPublicTaskMarkdown", () => {
        it("renders task with all sections", () => {
            const md = renderPublicTaskMarkdown({
                intent: "Fix the sync bug",
                allowedFiles: ["src/sync.ts", "src/conflict.ts"],
                requiredTests: ["test/sync.test.ts"],
                forbiddenPatterns: [
                    { pattern: ".pantheon/**", reason: "Protected" },
                    { pattern: ".git/**", reason: "Version control" },
                ],
                reviewRequiredFiles: ["src/models.ts"],
            });
            expect(md).toContain("# Task");
            expect(md).toContain("What to do");
            expect(md).toContain("Fix the sync bug");
            expect(md).toContain("Where you can work");
            expect(md).toContain("src/sync.ts");
            expect(md).toContain("Where you must NOT work");
            expect(md).toContain(".pantheon/**");
            expect(md).toContain("Required tests");
            expect(md).toContain("test/sync.test.ts");
            expect(md).toContain("Files requiring human review");
            expect(md).toContain("src/models.ts");
        });
        it("omits review section when empty", () => {
            const md = renderPublicTaskMarkdown({
                intent: "test",
                allowedFiles: ["a.ts"],
                requiredTests: [],
                forbiddenPatterns: [{ pattern: ".git/**", reason: "vc" }],
                reviewRequiredFiles: [],
            });
            expect(md).not.toContain("Files requiring human review");
        });
        it("does NOT use internal terminology", () => {
            const md = renderPublicTaskMarkdown({
                intent: "test",
                allowedFiles: ["a.ts"],
                requiredTests: [],
                forbiddenPatterns: [],
                reviewRequiredFiles: [],
            });
            expect(md).not.toContain("ChangeContract");
            expect(md).not.toContain("violation_hints");
            expect(md).not.toContain("scope_id");
            expect(md).not.toContain("AgentScope");
            expect(md).not.toContain("P20");
            expect(md).not.toContain("P21");
            expect(md).not.toContain("P22");
            expect(md).not.toContain("P23");
        });
        it("places sensitive warnings before allowed scope listing", () => {
            const md = renderPublicTaskMarkdown({
                intent: "test",
                allowedFiles: ["a.ts"],
                requiredTests: [],
                forbiddenPatterns: [],
                reviewRequiredFiles: [],
                sensitiveWarnings: "⚠️ financial_transactions",
                suggestedTests: "Suggested tests",
            });
            const warnIdx = md.indexOf("financial_transactions");
            const allowedIdx = md.indexOf("Where you can work");
            const suggestedIdx = md.indexOf("Suggested tests");
            expect(warnIdx).toBeGreaterThan(-1);
            expect(allowedIdx).toBeGreaterThan(-1);
            expect(warnIdx).toBeLessThan(allowedIdx);
            expect(suggestedIdx).toBeGreaterThan(allowedIdx);
        });
    });
    describe("renderPublicScopeMarkdown", () => {
        it("includes repo info and intent", () => {
            const md = renderPublicScopeMarkdown({
                intent: "Add feature",
                allowedFiles: ["src/a.ts"],
                requiredTests: [],
                forbiddenPatterns: [{ pattern: ".git/**", reason: "vc" }],
                reviewRequiredFiles: [],
                repoLabel: "my-project",
                headCommit: "abc123def456",
            });
            expect(md).toContain("my-project");
            expect(md).toContain("abc123def456");
            expect(md).toContain("Add feature");
        });
        it("summarizes large review-required sections by directory", () => {
            const reviewRequiredFiles = Array.from({ length: 25 }, (_, i) => `saleor/order/rules/file-${i}.py`);
            const md = renderPublicScopeMarkdown({
                intent: "Add feature",
                allowedFiles: ["saleor/checkout/actions.py"],
                requiredTests: [],
                forbiddenPatterns: [{ pattern: "saleor/payment/**", reason: "Protected" }],
                reviewRequiredFiles,
                repoLabel: "saleor",
                headCommit: "abc123def456",
            });
            expect(md).toContain("Review-required files");
            expect(md).toContain("saleor/order/rules/**");
            expect(md).not.toContain("saleor/order/rules/file-0.py");
        });
    });
    describe("groupByDirectory", () => {
        it("preserves three-segment module boundaries when files share a nested directory", () => {
            const grouped = groupByDirectory([
                "saleor/graphql/checkout/mutations.py",
                "saleor/graphql/checkout/types.py",
                "saleor/graphql/checkout/utils.py",
            ]);
            expect(grouped).toEqual([
                { dir: "saleor/graphql/checkout", count: 3 },
            ]);
        });
    });
    describe("renderPublicReportMarkdown", () => {
        it("renders clean pass", () => {
            const check = {
                schema_version: "pantheon_check.v1",
                verdict: "pass",
                intent: "Test",
                summary: { changed_files: 2, in_scope: 2, review_required: 0, outside_scope: 0, forbidden: 0 },
                findings: [],
                artifacts: { task: "", scope: "", report: "", feedback: "" },
                repo: { label: "repo", head_commit: "abc", state: "clean" },
                attempt: 1,
            };
            const md = renderPublicReportMarkdown(check);
            expect(md).toContain("Boundary Check Report");
            expect(md).toContain("All changes are within the authorized scope");
            expect(md).toContain("Attempt:** 1");
        });
        it("renders findings table", () => {
            const check = {
                schema_version: "pantheon_check.v1",
                verdict: "fail",
                intent: "Test",
                summary: { changed_files: 3, in_scope: 1, review_required: 0, outside_scope: 1, forbidden: 1 },
                findings: [
                    { kind: "forbidden", severity: "blocking", file: "settings.py", message: "Forbidden file", allowed_actions: ["revert_file"], requires_human: false },
                    { kind: "outside_scope", severity: "reverse_issue_required", file: "ui/page.tsx", message: "Outside scope", allowed_actions: ["revert_file", "request_scope_expansion"], requires_human: true },
                ],
                artifacts: { task: "", scope: "", report: "", feedback: "" },
                repo: { label: "repo", head_commit: null, state: "clean" },
            };
            const md = renderPublicReportMarkdown(check);
            expect(md).toContain("settings.py");
            expect(md).toContain("ui/page.tsx");
            expect(md).toContain("Requires human review");
        });
    });
    describe("renderPublicFeedbackMarkdown", () => {
        it("renders clean feedback", () => {
            const check = {
                schema_version: "pantheon_check.v1",
                verdict: "pass",
                intent: "Test",
                summary: { changed_files: 1, in_scope: 1, review_required: 0, outside_scope: 0, forbidden: 0 },
                findings: [],
                artifacts: { task: "", scope: "", report: "", feedback: "" },
                repo: { label: "repo", head_commit: null, state: "clean" },
            };
            const md = renderPublicFeedbackMarkdown(check);
            expect(md).toContain("No issues found");
        });
        it("renders actionable feedback for violations", () => {
            const check = {
                schema_version: "pantheon_check.v1",
                verdict: "fail",
                intent: "Test",
                summary: { changed_files: 2, in_scope: 1, review_required: 0, outside_scope: 1, forbidden: 0 },
                findings: [{
                        kind: "outside_scope",
                        severity: "reverse_issue_required",
                        file: "src/ui.tsx",
                        message: "Outside authorized scope",
                        allowed_actions: ["revert_file", "request_reverse_issue"],
                        requires_human: true,
                    }],
                artifacts: { task: "", scope: "", report: "", feedback: "" },
                repo: { label: "repo", head_commit: null, state: "clean" },
            };
            const md = renderPublicFeedbackMarkdown(check);
            expect(md).toContain("src/ui.tsx");
            expect(md).toContain("Revert this file");
            expect(md).toContain("Request scope expansion");
            expect(md).toContain("requires human review");
        });
    });
});
//# sourceMappingURL=markdownRenderers.test.js.map