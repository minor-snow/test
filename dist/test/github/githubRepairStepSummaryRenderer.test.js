import { describe, expect, it } from "vitest";
import { renderGitHubRepairStepSummary } from "../../src/github/githubRepairStepSummaryRenderer.js";
describe("githubRepairStepSummaryRenderer", () => {
    it("renders a compact repair summary", () => {
        const rendered = renderGitHubRepairStepSummary({
            inputs: {
                mode: "repair",
                configPath: "pantheon.alpha.json",
                repairId: "repair_123",
                suspectPaths: [],
                failingTests: [],
                mustPreserve: [],
                auditMode: "auto",
                artifactMode: "public",
                postComment: false,
                failOn: ["fail"],
                sourceKind: "existing_repair_id",
            },
            prContext: null,
            repairId: "repair_123",
            runPhase: "checked",
            verdict: "pass",
            sourceKind: "existing_repair_id",
            session: {
                schema_version: "repair_session@0.1.0",
                repair_id: "repair_123",
                source: "manual",
                status: "repair_checked_pass",
                current_revision: 2,
                risk_level: "low",
                scope_summary: { allowed: [], review_required: [], forbidden: [] },
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
            },
            report: {
                schema_version: "user_bug_report@0.1.0",
                report_id: "bug_report_123",
                reported_by: { operator_id: "user" },
                summary: "Fix bug",
                evidence: [],
                suspected_files: [],
                must_preserve: [],
                requested_action: "repair_analysis",
            },
            finding: {
                schema_version: "bug_finding@0.1.0",
                finding_id: "finding_123",
                source_report_id: "bug_report_123",
                status: "accepted",
                limitation: "BugFinding v1 validates report structure and references; it does not prove the bug is real.",
                confirmed_facts: [],
                unverified_claims: [],
                invalid_references: [],
                evidence_quality: "low",
                next_action: "repair_analysis",
            },
            contract: null,
            check: {
                schema_version: "repair_check.v1",
                repair_id: "repair_123",
                verdict: "pass",
                generated_at: "2026-01-01T00:00:00.000Z",
                summary: {
                    changed_files: 1,
                    allowed: 1,
                    review_required: 0,
                    forbidden: 0,
                    outside_scope: 0,
                    warnings: 0,
                },
                findings: [],
                concurrent_findings: [],
                changed_files: ["src/utils/format.ts"],
                audit_status: "approved_repair_plan",
            },
            artifactCollection: {
                outputDir: "pantheon-repair-report",
                outputDirRelative: "pantheon-repair-report",
                copiedPublicArtifacts: [],
                copiedDebugArtifacts: [],
                withheldArtifacts: [],
                sanitizerViolations: [],
            },
            artifactOutputDir: "pantheon-repair-report",
            artifactOutputDirRelative: "pantheon-repair-report",
            summaryPath: null,
            commentPath: "pantheon-repair-report/pr_comment.md",
            repairFeedbackPath: null,
            exitDecision: {
                shouldFail: false,
                matchedConditions: [],
                reason: "none",
            },
            commentResult: {
                status: "skipped",
                reason: "disabled",
            },
        }).markdown;
        expect(rendered).toContain("Verdict: `pass`");
        expect(rendered).toContain("Repair ID: repair_123");
        expect(rendered).toContain("Artifact sanitizer violations: 0");
    });
});
//# sourceMappingURL=githubRepairStepSummaryRenderer.test.js.map