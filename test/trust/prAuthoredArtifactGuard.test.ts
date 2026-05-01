import { describe, it, expect } from "vitest";
import { guardPrAuthoredArtifacts } from "../../src/trust/prAuthoredArtifactGuard.js";

describe("prAuthoredArtifactGuard", () => {
  describe("guardPrAuthoredArtifacts", () => {
    it("detects fake approval JSON under .pantheon/audit/", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/audit/human_audit_decision.json",
      ]);
      expect(result.fake_approval_detected).toBe(true);
      expect(result.ignored_artifacts).toHaveLength(1);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].kind).toBe("fake_approval_ignored");
      expect(result.findings[0].severity).toBe("critical");
      expect(result.findings[0].action).toBe("fail_closed");
    });

    it("detects fake approval.json under .pantheon/audit/", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/audit/approval.json",
      ]);
      expect(result.fake_approval_detected).toBe(true);
      expect(result.findings[0].kind).toBe("fake_approval_ignored");
    });

    it("detects PR-modified contract artifact", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/repair/runs/r123/repair_contract.latest.json",
      ]);
      expect(result.fake_approval_detected).toBe(false);
      expect(result.ignored_artifacts).toHaveLength(1);
      expect(result.findings[0].kind).toBe("pr_authored_contract_ignored");
      expect(result.findings[0].severity).toBe("blocking");
      expect(result.findings[0].action).toBe("request_replan");
    });

    it("detects PR-modified review queue", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/reviews/review_queue.json",
      ]);
      expect(result.fake_approval_detected).toBe(false);
      expect(result.ignored_artifacts).toHaveLength(1);
      expect(result.findings[0].kind).toBe("pr_authored_contract_ignored");
      expect(result.findings[0].severity).toBe("warning");
    });

    it("detects governance events file", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/governance/events.jsonl",
      ]);
      expect(result.ignored_artifacts).toHaveLength(1);
    });

    it("ignores files outside .pantheon/ governance paths", () => {
      const result = guardPrAuthoredArtifacts([
        "src/approval.json",
        "data/human_audit_decision.json",
        "test/review_queue.json",
      ]);
      expect(result.fake_approval_detected).toBe(false);
      expect(result.ignored_artifacts).toHaveLength(0);
      expect(result.findings).toHaveLength(0);
    });

    it("ignores normal source files", () => {
      const result = guardPrAuthoredArtifacts([
        "src/auth/login.ts",
        "package.json",
        "README.md",
      ]);
      expect(result.fake_approval_detected).toBe(false);
      expect(result.ignored_artifacts).toHaveLength(0);
    });

    it("handles multiple artifacts in one PR", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/audit/human_audit_decision.json",
        ".pantheon/repair/runs/r1/repair_contract.latest.json",
        ".pantheon/reviews/review_request.json",
        "src/app.ts",
      ]);
      expect(result.fake_approval_detected).toBe(true);
      expect(result.ignored_artifacts).toHaveLength(3);
      expect(result.findings).toHaveLength(3);

      // The approval artifact should be critical
      const approvalFinding = result.findings.find(f => f.kind === "fake_approval_ignored");
      expect(approvalFinding?.severity).toBe("critical");
    });

    it("detects change contract artifact", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/change/runs/c456/change_contract.latest.json",
      ]);
      expect(result.ignored_artifacts).toHaveLength(1);
      expect(result.findings[0].severity).toBe("blocking");
    });

    it("detects metrics snapshot", () => {
      const result = guardPrAuthoredArtifacts([
        ".pantheon/metrics/daily_report.json",
      ]);
      expect(result.ignored_artifacts).toHaveLength(1);
    });

    it("returns clean result for empty diff", () => {
      const result = guardPrAuthoredArtifacts([]);
      expect(result.fake_approval_detected).toBe(false);
      expect(result.ignored_artifacts).toHaveLength(0);
      expect(result.findings).toHaveLength(0);
    });
  });
});
