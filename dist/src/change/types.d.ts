import type { RepoStateSnapshot } from "../repair/session/repairSessionTypes.js";
export type ChangeType = "feature" | "refactor" | "config_change" | "dependency_update" | "test_change" | "architecture_change" | "bugfix";
export type ChangeIntake = {
    schema_version: "change_intake@0.1.0";
    change_id: string;
    change_type: ChangeType;
    title: string;
    reason: string;
    target_patterns: string[];
    declared_non_goals: string[];
    operator_notes?: string[];
    created_by: "user" | "agent" | "ci";
    repo_state: RepoStateSnapshot;
};
export type ChangeScopeReasonKind = "declared_target" | "test_mapping" | "config_surface" | "dependency_surface" | "generated_artifact" | "policy_sensitive" | "trust_sensitive" | "cross_module" | "unknown_risk" | "architecture_reserved" | "architecture_ownership" | "architecture_forbidden" | "architecture_review_required" | "architecture_boundary" | "architecture_advisory";
export type ChangeScopeEntry = {
    path_pattern: string;
    bucket: "allowed" | "review_required" | "forbidden";
    reason_kind: ChangeScopeReasonKind;
    rationale: string;
    source: "user_intent" | "policy" | "repo_observation" | "default_rule" | "architecture_contract";
};
export type ChangeRequiredCheck = {
    check_id: string;
    description: string;
};
export type ChangeChecklistItem = {
    id: string;
    description: string;
    status: "pending" | "pass" | "fail";
};
export type ChangeContract = {
    schema_version: "change_contract@0.1.0";
    change_id: string;
    revision: number;
    status: "planned" | "approved" | "checked" | "closed";
    change_type: ChangeType;
    title: string;
    reason: string;
    repo_state: RepoStateSnapshot;
    policy_hash: string;
    scope: {
        allowed: ChangeScopeEntry[];
        review_required: ChangeScopeEntry[];
        forbidden: ChangeScopeEntry[];
    };
    required_checks: ChangeRequiredCheck[];
    consistency_checklist: ChangeChecklistItem[];
    limitations: string[];
};
export type ChangeFinding = {
    kind: string;
    message: string;
    files?: string[];
    severity: "info" | "warning" | "error" | "fatal";
};
export type ChangeCheckVerdict = "pass" | "requires_review" | "requires_scope_expansion" | "requires_replan" | "requires_contract" | "fail";
export type ChangeCheckResult = {
    schema_version: "change_check@0.1.0";
    change_id: string;
    verdict: ChangeCheckVerdict;
    changed_files: string[];
    findings: ChangeFinding[];
    bucket_counts: {
        allowed: number;
        review_required: number;
        forbidden: number;
        outside_scope: number;
    };
    next_actions: string[];
};
