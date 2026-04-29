/**
 * P28.1-A: Graph Truncation Summary Tests
 *
 * Validates that the graph builder produces truncation metadata
 * and that the REPAIR_RELATION_GRAPH_V1_LIMITATION constant is wired.
 *
 * ref: P28.1-A
 */
import { describe, it, expect } from "vitest";
import { buildRepairRelationGraph } from "../../src/repair/repairRelationGraphBuilder.js";
import { REPAIR_RELATION_GRAPH_V1_LIMITATION } from "../../src/repair/types.js";
function userReport(overrides) {
    return {
        schema_version: "user_bug_report@0.1.0",
        report_id: "r_trunc_test",
        reported_by: { operator_id: "user" },
        summary: "Test graph truncation",
        evidence: [],
        suspected_files: [],
        requested_action: "repair_analysis",
        must_preserve: [],
        ...overrides,
    };
}
function makeObservations(filePaths) {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: new Date().toISOString() },
        scanner: { scanner_version: "test", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
        limits: { max_file_bytes: 1000000, max_total_files: 10000, max_import_edges: 5000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: filePaths.map(p => ({ path: p, bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] })),
            path_buckets: [],
            import_edges: [],
            test_mappings: [],
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
// ---------------------------------------------------------------------------
// Graph build stats
// ---------------------------------------------------------------------------
describe("P28.1-A: Graph Truncation Summary", () => {
    it("returns stats with limitation constant", () => {
        const result = buildRepairRelationGraph({
            report: userReport({
                suspected_files: [{ path: "src/a.ts", confidence: "high", reason: "suspect" }],
            }),
            suspectSurface: {
                files: [{ path: "src/a.ts", confidence: "high", reason: "suspect", evidence: ["explicit"] }],
                reason: "test",
            },
            observations: makeObservations(["src/a.ts", "src/b.ts"]),
            pythonSidecar: null,
        });
        expect(result.stats).toBeDefined();
        expect(result.stats.limitation).toBe(REPAIR_RELATION_GRAPH_V1_LIMITATION);
        expect(result.stats.observed_files).toBe(2);
        expect(result.stats.edges_after_dedup).toBe(result.edges.length);
        expect(result.stats.duration_ms).toBeGreaterThanOrEqual(0);
    });
    it("same_package truncation recorded when >8 siblings", () => {
        // Create 15 files in the same directory
        const files = Array.from({ length: 15 }, (_, i) => `src/sync/file_${i.toString().padStart(2, "0")}.ts`);
        const suspect = "src/sync/file_00.ts";
        const result = buildRepairRelationGraph({
            report: userReport({
                suspected_files: [{ path: suspect, confidence: "high", reason: "suspect" }],
            }),
            suspectSurface: {
                files: [{ path: suspect, confidence: "high", reason: "suspect", evidence: ["explicit"] }],
                reason: "test",
            },
            observations: makeObservations(files),
            pythonSidecar: null,
        });
        // Should have same_package truncation
        const samePkgTruncation = result.stats.truncation_entries.filter(t => t.relation === "same_package");
        expect(samePkgTruncation.length).toBeGreaterThan(0);
        const entry = samePkgTruncation[0];
        expect(entry.truncated).toBe(true);
        expect(entry.total_matches).toBe(14); // 15 files - 1 suspect
        expect(entry.displayed_edges).toBeLessThanOrEqual(8);
        expect(entry.omitted_count).toBe(entry.total_matches - entry.displayed_edges);
    });
    it("no truncation entries when graph is small", () => {
        const result = buildRepairRelationGraph({
            report: userReport({
                suspected_files: [{ path: "src/a.ts", confidence: "high", reason: "suspect" }],
            }),
            suspectSurface: {
                files: [{ path: "src/a.ts", confidence: "high", reason: "suspect", evidence: ["explicit"] }],
                reason: "test",
            },
            observations: makeObservations(["src/a.ts", "src/b.ts"]),
            pythonSidecar: null,
        });
        // Only 2 files in same dir; 1 suspect + 1 sibling = no truncation
        const samePkgTruncation = result.stats.truncation_entries.filter(t => t.relation === "same_package");
        expect(samePkgTruncation.length).toBe(0);
    });
    it("edges_generated >= edges_after_dedup", () => {
        const result = buildRepairRelationGraph({
            report: userReport({
                suspected_files: [{ path: "src/a.ts", confidence: "high", reason: "suspect" }],
            }),
            suspectSurface: {
                files: [{ path: "src/a.ts", confidence: "high", reason: "suspect", evidence: ["explicit"] }],
                reason: "test",
            },
            observations: makeObservations(["src/a.ts"]),
            pythonSidecar: null,
        });
        expect(result.stats.edges_generated).toBeGreaterThanOrEqual(result.stats.edges_after_dedup);
    });
});
// ---------------------------------------------------------------------------
// REPAIR_RELATION_GRAPH_V1_LIMITATION constant
// ---------------------------------------------------------------------------
describe("P28.1-A: REPAIR_RELATION_GRAPH_V1_LIMITATION", () => {
    it("constant exists and is non-empty", () => {
        expect(REPAIR_RELATION_GRAPH_V1_LIMITATION.length).toBeGreaterThan(0);
    });
    it("constant describes the graph as a candidate graph", () => {
        expect(REPAIR_RELATION_GRAPH_V1_LIMITATION).toContain("candidate graph");
        expect(REPAIR_RELATION_GRAPH_V1_LIMITATION).toContain("not a complete dependency graph");
    });
});
//# sourceMappingURL=graphTruncation.test.js.map