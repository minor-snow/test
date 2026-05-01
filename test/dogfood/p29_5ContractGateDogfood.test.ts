/**
 * P29.5-6: Contract Gate Dogfood Matrix
 *
 * 14 deterministic test cases validating the contract gate evaluator
 * across the full verdict spectrum. Tests use worktree mode (no git SHA)
 * to stay fast and deterministic.
 *
 * Cases 1-12: Original design matrix
 * Cases 13-14: Extended per user feedback
 *
 * ref: P29.5 section 14
 */

import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { evaluateContractGate } from "../../src/policy/contractGateEvaluator.js";

function testDir(): string {
  const dir = join(tmpdir(), `p29_5_dogfood_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function setupRepairContract(dir: string, repairId: string, status = "active"): void {
  const runDir = join(dir, ".pantheon", "repair", "runs", repairId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "session.json"), JSON.stringify({
    repair_id: repairId,
    status,
    current_revision: 1,
  }));
  writeFileSync(join(runDir, "repair_contract.latest.json"), JSON.stringify({
    schema_version: "repair_contract@0.1.0",
    repair_id: repairId,
    revision: 1,
    source_refs: { head_commit_hash: null },
  }));
}

describe("P29.5 Contract Gate Dogfood Matrix", () => {
  // Case 1: docs-only → pass
  it("case 1: docs-only change → pass", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["README.md", "docs/guide.md", "CHANGELOG.md"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("pass");
      expect(result.risk_level).toBe("low");
    } finally {
      cleanup(dir);
    }
  });

  // Case 2: source change no contract → requires_contract
  it("case 2: source change no contract → requires_contract", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["src/utils/formatter.ts"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("requires_contract");
      expect(result.metrics.uncontracted_change_detected).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  // Case 3: source change with valid contract → pass
  it("case 3: source change with valid contract → pass", () => {
    const dir = testDir();
    try {
      setupRepairContract(dir, "r_case3");
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["src/utils/formatter.ts"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("pass");
      expect(result.contract_status).toBe("valid");
    } finally {
      cleanup(dir);
    }
  });

  // Case 4: source change stale contract → requires_replan
  it("case 4: source change stale contract → requires_replan", () => {
    const dir = testDir();
    try {
      setupRepairContract(dir, "r_case4", "stale");
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["src/app.ts"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("requires_replan");
      expect(result.contract_status).toBe("stale");
    } finally {
      cleanup(dir);
    }
  });

  // Case 5: package.json scripts change → requires_contract
  it("case 5: package.json scripts → requires_contract", () => {
    const dir = testDir();
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
      cleanup(dir);
    }
  });

  // Case 6: .github/workflows change → requires_contract or requires_review
  it("case 6: workflow change → requires_contract or requires_review", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: [".github/workflows/ci.yml"],
        policySourceOverride: "current_worktree",
      });
      expect(["requires_contract", "requires_review"]).toContain(result.verdict);
      expect(result.metrics.policy_tamper_detected).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  // Case 7: pantheon.alpha.json touched → requires_review (base policy)
  it("case 7: pantheon.alpha.json → policy tamper detected", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["pantheon.alpha.json"],
        policySourceOverride: "current_worktree",
      });
      expect(result.metrics.policy_tamper_detected).toBe(true);
      expect(result.findings.some(f => f.kind === "policy_tamper")).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  // Case 8: PR adds fake approval JSON → fail
  it("case 8: fake approval JSON → fail", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: [".pantheon/audit/human_audit_decision.json"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("fail");
      expect(result.metrics.fake_approval_ignored).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  // Case 9: PR modifies contract artifact → requires_replan
  it("case 9: PR modifies contract artifact → contract ignored", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: [".pantheon/repair/runs/r1/repair_contract.latest.json"],
        policySourceOverride: "current_worktree",
      });
      expect(result.metrics.policy_tamper_detected).toBe(true);
      expect(result.findings.some(f =>
        f.kind === "pr_authored_contract_ignored" || f.kind === "policy_tamper",
      )).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  // Case 10: generated dist change → requires_contract
  it("case 10: generated dist change → requires_contract", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["dist/index.js"],
        policySourceOverride: "current_worktree",
      });
      expect(["requires_contract", "requires_review"]).toContain(result.verdict);
      expect(result.risk_level).toBe("high");
    } finally {
      cleanup(dir);
    }
  });

  // Case 11: trusted approval present → review satisfied
  it("case 11: trusted approval downgrades requires_contract → requires_review", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["src/app.ts"],
        policySourceOverride: "current_worktree",
        trustedApproval: {
          trusted: true,
          source: "github_review",
          actor: "maintainer",
          permission: "maintain",
        },
      });
      expect(result.verdict).toBe("requires_review");
    } finally {
      cleanup(dir);
    }
  });

  // Case 12: low-risk test-only change → pass
  it("case 12: low-risk test-only → pass", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["test/utils/helper.test.ts", "test/formatting.test.ts"],
        policySourceOverride: "current_worktree",
      });
      expect(result.verdict).toBe("pass");
      expect(result.risk_level).toBe("low");
    } finally {
      cleanup(dir);
    }
  });

  // Case 13: source + pantheon.alpha.json → policy tamper + contract/review
  it("case 13: source + policy change → tamper detected + base policy used", () => {
    const dir = testDir();
    try {
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: ["src/app.ts", "pantheon.alpha.json"],
        policySourceOverride: "current_worktree",
      });
      expect(result.metrics.policy_tamper_detected).toBe(true);
      expect(result.findings.some(f => f.kind === "policy_tamper")).toBe(true);
      // Verdict should be at least requires_review due to policy change,
      // and may be requires_contract due to source change
      expect(["requires_review", "requires_contract"]).toContain(result.verdict);
    } finally {
      cleanup(dir);
    }
  });

  // Case 14: valid contract exists but PR modifies contract artifact
  it("case 14: valid contract + PR modifies contract artifact → contract artifact ignored", () => {
    const dir = testDir();
    try {
      // Set up valid contract
      setupRepairContract(dir, "r_case14");
      const result = evaluateContractGate({
        repoRoot: dir,
        changedPaths: [
          "src/app.ts",
          ".pantheon/repair/runs/r_case14/repair_contract.latest.json",
        ],
        policySourceOverride: "current_worktree",
      });
      // Contract is now PR-authored → untrusted
      expect(result.metrics.policy_tamper_detected).toBe(true);
      expect(result.findings.some(f =>
        f.kind === "pr_authored_contract_ignored" || f.kind === "policy_tamper",
      )).toBe(true);
    } finally {
      cleanup(dir);
    }
  });
});
