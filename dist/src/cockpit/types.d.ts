/**
 * Release Decision Cockpit — Types
 *
 * ref: Phase 5 (Usability & Operator Workflow)
 *
 * These types define the data structures for the release decision workflow:
 *   - TrialReportData: structured report for operator review
 *   - ReleaseDecision: signed-off decision with rationale
 *   - BacklogItem: residual issue with full provenance
 *   - ResidualSnapshot: aggregated residual issue data
 */
export type ReleaseDecisionType = "accepted_clean" | "accepted_with_residual_issues" | "rejected_requires_cleanup";
export type ThreeLayerStatus = {
    integrity_clean: boolean;
    artifact_clean: boolean;
    document_coherent: boolean;
};
export type ReleaseDecision = {
    decision_id: string;
    decision: ReleaseDecisionType;
    canonical_revision_id: string;
    artifact_id: string;
    operator_id: string;
    timestamp: string;
    rationale: string;
    final_coherence_note: string;
    three_layer_status: ThreeLayerStatus;
    residual_snapshot: ResidualSnapshot;
    backlog_items: BacklogItem[];
};
export type ResidualIssue = {
    issue_id: string;
    block_id: string;
    section_id: string;
    section_title: string;
    issue_type: string;
    severity: string;
    message: string;
};
export type ResidualSnapshot = {
    total: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    by_section: Record<string, number>;
    issues: ResidualIssue[];
};
export type BacklogItem = {
    id: string;
    source_issue_id: string;
    block_id: string;
    section_id: string;
    issue_type: string;
    severity: string;
    canonical_revision_id: string;
    why_deferred: string;
    created_from_release_decision_id: string;
};
export type CycleDigest = {
    cycle: number;
    target_block_id: string | null;
    issue_type: string | null;
    committed: boolean;
    rejected: boolean;
    override: boolean;
};
export type TrialReportData = {
    artifact_id: string;
    artifact_type: string;
    canonical_revision_id: string;
    schema_version: string;
    timestamp: string;
    three_layer_status: ThreeLayerStatus;
    total_cycles: number;
    issues_found: number;
    issues_by_rule: Record<string, number>;
    proposals_generated: number;
    proposals_accepted: number;
    semantic_rejections: number;
    natural_rejections: number;
    forced_rejections: number;
    overrides: number;
    residual: ResidualSnapshot;
    cycles: CycleDigest[];
    canonical_markdown_preview: string;
    integrity_corruptions: number;
    integrity_warnings: number;
};
export type ArtifactReportSummary = {
    artifact_id: string;
    artifact_type: string;
    canonical_revision_id: string;
    residual: ResidualSnapshot;
    three_layer_status: ThreeLayerStatus;
    canonical_markdown_preview: string;
};
export type CrossResidualSnapshot = {
    total: number;
    by_type: Record<string, number>;
    issues: ResidualIssue[];
};
export type MultiArtifactReportData = {
    timestamp: string;
    artifact_count: number;
    block_count: number;
    artifacts: ArtifactReportSummary[];
    cross_residual: CrossResidualSnapshot;
    integrity_clean: boolean;
    integrity_corruptions: number;
    integrity_warnings: number;
};
export type MultiArtifactReleaseDecision = {
    decision_id: string;
    decision: ReleaseDecisionType;
    artifact_ids: string[];
    revision_ids: Record<string, string>;
    operator_id: string;
    timestamp: string;
    rationale: string;
    final_coherence_note: string;
    artifacts: ArtifactReportSummary[];
    cross_residual: CrossResidualSnapshot;
    integrity_clean: boolean;
    backlog_items: BacklogItem[];
};
