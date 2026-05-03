import { z } from "zod";
import type { ConcurrentRepairFinding, RepoStateSnapshot } from "./session/repairSessionTypes.js";
export declare const repairConfidenceValues: readonly ["high", "medium", "low"];
export type RepairConfidence = typeof repairConfidenceValues[number];
export declare const repairAuditWeightValues: readonly ["normal", "elevated", "critical"];
export type RepairAuditWeight = typeof repairAuditWeightValues[number];
export declare const repairVerdictValues: readonly ["pass", "requires_review", "requires_scope_expansion", "requires_replan", "fail"];
export type RepairVerdict = typeof repairVerdictValues[number];
export declare const repairAuditGateValues: readonly ["bug_intake", "repair_plan", "post_repair"];
export type RepairAuditGate = typeof repairAuditGateValues[number];
export declare const repairAuditDecisionValues: readonly ["accept_report", "reject_report", "needs_more_evidence", "mark_duplicate", "convert_to_backlog", "approve_repair_plan", "restrict_scope", "expand_review_scope", "add_must_preserve", "add_forbidden_area", "require_manual_repair", "approve_repair", "request_revert", "request_scope_expansion", "keep_for_human_review", "close_as_invalid"];
export type RepairAuditDecisionType = typeof repairAuditDecisionValues[number];
export declare const bugEvidenceSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        stack_trace: "stack_trace";
        failing_test: "failing_test";
        code_observation: "code_observation";
        user_reference: "user_reference";
    }>;
    path: z.ZodOptional<z.ZodString>;
    test_name: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BugEvidence = z.infer<typeof bugEvidenceSchema>;
