/**
 * P30: Architecture Governance Types
 *
 * All architecture-specific data models for the Architecture Mapping Review MVP.
 * Covers the full lifecycle: ingest → claims → evidence → relations → overrides → contract → constraints.
 *
 * ref: P30
 */
/**
 * The 15-member architecture relation type union.
 *
 * Split into three tiers for constraint projection:
 * - Constraint-generating (8): produce scope entries that affect verdicts
 * - Advisory-only (7): render in mapping review, no verdict impact
 */
export type ArchitectureRelationType = "owns" | "located_at" | "depends_on" | "must_not_depend_on" | "review_required_for" | "forbidden_change" | "allowed_change" | "external_service" | "exposes_interface" | "entrypoint_for" | "tested_by" | "adapter_for" | "reads_from" | "writes_to" | "boundary_between";
/** Relations that generate hard constraints in MVP. */
export declare const CONSTRAINT_GENERATING_RELATIONS: readonly ArchitectureRelationType[];
/** Relations that are advisory-only in MVP. */
export declare const ADVISORY_ONLY_RELATIONS: readonly ArchitectureRelationType[];
export type ArchitectureIngestRunStatus = "ingested" | "review_generated" | "overridden" | "accepted" | "superseded";
export type ArchitectureIngestRun = {
    readonly schema_version: "architecture_ingest_run@0.1.0";
    readonly arch_id: string;
    readonly source_path: string;
    readonly source_content_hash: string;
    readonly created_at: string;
    readonly status: ArchitectureIngestRunStatus;
};
export type ArchitectureClaimKind = "ownership" | "dependency" | "boundary" | "review_policy" | "external_service" | "data_flow" | "unknown";
export type ArchitectureClaimStatus = "candidate" | "mapped" | "needs_review" | "rejected" | "accepted";
export type ArchitectureExtractionConfidence = "high" | "medium" | "low";
export type ArchitectureClaim = {
    readonly claim_id: string;
    readonly source_path: string;
    readonly source_heading: string;
    readonly source_line_start: number;
    readonly source_line_end: number;
    readonly raw_text: string;
    readonly extracted_subject?: string;
    readonly extracted_relation?: ArchitectureRelationType;
    readonly extracted_object?: string;
    readonly claim_kind: ArchitectureClaimKind;
    readonly extraction_confidence: ArchitectureExtractionConfidence;
    readonly status: ArchitectureClaimStatus;
};
export type ArchitectureEvidenceType = "path_exists" | "directory_match" | "file_match" | "test_match" | "manifest_match" | "config_hint";
export type ArchitectureEvidenceCandidate = {
    readonly evidence_id: string;
    readonly claim_id: string;
    readonly evidence_type: ArchitectureEvidenceType;
    readonly repo_relative_path: string;
    readonly match_reason: string;
    readonly confidence: ArchitectureExtractionConfidence;
};
export type ArchitectureEntityKind = "module" | "package" | "service" | "external_service" | "path_group" | "interface" | "unknown";
export type ArchitectureRelationReviewStatus = "unreviewed" | "accepted" | "edited" | "rejected";
export type ArchitectureRelation = {
    readonly relation_id: string;
    readonly relation_type: ArchitectureRelationType;
    readonly subject: string;
    readonly object: string;
    readonly subject_kind: ArchitectureEntityKind;
    readonly object_kind: ArchitectureEntityKind;
    readonly path_patterns: readonly string[];
    readonly source_claim_ids: readonly string[];
    readonly evidence_ids: readonly string[];
    readonly override_ids: readonly string[];
    readonly confidence: ArchitectureExtractionConfidence;
    readonly review_status: ArchitectureRelationReviewStatus;
};
export type ArchitectureOverrideOperation = "accept_relation" | "reject_relation" | "set_mapping" | "set_external" | "set_review_required" | "set_forbidden" | "set_allowed" | "set_must_not_depend_on";
export type ArchitectureOverride = {
    readonly override_id: string;
    readonly created_at: string;
    readonly operation: ArchitectureOverrideOperation;
    readonly subject: string;
    readonly relation_type?: ArchitectureRelationType;
    readonly object?: string;
    readonly path_patterns?: readonly string[];
    readonly reason: string;
    readonly operator_id?: string;
};
export type ArchitectureConstraintType = "allowed_path" | "review_required_path" | "forbidden_path" | "must_not_touch_together" | "requires_scope_expansion" | "external_boundary_review" | "test_obligation_hint";
export type ArchitectureConstraintSeverity = "info" | "review" | "blocking";
/**
 * Constraint tier determines how the constraint is projected into scope:
 * - global: always applied regardless of change/repair target
 * - contextual: applied only when the change/repair target matches the subject
 * - advisory: rendered in findings but never affects verdict
 */
export type ArchitectureConstraintTier = "global" | "contextual" | "advisory";
export type ArchitectureConstraint = {
    readonly constraint_id: string;
    readonly constraint_type: ArchitectureConstraintType;
    readonly constraint_tier: ArchitectureConstraintTier;
    readonly subject: string;
    readonly path_patterns: readonly string[];
    readonly severity: ArchitectureConstraintSeverity;
    readonly source_relation_ids: readonly string[];
    readonly source_claim_ids: readonly string[];
};
export type ArchitectureContract = {
    readonly schema_version: "architecture_contract@0.1.0";
    readonly architecture_contract_id: string;
    readonly source_arch_id: string;
    readonly source_document_hash: string;
    readonly revision: number;
    readonly accepted_relations: readonly ArchitectureRelation[];
    readonly rejected_claims: readonly string[];
    readonly unresolved_claims: readonly string[];
    readonly constraints: readonly ArchitectureConstraint[];
    readonly limitations: readonly string[];
    readonly contract_hash: string;
};
export type ArchitectureFindingKind = "architecture_boundary_crossed" | "architecture_forbidden_path" | "architecture_contract_modified" | "architecture_scope_crossed" | "architecture_dependency_boundary_review" | "architecture_external_boundary_review" | "architecture_advisory";
export type ArchitectureFinding = {
    readonly kind: ArchitectureFindingKind;
    readonly message: string;
    readonly files: readonly string[];
    readonly severity: "info" | "review" | "blocking";
    readonly constraint_id?: string;
    readonly subject?: string;
    readonly object?: string;
};
/** Fixed limitations block per Invariant 5. */
export declare const ARCHITECTURE_CONTRACT_LIMITATIONS: readonly string[];
