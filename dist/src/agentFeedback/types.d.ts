/**
 * P22: Agent Feedback Protocol — Types
 *
 * Structured feedback protocol for AI agents.
 * Converts Pantheon verification/review results into
 * machine-consumable violation reports with repair guidance.
 *
 * Design invariants:
 *   - No feedback builder parses freeform reason strings.
 *   - repair_plan is advisory; allowed_agent_actions is authoritative.
 *   - requires_human = true means agent must not self-resolve without escalation.
 */
export type AgentFeedback = {
    readonly schema_version: "agent_feedback.v1";
    readonly feedback_id: string;
    readonly generated_at: string;
    readonly source: {
        readonly phase: AgentFeedbackSourcePhase;
        readonly source_id?: string;
    };
    readonly verdict: "pass" | "requires_review" | "requires_reverse_issue" | "fail";
    readonly summary: {
        readonly violation_count: number;
        readonly blocking_count: number;
        readonly review_required_count: number;
        readonly reverse_issue_required_count: number;
        readonly requires_human_count: number;
    };
    readonly violations: readonly AgentViolation[];
    readonly repair_plan: readonly AgentRepairAction[];
    readonly retry_guidance: AgentRetryGuidance;
    readonly human_review_required: boolean;
};
export type AgentViolationKind = "outside_scope_file" | "forbidden_file_modified" | "missing_test_mapping" | "undeclared_package" | "not_observed_file" | "excluded_file" | "invalid_path" | "sensitive_path" | "requires_human_review" | "reverse_issue_required";
export type AgentViolationSeverity = "info" | "warning" | "review_required" | "reverse_issue_required" | "blocking";
export type AgentViolation = {
    readonly violation_id: string;
    readonly kind: AgentViolationKind;
    readonly severity: AgentViolationSeverity;
    readonly location: {
        readonly file_path?: string;
        readonly old_file_path?: string;
    };
    readonly constraint: {
        readonly constraint_id: string;
        readonly constraint_kind: AgentConstraintKind;
        readonly description: string;
    };
    readonly expected?: string;
    readonly actual?: string;
    readonly message: string;
    readonly fix_hint: string;
    readonly allowed_agent_actions: readonly AgentAllowedAction[];
    readonly requires_human: boolean;
};
export type AgentConstraintKind = "scope" | "path" | "test" | "package" | "schema" | "human_review" | "reverse_issue" | "unknown";
export type AgentAllowedAction = "modify_allowed_file" | "add_required_test" | "revert_file" | "remove_change" | "request_reverse_issue" | "ask_human_review" | "update_package_manifest" | "rerun_plan" | "do_not_retry";
export type AgentRepairAction = {
    readonly action_id: string;
    readonly action: AgentRepairActionType;
    readonly target?: {
        readonly file_path?: string;
    };
    readonly reason: string;
    readonly priority: "high" | "medium" | "low";
    readonly requires_human: boolean;
};
export type AgentRepairActionType = "revert_file" | "add_test" | "remove_out_of_scope_change" | "request_reverse_issue" | "ask_human_review" | "update_manifest" | "rerun_plan";
export type AgentRetryMode = "safe_retry" | "requires_human" | "requires_reverse_issue" | "do_not_retry";
export type AgentRetryGuidance = {
    readonly retry_allowed: boolean;
    readonly retry_mode: AgentRetryMode;
    readonly max_recommended_retries: number;
    readonly instructions: readonly string[];
};
export type AgentFeedbackSourcePhase = "diff_verification" | "change_contract_lite" | "repo_observation";
