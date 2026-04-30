import { describe, expect, it } from "vitest";
import { sanitizeGovernanceEvent } from "../../src/governanceLog/governanceEventSanitizer.js";

describe("governanceEventSanitizer", () => {
  it("accepts repo-relative governance metadata", () => {
    const result = sanitizeGovernanceEvent({
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: "gov_ok",
      timestamp: "2026-04-29T00:00:00.000Z",
      source: "github_action",
      event_type: "review_requested",
      repair_id: "repair_1",
      verdict: "requires_review",
      attention_level: "human_review",
      reasons: [{
        kind: "review_required",
        file: "src/models/User.ts",
        action: "human_review",
      }],
    });

    expect(result.clean).toBe(true);
  });

  it("flags absolute path leaks", () => {
    const result = sanitizeGovernanceEvent({
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: "gov_bad",
      timestamp: "2026-04-29T00:00:00.000Z",
      source: "github_action",
      event_type: "review_requested",
      repair_id: "repair_1",
      verdict: "requires_review",
      attention_level: "human_review",
      reasons: [{
        kind: "review_required",
        file: "C:\\Temp\\bad.ts",
        action: "human_review",
      }],
    });

    expect(result.clean).toBe(false);
    expect(result.violations.some(violation => violation.kind === "absolute_path")).toBe(true);
  });

  it("accepts multiline human-readable reasons", () => {
    const result = sanitizeGovernanceEvent({
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: "gov_multiline",
      timestamp: "2026-04-29T00:00:00.000Z",
      source: "local_cli",
      event_type: "review_requested",
      repair_id: "repair_2",
      verdict: "requires_review",
      attention_level: "human_review",
      reasons: [{
        kind: "review_required",
        file: "src/payment/gateway.ts",
        action: "human_review",
      }],
      artifact_dir: "pantheon-repair-report/\nreview_request.md",
    });

    expect(result.clean).toBe(true);
  });

  it("flags diff hunks embedded in multiline payloads", () => {
    const result = sanitizeGovernanceEvent({
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: "gov_diff",
      timestamp: "2026-04-29T00:00:00.000Z",
      source: "local_cli",
      event_type: "repair_blocked",
      repair_id: "repair_3",
      verdict: "fail",
      attention_level: "urgent",
      artifact_dir: "summary\n@@ -1,3 +1,3 @@",
    });

    expect(result.clean).toBe(false);
    expect(result.violations.some(violation => violation.kind === "diff_hunk")).toBe(true);
  });
});
