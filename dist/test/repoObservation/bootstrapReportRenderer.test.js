import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { renderBootstrapReport } from "../../src/repoObservation/bootstrapReportRenderer.js";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../../src/changeContract/lite/changeContractLiteBuilder.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");
describe("renderBootstrapReport", () => {
    it("renders a complete report", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const report = renderBootstrapReport({ observations: obs, contract });
        expect(report).toContain("# Pantheon Repo Bootstrap Report");
        expect(report).toContain("## Summary");
        expect(report).toContain("## ChangeContract Lite");
        expect(report).toContain("## Observed Repo Index");
    });
    it("includes notice", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const report = renderBootstrapReport({ observations: obs, contract });
        expect(report).toContain("not canonical architecture truth");
        expect(report).toContain("user-provided changed files");
    });
    it("includes working-tree-only message for non-git fixture", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
        const report = renderBootstrapReport({ observations: obs, contract });
        expect(report).toContain("working-tree-only mode");
    });
    it("includes path buckets", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
        const report = renderBootstrapReport({ observations: obs, contract });
        expect(report).toContain("### Path Buckets");
        expect(report).toContain("**src**");
    });
    it("includes unknowns section", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
        const report = renderBootstrapReport({ observations: obs, contract });
        expect(report).toContain("### Unknowns");
    });
});
//# sourceMappingURL=bootstrapReportRenderer.test.js.map