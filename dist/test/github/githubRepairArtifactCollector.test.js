import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectGitHubRepairArtifacts, writeGitHubRepairSupportArtifacts } from "../../src/github/githubRepairArtifactCollector.js";
import { ensureRepairDirs, repairRunPaths } from "../../src/repair/repairArtifactLayout.js";
describe("githubRepairArtifactCollector", () => {
    const tmpDir = join("test", "github", "__tmp_repair_artifacts__");
    const repairId = "repair_test_123";
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
        ensureRepairDirs(tmpDir);
        const paths = repairRunPaths(tmpDir, repairId);
        mkdirSync(paths.dir, { recursive: true });
        writeFileSync(paths.task, "# Repair Task\n");
        writeFileSync(paths.scope, "# Scope\n");
        writeFileSync(paths.checklist, "# Checklist\n");
        writeFileSync(paths.check, "{\n  \"verdict\": \"pass\"\n}\n");
        writeFileSync(paths.report, "# Report\nSensitive path: C:\\Temp\\bad\n");
        writeFileSync(paths.feedback, "# Feedback\n");
        writeFileSync(paths.auditLog, "{\"event\":\"repair_checked\"}\n");
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("collects public artifacts into a stable directory and withholds unsafe files", () => {
        const collection = collectGitHubRepairArtifacts({
            repoRoot: tmpDir,
            repairId,
            artifactMode: "public",
        });
        expect(collection.outputDirRelative).toBe("pantheon-repair-report");
        expect(collection.sanitizerViolations.length).toBe(1);
        expect(readFileSync(join(collection.outputDir, "repair_report.md"), "utf-8")).toContain("Withheld");
        writeGitHubRepairSupportArtifacts({
            outputDir: collection.outputDir,
            summaryMarkdown: "# Summary\n",
            artifactCollection: collection,
            repairId,
            verdict: "fail",
            commentStatus: "skipped",
        });
        expect(readFileSync(join(collection.outputDir, "artifact_manifest.json"), "utf-8")).toContain(repairId);
        expect(readFileSync(join(collection.outputDir, "tester_feedback_template.md"), "utf-8")).toContain("Closed Alpha Feedback");
    });
});
//# sourceMappingURL=githubRepairArtifactCollector.test.js.map