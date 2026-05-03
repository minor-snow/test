import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { collectGitHubActionArtifacts, sanitizeGeneratedGitHubArtifact, writeGitHubArtifactManifest } from "./githubArtifactCollector.js";
import { writeGitHubActionOutputs } from "./githubActionOutputs.js";
import { postOrUpdatePantheonComment } from "./githubCommentClient.js";
import { decideGitHubActionExit } from "./githubExitPolicy.js";
import { extractPullRequestContext, parseGitHubActionConfig } from "./githubInputParser.js";
import { renderGitHubPrComment, renderGitHubStepSummary, renderContractGatePrComment, renderContractGateStepSummary } from "./githubCommentRenderer.js";
import { runGitHubRepairAction } from "./githubRepairRunner.js";
import { runGitHubChangeAction } from "./githubChangeRunner.js";
import { evaluateContractGate } from "../policy/contractGateEvaluator.js";
import { readGitDiffSummary, extractChangedFilePaths } from "../diffWorkflow/gitDiffReader.js";
export async function runGitHubAction(env = process.env) {
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
    const check = JSON.parse(readFileSync(checkPath, "utf-8"));
    const artifactOutputDirRelative = "pantheon-report";
    const artifactCollection = config.uploadArtifacts
        ? collectGitHubActionArtifacts({
            repoRoot,
            outputDirRelative: artifactOutputDirRelative,
            artifactMode: config.artifactMode,
            includeArchitecture: true,
        })
        : prepareActionOutputDir(resolve(repoRoot, artifactOutputDirRelative));
    const comment = renderGitHubPrComment(check);
    const summary = renderGitHubStepSummary(check, {
        baseSha: config.baseSha,
        headSha: config.headSha,
    });
    const sanitizedComment = sanitizeGeneratedGitHubArtifact({
        target: "pr_comment.md",
        content: comment.markdown,
        artifactMode: config.artifactMode,
    });
    const sanitizedSummary = sanitizeGeneratedGitHubArtifact({
        target: "step_summary.md",
        content: summary.markdown,
        artifactMode: config.artifactMode,
    });
    const generatedViolations = [sanitizedComment.violation, sanitizedSummary.violation]
        .filter((violation) => violation !== null);
    const finalArtifactCollection = generatedViolations.length > 0 || sanitizedComment.withheld || sanitizedSummary.withheld
        ? {
            ...artifactCollection,
            withheldArtifacts: [
                ...artifactCollection.withheldArtifacts,
                ...(sanitizedComment.withheld ? ["pr_comment.md"] : []),
                ...(sanitizedSummary.withheld ? ["step_summary.md"] : []),
            ],
            sanitizerViolations: [
                ...artifactCollection.sanitizerViolations,
                ...generatedViolations,
            ],
        }
        : artifactCollection;
    const exitDecision = decideGitHubActionExit({
        verdict: check.verdict,
        failOn: config.failOn,
        sanitizerViolations: finalArtifactCollection.sanitizerViolations.length
    });
    const commentPath = join(artifactCollection.outputDir, "pr_comment.md");
    const summaryPath = env.GITHUB_STEP_SUMMARY ? resolve(env.GITHUB_STEP_SUMMARY) : null;
    writeFileSync(commentPath, sanitizedComment.content);
    writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), sanitizedSummary.content);
    writeFileSync(join(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
        base_sha: config.baseSha ?? null,
        head_sha: config.headSha ?? null,
        diff_mode: config.baseSha ? "github_pr_base_sha" : "working_tree_fallback",
        fail_on: config.failOn,
        artifact_mode: config.artifactMode,
        artifacts_prepared: config.uploadArtifacts,
    }, null, 2));
    if (config.uploadArtifacts) {
        writeGitHubArtifactManifest({
            outputDir: artifactCollection.outputDir,
            collection: finalArtifactCollection,
            metadata: { type: "boundary" },
        });
    }
    if (summaryPath) {
        mkdirSync(dirname(summaryPath), { recursive: true });
        writeFileSync(summaryPath, sanitizedSummary.content);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (config.postComment && config.commentMode !== "off") {
        commentResult = await postOrUpdatePantheonComment({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: sanitizedComment.content,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    return {
        config,
        prContext,
        check,
        exitDecision,
        artifactOutputDir: artifactCollection.outputDir,
        artifactCollection: finalArtifactCollection,
        summaryPath,
        commentPath,
        commentResult,
    };
}
export async function runGitHubWorkflowAction(env = process.env) {
    const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
    const mode = resolveActionMode(env);
    // 1. Contract Gate (P29.5) - Mandatory for all PR-triggered workflows
    const generalConfig = parseGitHubActionConfig(env);
    const diff = readGitDiffSummary({
        repoRoot,
        baseRef: generalConfig.baseSha ?? ""
    });
    const changedPaths = extractChangedFilePaths(diff);
    const gateResult = evaluateContractGate({
        repoRoot,
        changedPaths,
        baseSha: generalConfig.baseSha,
    });
    // If gate is blocking, short-circuit immediately
    if (isBlockingGateVerdict(gateResult.verdict)) {
        return runGitHubGateAction(env, gateResult, generalConfig);
    }
    // 2. Mode Dispatch
    if (mode === "repair")
        return runGitHubRepairAction(env);
    if (mode === "change")
        return runGitHubChangeAction(env);
    // Standard Boundary mode
    return runGitHubAction(env);
}
async function runGitHubGateAction(env, gateResult, config) {
    const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
    const event = env.GITHUB_EVENT_PATH && existsSync(resolve(env.GITHUB_EVENT_PATH))
        ? JSON.parse(readFileSync(resolve(env.GITHUB_EVENT_PATH), "utf-8"))
        : null;
    const prContext = extractPullRequestContext(event);
    const artifactOutputDirRelative = "pantheon-report";
    const artifactCollection = prepareActionOutputDir(resolve(repoRoot, artifactOutputDirRelative));
    const comment = renderContractGatePrComment(gateResult);
    const summary = renderContractGateStepSummary(gateResult);
    const sanitizedComment = sanitizeGeneratedGitHubArtifact({
        target: "pr_comment.md",
        content: comment.markdown,
        artifactMode: config.artifactMode,
    });
    const sanitizedSummary = sanitizeGeneratedGitHubArtifact({
        target: "step_summary.md",
        content: summary.markdown,
        artifactMode: config.artifactMode,
    });
    const generatedViolations = [sanitizedComment.violation, sanitizedSummary.violation]
        .filter((violation) => violation !== null);
    const finalArtifactCollection = generatedViolations.length > 0 || sanitizedComment.withheld || sanitizedSummary.withheld
        ? {
            ...artifactCollection,
            withheldArtifacts: [
                ...artifactCollection.withheldArtifacts,
                ...(sanitizedComment.withheld ? ["pr_comment.md"] : []),
                ...(sanitizedSummary.withheld ? ["step_summary.md"] : []),
            ],
            sanitizerViolations: [
                ...artifactCollection.sanitizerViolations,
                ...generatedViolations,
            ],
        }
        : artifactCollection;
    const exitDecision = decideGitHubActionExit({
        verdict: gateResult.verdict,
        failOn: config.failOn,
        sanitizerViolations: finalArtifactCollection.sanitizerViolations.length
    });
    const commentPath = join(artifactCollection.outputDir, "pr_comment.md");
    const summaryPath = env.GITHUB_STEP_SUMMARY ? resolve(env.GITHUB_STEP_SUMMARY) : null;
    writeFileSync(commentPath, sanitizedComment.content);
    writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), sanitizedSummary.content);
    writeFileSync(join(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
        base_sha: config.baseSha ?? null,
        head_sha: config.headSha ?? null,
        diff_mode: config.baseSha ? "github_pr_base_sha" : "working_tree_fallback",
        fail_on: config.failOn,
        artifact_mode: config.artifactMode,
        artifacts_prepared: true,
        gate_short_circuit: true,
    }, null, 2));
    writeGitHubArtifactManifest({
        outputDir: artifactCollection.outputDir,
        collection: finalArtifactCollection,
        metadata: { type: "contract_gate" },
    });
    if (summaryPath) {
        mkdirSync(dirname(summaryPath), { recursive: true });
        writeFileSync(summaryPath, sanitizedSummary.content);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (config.postComment && config.commentMode !== "off") {
        commentResult = await postOrUpdatePantheonComment({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: sanitizedComment.content,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    return {
        config,
        prContext,
        gateResult,
        exitDecision,
        artifactOutputDir: artifactCollection.outputDir,
        artifactCollection: finalArtifactCollection,
        summaryPath,
        commentPath,
        commentResult,
    };
}
function isBlockingGateVerdict(verdict) {
    return verdict === "fail" || verdict === "requires_contract" || verdict === "requires_replan";
}
async function main() {
    const env = process.env;
    try {
        const result = await runGitHubWorkflowAction(env);
        // Handle Gate result (Short-circuit)
        if ("gateResult" in result && !("check" in result)) {
            writeGitHubActionOutputs(env, {
                repair_id: "",
                repair_verdict: "",
                change_id: "",
                change_verdict: "",
                artifact_dir: relativeArtifactDir(env.GITHUB_WORKSPACE, result.artifactOutputDir),
                repair_feedback_path: "",
                comment_status: normalizeCommentStatus(result.commentResult.status),
                sanitizer_violations: result.artifactCollection?.sanitizerViolations?.length ?? 0,
            });
            console.log(`[Pantheon Gate] Verdict: ${result.gateResult.verdict}`);
            process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
            return;
        }
        if ("repairId" in result) {
            writeGitHubActionOutputs(env, {
                repair_id: result.repairId,
                repair_verdict: result.verdict,
                change_id: "",
                change_verdict: "",
                artifact_dir: result.artifactOutputDirRelative,
                repair_feedback_path: result.repairFeedbackPath
                    ? toWorkspaceRelative(env.GITHUB_WORKSPACE, result.repairFeedbackPath)
                    : "",
                comment_status: normalizeCommentStatus(result.commentResult.status),
                sanitizer_violations: result.artifactCollection.sanitizerViolations.length,
            });
            logRepairSummary(result);
            process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
            return;
        }
        if ("changeId" in result) {
            writeGitHubActionOutputs(env, {
                repair_id: "",
                repair_verdict: "",
                change_id: result.changeId,
                change_verdict: result.check.verdict,
                artifact_dir: relativeArtifactDir(env.GITHUB_WORKSPACE, result.artifactOutputDir),
                repair_feedback_path: "",
                comment_status: normalizeCommentStatus(result.commentResult.status),
                sanitizer_violations: result.artifactCollection?.sanitizerViolations?.length ?? 0,
            });
            logChangeSummary(result);
            process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
            return;
        }
        writeGitHubActionOutputs(env, {
            repair_id: "",
            repair_verdict: "",
            change_id: "",
            change_verdict: "",
            artifact_dir: relativeArtifactDir(env.GITHUB_WORKSPACE, result.artifactOutputDir),
            repair_feedback_path: "",
            comment_status: normalizeCommentStatus(result.commentResult.status),
            sanitizer_violations: result.artifactCollection?.sanitizerViolations?.length ?? 0,
        });
        logSummary(result);
        process.exitCode = result.exitDecision.shouldFail ? 1 : 0;
    }
    catch (error) {
        console.error(`[Pantheon Action] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
function runCli(cliEntry, args, cwd) {
    const result = spawnSync(process.execPath, [cliEntry, ...args], {
        cwd,
        encoding: "utf-8",
        stdio: ["inherit", "pipe", "pipe"],
    });
    if (result.stdout)
        process.stdout.write(result.stdout);
    if (result.stderr)
        process.stderr.write(result.stderr);
    if (result.error) {
        throw new Error(`Failed to execute Pantheon CLI: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`Pantheon CLI exited with status ${result.status}: ${args.join(" ")}`);
    }
}
function prepareActionOutputDir(outputDir) {
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    return {
        outputDir,
        outputDirRelative: "pantheon-report",
        copiedPublicArtifacts: [],
        copiedDebugArtifacts: [],
        withheldArtifacts: [],
        sanitizerViolations: [],
    };
}
function resolveCliEntryPath(env) {
    const candidates = [
        env.PANTHEON_CLI_ENTRY ? resolve(env.PANTHEON_CLI_ENTRY) : null,
        resolve(env.GITHUB_WORKSPACE ?? process.cwd(), "dist", "src", "cli", "pantheon.js"),
        resolve(process.cwd(), "dist", "src", "cli", "pantheon.js"),
    ].filter((candidate) => candidate !== null);
    const cliEntry = candidates.find(candidate => existsSync(candidate));
    if (!cliEntry) {
        throw new Error("Pantheon CLI entry not found. Set PANTHEON_CLI_ENTRY or include dist/src/cli/pantheon.js in the repository.");
    }
    return cliEntry;
}
function repeatFlag(flag, values) {
    return values.flatMap(value => [flag, value]);
}
function logSummary(result) {
    console.log(`[Pantheon Action] Verdict: ${result.check.verdict}`);
    console.log(`[Pantheon Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
    console.log(`[Pantheon Action] Artifacts: ${result.artifactOutputDir}`);
    console.log(`[Pantheon Action] Comment: ${result.commentResult.status}`);
    if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
        console.log(`[Pantheon Action] Comment warning: ${result.commentResult.reason}`);
    }
}
function logRepairSummary(result) {
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
function logChangeSummary(result) {
    console.log(`[Pantheon Change Action] Verdict: ${result.check.verdict}`);
    console.log(`[Pantheon Change Action] Change ID: ${result.changeId}`);
    console.log(`[Pantheon Change Action] Type: ${result.changeType}`);
    console.log(`[Pantheon Change Action] Fail decision: ${result.exitDecision.shouldFail ? "fail" : "pass"}`);
    console.log(`[Pantheon Change Action] Artifacts: ${result.artifactOutputDir}`);
    console.log(`[Pantheon Change Action] Comment: ${result.commentResult.status}`);
    if ((result.commentResult.status === "failed" || result.commentResult.status === "skipped") && result.commentResult.reason) {
        console.log(`[Pantheon Change Action] Comment warning: ${result.commentResult.reason}`);
    }
}
function resolveActionMode(env) {
    if (env.INPUT_MODE === "change")
        return "change";
    if (env.INPUT_MODE === "repair")
        return "repair";
    return "boundary";
}
function relativeArtifactDir(workspace, outputDir) {
    return toWorkspaceRelative(workspace, outputDir);
}
function toWorkspaceRelative(workspace, targetPath) {
    if (!workspace)
        return targetPath;
    const normalizedWorkspace = `${resolve(workspace).replace(/\\/g, "/")}/`;
    const normalizedTarget = resolve(targetPath).replace(/\\/g, "/");
    return normalizedTarget.startsWith(normalizedWorkspace)
        ? normalizedTarget.slice(normalizedWorkspace.length)
        : targetPath;
}
function normalizeCommentStatus(status) {
    if (status === "created" || status === "updated")
        return "posted";
    if (status === "failed")
        return "failed";
    return "skipped";
}
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
    await main();
}
//# sourceMappingURL=githubActionEntry.js.map