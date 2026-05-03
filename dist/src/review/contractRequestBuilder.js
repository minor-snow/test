/**
 * P29.5: Contract Request Builder
 *
 * Generates review requests from ContractGateResult for the local review queue.
 * These review items ensure that `requires_contract` verdicts are tracked,
 * auditable, and visible in daily metrics reports.
 *
 * Generated request types:
 *   - contract_request     — high/medium risk without contract
 *   - policy_tamper_review — governance policy file modified
 *   - trusted_approval_required — policy-sensitive changes need trusted approval
 *   - fake_approval_detected — PR includes untrusted approval artifact
 *
 * ref: P29.5 section 15
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildContractGateReviewRequest(input) {
    const { gateResult, source, pr } = input;
    // Only create review requests for non-pass verdicts
    if (gateResult.verdict === "pass") {
        return null;
    }
    const requestType = deriveRequestType(gateResult);
    const now = new Date().toISOString();
    const files = gateResult.changed_files
        .filter(f => f.contract_required || f.trusted_approval_required)
        .map(f => ({
        path: f.path,
        bucket: mapBucket(f.bucket),
        reason: f.reasons.join("; "),
    }));
    const recommendedActions = deriveActions(gateResult);
    return {
        schema_version: "pantheon_review_request@0.2.0",
        review_id: `gate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        repair_id: "",
        contract_revision: 0,
        source,
        type: requestType,
        status: "open",
        attention_level: gateResult.verdict === "fail" ? "blocking" : "human_review",
        verdict: mapVerdict(gateResult.verdict),
        reason: buildReason(gateResult, requestType),
        files,
        recommended_actions: recommendedActions,
        pr,
        created_at: now,
        updated_at: now,
    };
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function deriveRequestType(result) {
    if (result.findings.some(f => f.kind === "fake_approval_ignored")) {
        return "fake_approval_detected";
    }
    if (result.findings.some(f => f.kind === "policy_tamper" && f.severity === "blocking")) {
        return "policy_tamper_review";
    }
    if (result.findings.some(f => f.kind === "trusted_approval_missing")) {
        return "trusted_approval_required";
    }
    return "contract_request";
}
function deriveActions(result) {
    const actions = [];
    switch (result.verdict) {
        case "fail":
            actions.push("revert_file");
            break;
        case "requires_replan":
            actions.push("request_replan");
            break;
        case "requires_contract":
            actions.push("create_contract");
            break;
        case "requires_review":
            actions.push("human_review");
            break;
    }
    return actions;
}
function mapVerdict(verdict) {
    switch (verdict) {
        case "fail": return "fail";
        case "requires_replan": return "requires_replan";
        case "requires_contract": return "requires_review"; // Map to nearest existing verdict
        case "requires_review": return "requires_review";
        default: return "requires_review";
    }
}
function mapBucket(bucket) {
    switch (bucket) {
        case "policy_sensitive": return "policy_sensitive";
        case "contract_artifact": return "contract_artifact";
        case "forbidden": return "forbidden";
        default: return "review_required";
    }
}
function buildReason(result, type) {
    switch (type) {
        case "contract_request":
            return result.required_action.why.join(" ") ||
                "Source and/or execution surfaces changed without a valid contract.";
        case "policy_tamper_review":
            return "Governance policy files were modified. Review required using base-branch policy.";
        case "trusted_approval_required":
            return "Policy-sensitive changes require trusted maintainer approval.";
        case "fake_approval_detected":
            return "PR includes untrusted approval/audit artifacts. These were ignored.";
        default:
            return "Contract gate review required.";
    }
}
//# sourceMappingURL=contractRequestBuilder.js.map