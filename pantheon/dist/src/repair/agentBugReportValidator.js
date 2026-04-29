import { readFileSync } from "node:fs";
import { agentBugReportSchema, userBugReportSchema, } from "./types.js";
import { normalizeRepairPath, pathExistsInRepo } from "./repairUtils.js";
export function loadRepairSourceReport(path) {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    return parseRepairSourceReport(parsed);
}
export function parseRepairSourceReport(value) {
    const asAgent = agentBugReportSchema.safeParse(value);
    if (asAgent.success)
        return asAgent.data;
    const asUser = userBugReportSchema.safeParse(value);
    if (asUser.success)
        return asUser.data;
    throw buildSchemaError(asAgent.error, asUser.error);
}
export function validateRepairSourceReport(report, repoRoot) {
    const confirmedFacts = [];
    const unverifiedClaims = [];
    const invalidReferences = [];
    const validPathReferences = new Set();
    let validEvidenceCount = 0;
    for (const evidence of report.evidence) {
        if (evidence.path) {
            const normalized = normalizeRepairPath(evidence.path);
            if (!normalized || !pathExistsInRepo(repoRoot, normalized)) {
                invalidReferences.push(evidence.path);
                continue;
            }
            validPathReferences.add(normalized);
            confirmedFacts.push(`${normalized} exists`);
        }
        validEvidenceCount++;
        if (evidence.kind === "failing_test" && evidence.path) {
            unverifiedClaims.push(`Reported failing test: ${evidence.path}${evidence.test_name ? ` (${evidence.test_name})` : ""}`);
        }
        if (evidence.kind === "code_observation" && evidence.summary) {
            unverifiedClaims.push(evidence.summary);
        }
        if (evidence.kind === "stack_trace" && evidence.excerpt) {
            unverifiedClaims.push(`Stack trace excerpt: ${evidence.excerpt}`);
        }
    }
    for (const suspect of report.suspected_files) {
        const normalized = normalizeRepairPath(suspect.path);
        if (!normalized || !pathExistsInRepo(repoRoot, normalized)) {
            invalidReferences.push(suspect.path);
            continue;
        }
        validPathReferences.add(normalized);
        confirmedFacts.push(`${normalized} exists`);
    }
    if ("agent_hypothesis" in report && report.agent_hypothesis) {
        unverifiedClaims.push(report.agent_hypothesis);
    }
    if (report.observed_behavior)
        unverifiedClaims.push(report.observed_behavior);
    if (report.expected_behavior)
        unverifiedClaims.push(report.expected_behavior);
    const uniqueFacts = [...new Set(confirmedFacts)].sort();
    const uniqueClaims = [...new Set(unverifiedClaims)].filter(Boolean);
    const uniqueInvalid = [...new Set(invalidReferences)].sort();
    const status = deriveFindingStatus(report, validEvidenceCount, validPathReferences.size, uniqueInvalid.length);
    const evidenceQuality = deriveEvidenceQuality(validEvidenceCount, validPathReferences.size, uniqueInvalid.length);
    return {
        report,
        status,
        confirmedFacts: uniqueFacts,
        unverifiedClaims: uniqueClaims,
        invalidReferences: uniqueInvalid,
        evidenceQuality,
    };
}
function deriveFindingStatus(report, validEvidenceCount, validPathCount, invalidReferenceCount) {
    if (report.evidence.length === 0 && report.suspected_files.length === 0) {
        return "rejected";
    }
    if (report.suspected_files.length > 0 && validPathCount > 0) {
        return "accepted";
    }
    if (validEvidenceCount === 0 && validPathCount === 0) {
        return invalidReferenceCount > 0 ? "needs_more_evidence" : "rejected";
    }
    if (validEvidenceCount === 0 && validPathCount > 0) {
        return "needs_more_evidence";
    }
    return "accepted";
}
function deriveEvidenceQuality(validEvidenceCount, validPathCount, invalidReferenceCount) {
    if (validEvidenceCount >= 2 && validPathCount >= 1 && invalidReferenceCount === 0) {
        return "high";
    }
    if (validEvidenceCount >= 1 || validPathCount >= 1) {
        return "medium";
    }
    return "low";
}
function buildSchemaError(agentError, userError) {
    const details = [
        ...(agentError?.issues.map(issue => `agent: ${issue.path.join(".") || "(root)"} ${issue.message}`) ?? []),
        ...(userError?.issues.map(issue => `user: ${issue.path.join(".") || "(root)"} ${issue.message}`) ?? []),
    ];
    return new Error(`Invalid bug report schema.\n${details.join("\n")}`);
}
//# sourceMappingURL=agentBugReportValidator.js.map