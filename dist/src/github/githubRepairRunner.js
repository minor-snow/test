import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cmdRepairAudit, cmdRepairCheck, cmdRepairIntake, cmdRepairPlan, } from "../cli/cmdRepair.js";
import { postOrUpdatePantheonComment } from "./githubCommentClient.js";
import { renderGitHubRepairComment, renderGitHubRepairStepSummary } from "./githubCommentRenderer.js";
import { collectGitHubActionArtifacts, sanitizeGeneratedGitHubArtifact, writeGitHubArtifactManifest } from "./githubArtifactCollector.js";
import { decideGitHubActionExit } from "./githubExitPolicy.js";
import { parseGitHubRepairInputs } from "./githubInputParser.js";
import { repairRunPaths } from "../repair/repairArtifactLayout.js";
import { readJsonFile } from "../repair/repairUtils.js";
import { loadRepairSession } from "../repair/session/repairSessionStore.js";
import { tryAppendGovernanceEvent } from "../governanceLog/governanceEventWriter.js";
export async function runGitHubRepairAction(env = process.env) {
    const repoRoot = resolve(env.GITHUB_WORKSPACE ?? process.cwd());
    const { inputs, prContext } = parseGitHubRepairInputs(env);
    const session = resolveRepairSession(repoRoot, inputs);
    const repairId = session.repair_id;
    let runPhase = "checked";
    if (inputs.sourceKind === "agent_bug_report" || inputs.sourceKind === "inline_action_inputs") {
        const latestSession = loadRepairSession(repoRoot, repairId);
        const finding = loadBugFinding(repoRoot, repairId);
        if (finding.status !== "accepted" || inputs.auditMode === "require_all") {
            runPhase = "intake_pending_audit";
        }
        else {
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
            }
            else {
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
                headRef: inputs.headSha,
                sourceOverride: "github_action",
                prNumber: prContext?.prNumber,
                prBaseSha: inputs.baseSha,
                prHeadSha: inputs.headSha,
            });
        }
        if (runPhase !== "checked" && latestSession.status === "intake_rejected") {
            runPhase = "intake_pending_audit";
        }
    }
    else {
        cmdRepairCheck({
            repoRoot,
            repairId,
            baseRef: inputs.baseSha,
            headRef: inputs.headSha,
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
    const artifactCollection = collectGitHubActionArtifacts({
        repoRoot,
        outputDirRelative: "pantheon-repair-report",
        repairId,
        artifactMode: inputs.artifactMode,
        includeArchitecture: true,
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
        exitDecision: {
            shouldFail: false,
            matchedConditions: [],
            reason: "Pre-sanitization preview only.",
        },
        commentResult: { status: "skipped", reason: "PR comment not attempted yet." },
    };
    const summary = renderGitHubRepairStepSummary(preliminaryResult);
    // Manifest handled
    const comment = renderGitHubRepairComment(preliminaryResult);
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
    if (finalArtifactCollection.sanitizerViolations.length > 0) {
        const governanceResult = tryAppendGovernanceEvent(repoRoot, {
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
            sanitizer_violations: finalArtifactCollection.sanitizerViolations.length,
            artifact_dir: finalArtifactCollection.outputDirRelative,
            reasons: [{
                    kind: "artifact_sanitizer_violation",
                    action: "block_merge",
                }],
        });
        if (!governanceResult.ok) {
            console.warn(`[Pantheon Repair Action] Failed to record governance event: ${governanceResult.message}`);
        }
    }
    writeGitHubArtifactManifest({
        outputDir: artifactCollection.outputDir,
        collection: finalArtifactCollection,
        metadata: { repair_id: repairId, type: "repair", verdict },
    });
    const exitDecision = decideGitHubActionExit({
        verdict,
        sanitizerViolations: finalArtifactCollection.sanitizerViolations.length,
        failOn: inputs.failOn,
    });
    writeFileSync(preliminaryResult.commentPath, sanitizedComment.content);
    writeFileSync(join(artifactCollection.outputDir, "step_summary.md"), sanitizedSummary.content);
    writeFileSync(join(artifactCollection.outputDir, "action_context.json"), JSON.stringify({
        base_sha: inputs.baseSha ?? null,
        head_sha: inputs.headSha ?? null,
        diff_mode: inputs.baseSha && inputs.headSha
            ? "github_pr_base_head_sha"
            : inputs.baseSha
                ? "github_pr_base_sha"
                : "working_tree_fallback",
        fail_on: inputs.failOn,
        artifact_mode: inputs.artifactMode,
        artifacts_prepared: true,
    }, null, 2));
    if (preliminaryResult.summaryPath) {
        mkdirSync(dirname(preliminaryResult.summaryPath), { recursive: true });
        writeFileSync(preliminaryResult.summaryPath, sanitizedSummary.content);
    }
    let commentResult = { status: "skipped", reason: "PR comment disabled." };
    if (inputs.postComment) {
        commentResult = await postOrUpdatePantheonComment({
            prContext,
            githubToken: env.GITHUB_TOKEN,
            marker: comment.marker,
            markdown: sanitizedComment.content,
            githubApiUrl: env.GITHUB_API_URL,
        });
    }
    // Manifest handled
    return {
        ...preliminaryResult,
        artifactCollection: finalArtifactCollection,
        exitDecision,
        commentResult,
    };
}
function resolveRepairSession(repoRoot, inputs) {
    if (inputs.sourceKind === "existing_repair_id") {
        return loadRepairSession(repoRoot, requireExistingRepairId(inputs));
    }
    if (inputs.sourceKind === "agent_bug_report") {
        return cmdRepairIntake({
            repoRoot,
            fromPath: resolve(repoRoot, requireAgentBugReportPath(inputs)),
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
function loadStoredRepairReport(repoRoot, repairId) {
    const runPaths = repairRunPaths(repoRoot, repairId);
    if (existsSync(runPaths.agentBugReport)) {
        return readJsonFile(runPaths.agentBugReport);
    }
    if (existsSync(runPaths.userBugReport)) {
        return readJsonFile(runPaths.userBugReport);
    }
    throw new Error(`No repair report found for ${repairId}.`);
}
function loadBugFinding(repoRoot, repairId) {
    const runPaths = repairRunPaths(repoRoot, repairId);
    if (!existsSync(runPaths.bugFinding)) {
        throw new Error(`No bug finding found for ${repairId}.`);
    }
    return readJsonFile(runPaths.bugFinding);
}
function loadOptionalContract(repoRoot, repairId, revision) {
    if (revision < 1)
        return null;
    const path = repairRunPaths(repoRoot, repairId).contractRevision(revision);
    return existsSync(path) ? readJsonFile(path) : null;
}
function loadOptionalCheck(repoRoot, repairId) {
    const path = repairRunPaths(repoRoot, repairId).check;
    return existsSync(path) ? readJsonFile(path) : null;
}
function deriveRunVerdict(runPhase, check, session) {
    if (check)
        return check.verdict;
    if (runPhase === "checked")
        return "pass";
    if (session.status === "intake_rejected")
        return "fail";
    return "requires_review";
}
function requireExistingRepairId(inputs) {
    if (inputs.repairId) {
        return inputs.repairId;
    }
    throw new Error("GitHub repair mode expected an existing repair_id.");
}
function requireAgentBugReportPath(inputs) {
    if (inputs.agentBugReport) {
        return inputs.agentBugReport;
    }
    throw new Error("GitHub repair mode expected an agent_bug_report path.");
}
//# sourceMappingURL=githubRepairRunner.js.map