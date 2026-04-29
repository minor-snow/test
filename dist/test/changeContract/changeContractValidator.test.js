/**
 * P19.1: Change Contract Validator Tests
 *
 * Tests validateChangeContract() — structural, lifecycle, obligation,
 * event, and authority checks.
 *
 * ref: P19.1
 */
import { describe, it, expect } from "vitest";
import { validateChangeContract } from "../../src/changeContract/changeContractValidator.js";
// ---------------------------------------------------------------------------
// Fixture: minimal valid contract
// ---------------------------------------------------------------------------
function makeValidContract(overrides) {
    return {
        contract_id: "cc_aabbccddee00",
        created_at: "2026-04-27T00:00:00Z",
        updated_at: "2026-04-27T01:00:00Z",
        lifecycle_status: "draft",
        change: {
            intent: "Update conflict policy",
            source_request: "ARCH-001",
        },
        refs: {
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_001" }],
            handoff_hash: "sha256:handoff123",
            boundary_graph_hash: "sha256:graph123",
            blast_radius_hash: "sha256:blast123",
            scoped_handoff_hash: "sha256:scope123",
        },
        impact: {
            changed_nodes: ["blk:arch:b_conflict"],
            risk_level: "high",
            impacted_files: ["ConflictPolicy.kt"],
            impacted_symbols: ["resolveConflict"],
            impacted_tests: ["ConflictPolicyTest.kt"],
            impact_summary: "1 node, risk: high",
        },
        scope: {
            scope_hash: "scope_aabb112233445566",
            allowed_files: [
                { path: "ConflictPolicy.kt", allowed_operations: ["modify", "read"] },
            ],
            forbidden_paths: [".pantheon/**"],
            required_tests: [
                {
                    test_id: "test_conflict",
                    test_name: "ConflictPolicyTest",
                    requirement: "must_run",
                },
            ],
            forbidden_assumptions: [],
            escalation_rules: [],
            must_require_human_review: true,
        },
        agent: {
            adapter: "cursor",
            exported: false,
            constraints_summary: ["Allowed: 1 file(s)"],
        },
        verification: {
            obligations: [
                {
                    obligation_id: "obl_scope_diff_001",
                    type: "scope_diff",
                    required: true,
                    status: "pending",
                    description: "Scope diff verification.",
                },
                {
                    obligation_id: "obl_human_review_001",
                    type: "human_review",
                    required: true,
                    status: "pending",
                    description: "Human review required.",
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
// ---------------------------------------------------------------------------
// Valid contract
// ---------------------------------------------------------------------------
describe("validateChangeContract — valid", () => {
    it("passes for a structurally valid contract", () => {
        const result = validateChangeContract(makeValidContract());
        expect(result.status).toBe("valid");
        expect(result.errors).toEqual([]);
    });
});
// ---------------------------------------------------------------------------
// Identity checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — identity", () => {
    it("fails when contract_id is missing", () => {
        const result = validateChangeContract(makeValidContract({ contract_id: "" }));
        expect(result.status).toBe("invalid");
        expect(result.errors).toContain("contract_id is missing or not a string.");
    });
    it("fails when created_at is missing", () => {
        const result = validateChangeContract(makeValidContract({ created_at: "" }));
        expect(result.status).toBe("invalid");
        expect(result.errors).toContain("created_at is missing.");
    });
    it("fails when lifecycle_status is invalid", () => {
        const result = validateChangeContract(makeValidContract({ lifecycle_status: "bogus" }));
        expect(result.status).toBe("invalid");
        expect(result.errors[0]).toContain("lifecycle_status");
    });
});
// ---------------------------------------------------------------------------
// Intent checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — intent", () => {
    it("fails when change.intent is missing", () => {
        const result = validateChangeContract(makeValidContract({ change: { intent: "", source_request: "ARCH-001" } }));
        expect(result.status).toBe("invalid");
        expect(result.errors).toContain("change.intent is missing.");
    });
    it("fails when change.source_request is missing", () => {
        const result = validateChangeContract(makeValidContract({ change: { intent: "Update", source_request: "" } }));
        expect(result.status).toBe("invalid");
        expect(result.errors).toContain("change.source_request is missing.");
    });
});
// ---------------------------------------------------------------------------
// Refs checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — refs", () => {
    it("fails when canonical_revisions is empty", () => {
        const contract = makeValidContract();
        contract.refs.canonical_revisions = [];
        const result = validateChangeContract(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors).toContain("refs.canonical_revisions is empty or missing.");
    });
    it("fails when handoff_hash is missing", () => {
        const contract = makeValidContract();
        contract.refs.handoff_hash = "";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("refs.handoff_hash is missing.");
    });
    it("fails when boundary_graph_hash is missing", () => {
        const contract = makeValidContract();
        contract.refs.boundary_graph_hash = "";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("refs.boundary_graph_hash is missing.");
    });
    it("fails when blast_radius_hash is missing", () => {
        const contract = makeValidContract();
        contract.refs.blast_radius_hash = "";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("refs.blast_radius_hash is missing.");
    });
    it("fails when scoped_handoff_hash is missing", () => {
        const contract = makeValidContract();
        contract.refs.scoped_handoff_hash = "";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("refs.scoped_handoff_hash is missing.");
    });
    it("fails when verified contract lacks scope_diff_report_hash", () => {
        const contract = makeValidContract({
            lifecycle_status: "verified",
            result_events: [
                {
                    event_id: "evt_created_001",
                    event_type: "contract_created",
                    status: "ok",
                    created_at: "2026-04-27T00:00:00Z",
                    summary: "Created",
                },
                {
                    event_id: "evt_verified_001",
                    event_type: "scope_diff_verified",
                    status: "pass",
                    created_at: "2026-04-27T01:00:00Z",
                    summary: "Verified",
                },
            ],
        });
        contract.refs.scope_diff_report_hash = undefined;
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("scope_diff_report_hash"))).toBe(true);
    });
    it("passes when verified contract has scope_diff_report_hash", () => {
        const contract = makeValidContract({
            lifecycle_status: "verified",
            current_decision: { decision: "pass", required_actions: [] },
            result_events: [
                {
                    event_id: "evt_created_001",
                    event_type: "contract_created",
                    status: "ok",
                    created_at: "2026-04-27T00:00:00Z",
                    summary: "Created",
                },
                {
                    event_id: "evt_verified_001",
                    event_type: "scope_diff_verified",
                    status: "pass",
                    created_at: "2026-04-27T01:00:00Z",
                    summary: "Verified",
                },
            ],
        });
        contract.refs.scope_diff_report_hash = "sha256:report123";
        const result = validateChangeContract(contract);
        expect(result.errors.filter(e => e.includes("scope_diff_report_hash"))).toEqual([]);
    });
});
// ---------------------------------------------------------------------------
// Scope checks (aligned to current schema)
// ---------------------------------------------------------------------------
describe("validateChangeContract — scope", () => {
    it("fails when scope_hash is missing", () => {
        const contract = makeValidContract();
        contract.scope.scope_hash = "";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.scope_hash is missing.");
    });
    it("fails when allowed_files is empty", () => {
        const contract = makeValidContract();
        contract.scope.allowed_files = [];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.allowed_files must be a non-empty array.");
    });
    it("fails when allowed_file has no path", () => {
        const contract = makeValidContract();
        contract.scope.allowed_files = [{ path: "", allowed_operations: ["modify"] }];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.allowed_files[0].path is missing.");
    });
    it("fails when allowed_file has empty operations", () => {
        const contract = makeValidContract();
        contract.scope.allowed_files = [{ path: "Foo.kt", allowed_operations: [] }];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.allowed_files[0].allowed_operations must be a non-empty array.");
    });
    it("fails when required_tests is not an array", () => {
        const contract = makeValidContract();
        contract.scope.required_tests = null;
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.required_tests must be an array.");
    });
    it("fails when must_require_human_review is not boolean", () => {
        const contract = makeValidContract();
        contract.scope.must_require_human_review = "yes";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("scope.must_require_human_review must be a boolean.");
    });
});
// ---------------------------------------------------------------------------
// Agent checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — agent", () => {
    it("fails for unsupported adapter", () => {
        const contract = makeValidContract();
        contract.agent.adapter = "codex";
        const result = validateChangeContract(contract);
        expect(result.errors[0]).toContain("unsupported");
    });
    it("passes for cursor adapter", () => {
        const contract = makeValidContract();
        contract.agent.adapter = "cursor";
        const result = validateChangeContract(contract);
        expect(result.errors.filter(e => e.includes("adapter"))).toEqual([]);
    });
    it("passes for manual adapter", () => {
        const contract = makeValidContract();
        contract.agent.adapter = "manual";
        const result = validateChangeContract(contract);
        expect(result.errors.filter(e => e.includes("adapter"))).toEqual([]);
    });
});
// ---------------------------------------------------------------------------
// Obligation checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — obligations", () => {
    it("fails when obligations are empty", () => {
        const contract = makeValidContract();
        contract.verification.obligations = [];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("verification.obligations must be non-empty.");
    });
    it("fails when scope_diff obligation is missing", () => {
        const contract = makeValidContract();
        contract.verification.obligations = [
            {
                obligation_id: "obl_human_review_001",
                type: "human_review",
                required: true,
                status: "pending",
                description: "Human review.",
            },
        ];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("A scope_diff obligation is required.");
    });
    it("fails when obligation has waived status", () => {
        const contract = makeValidContract();
        contract.verification.obligations[0].status = "waived";
        const result = validateChangeContract(contract);
        expect(result.errors[0]).toContain("waived");
    });
    it("fails when high-risk + must_require_human_review but no human_review obligation", () => {
        const contract = makeValidContract();
        contract.impact.risk_level = "high";
        contract.scope.must_require_human_review = true;
        contract.verification.obligations = [
            {
                obligation_id: "obl_scope_diff_001",
                type: "scope_diff",
                required: true,
                status: "pending",
                description: "Scope diff.",
            },
        ];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("High-risk scope with must_require_human_review=true requires a human_review obligation.");
    });
    it("passes when high-risk + must_require_human_review with human_review obligation", () => {
        const result = validateChangeContract(makeValidContract());
        expect(result.errors.filter(e => e.includes("human_review obligation"))).toEqual([]);
    });
    it("fails on duplicate obligation IDs", () => {
        const contract = makeValidContract();
        contract.verification.obligations = [
            {
                obligation_id: "obl_dup",
                type: "scope_diff",
                required: true,
                status: "pending",
                description: "A",
            },
            {
                obligation_id: "obl_dup",
                type: "human_review",
                required: true,
                status: "pending",
                description: "B",
            },
        ];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("Duplicate obligation_id: 'obl_dup'.");
    });
    it("fails when verified but scope_diff still pending", () => {
        const contract = makeValidContract({
            lifecycle_status: "verified",
            current_decision: { decision: "pass", required_actions: [] },
            result_events: [
                {
                    event_id: "evt_1",
                    event_type: "contract_created",
                    status: "ok",
                    created_at: "2026-04-27T00:00:00Z",
                    summary: "Created",
                },
                {
                    event_id: "evt_2",
                    event_type: "scope_diff_verified",
                    status: "pass",
                    created_at: "2026-04-27T01:00:00Z",
                    summary: "Verified",
                },
            ],
        });
        contract.refs.scope_diff_report_hash = "sha256:report";
        const result = validateChangeContract(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("scope_diff obligation is still 'pending'"))).toBe(true);
    });
    it("fails when closed but scope_diff still pending", () => {
        const contract = makeValidContract({
            lifecycle_status: "closed",
            current_decision: { decision: "closed", required_actions: [] },
            result_events: [
                {
                    event_id: "evt_1",
                    event_type: "contract_created",
                    status: "ok",
                    created_at: "2026-04-27T00:00:00Z",
                    summary: "Created",
                },
                {
                    event_id: "evt_2",
                    event_type: "scope_diff_verified",
                    status: "pass",
                    created_at: "2026-04-27T01:00:00Z",
                    summary: "Verified",
                },
                {
                    event_id: "evt_3",
                    event_type: "contract_closed",
                    status: "ok",
                    created_at: "2026-04-27T02:00:00Z",
                    summary: "Closed",
                },
            ],
        });
        contract.refs.scope_diff_report_hash = "sha256:report";
        const result = validateChangeContract(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("scope_diff obligation is still 'pending'"))).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Event checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — events", () => {
    it("fails when result_events is empty", () => {
        const contract = makeValidContract();
        contract.result_events = [];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("result_events must be non-empty.");
    });
    it("fails on duplicate event IDs", () => {
        const contract = makeValidContract();
        contract.result_events = [
            {
                event_id: "evt_dup",
                event_type: "contract_created",
                status: "ok",
                created_at: "2026-04-27T00:00:00Z",
                summary: "A",
            },
            {
                event_id: "evt_dup",
                event_type: "scope_built",
                status: "ok",
                created_at: "2026-04-27T01:00:00Z",
                summary: "B",
            },
        ];
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("Duplicate event_id: 'evt_dup'.");
    });
    it("fails on non-monotonic timestamps", () => {
        const contract = makeValidContract();
        contract.result_events = [
            {
                event_id: "evt_1",
                event_type: "contract_created",
                status: "ok",
                created_at: "2026-04-27T02:00:00Z",
                summary: "A",
            },
            {
                event_id: "evt_2",
                event_type: "scope_built",
                status: "ok",
                created_at: "2026-04-27T01:00:00Z",
                summary: "B",
            },
        ];
        const result = validateChangeContract(contract);
        expect(result.errors[0]).toContain("not monotonically non-decreasing");
    });
    it("fails when verified contract has no scope_diff_verified event", () => {
        const contract = makeValidContract({
            lifecycle_status: "verified",
            current_decision: { decision: "pass", required_actions: [] },
        });
        contract.refs.scope_diff_report_hash = "sha256:report";
        // result_events only has contract_created
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("scope_diff_verified event"))).toBe(true);
    });
    it("fails when closed contract has no contract_closed event", () => {
        const contract = makeValidContract({
            lifecycle_status: "closed",
            current_decision: { decision: "closed", required_actions: [] },
            result_events: [
                {
                    event_id: "evt_1",
                    event_type: "contract_created",
                    status: "ok",
                    created_at: "2026-04-27T00:00:00Z",
                    summary: "Created",
                },
                {
                    event_id: "evt_2",
                    event_type: "scope_diff_verified",
                    status: "pass",
                    created_at: "2026-04-27T01:00:00Z",
                    summary: "Verified",
                },
            ],
        });
        contract.refs.scope_diff_report_hash = "sha256:report";
        const result = validateChangeContract(contract);
        expect(result.errors).toContain("lifecycle_status 'closed' requires a contract_closed event in the ledger.");
    });
    it("fails when invalid contract has no contract_invalidated event", () => {
        const contract = makeValidContract({
            lifecycle_status: "invalid",
            current_decision: { decision: "invalid", required_actions: [] },
        });
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("contract_invalidated event"))).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Dump-field guard
// ---------------------------------------------------------------------------
describe("validateChangeContract — dump fields", () => {
    it("fails when top-level has boundary_graph", () => {
        const contract = makeValidContract();
        contract.boundary_graph = { nodes: [], edges: [] };
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("boundary_graph"))).toBe(true);
    });
    it("fails when top-level has diff_text", () => {
        const contract = makeValidContract();
        contract.diff_text = "--- a/foo\n+++ b/foo";
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("diff_text"))).toBe(true);
    });
    it("fails when top-level has generated_code", () => {
        const contract = makeValidContract();
        contract.generated_code = "class Foo {}";
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("generated_code"))).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Markdown authority guard
// ---------------------------------------------------------------------------
describe("validateChangeContract — markdown authority", () => {
    it("fails when ref points to .md file", () => {
        const contract = makeValidContract();
        contract.refs.contract_source = "change_contract.md";
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("Markdown files cannot be authority refs"))).toBe(true);
    });
    it("passes when refs use hash values", () => {
        const result = validateChangeContract(makeValidContract());
        expect(result.errors.filter(e => e.includes("Markdown"))).toEqual([]);
    });
    it("fails when obligation source_ref points to .md file", () => {
        const contract = makeValidContract();
        contract.verification.obligations[0].source_ref = "change_contract.md";
        const result = validateChangeContract(contract);
        expect(result.status).toBe("invalid");
        expect(result.errors.some(e => e.includes("source_ref") && e.includes(".md"))).toBe(true);
    });
    it("passes when obligation source_ref points to .json file", () => {
        const contract = makeValidContract();
        contract.verification.obligations[0].source_ref = "scope_diff_report.json";
        const result = validateChangeContract(contract);
        expect(result.errors.filter(e => e.includes("source_ref"))).toEqual([]);
    });
});
// ---------------------------------------------------------------------------
// Decision checks
// ---------------------------------------------------------------------------
describe("validateChangeContract — decision", () => {
    it("fails when decision verdict is invalid", () => {
        const contract = makeValidContract();
        contract.current_decision.decision = "unknown_verdict";
        const result = validateChangeContract(contract);
        expect(result.errors.some(e => e.includes("current_decision.decision"))).toBe(true);
    });
});
//# sourceMappingURL=changeContractValidator.test.js.map