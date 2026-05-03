/**
 * P30: Architecture Contract Builder
 *
 * Builds the immutable architecture contract from accepted relations.
 * This is the central artifact that constrains change/repair workflows.
 *
 * Three-tier constraint projection (User-Required Invariant A):
 * - Global: forbidden_change, review_required_for, external_service → always apply
 * - Contextual: owns, located_at, allowed_change → only when target matches subject
 * - Advisory: remaining 7 relation types → render findings, never affect verdict
 *
 * ref: P30
 */
import { ADVISORY_ONLY_RELATIONS, ARCHITECTURE_CONTRACT_LIMITATIONS as LIMITATIONS, } from "./types.js";
import { generateConstraintId, generateArchitectureContractId, computeArchitectureContractHash, } from "./architectureId.js";
/**
 * Build an architecture contract from resolved (post-override) relations.
 *
 * Only relations with `review_status === "accepted"` or `review_status === "edited"`
 * are included as constraint-generating. Rejected and unreviewed relations
 * are recorded but do not produce constraints.
 */
export function buildArchitectureContract(input) {
    const { archId, sourceDocumentHash, revision, resolvedRelations, allClaimIds } = input;
    // Partition relations
    const acceptedRelations = [];
    const rejectedClaimIds = [];
    const unresolvedClaimIds = [];
    const acceptedClaimIds = new Set();
    const rejectedClaimIdSet = new Set();
    for (const rel of resolvedRelations) {
        if (rel.review_status === "accepted" || rel.review_status === "edited") {
            acceptedRelations.push(rel);
            for (const claimId of rel.source_claim_ids) {
                acceptedClaimIds.add(claimId);
            }
        }
        else if (rel.review_status === "rejected") {
            for (const claimId of rel.source_claim_ids) {
                rejectedClaimIdSet.add(claimId);
                rejectedClaimIds.push(claimId);
            }
        }
    }
    // Claims not in accepted or rejected → unresolved
    for (const claimId of allClaimIds) {
        if (!acceptedClaimIds.has(claimId) && !rejectedClaimIdSet.has(claimId)) {
            unresolvedClaimIds.push(claimId);
        }
    }
    // Build constraints from accepted relations
    const constraints = buildConstraints(acceptedRelations);
    // Compute contract hash (semantic only, no timestamps)
    const contractHash = computeArchitectureContractHash({
        schema_version: "architecture_contract@0.1.0",
        source_document_hash: sourceDocumentHash,
        revision,
        accepted_relations: acceptedRelations.map(r => ({
            subject: r.subject,
            relation_type: r.relation_type,
            object: r.object,
            path_patterns: r.path_patterns,
            review_status: r.review_status,
        })),
        rejected_claims: [...new Set(rejectedClaimIds)].sort(),
        constraints: constraints.map(c => ({
            constraint_type: c.constraint_type,
            constraint_tier: c.constraint_tier,
            subject: c.subject,
            path_patterns: c.path_patterns,
            severity: c.severity,
        })),
    });
    return {
        schema_version: "architecture_contract@0.1.0",
        architecture_contract_id: generateArchitectureContractId(archId, revision),
        source_arch_id: archId,
        source_document_hash: sourceDocumentHash,
        revision,
        accepted_relations: acceptedRelations,
        rejected_claims: [...new Set(rejectedClaimIds)].sort(),
        unresolved_claims: [...new Set(unresolvedClaimIds)].sort(),
        constraints,
        limitations: [...LIMITATIONS],
        contract_hash: contractHash,
    };
}
// ---------------------------------------------------------------------------
// Constraint projection
// ---------------------------------------------------------------------------
function buildConstraints(acceptedRelations) {
    const constraints = [];
    for (const rel of acceptedRelations) {
        // Skip advisory-only relations — they don't generate constraints
        if (ADVISORY_ONLY_RELATIONS.includes(rel.relation_type)) {
            continue;
        }
        // Skip relations without path patterns (nothing to constrain)
        if (rel.path_patterns.length === 0 && !isPathlessConstraintType(rel.relation_type)) {
            continue;
        }
        const projected = projectRelationToConstraint(rel);
        if (projected) {
            constraints.push(projected);
        }
    }
    return constraints.sort((a, b) => `${a.constraint_tier}:${a.subject}:${a.constraint_type}`.localeCompare(`${b.constraint_tier}:${b.subject}:${b.constraint_type}`));
}
function projectRelationToConstraint(rel) {
    switch (rel.relation_type) {
        // ── Global constraints (always apply) ──────────────────────────
        case "forbidden_change":
            return makeConstraint(rel, "forbidden_path", "global", "blocking");
        case "review_required_for":
            return makeConstraint(rel, "review_required_path", "global", "review");
        case "external_service":
            return makeConstraint(rel, "external_boundary_review", "global", "review");
        // ── Contextual constraints (only when target matches subject) ──
        case "owns":
        case "located_at":
        case "allowed_change":
            return makeConstraint(rel, "allowed_path", "contextual", "info");
        // ── Dependency constraints ─────────────────────────────────────
        case "depends_on":
            // depends_on doesn't generate a blocking constraint in MVP
            return null;
        case "must_not_depend_on":
            // Review-severity only (User decision #2: no blocking without import evidence)
            return makeConstraint(rel, "must_not_touch_together", "global", "review");
        default:
            return null;
    }
}
function makeConstraint(rel, constraintType, tier, severity) {
    return {
        constraint_id: generateConstraintId(constraintType, rel.subject, rel.path_patterns),
        constraint_type: constraintType,
        constraint_tier: tier,
        subject: rel.subject,
        path_patterns: rel.path_patterns,
        severity,
        source_relation_ids: [rel.relation_id],
        source_claim_ids: [...rel.source_claim_ids],
    };
}
function isPathlessConstraintType(relationType) {
    return relationType === "external_service" || relationType === "must_not_depend_on";
}
//# sourceMappingURL=architectureContractBuilder.js.map