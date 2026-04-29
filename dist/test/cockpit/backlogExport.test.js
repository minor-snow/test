/**
 * Backlog Export — Tests
 *
 * ref: P5-003
 */
import { describe, it, expect } from "vitest";
import { generateBacklogItems, exportBacklogMarkdown, validateReleaseDecision, } from "../../src/cockpit/backlogExport.js";
function makeSnapshot(count, type = "undefined_term", severity = "medium") {
    const issues = Array.from({ length: count }, (_, i) => ({
        issue_id: `issue_${i + 1}`,
        block_id: `b_${i + 1}`,
        section_id: `sec_0${(i % 3) + 1}`,
        section_title: `Section ${(i % 3) + 1}`,
        issue_type: type,
        severity,
        message: `Test issue ${i + 1}`,
    }));
    return {
        total: count,
        by_severity: { [severity]: count },
        by_type: { [type]: count },
        by_section: {},
        issues,
    };
}
function makeDecision(overrides = {}) {
    return {
        decision_id: "dec_001",
        decision: "accepted_with_residual_issues",
        canonical_revision_id: "rev_test",
        artifact_id: "arch_test",
        operator_id: "human_001",
        timestamp: new Date().toISOString(),
        rationale: "All high-severity issues resolved. Remaining are terminology debt.",
        final_coherence_note: "Document is coherent and suitable for maintenance.",
        three_layer_status: {
            integrity_clean: true,
            artifact_clean: false,
            document_coherent: true,
        },
        residual_snapshot: makeSnapshot(3),
        backlog_items: [],
        ...overrides,
    };
}
describe("generateBacklogItems", () => {
    it("creates one item per residual issue", () => {
        const snapshot = makeSnapshot(5);
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001");
        expect(items).toHaveLength(5);
    });
    it("items have sequential IDs", () => {
        const snapshot = makeSnapshot(3);
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001");
        expect(items[0].id).toBe("BACKLOG-001");
        expect(items[1].id).toBe("BACKLOG-002");
        expect(items[2].id).toBe("BACKLOG-003");
    });
    it("items carry full provenance", () => {
        const snapshot = makeSnapshot(1);
        const items = generateBacklogItems(snapshot, "rev_xyz", "dec_042");
        const item = items[0];
        expect(item.source_issue_id).toBe("issue_1");
        expect(item.block_id).toBe("b_1");
        expect(item.section_id).toBe("sec_01");
        expect(item.canonical_revision_id).toBe("rev_xyz");
        expect(item.created_from_release_decision_id).toBe("dec_042");
        expect(item.why_deferred).toBeTruthy();
    });
    it("uses default deferral templates by issue type", () => {
        const snapshot = makeSnapshot(1, "undefined_term");
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001");
        expect(items[0].why_deferred).toContain("Terminology debt");
    });
    it("allows custom deferral overrides", () => {
        const snapshot = makeSnapshot(1);
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001", {
            issue_1: "Custom reason: will fix in Sprint 3",
        });
        expect(items[0].why_deferred).toBe("Custom reason: will fix in Sprint 3");
    });
});
describe("exportBacklogMarkdown", () => {
    it("produces valid markdown with table", () => {
        const snapshot = makeSnapshot(3);
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001");
        const md = exportBacklogMarkdown(items);
        expect(md).toContain("# Backlog");
        expect(md).toContain("BACKLOG-001");
        expect(md).toContain("BACKLOG-002");
        expect(md).toContain("BACKLOG-003");
        expect(md).toContain("rev_abc");
        expect(md).toContain("dec_001");
    });
    it("includes detail section for each item", () => {
        const snapshot = makeSnapshot(2);
        const items = generateBacklogItems(snapshot, "rev_abc", "dec_001");
        const md = exportBacklogMarkdown(items);
        expect(md).toContain("### BACKLOG-001");
        expect(md).toContain("### BACKLOG-002");
        expect(md).toContain("**Why Deferred:**");
    });
});
describe("validateReleaseDecision", () => {
    it("valid accepted_with_residual_issues", () => {
        const decision = makeDecision({
            backlog_items: generateBacklogItems(makeSnapshot(3), "rev_abc", "dec_001"),
        });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it("rejects empty rationale", () => {
        const decision = makeDecision({ rationale: "" });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("rationale"))).toBe(true);
    });
    it("rejects empty coherence note", () => {
        const decision = makeDecision({ final_coherence_note: "" });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("coherence_note"))).toBe(true);
    });
    it("rejects accepted_clean with residuals", () => {
        const decision = makeDecision({
            decision: "accepted_clean",
            residual_snapshot: makeSnapshot(2),
        });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("accepted_clean"))).toBe(true);
    });
    it("allows accepted_clean with zero residuals", () => {
        const decision = makeDecision({
            decision: "accepted_clean",
            residual_snapshot: makeSnapshot(0),
            backlog_items: [],
        });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(true);
    });
    it("rejects accepted_with_residual_issues without backlog", () => {
        const decision = makeDecision({ backlog_items: [] });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("backlog"))).toBe(true);
    });
    it("rejects accepted_with_residual_issues with high severity", () => {
        const decision = makeDecision({
            residual_snapshot: makeSnapshot(1, "empty_block_text", "high"),
            backlog_items: generateBacklogItems(makeSnapshot(1, "empty_block_text", "high"), "rev_abc", "dec_001"),
        });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("high-severity"))).toBe(true);
    });
    it("rejects rejected_requires_cleanup with backlog items", () => {
        const decision = makeDecision({
            decision: "rejected_requires_cleanup",
            backlog_items: generateBacklogItems(makeSnapshot(1), "rev_abc", "dec_001"),
        });
        const result = validateReleaseDecision(decision);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("rejected"))).toBe(true);
    });
});
//# sourceMappingURL=backlogExport.test.js.map