import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { publicPaths, resolvePantheonDir } from "../cli/artifactLayout.js";
import { sanitizeArtifact } from "../artifacts/artifactSanitizer.js";
import { getChangeCheckPath, getChangeChecklistPath, getChangeContractPath, getChangeFeedbackPath, getChangeReportPath, getChangeScopePath } from "../change/changeArtifactLayout.js";
import { repairRunPaths } from "../repair/repairArtifactLayout.js";
import { architectureRootPaths } from "../architecture/architectureArtifactLayout.js";
import { reviewRequestPaths } from "../review/reviewQueueStore.js";
/**
 * Unified artifact collector for all Pantheon GitHub Action modes.
 */
export function collectGitHubActionArtifacts(input) {
    const { repoRoot, outputDirRelative, artifactMode, changeId, repairId, includeArchitecture } = input;
    const outputDir = resolve(repoRoot, outputDirRelative);
    const pantheonDir = resolvePantheonDir(repoRoot);
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const copiedPublicArtifacts = [];
    const copiedDebugArtifacts = [];
    const withheldArtifacts = [];
    const sanitizerViolations = [];
    // 1. Define artifacts to collect
    const publicFiles = [];
    // Base Boundary Artifacts
    const basePaths = publicPaths(repoRoot);
    publicFiles.push([basePaths.task, "task.md", "text"], [basePaths.scope, "scope.md", "text"], [basePaths.check, "check.json", "json"], [basePaths.report, "report.md", "text"], [basePaths.feedback, "feedback.md", "text"]);
    // Change Artifacts
    if (changeId) {
        publicFiles.push([getChangeContractPath(repoRoot, changeId, "latest"), "change_contract.json", "json"], [getChangeScopePath(repoRoot, changeId), "change_scope.md", "text"], [getChangeChecklistPath(repoRoot, changeId), "change_checklist.md", "text"], [getChangeCheckPath(repoRoot, changeId), "change_check.json", "json"], [getChangeReportPath(repoRoot, changeId), "change_report.md", "text"], [getChangeFeedbackPath(repoRoot, changeId), "change_feedback.md", "text"]);
        addReviewArtifacts(repoRoot, "change", changeId, publicFiles);
    }
    // Repair Artifacts
    if (repairId) {
        const runPaths = repairRunPaths(repoRoot, repairId);
        publicFiles.push([runPaths.task, "repair_task.md", "text"], [runPaths.scope, "repair_scope.md", "text"], [runPaths.checklist, "consistency_checklist.md", "text"], [runPaths.check, "repair_check.json", "json"], [runPaths.report, "repair_report.md", "text"], [runPaths.feedback, "repair_feedback.md", "text"]);
        addReviewArtifacts(repoRoot, "repair", repairId, publicFiles);
    }
    // Architecture Artifacts
    if (includeArchitecture) {
        const archPaths = architectureRootPaths(repoRoot);
        publicFiles.push([archPaths.activeContract, "architecture_contract.json", "json"], [archPaths.activeContractMd, "architecture_contract.md", "text"]);
    }
    // 2. Process and Sanitize
    for (const [source, target, kind] of publicFiles) {
        if (!existsSync(source))
            continue;
        const content = readFileSync(source, "utf-8");
        const sanitized = artifactMode === "debug" ? { clean: true, violations: [] } : sanitizeArtifact(content, "public");
        if (!sanitized.clean) {
            withheldArtifacts.push(target);
            sanitizerViolations.push({
                file: target,
                count: sanitized.violations.length,
                messages: sanitized.violations.map(v => v.message),
            });
            writeFileSync(join(outputDir, target), placeholderArtifactContent(target, kind));
            copiedPublicArtifacts.push(target);
            continue;
        }
        cpSync(source, join(outputDir, target));
        copiedPublicArtifacts.push(target);
    }
    // 3. Debug mode extra artifacts
    if (artifactMode === "debug") {
        // Collect entire .pantheon for debugging
        cpSync(pantheonDir, join(outputDir, ".pantheon"), { recursive: true });
        copiedDebugArtifacts.push(".pantheon/**");
    }
    return {
        outputDir,
        outputDirRelative,
        copiedPublicArtifacts,
        copiedDebugArtifacts,
        withheldArtifacts,
        sanitizerViolations
    };
}
function addReviewArtifacts(repoRoot, type, id, list) {
    const paths = reviewRequestPaths(repoRoot, type, id);
    if (existsSync(paths.markdown))
        list.push([paths.markdown, "review_request.md", "text"]);
    if (existsSync(paths.json))
        list.push([paths.json, "review_request.json", "json"]);
}
function placeholderArtifactContent(target, kind) {
    if (kind === "json") {
        return JSON.stringify({ status: "withheld", reason: `Blocked by sanitizer: ${target}` }, null, 2);
    }
    return `# Withheld\n\nPantheon withheld \`${target}\` because the public artifact sanitizer found blocked content.\n`;
}
/**
 * Generates a standard manifest for the collected artifacts.
 */
export function writeGitHubArtifactManifest(input) {
    const manifest = {
        schema_version: "pantheon_artifact_manifest@0.2.0",
        generated_at: new Date().toISOString(),
        ...input.metadata,
        ...input.collection,
    };
    // Remove absolute path from manifest for portability
    const { outputDir, ...portableManifest } = manifest;
    writeFileSync(join(input.outputDir, "artifact_manifest.json"), JSON.stringify(portableManifest, null, 2));
}
export function sanitizeGeneratedGitHubArtifact(input) {
    if (input.artifactMode === "debug") {
        return {
            content: input.content,
            violation: null,
            withheld: false,
        };
    }
    const sanitized = sanitizeArtifact(input.content, "public");
    if (sanitized.clean) {
        return {
            content: input.content,
            violation: null,
            withheld: false,
        };
    }
    return {
        content: placeholderArtifactContent(input.target, "text"),
        violation: {
            file: input.target,
            count: sanitized.violations.length,
            messages: sanitized.violations.map(v => v.message),
        },
        withheld: true,
    };
}
/** @deprecated use writeGitHubArtifactManifest */
export function writeGitHubRepairSupportArtifacts(input) {
    writeFileSync(join(input.outputDir, "step_summary.md"), input.summaryMarkdown);
    // Also write the feedback template if it exists in the repo or use a default one
    const feedbackTemplate = "# Closed Alpha Feedback\n\nThank you for testing Pantheon!";
    writeFileSync(join(input.outputDir, "tester_feedback_template.md"), feedbackTemplate);
    writeGitHubArtifactManifest({
        outputDir: input.outputDir,
        collection: input.artifactCollection,
        metadata: {
            repair_id: input.repairId,
            verdict: input.verdict,
            comment_status: input.commentStatus
        }
    });
}
/** @deprecated use collectGitHubActionArtifacts */
export function collectGitHubRepairArtifacts(input) {
    return collectGitHubActionArtifacts({
        repoRoot: input.repoRoot,
        repairId: input.repairId,
        outputDirRelative: input.outputDirRelative ?? "pantheon-repair-report",
        artifactMode: input.artifactMode,
    });
}
//# sourceMappingURL=githubArtifactCollector.js.map