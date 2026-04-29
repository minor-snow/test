import { matchesPattern, uniqueSorted } from "./repairUtils.js";
export function applyHumanAuditDecision(contract, decision) {
    if (decision.repair_id !== contract.repair_id) {
        throw new Error(`Audit decision ${decision.decision_id} does not match repair ${contract.repair_id}.`);
    }
    if (decision.target_revision !== contract.revision) {
        throw new Error(`stale_audit_decision: decision targets revision ${decision.target_revision}, but current revision is ${contract.revision}.`);
    }
    const review = new Map(contract.repair_scope.review_required.map(entry => [entry.pattern, entry]));
    const forbid = new Map(contract.repair_scope.forbidden.map(entry => [entry.pattern, entry]));
    const allow = new Map(contract.repair_scope.allowed.map(entry => [entry.pattern, entry]));
    const mustPreserve = new Set(contract.must_preserve);
    for (const pattern of decision.changes_to_scope.add_review) {
        review.set(pattern, buildHumanScopeEntry(pattern, "review"));
    }
    for (const pattern of decision.changes_to_scope.add_forbid) {
        forbid.set(pattern, buildHumanScopeEntry(pattern, "forbid"));
    }
    for (const statement of decision.added_must_preserve) {
        mustPreserve.add(statement);
    }
    for (const pattern of [...forbid.keys()]) {
        for (const allowPattern of [...allow.keys()]) {
            if (matchesPattern(allowPattern, pattern) || matchesPattern(pattern, allowPattern)) {
                allow.delete(allowPattern);
            }
        }
        for (const reviewPattern of [...review.keys()]) {
            if (matchesPattern(reviewPattern, pattern) || matchesPattern(pattern, reviewPattern)) {
                review.delete(reviewPattern);
            }
        }
    }
    for (const pattern of [...review.keys()]) {
        for (const allowPattern of [...allow.keys()]) {
            if (matchesPattern(allowPattern, pattern) || matchesPattern(pattern, allowPattern)) {
                allow.delete(allowPattern);
            }
        }
    }
    const auditStatus = deriveAuditStatus(contract.audit_status, decision);
    return {
        ...contract,
        revision: contract.revision + 1,
        audit_status: auditStatus,
        repair_scope: {
            allowed: [...allow.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
            review_required: [...review.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
            forbidden: [...forbid.values()].sort((a, b) => a.pattern.localeCompare(b.pattern)),
        },
        must_preserve: uniqueSorted([...mustPreserve]),
        consistency_checks: decision.added_must_preserve.length > 0
            ? [
                ...contract.consistency_checks,
                ...decision.added_must_preserve.map(statement => ({
                    id: `human_audit_${contract.revision + 1}_${statement.length}`,
                    statement,
                    source: "human_audit_decision",
                    severity: "hard",
                    evidence: [`decision:${decision.decision_id}`],
                    reason: "Added by human audit decision.",
                })),
            ]
            : contract.consistency_checks,
    };
}
function buildHumanScopeEntry(pattern, target) {
    return {
        pattern,
        source: "human_audit_decision",
        confidence: "high",
        audit_weight: "critical",
        reason: target === "forbid"
            ? "Forbidden by human audit decision."
            : "Review-required by human audit decision.",
        evidence: ["human_audit_decision"],
    };
}
function deriveAuditStatus(previous, decision) {
    switch (decision.decision) {
        case "approve_repair_plan":
            return "approved_repair_plan";
        case "restrict_scope":
        case "expand_review_scope":
        case "add_must_preserve":
        case "add_forbidden_area":
            return "approved_with_modifications";
        case "require_manual_repair":
            return "manual_repair_required";
        case "approve_repair":
        case "request_revert":
        case "request_scope_expansion":
        case "keep_for_human_review":
        case "close_as_invalid":
            return "post_repair_reviewed";
        default:
            return previous;
    }
}
//# sourceMappingURL=repairPlanRevisioner.js.map