import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { collectGitHubActionArtifacts } from "./githubArtifactCollector.js";
import { writeGitHubActionOutputs } from "./githubActionOutputs.js";
import { postOrUpdatePantheonComment } from "./githubCommentClient.js";
import { decideGitHubActionExit } from "./githubExitPolicy.js";
import { extractPullRequestContext, parseGitHubActionConfig } from "./githubInputParser.js";
import { renderGitHubPrComment, renderGitHubStepSummary } from "./githubPrCommentRenderer.js";
import { runGitHubRepairAction } from "./githubRepairRunner.js";
import type { GitHubActionRunResult } from "./githubActionTypes.js";
import type { GitHubRepairRunResult } from "./githubRepairTypes.js";
import type { PantheonCheckPublic } from "../cli/types.js";

export async function runGitHubAction(env: NodeJS.ProcessEnv = process.env): Promise<GitHubActionRunResult> {
  const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
  const config = parseGitHubActionConfig(env);
  const event = env.GITHUB_EVENT_PATH && existsSync(resolve(env.GITHUB_EVENT_PATH))
    ? JSON.parse(readFileSync(resolve(env.GITHUB_EVENT_PATH), "utf-8"))
    : null;
  const prContext = extractPullRequestContext(event);

  const cliEntry = resolveCliEntryPath(env);
  const guardArgs = [
    "guard",
    config.intent,
    "--repo",
    repoRoot,
    "--config",
    config.configPath,
    ...repeatFlag("--scope", config.scopePatterns),
    ...repeatFlag("--review", config.reviewPatterns),
    ...repeatFlag("--forbid", config.forbidPatterns),
  ];
  runCli(cliEntry, guardArgs, repoRoot);

  const checkArgs = [
    "check",
    "--repo",
    repoRoot,
    ...(config.baseSha ? ["--base", config.baseSha] : []),
  ];
  runCli(cliEntry, checkArgs, repoRoot);

  const checkPath = join(repoRoot, ".pantheon", "check.json");
  if (!existsSync(checkPath)) {
    throw new Error(`Pantheon did not produce .pantheon/check.json at ${checkPath}`);
  }
  const check = JSON.parse(readFileSync(checkPath, "utf-8")) as PantheonCheckPublic;
  const exitDecision = decideGitHubActionExit({ check, failOn: config.failOn });

  const artifactOutputDir = resolve(repoRoot, "pantheon-report");
  const artifactCollection = config.uploadArtifacts
    ? collectGitHubActionArtifacts({
        repoRoot,
        outputDir: artifactOutputDir,
        artifactMode: config.artifactMode,
      })
    : prepareActionOutputDir(artifactOutputDir);

  const comment = renderGitHubPrComment(check);
  const summary = renderGitHubStepSummary(check, {
    baseSha: config.baseSha,
    headSha: config.headSha,
  });

  const commentPath = join(artifactCollection.outputDir, "pr_comment.md");
  const summaryPath = env.GITHUB_STEP_SUMMARY ? resolve(env.GITHUB_STEP_SUMMARY) : null;
  writeFileSync(commentPath, comment.markdown);
  writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), summary.markdown);
  writeFileSync(join(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
    base_sha: config.baseSha ?? null,
    head_sha: config.headSha ?? null,
    diff_mode: config.baseSha ? "github_pr_base_sha" : "working_tree_fallback",
    fail_on: config.failOn,
    artifact_mode: config.artifactMode,
    artifacts_prepared: config.uploadArtifacts,
  }, null, 2));

  if (summaryPath) {
    mkdirSync(dirname(summaryPath), { recursive: true });
    writeFileSync(summaryPath, summary.markdown);
  }

  let commentResult = { status: "skipped", reason: "PR comment disabled." } as GitHubActionRunResult["commentResult"];
  if (config.postComment && config.commentMode !== "off") {
    commentResult = await postOrUpdatePantheonComment({
      prContext,
      githubToken: env.GITHUB_TOKEN,
      marker: comment.marker,
      markdown: comment.markdown,
      githubApiUrl: env.GITHUB_API_URL,
    });
  }

  return {
    config,
    prContext,
    check,
    exitDecision,
    artifactOutputDir: artifactCollection.outputDir,
    summaryPath,
    commentPath,
    commentResult,
  };
}

export async function runGitHubWorkflowAction(
  env: NodeJS.ProcessEnv = process.env,
): Promise<GitHubActionRunResult | GitHubRepairRunResult> {
  return resolveActionMode(env) === "repair"
    ? runGitHubRepairAction(env)
    : runGitHubAction(env);
}

