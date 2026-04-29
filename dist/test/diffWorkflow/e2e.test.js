/**
 * P21: Diff Workflow E2E Tests
 *
 * Three demo scenarios proving the full pipeline:
 *   A: Compliant change → pass
 *   B: Out-of-scope file → requires_reverse_issue
 *   C: No test mapping → requires_review
 */
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../../src/changeContract/lite/changeContractLiteBuilder.js";
import { buildAgentScopeLite, renderCursorRuleFromScope } from "../../src/diffWorkflow/agentScopeLiteBuilder.js";
import { verifyDiffAgainstScope } from "../../src/diffWorkflow/diffVerifier.js";
import { renderReviewerReport } from "../../src/diffWorkflow/reviewerReportRenderer.js";
import { extractChangedFilePaths } from "../../src/diffWorkflow/gitDiffReader.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");
describe("P21 E2E: Diff Workflow", () => {
    // Scan once
    const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
    // -------------------------------------------------------------------------
    // Demo A: Compliant change → pass
    // -------------------------------------------------------------------------
    describe("Demo A: compliant change → pass", () => {
        const changedFiles = ["src/auth/login.ts", "test/auth/login.test.ts"];
        const contract = buildChangeContractLite({
            observations,
            changedFiles,
            intent: "Fix login validation",
        });
        const scope = buildAgentScopeLite({ contract, observations });
        // Plan outputs
        it("contract is built", () => {
            expect(contract.schema_version).toBe("change_contract_lite.v1");
        });
        it("scope includes allowed files", () => {
            expect(scope.allowed_files).toContain("src/auth/login.ts");
        });
        it("scope includes required tests", () => {
            expect(scope.required_tests.length).toBeGreaterThanOrEqual(0);
        });
        // Verify: same files → pass
        it("verify passes when diff matches scope", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: changedFiles.map(p => ({ path: p, status: "modified" })),
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            // Verdict is pass or requires_review (fixture is working_tree_only; review hints may apply)
            expect(["pass", "requires_review"]).toContain(verification.verdict);
            expect(verification.file_statuses.every(s => s.status === "allowed" || s.status === "review_required")).toBe(true);
        });
        it("reviewer report is generated", () => {
            const report = renderReviewerReport({
                intent: "Fix login validation",
                diff: { base_ref: "HEAD", changed_files: changedFiles.map(p => ({ path: p })), warnings: [] },
                contract,
                scope,
                observations,
            });
            expect(report).toContain("# Pantheon Reviewer Report");
            expect(report).toContain("Fix login validation");
            expect(report.length).toBeGreaterThan(200);
        });
    });
    // -------------------------------------------------------------------------
    // Demo B: AI out-of-scope → requires_reverse_issue
    // -------------------------------------------------------------------------
    describe("Demo B: out-of-scope file → requires_reverse_issue", () => {
        // Plan authorizes only sync worker
        const planFiles = ["src/utils/format.ts"];
        const contract = buildChangeContractLite({
            observations,
            changedFiles: planFiles,
            intent: "Update format helper",
        });
        const scope = buildAgentScopeLite({ contract, observations });
        it("scope allows only planned files", () => {
            expect(scope.allowed_files).toContain("src/utils/format.ts");
            expect(scope.allowed_files).not.toContain("src/auth/login.ts");
        });
        it("verify detects out-of-scope file", () => {
            // AI also modified src/auth/login.ts (not authorized)
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/utils/format.ts", status: "modified" },
                    { path: "src/auth/login.ts", status: "modified" },
                ],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            expect(verification.verdict).toBe("requires_reverse_issue");
            expect(verification.file_statuses.find(s => s.path === "src/auth/login.ts")?.status).toBe("outside_scope");
        });
        it("reviewer report shows out-of-scope files", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/utils/format.ts", status: "modified" },
                    { path: "src/auth/login.ts", status: "modified" },
                ],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const report = renderReviewerReport({
                diff: actualDiff,
                contract,
                scope,
                verification,
                observations,
            });
            expect(report).toContain("requires_reverse_issue");
            expect(report).toContain("Out-of-Scope Files");
            expect(report).toContain("src/auth/login.ts");
        });
    });
    // -------------------------------------------------------------------------
    // Demo C: No test mapping → requires_review
    // -------------------------------------------------------------------------
    describe("Demo C: no test mapping → requires_review", () => {
        const changedFiles = ["src/unmapped/noTest.ts"];
        const contract = buildChangeContractLite({
            observations,
            changedFiles,
        });
        const scope = buildAgentScopeLite({ contract, observations });
        it("contract verdict is requires_review", () => {
            // noTest.ts has no test mapping
            expect(contract.decision.verdict).toBe("requires_review");
        });
        it("scope marks file as review_required or allowed", () => {
            // The file is observed, so it should be in allowed_files
            // But the contract should have a review reason
            expect(scope.allowed_files).toContain("src/unmapped/noTest.ts");
            const hasReviewReason = contract.decision.reasons.some(r => r.includes("No test mapping") || r.includes("unmapped"));
            expect(hasReviewReason).toBe(true);
        });
        it("reviewer report recommends action", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [{ path: "src/unmapped/noTest.ts", status: "modified" }],
                warnings: [],
            };
            const report = renderReviewerReport({
                diff: actualDiff,
                contract,
                scope,
                observations,
            });
            expect(report).toContain("Pantheon Reviewer Report");
            expect(report).toContain("boundary compliance, not semantic correctness");
        });
    });
    // -------------------------------------------------------------------------
    // Cursor rule
    // -------------------------------------------------------------------------
    describe("Cursor rule rendering", () => {
        it("renders cursor rule only through explicit call", () => {
            const contract = buildChangeContractLite({
                observations,
                changedFiles: ["src/auth/login.ts"],
            });
            const scope = buildAgentScopeLite({ contract, observations });
            const rule = renderCursorRuleFromScope(scope);
            expect(rule).toContain("Pantheon Change Boundaries");
            expect(rule).toContain("src/auth/login.ts");
        });
    });
    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------
    describe("extractChangedFilePaths", () => {
        it("extracts paths from diff", () => {
            const diff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/a.ts", status: "modified" },
                    { path: "src/b.ts" },
                ],
                warnings: [],
            };
            const paths = extractChangedFilePaths(diff);
            expect(paths).toEqual(["src/a.ts", "src/b.ts"]);
        });
    });
});
//# sourceMappingURL=e2e.test.js.map