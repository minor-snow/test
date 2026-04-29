import { describe, expect, it } from "vitest";
import { buildConsistencyChecklist } from "../../src/repair/consistencyChecklistBuilder.js";
function makeObservations() {
    return {
        schema_version: "repo_observations.v1",
        repo: { repo_root_label: "test", repo_state: "git_clean", head_commit_hash: "abc", has_uncommitted_changes: false, uncommitted_file_count: 0, scanned_at: new Date().toISOString() },
        scanner: { scanner_version: "test", mode: "deterministic", language_targets: ["typescript"], llm_used: false },
        limits: { max_file_bytes: 1000000, max_total_files: 10000, max_import_edges: 5000, scan_timeout_ms: 60000, excluded_dirs: [] },
        observations: {
            files: [],
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
        meta: { observation_hash: "obs", partial_scan: false, file_count: 0, unknown_count: 0, excluded_count: 0 },
    };
}
function sdkSidecar() {
    return {
        schema_version: "python_observations.v1",
        repo: { root_label: "test", observed_file_count: 0, python_file_count: 0 },
        layout: null,
        framework_profile: null,
        files: [],
        import_observations: [],
        dependency_manifests: [],
        test_mappings: [],
        sensitive_zones: [],
        unknowns: [],
        quality: { python_file_count: 0, classified_count: 0, classified_ratio: 0, unknown_count: 0, unknown_ratio: 0, import_observation_count: 0, project_import_count: 0, declared_package_count: 0, undeclared_package_count: 0, dynamic_import_count: 0, test_mapping_count: 0, high_confidence_test_count: 0, medium_confidence_test_count: 0, sensitive_zone_count: 0, sensitive_file_count: 0, manifest_count: 0, low_confidence_manifest_count: 0 },
        limitations: [],
        risk_preset_validation: {
            preset: "python_sdk_library",
            validation: "validated",
            confidence: "high",
            matched_signals: [],
            suggested_review: [],
            suggested_forbidden: [],
            dormant_patterns: [],
        },
    };
}
function commerceSidecar() {
    return {
        schema_version: "python_observations.v1",
        repo: { root_label: "test", observed_file_count: 0, python_file_count: 0 },
        layout: null,
        framework_profile: null,
        files: [],
        import_observations: [],
        dependency_manifests: [],
        test_mappings: [],
        sensitive_zones: [],
        unknowns: [],
        quality: { python_file_count: 0, classified_count: 0, classified_ratio: 0, unknown_count: 0, unknown_ratio: 0, import_observation_count: 0, project_import_count: 0, declared_package_count: 0, undeclared_package_count: 0, dynamic_import_count: 0, test_mapping_count: 0, high_confidence_test_count: 0, medium_confidence_test_count: 0, sensitive_zone_count: 0, sensitive_file_count: 0, manifest_count: 0, low_confidence_manifest_count: 0 },
        limitations: [],
        risk_preset_validation: {
            preset: "django_commerce",
            validation: "validated",
            confidence: "high",
            matched_signals: [],
            suggested_review: [],
            suggested_forbidden: [],
            dormant_patterns: [],
        },
    };
}
describe("consistencyChecklistBuilder", () => {
    it("includes public API export review for SDK/library projects", () => {
        const impactSurface = {
            evidence_level: "bootstrap_conservative",
            direct_files: [],
            related_files: [],
            related_tests: [],
            risk_areas: [],
            unknowns: [],
        };
        const testSignals = { related: [], recommended: [], missing_mapping: [] };
        const result = buildConsistencyChecklist({
            observations: makeObservations(),
            pythonSidecar: sdkSidecar(),
            impactSurface,
            testSignals,
            userMustPreserve: [],
        });
        expect(result.some(c => c.statement.includes("public API"))).toBe(true);
        expect(result.some(c => c.source === "project_role")).toBe(true);
    });
    it("includes payment/migration warnings for Django commerce projects", () => {
        const impactSurface = {
            evidence_level: "bootstrap_conservative",
            direct_files: [],
            related_files: [],
            related_tests: [],
            risk_areas: [],
            unknowns: [],
        };
        const testSignals = { related: [], recommended: [], missing_mapping: [] };
        const result = buildConsistencyChecklist({
            observations: makeObservations(),
            pythonSidecar: commerceSidecar(),
            impactSurface,
            testSignals,
            userMustPreserve: [],
        });
        expect(result.some(c => c.statement.includes("payment") || c.statement.includes("order") || c.statement.includes("tax"))).toBe(true);
        expect(result.some(c => c.statement.includes("migration"))).toBe(true);
    });
    it("includes user must_preserve as hard constraints", () => {
        const impactSurface = {
            evidence_level: "bootstrap_conservative",
            direct_files: [],
            related_files: [],
            related_tests: [],
            risk_areas: [],
            unknowns: [],
        };
        const testSignals = { related: [], recommended: [], missing_mapping: [] };
        const result = buildConsistencyChecklist({
            observations: makeObservations(),
            pythonSidecar: null,
            impactSurface,
            testSignals,
            userMustPreserve: ["Do not change auth behavior."],
        });
        const userCheck = result.find(c => c.statement === "Do not change auth behavior.");
        expect(userCheck).toBeDefined();
        expect(userCheck.severity).toBe("hard");
        expect(userCheck.source).toBe("user_must_preserve");
    });
    it("includes unknown surface warning when unknowns exist", () => {
        const impactSurface = {
            evidence_level: "bootstrap_conservative",
            direct_files: [],
            related_files: [],
            related_tests: [],
            risk_areas: [],
            unknowns: [{ kind: "unknown_related_surface", note: "No related files found", evidence: ["test"] }],
        };
        const testSignals = { related: [], recommended: [], missing_mapping: [] };
        const result = buildConsistencyChecklist({
            observations: makeObservations(),
            pythonSidecar: null,
            impactSurface,
            testSignals,
            userMustPreserve: [],
        });
        expect(result.some(c => c.source === "unknown_surface")).toBe(true);
    });
    it("provides generic advisory for projects without a recognized profile", () => {
        const impactSurface = {
            evidence_level: "bootstrap_conservative",
            direct_files: [],
            related_files: [],
            related_tests: [],
            risk_areas: [],
            unknowns: [],
        };
        const testSignals = { related: [], recommended: [], missing_mapping: [] };
        const result = buildConsistencyChecklist({
            observations: makeObservations(),
            pythonSidecar: null,
            impactSurface,
            testSignals,
            userMustPreserve: [],
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result.every(c => c.evidence.length >= 0)).toBe(true);
    });
});
//# sourceMappingURL=consistencyChecklistBuilder.test.js.map