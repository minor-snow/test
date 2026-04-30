import { describe, expect, it } from "vitest";
import { appendDecisionEntry } from "../../src/cockpit/decisionLog.js";
import { appendRiskEntries } from "../../src/cockpit/riskRegister.js";

describe("cockpit ledger path safety", () => {
  it("rejects traversal-like data directories by default", async () => {
    await expect(appendDecisionEntry("../outside", {
      decision_id: "dec_escape",
      decision_type: "accepted_clean",
      operator_id: "tester",
      release_decision_id: "dec_escape",
      affected_artifacts: ["artifact"],
      canonical_revision_ids: {},
      rationale: "test",
      created_at: "2026-04-30T00:00:00.000Z",
    })).rejects.toThrow(/escapes trusted root/i);

    await expect(appendRiskEntries("../outside", [{
      risk_id: "risk_escape",
      source_issue_id: "issue_escape",
      issue_type: "test",
      severity: "low",
      block_id: "block",
      artifact_id: "artifact",
      canonical_revision_id: "rev_1",
      accepted_by: "tester",
      release_decision_id: "dec_1",
      why_accepted: "test",
      created_at: "2026-04-30T00:00:00.000Z",
    }])).rejects.toThrow(/escapes trusted root/i);
  });
});
