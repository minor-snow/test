import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { validateRepairSourceReport } from "../../src/repair/agentBugReportValidator.js";
describe("validateRepairSourceReport", () => {
    const repoRoot = join("test", "fixtures", "repo_fixture");
    it("accepts a structured agent bug report but keeps hypothesis in unverified claims only", () => {
        const report = {
            schema_version: "agent_bug_report@0.1.0",
            report_id: "bug_report_sync",
            reported_by: {
                agent: "claude-code",
                session_id: "session-1",
            },
            summary: "format function edge case",
            observed_behavior: "Formatting path is behaving unexpectedly.",
            expected_behavior: "Formatting should remain stable.",
            evidence: [
                {
                    kind: "failing_test",
                    path: "tests/utils/format.test.ts",
                    test_name: "should format currency",
                },
            ],
            suspected_files: [
                {
                    path: "src/utils/format.ts",
                    confidence: "medium",
                    reason: "Contains formatting logic.",
                },
            ],
            agent_hypothesis: "The formatter is trimming required precision.",
            requested_action: "repair_analysis",
        };
        const validated = validateRepairSourceReport(report, repoRoot);
        expect(validated.status).toBe("accepted");
        expect(validated.confirmedFacts).toContain("tests/utils/format.test.ts exists");
        expect(validated.confirmedFacts).toContain("src/utils/format.ts exists");
        expect(validated.confirmedFacts).not.toContain(report.agent_hypothesis);
        expect(validated.unverifiedClaims).toContain(report.agent_hypothesis);
    });
    it("downgrades reports with invalid path references", () => {
        const report = {
            schema_version: "agent_bug_report@0.1.0",
            report_id: "bug_report_invalid",
            reported_by: {
                agent: "claude-code",
            },
            summary: "missing path bug",
            observed_behavior: "Something failed.",
            expected_behavior: "Something should pass.",
            evidence: [
                {
                    kind: "failing_test",
                    path: "tests/does/not/exist.test.ts",
                },
            ],
            suspected_files: [],
            agent_hypothesis: "The bug is somewhere else.",
            requested_action: "repair_analysis",
        };
        const validated = validateRepairSourceReport(report, repoRoot);
        expect(validated.status).toBe("needs_more_evidence");
        expect(validated.invalidReferences).toContain("tests/does/not/exist.test.ts");
    });
});
//# sourceMappingURL=agentBugReportValidator.test.js.map