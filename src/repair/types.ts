import { z } from "zod";
import type {
  ConcurrentRepairFinding,
  RepoStateSnapshot,
} from "./session/repairSessionTypes.js";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export const repairConfidenceValues = ["high", "medium", "low"] as const;
export type RepairConfidence = typeof repairConfidenceValues[number];

export const repairAuditWeightValues = ["normal", "elevated", "critical"] as const;
export type RepairAuditWeight = typeof repairAuditWeightValues[number];

export const repairVerdictValues = ["pass", "requires_review", "requires_scope_expansion", "requires_replan", "fail"] as const;
export type RepairVerdict = typeof repairVerdictValues[number];

export const repairAuditGateValues = ["bug_intake", "repair_plan", "post_repair"] as const;
export type RepairAuditGate = typeof repairAuditGateValues[number];

export const repairAuditDecisionValues = [
  "accept_report",
  "reject_report",
  "needs_more_evidence",
  "mark_duplicate",
  "convert_to_backlog",
  "approve_repair_plan",
  "restrict_scope",
  "expand_review_scope",
  "add_must_preserve",
  "add_forbidden_area",
  "require_manual_repair",
  "approve_repair",
  "request_revert",
  "request_scope_expansion",
  "keep_for_human_review",
  "close_as_invalid",
] as const;
export type RepairAuditDecisionType = typeof repairAuditDecisionValues[number];

// ---------------------------------------------------------------------------
// Bug reports
// ---------------------------------------------------------------------------

export const bugEvidenceSchema = z.object({
  kind: z.enum(["failing_test", "code_observation", "stack_trace", "user_reference"]),
  path: z.string().optional(),
  test_name: z.string().optional(),
  summary: z.string().optional(),
  excerpt: z.string().optional(),
});

export type BugEvidence = z.infer<typeof bugEvidenceSchema>;

export const suspectedFileSchema = z.object({
  path: z.string(),
  confidence: z.enum(repairConfidenceValues),
  reason: z.string(),
});

export type SuspectedFile = z.infer<typeof suspectedFileSchema>;

export const agentBugReportSchema = z.object({
  schema_version: z.literal("agent_bug_report@0.1.0"),
  report_id: z.string(),
  reported_by: z.object({
    agent: z.string(),
    session_id: z.string().optional(),
  }),
  summary: z.string().min(1),
  observed_behavior: z.string().min(1),
  expected_behavior: z.string().min(1),
  evidence: z.array(bugEvidenceSchema),
  suspected_files: z.array(suspectedFileSchema),
  agent_hypothesis: z.string().optional(),
  requested_action: z.literal("repair_analysis"),
});

export type AgentBugReport = z.infer<typeof agentBugReportSchema>;

export const userBugReportSchema = z.object({
  schema_version: z.literal("user_bug_report@0.1.0"),
  report_id: z.string(),
  reported_by: z.object({
    operator_id: z.string().default("user"),
  }),
  summary: z.string().min(1),
  observed_behavior: z.string().optional(),
  expected_behavior: z.string().optional(),
  evidence: z.array(bugEvidenceSchema),
  suspected_files: z.array(suspectedFileSchema),
  must_preserve: z.array(z.string()).default([]),
  requested_action: z.literal("repair_analysis"),
});

export type UserBugReport = z.infer<typeof userBugReportSchema>;

export type RepairSourceReport = AgentBugReport | UserBugReport;

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

export const BUG_FINDING_V1_LIMITATION =
  "BugFinding v1 validates report structure and references; it does not prove the bug is real.";

export const REPAIR_RELATION_GRAPH_V1_LIMITATION =
  "Repair relation graph v1 is an evidence-based candidate graph, not a complete dependency graph or call graph.";

export type BugFinding = {
  readonly schema_version: "bug_finding@0.1.0";
  readonly finding_id: string;
  readonly source_report_id: string;
  readonly status: "accepted" | "needs_more_evidence" | "rejected" | "duplicate" | "backlog_candidate";
  readonly limitation: string;
  readonly confirmed_facts: readonly string[];
  readonly unverified_claims: readonly string[];
  readonly invalid_references: readonly string[];
  readonly evidence_quality: "high" | "medium" | "low";
  readonly next_action: "repair_analysis" | "await_more_evidence" | "none";
};

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export type RepairSurfaceFile = {
  readonly path: string;
  readonly confidence: RepairConfidence;
  readonly reason: string;
  readonly evidence: readonly string[];
};

export type RepairSuspectSurface = {
  readonly files: readonly RepairSurfaceFile[];
  readonly reason: string;
};

