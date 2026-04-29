import { describe, it, expect } from "vitest";
import { resolveStructuralTerms } from "../../src/handoff/structuralTermResolver.js";
// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------
function makePkg(overrides = {}) {
    return {
        package_id: "test",
        project_id: "test",
        created_at: new Date().toISOString(),
        source_artifacts: [],
        implementation_scope: {
            target_platform: "android",
            stack: [],
            included_components: [],
            excluded_components: [],
            non_goals: [],
        },
        contract_definitions: overrides.contract_definitions ?? [],
        conflict_policy_matrix: overrides.conflict_policy_matrix ?? [],
        data_models: overrides.data_models ?? [],
        state_machines: overrides.state_machines ?? [],
        implementation_tasks: overrides.implementation_tasks ?? [],
        risk_notes: overrides.risk_notes ?? [],
        forbidden_assumptions: overrides.forbidden_assumptions ?? [],
    };
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("P11.1: structuralTermResolver", () => {
    it("resolves term by contract_definitions", () => {
        const pkg = makePkg({
            contract_definitions: [{
                    term: "report_id",
                    kind: "identifier",
                    definition: "UUID for a report",
                    source_architecture_blocks: ["b1"],
                    source_interface_blocks: [],
                    source_module_blocks: [],
                }],
        });
        const result = resolveStructuralTerms(["report_id"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.unresolved_count).toBe(0);
        expect(result.resolved_terms[0].resolved_by).toBe("contract_definition");
    });
    it("resolves term by data model field", () => {
        const pkg = makePkg({
            data_models: [{
                    name: "PendingReportEntity",
                    kind: "room_entity",
                    fields: [
                        { name: "clinic_id", type: "String", nullable: false, description: "Target clinic" },
                    ],
                    invariants: [],
                    source_architecture_blocks: ["b1"],
                    source_interface_blocks: [],
                    source_module_blocks: [],
                }],
        });
        const result = resolveStructuralTerms(["clinic_id"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.resolved_terms[0].resolved_by).toBe("data_model_field");
    });
    it("resolves term by state machine", () => {
        const pkg = makePkg({
            state_machines: [{
                    name: "SyncStatus",
                    states: ["sync_status"],
                    allowed_transitions: [],
                    forbidden_transitions: [],
                    source_architecture_blocks: ["b1"],
                    source_interface_blocks: [],
                    source_module_blocks: [],
                }],
        });
        const result = resolveStructuralTerms(["sync_status"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.resolved_terms[0].resolved_by).toBe("state_machine");
    });
    it("resolves term by conflict_policy_matrix", () => {
        const pkg = makePkg({
            conflict_policy_matrix: [{
                    field_group: "next_token",
                    fields: ["next_token"],
                    policy: "server_token",
                    rationale: "Server-authoritative token",
                    risk_level: "low",
                    user_visible_on_conflict: false,
                    audit_required: false,
                    source_architecture_blocks: ["b1"],
                    source_interface_blocks: [],
                    source_module_blocks: [],
                }],
        });
        const result = resolveStructuralTerms(["next_token"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.resolved_terms[0].resolved_by).toBe("conflict_policy_matrix");
    });
    it("accepts implementation_task weak resolution for module terms", () => {
        const pkg = makePkg({
            implementation_tasks: [{
                    task_id: "T-1",
                    title: "Implement ConflictResolver",
                    target_module: "conflict",
                    description: "Build the conflict resolver module",
                    source_blocks: ["b1"],
                    acceptance_criteria: [],
                    required_tests: [],
                }],
        });
        // "conflict_resolver" ends with _resolver, not in STRONG list
        const result = resolveStructuralTerms(["conflict_resolver"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.resolved_terms[0].resolved_by).toBe("implementation_task");
    });
    it("rejects implementation_task resolution for _id suffix terms", () => {
        const pkg = makePkg({
            implementation_tasks: [{
                    task_id: "T-1",
                    title: "Handle clinic_id routing",
                    target_module: "network",
                    description: "Route by clinic_id",
                    source_blocks: ["b1"],
                    acceptance_criteria: [],
                    required_tests: [],
                }],
        });
        // "clinic_id" ends with _id, needs strong resolution
        const result = resolveStructuralTerms(["clinic_id"], pkg);
        expect(result.unresolved_count).toBe(1);
        expect(result.unresolved_terms[0].term).toBe("clinic_id");
    });
    it("reports unresolved term", () => {
        const pkg = makePkg();
        const result = resolveStructuralTerms(["totally_unknown_entity"], pkg);
        expect(result.unresolved_count).toBe(1);
        expect(result.unresolved_terms[0].status).toBe("unresolved");
        expect(result.unresolved_terms[0].resolved_by).toBeNull();
    });
    it("handles empty unknown terms", () => {
        const pkg = makePkg();
        const result = resolveStructuralTerms([], pkg);
        expect(result.total_unknown_structural_terms).toBe(0);
        expect(result.resolved_count).toBe(0);
        expect(result.unresolved_count).toBe(0);
    });
    it("resolves by forbidden_assumption", () => {
        const pkg = makePkg({
            forbidden_assumptions: [{
                    assumption_id: "FA-1",
                    statement: "Do not bypass the conflict resolver for clinical fields",
                    reason: "The conflict resolver must always be consulted",
                    source_blocks: ["b1"],
                }],
        });
        const result = resolveStructuralTerms(["conflict_resolver"], pkg);
        expect(result.resolved_count).toBe(1);
        expect(result.resolved_terms[0].resolved_by).toBe("forbidden_assumption");
    });
});
describe("P11.1: readiness evaluator with unresolved terms", () => {
    it("fails when unresolved_terms > 0", async () => {
        const { evaluateHandoffReadiness } = await import("../../src/handoff/handoffReadinessEvaluator.js");
        const pkg = makePkg({
            contract_definitions: [],
            conflict_policy_matrix: [],
            data_models: [],
            state_machines: [],
            implementation_tasks: [],
            forbidden_assumptions: Array.from({ length: 6 }, (_, i) => ({
                assumption_id: `FA-${i}`,
                statement: "test",
                reason: "test",
                source_blocks: ["b1"],
            })),
            risk_notes: [{ risk_id: "R-1", severity: "high", description: "test", mitigation: "test", source_blocks: ["b1"] }],
        });
        const result = evaluateHandoffReadiness(pkg, [], 0, [], ["some_unresolved_id"]);
        const termCheck = result.checks.find(c => c.check_id === "unresolved_structural_terms");
        expect(termCheck).toBeDefined();
        expect(termCheck.status).toBe("fail");
        expect(result.status).toBe("not_ready");
    });
    it("passes when unresolved_terms = 0", async () => {
        const { evaluateHandoffReadiness } = await import("../../src/handoff/handoffReadinessEvaluator.js");
        const pkg = makePkg({
            forbidden_assumptions: Array.from({ length: 6 }, (_, i) => ({
                assumption_id: `FA-${i}`,
                statement: "test",
                reason: "test",
                source_blocks: ["b1"],
            })),
            risk_notes: [{ risk_id: "R-1", severity: "high", description: "test", mitigation: "test", source_blocks: ["b1"] }],
        });
        const result = evaluateHandoffReadiness(pkg, [], 0, [], []);
        const termCheck = result.checks.find(c => c.check_id === "unresolved_structural_terms");
        expect(termCheck).toBeDefined();
        expect(termCheck.status).toBe("pass");
    });
});
//# sourceMappingURL=structuralTermResolver.test.js.map