/**
 * P25b.1: Saleor Observation Report Renderer
 *
 * Repo-wide reporting on top of the Python observation sidecar.
 * This is distinct from the scope-aware pythonGovernanceRenderer:
 * it answers whether Saleor is governance-ready at repo scale.
 */
import type { PythonObservationSidecar } from "./types.js";
export type P25aObservationSummary = {
    readonly repo_label?: string;
    readonly observed_files?: number;
    readonly python_files?: number;
    readonly scan_ms?: number;
    readonly enhance_ms?: number;
};
export type SaleorObservationDomainSignal = {
    readonly domain: string;
    readonly path_pattern: string;
    readonly risk: string;
    readonly severity: "medium" | "high" | "critical";
    readonly governance_recommendation: "protected" | "review_required" | "explicit_scope_candidate";
    readonly matched_file_count: number;
    readonly source_file_count: number;
    readonly test_file_count: number;
    readonly project_import_count: number;
};
export type SaleorObservationReportSummary = {
    readonly schema_version: "saleor_observation_report.v2";
    readonly subject_name: string;
    readonly repo_label: string;
    readonly generated_at: string;
    readonly repo_scale: {
        readonly observed_files: number;
        readonly python_files: number;
        readonly scan_ms: number | null;
        readonly enhance_ms: number | null;
        readonly bucket_distribution: ReadonlyArray<{
            readonly bucket: string;
            readonly count: number;
        }>;
    };
    readonly historical_baseline: {
        readonly generic_smoke_scan: {
            readonly observed_files: number;
            readonly scan_ms: number;
            readonly unknown_bucket_files: number;
            readonly import_edges: number;
            readonly test_mappings: number;
            readonly sensitive_paths: number;
        };
        readonly note: string;
    };
    readonly python_observation_summary: {
        readonly import_observation_count: number;
        readonly project_import_count: number;
        readonly declared_package_count: number;
        readonly undeclared_package_count: number;
        readonly dynamic_import_count: number;
        readonly manifest_count: number;
        readonly low_confidence_manifest_count: number;
    };
    readonly sensitive_zone_map: ReadonlyArray<{
        readonly category: string;
        readonly severity: string;
        readonly matched_file_count: number;
        readonly source: string;
        readonly path_pattern: string;
    }>;
    readonly high_risk_domains: ReadonlyArray<SaleorObservationDomainSignal>;
    readonly test_mapping_summary: {
        readonly total: number;
        readonly high_confidence: number;
        readonly medium_confidence: number;
        readonly low_confidence: number;
        readonly unknown: number;
        readonly mapped_source_ratio: number;
    };
    readonly unknown_taxonomy: {
        readonly total_unknowns: number;
        readonly classification_counts: ReadonlyArray<{
            readonly classification: string;
            readonly count: number;
        }>;
        readonly categories: ReadonlyArray<{
            readonly category: string;
            readonly classification: string;
            readonly count: number;
            readonly note: string;
        }>;
    };
    readonly suggested_protected_zones: readonly string[];
    readonly suggested_review_required_zones: readonly string[];
    readonly boundary_readiness: {
        readonly explicit_scope: "ready_for_explicit_scope" | "requires_manual_scope" | "not_ready_for_auto_scope";
        readonly auto_scope: "not_ready_for_auto_scope";
        readonly reasons: readonly string[];
    };
    readonly recommended_trial_scenario: {
        readonly intent: string;
        readonly allowed: readonly string[];
        readonly review_required: readonly string[];
        readonly forbidden: readonly string[];
        readonly rationale: string;
    };
    readonly limitations: readonly string[];
};
export declare function buildSaleorObservationReportSummary(input: {
    sidecar: PythonObservationSidecar;
    observationSummary?: P25aObservationSummary;
    subjectName?: string;
    generatedAt?: string;
}): SaleorObservationReportSummary;
export declare function renderSaleorObservationReportMarkdown(summary: SaleorObservationReportSummary): string;
