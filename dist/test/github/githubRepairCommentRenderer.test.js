import { describe, expect, it } from "vitest";
import { renderGitHubRepairComment } from "../../src/github/githubRepairCommentRenderer.js";
describe("githubRepairCommentRenderer", () => {
    it("keeps agent hypothesis out of confirmed facts and renders next steps", () => {
        const result = createRunResult();
        const rendered = renderGitHubRepairComment(result).markdown;
        const confirmedFactsSection = rendered.split("### Agent suspected cause")[0];
        expect(confirmedFactsSection).not.toContain("The agent suspects token refresh state is not preserved.");
        expect(rendered).toContain("### Agent suspected cause");
        expect(rendered).toContain("This is an unverified hypothesis.");
        expect(rendered).toContain("## Agent next steps");
    });
});
function createRunResult() {
    return {
        inputs: {
            mode: "repair",
            configPath: "pantheon.alpha.json",
            repairId: "repair_auth_123",
            suspectPaths: [],
            failingTests: [],
            mustPreserve: [],
            auditMode: "auto",
            artifactMode: "public",
            postComment: false,
            failOn: ["fail", "requires_replan", "requires_scope_expansion"],
            sourceKind: "existing_repair_id",
            baseSha: "abc123",
            headSha: "def456",
        },
        prContext: null,
        repairId: "repair_auth_123",
        runPhase: "checked",
        verdict: "requires_review",
        sourceKind: "existing_repair_id",
        session: {
            schema_version: "repair_session@0.1.0",
            repair_id: "repair_auth_123",
            source: "agent_bug_report",
            status: "plan_approved",
            current_revision: 2,
            base_sha: "abc123",
            risk_level: "medium",
            scope_summary: {
                allowed: ["src/auth/session.ts"],
                review_required: ["src/models/**"],
                forbidden: ["migrations/**"],
            },
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
        },
        report: {
            schema_version: "agent_bug_report@0.1.0",
            report_id: "bug_report_123",
            reported_by: { agent: "claude-code" },
            summary: "Fix token refresh bug",
            observed_behavior: "Refresh token state is dropped.",
            expected_behavior: "Refresh token state should be preserved.",
            evidence: [],
            suspected_files: [],
            agent_hypothesis: "The agent suspects token refresh state is not preserved.",
            requested_action: "repair_analysis",
        },
        finding: {
            schema_version: "bug_finding@0.1.0",
            finding_id: "finding_123",
            source_report_id: "bug_report_123",
            status: "accepted",
            limitation: "BugFinding v1 validates report structure and references; it does not prove the bug is real.",
            confirmed_facts: ["tests/auth/session.test.ts exists", "src/auth/session.ts exists"],
            unverified_claims: ["The agent suspects token refresh state is not preserved."],
            invalid_references: [],
            evidence_quality: "medium",
            next_action: "repair_analysis",
        },
        contract: {
            schema_version: "repair_contract@0.1.0",
            repair_id: "repair_auth_123",
            revision: 2,
            source: { kind: "agent_bug_report", id: "bug_report_123" },
            intent: "Fix token refresh bug",
            bug_finding_id: "finding_123",
            suspect_surface: {
                files: [{ path: "src/auth/session.ts", confidence: "medium", reason: "suspect", evidence: [] }],
                reason: "suspect",
            },
            repair_relation_graph: [
                {
                    from: "tests/auth/session.test.ts",
                    to: "src/auth/session.ts",
                    relation: "test_mapping",
                    confidence: "medium",
                    reason: "mapped test",
                    evidence: [],
                },
            ],
            impact_surface: {
                evidence_level: "bootstrap_conservative",
                direct_files: [],
                related_files: [],
                related_tests: [],
                risk_areas: [],
                unknowns: [],
            },
            repair_scope: {
                allowed: [{ pattern: "src/auth/session.ts", source: "suspect_surface", confidence: "high", audit_weight: "normal", reason: "allowed", evidence: [] }],
                review_required: [{ pattern: "src/models/**", source: "risk_preset", confidence: "medium", audit_weight: "elevated", reason: "review", evidence: [] }],
                forbidden: [{ pattern: "migrations/**", source: "default_policy", confidence: "high", audit_weight: "critical", reason: "forbidden", evidence: [] }],
            },
            must_preserve: [],
            consistency_checks: [],
            test_signals: { related: [], recommended: [], missing_mapping: [] },
            repo_state: {
                base_sha: "abc123",
                head_sha: "abc123",
                diff_base: "abc123",
                working_tree_status: "clean",
                created_at: "2026-01-01T00:00:00.000Z",
                source: "git",
            },
            audit_status: "approved_repair_plan",
            source_refs: {
                repo_observations_hash: "obs",
                repo_label: "repo",
                head_commit_hash: "abc123",
            },
        },
        check: {
            schema_version: "repair_check.v1",
            repair_id: "repair_auth_123",
            verdict: "requires_review",
            generated_at: "2026-01-01T00:00:00.000Z",
            summary: {
                changed_files: 2,
                allowed: 1,
                review_required: 1,
                forbidden: 0,
                outside_scope: 0,
                warnings: 0,
            },
            findings: [
                {
                    kind: "review_required_file",
                    severity: "review_required",
                    file: "src/models/User.ts",
                    message: "review",
                    allowed_actions: ["keep_for_human_review"],
                    requires_human: true,
                    bucket: "review_required",
                    evidence: [],
                },
            ],
            concurrent_findings: [],
            changed_files: ["src/auth/session.ts", "src/models/User.ts"],
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
        repairFeedbackPath: "pantheon-repair-report/repair_feedback.md",
        exitDecision: {
            shouldFail: false,
            matchedConditions: [],
            reason: "none",
        },
        commentResult: {
            status: "skipped",
            reason: "PR comment disabled.",
        },
    };
}
//# sourceMappingURL=githubRepairCommentRenderer.test.js.map