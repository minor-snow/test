import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  cmdRepairAbandon,
  cmdRepairAudit,
  cmdRepairCheck,
  cmdRepairClose,
  cmdRepairIntake,
  cmdRepairPlan,
} from "../../src/cli/cmdRepair.js";
import { repairRunPaths } from "../../src/repair/repairArtifactLayout.js";
import { loadRepairSession } from "../../src/repair/session/repairSessionStore.js";

describe("cmdRepair", () => {
  const tmpDir = join("test", "cli", "__tmp_repair__");
  const fixtureDir = join("test", "fixtures", "repo_fixture");

  beforeEach(() => {
    safeRemoveDir(tmpDir);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(fixtureDir, tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "pantheon.json"), JSON.stringify({
      version: 1,
      protected: [".pantheon/**", ".cursor/**", ".git/**"],
      review_required: [],
      generated: [],
      path_roles: {},
    }, null, 2));
  });

  afterEach(() => {
    safeRemoveDir(tmpDir);
  });

  it("supports user-initiated repair planning and pass verdict for allowed-only diff", () => {
    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix formatting bug",
      suspectPaths: ["src/utils/format.ts"],
      failingTests: ["tests/utils/format.test.ts"],
      mustPreserve: ["Do not change auth behavior."],
    });

    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    const paths = repairRunPaths(tmpDir, session.repair_id);
    expect(existsSync(paths.contractRevision(1))).toBe(true);
    expect(existsSync(paths.task)).toBe(true);
    expect(existsSync(paths.scope)).toBe(true);
    expect(existsSync(paths.checklist)).toBe(true);

    const contract = JSON.parse(readFileSync(paths.contractLatest, "utf-8"));
    const task = readFileSync(paths.task, "utf-8");

    expect(contract.source.kind).toBe("user_bug_report");
    expect(contract.repair_scope.allowed.some((entry: { pattern: string }) => entry.pattern === "src/utils/format.ts")).toBe(true);
    expect(task).toContain("## Confirmed facts");
    expect(task).toContain("Do not change auth behavior.");

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      changedFilesOverride: ["src/utils/format.ts"],
    });

    const check = JSON.parse(readFileSync(paths.check, "utf-8"));
    expect(check.verdict).toBe("pass");
    expect(check.concurrent_findings).toEqual([]);
  });

  it("supports agent-initiated intake, keeps hypothesis out of confirmed facts, and applies revision-bound audits deterministically", () => {
    const reportPath = join(tmpDir, "agent_bug_report.json");
    writeFileSync(reportPath, JSON.stringify({
      schema_version: "agent_bug_report@0.1.0",
      report_id: "bug_report_auth_login",
      reported_by: {
        agent: "claude-code",
        session_id: "session-123",
      },
      summary: "Fix login auth regression",
      observed_behavior: "Login now rejects valid credentials.",
      expected_behavior: "Valid credentials should authenticate successfully.",
      evidence: [
        {
          kind: "failing_test",
          path: "test/auth/login.test.ts",
          test_name: "should authenticate valid user",
        },
        {
          kind: "code_observation",
          path: "src/auth/login.ts",
          summary: "Authentication flow is routed through login.ts",
        },
      ],
      suspected_files: [
        {
          path: "src/auth/login.ts",
          confidence: "medium",
          reason: "Contains the login path",
        },
      ],
      agent_hypothesis: "The login helper is delegating to the wrong validation path.",
      requested_action: "repair_analysis",
    }, null, 2));

    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      fromPath: reportPath,
    });

    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      targetRevision: 1,
      gate: "bug_intake",
      decision: "approve",
      reason: "The report has concrete evidence and a valid suspect file.",
      operatorId: "cat",
      addReview: [],
      addForbid: [],
      addMustPreserve: [],
    });

    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    const paths = repairRunPaths(tmpDir, session.repair_id);
    const finding = JSON.parse(readFileSync(paths.bugFinding, "utf-8"));
    const task = readFileSync(paths.task, "utf-8");

    expect(finding.confirmed_facts).not.toContain("The login helper is delegating to the wrong validation path.");
    expect(task).toContain("## Agent suspected cause");
    expect(task).toContain("The login helper is delegating to the wrong validation path.");

    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      targetRevision: 1,
      gate: "repair_plan",
      decision: "restrict_scope",
      reason: "Keep login changes under human review.",
      operatorId: "cat",
      addReview: ["src/auth/login.ts"],
      addForbid: [],
      addMustPreserve: ["Do not broaden authentication behavior."],
    });

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      changedFilesOverride: ["src/auth/login.ts"],
    });
    let check = JSON.parse(readFileSync(paths.check, "utf-8"));
    expect(check.verdict).toBe("requires_review");

    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      targetRevision: 2,
      gate: "repair_plan",
      decision: "add_forbidden_area",
      reason: "Login path should remain frozen until manual repair.",
      operatorId: "cat",
      addReview: [],
      addForbid: ["src/auth/login.ts"],
      addMustPreserve: [],
    });

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      changedFilesOverride: ["src/auth/login.ts"],
    });
    check = JSON.parse(readFileSync(paths.check, "utf-8"));
    expect(check.verdict).toBe("fail");

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      changedFilesOverride: ["README.md"],
    });
    check = JSON.parse(readFileSync(paths.check, "utf-8"));
    expect(check.verdict).toBe("requires_scope_expansion");

    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      targetRevision: 3,
      gate: "post_repair",
      decision: "approve",
      reason: "Keep the repair record and close the review.",
      operatorId: "cat",
      addReview: [],
      addForbid: [],
      addMustPreserve: [],
    });

    const contract = JSON.parse(readFileSync(paths.contractLatest, "utf-8"));
    expect(contract.audit_status).toBe("post_repair_reviewed");
    expect(contract.revision).toBe(4);
    expect(readFileSync(paths.feedback, "utf-8")).toContain("Repair Feedback");
    expect(readFileSync(paths.report, "utf-8")).toContain("Repair Report");
  });

  it("rejects stale audit decisions and leaves the contract revision unchanged", () => {
    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix formatting bug",
      suspectPaths: ["src/utils/format.ts"],
      failingTests: ["tests/utils/format.test.ts"],
      mustPreserve: [],
    });

    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      targetRevision: 1,
      gate: "repair_plan",
      decision: "restrict_scope",
      reason: "Review the suspect file first.",
      operatorId: "cat",
      addReview: ["src/utils/format.ts"],
      addForbid: [],
      addMustPreserve: [],
    });

    expect(() =>
      cmdRepairAudit({
        repoRoot: tmpDir,
        repairId: session.repair_id,
        targetRevision: 1,
        gate: "repair_plan",
        decision: "add_forbidden_area",
        reason: "This decision is stale.",
        operatorId: "cat",
        addReview: [],
        addForbid: ["src/utils/format.ts"],
        addMustPreserve: [],
      })
    ).toThrow(/stale_audit_decision/i);

    const contract = JSON.parse(readFileSync(repairRunPaths(tmpDir, session.repair_id).contractLatest, "utf-8"));
    expect(contract.revision).toBe(2);
  });

  it("supports --diff-json to provide synthetic diff", () => {
    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix formatting bug",
      suspectPaths: ["src/utils/format.ts"],
      failingTests: ["tests/utils/format.test.ts"],
      mustPreserve: [],
    });

    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    const diffJsonPath = join(tmpDir, "synthetic_diff.json");
    writeFileSync(diffJsonPath, JSON.stringify({
      schema_version: "synthetic_repair_diff@0.1.0",
      changed_files: [
        { path: "src/utils/format.ts", change_kind: "modified" },
        { path: "src/outside.ts", change_kind: "added" },
      ],
    }, null, 2));

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      diffJsonPath,
    });

    const paths = repairRunPaths(tmpDir, session.repair_id);
    const check = JSON.parse(readFileSync(paths.check, "utf-8"));
    expect(check.changed_files).toContain("src/utils/format.ts");
    expect(check.changed_files).toContain("src/outside.ts");
    expect(check.verdict).toBe("requires_scope_expansion");
  });

  it("keeps separate run directories and supports close/abandon without overwriting artifacts", () => {
    const first = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix formatting bug",
      suspectPaths: ["src/utils/format.ts"],
      failingTests: ["tests/utils/format.test.ts"],
      mustPreserve: [],
    });
    const second = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix login auth regression",
      suspectPaths: ["src/auth/login.ts"],
      failingTests: ["test/auth/login.test.ts"],
      mustPreserve: [],
    });

    expect(first.repair_id).not.toBe(second.repair_id);
    expect(existsSync(repairRunPaths(tmpDir, first.repair_id).dir)).toBe(true);
    expect(existsSync(repairRunPaths(tmpDir, second.repair_id).dir)).toBe(true);

    cmdRepairClose({
      repoRoot: tmpDir,
      repairId: first.repair_id,
      reason: "merged",
    });
    cmdRepairAbandon({
      repoRoot: tmpDir,
      repairId: second.repair_id,
      reason: "superseded",
    });

    expect(loadRepairSession(tmpDir, first.repair_id).status).toBe("closed");
    expect(loadRepairSession(tmpDir, second.repair_id).status).toBe("abandoned");
  });

  it("surfaces actual changed file overlap with another active repair", () => {
    const first = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix login auth regression",
      suspectPaths: ["src/auth/login.ts"],
      failingTests: ["test/auth/login.test.ts"],
      mustPreserve: [],
    });
    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: first.repair_id,
    });
    cmdRepairAudit({
      repoRoot: tmpDir,
      repairId: first.repair_id,
      targetRevision: 1,
      gate: "repair_plan",
      decision: "restrict_scope",
      reason: "Keep login changes under review.",
      operatorId: "cat",
      addReview: ["src/auth/login.ts"],
      addForbid: [],
      addMustPreserve: [],
    });

    const second = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix login retry bug",
      suspectPaths: ["src/auth/login.ts"],
      failingTests: ["test/auth/login.test.ts"],
      mustPreserve: [],
    });
    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: second.repair_id,
    });

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: second.repair_id,
      changedFilesOverride: ["src/auth/login.ts"],
    });

    const check = JSON.parse(readFileSync(repairRunPaths(tmpDir, second.repair_id).check, "utf-8"));
    expect(check.concurrent_findings.some((finding: { kind: string; other_repair_id?: string }) =>
      finding.kind === "actual_changed_file_overlap" && finding.other_repair_id === first.repair_id
    )).toBe(true);
    expect(check.verdict).toBe("requires_review");
  });

  it("returns requires_replan when the repository base changes after planning", () => {
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email pantheon@example.com", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.name Pantheon", { cwd: tmpDir, stdio: "pipe" });
    execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m initial", { cwd: tmpDir, stdio: "pipe" });

    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix formatting bug",
      suspectPaths: ["src/utils/format.ts"],
      failingTests: ["tests/utils/format.test.ts"],
      mustPreserve: [],
    });
    cmdRepairPlan({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    writeFileSync(join(tmpDir, "README.md"), "# updated\n");
    execSync("git add README.md", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit -m advance-head", { cwd: tmpDir, stdio: "pipe" });

    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
    });

    const check = JSON.parse(readFileSync(repairRunPaths(tmpDir, session.repair_id).check, "utf-8"));
    expect(check.verdict).toBe("requires_replan");
    expect(check.findings.some((finding: { kind: string }) => finding.kind === "stale_repair_contract")).toBe(true);
  });
});

function safeRemoveDir(target: string): void {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(target, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  rmSync(target, { recursive: true, force: true });
}
