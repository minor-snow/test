/**
 * P20a E2E Test
 *
 * Full pipeline: fixture repo → scanRepo → validate → buildLite → validateLite → render
 */
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { scanRepo } from "../../../src/repoObservation/repoScanner.js";
import { validateRepoObservations } from "../../../src/repoObservation/repoObservationValidator.js";
import { buildChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteBuilder.js";
import { validateChangeContractLite } from "../../../src/changeContract/lite/changeContractLiteValidator.js";
import { renderChangeContractLiteMarkdown } from "../../../src/changeContract/lite/changeContractLiteRenderer.js";
import { renderBootstrapReport } from "../../../src/repoObservation/bootstrapReportRenderer.js";
const FIXTURE_ROOT = join(import.meta.dirname, "..", "..", "fixtures", "repo_fixture");
describe("P20a E2E: repo → observations → ChangeContract Lite", () => {
    it("full pipeline produces valid outputs", () => {
        // Step 1: Scan
        const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
        expect(observations.schema_version).toBe("repo_observations.v1");
        expect(observations.observations.files.length).toBeGreaterThan(0);
        // Step 2: Validate observations
        const obsValidation = validateRepoObservations(observations);
        expect(obsValidation.status).toBe("valid");
        expect(obsValidation.errors).toHaveLength(0);
        // Step 3: Build Lite contract
        const changedFiles = ["src/auth/login.ts", "src/utils/format.ts", "src/unmapped/noTest.ts"];
        const contract = buildChangeContractLite({
            observations,
            changedFiles,
            intent: "Fix authentication flow and update formatting",
        });
        expect(contract.schema_version).toBe("change_contract_lite.v1");
        expect(contract.mode).toBe("bootstrap");
        // Step 4: Validate Lite contract
        const liteValidation = validateChangeContractLite(contract);
        expect(liteValidation.status).toBe("valid");
        expect(liteValidation.errors).toHaveLength(0);
        // Step 5: changed_file_statuses covers all changed files
        expect(contract.observed_scope.changed_file_statuses.length).toBeGreaterThanOrEqual(changedFiles.length);
        for (const cf of changedFiles) {
            const status = contract.observed_scope.changed_file_statuses.find(s => s.path === cf);
            expect(status).toBeDefined();
        }
        // Step 6: Render markdown
        const md = renderChangeContractLiteMarkdown(contract);
        expect(md).toContain("# Pantheon Change Contract Lite");
        expect(md).toContain("bootstrap contract");
        expect(md.length).toBeGreaterThan(100);
        // Step 7: Render bootstrap report
        const report = renderBootstrapReport({ observations, contract });
        expect(report).toContain("# Pantheon Repo Bootstrap Report");
        expect(report).toContain("not canonical architecture truth");
        expect(report.length).toBeGreaterThan(100);
    });
    it("handles sensitive + unmapped + clean files together", () => {
        const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({
            observations,
            changedFiles: [
                "src/auth/login.ts", // sensitive
                "src/unmapped/noTest.ts", // no test mapping
                "src/utils/format.ts", // has test
            ],
        });
        expect(contract.decision.verdict).toBe("requires_review");
        // Auth is sensitive
        expect(contract.observed_scope.touched_sensitive_paths.length).toBeGreaterThan(0);
        // noTest has no test mapping → requires_review reason
        expect(contract.decision.reasons.some(r => r.includes("No test mapping"))).toBe(true);
        // NOT fail (corrected behavior)
        expect(contract.decision.verdict).not.toBe("fail");
    });
    it("handles invalid + excluded + observed mixed", () => {
        const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
        const contract = buildChangeContractLite({
            observations,
            changedFiles: [
                "../escape.ts", // path_invalid
                "node_modules/pkg/x.js", // excluded
                "src/utils/format.ts", // observed
            ],
        });
        // requires_reverse_issue wins
        expect(contract.decision.verdict).toBe("requires_reverse_issue");
        const statuses = contract.observed_scope.changed_file_statuses;
        expect(statuses.some(s => s.status === "path_invalid")).toBe(true);
        expect(statuses.some(s => s.status === "excluded")).toBe(true);
        expect(statuses.some(s => s.status === "observed")).toBe(true);
    });
    it("observation hash is stable across runs", () => {
        const obs1 = scanRepo({ repoRoot: FIXTURE_ROOT });
        const obs2 = scanRepo({ repoRoot: FIXTURE_ROOT });
        expect(obs1.meta.observation_hash).toBe(obs2.meta.observation_hash);
    });
    it("no LLM dependency", () => {
        const observations = scanRepo({ repoRoot: FIXTURE_ROOT });
        expect(observations.scanner.llm_used).toBe(false);
        expect(observations.scanner.mode).toBe("deterministic");
    });
    // -------------------------------------------------------------------------
    // P20a.3: test_mapping_overrides E2E
    // -------------------------------------------------------------------------
    describe("test_mapping_overrides E2E (config → scan → Lite)", () => {
        // Scan with config that maps src/unmapped/noTest.ts → test/auth/login.test.ts
        const configObs = scanRepo({
            repoRoot: FIXTURE_ROOT,
            config: {
                test_mapping_overrides: {
                    "src/unmapped/noTest.ts": ["test/auth/login.test.ts"],
                },
            },
        });
        it("override mapping appears in observations.test_mappings", () => {
            const mapping = configObs.observations.test_mappings.find(m => m.source_path === "src/unmapped/noTest.ts" && m.test_path === "test/auth/login.test.ts");
            expect(mapping).toBeDefined();
            expect(mapping.mapping_kind).toBe("config_override");
            expect(mapping.confidence).toBe("high");
        });
        it("override evidence points to pantheon.json", () => {
            const mapping = configObs.observations.test_mappings.find(m => m.source_path === "src/unmapped/noTest.ts" && m.mapping_kind === "config_override");
            expect(mapping).toBeDefined();
            const configEvidence = mapping.evidence.find(e => e.type === "config");
            expect(configEvidence).toBeDefined();
            expect(configEvidence.source_path).toBe("pantheon.json");
        });
        it("override removes no-test-mapping review reason from Lite", () => {
            const contract = buildChangeContractLite({
                observations: configObs,
                changedFiles: ["src/unmapped/noTest.ts"],
                intent: "E2E config override test",
            });
            // The override should suppress the "No test mapping" reason for this file
            const noTestReason = contract.decision.reasons.find(r => r.includes("No test mapping") && r.includes("src/unmapped/noTest.ts"));
            expect(noTestReason).toBeUndefined();
        });
        it("override test appears in related_tests", () => {
            const contract = buildChangeContractLite({
                observations: configObs,
                changedFiles: ["src/unmapped/noTest.ts"],
                intent: "E2E config override test",
            });
            expect(contract.observed_scope.related_tests).toContain("test/auth/login.test.ts");
        });
        it("without override, no-test-mapping reason IS present", () => {
            // Scan without config to verify the baseline behavior
            const noConfigObs = scanRepo({ repoRoot: FIXTURE_ROOT });
            const contract = buildChangeContractLite({
                observations: noConfigObs,
                changedFiles: ["src/unmapped/noTest.ts"],
            });
            const noTestReason = contract.decision.reasons.find(r => r.includes("No test mapping") && r.includes("src/unmapped/noTest.ts"));
            expect(noTestReason).toBeDefined();
        });
    });
});
//# sourceMappingURL=e2e.test.js.map