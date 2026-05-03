/**
 * P30: Architecture Contract Validator
 *
 * Validates architecture contract integrity before it becomes active.
 * Enforces structural invariants that protect the governance chain.
 *
 * Core checks:
 * 1. All accepted relations must have provenance (claim_ids or override_ids)
 * 2. No absolute paths in contract
 * 3. Contract hash matches recomputed hash
 * 4. No unreviewed claims leaked into constraints
 * 5. Advisory-only relations never appear in constraints
 *
 * ref: P30
 */
import { ADVISORY_ONLY_RELATIONS } from "./types.js";
import { computeArchitectureContractHash } from "./architectureId.js";
// ---------------------------------------------------------------------------
// Absolute path detection
// ---------------------------------------------------------------------------
/**
 * Matches absolute paths:
 *   /home/user/project/...
 *   C:\Users\...
 *   D:/projects/...
 */
const ABSOLUTE_PATH_RE = /(?:^|[\s"'`])(?:\/(?:home|tmp|var|usr|etc|root|opt|mnt)\/|[A-Z]:[/\\])/;
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Validate an architecture contract for structural integrity.
 *
 * This must pass before a contract is written to disk as the active contract.
 */
export function validateArchitectureContract(contract) {
    const errors = [];
    const warnings = [];
    // 1. Schema version check
    if (contract.schema_version !== "architecture_contract@0.1.0") {
        errors.push(`Invalid schema_version: "${contract.schema_version}"`);
    }
    // 2. All accepted relations must have provenance
    for (const rel of contract.accepted_relations) {
        if (rel.source_claim_ids.length === 0 && rel.override_ids.length === 0) {
            errors.push(`Relation "${rel.subject} ${rel.relation_type} ${rel.object}" has no provenance (no source claims or overrides).`);
        }
    }
    // 3. No unreviewed relations in accepted list
    for (const rel of contract.accepted_relations) {
        if (rel.review_status === "unreviewed") {
            errors.push(`Unreviewed relation "${rel.subject} ${rel.relation_type} ${rel.object}" found in accepted_relations. ` +
                `Unreviewed claims must not leak into constraints (Invariant 1).`);
        }
        if (rel.review_status === "rejected") {
            errors.push(`Rejected relation "${rel.subject} ${rel.relation_type} ${rel.object}" found in accepted_relations.`);
        }
    }
    // 4. No absolute paths in any constraint or relation
    for (const constraint of contract.constraints) {
        for (const pattern of constraint.path_patterns) {
            if (ABSOLUTE_PATH_RE.test(pattern)) {
                errors.push(`Absolute path detected in constraint "${constraint.constraint_id}": "${pattern}" (Invariant 3).`);
            }
        }
    }
    for (const rel of contract.accepted_relations) {
        for (const pattern of rel.path_patterns) {
            if (ABSOLUTE_PATH_RE.test(pattern)) {
                errors.push(`Absolute path detected in relation "${rel.relation_id}": "${pattern}" (Invariant 3).`);
            }
        }
    }
    // 5. Advisory-only relations must not generate constraints
    const advisorySet = new Set(ADVISORY_ONLY_RELATIONS);
    for (const constraint of contract.constraints) {
        for (const relId of constraint.source_relation_ids) {
            const rel = contract.accepted_relations.find(r => r.relation_id === relId);
            if (rel && advisorySet.has(rel.relation_type)) {
                errors.push(`Advisory-only relation type "${rel.relation_type}" generated constraint "${constraint.constraint_id}". ` +
                    `Advisory relations must never produce constraints.`);
            }
        }
    }
    // 6. Contract hash integrity
    const recomputedHash = computeArchitectureContractHash({
        schema_version: contract.schema_version,
        source_document_hash: contract.source_document_hash,
        revision: contract.revision,
        accepted_relations: contract.accepted_relations.map(r => ({
            subject: r.subject,
            relation_type: r.relation_type,
            object: r.object,
            path_patterns: r.path_patterns,
            review_status: r.review_status,
        })),
        rejected_claims: [...contract.rejected_claims],
        constraints: contract.constraints.map(c => ({
            constraint_type: c.constraint_type,
            constraint_tier: c.constraint_tier,
            subject: c.subject,
            path_patterns: c.path_patterns,
            severity: c.severity,
        })),
    });
    if (contract.contract_hash !== recomputedHash) {
        errors.push(`Contract hash mismatch. Stored: "${contract.contract_hash}", recomputed: "${recomputedHash}". ` +
            `Contract may have been tampered with.`);
    }
    // 7. Limitations block must be present
    if (!contract.limitations || contract.limitations.length === 0) {
        warnings.push("Contract has no limitations block. This is unusual.");
    }
    // 8. Constraints must have valid tiers
    for (const constraint of contract.constraints) {
        if (!["global", "contextual", "advisory"].includes(constraint.constraint_tier)) {
            errors.push(`Invalid constraint_tier "${constraint.constraint_tier}" in constraint "${constraint.constraint_id}".`);
        }
    }
    // 9. Contextual constraints should have non-empty path_patterns
    for (const constraint of contract.constraints) {
        if (constraint.constraint_tier === "contextual" && constraint.path_patterns.length === 0) {
            warnings.push(`Contextual constraint "${constraint.constraint_id}" for subject "${constraint.subject}" has no path patterns.`);
        }
    }
    return {
        status: errors.length === 0 ? "valid" : "invalid",
        errors,
        warnings,
    };
}
//# sourceMappingURL=architectureContractValidator.js.map