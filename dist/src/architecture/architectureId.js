/**
 * P30: Architecture ID Generation
 *
 * Deterministic ID generation for all architecture entities.
 * Uses `shortStableId()` from `src/deterministic.ts` — same pattern
 * as repair session IDs and change IDs.
 *
 * Design decision:
 * - Override event IDs include timestamp for ledger identity.
 * - Architecture contract hash is derived from semantic content only,
 *   excluding timestamps, so identical semantics → identical hash.
 *
 * ref: P30
 */
import { shortStableId, stableHash } from "../deterministic.js";
/**
 * Generate an architecture ingest run ID from the source document content hash.
 * Same source content → same arch_id.
 */
export function generateArchId(sourceContentHash) {
    return shortStableId("arch", { source_content_hash: sourceContentHash });
}
/**
 * Generate a claim ID from the architecture run ID, heading index, and line range.
 * Deterministic: same document structure → same claim IDs.
 */
export function generateClaimId(archId, headingIndex, lineStart) {
    return shortStableId("claim", { arch_id: archId, heading_index: headingIndex, line_start: lineStart });
}
/**
 * Generate a relation ID from subject, relation type, and object.
 * Deterministic: same semantic triple → same relation ID.
 */
export function generateRelationId(subject, relationType, object) {
    return shortStableId("rel", { subject, relation_type: relationType, object });
}
/**
 * Generate an evidence ID from claim ID and evidence specifics.
 */
export function generateEvidenceId(claimId, evidenceType, repoRelativePath) {
    return shortStableId("evi", { claim_id: claimId, evidence_type: evidenceType, path: repoRelativePath });
}
/**
 * Generate an override event ID.
 * Includes timestamp for unique ledger identity.
 * This is the ONLY ID that includes temporal data —
 * the contract hash will NOT be derived from override IDs.
 */
export function generateOverrideId(operation, subject, timestamp) {
    return shortStableId("ovr", { operation, subject, timestamp });
}
/**
 * Generate a constraint ID from constraint semantics.
 * Deterministic: same constraint definition → same ID.
 */
export function generateConstraintId(constraintType, subject, pathPatterns) {
    return shortStableId("cst", { constraint_type: constraintType, subject, path_patterns: [...pathPatterns].sort() });
}
/**
 * Generate an architecture contract ID from arch_id and revision.
 */
export function generateArchitectureContractId(archId, revision) {
    return shortStableId("archc", { arch_id: archId, revision });
}
/**
 * Compute a stable content hash for the architecture contract.
 *
 * CRITICAL: This hash is derived from SEMANTIC content only.
 * It excludes:
 * - Override timestamps
 * - Override event IDs
 * - Any temporal data
 *
 * It includes:
 * - Accepted relations (subject, type, object, path_patterns, review_status)
 * - Rejected claim IDs
 * - Constraints (type, tier, subject, path_patterns, severity)
 * - Source document hash
 * - Schema version
 */
export function computeArchitectureContractHash(input) {
    // Build a semantic-only payload for hashing
    const semanticPayload = {
        schema_version: input.schema_version,
        source_document_hash: input.source_document_hash,
        revision: input.revision,
        accepted_relations: input.accepted_relations.map(r => ({
            subject: r.subject,
            relation_type: r.relation_type,
            object: r.object,
            path_patterns: [...r.path_patterns].sort(),
            review_status: r.review_status,
        })).sort((a, b) => `${a.subject}:${a.relation_type}:${a.object}`.localeCompare(`${b.subject}:${b.relation_type}:${b.object}`)),
        rejected_claims: [...input.rejected_claims].sort(),
        constraints: input.constraints.map(c => ({
            constraint_type: c.constraint_type,
            constraint_tier: c.constraint_tier,
            subject: c.subject,
            path_patterns: [...c.path_patterns].sort(),
            severity: c.severity,
        })).sort((a, b) => `${a.subject}:${a.constraint_type}`.localeCompare(`${b.subject}:${b.constraint_type}`)),
    };
    return stableHash(semanticPayload);
}
//# sourceMappingURL=architectureId.js.map