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
/**
 * Generate an architecture ingest run ID from the source document content hash.
 * Same source content → same arch_id.
 */
export declare function generateArchId(sourceContentHash: string): string;
/**
 * Generate a claim ID from the architecture run ID, heading index, and line range.
 * Deterministic: same document structure → same claim IDs.
 */
export declare function generateClaimId(archId: string, headingIndex: number, lineStart: number): string;
/**
 * Generate a relation ID from subject, relation type, and object.
 * Deterministic: same semantic triple → same relation ID.
 */
export declare function generateRelationId(subject: string, relationType: string, object: string): string;
/**
 * Generate an evidence ID from claim ID and evidence specifics.
 */
export declare function generateEvidenceId(claimId: string, evidenceType: string, repoRelativePath: string): string;
/**
 * Generate an override event ID.
 * Includes timestamp for unique ledger identity.
 * This is the ONLY ID that includes temporal data —
 * the contract hash will NOT be derived from override IDs.
 */
export declare function generateOverrideId(operation: string, subject: string, timestamp: string): string;
/**
 * Generate a constraint ID from constraint semantics.
 * Deterministic: same constraint definition → same ID.
 */
export declare function generateConstraintId(constraintType: string, subject: string, pathPatterns: readonly string[]): string;
/**
 * Generate an architecture contract ID from arch_id and revision.
 */
export declare function generateArchitectureContractId(archId: string, revision: number): string;
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
export declare function computeArchitectureContractHash(input: {
    schema_version: string;
    source_document_hash: string;
    revision: number;
    accepted_relations: readonly {
        subject: string;
        relation_type: string;
        object: string;
        path_patterns: readonly string[];
        review_status: string;
    }[];
    rejected_claims: readonly string[];
    constraints: readonly {
        constraint_type: string;
        constraint_tier: string;
        subject: string;
        path_patterns: readonly string[];
        severity: string;
    }[];
}): string;
