/**
 * P20a: Deterministic Repo Observations — Domain Types
 *
 * Core invariants:
 *   - All paths are repo-relative POSIX (no absolute, no escaping ..)
 *   - observation_hash is deterministic: same repo state → same hash
 *   - scanner.llm_used is always false in P20a
 *   - RepoObservations is an observed index, NOT canonical architecture truth
 */
export type RepoObservations = {
    readonly schema_version: "repo_observations.v1";
    readonly repo: RepoObservationRepoMeta;
    readonly scanner: RepoScannerMeta;
    readonly limits: RepoScanLimits;
    readonly observations: {
        readonly files: ObservedFile[];
        readonly path_buckets: PathBucket[];
        readonly import_edges: ImportEdge[];
        readonly test_mappings: TestMapping[];
        readonly sensitive_paths: SensitivePath[];
        readonly owner_hints: OwnerHint[];
        readonly config_hints: ConfigHint[];
        readonly package_manifests: PackageManifestObservation[];
    };
    readonly unknowns: RepoUnknowns;
    readonly excluded: ExcludedPath[];
    readonly quality: RepoObservationQuality;
    readonly meta: {
        readonly observation_hash: string;
        readonly partial_scan: boolean;
        readonly file_count: number;
        readonly unknown_count: number;
        readonly excluded_count: number;
    };
};
export type RepoState = "git_clean" | "git_dirty" | "working_tree_only";
export type RepoObservationRepoMeta = {
    readonly repo_root_label: string;
    readonly repo_state: RepoState;
    readonly head_commit_hash: string | null;
    readonly has_uncommitted_changes: boolean | null;
    readonly uncommitted_file_count: number | null;
    readonly scanned_at: string;
};
export type RepoScannerMeta = {
    readonly scanner_version: string;
    readonly mode: "deterministic";
    readonly language_targets: ReadonlyArray<"typescript" | "javascript">;
    readonly llm_used: false;
};
export type RepoScanLimits = {
    readonly max_file_bytes: number;
    readonly max_total_files: number;
    readonly max_import_edges: number;
    readonly scan_timeout_ms: number;
    readonly excluded_dirs: readonly string[];
};
export declare const DEFAULT_EXCLUDED_DIRS: readonly string[];
export declare const DEFAULT_SCAN_LIMITS: RepoScanLimits;
export type FileBucket = "src" | "test" | "config" | "generated" | "docs" | "script" | "asset" | "unknown";
export type FileLanguage = "typescript" | "javascript" | "json" | "markdown" | "yaml" | "other";
export type FileAnalysisStatus = "analyzed" | "skipped_large_file" | "unsupported_language" | "excluded" | "unknown";
export type ObservedFile = {
    readonly path: string;
    readonly bucket: FileBucket;
    readonly language: FileLanguage;
    readonly size_bytes: number;
    readonly analysis_status: FileAnalysisStatus;
    readonly evidence: Evidence[];
};
export type PathBucket = {
    readonly bucket: FileBucket;
    readonly paths: readonly string[];
    readonly count: number;
};
export type ImportKind = "static" | "dynamic" | "require" | "export_from";
export type ImportResolutionStatus = "literal_extracted" | "resolved_relative" | "builtin_node_package" | "declared_package" | "undeclared_package" | "unknown_package" | "unresolved_alias" | "unresolved_package" | "dynamic_unknown" | "unsupported";
export type ImportEdge = {
    readonly from_file: string;
    readonly raw_specifier: string;
    readonly import_kind: ImportKind;
    readonly target_hint?: string;
    readonly resolution_status: ImportResolutionStatus;
    readonly evidence: Evidence[];
};
export type TestMappingKind = "same_basename" | "parallel_test_dir" | "suffix_spec" | "suffix_test" | "config_override" | "unknown";
export type TestMappingConfidence = "high" | "medium" | "low";
export type TestMapping = {
    readonly source_path: string;
    readonly test_path: string;
    readonly mapping_kind: TestMappingKind;
    readonly confidence: TestMappingConfidence;
    readonly evidence: Evidence[];
};
export type SensitiveReason = "auth_keyword" | "payment_keyword" | "admin_keyword" | "secret_keyword" | "infra_keyword" | "migration_keyword" | "config_keyword";
export type SensitivePath = {
    readonly path: string;
    readonly reason: SensitiveReason;
    readonly review_required: boolean;
    readonly evidence: Evidence[];
};
export type OwnerMatchStatus = "simple_pattern" | "unresolved_complex_pattern";
export type OwnerHint = {
    readonly path_pattern: string;
    readonly owners: readonly string[];
    readonly source: "CODEOWNERS" | "CODEOWNERS:.github" | "CODEOWNERS:docs" | "pantheon.yml";
    readonly match_status: OwnerMatchStatus;
    readonly evidence: Evidence[];
};
export type ConfigKind = "package_json" | "tsconfig" | "vitest" | "jest" | "eslint" | "github_actions" | "unknown_config";
export type ConfigDetectedField = {
    readonly field_name: string;
    readonly field_value_preview: string;
};
export type ConfigHint = {
    readonly config_path: string;
    readonly kind: ConfigKind;
    readonly detected_fields: readonly ConfigDetectedField[];
    readonly evidence: Evidence[];
};
export type RepoUnknowns = {
    readonly skipped_large_files: readonly string[];
    readonly unsupported_files: readonly string[];
    readonly dynamic_imports: readonly string[];
    readonly unresolved_imports: readonly string[];
    readonly unmapped_sources: readonly string[];
    readonly unmapped_tests: readonly string[];
    readonly ambiguous_test_mappings: readonly string[];
    readonly scan_limit_exceeded: readonly string[];
    readonly owner_patterns_unresolved: readonly string[];
    readonly changed_files_not_observed: readonly string[];
};
export type ExclusionReason = "excluded_dir" | "max_file_limit" | "scanner_timeout" | "unsupported_binary";
export type ExcludedPath = {
    readonly path: string;
    readonly reason: ExclusionReason;
    readonly evidence: Evidence[];
};
export type EvidenceType = "path" | "file_extension" | "import_literal" | "test_convention" | "keyword" | "codeowners" | "config" | "scanner_limit" | "git_status" | "changed_file_status";
export type Evidence = {
    readonly type: EvidenceType;
    readonly source_path: string;
    readonly value: string;
};
export type PackageManifestObservation = {
    readonly package_json_path: string;
    readonly package_name?: string;
    readonly dependencies: readonly string[];
    readonly dev_dependencies: readonly string[];
    readonly peer_dependencies: readonly string[];
    readonly optional_dependencies: readonly string[];
    readonly evidence: Evidence[];
};
export type UnknownTaxonomyCategory = "out_of_scope" | "actionable" | "intrinsic";
export type UnknownTaxonomy = {
    readonly out_of_scope: {
        readonly unsupported_files: readonly string[];
    };
    readonly actionable: {
        readonly unmapped_sources: readonly string[];
        readonly unmapped_tests: readonly string[];
        readonly undeclared_packages: readonly string[];
        readonly unresolved_aliases: readonly string[];
        readonly unknown_packages: readonly string[];
        readonly owner_patterns_unresolved: readonly string[];
    };
    readonly intrinsic: {
        readonly dynamic_imports: readonly string[];
        readonly skipped_large_files: readonly string[];
        readonly scan_limit_exceeded: readonly string[];
    };
};
export type RepoObservationQuality = {
    readonly raw_unknown_count: number;
    readonly raw_unknown_ratio: number;
    readonly out_of_scope_count: number;
    readonly out_of_scope_ratio: number;
    readonly actionable_count: number;
    readonly actionable_ratio: number;
    readonly intrinsic_count: number;
    readonly intrinsic_ratio: number;
    readonly unknown_bucket_file_count: number;
    readonly undeclared_package_count: number;
    readonly taxonomy: UnknownTaxonomy;
};
export type RepoObservationConfig = {
    readonly limits?: Partial<RepoScanLimits>;
    readonly excluded_dirs?: readonly string[];
    readonly path_roles?: Readonly<Record<string, FileBucket>>;
    readonly test_mapping_overrides?: Readonly<Record<string, readonly string[]>>;
};
export type RepoObservationValidationResult = {
    readonly status: "valid" | "invalid";
    readonly errors: string[];
    readonly warnings: string[];
};
export type GoldenObservationSnapshot = {
    readonly schema_version: "golden_observation_snapshot.v1";
    readonly target: string;
    readonly generated_at: string;
    readonly scanner: {
        readonly scanner_version: string;
        readonly config_loaded_from: string | null;
    };
    readonly repo: {
        readonly repo_state: "git_clean" | "git_dirty" | "working_tree_only";
        readonly head_commit_hash: string | null;
        readonly has_uncommitted_changes: boolean | null;
    };
    readonly snapshot: {
        readonly observation_hash: string;
        readonly file_count: number;
        readonly bucket_counts: Readonly<Record<string, number>>;
        readonly import_edge_count: number;
        readonly import_resolution_counts: Readonly<Record<string, number>>;
        readonly test_mapping_count: number;
        readonly sensitive_path_count: number;
        readonly owner_hint_count: number;
        readonly package_manifest_count: number;
        readonly unknown_taxonomy_counts: {
            readonly out_of_scope: number;
            readonly actionable: number;
            readonly intrinsic: number;
        };
        readonly quality: {
            readonly raw_unknown_count: number;
            readonly raw_unknown_ratio: number;
            readonly out_of_scope_count: number;
            readonly out_of_scope_ratio: number;
            readonly actionable_count: number;
            readonly actionable_ratio: number;
            readonly intrinsic_count: number;
            readonly intrinsic_ratio: number;
            readonly unknown_bucket_file_count: number;
            readonly undeclared_package_count: number;
        };
    };
    readonly thresholds: ObservationGoldenThresholds;
};
export type ObservationGoldenThresholds = {
    readonly fail: {
        readonly absolute_paths_max: 0;
        readonly unknown_bucket_files_max: number;
        readonly observation_must_validate: true;
    };
    readonly warn: {
        readonly actionable_unknown_ratio_max_delta_pp: number;
        readonly unresolved_imports_max_delta: number;
    };
};
export type ObservationGoldenComparison = {
    readonly status: "pass" | "pass_with_warnings" | "fail";
    readonly fail_reasons: string[];
    readonly warnings: string[];
    readonly diffs: {
        readonly observation_hash_changed: boolean;
        readonly file_count_delta: number;
        readonly bucket_count_deltas: Readonly<Record<string, number>>;
        readonly import_resolution_count_deltas: Readonly<Record<string, number>>;
        readonly unknown_taxonomy_count_deltas: {
            readonly out_of_scope: number;
            readonly actionable: number;
            readonly intrinsic: number;
        };
        readonly quality_deltas: {
            readonly raw_unknown_ratio_delta_pp: number;
            readonly actionable_unknown_ratio_delta_pp: number;
            readonly out_of_scope_unknown_ratio_delta_pp: number;
            readonly intrinsic_unknown_ratio_delta_pp: number;
            readonly unresolved_imports_delta: number;
            readonly undeclared_packages_delta: number;
        };
    };
};
