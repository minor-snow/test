/**
 * P28c: TypeScript/JavaScript Observation Sidecar — Domain Types
 *
 * Sidecar types that live alongside RepoObservations.
 * Mirrors python/types.ts architecture.
 *
 * Core invariant: These are manifest/config/path-level observations,
 * not full TypeScript compiler API analysis. The distinction matters
 * because TS projects use diverse build pipelines (tsc, esbuild,
 * swc, babel) that defeat static-only analysis.
 */
export type TypeScriptObservationSidecar = {
    readonly schema_version: "typescript_observations.v1";
    readonly repo: {
        readonly root_label: string;
        readonly observed_file_count: number;
        readonly typescript_file_count: number;
        readonly javascript_file_count: number;
    };
    readonly layout: TypeScriptProjectLayout;
    readonly framework_profile: TypeScriptFrameworkProfile;
    readonly risk_preset_validation: TypeScriptRiskPresetValidation;
    readonly workspace: TypeScriptWorkspaceInfo | null;
    readonly files: readonly TypeScriptObservedFile[];
    readonly test_mappings: readonly TypeScriptTestMapping[];
    readonly sensitive_zones: readonly TypeScriptSensitiveZone[];
    readonly unknowns: readonly TypeScriptObservationUnknown[];
    readonly quality: TypeScriptObservationQuality;
    readonly limitations: readonly string[];
};
export type TypeScriptFileBucket = "source" | "test" | "config" | "generated" | "script" | "docs" | "asset" | "unsupported" | "unknown";
export type TypeScriptObservedFile = {
    readonly path: string;
    readonly bucket: TypeScriptFileBucket;
    readonly extension: string;
    readonly size_bytes: number;
    readonly evidence: readonly string[];
};
export type TypeScriptPrimaryLayout = "next_app" | "react_vite_app" | "node_service" | "nestjs_service" | "typescript_sdk" | "cli_tool" | "github_action" | "monorepo_workspace" | "fullstack_app" | "mixed" | "unknown";
export type TypeScriptPackageLayout = "src_layout" | "flat_source" | "multi_package" | "pages_app_layout" | "unknown";
export type TypeScriptLayoutSignal = {
    readonly signal: string;
    readonly weight: "strong" | "moderate" | "weak";
    readonly evidence: string;
};
export type TypeScriptLayoutUnknown = {
    readonly aspect: string;
    readonly reason: string;
};
export type TypeScriptProjectLayout = {
    readonly primary_layout: TypeScriptPrimaryLayout;
    readonly package_layout: TypeScriptPackageLayout;
    readonly confidence: "high" | "medium" | "low";
    readonly signals: readonly TypeScriptLayoutSignal[];
    readonly unknowns: readonly TypeScriptLayoutUnknown[];
    readonly bucket_summary: Readonly<Record<string, number>>;
};
export type TypeScriptEvidenceDimension = "dependency_manifest" | "layout_classification" | "path_pattern" | "import_pattern" | "config_file";
export type TypeScriptFrameworkKind = "meta_framework" | "ui_library" | "web_framework" | "api_framework" | "test_framework" | "cli_framework" | "build_tool" | "orm" | "state_management";
export type TypeScriptFrameworkSignal = {
    readonly name: string;
    readonly kind: TypeScriptFrameworkKind;
    readonly confidence: "high" | "medium" | "low";
    readonly evidence: readonly {
        readonly dimension: TypeScriptEvidenceDimension;
        readonly detail: string;
    }[];
};
export type TypeScriptProjectRoleSignal = {
    readonly role: string;
    readonly confidence: "high" | "medium" | "low";
    readonly evidence: readonly {
        readonly dimension: TypeScriptEvidenceDimension;
        readonly detail: string;
    }[];
};
export type TypeScriptFrameworkUnknown = {
    readonly kind: "unknown_framework_or_domain_role";
    readonly reason: string;
};
export type TypeScriptFrameworkProfile = {
    readonly framework_signals: readonly TypeScriptFrameworkSignal[];
    readonly project_role_signals: readonly TypeScriptProjectRoleSignal[];
    readonly unknowns: readonly TypeScriptFrameworkUnknown[];
};
export type TypeScriptRiskPresetValidation = {
    readonly preset: string;
    readonly validation: "validated" | "partial" | "unvalidated";
    readonly confidence: "high" | "medium" | "low";
    readonly matched_signals: readonly string[];
    readonly suggested_review: readonly TypeScriptRiskPresetSuggestion[];
    readonly suggested_forbidden: readonly TypeScriptRiskPresetSuggestion[];
    readonly dormant_patterns: readonly TypeScriptDormantPattern[];
};
export type TypeScriptRiskPresetSuggestion = {
    readonly pattern: string;
    readonly reason: string;
    readonly severity: "critical" | "high" | "medium";
    readonly matched_path_count: number;
    readonly evidence: readonly string[];
};
export type TypeScriptDormantPattern = {
    readonly pattern: string;
    readonly reason: string;
};
export type TypeScriptWorkspaceManager = "pnpm" | "yarn" | "npm" | "turbo" | "nx" | "lerna" | "rush" | "unknown";
export type TypeScriptWorkspacePackage = {
    readonly name: string;
    readonly relative_path: string;
    readonly has_package_json: boolean;
};
export type TypeScriptWorkspaceInfo = {
    readonly manager: TypeScriptWorkspaceManager;
    readonly config_path: string;
    readonly packages: readonly TypeScriptWorkspacePackage[];
    readonly evidence: readonly string[];
};
export type TypeScriptTestMappingKind = "same_basename_test" | "same_basename_spec" | "co_located" | "__tests___dir" | "test_dir" | "config_override" | "e2e_test" | "unknown";
export type TypeScriptTestMappingConfidence = "high" | "medium" | "low" | "unknown";
export type TypeScriptTestMapping = {
    readonly source_path: string;
    readonly candidate_test_paths: readonly string[];
    readonly existing_test_paths: readonly string[];
    readonly confidence: TypeScriptTestMappingConfidence;
    readonly kind: TypeScriptTestMappingKind;
    readonly reason: string;
};
export type TypeScriptSensitiveZoneSeverity = "medium" | "high" | "critical";
export type TypeScriptSensitiveZoneSource = "keyword" | "config_override" | "path_pattern";
export type TypeScriptSensitiveZone = {
    readonly path_pattern: string;
    readonly matched_paths: readonly string[];
    readonly category: string;
    readonly severity: TypeScriptSensitiveZoneSeverity;
    readonly source: TypeScriptSensitiveZoneSource;
    readonly evidence: readonly string[];
};
export type TypeScriptUnknownCategory = "unclassified_file" | "dynamic_import" | "unsupported_artifact" | "test_mapping_unknown" | "scope_granularity_limit" | "unknown_framework_or_role";
export type TypeScriptUnknownClassification = "out_of_scope" | "actionable" | "intrinsic";
export type TypeScriptObservationUnknown = {
    readonly category: TypeScriptUnknownCategory;
    readonly classification: TypeScriptUnknownClassification;
    readonly paths: readonly string[];
    readonly count: number;
    readonly note: string;
};
export type TypeScriptObservationQuality = {
    readonly typescript_file_count: number;
    readonly javascript_file_count: number;
    readonly classified_count: number;
    readonly classified_ratio: number;
    readonly unknown_count: number;
    readonly unknown_ratio: number;
    readonly test_mapping_count: number;
    readonly high_confidence_test_count: number;
    readonly medium_confidence_test_count: number;
    readonly sensitive_zone_count: number;
    readonly sensitive_file_count: number;
    readonly framework_signal_count: number;
    readonly role_signal_count: number;
    readonly workspace_package_count: number;
};
export type TypeScriptSupportLevel = "validated" | "supported" | "smoke" | "observed_only" | "unsupported";
export type TypeScriptSupportAssessment = {
    readonly level: TypeScriptSupportLevel;
    readonly reasons: readonly string[];
    readonly framework_signals: number;
    readonly role_signals: number;
    readonly test_mapping_count: number;
    readonly risk_preset: string;
};
