/**
 * P30-10: Architecture Constraint Adapter (for Repair)
 *
 * Converts an accepted ArchitectureContract into RepairScopeEntry[]
 * that the repairScopeBuilder can consume.
 *
 * Same safety properties as the Change adapter (P30-9):
 * - Only ACCEPTED constraints from reviewed contract produce entries
 * - forbidden > review_required > allowed precedence maintained
 * - Advisory-only relations never produce blocking entries
 * - Repair's existing suspect/impact/scope semantics are preserved
 *
 * The repair adapter does NOT replace suspect surface or impact surface.
 * It ONLY injects architecture-sourced forbidden/review/allowed constraints
 * that are then merged into the shared precedence resolver.
 *
 * ref: P30
 */
import { ADVISORY_ONLY_RELATIONS } from "../architecture/types.js";
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Convert accepted architecture contract constraints into repair scope entries.
 *
 * Follows the same constraint projection logic as the change adapter,
 * but produces RepairScopeEntry (pattern + source + confidence + audit_weight).
 */
export function adaptArchitectureConstraintsForRepair(input) {
    const { contract, repairSubjects } = input;
    const entries = [];
    const normalizedSubjects = repairSubjects.map(s => s.toLowerCase().trim());
    const summary = { forbidden: 0, review_required: 0, allowed: 0, info: 0 };
    for (const constraint of contract.constraints) {
        const constraintEntries = projectConstraintToRepairEntries(constraint, normalizedSubjects);
        for (const entry of constraintEntries) {
            entries.push(entry);
            if (entry.audit_weight === "critical")
                summary.forbidden++;
            else if (entry.audit_weight === "elevated")
                summary.review_required++;
            else
                summary.allowed++;
        }
    }
    // Advisory relations produce info-only entries
    const advisorySet = new Set(ADVISORY_ONLY_RELATIONS);
    for (const rel of contract.accepted_relations) {
        if (!advisorySet.has(rel.relation_type))
            continue;
        if (rel.path_patterns.length === 0)
            continue;
        for (const pattern of rel.path_patterns) {
            entries.push({
                pattern,
                source: "architecture_contract",
                confidence: "low",
                audit_weight: "normal",
                reason: `Advisory: "${rel.subject}" has a "${rel.relation_type}" relation with "${rel.object}". Informational only.`,
                evidence: [`architecture:advisory:${rel.relation_type}:${rel.subject}`],
            });
            summary.info++;
        }
    }
    return { entries, summary };
}
// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
function projectConstraintToRepairEntries(constraint, normalizedSubjects) {
    const entries = [];
    for (const pattern of constraint.path_patterns) {
        switch (constraint.constraint_type) {
            case "forbidden_path":
                // GLOBAL: always forbidden
                entries.push({
                    pattern,
                    source: "architecture_contract",
                    confidence: "high",
                    audit_weight: "critical",
                    reason: `Architecture contract forbids changes to "${pattern}" (subject: ${constraint.subject}).`,
                    evidence: [`architecture:forbidden:${constraint.subject}`],
                });
                break;
            case "review_required_path":
            case "external_boundary_review":
                // GLOBAL: always review_required
                entries.push({
                    pattern,
                    source: "architecture_contract",
                    confidence: "high",
                    audit_weight: "elevated",
                    reason: `Architecture contract requires review for changes to "${pattern}" (subject: ${constraint.subject}).`,
                    evidence: [`architecture:review_required:${constraint.subject}`],
                });
                break;
            case "must_not_touch_together":
                entries.push({
                    pattern,
                    source: "architecture_contract",
                    confidence: "medium",
                    audit_weight: "elevated",
                    reason: `Architecture boundary constraint for "${constraint.subject}".`,
                    evidence: [`architecture:boundary:${constraint.subject}`],
                });
                break;
            case "allowed_path":
                // CONTEXTUAL: only allowed when target subject matches
                if (constraint.constraint_tier === "contextual") {
                    const subjectMatch = normalizedSubjects.some(s => s === constraint.subject.toLowerCase().trim());
                    if (subjectMatch) {
                        entries.push({
                            pattern,
                            source: "architecture_contract",
                            confidence: "high",
                            audit_weight: "normal",
                            reason: `Architecture contract: "${constraint.subject}" owns "${pattern}".`,
                            evidence: [`architecture:ownership:${constraint.subject}`],
                        });
                    }
                    // Non-matching subject: don't project as allowed
                }
                else {
                    entries.push({
                        pattern,
                        source: "architecture_contract",
                        confidence: "high",
                        audit_weight: "normal",
                        reason: `Architecture contract allows changes to "${pattern}" (subject: ${constraint.subject}).`,
                        evidence: [`architecture:allowed:${constraint.subject}`],
                    });
                }
                break;
            default:
                break;
        }
    }
    return entries;
}
//# sourceMappingURL=architectureConstraintAdapter.js.map