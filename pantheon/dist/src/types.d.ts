/**
 * Pantheon Core Types
 *
 * ref: 执行宪法 v0.2 §4 数据模型
 *
 * These types define the canonical data structures for Pantheon.
 * All code that creates or manipulates these structures must conform
 * to these definitions.
 */
/** ref: §4.1 */
export type ArtifactType = "ArchitectureDraft" | "Constitution" | "InterfaceSpec" | "ModuleSpec" | "DecisionLog" | "RiskRegister";
/** ref: §4.1.1 – does NOT participate in content_hash or revision_hash */
export type ArtifactMetadata = {
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    tags?: string[];
    notes?: string;
};
/** ref: §4.1 */
export type Artifact = {
    artifact_id: string;
    artifact_type: ArtifactType;
    schema_version: string;
    revision_id: string;
    parent_revision_id?: string;
    sections: ArtifactSection[];
    metadata: ArtifactMetadata;
};
/** ref: §4.2 */
export type ArtifactSection = {
    section_id: string;
    title: string;
    commitments: CommitmentBlock[];
};
/** ref: §4.3 */
export type BlockType = "invariant" | "mechanism" | "constraint" | "decision" | "risk" | "interface" | "module" | "state_machine" | "open_question";
/** ref: §4.3 */
export type BlockStatus = "draft" | "candidate" | "approved" | "suspect" | "revoked";
/** ref: §4.3 */
export type CommitmentBlock = {
    block_id: string;
    type: BlockType;
    text: string;
    rationale?: string;
    terms?: string[];
    linked_architecture_blocks?: string[];
    linked_interface_blocks?: string[];
    status: BlockStatus;
    content_hash: string;
};
/** ref: H-04 */
export type HashMeta = {
    hash_algorithm: "sha256";
    serialization_version: "stable_json_v1";
};
/** ref: §10.1 */
export type IssueSeverity = "low" | "medium" | "high" | "critical";
/** ref: §10.1 */
export type Issue = {
    issue_id: string;
    artifact_id: string;
    base_revision_id: string;
    target_block_id: string;
    issue_type: string;
    severity: IssueSeverity;
    message: string;
};
/**
 * ref: §10.2
 * MVP only implements "replace_block".
 * Designed as extensible enum per constitution requirement.
 */
export type PatchOp = "replace_block";
/** ref: §10.2 */
export type PatchIntent = {
    op: PatchOp;
    target_block_id: string;
    replacement_text: string;
    replacement_linked_architecture_blocks?: string[];
    replacement_linked_interface_blocks?: string[];
};
/** ref: §10.2 */
export type PatchProposal = {
    proposal_id: string;
    artifact_id: string;
    base_revision_id: string;
    source_issue_ids: string[];
    operations: PatchIntent[];
};
/** ref: §10.3 */
export type ReplaceBlockOperation = {
    op: "replace_block";
    target_block_id: string;
    expected_old_hash: string;
    new_block: CommitmentBlock;
};
/** ref: §10.3 */
export type ArtifactPatch = {
    patch_id: string;
    artifact_id: string;
    base_revision_id: string;
    source_issue_ids: string[];
    operations: ReplaceBlockOperation[];
};
export type PatchRejectReason = "ARTIFACT_ID_MISMATCH" | "BASE_REVISION_MISMATCH" | "TARGET_BLOCK_NOT_FOUND" | "HASH_MISMATCH" | "CROSS_SECTION_OPERATIONS" | "NEW_BLOCK_SCHEMA_INVALID" | "NEW_BLOCK_HASH_INVALID";
export type ApplyPatchResult = {
    status: "accepted";
    candidate_revision: Artifact;
    elevated_review_required: boolean;
} | {
    status: "rejected";
    reason: PatchRejectReason;
    details: string;
};
export type SemanticRegressionInput = {
    old_blocks: CommitmentBlock[];
    new_blocks: CommitmentBlock[];
    changed_blocks: Array<{
        block_id: string;
        old: CommitmentBlock;
        new: CommitmentBlock;
    }>;
    section_context: Record<string, string>;
    constitution_constraints: string[];
};
export type SemanticRegressionResult = {
    status: "passed" | "failed";
    failed_gates: string[];
    reasons: string[];
    affected_blocks: string[];
};
export type OverrideType = "accept_failed_gate" | "accept_with_known_risk" | "manual_replace_block" | "defer_issue" | "request_targeted_rewrite";
export type OverridePatch = {
    override_id: string;
    artifact_id: string;
    base_revision_id: string;
    override_type: OverrideType;
    operator: {
        type: "human";
        id: string;
    };
    failed_gates: string[];
    affected_issue_ids: string[];
    operations?: ReplaceBlockOperation[];
    rationale: string;
    risk_acceptance?: {
        accepted_risks: string[];
        mitigation_plan?: string;
        revisit_condition?: string;
    };
    timestamp: string;
};
/** ref: C-05 */
export type CanonicalPointer = {
    artifact_id: string;
    current_revision_id: string;
};
export type AuditEntryType = "artifact_created" | "revision_saved" | "patch_applied" | "patch_rejected" | "semantic_regression_passed" | "semantic_regression_failed" | "override_applied" | "canonical_updated" | "draft_promoted";
export type AuditEntry = {
    entry_id: string;
    timestamp: string;
    entry_type: AuditEntryType;
    artifact_id: string;
    revision_id?: string;
    details: Record<string, unknown>;
};
