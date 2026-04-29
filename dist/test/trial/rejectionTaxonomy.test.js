/**
 * Rejection Taxonomy — Tests
 *
 * ref: P6-004
 */
import { describe, it, expect } from "vitest";
import { classifySingleError, classifyRejection, summarizeRejections, } from "../../src/trial/rejectionTaxonomy.js";
describe("P6-004: classifySingleError", () => {
    const cases = [
        // bad_json
        ["JSON.parse failed on raw output", "bad_json"],
        ["Unexpected token < in JSON at position 0", "bad_json"],
        ["SyntaxError: invalid json", "bad_json"],
        // schema_invalid
        ['schema_version "invalid@0.0.0" not found', "schema_invalid"],
        ["missing required field: operations", "schema_invalid"],
        ["validation failed for PatchProposal", "schema_invalid"],
        // wrong_artifact_id
        ['artifact_id "wrong_id" does not match expected', "wrong_artifact_id"],
        // wrong_base_revision
        ['base_revision_id "old_rev" does not match current', "wrong_base_revision"],
        // wrong_block_id (G-02 source reference gate)
        [
            'target_block_id "b_nonexistent" does not exist in artifact block index',
            "wrong_block_id",
        ],
        // empty_replacement
        ["replacement_text is empty", "empty_replacement"],
        // capability_violation (G-03)
        ['Skill "blue_patch_agent" (L2) is forbidden from writing to "canonical"', "capability_violation"],
        // operation_not_allowed (G-03 — specific output violation)
        ['Skill "blue_patch_agent" (L2) is not allowed to produce "Draft"', "operation_not_allowed"],
        // semantic_regression
        ["semantic regression failed: intent_shift detected", "semantic_regression"],
        // unknown
        ["some random error nobody expected", "unknown"],
    ];
    for (const [error, expected] of cases) {
        it(`"${error.slice(0, 50)}…" → ${expected}`, () => {
            const result = classifySingleError(error);
            expect(result.category).toBe(expected);
            expect(result.raw_error).toBe(error);
        });
    }
});
describe("P6-004: classifyRejection", () => {
    it("classifies multiple errors", () => {
        const records = classifyRejection([
            "JSON.parse failed",
            'target_block_id "b_999" does not exist in artifact block index',
        ]);
        expect(records).toHaveLength(2);
        expect(records[0].category).toBe("bad_json");
        expect(records[1].category).toBe("wrong_block_id");
    });
    it("detects bad_json from rawOutput when no errors given", () => {
        const records = classifyRejection([], "not valid json {{{");
        expect(records).toHaveLength(1);
        expect(records[0].category).toBe("bad_json");
    });
    it("returns empty for valid JSON and no errors", () => {
        const records = classifyRejection([], '{"valid": true}');
        expect(records).toHaveLength(0);
    });
});
describe("P6-004: summarizeRejections", () => {
    it("counts by category", () => {
        const records = classifyRejection([
            "JSON.parse failed",
            "SyntaxError: bad token",
            'target_block_id "b_999" does not exist in artifact block index',
            "some unknown error",
        ]);
        const summary = summarizeRejections(records);
        expect(summary["bad_json"]).toBe(2);
        expect(summary["wrong_block_id"]).toBe(1);
        expect(summary["unknown"]).toBe(1);
    });
});
//# sourceMappingURL=rejectionTaxonomy.test.js.map