/**
 * P22: Agent Feedback E2E Tests
 *
 * 4 demo scenarios through the full pipeline:
 *   A: pass → no violations
 *   B: outside scope → structured outside_scope feedback
 *   C: review required / missing test → structured missing_test_mapping feedback
 *   D: undeclared package → structured undeclared_package feedback
 */
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanRepo } from "../../src/repoObservation/repoScanner.js";
import { buildChangeContractLite } from "../../src/changeContract/lite/changeContractLiteBuilder.js";
import { buildAgentScopeLite } from "../../src/diffWorkflow/agentScopeLiteBuilder.js";
import { verifyDiffAgainstScope } from "../../src/diffWorkflow/diffVerifier.js";
import { buildAgentFeedbackFromDiffVerification } from "../../src/agentFeedback/diffFeedbackBuilder.js";
import { validateAgentFeedback } from "../../src/agentFeedback/agentFeedbackValidator.js";
import { renderAgentFeedbackMarkdown } from "../../src/agentFeedback/agentFeedbackRenderer.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "fixtures", "repo_fixture");
describe("P22 E2E: Agent Feedback", () => {
    const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
    // -------------------------------------------------------------------------
    // Demo A: pass
    // -------------------------------------------------------------------------
    describe("Demo A: pass → no violations", () => {
        const changedFiles = ["src/auth/login.ts", "test/auth/login.test.ts"];
        const contract = buildChangeContractLite({ observations, changedFiles, intent: "Fix login" });
        const scope = buildAgentScopeLite({ contract, observations });
        it("plan produces scope with allowed files", () => {
            expect(scope.allowed_files).toContain("src/auth/login.ts");
        });
        it("verify produces valid feedback matching verification verdict", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: changedFiles.map(p => ({ path: p, status: "modified" })),
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            // Feedback verdict matches verification verdict
            expect(feedback.verdict).toBe(verification.verdict);
            // No outside_scope or forbidden violations (files are in scope)
            expect(feedback.violations.every(v => v.kind !== "outside_scope_file")).toBe(true);
            expect(feedback.violations.every(v => v.kind !== "forbidden_file_modified")).toBe(true);
            expect(feedback.schema_version).toBe("agent_feedback.v1");
        });
        it("feedback validates", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: changedFiles.map(p => ({ path: p, status: "modified" })),
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(validateAgentFeedback(feedback).status).toBe("valid");
        });
    });
    // -------------------------------------------------------------------------
    // Demo B: outside scope → structured feedback
    // -------------------------------------------------------------------------
    describe("Demo B: outside scope → outside_scope_file violation", () => {
        const planFiles = ["src/utils/format.ts"];
        const contract = buildChangeContractLite({ observations, changedFiles: planFiles, intent: "Update format" });
        const scope = buildAgentScopeLite({ contract, observations });
        it("feedback contains outside_scope_file violation", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/utils/format.ts", status: "modified" },
                    { path: "src/auth/login.ts", status: "modified" }, // unauthorized
                ],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(feedback.verdict).toBe("requires_reverse_issue");
            const v = feedback.violations.find(v => v.kind === "outside_scope_file");
            expect(v).toBeDefined();
            expect(v.location.file_path).toBe("src/auth/login.ts");
            expect(v.constraint.constraint_id).toBe("scope.allowed_files");
            expect(v.fix_hint).toContain("Revert");
            expect(v.allowed_agent_actions).toContain("revert_file");
            expect(v.requires_human).toBe(true);
        });
        it("retry guidance is requires_reverse_issue", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/utils/format.ts", status: "modified" },
                    { path: "src/auth/login.ts", status: "modified" },
                ],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(feedback.retry_guidance.retry_allowed).toBe(false);
            expect(feedback.retry_guidance.retry_mode).toBe("requires_reverse_issue");
        });
        it("feedback validates", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [
                    { path: "src/utils/format.ts", status: "modified" },
                    { path: "src/auth/login.ts", status: "modified" },
                ],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(validateAgentFeedback(feedback).status).toBe("valid");
        });
    });
    // -------------------------------------------------------------------------
    // Demo C: review required / missing test mapping
    // -------------------------------------------------------------------------
    describe("Demo C: missing test mapping → structured feedback", () => {
        // Use a src file with no test mapping
        const changedFiles = ["src/unmapped/noTest.ts"];
        const contract = buildChangeContractLite({ observations, changedFiles });
        const scope = buildAgentScopeLite({ contract, observations });
        it("contract has unmapped_src_details", () => {
            expect(contract.observed_scope.unmapped_src_details).toBeDefined();
            const unmapped = contract.observed_scope.unmapped_src_details ?? [];
            expect(unmapped.some(u => u.path === "src/unmapped/noTest.ts")).toBe(true);
        });
        it("scope has violation_hints for missing_test_mapping", () => {
            const hints = scope.violation_hints ?? [];
            const hint = hints.find(h => h.violation_kind === "missing_test_mapping");
            expect(hint).toBeDefined();
            expect(hint.path).toBe("src/unmapped/noTest.ts");
        });
        it("feedback uses violation_hints for missing_test_mapping", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [{ path: "src/unmapped/noTest.ts", status: "modified" }],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            // Should get missing_test_mapping not generic requires_human_review
            const v = feedback.violations.find(v => v.kind === "missing_test_mapping");
            expect(v).toBeDefined();
            expect(v.constraint.constraint_kind).toBe("test");
            expect(v.allowed_agent_actions).toContain("add_required_test");
        });
        it("feedback validates", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [{ path: "src/unmapped/noTest.ts", status: "modified" }],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(validateAgentFeedback(feedback).status).toBe("valid");
        });
    });
    // -------------------------------------------------------------------------
    // Demo D: undeclared package
    // -------------------------------------------------------------------------
    describe("Demo D: undeclared package → structured feedback", () => {
        // Fixture billing.ts imports 'stripe' which is not in package.json
        const changedFiles = ["src/payment/billing.ts"];
        const contract = buildChangeContractLite({ observations, changedFiles });
        const scope = buildAgentScopeLite({ contract, observations });
        it("contract has undeclared_package_details for stripe", () => {
            const details = contract.observed_scope.undeclared_package_details ?? [];
            expect(details.length).toBeGreaterThan(0);
            const stripe = details.find(d => d.package_name === "stripe");
            expect(stripe).toBeDefined();
            expect(stripe.file_path).toBe("src/payment/billing.ts");
        });
        it("scope has undeclared_package violation_hint for stripe", () => {
            const hints = (scope.violation_hints ?? []).filter(h => h.violation_kind === "undeclared_package");
            expect(hints.length).toBeGreaterThan(0);
            const stripeHint = hints.find(h => h.context.package_name === "stripe");
            expect(stripeHint).toBeDefined();
            expect(stripeHint.path).toBe("src/payment/billing.ts");
        });
        it("feedback produces undeclared_package violation with update_package_manifest action", () => {
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [{ path: "src/payment/billing.ts", status: "modified" }],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            expect(validateAgentFeedback(feedback).status).toBe("valid");
            const pkgViolations = feedback.violations.filter(v => v.kind === "undeclared_package");
            expect(pkgViolations.length).toBeGreaterThan(0);
            const stripeViolation = pkgViolations.find(v => v.message.includes("stripe"));
            expect(stripeViolation).toBeDefined();
            expect(stripeViolation.constraint.constraint_id).toBe("package.declared_dependencies");
            expect(stripeViolation.allowed_agent_actions).toContain("update_package_manifest");
            expect(stripeViolation.requires_human).toBe(false);
        });
    });
    // -------------------------------------------------------------------------
    // Markdown rendering
    // -------------------------------------------------------------------------
    describe("agent_feedback.md rendering", () => {
        it("renders valid markdown from feedback", () => {
            const changedFiles = ["src/auth/login.ts"];
            const contract = buildChangeContractLite({ observations, changedFiles });
            const scope = buildAgentScopeLite({ contract, observations });
            const actualDiff = {
                base_ref: "HEAD",
                changed_files: [{ path: "src/auth/login.ts" }, { path: "src/outside.ts" }],
                warnings: [],
            };
            const verification = verifyDiffAgainstScope({ diff: actualDiff, scope });
            const feedback = buildAgentFeedbackFromDiffVerification({ verification, scope, contract });
            const md = renderAgentFeedbackMarkdown(feedback);
            expect(md).toContain("# Pantheon Agent Feedback");
            expect(md).toContain("## Verdict");
            expect(md).toContain("repair_plan is advisory");
        });
    });
});
//# sourceMappingURL=e2e.test.js.map