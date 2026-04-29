/**
 * P21: Agent Scope Lite Builder Tests
 */
import { describe, it, expect } from "vitest";
import { buildAgentScopeLite, renderAgentScopeLiteMarkdown, renderCursorRuleFromScope, } from "../../src/diffWorkflow/agentScopeLiteBuilder.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContract(overrides) {
    return {
        schema_version: "change_contract_lite.v1",
        contract_id: "test-contract-001",
        mode: "bootstrap",
        created_at: "2026-01-01T00:00:00Z",
        intent: "Test change intent",
        refs: {
            repo_observations_hash: "sha256:abc",
            head_commit_hash: null,
            repo_state: "working_tree_only",
            has_uncommitted_changes: null,
        },
        changed_files: ["src/a.ts", "src/b.ts"],
        observed_scope: {
            touched_buckets: ["src"],
            touched_sensitive_paths: [],
            related_tests: ["test/a.test.ts"],
            owner_hints: [],
            unknowns: [],
            changed_file_statuses: [
                { path: "src/a.ts", status: "observed", reason: "File found in observations" },
                { path: "src/b.ts", status: "observed", reason: "File found in observations" },
            ],
        },
        decision: {
            verdict: "pass",
            reasons: [],
            required_actions: [],
        },
        ...overrides,
    };
}
function makeObs() {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "working_tree_only", head_commit_hash: null, has_uncommitted_changes: null, uncommitted_file_count: 0, scanned_at: "" },
        scanner: { scanner_version: "0.2.0", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
        limits: { max_file_bytes: 524288, max_total_files: 10000, max_import_edges: 50000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: [], path_buckets: [], import_edges: [], test_mappings: [],
            sensitive_paths: [], owner_hints: [], config_hints: [],
            package_manifests: [],
        },
        unknowns: {
            skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [],
            unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [],
            scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [],
        },
        excluded: [],
        quality: {
            raw_unknown_count: 0, raw_unknown_ratio: 0,
            out_of_scope_count: 0, out_of_scope_ratio: 0,
            actionable_count: 0, actionable_ratio: 0,
            intrinsic_count: 0, intrinsic_ratio: 0,
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
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildAgentScopeLite", () => {
    it("builds allowed_files from observed changed files", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.allowed_files).toContain("src/a.ts");
        expect(scope.allowed_files).toContain("src/b.ts");
    });
    it("excludes path_invalid files from allowed_files", () => {
        const contract = makeContract({
            observed_scope: {
                ...makeContract().observed_scope,
                changed_file_statuses: [
                    { path: "src/a.ts", status: "observed", reason: "ok" },
                    { path: "../escape.ts", status: "path_invalid", reason: "bad path" },
                ],
            },
        });
        const scope = buildAgentScopeLite({ contract, observations: makeObs() });
        expect(scope.allowed_files).toContain("src/a.ts");
        expect(scope.allowed_files).not.toContain("../escape.ts");
    });
    it("excludes excluded files from allowed_files", () => {
        const contract = makeContract({
            observed_scope: {
                ...makeContract().observed_scope,
                changed_file_statuses: [
                    { path: "src/a.ts", status: "observed", reason: "ok" },
                    { path: "node_modules/x.js", status: "excluded", reason: "excluded" },
                ],
            },
        });
        const scope = buildAgentScopeLite({ contract, observations: makeObs() });
        expect(scope.allowed_files).not.toContain("node_modules/x.js");
    });
    it("marks not_observed files as review_required", () => {
        const contract = makeContract({
            observed_scope: {
                ...makeContract().observed_scope,
                changed_file_statuses: [
                    { path: "src/a.ts", status: "observed", reason: "ok" },
                    { path: "src/new.ts", status: "not_observed", reason: "not found" },
                ],
            },
        });
        const scope = buildAgentScopeLite({ contract, observations: makeObs() });
        expect(scope.review_required_files.some(f => f.path === "src/new.ts")).toBe(true);
    });
    it("adds .pantheon/** forbidden pattern", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.forbidden_patterns.some(fp => fp.pattern === ".pantheon/**")).toBe(true);
    });
    it("adds .cursor/** forbidden pattern", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.forbidden_patterns.some(fp => fp.pattern === ".cursor/**")).toBe(true);
    });
    it("includes required_tests from contract", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.required_tests).toContain("test/a.test.ts");
    });
    it("includes intent", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.intent).toBe("Test change intent");
    });
    it("schema_version is agent_scope_lite.v1", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        expect(scope.schema_version).toBe("agent_scope_lite.v1");
    });
    it("marks sensitive paths as review_required", () => {
        const contract = makeContract({
            observed_scope: {
                ...makeContract().observed_scope,
                touched_sensitive_paths: ["src/a.ts (critical config)"],
                sensitive_path_details: [{ path: "src/a.ts", reason: "critical config" }],
            },
        });
        const scope = buildAgentScopeLite({ contract, observations: makeObs() });
        expect(scope.review_required_files.some(f => f.path === "src/a.ts")).toBe(true);
    });
});
describe("renderAgentScopeLiteMarkdown", () => {
    it("includes allowed files section", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const md = renderAgentScopeLiteMarkdown(scope);
        expect(md).toContain("## Allowed Files");
        expect(md).toContain("src/a.ts");
    });
    it("includes forbidden patterns", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const md = renderAgentScopeLiteMarkdown(scope);
        expect(md).toContain(".pantheon/**");
    });
    it("includes intent", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const md = renderAgentScopeLiteMarkdown(scope);
        expect(md).toContain("Test change intent");
    });
    it("includes footer with scope/contract IDs", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const md = renderAgentScopeLiteMarkdown(scope);
        expect(md).toContain("auto-generated by Pantheon");
        expect(md).toContain("test-contract-001");
    });
});
describe("renderCursorRuleFromScope", () => {
    it("includes Pantheon Change Boundaries header", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const rule = renderCursorRuleFromScope(scope);
        expect(rule).toContain("# Pantheon Change Boundaries");
    });
    it("includes allowed files", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const rule = renderCursorRuleFromScope(scope);
        expect(rule).toContain("src/a.ts");
    });
    it("includes Stop and Report section", () => {
        const scope = buildAgentScopeLite({ contract: makeContract(), observations: makeObs() });
        const rule = renderCursorRuleFromScope(scope);
        expect(rule).toContain("Stop and Report If");
    });
});
//# sourceMappingURL=agentScopeLiteBuilder.test.js.map