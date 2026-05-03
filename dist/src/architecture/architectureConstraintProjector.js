/**
 * P30: Architecture Constraint Projector
 *
 * Projects architecture constraints into ChangeScopeEntry[] format
 * for injection into the change/repair scope builders.
 *
 * CRITICAL INVARIANTS:
 *
 * Invariant A — Contextual ownership:
 *   owns/located_at/allowed_change are NOT global allowed.
 *   They are projected as "allowed" ONLY when the change/repair target
 *   subject matches the owning module. Otherwise they produce
 *   "architecture_scope_crossed" findings.
 *
 * Invariant B — Architecture constraints cannot be downgraded:
 *   The scope builder MUST apply bucket precedence (forbidden > review > allowed)
 *   AFTER merging architecture constraints. Architecture forbidden cannot be
 *   overridden by user intent.
 *
 * ref: P30
 */
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Project architecture constraints into scope entries.
 *
 * Global constraints are always projected.
 * Contextual constraints are projected as "allowed" only when the
 * change/repair target matches the owning subject.
 * Advisory constraints are never projected (they only appear in findings).
 */
export function projectArchitectureConstraints(input) {
    const entries = [];
    const { contract, targetSubjects, targetPathPatterns } = input;
    const normalizedTargetSubjects = targetSubjects.map(s => s.toLowerCase().trim());
    for (const constraint of contract.constraints) {
        switch (constraint.constraint_tier) {
            case "global":
                entries.push(...projectGlobalConstraint(constraint));
                break;
            case "contextual":
                entries.push(...projectContextualConstraint(constraint, normalizedTargetSubjects, targetPathPatterns));
                break;
            case "advisory":
                // Advisory constraints do not produce scope entries.
                // They appear in architectureConstraintEvaluator findings only.
                break;
        }
    }
    return entries;
}
// ---------------------------------------------------------------------------
// Internal projection logic
// ---------------------------------------------------------------------------
function projectGlobalConstraint(constraint) {
    const entries = [];
    for (const pattern of constraint.path_patterns) {
        switch (constraint.constraint_type) {
            case "forbidden_path":
                entries.push({
                    path_pattern: pattern,
                    bucket: "forbidden",
                    reason_kind: "architecture_forbidden",
                    rationale: `Architecture contract forbids changes to ${pattern} (subject: ${constraint.subject}).`,
                    source: "architecture_contract",
                    constraint_id: constraint.constraint_id,
                    subject: constraint.subject,
                });
                break;
            case "review_required_path":
                entries.push({
                    path_pattern: pattern,
                    bucket: "review_required",
                    reason_kind: "architecture_review",
                    rationale: `Architecture contract requires review for ${pattern} (subject: ${constraint.subject}).`,
                    source: "architecture_contract",
                    constraint_id: constraint.constraint_id,
                    subject: constraint.subject,
                });
                break;
            case "external_boundary_review":
                entries.push({
                    path_pattern: pattern,
                    bucket: "review_required",
                    reason_kind: "architecture_review",
                    rationale: `Architecture contract: external service boundary review for ${constraint.subject}.`,
                    source: "architecture_contract",
                    constraint_id: constraint.constraint_id,
                    subject: constraint.subject,
                });
                break;
            case "must_not_touch_together":
                // must_not_depend_on: project both sides as review_required
                entries.push({
                    path_pattern: pattern,
                    bucket: "review_required",
                    reason_kind: "architecture_boundary",
                    rationale: `This diff touches a must-not-depend boundary involving ${constraint.subject}. Review required.`,
                    source: "architecture_contract",
                    constraint_id: constraint.constraint_id,
                    subject: constraint.subject,
                });
                break;
        }
    }
    return entries;
}
/**
 * Contextual constraints (owns/located_at/allowed_change).
 *
 * These are projected as "allowed" ONLY when the change target matches
 * the owning subject. This prevents a Billing change from silently
 * allowing Auth-owned paths.
 *
 * If the change target does NOT match, these paths are left un-projected —
 * the constraint evaluator will flag them as architecture_scope_crossed
 * if they appear in the diff.
 */
function projectContextualConstraint(constraint, normalizedTargetSubjects, targetPathPatterns) {
    const entries = [];
    // Check if the change target subject matches this constraint's subject
    const subjectMatches = normalizedTargetSubjects.some(target => target === constraint.subject.toLowerCase().trim());
    // Also check if the target path patterns overlap with the constraint's paths
    const pathOverlaps = targetPathPatterns.some(targetPattern => constraint.path_patterns.some(constraintPattern => patternsOverlap(targetPattern, constraintPattern)));
    if (!subjectMatches && !pathOverlaps) {
        // Target does NOT match this module — do not project as allowed.
        // The evaluator will flag any touches as architecture_scope_crossed.
        return entries;
    }
    // Target matches: project as allowed
    for (const pattern of constraint.path_patterns) {
        entries.push({
            path_pattern: pattern,
            bucket: "allowed",
            reason_kind: "architecture_boundary",
            rationale: `Architecture contract: ${constraint.subject} owns ${pattern}.`,
            source: "architecture_contract",
            constraint_id: constraint.constraint_id,
            subject: constraint.subject,
        });
    }
    return entries;
}
/**
 * Check if two glob-like path patterns overlap.
 * Conservative: considers overlap if one is a prefix of the other.
 */
function patternsOverlap(a, b) {
    const cleanA = a.replace(/\*\*$/, "").replace(/\/$/, "");
    const cleanB = b.replace(/\*\*$/, "").replace(/\/$/, "");
    return cleanA.startsWith(cleanB) || cleanB.startsWith(cleanA) || cleanA === cleanB;
}
//# sourceMappingURL=architectureConstraintProjector.js.map