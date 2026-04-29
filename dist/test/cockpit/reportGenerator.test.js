/**
 * Report Generator — Tests
 *
 * ref: P5-001
 */
import { describe, it, expect } from "vitest";
import { buildResidualSnapshot } from "../../src/cockpit/reportGenerator.js";
import { computeBlockContentHash } from "../../src/hash.js";
function makeBlock(overrides = {}) {
    const block = {
        block_id: "b_001",
        type: "invariant",
        text: "The pipeline validates all system input through the gate.",
        terms: ["pipeline", "gate"],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    block.content_hash = computeBlockContentHash(block);
    return block;
}
function makeArtifact(sections) {
    return {
        artifact_id: "arch_test",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_test",
        sections: sections.map((s) => ({
            section_id: s.id,
            title: s.title,
            commitments: s.blocks,
        })),
        metadata: {},
    };
}
describe("buildResidualSnapshot", () => {
    it("returns zero residuals for clean artifact", () => {
        const artifact = makeArtifact([
            {
                id: "sec_01",
                title: "Core",
                blocks: [
                    makeBlock({
                        block_id: "b_clean",
                        text: "The pipeline validates all system input through the gate before commit.",
                        terms: ["pipeline", "gate"],
                    }),
                ],
            },
        ]);
        const snapshot = buildResidualSnapshot(artifact);
        expect(snapshot.total).toBe(0);
        expect(snapshot.issues).toHaveLength(0);
        expect(snapshot.by_severity).toEqual({});
        expect(snapshot.by_type).toEqual({});
    });
    it("captures undefined_term issues with section info", () => {
        const artifact = makeArtifact([
            {
                id: "sec_gates",
                title: "Gate System",
                blocks: [
                    makeBlock({
                        block_id: "b_with_terms",
                        text: "Validates `base_revision_id` and `target_block_id` before applying.",
                        terms: [],
                    }),
                ],
            },
        ]);
        const snapshot = buildResidualSnapshot(artifact);
        expect(snapshot.total).toBeGreaterThan(0);
        expect(snapshot.by_type["undefined_term"]).toBeGreaterThan(0);
        expect(snapshot.by_severity["medium"]).toBeGreaterThan(0);
        for (const issue of snapshot.issues) {
            expect(issue.section_id).toBe("sec_gates");
            expect(issue.section_title).toBe("Gate System");
            expect(issue.block_id).toBe("b_with_terms");
        }
    });
    it("captures empty_block_text as high severity", () => {
        const artifact = makeArtifact([
            {
                id: "sec_01",
                title: "Core",
                blocks: [makeBlock({ block_id: "b_empty", text: "" })],
            },
        ]);
        const snapshot = buildResidualSnapshot(artifact);
        expect(snapshot.total).toBe(1);
        expect(snapshot.by_type["empty_block_text"]).toBe(1);
        expect(snapshot.by_severity["high"]).toBe(1);
    });
    it("aggregates by_section correctly across sections", () => {
        const artifact = makeArtifact([
            {
                id: "sec_a",
                title: "Section A",
                blocks: [makeBlock({ block_id: "b_a1", text: "" })],
            },
            {
                id: "sec_b",
                title: "Section B",
                blocks: [makeBlock({ block_id: "b_b1", text: "" })],
            },
        ]);
        const snapshot = buildResidualSnapshot(artifact);
        expect(snapshot.total).toBe(2);
        expect(Object.keys(snapshot.by_section)).toHaveLength(2);
    });
    it("issues have all required fields", () => {
        const artifact = makeArtifact([
            {
                id: "sec_01",
                title: "Core",
                blocks: [makeBlock({ block_id: "b_empty", text: "" })],
            },
        ]);
        const snapshot = buildResidualSnapshot(artifact);
        for (const issue of snapshot.issues) {
            expect(issue.issue_id).toBeTruthy();
            expect(issue.block_id).toBeTruthy();
            expect(issue.section_id).toBeTruthy();
            expect(issue.section_title).toBeTruthy();
            expect(issue.issue_type).toBeTruthy();
            expect(issue.severity).toBeTruthy();
            expect(issue.message).toBeTruthy();
        }
    });
});
//# sourceMappingURL=reportGenerator.test.js.map