/**
 * P19a: Change Contract Types
 *
 * Core domain types for the ChangeContract — the single governance object
 * that binds intent, scope, verification, and result for one AI-driven
 * software change.
 *
 * Design invariants:
 *   - Reference-heavy: hashes and IDs only, no full artifact copies.
 *   - Append-only: result_events must never be overwritten.
 *   - Transaction-centric: one contract per change, not per artifact.
 *   - Thin: validator rejects dump fields.
 *
 * ref: P19a
 */
/**
 * Supported agent adapters in P19.
 * Future phases may add "codex" | "claude" | "custom".
 */
export type AgentAdapter = "cursor" | "manual";
export type ChangeContractLifecycleStatus = "draft" | "scoped" | "exported" | "verified" | "escalated" | "closed" | "invalid";
export type ChangeIntent = {
    /** Human-readable description of what this change aims to accomplish. */
    intent: string;
    /** Source request or ticket that motivated this change. */
    source_request: string;
    /** Who requested the change. */
    requester?: string;
    /** How the intent was created. P19: only "human" | "system". */
    created_by?: "human" | "system";
};
export type ChangeContractRefs = {
    canonical_revisions: Array<{
        artifact_id: string;
        revision_id: string;
    }>;
    handoff_hash: string;
    boundary_graph_hash: string;
    blast_radius_hash: string;
    scoped_handoff_hash: string;
    /** Set after P18 verification. */
    scope_diff_report_hash?: string;
};
export type ChangeImpact = {
    changed_nodes: string[];
    risk_level: "low" | "medium" | "high";
    impacted_files: string[];
    impacted_symbols: string[];
    impacted_tests: string[];
    impact_summary: string;
};
export type ChangeScopeFile = {
    path: string;
    allowed_operations: string[];
};
export type ChangeScopeRequiredTest = {
    test_id: string;
    test_name: string;
    file_path?: string;
    requirement: "must_run" | "must_update_if_behavior_changes";
};
export type ChangeScope = {
    scope_hash: string;
    allowed_files: ChangeScopeFile[];
    forbidden_paths: string[];
    required_tests: ChangeScopeRequiredTest[];
    forbidden_assumptions: string[];
    escalation_rules: string[];
    must_require_human_review: boolean;
};
export type AgentHandoff = {
    adapter: AgentAdapter;
    exported: boolean;
    instructions_path?: string;
    constraints_summary: string[];
    handoff_hash?: string;
};
/**
 * P19 obligation statuses.
 * "waived" is reserved for future phases with operator override + audit.
 */
export type VerificationObligationStatus = "pending" | "passed" | "failed";
export type VerificationObligationType = "test" | "human_review" | "scope_diff";
export type VerificationObligation = {
    obligation_id: string;
    type: VerificationObligationType;
    required: boolean;
    status: VerificationObligationStatus;
    source_ref?: string;
    description: string;
};
export type VerificationPlan = {
    obligations: VerificationObligation[];
};
export type ChangeResultEventType = "contract_created" | "scope_built" | "agent_scope_exported" | "scope_diff_verified" | "human_review_recorded" | "reverse_issue_required" | "contract_closed" | "contract_invalidated";
export type ChangeResultEvent = {
    event_id: string;
    event_type: ChangeResultEventType;
    status: string;
    created_at: string;
    refs?: Record<string, string>;
    summary: string;
};
export type ChangeDecisionVerdict = "pending" | "pass" | "requires_human_review" | "requires_reverse_issue" | "fail" | "closed" | "invalid";
export type ChangeDecision = {
    decision: ChangeDecisionVerdict;
    required_actions: string[];
    latest_report_hash?: string;
};
export type ChangeContract = {
    contract_id: string;
    created_at: string;
    updated_at: string;
    lifecycle_status: ChangeContractLifecycleStatus;
    change: ChangeIntent;
    refs: ChangeContractRefs;
    impact: ChangeImpact;
    scope: ChangeScope;
    agent: AgentHandoff;
    verification: VerificationPlan;
    /** Append-only. Never overwrite or reorder. */
    result_events: ChangeResultEvent[];
    current_decision: ChangeDecision;
};
