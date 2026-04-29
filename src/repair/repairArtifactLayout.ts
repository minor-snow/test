import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ensurePantheonDirs, resolvePantheonDir } from "../cli/artifactLayout.js";

export type RepairRootPaths = {
  readonly dir: string;
  readonly runsDir: string;
  readonly sessionsIndex: string;
  readonly latestPointer: string;
  readonly globalLock: string;
};

export type RepairRunPaths = {
  readonly root: RepairRootPaths;
  readonly repairId: string;
  readonly dir: string;
  readonly lock: string;
  readonly session: string;
  readonly agentBugReport: string;
  readonly userBugReport: string;
  readonly bugFinding: string;
  readonly contractLatest: string;
  readonly relationGraph: string;
  readonly task: string;
  readonly scope: string;
  readonly checklist: string;
  readonly auditLog: string;
  readonly syntheticDiff: string;
  readonly check: string;
  readonly report: string;
  readonly feedback: string;
  readonly caseResult: string;
  readonly contractRevision: (revision: number) => string;
  readonly humanAuditDecision: (decisionId: string) => string;
};

export type RepairPaths = {
  dir: string;
  agentBugReport: string;
  userBugReport: string;
  bugFinding: string;
  contract: string;
  relationGraph: string;
  task: string;
  scope: string;
  checklist: string;
  auditLog: string;
  syntheticDiff: string;
  check: string;
  report: string;
  feedback: string;
  caseResult: string;
};

export function repairPaths(repoRoot: string): RepairPaths {
  const dir = resolveRepairDir(repoRoot);
  return {
    dir,
    agentBugReport: join(dir, "agent_bug_report.json"),
    userBugReport: join(dir, "user_bug_report.json"),
    bugFinding: join(dir, "bug_finding.json"),
    contract: join(dir, "repair_contract.json"),
    relationGraph: join(dir, "repair_relation_graph.json"),
    task: join(dir, "repair_task.md"),
    scope: join(dir, "repair_scope.md"),
    checklist: join(dir, "consistency_checklist.md"),
    auditLog: join(dir, "repair_audit_log.jsonl"),
    syntheticDiff: join(dir, "synthetic_diff.json"),
    check: join(dir, "repair_check.json"),
    report: join(dir, "repair_report.md"),
    feedback: join(dir, "repair_feedback.md"),
    caseResult: join(dir, "case_result.json"),
  };
}

export function ensureRepairDirs(repoRoot: string): void {
  ensurePantheonDirs(repoRoot);
  const root = repairRootPaths(repoRoot);
  mkdirSync(root.dir, { recursive: true });
  mkdirSync(root.runsDir, { recursive: true });
}

export function resolveRepairDir(repoRoot: string): string {
  return join(resolvePantheonDir(repoRoot), "repair");
}

export function repairRootPaths(repoRoot: string): RepairRootPaths {
  const dir = resolveRepairDir(repoRoot);
  return {
    dir,
    runsDir: join(dir, "runs"),
    sessionsIndex: join(dir, "sessions.json"),
    latestPointer: join(dir, "latest"),
    globalLock: join(dir, ".lock"),
  };
}

export function repairRunPaths(repoRoot: string, repairId: string): RepairRunPaths {
  const root = repairRootPaths(repoRoot);
  const dir = join(root.runsDir, repairId);
  return {
    root,
    repairId,
    dir,
    lock: join(dir, ".lock"),
    session: join(dir, "session.json"),
    agentBugReport: join(dir, "agent_bug_report.json"),
    userBugReport: join(dir, "user_bug_report.json"),
    bugFinding: join(dir, "bug_finding.json"),
    contractLatest: join(dir, "repair_contract.latest.json"),
    relationGraph: join(dir, "repair_relation_graph.json"),
    task: join(dir, "repair_task.md"),
    scope: join(dir, "repair_scope.md"),
    checklist: join(dir, "consistency_checklist.md"),
    auditLog: join(dir, "repair_audit_log.jsonl"),
    syntheticDiff: join(dir, "synthetic_diff.json"),
    check: join(dir, "repair_check.json"),
    report: join(dir, "repair_report.md"),
    feedback: join(dir, "repair_feedback.md"),
    caseResult: join(dir, "case_result.json"),
    contractRevision: (revision: number) => join(dir, `repair_contract.v${revision}.json`),
    humanAuditDecision: (decisionId: string) => join(dir, `human_audit_decision_${decisionId}.json`),
  };
}
