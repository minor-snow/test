import { describe, expect, it } from "vitest";
import { renderDailyMetricsReport } from "../../src/metrics/dailyReportRenderer.js";

describe("dailyReportRenderer", () => {
  it("renders a local governance summary", () => {
    const markdown = renderDailyMetricsReport({
      schema_version: "pantheon_local_metrics_daily@0.1.0",
      date: "2026-04-29",
      generated_at: "2026-04-29T00:00:00.000Z",
      config: {
        enabled: true,
        mode: "local",
        generateDailyReport: true,
        includeFilePaths: true,
        anonymizePaths: false,
        retentionDays: 30,
      },
      repair_checks: 2,
      pr_repair_checks: 1,
      local_repair_checks: 1,
      verdict_counts: {
        pass: 1,
        requires_review: 1,
        requires_scope_expansion: 0,
        requires_replan: 0,
        fail: 0,
      },
      blocked: 0,
      intercept_reasons: {
        review_required: 1,
        outside_scope: 0,
        forbidden_file_touched: 0,
        stale_repair_contract: 0,
        requires_scope_expansion: 0,
        artifact_sanitizer_violation: 0,
        concurrent_repair_overlap: 0,
      },
      open_review_requests: [],
      common_review_areas: [],
    });

    expect(markdown).toContain("Pantheon Local Governance Report");
    expect(markdown).toContain("| requires_review | 1 |");
    expect(markdown).toContain("No source code content or diff hunks");
  });
});
