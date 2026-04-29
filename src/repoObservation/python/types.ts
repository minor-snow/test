/**
 * P25a: Python Observation Sidecar — Domain Types
 *
 * Sidecar types that live alongside RepoObservations.
 * NOT merged into main types until P29 (unified language adapter).
 *
 * Core invariant: These are syntax-level observations, not full runtime
 * import resolution. The distinction matters for Python where __import__,
 * sys.path, and conditional imports defeat static analysis.
 */

// ---------------------------------------------------------------------------
// Top-level sidecar
// ---------------------------------------------------------------------------

export type PythonObservationSidecar = {
  readonly schema_version: "python_observations.v1";

  readonly repo: {
    readonly root_label: string;
    readonly observed_file_count: number;
    readonly python_file_count: number;
  };

  readonly layout: PythonProjectLayout;
  readonly framework_profile: PythonFrameworkProfile;
  readonly risk_preset_validation: PythonRiskPresetValidation;
  readonly files: readonly PythonObservedFile[];
  readonly import_observations: readonly PythonImportObservation[];
  readonly dependency_manifests: readonly PythonDependencyManifest[];
  readonly test_mappings: readonly PythonTestMapping[];
  readonly sensitive_zones: readonly PythonSensitiveZone[];
  readonly unknowns: readonly PythonObservationUnknown[];

  readonly quality: PythonObservationQuality;
  readonly limitations: readonly string[];
};

// ---------------------------------------------------------------------------
// Python file bucket
// ---------------------------------------------------------------------------

export type PythonFileBucket =
  | "source"
  | "test"
  | "config"
  | "migration"
  | "script"
  | "generated"
  | "docs"
  | "notebook"
  | "unsupported"
  | "unknown";

export type PythonObservedFile = {
  readonly path: string;
  readonly bucket: PythonFileBucket;
  readonly extension: string;
  readonly size_bytes: number;
  readonly evidence: readonly string[];
};

// ---------------------------------------------------------------------------
// Python import observation
// ---------------------------------------------------------------------------

export type PythonImportStatus =
  | "relative_import"
  | "project_import"
  | "declared_package"
  | "undeclared_package"
  | "builtin_python_package"
  | "dynamic_or_unresolved";

export type PythonImportKind =
  | "import"
  | "from_import"
  | "dynamic_import";

export type PythonImportObservation = {
  readonly from_file: string;
  readonly raw_specifier: string;
  readonly import_kind: PythonImportKind;
  readonly status: PythonImportStatus;
  readonly top_level_module: string;
  readonly confidence: "high" | "medium" | "low";
  readonly note?: string;
};

// ---------------------------------------------------------------------------
// Python dependency manifest
// ---------------------------------------------------------------------------

export type PythonManifestSource =
  | "pyproject.toml"
  | "requirements.txt"
  | "requirements-dev.txt"
  | "setup.cfg"
  | "setup.py"
  | "Pipfile"
  | "uv.lock"
  | "poetry.lock"
  | "pdm.lock"
  | "environment.yml"
  | "tox.ini"
  | "noxfile.py";

export type PythonDependencyManifest = {
  readonly source_path: string;
  readonly source_type: PythonManifestSource;
  readonly packages: readonly string[];
  readonly dev_packages: readonly string[];
  readonly confidence: "high" | "medium" | "low";
  readonly warnings: readonly string[];
};

// ---------------------------------------------------------------------------
// Python test mapping
// ---------------------------------------------------------------------------

export type PythonTestMappingConfidence = "high" | "medium" | "low" | "unknown";

export type PythonTestMapping = {
  readonly source_path: string;
  readonly candidate_test_paths: readonly string[];
  readonly existing_test_paths: readonly string[];
  readonly confidence: PythonTestMappingConfidence;
  readonly reason: string;
};

// ---------------------------------------------------------------------------
// Python sensitive zone
// ---------------------------------------------------------------------------

export type PythonSensitiveZoneSeverity = "medium" | "high" | "critical";
export type PythonSensitiveZoneSource = "keyword" | "config_override";

export type PythonSensitiveZone = {
  readonly path_pattern: string;
  readonly matched_paths: readonly string[];
  readonly category: string;
  readonly severity: PythonSensitiveZoneSeverity;
  readonly source: PythonSensitiveZoneSource;
  readonly evidence: readonly string[];
};

// ---------------------------------------------------------------------------
// Python unknown taxonomy
// ---------------------------------------------------------------------------

export type PythonUnknownCategory =
  | "unclassified_python_file"
  | "dynamic_or_unresolved_import"
  | "unsupported_python_artifact"
  | "low_confidence_manifest"
  | "test_mapping_unknown"
  | "scope_granularity_limit"
  | "unknown_framework_or_domain_role";

export type PythonUnknownClassification =
  | "out_of_scope"
  | "actionable"
  | "intrinsic";

