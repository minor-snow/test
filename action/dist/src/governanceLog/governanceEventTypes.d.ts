import type { RepairVerdict } from "../repair/types.js";
export type GovernanceEventSource = "local_cli" | "github_action" | "agent" | "human_audit" | "doctor";
export type GovernanceEventType = "repair_plan_generated" | "repair_check_completed" | "change_intake_created" | "change_contract_planned" | "change_check_completed" | "review_requested" | "review_resolved" | "repair_blocked" | "repair_replanned" | "change_blocked" | "change_replanned" | "artifact_sanitizer_violation" | "contract_gate_evaluated" | "uncontracted_change_detected" | "contract_required" | "policy_tamper_detected" | "fake_approval_ignored" | "trusted_approval_missing" | "base_policy_used" | "low_risk_bypass_applied" | "architecture_ingested" | "architecture_mapping_review_generated" | "architecture_override_added" | "architecture_contract_accepted" | "architecture_contract_superseded" | "architecture_constraint_triggered";
export type GovernanceAttentionLevel = "none" | "info" | "human_review" | "blocking" | "urgent";
export type GovernanceReasonKind = "review_required" | "outside_scope" | "forbidden_file_touched" | "stale_repair_contract" | "requires_scope_expansion" | "artifact_sanitizer_violation" | "concurrent_repair_overlap" | "missing_contract" | "policy_tamper" | "fake_approval" | "workflow_touched" | "uncontracted_source_change" | "architecture_forbidden" | "architecture_review_required" | "architecture_scope_crossed" | "architecture_dependency_boundary" | "architecture_external_boundary" | "architecture_contract_modified";
export type GovernanceReasonAction = "continue" | "human_review" | "request_scope_expansion" | "request_replan" | "revert_file" | "block_merge";
export type GovernanceEventReason = {
    readonly kind: GovernanceReasonKind;
    readonly file?: string;
    readonly pattern?: string;
    readonly action: GovernanceReasonAction;
};
export type GovernanceEvent = {
    readonly schema_version: "pantheon_governance_event@0.1.0";
    readonly event_id: string;
    readonly timestamp: string;
    readonly source: GovernanceEventSource;
    readonly event_type: GovernanceEventType;
    readonly target_type?: "repair" | "change" | "architecture";
    readonly target_id?: string;
    readonly repair_id?: string;
    readonly change_id?: string;
    readonly contract_revision?: number;
    readonly pr?: {
        readonly provider: "github";
        readonly number?: number;
        readonly base_sha?: string;
        readonly head_sha?: string;
    };
    readonly verdict?: RepairVerdict | "pass" | "requires_review" | "requires_scope_expansion" | "requires_replan" | "requires_contract" | "fail";
    readonly attention_level?: GovernanceAttentionLevel;
    readonly changed_files_count?: number;
    readonly bucket_counts?: {
        readonly allowed: number;
        readonly review_required: number;
        readonly forbidden: number;
        readonly outside_scope: number;
    };
    readonly reasons?: readonly GovernanceEventReason[];
    readonly sanitizer_violations?: number;
    readonly artifact_dir?: string;
};
export type GovernanceEventSanitizationViolation = {
    readonly kind: "absolute_path" | "diff_hunk" | "multiline_payload" | "stack_trace" | "secret_like_value";
    readonly message: string;
    readonly match: string;
};
