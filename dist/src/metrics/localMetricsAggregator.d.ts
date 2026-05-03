import type { RepairVerdict } from "../repair/types.js";
import type { GovernanceReasonKind } from "../governanceLog/governanceEventTypes.js";
import type { ReviewRequest } from "../review/reviewRequestTypes.js";
import { type LocalMetricsConfig } from "./metricsConfig.js";
export type DailyMetricsReport = {
    readonly schema_version: "pantheon_local_metrics_daily@0.1.0";
    readonly date: string;
    readonly generated_at: string;
    readonly config: LocalMetricsConfig;
    readonly repair_checks: number;
    readonly pr_repair_checks: number;
    readonly local_repair_checks: number;
    readonly change_checks: number;
    readonly pr_change_checks: number;
    readonly local_change_checks: number;
    readonly architecture_contracts_active: number;
    readonly architecture_claims_extracted: number;
    readonly architecture_mappings_unresolved: number;
    readonly architecture_constraint_triggered: number;
    readonly architecture_blocking_findings: number;
    readonly architecture_review_required_findings: number;
    readonly architecture_info_findings: number;
    readonly verdict_counts: Record<RepairVerdict, number>;
    readonly blocked: number;
    readonly intercept_reasons: Record<GovernanceReasonKind, number>;
    readonly open_review_requests: readonly {
        readonly target_type: "repair" | "change" | "architecture";
        readonly target_id: string;
        readonly verdict: ReviewRequest["verdict"];
        readonly reason: string;
        readonly files: number;
        readonly age_minutes: number;
    }[];
    readonly common_review_areas: readonly {
        readonly area: string;
        readonly count: number;
    }[];
};
export type MetricsPaths = {
    readonly dir: string;
    readonly dailyDir: string;
    readonly jsonPath: (date: string) => string;
    readonly markdownPath: (date: string) => string;
};
export declare function metricsPaths(repoRoot: string): MetricsPaths;
export declare function ensureMetricsDirs(repoRoot: string): MetricsPaths;
export declare function aggregateDailyMetrics(repoRoot: string, date: string): DailyMetricsReport;
export declare function writeDailyMetricsArtifacts(repoRoot: string, report: DailyMetricsReport, markdown: string): MetricsPaths;
export declare function latestMetricsStatus(repoRoot: string): {
    readonly config: LocalMetricsConfig;
    readonly latestDate: string | null;
    readonly latestJsonPath: string | null;
};
