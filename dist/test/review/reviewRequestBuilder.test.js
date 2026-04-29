import { describe, expect, it } from "vitest";
import { buildReviewRequest } from "../../src/review/reviewRequestBuilder.js";
describe("reviewRequestBuilder", () => {
    it("builds a human review request for review-required repairs", () => {
        const request = buildReviewRequest({
            repairId: "repair_1",
            contractRevision: 2,
            source: "local_cli",
            check: createCheck("requires_review"),
            contract: createContract(),
        });
        expect(request?.attention_level).toBe("human_review");
        expect(request?.recommended_actions).toContain("human_review");
        expect(request?.files[0]?.bucket).toBe("review_required");
    });
    it("builds a blocking request for stale repairs", () => {
        const request = buildReviewRequest({
            repairId: "repair_2",
            contractRevision: 3,
            source: "github_action",
            check: createCheck("requires_replan"),
            contract: createContract(),
        });
        expect(request?.attention_level).toBe("blocking");
        expect(request?.recommended_actions).toContain("request_replan");
    });
});
function createContract() {
    return {
        schema_version: "repair_contract@0.1.0",
        repair_id: "repair_1",
        revision: 2,
        source: { kind: "agent_bug_report", id: "bug_1" },
        intent: "Fix auth bug",
        bug_finding_id: "finding_1",
        suspect_surface: {
            files: [],
            reason: "suspect",
        },
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
            allowed: [],
            review_required: [],
            forbidden: [],
        },
        must_preserve: [],
        consistency_checks: [],
        test_signals: {
            related: [],
            recommended: [],
            missing_mapping: [],
        },
        repo_state: {
            base_sha: "abc123",
            head_sha: "abc123",
            diff_base: "abc123",
            working_tree_status: "clean",
            created_at: "2026-04-29T00:00:00.000Z",
            source: "git",
        },
        audit_status: "approved_repair_plan",
        source_refs: {
            repo_observations_hash: "obs",
            repo_label: "repo",
            head_commit_hash: "abc123",
        },
    };
}
function createCheck(verdict) {
    return {
        schema_version: "repair_check.v1",
        repair_id: "repair_1",
        verdict,
        generated_at: "2026-04-29T00:00:00.000Z",
        summary: {
            changed_files: 1,
            allowed: verdict === "pass" ? 1 : 0,
            review_required: verdict === "requires_review" ? 1 : 0,
            forbidden: verdict === "fail" ? 1 : 0,
            outside_scope: verdict === "requires_scope_expansion" ? 1 : 0,
            warnings: 0,
        },
        findings: verdict === "requires_review"
            ? [{
                    kind: "review_required_file",
                    severity: "review_required",
                    file: "src/models/User.ts",
                    message: "Model change requires human review.",
                    allowed_actions: ["keep_for_human_review"],
                    requires_human: true,
                    bucket: "review_required",
                    evidence: [],
                }]
            : verdict === "requires_replan"
                ? [{
                        kind: "stale_repair_contract",
                        severity: "blocking",
                        message: "Repair plan is stale.",
                        allowed_actions: ["request_replan"],
                        requires_human: true,
                        evidence: [],
                    }]
                : [],
        concurrent_findings: [],
        changed_files: ["src/models/User.ts"],
        audit_status: "approved_repair_plan",
    };
}
//# sourceMappingURL=reviewRequestBuilder.test.js.map