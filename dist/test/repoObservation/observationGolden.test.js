import { describe, it, expect } from "vitest";
import { buildGoldenObservationSnapshot, compareObservationGolden, DEFAULT_GOLDEN_THRESHOLDS, } from "../../src/repoObservation/observationGolden.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeObs(overrides) {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: "" },
        scanner: { scanner_version: "0.2.0", mode: "deterministic", language_targets: ["typescript", "javascript"], llm_used: false },
        limits: { max_file_bytes: 524288, max_total_files: 10000, max_import_edges: 50000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: [
                { path: "src/a.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] },
                { path: "src/b.ts", bucket: "src", language: "typescript", size_bytes: 200, analysis_status: "analyzed", evidence: [] },
            ],
            path_buckets: [{ bucket: "src", paths: ["src/a.ts", "src/b.ts"], count: 2 }],
            import_edges: [
                { from_file: "src/a.ts", raw_specifier: "node:fs", import_kind: "static", resolution_status: "builtin_node_package", evidence: [] },
                { from_file: "src/a.ts", raw_specifier: "express", import_kind: "static", resolution_status: "declared_package", evidence: [] },
            ],
            test_mappings: [],
            sensitive_paths: [],
            owner_hints: [],
            config_hints: [],
            package_manifests: [{ package_json_path: "package.json", dependencies: ["express"], dev_dependencies: [], peer_dependencies: [], optional_dependencies: [], evidence: [] }],
            ...overrides?.observations,
        },
        unknowns: {
            skipped_large_files: [], unsupported_files: [], dynamic_imports: [], unresolved_imports: [],
            unmapped_sources: [], unmapped_tests: [], ambiguous_test_mappings: [],
            scan_limit_exceeded: [], owner_patterns_unresolved: [], changed_files_not_observed: [],
            ...overrides?.unknowns,
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
            ...overrides?.quality,
        },
        meta: {
            observation_hash: "sha256:test123", partial_scan: false,
            file_count: 2, unknown_count: 0, excluded_count: 0,
            ...overrides?.meta,
        },
    };
}
function makeSnapshot(obs) {
    return buildGoldenObservationSnapshot({
        observations: obs ?? makeObs(),
        target: "test-target",
        configLoadedFrom: null,
    });
}
// ---------------------------------------------------------------------------
// buildGoldenObservationSnapshot
// ---------------------------------------------------------------------------
describe("buildGoldenObservationSnapshot", () => {
    it("produces correct schema_version", () => {
        const s = makeSnapshot();
        expect(s.schema_version).toBe("golden_observation_snapshot.v1");
    });
    it("includes target", () => {
        const s = makeSnapshot();
        expect(s.target).toBe("test-target");
    });
    it("records scanner version and config source", () => {
        const s = buildGoldenObservationSnapshot({
            observations: makeObs(),
            target: "x",
            configLoadedFrom: "pantheon.json",
        });
        expect(s.scanner.scanner_version).toBe("0.2.0");
        expect(s.scanner.config_loaded_from).toBe("pantheon.json");
    });
    it("computes bucket_counts from path_buckets", () => {
        const s = makeSnapshot();
        expect(s.snapshot.bucket_counts["src"]).toBe(2);
    });
    it("computes import_resolution_counts", () => {
        const s = makeSnapshot();
        expect(s.snapshot.import_resolution_counts["builtin_node_package"]).toBe(1);
        expect(s.snapshot.import_resolution_counts["declared_package"]).toBe(1);
    });
    it("includes quality metrics", () => {
        const s = makeSnapshot();
        expect(s.snapshot.quality.raw_unknown_count).toBe(0);
        expect(s.snapshot.quality.unknown_bucket_file_count).toBe(0);
    });
    it("includes unknown taxonomy counts", () => {
        const s = makeSnapshot();
        expect(s.snapshot.unknown_taxonomy_counts.out_of_scope).toBe(0);
        expect(s.snapshot.unknown_taxonomy_counts.actionable).toBe(0);
        expect(s.snapshot.unknown_taxonomy_counts.intrinsic).toBe(0);
    });
    it("includes package_manifest_count", () => {
        const s = makeSnapshot();
        expect(s.snapshot.package_manifest_count).toBe(1);
    });
    it("uses default thresholds when not provided", () => {
        const s = makeSnapshot();
        expect(s.thresholds).toEqual(DEFAULT_GOLDEN_THRESHOLDS);
    });
    it("uses custom thresholds when provided", () => {
        const custom = {
            fail: { absolute_paths_max: 0, unknown_bucket_files_max: 20, observation_must_validate: true },
            warn: { actionable_unknown_ratio_max_delta_pp: 10, unresolved_imports_max_delta: 20 },
        };
        const s = buildGoldenObservationSnapshot({
            observations: makeObs(),
            target: "x",
            configLoadedFrom: null,
            thresholds: custom,
        });
        expect(s.thresholds.fail.unknown_bucket_files_max).toBe(20);
    });
    it("does NOT include full file list", () => {
        const s = makeSnapshot();
        // Snapshot should not have a files array
        expect(s.files).toBeUndefined();
        expect(s.snapshot.files).toBeUndefined();
    });
});
// ---------------------------------------------------------------------------
// compareObservationGolden
// ---------------------------------------------------------------------------
describe("compareObservationGolden", () => {
    it("same snapshot → pass", () => {
        const golden = makeSnapshot();
        const current = makeSnapshot();
        const result = compareObservationGolden({ golden, current });
        expect(result.status).toBe("pass");
        expect(result.fail_reasons).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });
    it("absolute paths emitted → fail", () => {
        const obs = makeObs({
            observations: {
                ...makeObs().observations,
                files: [
                    { path: "C:/absolute/path.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] },
                ],
            },
        });
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current, currentObservations: obs });
        expect(result.status).toBe("fail");
        expect(result.fail_reasons.some(r => r.includes("Absolute paths"))).toBe(true);
    });
    it("unknown_bucket_files over max → fail", () => {
        const obs = makeObs({
            quality: {
                ...makeObs().quality,
                unknown_bucket_file_count: 15,
            },
        });
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.status).toBe("fail");
        expect(result.fail_reasons.some(r => r.includes("Unknown bucket files"))).toBe(true);
    });
    it("observation validation failure → fail", () => {
        const obs = makeObs();
        // Create invalid observations (empty schema_version)
        const invalidObs = { ...obs, schema_version: "wrong" };
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current, currentObservations: invalidObs });
        expect(result.status).toBe("fail");
        expect(result.fail_reasons.some(r => r.includes("validation failed"))).toBe(true);
    });
    it("actionable unknown ratio drift → warning", () => {
        const obs = makeObs({
            quality: {
                ...makeObs().quality,
                actionable_ratio: 0.10, // 10% — big jump from 0%
            },
        });
        const golden = makeSnapshot(); // 0% actionable
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.status).toBe("pass_with_warnings");
        expect(result.warnings.some(w => w.includes("Actionable unknown ratio"))).toBe(true);
    });
    it("small actionable ratio drift within threshold → pass", () => {
        const obs = makeObs({
            quality: {
                ...makeObs().quality,
                actionable_ratio: 0.02, // 2% — within 5pp threshold
            },
        });
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.status).toBe("pass");
    });
    it("observation_hash change is diagnostic only, not fail", () => {
        const obs = makeObs({ meta: { ...makeObs().meta, observation_hash: "sha256:different" } });
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        // Hash changed but should not cause fail or warning
        expect(result.status).toBe("pass");
        expect(result.diffs.observation_hash_changed).toBe(true);
    });
    it("computes file_count_delta", () => {
        const obs = makeObs({ meta: { ...makeObs().meta, file_count: 5 } });
        const golden = makeSnapshot(); // file_count = 2
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.diffs.file_count_delta).toBe(3);
    });
    it("computes bucket_count_deltas for new bucket", () => {
        const obs = makeObs({
            observations: {
                ...makeObs().observations,
                path_buckets: [
                    { bucket: "src", paths: ["src/a.ts"], count: 1 },
                    { bucket: "test", paths: ["test/a.test.ts"], count: 3 },
                ],
            },
        });
        const golden = makeSnapshot(); // only src=2
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.diffs.bucket_count_deltas["src"]).toBe(-1); // 1 - 2
        expect(result.diffs.bucket_count_deltas["test"]).toBe(3); // new
    });
    it("computes unknown_taxonomy_count_deltas", () => {
        const obs = makeObs({
            quality: {
                ...makeObs().quality,
                out_of_scope_count: 5,
                actionable_count: 3,
                intrinsic_count: 1,
            },
        });
        const golden = makeSnapshot();
        const current = makeSnapshot(obs);
        const result = compareObservationGolden({ golden, current });
        expect(result.diffs.unknown_taxonomy_count_deltas.out_of_scope).toBe(5);
        expect(result.diffs.unknown_taxonomy_count_deltas.actionable).toBe(3);
        expect(result.diffs.unknown_taxonomy_count_deltas.intrinsic).toBe(1);
    });
});
//# sourceMappingURL=observationGolden.test.js.map