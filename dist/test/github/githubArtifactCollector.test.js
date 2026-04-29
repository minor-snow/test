import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { collectGitHubActionArtifacts } from "../../src/github/githubArtifactCollector.js";
describe("githubArtifactCollector", () => {
    const tmpRepo = join("test", "github", "__tmp_artifacts__");
    beforeEach(() => {
        rmSync(tmpRepo, { recursive: true, force: true });
        mkdirSync(join(tmpRepo, ".pantheon", "internal"), { recursive: true });
        writeFileSync(join(tmpRepo, ".pantheon", "task.md"), "# Task\n");
        writeFileSync(join(tmpRepo, ".pantheon", "scope.md"), "# Scope\n");
        writeFileSync(join(tmpRepo, ".pantheon", "check.json"), "{}\n");
        writeFileSync(join(tmpRepo, ".pantheon", "report.md"), "# Report\n");
        writeFileSync(join(tmpRepo, ".pantheon", "feedback.md"), "# Feedback\n");
        writeFileSync(join(tmpRepo, ".pantheon", "python_report.md"), "# Python\n");
        writeFileSync(join(tmpRepo, ".pantheon", "internal", "agent_scope.json"), "{}\n");
    });
    afterEach(() => {
        rmSync(tmpRepo, { recursive: true, force: true });
    });
    it("copies only public artifacts in public mode", () => {
        const result = collectGitHubActionArtifacts({
            repoRoot: tmpRepo,
            outputDir: join(tmpRepo, "pantheon-report"),
            artifactMode: "public",
        });
        expect(result.copiedPublicArtifacts).toContain("task.md");
        expect(readFileSync(join(result.outputDir, "report.md"), "utf-8")).toContain("Report");
    });
    it("copies full pantheon dir in debug mode", () => {
        const result = collectGitHubActionArtifacts({
            repoRoot: tmpRepo,
            outputDir: join(tmpRepo, "pantheon-debug"),
            artifactMode: "debug",
        });
        expect(result.copiedDebugArtifacts).toEqual([".pantheon/**"]);
        expect(readFileSync(join(result.outputDir, ".pantheon", "internal", "agent_scope.json"), "utf-8")).toContain("{}");
    });
});
//# sourceMappingURL=githubArtifactCollector.test.js.map