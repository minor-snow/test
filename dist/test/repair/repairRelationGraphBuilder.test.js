import { describe, expect, it } from "vitest";
import { buildRepairRelationGraph } from "../../src/repair/repairRelationGraphBuilder.js";
function userReport(overrides) {
    return {
        schema_version: "user_bug_report@0.1.0",
        report_id: "r_test",
        reported_by: { operator_id: "user" },
        summary: "Fix bug",
        evidence: [],
        suspected_files: [],
        requested_action: "repair_analysis",
        must_preserve: [],
        ...overrides,
    };
}
function makeObservations(filePaths, testMappings) {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: new Date().toISOString() },
        scanner: { scanner_version: "test", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
        limits: { max_file_bytes: 1000000, max_total_files: 10000, max_import_edges: 5000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: filePaths.map(p => ({ path: p, bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] })),
            path_buckets: [],
            import_edges: [],
            test_mappings: testMappings ?? [],
            sensitive_paths: [],
            owner_hints: [],
            config_hints: [],
            package_manifests: [],
        },
        unknowns: { skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [], unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [], scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [] },
        excluded: [],
        quality: { raw_unknown_count: 0, raw_unknown_ratio: 0, out_of_scope_count: 0, out_of_scope_ratio: 0, actionable_count: 0, actionable_ratio: 0, intrinsic_count: 0, intrinsic_ratio: 0, unknown_bucket_file_count: 0, undeclared_package_count: 0, taxonomy: { out_of_scope: { unsupported_files: [] }, actionable: { unmapped_sources: [], unmapped_tests: [], undeclared_packages: [], unresolved_aliases: [], unknown_packages: [], owner_patterns_unresolved: [] }, intrinsic: { dynamic_imports: [], skipped_large_files: [], scan_limit_exceeded: [] } } },
        meta: { observation_hash: "obs", partial_scan: false, file_count: filePaths.length, unknown_count: 0, excluded_count: 0 },
    };
}
describe("repairRelationGraphBuilder", () => {
    it("creates same-package edges with reason", () => {
        const report = userReport({
            suspected_files: [{ path: "src/sync/worker.ts", confidence: "high", reason: "Sync worker" }],
        });
        const suspectSurface = {
            files: [{ path: "src/sync/worker.ts", confidence: "high", reason: "Sync worker", evidence: ["explicit"] }],
            reason: "test",
        };
        const result = buildRepairRelationGraph({
            report,
            suspectSurface,
            observations: makeObservations(["src/sync/worker.ts", "src/sync/queue.ts", "src/utils/format.ts"]),
            pythonSidecar: null,
        });
        const samePkgEdges = result.edges.filter(e => e.relation === "same_package");
        expect(samePkgEdges.length).toBeGreaterThan(0);
        expect(samePkgEdges[0].reason).toContain("Same package");
        expect(samePkgEdges[0].confidence).toBe("medium");
    });
    it("creates test_mapping edges from failing test evidence", () => {
        const report = userReport({
            evidence: [{ kind: "failing_test", path: "tests/utils/format.test.ts" }],
        });
        const suspectSurface = {
            files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect", evidence: ["test"] }],
            reason: "test",
        };
        const result = buildRepairRelationGraph({
            report,
            suspectSurface,
            observations: makeObservations(["src/utils/format.ts", "tests/utils/format.test.ts"], [{ source_path: "src/utils/format.ts", test_path: "tests/utils/format.test.ts", mapping_kind: "same_basename", confidence: "high", evidence: [] }]),
            pythonSidecar: null,
        });
        const testEdges = result.edges.filter(e => e.relation === "test_mapping");
        expect(testEdges.length).toBeGreaterThan(0);
        expect(testEdges[0].from).toBe("tests/utils/format.test.ts");
        expect(testEdges[0].to).toBe("src/utils/format.ts");
    });
    it("creates self-referencing suspect edges", () => {
        const report = userReport({
            suspected_files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect" }],
        });
        const suspectSurface = {
            files: [{ path: "src/utils/format.ts", confidence: "high", reason: "Suspect", evidence: ["explicit"] }],
            reason: "test",
        };
        const result = buildRepairRelationGraph({
            report,
            suspectSurface,
            observations: makeObservations(["src/utils/format.ts"]),
            pythonSidecar: null,
        });
        const selfEdge = result.edges.find(e => e.from === e.to && e.to === "src/utils/format.ts");
        expect(selfEdge).toBeDefined();
        expect(selfEdge.relation).toBe("explicit_user_reference");
    });
});
//# sourceMappingURL=repairRelationGraphBuilder.test.js.map