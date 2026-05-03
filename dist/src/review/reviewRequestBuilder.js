import { attentionLevelForVerdict } from "./reviewAttentionPolicy.js";
export function buildReviewRequest(input) {
    if (input.check.verdict === "pass" && (input.sanitizerViolations ?? 0) === 0) {
        return null;
    }
    const effectiveVerdict = deriveReviewVerdict(input.check.verdict, input.sanitizerViolations ?? 0);
    const attentionLevel = attentionLevelForVerdict(effectiveVerdict, input.sanitizerViolations ?? 0);
    if (!attentionLevel) {
        return null;
    }
    const files = input.check.findings
        .flatMap(finding => isFileScopedFinding(finding) ? [{
            path: finding.file,
            bucket: (finding.kind === "review_required_file" || finding.kind === "architecture_review_required"
                ? "review_required"
                : finding.kind === "forbidden_file" || finding.kind === "architecture_forbidden"
                    ? "forbidden"
                    : "outside_scope"),
            reason: finding.message,
        }] : []);
    const recommendedActions = dedupeActions([
        ...input.check.findings.flatMap(toReviewActions),
        ...(effectiveVerdict === "requires_review"
            ? ["human_review"]
            : []),
        ...(effectiveVerdict === "requires_replan"
            ? ["request_replan"]
            : []),
        ...(effectiveVerdict === "requires_scope_expansion"
            ? ["request_scope_expansion"]
            : []),
        ...(effectiveVerdict === "fail"
            ? ["revert_file"]
            : []),
    ]);
    return {
        schema_version: "pantheon_review_request@0.2.0",
        review_id: `review_${input.repairId}`,
        target: {
            target_type: "repair",
            target_id: input.repairId,
            legacy_repair_id: input.repairId,
        },
        repair_id: input.repairId,
        contract_revision: input.contractRevision,
        source: input.source,
        type: deriveRepairReviewType(input.check),
        status: "open",
        attention_level: attentionLevel,
        verdict: effectiveVerdict,
        reason: buildReviewReason(effectiveVerdict, input.check, input.sanitizerViolations ?? 0),
        files,
        recommended_actions: recommendedActions,
        pr: input.pr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
function deriveReviewVerdict(verdict, sanitizerViolations) {
    if (sanitizerViolations > 0) {
        return "fail";
    }
    return verdict === "pass" ? "requires_review" : verdict;
}
function buildReviewReason(verdict, check, sanitizerViolations) {
    if (sanitizerViolations > 0) {
        return "Pantheon withheld one or more public artifacts because the sanitizer found blocked content.";
    }
    switch (verdict) {
        case "requires_review":
            return "This repair touched files that require human review.";
        case "requires_scope_expansion":
            return "This repair touched files outside the approved repair scope.";
        case "requires_replan":
            return "This repair plan is stale and must be regenerated for the current repository state.";
        case "fail":
            if (check.findings.some(finding => finding.kind === "forbidden_file")) {
                return "This repair touched forbidden files under the current repair contract.";
            }
            return "Pantheon blocked this repair under the current repair contract.";
    }
}
function isFileScopedFinding(finding) {
    return ((finding.kind === "review_required_file"
        || finding.kind === "outside_scope_file"
        || finding.kind === "forbidden_file"
        || finding.kind === "architecture_forbidden"
        || finding.kind === "architecture_review_required")
        && typeof finding.file === "string");
}
function toReviewActions(finding) {
    return finding.allowed_actions.flatMap(action => {
        switch (action) {
            case "keep_for_human_review":
                return ["human_review"];
            case "request_scope_expansion":
                return ["request_scope_expansion"];
            case "request_replan":
                return ["request_replan"];
            case "revert_file":
                return ["revert_file"];
            default:
                return [];
        }
    });
}
function dedupeActions(actions) {
    return [...new Set(actions)];
}
function deriveRepairReviewType(check) {
    if (check.findings.some(finding => finding.kind === "architecture_forbidden")) {
        return "architecture_forbidden_change";
    }
    if (check.findings.some(finding => finding.kind === "architecture_review_required"
        || finding.kind === "architecture_contract_modified")) {
        return "architecture_boundary_violation";
    }
    return "repair_review";
}
export function buildArchitectureMappingReviewRequest(input) {
    if (input.unresolvedCount === 0) {
        return null;
    }
    return {
        schema_version: "pantheon_review_request@0.2.0",
        review_id: `review_arch_map_${input.archId}`,
        target: {
            target_type: "architecture",
            target_id: input.archId,
        },
        contract_revision: 0,
        source: input.source,
        type: "architecture_mapping_review",
        status: "open",
        attention_level: "human_review",
        verdict: "requires_review",
        reason: `Architecture ingestion extracted claims that require human mapping or verification. (${input.unresolvedCount} unresolved)`,
        files: [],
        recommended_actions: ["human_review"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=reviewRequestBuilder.js.map