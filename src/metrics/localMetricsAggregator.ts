import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { RepairVerdict } from "../repair/types.js";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { readGovernanceEventsForDate } from "../governanceLog/governanceEventReader.js";
import type { GovernanceEvent, GovernanceReasonKind } from "../governanceLog/governanceEventTypes.js";
import { loadReviewQueue } from "../review/reviewQueueStore.js";
import type { ReviewRequest } from "../review/reviewRequestTypes.js";
import { loadLocalMetricsConfig, type LocalMetricsConfig } from "./metricsConfig.js";
import { atomicWriteJson, atomicWriteText } from "../repair/session/atomicWrite.js";

export type DailyMetricsReport = {
  readonly schema_version: "pantheon_local_metrics_daily@0.1.0";
  readonly date: string;
  readonly generated_at: string;
  readonly config: LocalMetricsConfig;
  readonly repair_checks: number;
  readonly pr_repair_checks: number;
  readonly local_repair_checks: number;
  readonly verdict_counts: Record<RepairVerdict, number>;
  readonly blocked: number;
  readonly intercept_reasons: Record<GovernanceReasonKind, number>;
  readonly open_review_requests: readonly {
    readonly repair_id: string;
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

export function metricsPaths(repoRoot: string): MetricsPaths {
  const dir = join(resolvePantheonDir(repoRoot), "metrics");
  const dailyDir = join(dir, "daily");
  return {
    dir,
    dailyDir,
    jsonPath: (date: string) => join(dailyDir, `${date}.json`),
    markdownPath: (date: string) => join(dailyDir, `${date}.md`),
  };
}

export function ensureMetricsDirs(repoRoot: string): MetricsPaths {
  const paths = metricsPaths(repoRoot);
  mkdirSync(paths.dir, { recursive: true });
  mkdirSync(paths.dailyDir, { recursive: true });
  return paths;
}

export function aggregateDailyMetrics(repoRoot: string, date: string): DailyMetricsReport {
  const config = loadLocalMetricsConfig(repoRoot);
  const events = readGovernanceEventsForDate(repoRoot, date);
  const reviewQueue = loadReviewQueue(repoRoot);
  const checks = events.filter(event => event.event_type === "repair_check_completed");

  const verdictCounts: Record<RepairVerdict, number> = {
    pass: 0,
    requires_review: 0,
    requires_scope_expansion: 0,
    requires_replan: 0,
    fail: 0,
  };
  for (const event of checks) {
    if (event.verdict) {
      verdictCounts[event.verdict] += 1;
    }
  }

  const interceptReasons = emptyReasonCounts();
  for (const event of checks) {
    for (const reason of event.reasons ?? []) {
      interceptReasons[reason.kind] += 1;
    }
  }
  for (const event of events.filter(item => item.event_type === "artifact_sanitizer_violation")) {
    interceptReasons.artifact_sanitizer_violation += event.sanitizer_violations ?? 1;
  }

  const openReviewRequests = reviewQueue.open.map(request => ({
    repair_id: request.repair_id,
    verdict: request.verdict,
    reason: request.reason,
    files: request.files.length,
    age_minutes: minutesSince(request.created_at),
  }));

  const areaCounts = new Map<string, number>();
  for (const request of reviewQueue.open) {
    for (const file of request.files) {
      const area = config.includeFilePaths
        ? maybeAnonymizePath(file.path, config.anonymizePaths)
        : file.bucket;
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    }
  }

  return {
    schema_version: "pantheon_local_metrics_daily@0.1.0",
    date,
    generated_at: new Date().toISOString(),
    config,
    repair_checks: checks.length,
    pr_repair_checks: checks.filter(event => event.source === "github_action").length,
    local_repair_checks: checks.filter(event => event.source !== "github_action").length,
    verdict_counts: verdictCounts,
    blocked: verdictCounts.requires_scope_expansion + verdictCounts.requires_replan + verdictCounts.fail,
    intercept_reasons: interceptReasons,
    open_review_requests: openReviewRequests,
    common_review_areas: [...areaCounts.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
      .slice(0, 10),
  };
}

export function writeDailyMetricsArtifacts(repoRoot: string, report: DailyMetricsReport, markdown: string): MetricsPaths {
  const paths = ensureMetricsDirs(repoRoot);
  atomicWriteJson(paths.jsonPath(report.date), report);
  atomicWriteText(paths.markdownPath(report.date), markdown);
  return paths;
}

export function latestMetricsStatus(repoRoot: string): {
  readonly config: LocalMetricsConfig;
  readonly latestDate: string | null;
  readonly latestJsonPath: string | null;
} {
  const config = loadLocalMetricsConfig(repoRoot);
  const paths = ensureMetricsDirs(repoRoot);
  const today = new Date().toISOString().slice(0, 10);
  const latestJsonPath = paths.jsonPath(today);
  return {
    config,
    latestDate: existsSync(latestJsonPath) ? today : null,
    latestJsonPath: existsSync(latestJsonPath) ? latestJsonPath : null,
  };
}

function maybeAnonymizePath(path: string, anonymize: boolean): string {
  if (!anonymize) {
    return path;
  }
  const hash = createHash("sha256").update(path).digest("hex");
  return `path_hash:sha256:${hash.slice(0, 12)}`;
}

function minutesSince(timestamp: string): number {
  const delta = Date.now() - Date.parse(timestamp);
  return Math.max(0, Math.floor(delta / 60000));
}

function emptyReasonCounts(): Record<GovernanceReasonKind, number> {
  return {
    review_required: 0,
    outside_scope: 0,
    forbidden_file_touched: 0,
    stale_repair_contract: 0,
    requires_scope_expansion: 0,
    artifact_sanitizer_violation: 0,
    concurrent_repair_overlap: 0,
    missing_contract: 0,
    policy_tamper: 0,
    fake_approval: 0,
    workflow_touched: 0,
    uncontracted_source_change: 0,
  };
}
