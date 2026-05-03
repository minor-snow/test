/**
 * P30-9: Architecture Constraint Adapter (for Change)
 *
 * Converts an accepted ArchitectureContract into ChangeScopeEntry[]
 * that the changeScopeBuilder can consume.
 *
 * Key safety properties:
 * - Only ACCEPTED relations with review_status "accepted" produce entries
 * - Unreviewed/rejected relations produce nothing
 * - forbidden > review_required > allowed precedence is ALWAYS maintained
 * - User intent CANNOT downgrade architecture-sourced forbidden or review
 * - Advisory-only relations produce info-level entries, never forbidden/review
 *
 * The adapter does NOT consume the contract directly. It takes the
 * projector output (ArchitectureConstraintProjectionEntry[]) which
 * has already resolved contextual vs global constraints.
 *
 * ref: P30
 */
import { ADVISORY_ONLY_RELATIONS } from "../architecture/types.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Convert accepted architecture contract constraints into change scope entries.
 *
 * Only constraints from accepted relations are projected.
 * The `source` field is always "architecture_contract" so the
 * scope builder can distinguish architecture-sourced entries from
 * user-intent or default-rule entries.
 */
export function adaptArchitectureConstraints(input) {
    const { contract, targetSubjects, targetPathPatterns } = input;
    const entries = [];
    const normalizedTargets = targetSubjects.map(s => s.toLowerCase().trim());
    const summary = { forbidden: 0, review_required: 0, allowed: 0, info: 0 };
    for (const constraint of contract.constraints) {
        const constraintEntries = projectConstraintToEntries(constraint, normalizedTargets);
        for (const entry of constraintEntries) {
            entries.push(entry);
            if (entry.bucket === "forbidden")
                summary.forbidden++;
            else if (entry.bucket === "review_required")
                summary.review_required++;
            else
                summary.allowed++;
        }
    }
    // Advisory relations produce info-only entries (never blocking)
    const advisorySet = new Set(ADVISORY_ONLY_RELATIONS);
    for (const rel of contract.accepted_relations) {
        if (!advisorySet.has(rel.relation_type))
            continue;
        if (rel.path_patterns.length === 0)
            continue;
        for (const pattern of rel.path_patterns) {
            entries.push({
                path_pattern: pattern,
                bucket: "allowed", // Advisory = never blocking
                reason_kind: "architecture_advisory",
                rationale: `Advisory: "${rel.subject}" has a "${rel.relation_type}" relation with "${rel.object}". Informational only.`,
                source: "architecture_contract",
            });
            summary.info++;
        }
    }
    return { entries, summary };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function projectConstraintToEntries(constraint, normalizedTargets) {
    const entries = [];
    for (const pattern of constraint.path_patterns) {
        switch (constraint.constraint_type) {
            case "forbidden_path":
                // GLOBAL: always forbidden, regardless of target
                entries.push({
                    path_pattern: pattern,
                    bucket: "forbidden",
                    reason_kind: "architecture_forbidden",
                    rationale: `Architecture contract forbids changes to "${pattern}" (subject: ${constraint.subject}).`,
                    source: "architecture_contract",
                });
                break;
            case "review_required_path":
            case "external_boundary_review":
                // GLOBAL: always review_required, regardless of target
                entries.push({
                    path_pattern: pattern,
                    bucket: "review_required",
                    reason_kind: "architecture_review_required",
                    rationale: `Architecture contract requires review for changes to "${pattern}" (subject: ${constraint.subject}).`,
                    source: "architecture_contract",
                });
                break;
            case "must_not_touch_together":
                // Special: produces review_required
                entries.push({
                    path_pattern: pattern,
                    bucket: "review_required",
                    reason_kind: "architecture_boundary",
                    rationale: `Architecture boundary constraint for "${constraint.subject}".`,
                    source: "architecture_contract",
                });
                break;
            case "allowed_path":
                // CONTEXTUAL: only allowed when target subject matches
                if (constraint.constraint_tier === "contextual") {
                    const subjectMatch = normalizedTargets.some(t => t === constraint.subject.toLowerCase().trim());
                    if (subjectMatch) {
                        entries.push({
                            path_pattern: pattern,
                            bucket: "allowed",
                            reason_kind: "architecture_ownership",
                            rationale: `Architecture contract: "${constraint.subject}" owns "${pattern}".`,
                            source: "architecture_contract",
                        });
                    }
                    // If subject doesn't match, we don't project as allowed
                    // (scope crossing will be detected by the evaluator)
                }
                else {
                    // Global allowed (rare, but possible)
                    entries.push({
                        path_pattern: pattern,
                        bucket: "allowed",
                        reason_kind: "architecture_ownership",
                        rationale: `Architecture contract allows changes to "${pattern}" (subject: ${constraint.subject}).`,
                        source: "architecture_contract",
                    });
                }
                break;
            default:
                // Unknown constraint type — do not project
                break;
        }
    }
    return entries;
}
//# sourceMappingURL=architectureConstraintAdapter.js.map