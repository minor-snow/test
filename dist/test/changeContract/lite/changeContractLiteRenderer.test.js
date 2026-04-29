import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { renderChangeContractLiteMarkdown } from "../../../src/changeContract/lite/changeContractLiteRenderer.js";
import { buildChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteBuilder.js";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "..", "fixtures", "repo_fixture");
describe("renderChangeContractLiteMarkdown", () => {
    it("renders a valid markdown string", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("# Pantheon Change Contract Lite");
        expect(md).toContain("## Decision");
    });
    it("includes verdict", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain(contract.decision.verdict);
    });
    it("includes changed file statuses table", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("## Changed File Statuses");
        expect(md).toContain("| Path | Status | Reason |");
        expect(md).toContain("src/auth/login.ts");
    });
    it("includes notice", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("bootstrap contract");
        expect(md).toContain("not a full governed ChangeContract");
    });
    it("includes intent when provided", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({
            observations: obs,
            changedFiles: ["src/auth/login.ts"],
            intent: "Fix login vulnerability",
        });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("Fix login vulnerability");
    });
    it("includes references section", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("## References");
        expect(md).toContain(obs.meta.observation_hash);
    });
    it("includes sensitive paths in scope", () => {
        const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({ observations: obs, changedFiles: ["src/auth/login.ts"] });
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("Sensitive paths");
    });
});
//# sourceMappingURL=changeContractLiteRenderer.test.js.map