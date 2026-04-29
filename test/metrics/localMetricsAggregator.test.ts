import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendGovernanceEvent } from "../../src/governanceLog/governanceEventWriter.js";
import { writeReviewRequest } from "../../src/review/reviewQueueStore.js";
import { aggregateDailyMetrics } from "../../src/metrics/localMetricsAggregator.js";

describe("localMetricsAggregator", () => {
  const tmpDir = join("test", "metrics", "__tmp_metrics__");
  const date = "2026-04-29";

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "pantheon.alpha.json"), JSON.stringify({
      metrics: {
        enabled: true,
        mode: "local",
        generate_daily_report: true,
        include_file_paths: true,
        anonymize_paths: false,
        retention_days: 30,
      },
    }, null, 2));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("aggregates verdict counts, intercepts, and open reviews", () => {
    appendGovernanceEvent(tmpDir, {
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: "gov_check_1",
      timestamp: `${date}T01:00:00.000Z`,
      source: "local_cli",
      event_type: "repair_check_completed",
      repair_id: "repair_1",
      verdict: "requires_review",
      attention_level: "human_review",
      changed_files_count: 2,
      bucket_counts: {
        allowed: 1,
        review_required: 1,
        forbidden: 0,
        outside_scope: 0,
      },
      reasons: [{
        kind: "review_required",
        file: "src/models/User.ts",
        action: "human_review",
      }],
    });
    writeReviewRequest(tmpDir, {
      schema_version: "pantheon_review_request@0.1.0",
      review_id: "review_repair_1",
      repair_id: "repair_1",
      contract_revision: 1,
      source: "local_cli",
      status: "open",
      attention_level: "human_review",
      verdict: "requires_review",
      reason: "Human review required.",
      files: [{
        path: "src/models/User.ts",
        bucket: "review_required",
        reason: "Model change requires review.",
      }],
      recommended_actions: ["human_review"],
      created_at: `${date}T01:00:00.000Z`,
      updated_at: `${date}T01:00:00.000Z`,
    });

    const report = aggregateDailyMetrics(tmpDir, date);
    expect(report.repair_checks).toBe(1);
    expect(report.verdict_counts.requires_review).toBe(1);
    expect(report.intercept_reasons.review_required).toBe(1);
    expect(report.open_review_requests).toHaveLength(1);
    expect(report.common_review_areas[0]?.area).toBe("src/models/User.ts");
  });
});
