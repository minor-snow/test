import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { sanitizeArtifact } from "../artifacts/artifactSanitizer.js";
import { repairRunPaths } from "../repair/repairArtifactLayout.js";
export function collectGitHubRepairArtifacts(input) {
    const repoRoot = resolve(input.repoRoot);
    const runPaths = repairRunPaths(repoRoot, input.repairId);
    const outputDirRelative = "pantheon-repair-report";
    const outputDir = join(repoRoot, outputDirRelative);
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const copiedPublicArtifacts = [];
    const copiedDebugArtifacts = [];
    const withheldArtifacts = [];
    const sanitizerViolations = [];
    const publicArtifacts = [
        [runPaths.task, "repair_task.md", "text"],
        [runPaths.scope, "repair_scope.md", "text"],
        [runPaths.checklist, "consistency_checklist.md", "text"],
        [runPaths.check, "repair_check.json", "json"],
        [runPaths.report, "repair_report.md", "text"],
        [runPaths.feedback, "repair_feedback.md", "text"],
    ];
    for (const [source, target, kind] of publicArtifacts) {
        if (!existsSync(source))
            continue;
        const content = readFileSync(source, "utf-8");
        const sanitized = input.artifactMode === "debug" ? { clean: true, violations: [] } : sanitizeArtifact(content, "public");
        if (!sanitized.clean) {
            withheldArtifacts.push(target);
            sanitizerViolations.push({
                file: target,
                count: sanitized.violations.length,
                messages: sanitized.violations.map(violation => violation.message),
            });
            writeFileSync(join(outputDir, target), placeholderArtifactContent(target, kind));
            copiedPublicArtifacts.push(target);
            continue;
        }
        cpSync(source, join(outputDir, target));
        copiedPublicArtifacts.push(target);
    }
    if (input.artifactMode === "debug") {
        const debugSources = [
            [runPaths.agentBugReport, "agent_bug_report.json"],
            [runPaths.userBugReport, "user_bug_report.json"],
            [runPaths.bugFinding, "bug_finding.json"],
            [runPaths.contractLatest, "repair_contract.latest.json"],
            [runPaths.relationGraph, "repair_relation_graph.json"],
            [runPaths.auditLog, "repair_audit_log.jsonl"],
        ];
        for (const [source, target] of debugSources) {
            if (!existsSync(source))
                continue;
            cpSync(source, join(outputDir, target));
            copiedDebugArtifacts.push(target);
        }
    }
    return {
        outputDir,
        outputDirRelative,
        copiedPublicArtifacts,
        copiedDebugArtifacts,
        withheldArtifacts,
        sanitizerViolations,
    };
}
export function writeGitHubRepairSupportArtifacts(input) {
    const manifest = {
        schema_version: "pantheon_repair_artifact_manifest@0.1.0",
        repair_id: input.repairId,
        verdict: input.verdict,
        copied_public_artifacts: input.artifactCollection.copiedPublicArtifacts,
        copied_debug_artifacts: input.artifactCollection.copiedDebugArtifacts,
        withheld_artifacts: input.artifactCollection.withheldArtifacts,
        sanitizer_violations: input.artifactCollection.sanitizerViolations,
        generated_at: new Date().toISOString(),
    };
    writeFileSync(join(input.outputDir, "repair_summary.md"), input.summaryMarkdown);
    writeFileSync(join(input.outputDir, "artifact_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(input.outputDir, "tester_feedback_template.md"), buildTesterFeedbackTemplate());
    writeFileSync(join(input.outputDir, "closed_alpha_run_summary.json"), `${JSON.stringify({
        repair_id: input.repairId,
        verdict: input.verdict,
        artifact_dir: "pantheon-repair-report",
        sanitizer_violations: input.artifactCollection.sanitizerViolations.length,
        comment_status: input.commentStatus ?? "pending",
        comment_reason: input.commentReason ?? null,
        generated_at: new Date().toISOString(),
    }, null, 2)}\n`);
}
function placeholderArtifactContent(target, kind) {
    if (kind === "json") {
        return `${JSON.stringify({
            status: "withheld",
            reason: `Public artifact sanitizer blocked ${target}.`,
        }, null, 2)}\n`;
    }
    if (kind === "jsonl") {
        return `${JSON.stringify({
            status: "withheld",
            reason: `Public artifact sanitizer blocked ${target}.`,
        })}\n`;
    }
    return `# Withheld\n\nPantheon withheld \`${target}\` because the public artifact sanitizer found blocked content.\n`;
}
function buildTesterFeedbackTemplate() {
    return [
        "# Pantheon Closed Alpha Feedback",
        "",
        "## Did the PR comment make sense?",
        "- yes / partially / no",
        "",
        "## Was the verdict correct?",
        "- yes / no / unsure",
        "",
        "## Did Pantheon catch a useful issue?",
        "- yes / no",
        "",
        "## Was anything noisy or confusing?",
        "",
        "## Did the repair feedback tell the agent what to do?",
        "",
        "## Would you keep this Action enabled on a real repo?",
        "- yes / maybe / no",
        "",
    ].join("\n");
}
//# sourceMappingURL=githubRepairArtifactCollector.js.map