export type PythonObservationUnknown = {
  readonly category: PythonUnknownCategory;
  readonly classification: PythonUnknownClassification;
  readonly paths: readonly string[];
  readonly count: number;
  readonly note: string;
};

// ---------------------------------------------------------------------------
// Python observation quality
// ---------------------------------------------------------------------------

export type PythonObservationQuality = {
  readonly python_file_count: number;
  readonly classified_count: number;
  readonly classified_ratio: number;
  readonly unknown_count: number;
  readonly unknown_ratio: number;

  readonly import_observation_count: number;
  readonly project_import_count: number;
  readonly declared_package_count: number;
  readonly undeclared_package_count: number;
  readonly dynamic_import_count: number;

  readonly test_mapping_count: number;
  readonly high_confidence_test_count: number;
  readonly medium_confidence_test_count: number;

  readonly sensitive_zone_count: number;
  readonly sensitive_file_count: number;

  readonly manifest_count: number;
  readonly low_confidence_manifest_count: number;
};

// ---------------------------------------------------------------------------
// Config input
// ---------------------------------------------------------------------------

export type PythonObservationConfig = {
  readonly project_packages?: readonly string[];
  readonly sensitive_overrides?: Readonly<Record<string, string>>;
};

// ---------------------------------------------------------------------------
// Layout classification
// ---------------------------------------------------------------------------

export type PythonPrimaryLayout =
  | "django_project"
  | "api_service"
  | "library_package"
  | "cli_app"
  | "data_pipeline"
  | "ml_project"
  | "monorepo"
  | "mixed"
  | "unknown";

export type PythonPackageLayout =
  | "src_layout"
  | "flat_package"
  | "namespace_package"
  | "django_app_layout"
  | "unknown";

export type PythonLayoutSignal = {
  readonly signal: string;
  readonly weight: "strong" | "moderate" | "weak";
  readonly evidence: string;
};

export type PythonLayoutUnknown = {
  readonly aspect: string;
  readonly reason: string;
};

export type PythonProjectLayout = {
  readonly primary_layout: PythonPrimaryLayout;
  readonly package_layout: PythonPackageLayout;
  readonly confidence: "high" | "medium" | "low";
  readonly signals: readonly PythonLayoutSignal[];
  readonly unknowns: readonly PythonLayoutUnknown[];
  readonly bucket_summary: Readonly<Record<string, number>>;
};

// ---------------------------------------------------------------------------
// Framework / project-role detection (P27-1c)
// ---------------------------------------------------------------------------

export type PythonEvidenceDimension =
  | "dependency_manifest"
  | "layout_classification"
  | "path_pattern"
  | "import_pattern";

export type PythonFrameworkSignal = {
  readonly name: string;
  readonly kind: "web_framework" | "test_framework" | "cli_framework" | "async_framework" | "orm" | "task_queue" | "http_client";
  readonly confidence: "high" | "medium" | "low";
  readonly evidence: readonly {
    readonly dimension: PythonEvidenceDimension;
    readonly detail: string;
  }[];
};

export type PythonProjectRoleSignal = {
  readonly role: string;
  readonly confidence: "high" | "medium" | "low";
  readonly evidence: readonly {
    readonly dimension: PythonEvidenceDimension;
    readonly detail: string;
  }[];
};

export type PythonFrameworkUnknown = {
  readonly kind: "unknown_framework_or_domain_role";
  readonly reason: string;
};

export type PythonFrameworkProfile = {
  readonly framework_signals: readonly PythonFrameworkSignal[];
  readonly project_role_signals: readonly PythonProjectRoleSignal[];
  readonly unknowns: readonly PythonFrameworkUnknown[];
};

// ---------------------------------------------------------------------------
// Risk preset validation (P27-1e)
// ---------------------------------------------------------------------------

export type PythonRiskPresetValidation = {
  /** The matched preset name (e.g., "django_commerce", "python_sdk_library") */
  readonly preset: string;
  /** Whether the preset has been validated against observed signals */
  readonly validation: "validated" | "partial" | "unvalidated";
  /** Overall confidence in the preset match */
  readonly confidence: "high" | "medium" | "low";
  /** Signals that matched this preset */
  readonly matched_signals: readonly string[];
  /** Suggested review-required candidates */
  readonly suggested_review: readonly PythonRiskPresetSuggestion[];
  /** Suggested forbidden candidates (used sparingly) */
  readonly suggested_forbidden: readonly PythonRiskPresetSuggestion[];
  /** Patterns expected by the preset but not observed in the repo */
  readonly dormant_patterns: readonly PythonDormantPattern[];
};

export type PythonRiskPresetSuggestion = {
  readonly pattern: string;
  readonly reason: string;
  readonly severity: "critical" | "high" | "medium";
  readonly matched_path_count: number;
  readonly evidence: readonly string[];
};

export type PythonDormantPattern = {
  readonly pattern: string;
  readonly reason: string;
};
