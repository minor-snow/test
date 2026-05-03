/**
 * P21: Diff-to-ChangeContract Workflow Types
 *
 * Lightweight types for the diff-driven change workflow pipeline.
 * These bridge P20a observations + ChangeContract Lite into
 * agent scope and diff verification.
 */
export type GitDiffFileStatus = "added" | "modified" | "deleted" | "renamed" | "untracked" | "unknown";
export type GitDiffFile = {
    readonly path: string;
    readonly status?: GitDiffFileStatus;
    readonly old_path?: string;
};
export type GitDiffSummary = {
    readonly base_ref: string;
    readonly changed_files: readonly GitDiffFile[];
    readonly warnings: readonly string[];
};
/**
 * Bootstrap-mode agent boundary derived from ChangeContractLite.
 *
 * For full governed scoping, see src/scopedHandoff/.
 *
 * Relationship:
 *   AgentScopeLite        :: ScopedImplementationBoundaryPackage
 *   ChangeContractLite    :: ChangeContract
 *
 * AgentScopeLite is intentionally smaller:
 * it is a repo-bootstrap projection, not a full governed handoff package.
 */
export type AgentScopeLite = {
    readonly schema_version: "agent_scope_lite.v1";
    readonly scope_id: string;
    readonly source_contract_id: string;
    readonly source_observations_hash: string;
    readonly intent?: string;
    readonly allowed_files: readonly string[];
    readonly review_required_files: readonly AgentScopeLiteReviewFile[];
    readonly forbidden_patterns: readonly AgentScopeLiteForbiddenPattern[];
    readonly required_tests: readonly string[];
    readonly instructions: readonly string[];
    /** P22: Structured violation hints for agent feedback builder. */
    readonly violation_hints?: readonly AgentScopeViolationHint[];
};
export type AgentScopeLiteReviewFile = {
    readonly path: string;
    readonly reasons: readonly string[];
};
export type AgentScopeLiteForbiddenPattern = {
    readonly pattern: string;
    readonly reason: string;
};
export type AgentScopeViolationHintKind = "missing_test_mapping" | "undeclared_package" | "not_observed_file" | "excluded_file" | "invalid_path" | "sensitive_path" | "requires_human_review";
export type AgentScopeViolationHint = {
    readonly path: string;
    readonly violation_kind: AgentScopeViolationHintKind;
    readonly context: Readonly<Record<string, string>>;
};
export type DiffVerificationFileStatus = {
    readonly path: string;
    readonly status: "allowed" | "review_required" | "outside_scope" | "forbidden" | "unknown";
    readonly reasons: readonly string[];
};
export type DiffVerificationResult = {
    readonly schema_version: "diff_verification_result.v1";
    readonly verified_at: string;
    readonly source_scope_id: string;
    readonly source_contract_id: string;
    readonly verdict: "pass" | "requires_review" | "requires_reverse_issue" | "fail";
    readonly reasons: readonly string[];
    readonly required_actions: readonly string[];
    readonly file_statuses: readonly DiffVerificationFileStatus[];
};
