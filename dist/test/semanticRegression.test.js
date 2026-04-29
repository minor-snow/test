/**
 * Semantic Regression Gate – Test Suite
 *
 * ref: 执行宪法 v0.2 §12, §17 Day 6
 * ref: §18 criteria #9 — Semantic Regression can intercept undefined term
 */
import { describe, it, expect } from "vitest";
import { runSemanticRegression, buildRegressionInput, extractStrongConstraints, } from "../src/semanticRegression.js";
import { computeBlockContentHash } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    const block = {
        block_id: "b_mem_001",
        type: "invariant",
        text: "All entries must pass quarantine before canonical commit.",
        rationale: "Safety.",
        terms: ["quarantine", "canonical"],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    block.content_hash = computeBlockContentHash(block);
    return block;
}
// ===========================================================================
// extractStrongConstraints
// ===========================================================================
describe("extractStrongConstraints", () => {
    it("extracts must, only, never from text", () => {
        const keywords = extractStrongConstraints("All entries must pass. Only canonical writes are allowed. Never skip quarantine.");
        expect(keywords).toContain("must");
        expect(keywords).toContain("only");
        expect(keywords).toContain("never");
    });
    it("extracts 'must not' as a single keyword", () => {
        const keywords = extractStrongConstraints("LLM must not decide state.");
        expect(keywords).toContain("must not");
    });
    it("case-insensitive", () => {
        const keywords = extractStrongConstraints("MUST and NEVER and ALWAYS.");
        expect(keywords).toContain("must");
        expect(keywords).toContain("never");
        expect(keywords).toContain("always");
    });
    it("deduplicates", () => {
        const keywords = extractStrongConstraints("must do this. must do that.");
        expect(keywords.filter((k) => k === "must").length).toBe(1);
    });
    it("returns empty for text without strong constraints", () => {
        const keywords = extractStrongConstraints("Entries are processed through the pipeline.");
        expect(keywords.length).toBe(0);
    });
    it("extracts forbidden, prohibited, required, mandatory", () => {
        const keywords = extractStrongConstraints("This is forbidden. Writing is prohibited. Login is required. Auditing is mandatory.");
        expect(keywords).toContain("forbidden");
        expect(keywords).toContain("prohibited");
        expect(keywords).toContain("required");
        expect(keywords).toContain("mandatory");
    });
});
// ===========================================================================
// buildRegressionInput
// ===========================================================================
describe("buildRegressionInput", () => {
    it("identifies changed blocks by content_hash difference", () => {
        const oldBlock = makeBlock({ text: "Old text must apply." });
        const newBlock = makeBlock({ text: "New text should apply." });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        expect(input.changed_blocks.length).toBe(1);
        expect(input.changed_blocks[0].block_id).toBe("b_mem_001");
    });
    it("does not flag unchanged blocks", () => {
        const block = makeBlock();
        const input = buildRegressionInput([block], [block]);
        expect(input.changed_blocks.length).toBe(0);
    });
});
// ===========================================================================
// Check: undefined term introduction
// ===========================================================================
describe("Semantic Regression – undefined terms", () => {
    it("§18-#9: intercepts undefined term in new block", () => {
        const oldBlock = makeBlock({
            text: "All entries are committed instantly.",
            terms: [],
        });
        const newBlock = makeBlock({
            text: "Entries must pass a `quarantine_gate` before canonical commit.",
            terms: [],
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("failed");
        expect(result.failed_gates).toContain("undefined_term");
        expect(result.reasons.some((r) => r.includes("quarantine_gate"))).toBe(true);
        expect(result.affected_blocks).toContain("b_mem_001");
    });
    it("passes when new term is defined in block terms", () => {
        const oldBlock = makeBlock({
            text: "Old text.",
            terms: [],
        });
        const newBlock = makeBlock({
            text: "Uses `quarantine_gate` for safety.",
            terms: ["quarantine_gate"],
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        // Should pass because quarantine_gate is now defined
        const undefinedTermGate = result.failed_gates.filter((g) => g === "undefined_term");
        expect(undefinedTermGate.length).toBe(0);
    });
    it("passes when term already existed in old block", () => {
        const oldBlock = makeBlock({
            text: "Uses `apply_patch` for updates.",
            terms: [],
        });
        const newBlock = makeBlock({
            text: "Also uses `apply_patch` for changes.",
            terms: [],
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        // apply_patch was in old text, so it's not "newly introduced"
        const undefinedReasons = result.reasons.filter((r) => r.includes("apply_patch"));
        expect(undefinedReasons.length).toBe(0);
    });
    it("passes when term comes from constitution constraints", () => {
        const oldBlock = makeBlock({
            text: "Old text.",
            terms: [],
        });
        const newBlock = makeBlock({
            text: "Must use `quarantine_gate` for all inputs.",
            terms: [],
        });
        const input = buildRegressionInput([oldBlock], [newBlock], ["All skill outputs must pass through quarantine_gate before evidence promotion."]);
        const result = runSemanticRegression(input);
        const undefinedReasons = result.reasons.filter((r) => r.includes("quarantine_gate"));
        expect(undefinedReasons.length).toBe(0);
    });
});
// ===========================================================================
// Check: strong constraint deletion
// ===========================================================================
describe("Semantic Regression – constraint deletion", () => {
    it("detects 'must' deletion", () => {
        const oldBlock = makeBlock({
            text: "All entries must pass quarantine.",
        });
        const newBlock = makeBlock({
            text: "All entries pass quarantine.",
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("failed");
        expect(result.failed_gates).toContain("constraint_deletion");
        expect(result.reasons.some((r) => r.includes('"must"'))).toBe(true);
    });
    it("detects 'never' deletion", () => {
        const oldBlock = makeBlock({
            text: "LLM should never decide state transitions.",
        });
        const newBlock = makeBlock({
            text: "LLM should not decide state transitions.",
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.failed_gates).toContain("constraint_deletion");
        expect(result.reasons.some((r) => r.includes('"never"'))).toBe(true);
    });
    it("detects 'only' deletion", () => {
        const oldBlock = makeBlock({
            text: "Only deterministic code controls state.",
        });
        const newBlock = makeBlock({
            text: "Deterministic code controls state.",
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.failed_gates).toContain("constraint_deletion");
    });
    it("passes when constraint keywords are preserved", () => {
        const oldBlock = makeBlock({
            text: "All entries must pass quarantine.",
        });
        const newBlock = makeBlock({
            text: "All data entries must pass quarantine before commit.",
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        const constraintGates = result.failed_gates.filter((g) => g === "constraint_deletion");
        expect(constraintGates.length).toBe(0);
    });
    it("passes when no changes are made", () => {
        const block = makeBlock();
        const input = buildRegressionInput([block], [block]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("passed");
        expect(result.failed_gates.length).toBe(0);
    });
});
// ===========================================================================
// Combined checks
// ===========================================================================
describe("Semantic Regression – combined", () => {
    it("reports both undefined term and constraint deletion", () => {
        const oldBlock = makeBlock({
            text: "All entries must pass quarantine.",
            terms: [],
        });
        const newBlock = makeBlock({
            text: "Entries pass `quarantine_gate` for safety.",
            terms: [],
        });
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("failed");
        expect(result.failed_gates).toContain("undefined_term");
        expect(result.failed_gates).toContain("constraint_deletion");
        expect(result.affected_blocks).toContain("b_mem_001");
    });
    it("handles multiple changed blocks", () => {
        const old1 = makeBlock({
            block_id: "b_001",
            text: "Must pass quarantine.",
            terms: [],
        });
        const old2 = makeBlock({
            block_id: "b_002",
            text: "Never skip validation.",
            terms: [],
        });
        const new1 = makeBlock({
            block_id: "b_001",
            text: "Pass quarantine.",
            terms: [],
        });
        const new2 = makeBlock({
            block_id: "b_002",
            text: "Skip validation sometimes.",
            terms: [],
        });
        const input = buildRegressionInput([old1, old2], [new1, new2]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("failed");
        expect(result.affected_blocks).toContain("b_001");
        expect(result.affected_blocks).toContain("b_002");
    });
});
//# sourceMappingURL=semanticRegression.test.js.map