export type RepairRelationType =
  | "suspect"
  | "same_package"
  | "test_mapping"
  | "risk_preset"
  | "project_role"
  | "explicit_user_reference"
  | "full_governance_graph_edge";

export type GraphTruncationEntry = {
  readonly relation: RepairRelationType;
  readonly pattern?: string;
  readonly total_matches: number;
  readonly displayed_edges: number;
  readonly truncated: boolean;
  readonly omitted_count: number;
};

export type GraphBuildStats = {
  readonly observed_files: number;
  readonly patterns_evaluated: number;
  readonly edges_generated: number;
  readonly edges_after_dedup: number;
  readonly truncation_entries: readonly GraphTruncationEntry[];
  readonly limitation: string;
  readonly duration_ms: number;
};

export type RepairRelationEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: RepairRelationType;
  readonly confidence: RepairConfidence;
  readonly reason: string;
  readonly evidence: readonly string[];
};

export type RepairRiskArea = {
  readonly label: string;
  readonly pattern: string;
  readonly bucket: "review_required" | "forbidden";
  readonly severity: "medium" | "high" | "critical";
  readonly source: "repo_sensitive_path" | "python_sensitive_zone" | "risk_preset";
  readonly reason: string;
  readonly evidence: readonly string[];
  readonly matched_paths: readonly string[];
};

export type RepairImpactUnknown = {
  readonly kind:
    | "missing_test_mapping"
    | "unknown_related_surface"
    | "invalid_reference"
    | "weak_evidence"
    | "unverified_bug_claim";
  readonly note: string;
  readonly evidence: readonly string[];
};

export type RepairImpactSurface = {
  readonly evidence_level: "bootstrap_conservative" | "full_governance_graph";
  readonly direct_files: readonly RepairSurfaceFile[];
  readonly related_files: readonly RepairSurfaceFile[];
  readonly related_tests: readonly RepairSurfaceFile[];
  readonly risk_areas: readonly RepairRiskArea[];
  readonly unknowns: readonly RepairImpactUnknown[];
};

export type RepairScopeEntry = {
  readonly pattern: string;
  readonly source:
    | "explicit_user_scope"
    | "suspect_surface"
    | "impact_candidate"
    | "risk_preset"
    | "project_role"
    | "default_policy"
    | "human_audit_decision";
  readonly confidence: RepairConfidence;
  readonly audit_weight: RepairAuditWeight;
  readonly reason: string;
  readonly evidence: readonly string[];
};

export type RepairScope = {
  readonly allowed: readonly RepairScopeEntry[];
  readonly review_required: readonly RepairScopeEntry[];
  readonly forbidden: readonly RepairScopeEntry[];
};

export type RepairConsistencyCheck = {
  readonly id: string;
  readonly statement: string;
  readonly source:
    | "project_role"
    | "risk_preset"
    | "test_signal"
    | "user_must_preserve"
    | "unknown_surface"
    | "human_audit_decision";
  readonly severity: "hard" | "review" | "advisory";
  readonly evidence: readonly string[];
  readonly reason: string;
};

export type RepairTestSignals = {
  readonly related: readonly string[];
  readonly recommended: readonly string[];
  readonly missing_mapping: readonly string[];
};

export type RepairContract = {
  readonly schema_version: "repair_contract@0.1.0";
  readonly repair_id: string;
  readonly revision: number;
  readonly source: {
    readonly kind: "agent_bug_report" | "user_bug_report";
    readonly id: string;
  };
  readonly intent: string;
  readonly bug_finding_id: string;
  readonly suspect_surface: RepairSuspectSurface;
  readonly repair_relation_graph: readonly RepairRelationEdge[];
  readonly graph_build_stats?: GraphBuildStats;
  readonly impact_surface: RepairImpactSurface;
  readonly repair_scope: RepairScope;
  readonly must_preserve: readonly string[];
  readonly consistency_checks: readonly RepairConsistencyCheck[];
  readonly test_signals: RepairTestSignals;
  readonly repo_state: RepoStateSnapshot;
  readonly audit_status:
    | "pending_plan_audit"
    | "approved_repair_plan"
    | "approved_with_modifications"
    | "manual_repair_required"
    | "post_repair_reviewed";
  readonly source_refs: {
    readonly repo_observations_hash: string;
    readonly repo_label: string;
    readonly head_commit_hash: string | null;
  };
};

// ---------------------------------------------------------------------------
// Human audit + log
// ---------------------------------------------------------------------------

