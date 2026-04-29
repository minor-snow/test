/**
 * Patch System – Test Suite
 *
 * ref: 执行宪法 v0.2 §17 Day 5
 * ref: §18 criteria #6 (compilePatch), #7 (applyPatch success), #8 (applyPatch reject)
 */
import { describe, it, expect } from "vitest";
import { compilePatch, applyPatch } from "../src/applyPatch.js";
import { computeBlockContentHash } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    const block = {
        block_id: "b_mem_001",
        type: "invariant",
        text: "All entries are committed instantly.",
        rationale: "Initial naive design.",
        terms: [],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    block.content_hash = computeBlockContentHash(block);
    return block;
}
function makeArtifact(overrides = {}) {
    return {
        artifact_id: "arch_001",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_001",
        sections: [
            {
                section_id: "sec_memory",
                title: "Memory Layer",
                commitments: [makeBlock()],
            },
        ],
        metadata: { created_by: "test" },
        ...overrides,
    };
}
function makeProposal(overrides = {}) {
    return {
        proposal_id: "proposal_001",
        artifact_id: "arch_001",
        base_revision_id: "rev_001",
        source_issue_ids: ["issue_001"],
        operations: [
            {
                op: "replace_block",
                target_block_id: "b_mem_001",
                replacement_text: "Entries must pass a quarantine gate before canonical commit.",
            },
        ],
        ...overrides,
    };
}
// ===========================================================================
// compilePatch – ref: §10.3, §18 #6
// ===========================================================================
describe("compilePatch", () => {
    it("§18-#6: PatchProposal can be compiled into ArtifactPatch", () => {
        const artifact = makeArtifact();
        const proposal = makeProposal();
        const patch = compilePatch(proposal, artifact);
        expect(patch.patch_id).toBe("patch_proposal_001");
        expect(patch.artifact_id).toBe("arch_001");
        expect(patch.base_revision_id).toBe("rev_001");
        expect(patch.source_issue_ids).toEqual(["issue_001"]);
        expect(patch.operations.length).toBe(1);
    });
    it("fills expected_old_hash from current block", () => {
        const artifact = makeArtifact();
        const currentBlock = artifact.sections[0].commitments[0];
        const patch = compilePatch(makeProposal(), artifact);
        expect(patch.operations[0].expected_old_hash).toBe(currentBlock.content_hash);
    });
    it("constructs new_block with updated text and computed hash", () => {
        const patch = compilePatch(makeProposal(), makeArtifact());
        const newBlock = patch.operations[0].new_block;
        expect(newBlock.text).toBe("Entries must pass a quarantine gate before canonical commit.");
        expect(newBlock.block_id).toBe("b_mem_001");
        expect(newBlock.type).toBe("invariant");
        expect(newBlock.content_hash).toMatch(/^sha256:/);
        // Verify hash is correctly computed
        const expected = computeBlockContentHash(newBlock);
        expect(newBlock.content_hash).toBe(expected);
    });
    it("preserves block metadata (type, rationale, terms, status)", () => {
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_01",
                    title: "Test",
                    commitments: [
                        makeBlock({
                            type: "constraint",
                            rationale: "Important reason",
                            terms: ["quarantine"],
                            status: "candidate",
                        }),
                    ],
                },
            ],
        });
        const patch = compilePatch(makeProposal(), artifact);
        const newBlock = patch.operations[0].new_block;
        expect(newBlock.type).toBe("constraint");
        expect(newBlock.rationale).toBe("Important reason");
        expect(newBlock.terms).toEqual(["quarantine"]);
        expect(newBlock.status).toBe("candidate");
    });
    it("throws for non-existent target_block_id", () => {
        const proposal = makeProposal({
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_nonexistent",
                    replacement_text: "New text.",
                },
            ],
        });
        expect(() => compilePatch(proposal, makeArtifact())).toThrow("b_nonexistent");
    });
    it("handles multiple operations", () => {
        const block2 = makeBlock({
            block_id: "b_mem_002",
            text: "Second block.",
        });
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_memory",
                    title: "Memory",
                    commitments: [makeBlock(), block2],
                },
            ],
        });
        const proposal = makeProposal({
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: "Updated first.",
                },
                {
                    op: "replace_block",
                    target_block_id: "b_mem_002",
                    replacement_text: "Updated second.",
                },
            ],
        });
        const patch = compilePatch(proposal, artifact);
        expect(patch.operations.length).toBe(2);
        expect(patch.operations[0].new_block.text).toBe("Updated first.");
        expect(patch.operations[1].new_block.text).toBe("Updated second.");
    });
});
// ===========================================================================
// applyPatch – ref: §11, §18 #7 #8
// ===========================================================================
describe("applyPatch – success cases", () => {
    it("§18-#7: generates candidate revision when hash matches", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("accepted");
        if (result.status === "accepted") {
            expect(result.candidate_revision.revision_id).toMatch(/^rev_[0-9a-f]{12}$/);
            expect(result.candidate_revision.revision_id).not.toBe("rev_001");
            expect(result.candidate_revision.parent_revision_id).toBe("rev_001");
            expect(result.elevated_review_required).toBe(false);
        }
    });
    it("candidate revision contains updated block text", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        const result = applyPatch(artifact, patch);
        if (result.status === "accepted") {
            const block = result.candidate_revision.sections[0].commitments[0];
            expect(block.text).toBe("Entries must pass a quarantine gate before canonical commit.");
            expect(block.content_hash).toBe(computeBlockContentHash(block));
        }
    });
    it("does not modify original artifact", () => {
        const artifact = makeArtifact();
        const originalText = artifact.sections[0].commitments[0].text;
        const patch = compilePatch(makeProposal(), artifact);
        applyPatch(artifact, patch);
        expect(artifact.sections[0].commitments[0].text).toBe(originalText);
        expect(artifact.revision_id).toBe("rev_001");
    });
    it("candidate revision has different revision_id from base", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        const result = applyPatch(artifact, patch);
        if (result.status === "accepted") {
            expect(result.candidate_revision.revision_id).not.toBe(artifact.revision_id);
        }
    });
});
describe("applyPatch – rejection cases", () => {
    it("§18-#8: rejects on hash mismatch", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        // Tamper with expected_old_hash
        patch.operations[0].expected_old_hash = "sha256:tampered_hash";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("HASH_MISMATCH");
        }
    });
    it("rejects on artifact_id mismatch", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        patch.artifact_id = "arch_wrong";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("ARTIFACT_ID_MISMATCH");
        }
    });
    it("rejects on base_revision_id mismatch", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        patch.base_revision_id = "rev_wrong";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("BASE_REVISION_MISMATCH");
        }
    });
    it("rejects when target_block_id does not exist", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        // Change target to a non-existent block
        patch.operations[0].target_block_id = "b_nonexistent";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("TARGET_BLOCK_NOT_FOUND");
        }
    });
    it("rejects cross-section operations", () => {
        const block2 = makeBlock({
            block_id: "b_other_001",
            text: "Other section block.",
        });
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_memory",
                    title: "Memory",
                    commitments: [makeBlock()],
                },
                {
                    section_id: "sec_storage",
                    title: "Storage",
                    commitments: [block2],
                },
            ],
        });
        // Create a patch that spans two sections
        const newBlock1 = makeBlock({ text: "Updated mem." });
        const newBlock2 = makeBlock({
            block_id: "b_other_001",
            text: "Updated storage.",
        });
        const patch = {
            patch_id: "patch_cross",
            artifact_id: "arch_001",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    expected_old_hash: artifact.sections[0].commitments[0].content_hash,
                    new_block: newBlock1,
                },
                {
                    op: "replace_block",
                    target_block_id: "b_other_001",
                    expected_old_hash: artifact.sections[1].commitments[0].content_hash,
                    new_block: newBlock2,
                },
            ],
        };
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("CROSS_SECTION_OPERATIONS");
        }
    });
    it("rejects when new_block content_hash is incorrect", () => {
        const artifact = makeArtifact();
        const patch = compilePatch(makeProposal(), artifact);
        // Tamper with the new block's content_hash
        patch.operations[0].new_block.content_hash = "sha256:wrong_hash";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("NEW_BLOCK_HASH_INVALID");
        }
    });
});
describe("applyPatch – elevated review", () => {
    it("> 3 operations → elevated_review_required (not rejection)", () => {
        // Build artifact with 4 blocks in same section
        const blocks = Array.from({ length: 4 }, (_, i) => makeBlock({
            block_id: `b_block_${i}`,
            text: `Block ${i} text.`,
        }));
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_big",
                    title: "Big Section",
                    commitments: blocks,
                },
            ],
        });
        // Proposal with 4 operations
        const proposal = {
            proposal_id: "proposal_big",
            artifact_id: "arch_001",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: blocks.map((b) => ({
                op: "replace_block",
                target_block_id: b.block_id,
                replacement_text: `Updated ${b.block_id}`,
            })),
        };
        const patch = compilePatch(proposal, artifact);
        expect(patch.operations.length).toBe(4);
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("accepted");
        if (result.status === "accepted") {
            expect(result.elevated_review_required).toBe(true);
        }
    });
    it("exactly 3 operations → NOT elevated_review_required", () => {
        const blocks = Array.from({ length: 3 }, (_, i) => makeBlock({
            block_id: `b_block_${i}`,
            text: `Block ${i} text.`,
        }));
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_normal",
                    title: "Normal Section",
                    commitments: blocks,
                },
            ],
        });
        const proposal = {
            proposal_id: "proposal_3",
            artifact_id: "arch_001",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: blocks.map((b) => ({
                op: "replace_block",
                target_block_id: b.block_id,
                replacement_text: `Updated ${b.block_id}`,
            })),
        };
        const patch = compilePatch(proposal, artifact);
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("accepted");
        if (result.status === "accepted") {
            expect(result.elevated_review_required).toBe(false);
        }
    });
});
// ===========================================================================
// End-to-end: Issue → PatchProposal → ArtifactPatch → Candidate
// ===========================================================================
describe("end-to-end patch flow", () => {
    it("full pipeline from proposal to candidate revision", () => {
        // 1. Start with the problematic artifact from §21
        const artifact = makeArtifact();
        // 2. PatchProposal from §21
        const proposal = {
            proposal_id: "proposal_001",
            artifact_id: "arch_001",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: "Entries must pass a quarantine gate before canonical commit.",
                },
            ],
        };
        // 3. Compile
        const patch = compilePatch(proposal, artifact);
        expect(patch.operations[0].expected_old_hash).toBe(artifact.sections[0].commitments[0].content_hash);
        // 4. Apply
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("accepted");
        if (result.status === "accepted") {
            const candidate = result.candidate_revision;
            // Verify structure
            expect(candidate.artifact_id).toBe("arch_001");
            expect(candidate.parent_revision_id).toBe("rev_001");
            expect(candidate.revision_id).not.toBe("rev_001");
            // Verify content change
            expect(candidate.sections[0].commitments[0].text).toBe("Entries must pass a quarantine gate before canonical commit.");
            // Verify old artifact is unchanged
            expect(artifact.sections[0].commitments[0].text).toBe("All entries are committed instantly.");
        }
    });
});
//# sourceMappingURL=applyPatch.test.js.map