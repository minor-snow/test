/**
 * P19c: Agent Scope Exporter Tests
 *
 * Tests exportAgentScope() — the bridge from a scoped ChangeContract
 * to agent-consumable instructions with lifecycle transition.
 *
 * ref: P19c
 */
import { describe, it, expect } from "vitest";
import { exportAgentScope } from "../../src/changeContract/agentScopeExporter.js";
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeScopedContract(overrides) {
    return {
        contract_id: "cc_aabbccddee00",
        created_at: "2026-04-27T00:00:00Z",
        updated_at: "2026-04-27T00:00:00Z",
        lifecycle_status: "scoped",
        change: {
            intent: "Update conflict policy for offline sync",
            source_request: "Change b_conflict_001",
            requester: "p10_operator",
            created_by: "human",
        },
        refs: {
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_001" }],
            handoff_hash: "sha256:handoff123",
            boundary_graph_hash: "sha256:graph123",
            blast_radius_hash: "sha256:blast123",
            scoped_handoff_hash: "sha256:scope123",
        },
        impact: {
            changed_nodes: ["blk:arch:b_conflict_001"],
            risk_level: "high",
            impacted_files: ["ConflictPolicy.kt", "ConflictPolicyRegistry.kt"],
            impacted_symbols: ["ConflictPolicyRegistry", "resolveConflict"],
            impacted_tests: ["ConflictPolicyTests.kt"],
            impact_summary: "1 node(s) changed, 12 downstream, 4 files, risk: high",
        },
        scope: {
            scope_hash: "scope_aabb112233445566",
            allowed_files: [
                { path: "billing/ConflictPolicy.kt", allowed_operations: ["modify", "read"] },
                { path: "billing/ConflictPolicyRegistry.kt", allowed_operations: ["modify", "regenerate"] },
            ],
            forbidden_paths: [".pantheon/**", ".cursor/**"],
            required_tests: [
                {
                    test_id: "test_conflict_001",
                    test_name: "ConflictPolicyTests",
                    file_path: "billing/ConflictPolicyTests.kt",
                    requirement: "must_run",
                },
            ],
            forbidden_assumptions: ["FA-001: No clinical LWW"],
            escalation_rules: ["Modifying shared interface"],
            must_require_human_review: true,
        },
        agent: {
            adapter: "cursor",
            exported: false,
            constraints_summary: [
                "Allowed: 2 path(s)",
                "Forbidden: 2 pattern(s)",
                "Requires human review",
            ],
        },
        verification: {
            obligations: [
                {
                    obligation_id: "obl_scope_diff_001",
                    type: "scope_diff",
                    required: true,
                    status: "pending",
                    description: "P18 scope diff verification must pass before close.",
                },
                {
                    obligation_id: "obl_human_review_001",
                    type: "human_review",
                    required: true,
                    status: "pending",
                    description: "High-risk scope requires human review before close.",
                },
            ],
        },
        result_events: [
            {
                event_id: "evt_created_001",
                event_type: "contract_created",
                status: "ok",
                created_at: "2026-04-27T00:00:00Z",
                summary: "Contract created",
            },
        ],
        current_decision: {
            decision: "pending",
            required_actions: ["human_review_required"],
        },
        ...overrides,
    };
}
function makeExportInput(overrides) {
    return {
        contract: makeScopedContract(),
        instructions_path: ".cursor/rules/pantheon-boundaries.md",
        timestamp: "2026-04-27T01:00:00Z",
        ...overrides,
    };
}
// ---------------------------------------------------------------------------
// Core Export Tests
// ---------------------------------------------------------------------------
describe("exportAgentScope", () => {
    it("transitions contract from scoped to exported", () => {
        const { contract } = exportAgentScope(makeExportInput());
        expect(contract.lifecycle_status).toBe("exported");
    });
    it("sets agent.exported to true", () => {
        const { contract } = exportAgentScope(makeExportInput());
        expect(contract.agent.exported).toBe(true);
    });
    it("records instructions_path on agent", () => {
        const { contract } = exportAgentScope(makeExportInput());
        expect(contract.agent.instructions_path).toBe(".cursor/rules/pantheon-boundaries.md");
    });
    it("sets agent.handoff_hash to hash of instructions", () => {
        const result = exportAgentScope(makeExportInput());
        expect(result.contract.agent.handoff_hash).toBe(result.instructions_hash);
        expect(result.contract.agent.handoff_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
    it("appends agent_scope_exported event", () => {
        const { contract } = exportAgentScope(makeExportInput());
        expect(contract.result_events).toHaveLength(2);
        expect(contract.result_events[1].event_type).toBe("agent_scope_exported");
        expect(contract.result_events[1].status).toBe("ok");
    });
    it("export event refs include instructions_hash and scope_hash", () => {
        const { contract } = exportAgentScope(makeExportInput());
        const event = contract.result_events[1];
        expect(event.refs).toBeDefined();
        expect(event.refs.instructions_hash).toMatch(/^sha256:/);
        expect(event.refs.scope_hash).toBe("scope_aabb112233445566");
        expect(event.refs.instructions_path).toBe(".cursor/rules/pantheon-boundaries.md");
    });
    it("returns deterministic instructions hash for same input", () => {
        const input = makeExportInput();
        const r1 = exportAgentScope(input);
        const r2 = exportAgentScope(input);
        expect(r1.instructions_hash).toBe(r2.instructions_hash);
    });
});
// ---------------------------------------------------------------------------
// Guard Tests
// ---------------------------------------------------------------------------
describe("export guards", () => {
    it("throws for draft contract", () => {
        const input = makeExportInput({
            contract: makeScopedContract({ lifecycle_status: "draft" }),
        });
        expect(() => exportAgentScope(input)).toThrow("Cannot export agent scope: contract is in 'draft' status");
    });
    it("throws for exported contract", () => {
        const input = makeExportInput({
            contract: makeScopedContract({ lifecycle_status: "exported" }),
        });
        expect(() => exportAgentScope(input)).toThrow("Cannot export agent scope: contract is in 'exported' status");
    });
    it("throws for verified contract", () => {
        const input = makeExportInput({
            contract: makeScopedContract({ lifecycle_status: "verified" }),
        });
        expect(() => exportAgentScope(input)).toThrow("Cannot export agent scope: contract is in 'verified' status");
    });
});
// ---------------------------------------------------------------------------
// Instructions Content
// ---------------------------------------------------------------------------
describe("rendered instructions", () => {
    it("includes contract_id and scope_hash", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("cc_aabbccddee00");
        expect(instructions).toContain("scope_aabb112233445566");
    });
    it("includes change intent", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("Update conflict policy for offline sync");
    });
    it("includes risk level", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("**HIGH**");
    });
    it("includes allowed files", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("billing/ConflictPolicy.kt");
        expect(instructions).toContain("billing/ConflictPolicyRegistry.kt");
    });
    it("includes forbidden files", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain(".pantheon/**");
        expect(instructions).toContain(".cursor/**");
    });
    it("includes forbidden assumptions", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("FA-001: No clinical LWW");
    });
    it("includes escalation rules", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("Modifying shared interface");
    });
    it("includes required tests with requirement semantics", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("test_conflict_001");
        expect(instructions).toContain("must run");
        expect(instructions).toContain("billing/ConflictPolicyTests.kt");
    });
    it("renders per-file operations", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("`billing/ConflictPolicy.kt` (modify, read)");
        expect(instructions).toContain("`billing/ConflictPolicyRegistry.kt` (modify, regenerate)");
    });
    it("includes human review required notice", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("Human review: REQUIRED");
    });
    it("includes verification obligations", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("scope_diff");
        expect(instructions).toContain("human_review");
    });
    it("includes adapter name", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("`cursor`");
    });
    it("includes do-not-edit footer", () => {
        const { instructions } = exportAgentScope(makeExportInput());
        expect(instructions).toContain("auto-generated by Pantheon");
        expect(instructions).toContain("Do not edit manually");
    });
    it("omits human review notice when not required", () => {
        const contract = makeScopedContract({
            scope: {
                scope_hash: "scope_0000000000000000",
                allowed_files: [{ path: "a.kt", allowed_operations: ["modify"] }],
                forbidden_paths: [".pantheon/**"],
                required_tests: [],
                forbidden_assumptions: [],
                escalation_rules: [],
                must_require_human_review: false,
            },
        });
        const { instructions } = exportAgentScope(makeExportInput({ contract }));
        expect(instructions).not.toContain("Human review: REQUIRED");
    });
});
//# sourceMappingURL=agentScopeExporter.test.js.map