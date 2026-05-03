import { BUG_FINDING_V1_LIMITATION } from "./types.js";
import { deterministicId } from "./repairUtils.js";
export function buildBugFinding(input) {
    return {
        schema_version: "bug_finding@0.1.0",
        finding_id: deterministicId("finding", {
            report_id: input.report.report_id,
            status: input.status,
            confirmed: input.confirmedFacts,
            invalid: input.invalidReferences,
        }),
        source_report_id: input.report.report_id,
        status: input.status,
        limitation: BUG_FINDING_V1_LIMITATION,
        confirmed_facts: input.confirmedFacts,
        unverified_claims: input.unverifiedClaims,
        invalid_references: input.invalidReferences,
        evidence_quality: input.evidenceQuality,
        next_action: input.status === "accepted" ? "repair_analysis" : input.status === "needs_more_evidence" ? "await_more_evidence" : "none",
    };
}
export function buildUserBugReport(input) {
    return {
        schema_version: "user_bug_report@0.1.0",
        report_id: deterministicId("user_bug_report", {
            intent: input.intent,
            suspectPaths: input.suspectPaths,
            failingTests: input.failingTests,
        }),
        reported_by: {
            operator_id: input.operatorId ?? "user",
        },
        summary: input.intent,
        observed_behavior: input.intent,
        expected_behavior: "The reported issue should be fixed without introducing new regressions.",
        evidence: input.failingTests.map(path => ({
            kind: "failing_test",
            path,
        })),
        suspected_files: input.suspectPaths.map(path => ({
            path,
            confidence: "high",
            reason: "Explicitly identified by the user as suspect repair surface.",
        })),
        must_preserve: [...input.mustPreserve],
        requested_action: "repair_analysis",
    };
}
export function getReportKind(report) {
    return report.schema_version === "agent_bug_report@0.1.0" ? "agent_bug_report" : "user_bug_report";
}
//# sourceMappingURL=bugFindingBuilder.js.map