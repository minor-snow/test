import { describe, it, expect } from "vitest";
import { evaluateContractRequirement } from "../../src/policy/contractRequirementPolicy.js";

describe("contractRequirementPolicy", () => {
  describe("evaluateContractRequirement", () => {
    // -----------------------------------------------------------------------
    // Low risk — no contract required
    // -----------------------------------------------------------------------

    it("docs-only change → low risk, no contract", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["README.md", "docs/guide.md"],
      });
      expect(result.risk_level).toBe("low");
      expect(result.contract_required).toBe(false);
      expect(result.low_risk_bypass_applied).toBe(false); // not needed, already low
      expect(result.file_findings.every(f => f.bucket === "docs")).toBe(true);
    });

    it("test-only low-risk change → low risk, no contract", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["test/utils/helper.test.ts", "test/formatting.spec.ts"],
        policyConfig: {
          low_risk_bypass: {
            enabled: true,
            test_only: "allow_low_risk",
          },
        },
      });
      expect(result.risk_level).toBe("low");
      expect(result.contract_required).toBe(false);
    });

    it("config-only change → low risk, no contract", () => {
      const result = evaluateContractRequirement({
        changedPaths: [".eslintrc.json", ".prettierrc"],
      });
      expect(result.risk_level).toBe("low");
      expect(result.contract_required).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Medium risk — contract required
    // -----------------------------------------------------------------------

    it("source code change → medium risk, contract required", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["src/utils/formatter.ts"],
      });
      expect(result.risk_level).toBe("medium");
      expect(result.contract_required).toBe(true);
    });

    it("source + docs mixed → medium risk (source dominates)", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["src/utils/formatter.ts", "README.md"],
      });
      expect(result.risk_level).toBe("medium");
      expect(result.contract_required).toBe(true);
    });

    // -----------------------------------------------------------------------
    // High risk — contract required
    // -----------------------------------------------------------------------

    it("auth module change → high risk, contract required", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["src/auth/login.ts"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.contract_required).toBe(true);
      expect(result.file_findings[0].risk_level).toBe("high");
      expect(result.file_findings[0].reasons.some(r => r.includes("auth"))).toBe(true);
    });

    it("package.json → high risk (execution surface)", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["package.json"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.contract_required).toBe(true);
    });

    it("workflow file → high risk", () => {
      const result = evaluateContractRequirement({
        changedPaths: [".github/workflows/ci.yml"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.contract_required).toBe(true);
      expect(result.file_findings[0].bucket).toBe("workflow");
    });

    it("generated dist → high risk", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["dist/index.js"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.contract_required).toBe(true);
      expect(result.file_findings[0].bucket).toBe("generated_artifact");
    });

    it("payment module → high risk", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["src/payment/stripe.ts"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.file_findings[0].risk_level).toBe("high");
    });

    // -----------------------------------------------------------------------
    // Critical risk
    // -----------------------------------------------------------------------

    it("policy-sensitive file → high risk (policy_sensitive bucket)", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["pantheon.alpha.json"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.file_findings[0].bucket).toBe("policy_sensitive");
      expect(result.file_findings[0].trusted_approval_required).toBe(true);
    });

    it("approval artifact → critical risk", () => {
      const result = evaluateContractRequirement({
        changedPaths: [".pantheon/audit/human_audit_decision.json"],
      });
      expect(result.risk_level).toBe("critical");
      expect(result.file_findings[0].bucket).toBe("contract_artifact");
    });

    it("protected path → critical/forbidden", () => {
      const result = evaluateContractRequirement({
        changedPaths: [".git/config"],
        protectedPaths: [".git/**"],
      });
      expect(result.file_findings[0].bucket).toBe("forbidden");
      expect(result.file_findings[0].risk_level).toBe("critical");
    });

    // -----------------------------------------------------------------------
    // Low-risk bypass
    // -----------------------------------------------------------------------

    it("bypass enabled: docs-only bypasses medium threshold", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["docs/api.md"],
        policyConfig: {
          risk_threshold_for_contract: "medium",
          low_risk_bypass: { enabled: true, docs_only: true },
        },
      });
      expect(result.contract_required).toBe(false);
    });

    it("bypass disabled: docs-only still requires contract at medium threshold", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["docs/api.md"],
        policyConfig: {
          risk_threshold_for_contract: "low",
          low_risk_bypass: { enabled: false },
        },
      });
      // Even docs are low risk, but with threshold=low and bypass disabled,
      // contract is required
      expect(result.contract_required).toBe(true);
    });

    it("test in high-risk area not bypassed", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["test/auth/login.test.ts"],
        policyConfig: {
          low_risk_bypass: { enabled: true, test_only: "allow_low_risk" },
        },
      });
      // test/auth/ contains 'auth' keyword → medium risk → not bypassed
      expect(result.file_findings[0].risk_level).toBe("medium");
      expect(result.contract_required).toBe(true);
    });

    // -----------------------------------------------------------------------
    // Contract reason
    // -----------------------------------------------------------------------

    it("builds descriptive contract reason", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["src/app.ts", ".github/workflows/ci.yml"],
      });
      expect(result.contract_reason).toBeDefined();
      expect(result.contract_reason).toContain("source file");
      expect(result.contract_reason).toContain("workflow file");
    });

    // -----------------------------------------------------------------------
    // Edge cases
    // -----------------------------------------------------------------------

    it("empty diff → low risk, no contract", () => {
      const result = evaluateContractRequirement({ changedPaths: [] });
      expect(result.risk_level).toBe("low");
      expect(result.contract_required).toBe(false);
    });

    it("Python pyproject.toml → high risk (execution surface)", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["pyproject.toml"],
      });
      expect(result.risk_level).toBe("high");
      expect(result.contract_required).toBe(true);
    });

    it("review_required from config → medium risk", () => {
      const result = evaluateContractRequirement({
        changedPaths: ["internal/core.ts"],
        reviewRequiredPaths: ["internal/**"],
      });
      expect(result.file_findings[0].bucket).toBe("review_required");
      expect(result.file_findings[0].risk_level).toBe("medium");
    });
  });
});
