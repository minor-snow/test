import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cmdMetricsDaily } from "../../src/cli/cmdMetrics.js";
import { cmdRepairCheck, cmdRepairIntake, cmdRepairPlan } from "../../src/cli/cmdRepair.js";
import { metricsPaths } from "../../src/metrics/localMetricsAggregator.js";
describe("cmdMetrics", () => {
    const tmpDir = join("test", "cli", "__tmp_metrics_cli__");
    const fixtureDir = join("test", "fixtures", "repo_fixture");
    beforeEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        mkdirSync(tmpDir, { recursive: true });
        cpSync(fixtureDir, tmpDir, { recursive: true });
        writeFileSync(join(tmpDir, "pantheon.alpha.json"), JSON.stringify({
            metrics: {
                enabled: true,
                mode: "local",
                generate_daily_report: true,
                include_file_paths: true,
                anonymize_paths: false,
                retention_days: 30,
            },
        }, null, 2));
    });
    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });
    it("writes a daily report after repair events exist", () => {
        const session = cmdRepairIntake({
            repoRoot: tmpDir,
            intent: "Fix login auth regression",
            suspectPaths: ["src/auth/login.ts"],
            failingTests: ["test/auth/login.test.ts"],
            mustPreserve: [],
        });
        cmdRepairPlan({ repoRoot: tmpDir, repairId: session.repair_id });
        cmdRepairCheck({
            repoRoot: tmpDir,
            repairId: session.repair_id,
            changedFilesOverride: ["src/auth/login.ts"],
        });
        const date = new Date().toISOString().slice(0, 10);
        cmdMetricsDaily(tmpDir, date);
        const paths = metricsPaths(tmpDir);
        expect(readFileSync(paths.markdownPath(date), "utf-8")).toContain("Pantheon Local Governance Report");
        expect(readFileSync(paths.jsonPath(date), "utf-8")).toContain("\"repair_checks\": 1");
    });
});
//# sourceMappingURL=cmdMetrics.test.js.map