import { z } from "zod";
// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------
export const repairConfidenceValues = ["high", "medium", "low"];
export const repairAuditWeightValues = ["normal", "elevated", "critical"];
export const repairVerdictValues = ["pass", "requires_review", "requires_scope_expansion", "requires_replan", "fail"];
export const repairAuditGateValues = ["bug_intake", "repair_plan", "post_repair"];
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
];
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
export const suspectedFileSchema = z.object({
    path: z.string(),
    confidence: z.enum(repairConfidenceValues),
    reason: z.string(),
});
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
// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------
export const BUG_FINDING_V1_LIMITATION = "BugFinding v1 validates report structure and references; it does not prove the bug is real.";
export const REPAIR_RELATION_GRAPH_V1_LIMITATION = "Repair relation graph v1 is an evidence-based candidate graph, not a complete dependency graph or call graph.";
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
// ---------------------------------------------------------------------------
// Synthetic diff (P28.2 Dogfood)
// ---------------------------------------------------------------------------
export const syntheticRepairDiffSchema = z.object({
    schema_version: z.literal("synthetic_repair_diff@0.1.0"),
    changed_files: z.array(z.object({
        path: z.string()
            .min(1)
            .refine(p => !p.startsWith("/"), "Path must be repo-relative (no leading slash)")
            .refine(p => !/^[A-Za-z]:[\\/]/.test(p), "Path must not be a Windows drive path")
            .refine(p => !p.includes(".."), "Path must not contain '..'"),
        change_kind: z.enum(["added", "modified", "deleted", "renamed"]),
    })),
});
//# sourceMappingURL=types.js.map