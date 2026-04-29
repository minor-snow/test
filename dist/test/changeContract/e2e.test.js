/**
 * P19e: Change Contract E2E Integration Test
 *
 * Walks the complete ChangeContract lifecycle through all P19 modules:
 *   P19b (build) → P19c (export) → P19d (verify) → close
 *
 * This test proves the full pipeline composes correctly as a single
 * transaction — from intent to closed governance record.
 *
 * Scenarios:
 *   1. Happy path: build → export → verify(pass) → close
 *   2. Escalation path: build → export → verify(fail) → re-verify(pass) → close
 *   3. Human review path: build → export → verify(requires_human_review) → review → re-verify(pass) → close
 *   4. Invalidation path: build → invalidate
 *
 * ref: P19e
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
// P19b
import { buildChangeContract } from "../../src/changeContract/changeContractBuilder.js";
// P19c
import { exportAgentScope } from "../../src/changeContract/agentScopeExporter.js";
// P19d
import { verifyChangeContract } from "../../src/changeContract/changeContractVerifier.js";
// Lifecycle
import { transitionChangeContract, createResultEvent, recordContractEvent, } from "../../src/changeContract/lifecycle.js";
// P19.1
import { validateChangeContract } from "../../src/changeContract/changeContractValidator.js";
import { renderChangeContractMarkdown } from "../../src/changeContract/changeContractRenderer.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashStr(s) {
    return "sha256:" + createHash("sha256").update(s).digest("hex");
}
// ---------------------------------------------------------------------------
// Fixtures — P15 blast radius report
// ---------------------------------------------------------------------------
function makeBlastReport() {
    return {
        request: {
            changed_nodes: ["blk:arch:b_sync_001"],
            change_description: "Refactor sync engine",
            graph: { nodes: [], edges: [] },
        },
        generated_at: "2026-04-27T00:00:00Z",
        graph_hash: "sha256:e2e_graph_001",
        warnings: [],
        invalid_nodes: [],
        summary: {
            changed_nodes: 1,
            valid_changed_nodes: 1,
            direct_impact: 3,
            total_downstream: 8,
            affected_files: 3,
            affected_symbols: 5,
            affected_tests: 2,
            highest_risk_level: "high",
            risk_amplification_count: 0,
        },
        by_layer: {
            architecture: ["blk:arch:b_sync_001"],
            interface: [],
            module: [],
            handoff: [],
            generated_files: [
                "sync/SyncEngine.kt",
                "sync/SyncPolicy.kt",
                "sync/SyncConflictResolver.kt",
            ],
            generated_symbols: ["SyncEngine", "SyncPolicy", "resolveConflict"],
            tests: ["SyncEngineTest.kt", "SyncPolicyTest.kt"],
        },
        risk_amplification: [],
        critical_paths: [],
        paths_truncated: false,
        total_critical_paths_found: 0,
        markdown: "# Blast Radius Report",
    };
}
// ---------------------------------------------------------------------------
// Fixtures — P17 scoped package (linked to P15)
// ---------------------------------------------------------------------------
function makeScopedPackage(report) {
    return {
        scope_id: "scope_e2e_001",
        created_at: "2026-04-27T00:00:00Z",
        request: {
            changed_nodes: ["blk:arch:b_sync_001"],
        },
        source: {
            handoff_package_hash: "sha256:handoff_e2e",
            boundary_graph_hash: report.graph_hash,
            blast_radius_report_hash: hashStr(JSON.stringify(report)),
            locale: "en",
            generator_version: "p17.0",
        },
        summary: {
            risk_level: "high",
            must_require_human_review: true,
            downstream_nodes: 8,
            affected_files: 3,
            affected_symbols: 5,
            affected_tests: 2,
        },
        allowed_files: [
            { path: "sync/SyncEngine.kt", allowed_operations: ["modify", "read"], origin: "blast_radius_generated", reason: "Changed node", source_nodes: ["blk:arch:b_sync_001"] },
            { path: "sync/SyncPolicy.kt", allowed_operations: ["modify"], origin: "blast_radius_generated", reason: "Downstream", source_nodes: ["blk:arch:b_sync_policy"] },
            { path: "sync/SyncConflictResolver.kt", allowed_operations: ["read"], origin: "blast_radius_generated", reason: "Read dependency", source_nodes: ["blk:arch:b_sync_001"] },
        ],
        forbidden_files: [
            { pattern: ".pantheon/**", reason: "Protocol files" },
            { pattern: ".cursor/**", reason: "Generated boundary files" },
            { pattern: "ARCHITECTURE.md", reason: "Root doc" },
        ],
        required_tests: [
            {
                test_id: "test_sync_engine",
                test_name: "SyncEngineTest",
                file_path: "sync/SyncEngineTest.kt",
                requirement: "must_run",
                reason: "Directly exercises changed sync logic",
                source_nodes: ["blk:arch:b_sync_001"],
            },
            {
                test_id: "test_sync_policy",
                test_name: "SyncPolicyTest",
                file_path: "sync/SyncPolicyTest.kt",
                requirement: "must_update_if_behavior_changes",
                reason: "Policy behavior may shift",
                source_nodes: ["blk:arch:b_sync_policy"],
            },
        ],
        affected_symbols: [],
        must_preserve: [
            {
                constraint_id: "cst_no_direct_db",
                statement: "SyncEngine must not access database directly",
                severity: "high",
                source_nodes: ["blk:arch:b_sync_001"],
                enforced_by: [],
            },
        ],
        forbidden_assumptions: [
            {
                assumption_id: "FA-E2E-001",
                statement: "Network is always available",
                reason: "Offline-first architecture",
                source_nodes: ["blk:arch:b_sync_001"],
                enforced_by: [],
            },
        ],
        risk_amplification: [],
        reverse_issue_required_if: [
            {
                trigger_id: "ri_e2e_001",
                condition: "Adding new sync conflict strategy",
                required_action: "Create reverse issue for architecture review",
                example_command: "pantheon issue create --type=scope_breach",
            },
        ],
        implementation_context: "Sync engine refactor for offline-first",
        human_readable_summary: "Scoped boundary for sync subsystem change",
    };
}
// ---------------------------------------------------------------------------
// Fixtures — P18 scope diff reports
// ---------------------------------------------------------------------------
function makePassScopeDiff(scopeHash) {
    return {
        generated_at: "2026-04-27T03:00:00Z",
        scope_id: "scope_e2e_001",
        status: "pass",
        source: {
            scope_path: ".pantheon/scope.json",
            required_tests_path: ".pantheon/required-tests.json",
            scope_hash: scopeHash,
            required_tests_hash: "sha256:tests_e2e",
        },
        summary: {
            changed_files: 2,
            allowed_files_modified: 2,
            outside_scope_files: 0,
            forbidden_files_modified: 0,
            protocol_files_modified: 0,
            generated_boundary_files_modified: 0,
            required_tests: 2,
            required_tests_passed: 2,
            required_tests_failed: 0,
            required_tests_missing: 0,
            reverse_issue_triggers: 0,
        },
        blocking_reasons: [],
        violations: [],
        warnings: [],
        required_actions: [],
    };
}
function makeFailScopeDiff(scopeHash) {
    return {
        generated_at: "2026-04-27T03:00:00Z",
        scope_id: "scope_e2e_001",
        status: "fail",
        source: {
            scope_path: ".pantheon/scope.json",
            required_tests_path: ".pantheon/required-tests.json",
            scope_hash: scopeHash,
            required_tests_hash: "sha256:tests_e2e",
        },
        summary: {
            changed_files: 4,
            allowed_files_modified: 2,
            outside_scope_files: 2,
            forbidden_files_modified: 0,
            protocol_files_modified: 0,
            generated_boundary_files_modified: 0,
            required_tests: 2,
            required_tests_passed: 1,
            required_tests_failed: 1,
            required_tests_missing: 0,
            reverse_issue_triggers: 0,
        },
        blocking_reasons: [
            "2 files modified outside allowed scope",
            "1 required test failed",
        ],
        violations: [
            {
                violation_id: "v_e2e_001",
                violation_type: "outside_allowed_files",
                severity: "high",
                file_path: "auth/LoginManager.kt",
                message: "File outside allowed scope",
                required_action: "Remove changes or request scope expansion",
            },
            {
                violation_id: "v_e2e_002",
                violation_type: "required_test_failed",
                severity: "high",
                test_id: "test_sync_engine",
                message: "SyncEngineTest failed",
                required_action: "Fix test",
            },
        ],
        warnings: [],
        required_actions: ["Remove out-of-scope changes", "Fix SyncEngineTest"],
    };
}
function makeHumanReviewScopeDiff(scopeHash) {
    return {
        generated_at: "2026-04-27T03:00:00Z",
        scope_id: "scope_e2e_001",
        status: "requires_human_review",
        source: {
            scope_path: ".pantheon/scope.json",
            required_tests_path: ".pantheon/required-tests.json",
            scope_hash: scopeHash,
            required_tests_hash: "sha256:tests_e2e",
        },
        summary: {
            changed_files: 2,
            allowed_files_modified: 2,
            outside_scope_files: 0,
            forbidden_files_modified: 0,
            protocol_files_modified: 0,
            generated_boundary_files_modified: 0,
            required_tests: 2,
            required_tests_passed: 2,
            required_tests_failed: 0,
            required_tests_missing: 0,
            reverse_issue_triggers: 0,
        },
        blocking_reasons: ["Human review required but not provided"],
        violations: [
            {
                violation_id: "v_e2e_hr_001",
                violation_type: "human_review_missing",
                severity: "high",
                message: "Human review required for high-risk scope",
                required_action: "Provide human review",
            },
        ],
        warnings: [],
        required_actions: ["Provide human review"],
    };
}
// ---------------------------------------------------------------------------
// E2E: Happy Path
// ---------------------------------------------------------------------------
describe("P19 E2E: happy path", () => {
    it("build → export → verify(pass) → close", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        // --- P19b: Build ---
        const { contract: draft, diagnostics } = buildChangeContract({
            intent: {
                intent: "Refactor sync engine for offline-first",
                source_request: "ARCH-1234",
                requester: "p10_operator",
                created_by: "human",
            },
            canonical_revisions: [
                { artifact_id: "art_arch", revision_id: "rev_100" },
            ],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        });
        expect(draft.lifecycle_status).toBe("draft");
        expect(draft.contract_id).toMatch(/^cc_/);
        expect(draft.scope.allowed_files).toHaveLength(3);
        expect(draft.scope.required_tests).toHaveLength(2);
        expect(draft.impact.risk_level).toBe("high");
        expect(draft.scope.must_require_human_review).toBe(true);
        // --- Transition to scoped ---
        const scopeEvent = createResultEvent("scope_built", "ok", "Scope built from P17 package", {}, "2026-04-27T00:30:00Z");
        const scoped = transitionChangeContract(draft, "scoped", scopeEvent);
        expect(scoped.lifecycle_status).toBe("scoped");
        // --- P19c: Export ---
        const { contract: exported, instructions, instructions_hash } = exportAgentScope({
            contract: scoped,
            instructions_path: ".cursor/rules/pantheon-boundaries.md",
            timestamp: "2026-04-27T01:00:00Z",
        });
        expect(exported.lifecycle_status).toBe("exported");
        expect(exported.agent.exported).toBe(true);
        expect(exported.agent.handoff_hash).toBe(instructions_hash);
        expect(instructions).toContain("sync/SyncEngine.kt");
        expect(instructions).toContain("modify, read");
        expect(instructions).toContain("must run");
        expect(instructions).toContain("FA-E2E-001");
        expect(instructions).toContain("Human review: REQUIRED");
        // --- P19d: Verify (pass) ---
        const { contract: verified, passed } = verifyChangeContract({
            contract: exported,
            scopeDiffReport: makePassScopeDiff(exported.scope.scope_hash),
            timestamp: "2026-04-27T03:00:00Z",
        });
        expect(verified.lifecycle_status).toBe("verified");
        expect(passed).toBe(true);
        expect(verified.current_decision.decision).toBe("pass");
        expect(verified.refs.scope_diff_report_hash).toMatch(/^sha256:/);
        const scopeObl = verified.verification.obligations.find(o => o.type === "scope_diff");
        expect(scopeObl.status).toBe("passed");
        // --- Close ---
        const closeEvent = createResultEvent("contract_closed", "ok", "All obligations satisfied, contract closed", {}, "2026-04-27T04:00:00Z");
        const closed = transitionChangeContract(verified, "closed", closeEvent);
        expect(closed.lifecycle_status).toBe("closed");
        expect(closed.current_decision.decision).toBe("closed");
        expect(closed.result_events.length).toBeGreaterThanOrEqual(5);
        // --- Verify full event chain ---
        const eventTypes = closed.result_events.map(e => e.event_type);
        expect(eventTypes).toContain("contract_created");
        expect(eventTypes).toContain("scope_built");
        expect(eventTypes).toContain("agent_scope_exported");
        expect(eventTypes).toContain("scope_diff_verified");
        expect(eventTypes).toContain("contract_closed");
        // --- P19.1: Validate at every stage ---
        expect(validateChangeContract(draft).status).toBe("valid");
        expect(validateChangeContract(exported).status).toBe("valid");
        expect(validateChangeContract(verified).status).toBe("valid");
        expect(validateChangeContract(closed).status).toBe("valid");
        // --- P19.1: Render produces readable markdown ---
        const md = renderChangeContractMarkdown(closed);
        expect(md).toContain("# Pantheon Change Contract");
        expect(md).toContain("`closed`");
        expect(md).toContain("`closed`"); // decision becomes "closed" at terminal
        expect(md).toContain("Projection Notice");
        expect(md).toContain("change_contract.json");
    });
});
// ---------------------------------------------------------------------------
// E2E: Escalation + Re-verification
// ---------------------------------------------------------------------------
describe("P19 E2E: escalation path", () => {
    it("build → export → verify(fail) → re-verify(pass) → close", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        // Build
        const { contract: draft } = buildChangeContract({
            intent: {
                intent: "Refactor sync engine",
                source_request: "ARCH-1234",
            },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        });
        // Scope + Export
        const scoped = transitionChangeContract(draft, "scoped", createResultEvent("scope_built", "ok", "Scoped", {}, "2026-04-27T00:30:00Z"));
        const { contract: exported } = exportAgentScope({
            contract: scoped,
            instructions_path: ".cursor/rules/pantheon-boundaries.md",
            timestamp: "2026-04-27T01:00:00Z",
        });
        // --- First verify: FAIL ---
        const { contract: escalated, passed: firstPass } = verifyChangeContract({
            contract: exported,
            scopeDiffReport: makeFailScopeDiff(exported.scope.scope_hash),
            timestamp: "2026-04-27T03:00:00Z",
        });
        expect(escalated.lifecycle_status).toBe("escalated");
        expect(firstPass).toBe(false);
        expect(escalated.current_decision.decision).toBe("fail");
        expect(escalated.current_decision.required_actions).toContain("Fix SyncEngineTest");
        const failedObl = escalated.verification.obligations.find(o => o.type === "scope_diff");
        expect(failedObl.status).toBe("failed");
        // --- Re-verify: PASS ---
        const { contract: verified, passed: secondPass } = verifyChangeContract({
            contract: escalated,
            scopeDiffReport: makePassScopeDiff(escalated.scope.scope_hash),
            timestamp: "2026-04-27T05:00:00Z",
        });
        expect(verified.lifecycle_status).toBe("verified");
        expect(secondPass).toBe(true);
        expect(verified.current_decision.decision).toBe("pass");
        const passedObl = verified.verification.obligations.find(o => o.type === "scope_diff");
        expect(passedObl.status).toBe("passed");
        // Close
        const closed = transitionChangeContract(verified, "closed", createResultEvent("contract_closed", "ok", "Closed after re-verify", {}, "2026-04-27T06:00:00Z"));
        expect(closed.lifecycle_status).toBe("closed");
        expect(closed.result_events.length).toBeGreaterThanOrEqual(6);
        // --- P19.1: Validate escalated + closed ---
        expect(validateChangeContract(escalated).status).toBe("valid");
        expect(validateChangeContract(closed).status).toBe("valid");
        // --- P19.1: Render escalated contract ---
        const md = renderChangeContractMarkdown(escalated);
        expect(md).toContain("`escalated`");
        expect(md).toContain("`fail`");
        expect(md).toContain("Fix SyncEngineTest");
    });
});
// ---------------------------------------------------------------------------
// E2E: Human Review Path
// ---------------------------------------------------------------------------
describe("P19 E2E: human review path", () => {
    it("build → export → verify(requires_review) → record review → re-verify(pass) → close", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        // Build + Scope + Export
        const { contract: draft } = buildChangeContract({
            intent: { intent: "Sync refactor", source_request: "ARCH-1234" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        });
        const scoped = transitionChangeContract(draft, "scoped", createResultEvent("scope_built", "ok", "Scoped", {}, "2026-04-27T00:30:00Z"));
        const { contract: exported } = exportAgentScope({
            contract: scoped,
            instructions_path: ".cursor/rules/pantheon-boundaries.md",
            timestamp: "2026-04-27T01:00:00Z",
        });
        // --- Verify: requires_human_review ---
        const { contract: escalated, passed: firstPass } = verifyChangeContract({
            contract: exported,
            scopeDiffReport: makeHumanReviewScopeDiff(exported.scope.scope_hash),
            timestamp: "2026-04-27T03:00:00Z",
        });
        expect(escalated.lifecycle_status).toBe("escalated");
        expect(firstPass).toBe(false);
        expect(escalated.current_decision.decision).toBe("requires_human_review");
        // scope_diff obligation stays pending (diff itself was clean)
        const pendingObl = escalated.verification.obligations.find(o => o.type === "scope_diff");
        expect(pendingObl.status).toBe("pending");
        // --- Record human review (annotation event) ---
        const reviewEvent = createResultEvent("human_review_recorded", "approved", "Reviewed by lead architect", { reviewer: "architect_001" }, "2026-04-27T04:00:00Z");
        const reviewed = recordContractEvent(escalated, reviewEvent);
        expect(reviewed.lifecycle_status).toBe("escalated"); // still escalated
        expect(reviewed.result_events.length).toBe(escalated.result_events.length + 1);
        // --- Re-verify: PASS ---
        const { contract: verified, passed: secondPass } = verifyChangeContract({
            contract: reviewed,
            scopeDiffReport: makePassScopeDiff(reviewed.scope.scope_hash),
            timestamp: "2026-04-27T05:00:00Z",
        });
        expect(verified.lifecycle_status).toBe("verified");
        expect(secondPass).toBe(true);
        expect(verified.current_decision.decision).toBe("pass");
        // Close
        const closed = transitionChangeContract(verified, "closed", createResultEvent("contract_closed", "ok", "Closed after review", {}, "2026-04-27T06:00:00Z"));
        expect(closed.lifecycle_status).toBe("closed");
        // Verify full audit trail
        const eventTypes = closed.result_events.map(e => e.event_type);
        expect(eventTypes).toContain("human_review_recorded");
        expect(eventTypes.filter(e => e === "scope_diff_verified")).toHaveLength(2); // escalation + re-verify
        // --- P19.1: Validate human-review escalated + closed ---
        expect(validateChangeContract(escalated).status).toBe("valid");
        expect(validateChangeContract(closed).status).toBe("valid");
        // --- P19.1: Render review-escalated contract ---
        const md = renderChangeContractMarkdown(escalated);
        expect(md).toContain("`requires_human_review`");
        expect(md).toContain("Human Review");
    });
});
// ---------------------------------------------------------------------------
// E2E: Invalidation Path
// ---------------------------------------------------------------------------
describe("P19 E2E: invalidation path", () => {
    it("build → invalidate (never exported)", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        const { contract: draft } = buildChangeContract({
            intent: { intent: "Abandoned refactor", source_request: "ARCH-9999" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        });
        const invalidEvent = createResultEvent("contract_invalidated", "ok", "Requirements changed, contract no longer valid", {}, "2026-04-27T01:00:00Z");
        const invalid = transitionChangeContract(draft, "invalid", invalidEvent);
        expect(invalid.lifecycle_status).toBe("invalid");
        expect(invalid.current_decision.decision).toBe("invalid");
        // --- P19.1: Validate invalidated contract ---
        expect(validateChangeContract(invalid).status).toBe("valid");
        // --- P19.1: Render invalidated contract ---
        const md = renderChangeContractMarkdown(invalid);
        expect(md).toContain("`invalid`");
        expect(md).toContain("Projection Notice");
    });
});
// ---------------------------------------------------------------------------
// E2E: Contract identity invariants
// ---------------------------------------------------------------------------
describe("P19 E2E: identity invariants", () => {
    it("contract_id is deterministic across builds with same input", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        const input = {
            intent: { intent: "Deterministic test", source_request: "DET-001" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        };
        const r1 = buildChangeContract(input);
        const r2 = buildChangeContract(input);
        expect(r1.contract.contract_id).toBe(r2.contract.contract_id);
        expect(r1.contract.scope.scope_hash).toBe(r2.contract.scope.scope_hash);
    });
    it("scope_hash changes when P17 enforcement surface changes", () => {
        const report = makeBlastReport();
        const pkg1 = makeScopedPackage(report);
        const pkg2 = makeScopedPackage(report);
        pkg2.forbidden_assumptions[0].statement = "CHANGED: network may be available";
        const r1 = buildChangeContract({
            intent: { intent: "Hash test", source_request: "HASH-001" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg1,
            timestamp: "2026-04-27T00:00:00Z",
        });
        const r2 = buildChangeContract({
            intent: { intent: "Hash test", source_request: "HASH-001" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg2,
            timestamp: "2026-04-27T00:00:00Z",
        });
        expect(r1.contract.scope.scope_hash).not.toBe(r2.contract.scope.scope_hash);
    });
    it("upstream consistency is enforced — mismatched P15/P17 throws", () => {
        const report = makeBlastReport();
        const pkg = makeScopedPackage(report);
        pkg.source.blast_radius_report_hash = "sha256:wrong";
        expect(() => buildChangeContract({
            intent: { intent: "Mismatch test", source_request: "MM-001" },
            canonical_revisions: [{ artifact_id: "art_arch", revision_id: "rev_100" }],
            blastRadiusReport: report,
            scopedPackage: pkg,
            timestamp: "2026-04-27T00:00:00Z",
        })).toThrow("P15/P17 upstream mismatch");
    });
});
//# sourceMappingURL=e2e.test.js.map