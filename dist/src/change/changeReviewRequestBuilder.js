import { writeReviewRequest } from "../review/reviewQueueStore.js";
export function writeChangeReviewRequest(repoRoot, result, source = "local_cli") {
    if (result.verdict === "pass")
        return;
    const request = {
        schema_version: "pantheon_review_request@0.2.0",
        review_id: `review_chg_${result.change_id}_${Date.now()}`,
        target: {
            target_type: "change",
            target_id: result.change_id,
        },
        repair_id: undefined, // Legacy
        contract_revision: 1, // Change contracts currently don't use revisions explicitly in the same way, defaulting to 1
        source,
        type: deriveReviewType(result),
        status: "open",
        attention_level: result.verdict === "fail" || result.verdict === "requires_contract" ? "blocking" : "human_review",
        verdict: mapVerdict(result.verdict),
        reason: result.findings.length > 0 ? result.findings[0].message : "Change requires review",
        files: result.findings
            .filter(f => f.files && f.files.length > 0)
            .map(f => ({
            path: f.files[0],
            bucket: "review_required", // Approximate mapping for display purposes
            reason: f.message,
        })),
        recommended_actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    writeReviewRequest(repoRoot, request);
}
function deriveReviewType(result) {
    if (result.findings.some(finding => finding.kind === "architecture_forbidden")) {
        return "architecture_forbidden_change";
    }
    if (result.findings.some(finding => finding.kind === "architecture_review_required"
        || finding.kind === "architecture_contract_modified")) {
        return "architecture_boundary_violation";
    }
    return "change_review";
}
function mapVerdict(verdict) {
    switch (verdict) {
        case "fail":
            return "fail";
        case "requires_replan":
            return "requires_replan";
        case "requires_scope_expansion":
            return "requires_scope_expansion";
        case "requires_review":
            return "requires_review";
        case "requires_contract":
            return "fail";
        case "pass":
            return "requires_review";
    }
}
//# sourceMappingURL=changeReviewRequestBuilder.js.map