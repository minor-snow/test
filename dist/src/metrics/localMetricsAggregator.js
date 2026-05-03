import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolvePantheonDir } from "../cli/artifactLayout.js";
import { readGovernanceEventsForDate } from "../governanceLog/governanceEventReader.js";
import { loadReviewQueue } from "../review/reviewQueueStore.js";
import { loadLocalMetricsConfig } from "./metricsConfig.js";
import { atomicWriteJson, atomicWriteText } from "../repair/session/atomicWrite.js";
export function metricsPaths(repoRoot) {
    const dir = join(resolvePantheonDir(repoRoot), "metrics");
    const dailyDir = join(dir, "daily");
    return {
        dir,
        dailyDir,
        jsonPath: (date) => join(dailyDir, `${date}.json`),
        markdownPath: (date) => join(dailyDir, `${date}.md`),
    };
}
export function ensureMetricsDirs(repoRoot) {
    const paths = metricsPaths(repoRoot);
    mkdirSync(paths.dir, { recursive: true });
    mkdirSync(paths.dailyDir, { recursive: true });
    return paths;
}
export function aggregateDailyMetrics(repoRoot, date) {
    const config = loadLocalMetricsConfig(repoRoot);
    const events = readGovernanceEventsForDate(repoRoot, date);
    const reviewQueue = loadReviewQueue(repoRoot);
    const repairChecks = events.filter(event => event.event_type === "repair_check_completed");
    const changeChecks = events.filter(event => event.event_type === "change_check_completed" || event.event_type === "change_blocked" || event.event_type === "change_replanned");
    const archChecks = events.filter(event => event.event_type === "architecture_constraint_triggered");
    const checks = [...repairChecks, ...changeChecks, ...archChecks];
    const verdictCounts = {
        pass: 0,
        requires_review: 0,
        requires_scope_expansion: 0,
        requires_replan: 0,
        fail: 0,
        requires_contract: 0,
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
        target_type: request.target?.target_type ?? "repair",
        target_id: request.target?.target_id ?? request.repair_id ?? "unknown",
        verdict: request.verdict,
        reason: request.reason,
        files: request.files.length,
        age_minutes: minutesSince(request.created_at),
    }));
    const areaCounts = new Map();
    for (const request of reviewQueue.open) {
        for (const file of request.files) {
            const area = config.includeFilePaths
                ? maybeAnonymizePath(file.path, config.anonymizePaths)
                : file.bucket;
            areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
        }
    }
    // Calculate architecture findings stats from reasons in checks
    let archConstraintsTriggered = 0;
    let archBlockingFindings = 0;
    let archReviewFindings = 0;
    let archInfoFindings = 0;
    for (const event of checks) {
        for (const reason of event.reasons ?? []) {
            if (reason.kind.startsWith("architecture_")) {
                archConstraintsTriggered++;
                if (reason.kind === "architecture_forbidden" || reason.kind === "architecture_contract_modified") {
                    archBlockingFindings++;
                }
                else if (reason.kind === "architecture_review_required" || reason.kind === "architecture_scope_crossed" || reason.kind === "architecture_dependency_boundary" || reason.kind === "architecture_external_boundary") {
                    archReviewFindings++;
                }
                else {
                    archInfoFindings++;
                }
            }
        }
    }
    return {
        schema_version: "pantheon_local_metrics_daily@0.1.0",
        date,
        generated_at: new Date().toISOString(),
        config,
        repair_checks: repairChecks.length,
        pr_repair_checks: repairChecks.filter(event => event.source === "github_action").length,
        local_repair_checks: repairChecks.filter(event => event.source !== "github_action").length,
        change_checks: changeChecks.length,
        pr_change_checks: changeChecks.filter(event => event.source === "github_action").length,
        local_change_checks: changeChecks.filter(event => event.source !== "github_action").length,
        architecture_contracts_active: events.filter(e => e.event_type === "architecture_contract_accepted").length, // Simplification for daily aggregate
        architecture_claims_extracted: 0, // Hard to compute without active contract parsing here, keeping 0 for now
        architecture_mappings_unresolved: reviewQueue.open.filter(r => r.type === "architecture_mapping_review").length,
        architecture_constraint_triggered: archConstraintsTriggered,
        architecture_blocking_findings: archBlockingFindings,
        architecture_review_required_findings: archReviewFindings,
        architecture_info_findings: archInfoFindings,
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
export function writeDailyMetricsArtifacts(repoRoot, report, markdown) {
    const paths = ensureMetricsDirs(repoRoot);
    atomicWriteJson(paths.jsonPath(report.date), report);
    atomicWriteText(paths.markdownPath(report.date), markdown);
    return paths;
}
export function latestMetricsStatus(repoRoot) {
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
function maybeAnonymizePath(path, anonymize) {
    if (!anonymize) {
        return path;
    }
    const hash = createHash("sha256").update(path).digest("hex");
    return `path_hash:sha256:${hash.slice(0, 12)}`;
}
function minutesSince(timestamp) {
    const delta = Date.now() - Date.parse(timestamp);
    return Math.max(0, Math.floor(delta / 60000));
}
function emptyReasonCounts() {
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
        architecture_forbidden: 0,
        architecture_review_required: 0,
        architecture_scope_crossed: 0,
        architecture_dependency_boundary: 0,
        architecture_external_boundary: 0,
        architecture_contract_modified: 0,
    };
}
//# sourceMappingURL=localMetricsAggregator.js.map