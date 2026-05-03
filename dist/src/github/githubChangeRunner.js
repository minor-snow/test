import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { getChangeCheckPath, getChangeContractPath } from "../change/changeArtifactLayout.js";
import { collectGitHubActionArtifacts, sanitizeGeneratedGitHubArtifact, writeGitHubArtifactManifest } from "./githubArtifactCollector.js";
import { renderChangePrComment, renderChangeStepSummary } from "./githubCommentRenderer.js";
import { postOrUpdatePantheonComment } from "./githubCommentClient.js";
import { decideGitHubActionExit } from "./githubExitPolicy.js";
import { parseGitHubChangeInputs } from "./githubInputParser.js";
export async function runGitHubChangeAction(env = process.env) {
    const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
    const { inputs, prContext } = parseGitHubChangeInputs(env);
    const cliEntry = resolveCliEntryPath(env);
    const checkArgs = [
        "change",
        "check",
        "--change-id",
        inputs.changeId,
        ...(inputs.baseSha ? ["--base", inputs.baseSha] : []),
    ];
    const cliResult = runCli(cliEntry, checkArgs, repoRoot);
    const checkPath = getChangeCheckPath(repoRoot, inputs.changeId);
    if (!existsSync(checkPath)) {
        throw new Error(`Pantheon change check did not produce check.json at ${checkPath} (exit status: ${cliResult.status ?? "unknown"})`);
    }
    const check = JSON.parse(readFileSync(checkPath, "utf-8"));
    const contract = loadChangeContract(repoRoot, inputs.changeId);
    const artifactOutputDirRelative = "pantheon-report";
    const artifactCollection = inputs.uploadArtifacts
        ? collectGitHubActionArtifacts({
            repoRoot,
            outputDirRelative: artifactOutputDirRelative,
            artifactMode: inputs.artifactMode,
            changeId: inputs.changeId,
            includeArchitecture: true,
        })
        : prepareActionOutputDir(resolve(repoRoot, artifactOutputDirRelative));
    const comment = renderChangePrComment(check, {
        baseSha: inputs.baseSha,
        headSha: inputs.headSha,
        type: contract?.change_type ?? "unknown",
    });
    const summary = renderChangeStepSummary(check, {
        baseSha: inputs.baseSha,
        headSha: inputs.headSha,
        type: contract?.change_type ?? "unknown",
    });
    const sanitizedComment = sanitizeGeneratedGitHubArtifact({
        target: "pr_comment.md",
        content: comment.markdown,
        artifactMode: inputs.artifactMode,
    });
    const sanitizedSummary = sanitizeGeneratedGitHubArtifact({
        target: "step_summary.md",
        content: summary.markdown,
        artifactMode: inputs.artifactMode,
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
    if (inputs.uploadArtifacts) {
        writeGitHubArtifactManifest({
            outputDir: artifactCollection.outputDir,
            collection: finalArtifactCollection,
            metadata: { change_id: inputs.changeId, type: "change" },
        });
    }
    const exitDecision = decideGitHubActionExit({
        verdict: check.verdict,
        sanitizerViolations: finalArtifactCollection.sanitizerViolations.length,
        failOn: inputs.failOn,
    });
    const commentPath = join(artifactCollection.outputDir, "pr_comment.md");
    const summaryPath = env.GITHUB_STEP_SUMMARY ? resolve(env.GITHUB_STEP_SUMMARY) : null;
    writeFileSync(commentPath, sanitizedComment.content);
    writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), sanitizedSummary.content);
    writeFileSync(join(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
        base_sha: inputs.baseSha ?? null,
        head_sha: inputs.headSha ?? null,
        diff_mode: inputs.baseSha ? "github_pr_base_sha" : "working_tree_fallback",
        fail_on: inputs.failOn,
        artifact_mode: inputs.artifactMode,
        artifacts_prepared: inputs.uploadArtifacts,
        change_id: inputs.changeId,
        base_architecture_contract_source: inputs.baseSha
            ? `base_branch:${inputs.baseSha}`
            : "working_tree_fallback",
    }, null, 2));
    if (summaryPath) {
        mkdirSync(dirname(summaryPath), { recursive: true });
        writeFileSync(summaryPath, sanitizedSummary.content);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (inputs.postComment && inputs.commentMode !== "off") {
        commentResult = await postOrUpdatePantheonComment({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: sanitizedComment.content,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    return {
        inputs,
        prContext,
        check,
        changeId: inputs.changeId,
        changeType: contract?.change_type ?? "unknown",
        exitDecision,
        artifactOutputDir: artifactCollection.outputDir,
        artifactCollection: finalArtifactCollection,
        summaryPath,
        commentPath,
        commentResult,
    };
}
function loadChangeContract(repoRoot, changeId) {
    const path = getChangeContractPath(repoRoot, changeId, "latest");
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null;
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
    return { status: result.status };
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
//# sourceMappingURL=githubChangeRunner.js.map