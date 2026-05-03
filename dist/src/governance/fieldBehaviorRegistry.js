/**
 * P18.5-A: Field Behavior Registry
 *
 * Declares the expected and forbidden behaviors of critical schema fields
 * across Pantheon's governance and repair types. Each entry specifies:
 *
 *   - Which modules MUST use the field (and how)
 *   - Which modules MUST NOT use the field (and why)
 *   - Negative test references that prove the forbidden behavior is blocked
 *
 * This complements gateRegistry.ts (which declares gate-level invariants)
 * by covering field-level semantic invariants that gates alone do not capture.
 *
 * ref: P18.5-A
 */
// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const FIELD_BEHAVIOR_REGISTRY = [
    // =========================================================================
    // Repair Governance Fields
    // =========================================================================
    {
        id: "audit_weight_no_verdict",
        schema: "RepairScopeEntry",
        field: "audit_weight",
        severity: "critical",
        expected_behavior: "Affects ordering and report emphasis only. Used by renderers to highlight critical areas for human reviewers.",
        forbidden_behavior: "Must NOT affect repair verdict. The verdict is computed solely from bucket counts (forbidden / review_required / outside_scope).",
        modules_that_must_use: [
            "repairTaskRenderer.ts",
            "repairReportRenderer.ts",
        ],
        modules_that_must_not_use: [
            "repairVerifier.ts",
        ],
        positive_tests: [
            "test/repair/repairVerifier.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "agent_hypothesis_not_confirmed",
        schema: "AgentBugReport",
        field: "agent_hypothesis",
        severity: "critical",
        expected_behavior: "May appear in BugFinding.unverified_claims or rendered as a suspected cause. Never treated as established fact.",
        forbidden_behavior: "Must NOT appear in BugFinding.confirmed_facts. Confirmed facts come only from validated evidence, not agent speculation.",
        modules_that_must_use: [
            "agentBugReportValidator.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/agentBugReportValidator.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "bug_finding_limitation_required",
        schema: "BugFinding",
        field: "limitation",
        severity: "critical",
        expected_behavior: "Must always be set to BUG_FINDING_V1_LIMITATION. States that BugFinding validates report structure, not bug truth.",
        forbidden_behavior: "Must NOT be empty or omitted. A BugFinding without a limitation statement misrepresents its epistemic authority.",
        modules_that_must_use: [
            "bugFindingBuilder.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/consistencyChecklistBuilder.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "confirmed_facts_evidence_only",
        schema: "BugFinding",
        field: "confirmed_facts",
        severity: "critical",
        expected_behavior: "Contains only facts derived from validated evidence (failing tests, code observations with paths). Each fact must trace to a BugEvidence entry.",
        forbidden_behavior: "Must NOT contain agent hypotheses, user speculation, or claims without supporting evidence.",
        modules_that_must_use: [
            "bugFindingBuilder.ts",
            "consistencyChecklistBuilder.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/consistencyChecklistBuilder.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "unverified_claims_separation",
        schema: "BugFinding",
        field: "unverified_claims",
        severity: "high",
        expected_behavior: "Contains claims from the report that could not be verified against evidence. May include agent_hypothesis if present.",
        forbidden_behavior: "Must NOT be rendered as confirmed in any output. Renderers must clearly label these as unverified.",
        modules_that_must_use: [
            "bugFindingBuilder.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/agentBugReportValidator.test.ts",
        ],
        negative_tests: [],
    },
    {
        id: "repair_relation_graph_provenance",
        schema: "RepairContract",
        field: "repair_relation_graph",
        severity: "high",
        expected_behavior: "Each edge must have a relation type, confidence, reason, and evidence array. Used to connect suspect surface to impact surface.",
        forbidden_behavior: "Must NOT contain edges without evidence. An edge with empty evidence[] is structurally valid but semantically misleading.",
        modules_that_must_use: [
            "repairRelationGraphBuilder.ts",
            "repairReportRenderer.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/repairRelationGraphBuilder.test.ts",
        ],
        negative_tests: [],
    },
    {
        id: "graph_limitation_constantized",
        schema: "GraphBuildStats",
        field: "limitation",
        severity: "critical",
        expected_behavior: "Must always be set to REPAIR_RELATION_GRAPH_V1_LIMITATION. States that the graph is a candidate graph, not a complete dependency graph.",
        forbidden_behavior: "Must NOT be empty or ad-hoc. The limitation must come from the constant to prevent semantic drift.",
        modules_that_must_use: [
            "repairRelationGraphBuilder.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/graphTruncation.test.ts",
        ],
        negative_tests: [
            "test/repair/graphTruncation.test.ts",
        ],
    },
    {
        id: "repair_scope_allowed_non_empty",
        schema: "RepairScope",
        field: "allowed",
        severity: "critical",
        expected_behavior: "A repair contract must have at least one allowed entry. An empty allowed list means the agent has no valid repair surface.",
        forbidden_behavior: "Must NOT be empty when audit_status is 'approved_repair_plan'. A plan with nothing allowed is a contradiction.",
        modules_that_must_use: [
            "repairScopeBuilder.ts",
            "repairVerifier.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/repairScopeBuilder.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "repair_scope_forbidden_enforcement",
        schema: "RepairScope",
        field: "forbidden",
        severity: "critical",
        expected_behavior: "Forbidden entries block any diff touching those paths. Verdict is 'fail' if any forbidden file is modified.",
        forbidden_behavior: "Must NOT be advisory. If a file matches a forbidden pattern and is in the diff, the verdict MUST be 'fail'.",
        modules_that_must_use: [
            "repairVerifier.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/repairVerifier.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    {
        id: "human_audit_decision_append_only",
        schema: "HumanAuditDecision",
        field: "changes_to_scope",
        severity: "critical",
        expected_behavior: "Human audit decisions can only add review/forbid patterns and must_preserve entries. They cannot remove existing entries.",
        forbidden_behavior: "Must NOT allow deletion or modification of existing scope entries. Scope changes are append-only.",
        modules_that_must_use: [
            "humanAuditDecisionWriter.ts",
            "repairPlanRevisioner.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/repair/repairVerifier.test.ts",
        ],
        negative_tests: [
            "test/governance/fieldBehaviorCoverage.test.ts",
        ],
    },
    // =========================================================================
    // Core Governance Fields (P1–P17)
    // =========================================================================
    {
        id: "revision_immutability",
        schema: "Artifact",
        field: "revision_id",
        severity: "critical",
        expected_behavior: "revision_id is computed by the host from content hashes. Each mutation produces a new revision_id.",
        forbidden_behavior: "Must NOT be set or modified by LLM/agent output. The host always recomputes revision_id.",
        modules_that_must_use: [
            "applyPatch.ts",
            "integrityCheck.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/applyPatch.test.ts",
            "test/integrityCheck.test.ts",
        ],
        negative_tests: [
            "test/corruption.test.ts",
        ],
    },
    {
        id: "content_hash_host_computed",
        schema: "Artifact",
        field: "sections[].commitments[].content_hash",
        severity: "critical",
        expected_behavior: "content_hash is computed by the host after every mutation. LLM-provided hashes are discarded.",
        forbidden_behavior: "Must NOT trust LLM-provided content_hash values. Host always recomputes.",
        modules_that_must_use: [
            "applyPatch.ts",
            "integrityCheck.ts",
            "hash.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/applyPatch.test.ts",
            "test/hash.test.ts",
        ],
        negative_tests: [
            "test/corruption.test.ts",
        ],
    },
    {
        id: "canonical_pointer_gate_protected",
        schema: "CanonicalPointer",
        field: "revision_id",
        severity: "critical",
        expected_behavior: "Canonical pointer may only be updated through the promotion gate (deterministic or operator override).",
        forbidden_behavior: "Must NOT be directly written by agent output paths. Agent output goes to quarantine first.",
        modules_that_must_use: [
            "artifactStore.ts",
            "integrityCheck.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/integrityCheck.test.ts",
        ],
        negative_tests: [
            "test/corruption.test.ts",
        ],
    },
    {
        id: "blast_radius_impacted_files",
        schema: "BlastRadius",
        field: "impacted_files",
        severity: "high",
        expected_behavior: "Computed by traversing the boundary graph from changed nodes. Lists files that may be affected by a change.",
        forbidden_behavior: "Must NOT be manually overridden. The blast radius is a deterministic graph computation.",
        modules_that_must_use: [
            "blastRadius.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/boundary/blastRadius.test.ts",
        ],
        negative_tests: [],
    },
    {
        id: "blast_radius_impacted_tests",
        schema: "BlastRadius",
        field: "impacted_tests",
        severity: "high",
        expected_behavior: "Computed by traversing the boundary graph from changed nodes to test nodes. Lists tests that should be run.",
        forbidden_behavior: "Must NOT be manually overridden. Test selection is a graph computation, not a heuristic guess.",
        modules_that_must_use: [
            "blastRadius.ts",
        ],
        modules_that_must_not_use: [],
        positive_tests: [
            "test/boundary/blastRadius.test.ts",
        ],
        negative_tests: [],
    },
];
// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------
export function getFieldBehaviorById(id) {
    return FIELD_BEHAVIOR_REGISTRY.find(entry => entry.id === id);
}
export function getFieldBehaviorsBySchema(schema) {
    return FIELD_BEHAVIOR_REGISTRY.filter(entry => entry.schema === schema);
}
export function getCriticalFieldBehaviors() {
    return FIELD_BEHAVIOR_REGISTRY.filter(entry => entry.severity === "critical");
}
export function getFieldBehaviorsWithForbidden() {
    return FIELD_BEHAVIOR_REGISTRY.filter(entry => entry.forbidden_behavior !== undefined);
}
//# sourceMappingURL=fieldBehaviorRegistry.js.map