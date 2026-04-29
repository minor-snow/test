import { describe, it, expect } from "vitest";
import { computeObservationHash } from "../../src/repoObservation/observationHasher.js";
function makeMinimalObservations(overrides) {
    const base = {
        schema_version: "repo_observations.v1",
        repo: {
            repo_root_label: "test-repo",
            repo_state: "git_clean",
            head_commit_hash: "abc123",
            has_uncommitted_changes: false,
            uncommitted_file_count: 0,
            scanned_at: "2026-01-01T00:00:00Z",
        },
        scanner: {
            scanner_version: "0.1.0",
            mode: "deterministic",
            language_targets: ["typescript", "javascript"],
            llm_used: false,
        },
        limits: {
            max_file_bytes: 524288,
            max_total_files: 10000,
            max_import_edges: 50000,
            scan_timeout_ms: 60000,
            excluded_dirs: ["node_modules", "dist"],
        },
        observations: {
            files: [
                { path: "src/foo.ts", bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [{ type: "path", source_path: "src/foo.ts", value: "src/" }] },
            ],
            path_buckets: [{ bucket: "src", paths: ["src/foo.ts"], count: 1 }],
            import_edges: [],
            test_mappings: [],
            sensitive_paths: [],
            owner_hints: [],
            config_hints: [],
            package_manifests: [],
        },
        unknowns: {
            skipped_large_files: [],
            unsupported_files: [],
            dynamic_imports: [],
            unresolved_imports: [],
            unmapped_sources: [],
            unmapped_tests: [],
            ambiguous_test_mappings: [],
            scan_limit_exceeded: [],
            owner_patterns_unresolved: [],
            changed_files_not_observed: [],
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
        meta: {
            observation_hash: "",
            partial_scan: false,
            file_count: 1,
            unknown_count: 0,
            excluded_count: 0,
        },
    };
    return { ...base, ...overrides };
}
describe("computeObservationHash", () => {
    it("produces a sha256-prefixed hash", () => {
        const obs = makeMinimalObservations();
        const hash = computeObservationHash(obs);
        expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
    it("same data → same hash (deterministic)", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations();
        expect(computeObservationHash(obs1)).toBe(computeObservationHash(obs2));
    });
    it("same data with different array order → same hash", () => {
        const obs1 = makeMinimalObservations({
            observations: {
                ...makeMinimalObservations().observations,
                files: [
                    { path: "src/a.ts", bucket: "src", language: "typescript", size_bytes: 50, analysis_status: "analyzed", evidence: [] },
                    { path: "src/b.ts", bucket: "src", language: "typescript", size_bytes: 60, analysis_status: "analyzed", evidence: [] },
                ],
            },
        });
        const obs2 = makeMinimalObservations({
            observations: {
                ...makeMinimalObservations().observations,
                files: [
                    { path: "src/b.ts", bucket: "src", language: "typescript", size_bytes: 60, analysis_status: "analyzed", evidence: [] },
                    { path: "src/a.ts", bucket: "src", language: "typescript", size_bytes: 50, analysis_status: "analyzed", evidence: [] },
                ],
            },
        });
        expect(computeObservationHash(obs1)).toBe(computeObservationHash(obs2));
    });
    it("different scanned_at → same hash (excluded)", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            repo: { ...obs1.repo, scanned_at: "2099-12-31T23:59:59Z" },
        });
        expect(computeObservationHash(obs1)).toBe(computeObservationHash(obs2));
    });
    it("different repo_root_label → same hash (excluded)", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            repo: { ...obs1.repo, repo_root_label: "completely-different-label" },
        });
        expect(computeObservationHash(obs1)).toBe(computeObservationHash(obs2));
    });
    it("different observation_hash → same hash (excluded)", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            meta: { ...obs1.meta, observation_hash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" },
        });
        expect(computeObservationHash(obs1)).toBe(computeObservationHash(obs2));
    });
    it("changed import edge → different hash", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            observations: {
                ...obs1.observations,
                import_edges: [{ from_file: "src/a.ts", raw_specifier: "./b", import_kind: "static", resolution_status: "literal_extracted", evidence: [] }],
            },
        });
        expect(computeObservationHash(obs1)).not.toBe(computeObservationHash(obs2));
    });
    it("changed unknowns → different hash", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            unknowns: { ...obs1.unknowns, dynamic_imports: ["src/dynamic.ts"] },
        });
        expect(computeObservationHash(obs1)).not.toBe(computeObservationHash(obs2));
    });
    it("changed limits → different hash", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            limits: { ...obs1.limits, max_file_bytes: 999 },
        });
        expect(computeObservationHash(obs1)).not.toBe(computeObservationHash(obs2));
    });
    it("same observations but partial_scan differs → different hash", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            meta: { ...obs1.meta, partial_scan: true },
        });
        expect(computeObservationHash(obs1)).not.toBe(computeObservationHash(obs2));
    });
    it("changed head_commit_hash → different hash", () => {
        const obs1 = makeMinimalObservations();
        const obs2 = makeMinimalObservations({
            repo: { ...obs1.repo, head_commit_hash: "def456" },
        });
        expect(computeObservationHash(obs1)).not.toBe(computeObservationHash(obs2));
    });
});
//# sourceMappingURL=observationHasher.test.js.map