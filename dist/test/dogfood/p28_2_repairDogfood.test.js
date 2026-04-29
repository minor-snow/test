import { describe, it, expect, beforeAll } from "vitest";
import { runDogfoodManifest } from "../../scripts/p28_2_run_repair_dogfood.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
describe("P28.2: Repair Dogfood Execution", () => {
    let summaryData;
    beforeAll(() => {
        // We execute the runner entirely. It generates a summary.json and summary.md
        summaryData = runDogfoodManifest();
    });
    it("successfully executed all 14 cases", () => {
        expect(summaryData).toBeDefined();
        expect(summaryData.total_cases).toBe(14);
    });
    it("passed all cases with correct repair verdicts (allowed, review, forbidden)", () => {
        expect(summaryData.failed_cases).toBe(0);
        expect(summaryData.passed_cases).toBe(14);
    });
    it("produced zero artifact sanitizer violations across all artifacts", () => {
        expect(summaryData.artifact_sanitizer.violations).toBe(0);
        expect(summaryData.artifact_sanitizer.checked).toBeGreaterThanOrEqual(14 * 8); // at least 8 artifacts per case
    });
    it("recorded correct matrix of verdicts", () => {
        expect(summaryData.verdict_matrix.pass).toBe(3); // 3 allowed cases
        expect(summaryData.verdict_matrix.requires_review).toBe(3); // 3 review cases
        expect(summaryData.verdict_matrix.fail).toBe(2); // 2 forbidden cases
        expect(summaryData.verdict_matrix.requires_scope_expansion).toBe(1); // 1 outside scope case
        // Wait! outside_scope also returns requires_scope_expansion
        // Wait, let's just make sure the sum is 9 + 5 audit = 14
        const sum = summaryData.verdict_matrix.pass +
            summaryData.verdict_matrix.requires_review +
            summaryData.verdict_matrix.fail +
            summaryData.verdict_matrix.requires_scope_expansion +
            summaryData.verdict_matrix.audit_variants;
        expect(sum).toBe(14);
        // There are 5 audit variants
        expect(summaryData.verdict_matrix.audit_variants).toBe(5);
    });
    it("generated the summary markdown artifact", () => {
        const mdPath = resolve("data/dogfood/p28_2_repair_dogfood/summary.md");
        expect(existsSync(mdPath)).toBe(true);
        const content = readFileSync(mdPath, "utf-8");
        expect(content).toContain("Result: PASS");
        expect(content).toContain("Artifact Sanitizer");
    });
});
//# sourceMappingURL=p28_2_repairDogfood.test.js.map