import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { publicPaths, resolvePantheonDir } from "../cli/artifactLayout.js";
export function collectGitHubActionArtifacts(input) {
    const repoRoot = input.repoRoot;
    const outputDir = input.outputDir;
    const pantheonDir = resolvePantheonDir(repoRoot);
    const publicArtifactPaths = publicPaths(repoRoot);
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    const copiedPublicArtifacts = [];
    const copiedDebugArtifacts = [];
    if (input.artifactMode === "debug") {
        cpSync(pantheonDir, join(outputDir, ".pantheon"), { recursive: true });
        copiedDebugArtifacts.push(".pantheon/**");
        return { outputDir, copiedPublicArtifacts, copiedDebugArtifacts };
    }
    const publicFiles = [
        [publicArtifactPaths.task, "task.md"],
        [publicArtifactPaths.scope, "scope.md"],
        [publicArtifactPaths.check, "check.json"],
        [publicArtifactPaths.report, "report.md"],
        [publicArtifactPaths.feedback, "feedback.md"],
        [join(publicArtifactPaths.dir, "python_report.md"), "python_report.md"],
    ];
    for (const [source, target] of publicFiles) {
        if (!existsSync(source))
            continue;
        cpSync(source, join(outputDir, target));
        copiedPublicArtifacts.push(target);
    }
    return { outputDir, copiedPublicArtifacts, copiedDebugArtifacts };
}
//# sourceMappingURL=githubArtifactCollector.js.map