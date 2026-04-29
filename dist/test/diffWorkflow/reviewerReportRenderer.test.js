/**
 * P21: Reviewer Report Renderer Tests
 */
import { describe, it, expect } from "vitest";
import { renderReviewerReport } from "../../src/diffWorkflow/reviewerReportRenderer.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContract() {
    return {
        schema_version: "change_contract_lite.v1",
        contract_id: "test-contract",
        mode: "bootstrap",
        created_at: "2026-01-01T00:00:00Z",
        intent: "Fix auth bug",
        refs: { repo_observations_hash: "sha256:abc", head_commit_hash: null, repo_state: "working_tree_only", has_uncommitted_changes: null },
        changed_files: ["src/auth/login.ts"],
        observed_scope: {
            touched_buckets: ["src"], touched_sensitive_paths: [], related_tests: ["test/auth/login.test.ts"],
            owner_hints: [], unknowns: [],
            changed_file_statuses: [{ path: "src/auth/login.ts", status: "observed", reason: "ok" }],
        },
        decision: { verdict: "pass", reasons: [], required_actions: [] },
    };
}
function makeScope() {
    return {
        schema_version: "agent_scope_lite.v1",
        scope_id: "scope-test",
        source_contract_id: "test-contract",
        source_observations_hash: "sha256:abc",
        intent: "Fix auth bug",
        allowed_files: ["src/auth/login.ts"],
        review_required_files: [],
        forbidden_patterns: [
            { pattern: ".pantheon/**", reason: "Protocol" },
        ],
        required_tests: ["test/auth/login.test.ts"],
        instructions: [],
    };
}
function makeDiff() {
    return {
        base_ref: "HEAD",
        changed_files: [
            { path: "src/auth/login.ts", status: "modified" },
        ],
        warnings: [],
    };
}
function makeObs() {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "working_tree_only", head_commit_hash: null, has_uncommitted_changes: null, uncommitted_file_count: 0, scanned_at: "" },
        scanner: { scanner_version: "0.2.0", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
        limits: { max_file_bytes: 524288, max_total_files: 10000, max_import_edges: 50000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: { files: [], path_buckets: [], import_edges: [], test_mappings: [], sensitive_paths: [], owner_hints: [], config_hints: [], package_manifests: [] },
        unknowns: { skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [], unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [], scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [] },
        excluded: [],
        quality: {
            raw_unknown_count: 0, raw_unknown_ratio: 0, out_of_scope_count: 0, out_of_scope_ratio: 0,
            actionable_count: 0, actionable_ratio: 0, intrinsic_count: 0, intrinsic_ratio: 0,
            unknown_bucket_file_count: 0, undeclared_package_count: 0,
            taxonomy: {
                out_of_scope: { unsupported_files: [] },
                actionable: { unmapped_sources: [], unmapped_tests: [], undeclared_packages: [], unresolved_aliases: [], unknown_packages: [], owner_patterns_unresolved: [] },
                intrinsic: { dynamic_imports: [], skipped_large_files: [], scan_limit_exceeded: [] },
            },
        },
        meta: { observation_hash: "sha256:test", partial_scan: false, file_count: 10, unknown_count: 0, excluded_count: 0 },
    };
}
function makeVerification(verdict) {
    return {
        schema_version: "diff_verification_result.v1",
        verified_at: "2026-01-01T00:00:00Z",
        source_scope_id: "scope-test",
        source_contract_id: "test-contract",
        verdict,
        reasons: verdict === "pass" ? [] : [`File outside scope.`],
        required_actions: verdict === "pass" ? [] : ["Create reverse issue."],
        file_statuses: [
            { path: "src/auth/login.ts", status: "allowed", reasons: ["ok"] },
        ],
    };
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("renderReviewerReport", () => {
    it("includes decision section", () => {
        const report = renderReviewerReport({
            intent: "Fix auth bug",
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            verification: makeVerification("pass"),
            observations: makeObs(),
        });
        expect(report).toContain("## Decision");
        expect(report).toContain("pass");
    });
    it("includes intent", () => {
        const report = renderReviewerReport({
            intent: "Fix auth bug",
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("## Intent");
        expect(report).toContain("Fix auth bug");
    });
    it("includes authorized scope", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("## Authorized Scope");
        expect(report).toContain("src/auth/login.ts");
    });
    it("includes actual diff", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("## Actual Diff");
        expect(report).toContain("HEAD");
    });
    it("separates authorized scope from actual diff", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        const scopeIdx = report.indexOf("## Authorized Scope");
        const diffIdx = report.indexOf("## Actual Diff");
        expect(scopeIdx).toBeLessThan(diffIdx);
    });
    it("lists out-of-scope files", () => {
        const verification = {
            ...makeVerification("requires_reverse_issue"),
            file_statuses: [
                { path: "src/auth/login.ts", status: "allowed", reasons: ["ok"] },
                { path: "src/outside.ts", status: "outside_scope", reasons: ["Not authorized"] },
            ],
        };
        const report = renderReviewerReport({
            diff: { base_ref: "HEAD", changed_files: [{ path: "src/auth/login.ts" }, { path: "src/outside.ts" }], warnings: [] },
            contract: makeContract(),
            scope: makeScope(),
            verification,
            observations: makeObs(),
        });
        expect(report).toContain("Out-of-Scope Files");
        expect(report).toContain("src/outside.ts");
    });
    it("lists forbidden files", () => {
        const verification = {
            ...makeVerification("requires_reverse_issue"),
            file_statuses: [
                { path: ".pantheon/x.json", status: "forbidden", reasons: ["Protocol"] },
            ],
        };
        const report = renderReviewerReport({
            diff: { base_ref: "HEAD", changed_files: [{ path: ".pantheon/x.json" }], warnings: [] },
            contract: makeContract(),
            scope: makeScope(),
            verification,
            observations: makeObs(),
        });
        expect(report).toContain("Forbidden Files Touched");
        expect(report).toContain(".pantheon/x.json");
    });
    it("includes observation quality", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("## Observation Quality");
        expect(report).toContain("Files scanned");
    });
    it("includes semantic correctness disclaimer", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("boundary compliance, not semantic correctness");
    });
    it("without verification, shows contract verdict", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain("Contract verdict");
        expect(report).toContain("Verification not yet run");
    });
    it("includes forbidden patterns in scope", () => {
        const report = renderReviewerReport({
            diff: makeDiff(),
            contract: makeContract(),
            scope: makeScope(),
            observations: makeObs(),
        });
        expect(report).toContain(".pantheon/**");
    });
});
//# sourceMappingURL=reviewerReportRenderer.test.js.map