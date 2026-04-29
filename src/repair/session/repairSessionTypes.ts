export type RepairSessionStatus =
  | "intake_created"
  | "intake_accepted"
  | "intake_rejected"
  | "plan_generated"
  | "plan_pending_audit"
  | "plan_approved"
  | "plan_restricted"
  | "manual_repair_required"
  | "repair_checked_pass"
  | "repair_checked_requires_review"
  | "repair_checked_requires_scope_expansion"
  | "repair_checked_requires_replan"
  | "repair_checked_fail"
  | "closed"
  | "abandoned";

export type RepairSessionScopeSummary = {
  readonly allowed: readonly string[];
  readonly review_required: readonly string[];
  readonly forbidden: readonly string[];
};

export type RepoStateSnapshot = {
  readonly base_sha: string | null;
  readonly head_sha: string | null;
  readonly checkout_sha?: string | null;
  readonly diff_base: string | null;
  readonly working_tree_status: "clean" | "dirty" | "unknown";
  readonly created_at: string;
  readonly source: "git" | "github" | "synthetic" | "unknown" | "github_pull_request";
};

export type RepairSession = {
  readonly schema_version: "repair_session@0.1.0";
  readonly repair_id: string;
  readonly agent_id?: string;
  readonly source: "agent_bug_report" | "user_report" | "manual";
  readonly status: RepairSessionStatus;
  readonly current_revision: number;
  readonly base_sha?: string | null;
  readonly risk_level: "low" | "medium" | "high" | "unknown";
  readonly scope_summary: RepairSessionScopeSummary;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at?: string;
  readonly close_reason?: string;
};

export type RepairSessionIndex = {
  readonly schema_version: "repair_session_index@0.1.0";
  readonly active_repairs: readonly RepairSession[];
  readonly closed_repairs: readonly RepairSession[];
};

export type ConcurrentRepairFinding = {
  readonly kind:
    | "active_scope_pattern_overlap"
    | "actual_changed_file_overlap"
    | "stale_repair_contract"
    | "stale_audit_decision"
    | "repair_id_mismatch"
    | "latest_used_for_correctness"
    | "working_tree_changed";
  readonly severity: "info" | "warning" | "requires_human_audit" | "blocking";
  readonly repair_id: string;
  readonly other_repair_id?: string;
  readonly overlap?: {
    readonly bucket: "allowed" | "review_required" | "forbidden" | "outside_scope";
    readonly patterns?: readonly string[];
    readonly files?: readonly string[];
  };
  readonly reason: string;
  readonly recommended_action:
    | "continue"
    | "human_review"
    | "request_replan"
    | "close_other_repair"
    | "rebase_or_replan"
    | "reject_stale_decision";
};
