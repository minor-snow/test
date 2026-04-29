import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cmdAlpha } from "../../src/cli/cmdAlpha.js";
import { metricsPaths } from "../../src/metrics/localMetricsAggregator.js";
import { loadReviewQueue } from "../../src/review/reviewQueueStore.js";
describe("pantheonAlpha command surface", () => {
    const tmpDir = join("test", "cli", "__tmp_alpha_surface__");
    const fixtureDir = join("test", "fixtures", "repo_fixture");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
        cpSync(fixtureDir, tmpDir, { recursive: true });
        cmdAlpha(["init", "--repo", tmpDir, "--no-github"]);
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("supports repair, review, and metrics commands through pantheon-alpha", () => {
        cmdAlpha([
            "repair",
            "intake",
            "--repo",
            tmpDir,
            "--intent",
            "Fix login auth regression",
            "--suspect",
            "src/auth/login.ts",
            "--failing-test",
            "test/auth/login.test.ts",
        ]);
        const sessions = JSON.parse(readFileSync(join(tmpDir, ".pantheon", "repair", "sessions.json"), "utf-8"));
        const repairId = sessions.active_repairs[0].repair_id;
        cmdAlpha(["repair", "plan", "--repo", tmpDir, "--repair-id", repairId]);
        writeFileSync(join(tmpDir, "synthetic.json"), JSON.stringify({
            schema_version: "synthetic_repair_diff@0.1.0",
            changed_files: [
                {
                    path: "src/auth/login.ts",
                    change_kind: "modified",
                },
            ],
        }, null, 2));
        cmdAlpha(["repair", "check", "--repo", tmpDir, "--repair-id", repairId, "--diff-json", join(tmpDir, "synthetic.json")]);
        cmdAlpha(["review", "list", "--repo", tmpDir]);
        cmdAlpha(["metrics", "daily", "--repo", tmpDir]);
        expect(existsSync(join(tmpDir, ".pantheon", "repair", "runs", repairId, "repair_task.md"))).toBe(true);
        expect(existsSync(metricsPaths(tmpDir).markdownPath(new Date().toISOString().slice(0, 10)))).toBe(true);
        expect(loadReviewQueue(tmpDir).open).toHaveLength(1);
    });
});
//# sourceMappingURL=pantheonAlphaCommandSurface.test.js.map