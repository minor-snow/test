import { describe, it, expect } from "vitest";
import {
  detectPolicyTamper,
  hasPolicySensitiveChanges,
  hasApprovalArtifactChanges,
  hasContractArtifactChanges,
} from "../../src/policy/policyTamperDetector.js";

describe("policyTamperDetector", () => {
  describe("detectPolicyTamper", () => {
    it("detects pantheon.alpha.json as policy_sensitive", () => {
      const result = detectPolicyTamper(["pantheon.alpha.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].classification).toBe("policy_sensitive");
      expect(result.findings[0].path).toBe("pantheon.alpha.json");
    });

    it("detects AGENTS.md as policy_sensitive", () => {
      const result = detectPolicyTamper(["AGENTS.md"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("policy_sensitive");
    });

    it("detects CODEOWNERS as policy_sensitive", () => {
      const result = detectPolicyTamper(["CODEOWNERS"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("policy_sensitive");
    });

    it("detects .github/workflows/ci.yml as workflow_sensitive", () => {
      const result = detectPolicyTamper([".github/workflows/ci.yml"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("workflow_sensitive");
    });

    it("detects action.yml as workflow_sensitive", () => {
      const result = detectPolicyTamper(["action.yml"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("workflow_sensitive");
    });

    it("detects .pantheon/repair/runs/xxx/contract.json as contract_artifact", () => {
      const result = detectPolicyTamper([".pantheon/repair/runs/r123/contract.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("contract_artifact");
    });

    it("detects .pantheon/audit/decision.json as approval_artifact", () => {
      const result = detectPolicyTamper([".pantheon/audit/decision.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("approval_artifact");
    });

    it("detects .pantheon/reviews/queue.json as approval_artifact", () => {
      const result = detectPolicyTamper([".pantheon/reviews/queue.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("approval_artifact");
    });

    it("does not flag normal source files", () => {
      const result = detectPolicyTamper([
        "src/auth/login.ts",
        "src/utils/helper.ts",
        "README.md",
        "package.json",
      ]);
      expect(result.detected).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it("does not flag test files", () => {
      const result = detectPolicyTamper([
        "test/auth/login.test.ts",
        "tests/helper.spec.ts",
      ]);
      expect(result.detected).toBe(false);
    });

    it("handles multiple tamper types in one diff", () => {
      const result = detectPolicyTamper([
        "pantheon.alpha.json",
        ".github/workflows/ci.yml",
        ".pantheon/audit/human_decision.json",
        "src/app.ts",
      ]);
      expect(result.detected).toBe(true);
      expect(result.findings).toHaveLength(3);

      const classifications = result.findings.map(f => f.classification);
      expect(classifications).toContain("policy_sensitive");
      expect(classifications).toContain("workflow_sensitive");
      expect(classifications).toContain("approval_artifact");
    });

    it("deduplicates paths", () => {
      const result = detectPolicyTamper([
        "pantheon.alpha.json",
        "pantheon.alpha.json",
      ]);
      expect(result.findings).toHaveLength(1);
    });

    it("supports custom protected policy paths", () => {
      const result = detectPolicyTamper(
        ["custom-config.json"],
        { protectedPolicyPaths: ["custom-config.json"] },
      );
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("policy_sensitive");
    });

    it("supports .pantheon/policy/** glob", () => {
      const result = detectPolicyTamper([".pantheon/policy/rules.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("policy_sensitive");
    });

    it("supports .pantheon/architecture/** glob", () => {
      const result = detectPolicyTamper([".pantheon/architecture/contracts.json"]);
      expect(result.detected).toBe(true);
      expect(result.findings[0].classification).toBe("policy_sensitive");
    });
  });

  describe("helper predicates", () => {
    it("hasPolicySensitiveChanges returns true for policy files", () => {
      const result = detectPolicyTamper(["pantheon.alpha.json"]);
      expect(hasPolicySensitiveChanges(result)).toBe(true);
    });

    it("hasPolicySensitiveChanges returns false for workflow-only", () => {
      const result = detectPolicyTamper([".github/workflows/ci.yml"]);
      expect(hasPolicySensitiveChanges(result)).toBe(false);
    });

    it("hasApprovalArtifactChanges returns true for audit files", () => {
      const result = detectPolicyTamper([".pantheon/audit/decision.json"]);
      expect(hasApprovalArtifactChanges(result)).toBe(true);
    });

    it("hasContractArtifactChanges returns true for contract files", () => {
      const result = detectPolicyTamper([".pantheon/repair/runs/r1/contract.json"]);
      expect(hasContractArtifactChanges(result)).toBe(true);
    });
  });
});
