import { describe, it, expect } from "vitest";
import { computeObservationQuality, generateObservationRecommendations } from "../../src/repoObservation/observationQuality.js";
function makeObs(overrides) {
    const base = {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: "" },
        scanner: { scanner_version: "0.2.0", mode: "deterministic", language_targets: ["typescript", "javascript"], llm_used: false },
        limits: { max_file_bytes: 524288, max_total_files: 10000, max_import_edges: 50000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: [
                { path: "src/a.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] },
                { path: "lib/b.kt", bucket: "unknown", language: "other", size_bytes: 200, analysis_status: "unsupported_language", evidence: [] },
            ],
            path_buckets: [
                { bucket: "src", paths: ["src/a.ts"], count: 1 },
                { bucket: "unknown", paths: ["lib/b.kt"], count: 1 },
            ],
            import_edges: [
                { from_file: "src/a.ts", raw_specifier: "express", import_kind: "static", resolution_status: "declared_package", evidence: [] },
                { from_file: "src/a.ts", raw_specifier: "missing-pkg", import_kind: "static", resolution_status: "undeclared_package", evidence: [] },
                { from_file: "src/a.ts", raw_specifier: "node:fs", import_kind: "static", resolution_status: "builtin_node_package", evidence: [] },
            ],
            test_mappings: [],
            sensitive_paths: [],
            owner_hints: [],
            config_hints: [],
            package_manifests: [],
            ...overrides?.observations,
        },
        unknowns: {
            skipped_large_files: [],
            unsupported_files: ["lib/b.kt"],
            dynamic_imports: ["src/a.ts:dynamic_expr"],
            unresolved_imports: [],
            unmapped_sources: ["src/a.ts"],
            unmapped_tests: ["test/orphan.test.ts"],
            ambiguous_test_mappings: [],
            scan_limit_exceeded: [],
            owner_patterns_unresolved: [],
            changed_files_not_observed: [],
            ...overrides?.unknowns,
        },
        excluded: [],
        quality: null, // will be computed
        meta: {
            observation_hash: "sha256:test",
            partial_scan: false,
            file_count: 2,
            unknown_count: 4,
            excluded_count: 0,
            ...overrides?.meta,
        },
    };
    return base;
}
describe("computeObservationQuality", () => {
    it("classifies unsupported files as out_of_scope", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.out_of_scope.unsupported_files).toEqual(["lib/b.kt"]);
        expect(q.out_of_scope_count).toBe(1);
    });
    it("classifies unmapped sources as actionable", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.actionable.unmapped_sources).toEqual(["src/a.ts"]);
    });
    it("classifies unmapped tests as actionable", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.actionable.unmapped_tests).toEqual(["test/orphan.test.ts"]);
    });
    it("classifies undeclared packages as actionable", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.actionable.undeclared_packages).toContain("src/a.ts:missing-pkg");
        expect(q.undeclared_package_count).toBe(1);
    });
    it("classifies dynamic imports as intrinsic", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.intrinsic.dynamic_imports).toEqual(["src/a.ts:dynamic_expr"]);
        expect(q.intrinsic_count).toBe(1);
    });
    it("classifies skipped large files as intrinsic", () => {
        const obs = makeObs({ unknowns: { ...makeObs().unknowns, skipped_large_files: ["big.bin"] } });
        const q = computeObservationQuality(obs);
        expect(q.taxonomy.intrinsic.skipped_large_files).toEqual(["big.bin"]);
    });
    it("computes raw_unknown_ratio", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.raw_unknown_count).toBe(4);
        expect(q.raw_unknown_ratio).toBe(4 / 2); // 4 unknowns / 2 files
    });
    it("counts unknown_bucket_file_count", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        expect(q.unknown_bucket_file_count).toBe(1);
    });
    it("computes actionable_ratio", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        // actionable = unmapped_sources(1) + unmapped_tests(1) + undeclared_packages(1) = 3
        expect(q.actionable_count).toBe(3);
        expect(q.actionable_ratio).toBe(3 / 2);
    });
});
describe("generateObservationRecommendations", () => {
    it("recommends test_mapping_overrides for unmapped sources", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        const recs = generateObservationRecommendations({ quality: q });
        expect(recs.some(r => r.includes("test_mapping_overrides"))).toBe(true);
    });
    it("recommends adding dependencies for undeclared packages", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        const recs = generateObservationRecommendations({ quality: q });
        expect(recs.some(r => r.includes("undeclared package"))).toBe(true);
    });
    it("recommends path_roles for unknown bucket files", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        const recs = generateObservationRecommendations({ quality: q });
        expect(recs.some(r => r.includes("path_roles"))).toBe(true);
    });
    it("recommends reviewing dynamic imports", () => {
        const obs = makeObs();
        const q = computeObservationQuality(obs);
        const recs = generateObservationRecommendations({ quality: q });
        expect(recs.some(r => r.includes("dynamic import"))).toBe(true);
    });
    it("returns empty for clean observations", () => {
        const obs = makeObs({
            observations: {
                files: [{ path: "src/a.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] }],
                path_buckets: [{ bucket: "src", paths: ["src/a.ts"], count: 1 }],
                import_edges: [],
                test_mappings: [],
                sensitive_paths: [],
                owner_hints: [],
                config_hints: [],
                package_manifests: [],
            },
            unknowns: {
                skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [],
                unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [],
                scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [],
            },
            meta: { observation_hash: "sha256:test", partial_scan: false, file_count: 1, unknown_count: 0, excluded_count: 0 },
        });
        const q = computeObservationQuality(obs);
        const recs = generateObservationRecommendations({ quality: q });
        expect(recs).toHaveLength(0);
    });
});
//# sourceMappingURL=observationQuality.test.js.map