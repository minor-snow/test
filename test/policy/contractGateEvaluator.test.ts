import { describe, it, expect } from "vitest";
import { evaluateContractGate } from "../../src/policy/contractGateEvaluator.js";
import type { ContractGateInput } from "../../src/policy/contractGateEvaluator.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Contract gate evaluator tests.
 *
 * These tests use policySourceOverride: "current_worktree" to avoid
 * git SHA resolution, making them deterministic and fast.
 * The dogfood matrix (P29.5-6) will test real git integration.
 */

function makeTestDir(): string {
  const dir = join(tmpdir(), `pantheon-gate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

describe("contractGateEvaluator", () => {
  describe("evaluateContractGate", () => {
    // -----------------------------------------------------------------------
    // Basic verdict tests (no contract, no git)
    // -----------------------------------------------------------------------

    it("docs-only change → pass", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["README.md", "docs/guide.md"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("pass");
        expect(result.risk_level).toBe("low");
        expect(result.contract_status).toBe("missing"); // No contract exists, but not required
      } finally {
        cleanupTestDir(dir);
      }
    });

    it("source change without contract → requires_contract", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["src/app.ts"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("requires_contract");
        expect(result.risk_level).toBe("medium");
        expect(result.metrics.uncontracted_change_detected).toBe(true);
        expect(result.required_action.next.length).toBeGreaterThan(0);
      } finally {
        cleanupTestDir(dir);
      }
    });

    it("package.json change without contract → requires_contract", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["package.json"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("requires_contract");
        expect(result.risk_level).toBe("high");
        expect(result.metrics.high_risk_surface_touched).toBe(true);
      } finally {
        cleanupTestDir(dir);
      }
    });

    it("workflow change without contract → requires_contract", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: [".github/workflows/ci.yml"],
          policySourceOverride: "current_worktree",
        });
        // Workflow is high risk and also triggers tamper detection
        expect(["requires_contract", "requires_review"]).toContain(result.verdict);
        expect(result.metrics.policy_tamper_detected).toBe(true);
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Policy tamper
    // -----------------------------------------------------------------------

    it("pantheon.alpha.json touched → requires_review + policy_tamper", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["pantheon.alpha.json"],
          policySourceOverride: "current_worktree",
        });
        expect(result.metrics.policy_tamper_detected).toBe(true);
        expect(result.findings.some(f => f.kind === "policy_tamper")).toBe(true);
        // Policy changes always require review at minimum
        expect(["requires_review", "requires_contract"]).toContain(result.verdict);
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Fake approval
    // -----------------------------------------------------------------------

    it("fake approval JSON → fail", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: [".pantheon/audit/human_audit_decision.json"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("fail");
        expect(result.metrics.fake_approval_ignored).toBe(true);
        expect(result.findings.some(f => f.kind === "fake_approval_ignored")).toBe(true);
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Contract exists
    // -----------------------------------------------------------------------

    it("source change with valid repair contract → pass", () => {
      const dir = makeTestDir();
      try {
        // Set up a mock repair session and contract
        const repairId = "r_test_123";
        const runDir = join(dir, ".pantheon", "repair", "runs", repairId);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, "session.json"), JSON.stringify({
          repair_id: repairId,
          status: "active",
          current_revision: 1,
        }));
        writeFileSync(join(runDir, "repair_contract.latest.json"), JSON.stringify({
          schema_version: "repair_contract@0.1.0",
          repair_id: repairId,
          revision: 1,
          source_refs: { head_commit_hash: null },
        }));

        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["src/app.ts"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("pass");
        expect(result.contract_status).toBe("valid");
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Trusted approval
    // -----------------------------------------------------------------------

    it("source change with trusted approval → requires_review (downgraded from requires_contract)", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["src/app.ts"],
          policySourceOverride: "current_worktree",
          trustedApproval: {
            trusted: true,
            source: "github_review",
            actor: "trusted-maintainer",
            permission: "maintain",
          },
        });
        expect(result.verdict).toBe("requires_review");
      } finally {
        cleanupTestDir(dir);
      }
    });

    it("fake approval cannot be bypassed by trusted approval", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: [".pantheon/audit/human_audit_decision.json"],
          policySourceOverride: "current_worktree",
          trustedApproval: {
            trusted: true,
            source: "github_review",
            actor: "trusted-maintainer",
            permission: "admin",
          },
        });
        // Fake approval is always fail, even with trusted approval
        expect(result.verdict).toBe("fail");
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Gate disabled
    // -----------------------------------------------------------------------

    it("gate disabled → pass through", () => {
      const dir = makeTestDir();
      try {
        // Write config with gate disabled
        writeFileSync(join(dir, "pantheon.alpha.json"), JSON.stringify({
          contract_gate: { enabled: false },
        }));

        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["src/auth/login.ts"],
          policySourceOverride: "current_worktree",
        });
        expect(result.verdict).toBe("pass");
        expect(result.contract_status).toBe("not_required");
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Schema
    // -----------------------------------------------------------------------

    it("result has correct schema", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["README.md"],
          policySourceOverride: "current_worktree",
        });
        expect(result.schema).toBe("pantheon.contract_gate_result.v1");
      } finally {
        cleanupTestDir(dir);
      }
    });

    // -----------------------------------------------------------------------
    // Base policy missing
    // -----------------------------------------------------------------------

    it("missing base policy → still evaluates with conservative defaults", () => {
      const dir = makeTestDir();
      try {
        const result = evaluateContractGate({
          repoRoot: dir,
          changedPaths: ["src/app.ts"],
          policySourceOverride: "current_worktree",
        });
        expect(result.policy_source.status).toBe("missing");
        // Should still enforce contract requirement conservatively
        expect(result.verdict).toBe("requires_contract");
        expect(result.findings.some(f => f.kind === "base_policy_missing")).toBe(true);
      } finally {
        cleanupTestDir(dir);
      }
    });
  });
});