export const humanAuditDecisionSchema = z.object({
  schema_version: z.literal("human_audit_decision@0.1.0"),
  decision_id: z.string(),
  repair_id: z.string(),
  target_revision: z.number().int().min(1),
  gate: z.enum(repairAuditGateValues),
  decision: z.enum(repairAuditDecisionValues),
  operator_id: z.string(),
  reason: z.string().min(1),
  changes_to_scope: z.object({
    add_review: z.array(z.string()).default([]),
    add_forbid: z.array(z.string()).default([]),
  }).default({ add_review: [], add_forbid: [] }),
  added_must_preserve: z.array(z.string()).default([]),
  created_at: z.string(),
});

export type HumanAuditDecision = z.infer<typeof humanAuditDecisionSchema>;

export type RepairAuditLogEvent = {
  readonly timestamp: string;
  readonly event:
    | "agent_report_submitted"
    | "user_report_submitted"
    | "bug_report_validated"
    | "human_intake_decision"
    | "repair_analysis_generated"
    | "human_plan_decision"
    | "repair_task_rendered"
    | "agent_repair_checked"
    | "human_post_repair_decision"
    | "repair_closed";
  readonly repair_id?: string;
  readonly report_id?: string;
  readonly finding_id?: string;
  readonly decision_id?: string;
  readonly detail?: string;
};

// ---------------------------------------------------------------------------
// Check + feedback
// ---------------------------------------------------------------------------

export type RepairCheckFinding = {
  readonly kind:
    | "review_required_file"
    | "forbidden_file"
    | "outside_scope_file"
    | "missing_related_test_signal"
    | "stale_repair_contract"
    | "active_scope_pattern_overlap"
    | "actual_changed_file_overlap"
    | "stale_audit_decision"
    | "repair_id_mismatch"
    | "latest_used_for_correctness"
    | "working_tree_changed"
    | "bootstrap_scope_mixed_with_repair";
  readonly severity: "warning" | "review_required" | "blocking" | "requires_human_audit" | "requires_replan";
  readonly file?: string;
  readonly message: string;
  readonly allowed_actions: readonly (
    | "revert_file"
    | "request_scope_expansion"
    | "request_replan"
    | "keep_for_human_review"
    | "add_or_run_related_test"
    | "needs_more_evidence"
  )[];
  readonly requires_human: boolean;
  readonly bucket?: "allowed" | "review_required" | "forbidden" | "outside_scope";
  readonly evidence: readonly string[];
  readonly other_repair_id?: string;
};

export type RepairCheck = {
  readonly schema_version: "repair_check.v1";
  readonly repair_id: string;
  readonly verdict: RepairVerdict;
  readonly generated_at: string;
  readonly summary: {
    readonly changed_files: number;
    readonly allowed: number;
    readonly review_required: number;
    readonly forbidden: number;
    readonly outside_scope: number;
    readonly warnings: number;
  };
  readonly findings: readonly RepairCheckFinding[];
  readonly concurrent_findings: readonly ConcurrentRepairFinding[];
  readonly changed_files: readonly string[];
  readonly audit_status: RepairContract["audit_status"];
};

export type RepairFeedbackAction = {
  readonly action:
    | "revert_file"
    | "request_scope_expansion"
    | "request_replan"
    | "keep_for_human_review"
    | "add_or_run_related_test"
    | "needs_more_evidence";
  readonly file?: string;
  readonly message: string;
};

export type RepairFeedback = {
  readonly schema_version: "repair_feedback.v1";
  readonly feedback_id: string;
  readonly repair_id: string;
  readonly verdict: RepairVerdict;
  readonly generated_at: string;
  readonly actions: readonly RepairFeedbackAction[];
  readonly requires_human: boolean;
  readonly notes: readonly string[];
};

export type RepairClosure = {
  readonly schema_version: "repair_closure@0.1.0";
  readonly repair_id: string;
  readonly decision: "closed" | "reverted" | "escalated" | "invalid";
  readonly reason: string;
  readonly created_at: string;
};

// ---------------------------------------------------------------------------
// Synthetic diff (P28.2 Dogfood)
// ---------------------------------------------------------------------------

export const syntheticRepairDiffSchema = z.object({
  schema_version: z.literal("synthetic_repair_diff@0.1.0"),
  changed_files: z.array(
    z.object({
      path: z.string()
        .min(1)
        .refine(p => !p.startsWith("/"), "Path must be repo-relative (no leading slash)")
        .refine(p => !/^[A-Za-z]:[\\/]/.test(p), "Path must not be a Windows drive path")
        .refine(p => !p.includes(".."), "Path must not contain '..'"),
      change_kind: z.enum(["added", "modified", "deleted", "renamed"]),
    })
  ),
});

export type SyntheticRepairDiff = z.infer<typeof syntheticRepairDiffSchema>;