async function main(): Promise<void> {
  try {
    const result = await runGitHubWorkflowAction(process.env);
    if ("repairId" in result) {
      writeGitHubActionOutputs(process.env, {
        repair_id: result.repairId,
        repair_verdict: result.verdict,
        artifact_dir: result.artifactOutputDirRelative,
        repair_feedback_path: result.repairFeedbackPath
          ? toWorkspaceRelative(process.env.GITHUB_WORKSPACE, result.repairFeedbackPath)
          : "",
        comment_status: normalizeCommentStatus(result.commentResult.status),
        sanitizer_violations: result.artifactCollection.sanitizerViolations.length,
      });
      logRepairSummary(result);
      process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
      return;
    }

    writeGitHubActionOutputs(process.env, {
      repair_id: "",
      repair_verdict: "",
      artifact_dir: relativeArtifactDir(process.env.GITHUB_WORKSPACE, result.artifactOutputDir),
      repair_feedback_path: "",
      comment_status: normalizeCommentStatus(result.commentResult.status),
      sanitizer_violations: 0,
    });
    logSummary(result);
    process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
  } catch (error) {
    console.error(`[Pantheon Action] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function runCli(cliEntry: string, args: string[], cwd: string): void {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    throw new Error(`Failed to execute Pantheon CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Pantheon CLI exited with status ${result.status}: ${args.join(" ")}`);
  }
}

function prepareActionOutputDir(outputDir: string): {
  outputDir: string;
  copiedPublicArtifacts: string[];
  copiedDebugArtifacts: string[];
} {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  return {
    outputDir,
    copiedPublicArtifacts: [],
    copiedDebugArtifacts: [],
  };
}

function resolveCliEntryPath(env: NodeJS.ProcessEnv): string {
  if (env.PANTHEON_CLI_ENTRY) return resolve(env.PANTHEON_CLI_ENTRY);
  return fileURLToPath(new URL("../cli/pantheon.js", import.meta.url));
}

function repeatFlag(flag: string, values: readonly string[]): string[] {
  return values.flatMap(value => [flag, value]);
}

function logSummary(result: GitHubActionRunResult): void {
  console.log(`[Pantheon Action] Verdict: ${result.check.verdict}`);
  console.log(`[Pantheon Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
  console.log(`[Pantheon Action] Artifacts: ${result.artifactOutputDir}`);
  console.log(`[Pantheon Action] Comment: ${result.commentResult.status}`);
  if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
    console.log(`[Pantheon Action] Comment warning: ${result.commentResult.reason}`);
  }
}

function logRepairSummary(result: GitHubRepairRunResult): void {
  console.log(`[Pantheon Repair Action] Verdict: ${result.verdict}`);
  console.log(`[Pantheon Repair Action] Repair ID: ${result.repairId}`);
  console.log(`[Pantheon Repair Action] Phase: ${result.runPhase}`);
  console.log(`[Pantheon Repair Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
  console.log(`[Pantheon Repair Action] Artifacts: ${result.artifactOutputDirRelative}`);
  console.log(`[Pantheon Repair Action] Comment: ${result.commentResult.status}`);
  if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
    console.log(`[Pantheon Repair Action] Comment warning: ${result.commentResult.reason}`);
  }
}

function resolveActionMode(env: NodeJS.ProcessEnv): "boundary" | "repair" {
  return env.INPUT_MODE === "repair" ? "repair" : "boundary";
}

function relativeArtifactDir(workspace: string | undefined, outputDir: string): string {
  return toWorkspaceRelative(workspace, outputDir);
}

function toWorkspaceRelative(workspace: string | undefined, targetPath: string): string {
  if (!workspace) return targetPath;
  const normalizedWorkspace = `${resolve(workspace).replace(/\\/g, "/")}/`;
  const normalizedTarget = resolve(targetPath).replace(/\\/g, "/");
  return normalizedTarget.startsWith(normalizedWorkspace)
    ? normalizedTarget.slice(normalizedWorkspace.length)
    : targetPath;
}

function normalizeCommentStatus(status: GitHubActionRunResult["commentResult"]["status"] | GitHubRepairRunResult["commentResult"]["status"]): "posted" | "skipped" | "failed" {
  if (status === "created" || status === "updated") return "posted";
  if (status === "failed") return "failed";
  return "skipped";
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await main();
}
