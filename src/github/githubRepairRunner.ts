import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  cmdRepairAudit,
  cmdRepairCheck,
  cmdRepairIntake,
  cmdRepairPlan,
} from "../cli/cmdRepair.js";
import { postOrUpdatePantheonComment } from "./githubCommentClient.js";
import { renderGitHubRepairComment } from "./githubRepairCommentRenderer.js";
import { collectGitHubRepairArtifacts, writeGitHubRepairSupportArtifacts } from "./githubRepairArtifactCollector.js";
import { decideGitHubRepairExit } from "./githubRepairExitPolicy.js";
import { parseGitHubRepairInputs } from "./githubRepairInputParser.js";
import { renderGitHubRepairStepSummary } from "./githubRepairStepSummaryRenderer.js";
import type { BugFinding, RepairCheck, RepairContract, RepairSourceReport, RepairVerdict } from "../repair/types.js";
import { repairRunPaths } from "../repair/repairArtifactLayout.js";
import { readJsonFile } from "../repair/repairUtils.js";
import { loadRepairSession } from "../repair/session/repairSessionStore.js";
import type { RepairSession } from "../repair/session/repairSessionTypes.js";
import type { GitHubRepairRunPhase, GitHubRepairRunResult } from "./githubRepairTypes.js";
import { appendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";

export async function runGitHubRepairAction(env: NodeJS.ProcessEnv = process.env): Promise<GitHubRepairRunResult> {
  const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
  const { inputs, prContext } = parseGitHubRepairInputs(env);

  const session = resolveRepairSession(repoRoot, inputs);
  const repairId = session.repair_id;
  let runPhase: GitHubRepairRunPhase = "checked";

  if (inputs.sourceKind === "agent_bug_report" || inputs.sourceKind === "inline_action_inputs") {
    const latestSession = loadRepairSession(repoRoot, repairId);
    const finding = loadBugFinding(repoRoot, repairId);

    if (finding.status !== "accepted" || inputs.auditMode === "require_all") {
      runPhase = "intake_pending_audit";
    } else {
      cmdRepairPlan({
        repoRoot,
        repairId,
        configPath: inputs.configPath,
        overrideBaseSha: inputs.baseSha,
        overrideHeadSha: inputs.headSha,
        overrideCheckoutSha: env.GITHUB_SHA,
        overrideSource: "github_pull_request",
        sourceOverride: "github_action",
      });
      if (inputs.auditMode === "require_plan_approval") {
        runPhase = "plan_pending_audit";
      } else {
        const currentSession = loadRepairSession(repoRoot, repairId);
        cmdRepairAudit({
          repoRoot,
          repairId,
          targetRevision: currentSession.current_revision,
          gate: "repair_plan",
          decision: "approve",
          reason: "Auto-approved by GitHub repair mode (audit_mode=auto).",
          operatorId: "github-action",
          addReview: [],
          addForbid: [],
          addMustPreserve: [],
        });
        runPhase = "checked";
      }
    }

    if (runPhase === "checked") {
      cmdRepairCheck({
        repoRoot,
        repairId,
        baseRef: inputs.baseSha,
        sourceOverride: "github_action",
        prNumber: prContext?.prNumber,
        prBaseSha: inputs.baseSha,
        prHeadSha: inputs.headSha,
      });
    }

    if (runPhase !== "checked" && latestSession.status === "intake_rejected") {
      runPhase = "intake_pending_audit";
    }
  } else {
    cmdRepairCheck({
      repoRoot,
      repairId,
      baseRef: inputs.baseSha,
      sourceOverride: "github_action",
      prNumber: prContext?.prNumber,
      prBaseSha: inputs.baseSha,
      prHeadSha: inputs.headSha,
    });
    runPhase = "checked";
  }

  const sessionAfterRun = loadRepairSession(repoRoot, repairId);
  const report = loadStoredRepairReport(repoRoot, repairId);
  const finding = loadBugFinding(repoRoot, repairId);
  const contract = loadOptionalContract(repoRoot, repairId, sessionAfterRun.current_revision);
  const check = runPhase === "checked" ? loadOptionalCheck(repoRoot, repairId) : null;
  const verdict = deriveRunVerdict(runPhase, check, sessionAfterRun);

  const artifactCollection = collectGitHubRepairArtifacts({
    repoRoot,
    repairId,
    artifactMode: inputs.artifactMode,
  });
  if (artifactCollection.sanitizerViolations.length > 0) {
    appendGovernanceEvent(repoRoot, {
      schema_version: "pantheon_governance_event@0.1.0",
      event_id: `gov_${repairId}_github_sanitizer_${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      source: "github_action",
      event_type: "artifact_sanitizer_violation",
      repair_id: repairId,
      contract_revision: contract?.revision,
      pr: prContext ? {
        provider: "github",
        number: prContext.prNumber,
        base_sha: inputs.baseSha,
        head_sha: inputs.headSha,
      } : undefined,
      verdict: "fail",
      attention_level: "urgent",
      sanitizer_violations: artifactCollection.sanitizerViolations.length,
      artifact_dir: artifactCollection.outputDirRelative,
      reasons: [{
        kind: "artifact_sanitizer_violation",
        action: "block_merge",
      }],
    });
  }
  const exitDecision = decideGitHubRepairExit({
    verdict,
    sanitizerViolations: artifactCollection.sanitizerViolations.length,
    failOn: inputs.failOn,
  });

  const preliminaryResult = {
    inputs,
    prContext,
    repairId,
    runPhase,
    verdict,
    sourceKind: inputs.sourceKind,
    session: sessionAfterRun,
    report,
    finding,
    contract,
    check,
    artifactCollection,
    artifactOutputDir: artifactCollection.outputDir,
    artifactOutputDirRelative: artifactCollection.outputDirRelative,
    summaryPath: env.GITHUB_STEP_SUMMARY ? resolve(env.GITHUB_STEP_SUMMARY) : null,
    commentPath: join(artifactCollection.outputDir, "pr_comment.md"),
    repairFeedbackPath: existsSync(join(artifactCollection.outputDir, "repair_feedback.md"))
      ? join(artifactCollection.outputDir, "repair_feedback.md")
      : null,
    exitDecision,
    commentResult: { status: "skipped", reason: "PR comment not attempted yet." } as GitHubRepairRunResult["commentResult"],
  } satisfies Omit<GitHubRepairRunResult, "commentResult"> & {
    commentResult: GitHubRepairRunResult["commentResult"];
  };

  const summary = renderGitHubRepairStepSummary(preliminaryResult);
  writeGitHubRepairSupportArtifacts({
    outputDir: artifactCollection.outputDir,
    summaryMarkdown: summary.markdown,
    artifactCollection,
    repairId,
    verdict,
  });
  const comment = renderGitHubRepairComment(preliminaryResult);
  writeFileSync(preliminaryResult.commentPath, comment.markdown);
  writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), summary.markdown);

  if (preliminaryResult.summaryPath) {
    mkdirSync(dirname(preliminaryResult.summaryPath), { recursive: true });
    writeFileSync(preliminaryResult.summaryPath, summary.markdown);
  }

  let commentResult = { status: "skipped", reason: "PR comment disabled." } as GitHubRepairRunResult["commentResult"];
  if (inputs.postComment) {
    commentResult = await postOrUpdatePantheonComment({
      prContext,
      githubToken: env.GITHUB_TOKEN,
      marker: comment.marker,
      markdown: comment.markdown,
      githubApiUrl: env.GITHUB_API_URL,
    });
  }

  writeGitHubRepairSupportArtifacts({
    outputDir: artifactCollection.outputDir,
    summaryMarkdown: summary.markdown,
    artifactCollection,
    repairId,
    verdict,
    commentStatus: commentResult.status,
    commentReason: "reason" in commentResult ? commentResult.reason : undefined,
  });

  return {
    ...preliminaryResult,
    commentResult,
  };
}

function resolveRepairSession(
  repoRoot: string,
  inputs: ReturnType<typeof parseGitHubRepairInputs>["inputs"],
): RepairSession {
  if (inputs.sourceKind === "existing_repair_id") {
    return loadRepairSession(repoRoot, inputs.repairId!);
  }

  if (inputs.sourceKind === "agent_bug_report") {
    return cmdRepairIntake({
      repoRoot,
      fromPath: resolve(repoRoot, inputs.agentBugReport!),
      agentId: "github-action",
      operatorId: "github-action",
    });
  }

  return cmdRepairIntake({
    repoRoot,
    intent: inputs.repairIntent,
    suspectPaths: [...inputs.suspectPaths],
    failingTests: [...inputs.failingTests],
    mustPreserve: [...inputs.mustPreserve],
    operatorId: "github-action",
  });
}

function loadStoredRepairReport(repoRoot: string, repairId: string): RepairSourceReport {
  const runPaths = repairRunPaths(repoRoot, repairId);
  if (existsSync(runPaths.agentBugReport)) {
    return readJsonFile<RepairSourceReport>(runPaths.agentBugReport);
  }
  if (existsSync(runPaths.userBugReport)) {
    return readJsonFile<RepairSourceReport>(runPaths.userBugReport);
  }
  throw new Error(`No repair report found for ${repairId}.`);
}

function loadBugFinding(repoRoot: string, repairId: string): BugFinding {
  const runPaths = repairRunPaths(repoRoot, repairId);
  if (!existsSync(runPaths.bugFinding)) {
    throw new Error(`No bug finding found for ${repairId}.`);
  }
  return readJsonFile<BugFinding>(runPaths.bugFinding);
}

function loadOptionalContract(repoRoot: string, repairId: string, revision: number): RepairContract | null {
  if (revision < 1) return null;
  const path = repairRunPaths(repoRoot, repairId).contractRevision(revision);
  return existsSync(path) ? readJsonFile<RepairContract>(path) : null;
}

function loadOptionalCheck(repoRoot: string, repairId: string): RepairCheck | null {
  const path = repairRunPaths(repoRoot, repairId).check;
  return existsSync(path) ? readJsonFile<RepairCheck>(path) : null;
}

function deriveRunVerdict(
  runPhase: GitHubRepairRunPhase,
  check: RepairCheck | null,
  session: RepairSession,
): RepairVerdict {
  if (check) return check.verdict;
  if (runPhase === "checked") return "pass";
  if (session.status === "intake_rejected") return "fail";
  return "requires_review";
}
