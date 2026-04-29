import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { validateChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteValidator.js";
import { buildChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteBuilder.js";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "..", "fixtures", "repo_fixture");
function makeValidLite() {
    const obs = scanRepo({ repoRoot: FIXTURE_ROOT });
    return buildChangeContractLite({ observations: obs, changedFiles: ["src/utils/format.ts"] });
}
describe("validateChangeContractLite", () => {
    it("valid Lite contract passes", () => {
        const result = validateChangeContractLite(makeValidLite());
        expect(result.status).toBe("valid");
        expect(result.errors).toHaveLength(0);
    });
    it("rejects invalid schema_version", () => {
        const contract = { ...makeValidLite(), schema_version: "wrong" };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
    });
    it("rejects invalid mode", () => {
        const contract = { ...makeValidLite(), mode: "full" };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
    });
    it("rejects missing contract_id", () => {
        const contract = { ...makeValidLite(), contract_id: "" };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
    });
    it("rejects lifecycle_status field", () => {
        const contract = { ...makeValidLite(), lifecycle_status: "active" };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("lifecycle_status"))).toBe(true);
    });
    it("rejects result_events field", () => {
        const contract = { ...makeValidLite(), result_events: [] };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("result_events"))).toBe(true);
    });
    it("rejects obligations field", () => {
        const contract = { ...makeValidLite(), obligations: {} };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("obligations"))).toBe(true);
    });
    it("warns on non-pass with empty actions", () => {
        const contract = {
            ...makeValidLite(),
            decision: { verdict: "requires_review", reasons: ["test"], required_actions: [] },
        };
        const result = validateChangeContractLite(contract);
        expect(result.warnings.some(w => w.includes("required_actions"))).toBe(true);
    });
    it("rejects non-pass with empty reasons", () => {
        const contract = {
            ...makeValidLite(),
            decision: { verdict: "requires_review", reasons: [], required_actions: ["x"] },
        };
        const result = validateChangeContractLite(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("reason"))).toBe(true);
    });
});
//# sourceMappingURL=changeContractLiteValidator.test.js.map