export declare const suspectedFileSchema: z.ZodObject<{
    path: z.ZodString;
    confidence: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    reason: z.ZodString;
}, z.core.$strip>;
export type SuspectedFile = z.infer<typeof suspectedFileSchema>;
export declare const agentBugReportSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"agent_bug_report@0.1.0">;
    report_id: z.ZodString;
    reported_by: z.ZodObject<{
        agent: z.ZodString;
        session_id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    summary: z.ZodString;
    observed_behavior: z.ZodString;
    expected_behavior: z.ZodString;
    evidence: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            stack_trace: "stack_trace";
            failing_test: "failing_test";
            code_observation: "code_observation";
            user_reference: "user_reference";
        }>;
        path: z.ZodOptional<z.ZodString>;
        test_name: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
        excerpt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    suspected_files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        confidence: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        reason: z.ZodString;
    }, z.core.$strip>>;
    agent_hypothesis: z.ZodOptional<z.ZodString>;
    requested_action: z.ZodLiteral<"repair_analysis">;
}, z.core.$strip>;
export type AgentBugReport = z.infer<typeof agentBugReportSchema>;
export declare const userBugReportSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"user_bug_report@0.1.0">;
    report_id: z.ZodString;
    reported_by: z.ZodObject<{
        operator_id: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    summary: z.ZodString;
    observed_behavior: z.ZodOptional<z.ZodString>;
    expected_behavior: z.ZodOptional<z.ZodString>;
    evidence: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            stack_trace: "stack_trace";
            failing_test: "failing_test";
            code_observation: "code_observation";
            user_reference: "user_reference";
        }>;
        path: z.ZodOptional<z.ZodString>;
        test_name: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
        excerpt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    suspected_files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        confidence: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        reason: z.ZodString;
    }, z.core.$strip>>;
    must_preserve: z.ZodDefault<z.ZodArray<z.ZodString>>;
    requested_action: z.ZodLiteral<"repair_analysis">;
}, z.core.$strip>;
export type UserBugReport = z.infer<typeof userBugReportSchema>;
export type RepairSourceReport = AgentBugReport | UserBugReport;
export declare const BUG_FINDING_V1_LIMITATION = "BugFinding v1 validates report structure and references; it does not prove the bug is real.";
export declare const REPAIR_RELATION_GRAPH_V1_LIMITATION = "Repair relation graph v1 is an evidence-based candidate graph, not a complete dependency graph or call graph.";
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
export type RepairRelationType = "suspect" | "same_package" | "test_mapping" | "risk_preset" | "project_role" | "explicit_user_reference" | "full_governance_graph_edge";
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
    readonly kind: "missing_test_mapping" | "unknown_related_surface" | "invalid_reference" | "weak_evidence" | "unverified_bug_claim";
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
    readonly source: "explicit_user_scope" | "suspect_surface" | "impact_candidate" | "risk_preset" | "project_role" | "default_policy" | "human_audit_decision" | "architecture_contract";
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
    readonly source: "project_role" | "risk_preset" | "test_signal" | "user_must_preserve" | "unknown_surface" | "human_audit_decision";
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
    readonly audit_status: "pending_plan_audit" | "approved_repair_plan" | "approved_with_modifications" | "manual_repair_required" | "post_repair_reviewed";
    readonly source_refs: {
        readonly repo_observations_hash: string;
        readonly repo_label: string;
        readonly head_commit_hash: string | null;
    };
};
export declare const humanAuditDecisionSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"human_audit_decision@0.1.0">;
    decision_id: z.ZodString;
    repair_id: z.ZodString;
    target_revision: z.ZodNumber;
    gate: z.ZodEnum<{
        bug_intake: "bug_intake";
        repair_plan: "repair_plan";
        post_repair: "post_repair";
    }>;
    decision: z.ZodEnum<{
        needs_more_evidence: "needs_more_evidence";
        accept_report: "accept_report";
        reject_report: "reject_report";
        mark_duplicate: "mark_duplicate";
        convert_to_backlog: "convert_to_backlog";
        approve_repair_plan: "approve_repair_plan";
        restrict_scope: "restrict_scope";
        expand_review_scope: "expand_review_scope";
        add_must_preserve: "add_must_preserve";
        add_forbidden_area: "add_forbidden_area";
        require_manual_repair: "require_manual_repair";
        approve_repair: "approve_repair";
        request_revert: "request_revert";
        request_scope_expansion: "request_scope_expansion";
        keep_for_human_review: "keep_for_human_review";
        close_as_invalid: "close_as_invalid";
    }>;
    operator_id: z.ZodString;
    reason: z.ZodString;
    changes_to_scope: z.ZodDefault<z.ZodObject<{
        add_review: z.ZodDefault<z.ZodArray<z.ZodString>>;
        add_forbid: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    added_must_preserve: z.ZodDefault<z.ZodArray<z.ZodString>>;
    created_at: z.ZodString;
}, z.core.$strip>;
export type HumanAuditDecision = z.infer<typeof humanAuditDecisionSchema>;
export type RepairAuditLogEvent = {
    readonly timestamp: string;
    readonly event: "agent_report_submitted" | "user_report_submitted" | "bug_report_validated" | "human_intake_decision" | "repair_analysis_generated" | "human_plan_decision" | "repair_task_rendered" | "agent_repair_checked" | "human_post_repair_decision" | "repair_closed";
    readonly repair_id?: string;
    readonly report_id?: string;
    readonly finding_id?: string;
    readonly decision_id?: string;
    readonly detail?: string;
};
export type RepairCheckFinding = {
    readonly kind: "review_required_file" | "forbidden_file" | "outside_scope_file" | "architecture_forbidden" | "architecture_review_required" | "architecture_contract_modified" | "missing_related_test_signal" | "stale_repair_contract" | "active_scope_pattern_overlap" | "actual_changed_file_overlap" | "stale_audit_decision" | "repair_id_mismatch" | "latest_used_for_correctness" | "working_tree_changed" | "bootstrap_scope_mixed_with_repair";
    readonly severity: "warning" | "review_required" | "blocking" | "requires_human_audit" | "requires_replan";
    readonly file?: string;
    readonly message: string;
    readonly allowed_actions: readonly ("revert_file" | "request_scope_expansion" | "request_architecture_review" | "request_replan" | "keep_for_human_review" | "add_or_run_related_test" | "needs_more_evidence")[];
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
    readonly action: "revert_file" | "request_scope_expansion" | "request_architecture_review" | "request_replan" | "keep_for_human_review" | "add_or_run_related_test" | "needs_more_evidence";
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
export declare const syntheticRepairDiffSchema: z.ZodObject<{
    schema_version: z.ZodLiteral<"synthetic_repair_diff@0.1.0">;
    changed_files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        change_kind: z.ZodEnum<{
            added: "added";
            modified: "modified";
            deleted: "deleted";
            renamed: "renamed";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SyntheticRepairDiff = z.infer<typeof syntheticRepairDiffSchema>;
