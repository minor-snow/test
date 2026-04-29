/**
 * HARD-007: LLM Rejection Capability Tests
 *
 * ref: HARD-007, 执行宪法 v0.2 §7, §8, §10
 *
 * First batch: ONLY tests rejection ability. No generation tests.
 *
 * Proves that when a real LLM output is connected, the existing
 * gate system will not degrade. Every test here is a negative test.
 *
 * Cases:
 *   1. Bad JSON → json_parse gate rejects
 *   2. Unknown block in PatchProposal → source_reference_gate rejects
 *   3. Unauthorized skill output → capability_gate rejects
 *   4. Wrong hash in ArtifactPatch → applyPatch HASH_MISMATCH
 *   5. L1 skill forging PatchProposal → capability_gate rejects
 *   6. Valid JSON but missing required fields → schema_gate rejects
 *   7. PatchProposal with empty operations → schema_gate rejects
 *   8. Oversized replacement_text → type_specific_invariant rejects
 *   9. base_revision_id mismatch → applyPatch rejects
 *  10. L2 agent targeting canonical directly → capability_gate rejects
 */
import { describe, it, expect } from "vitest";
import { validateSkillOutput, capabilityGate } from "../src/validators.js";
import { applyPatch } from "../src/applyPatch.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    const b = {
        block_id: "b_target",
        type: "invariant",
        text: "Original block text.",
        terms: [],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    b.content_hash = computeBlockContentHash(b);
    return b;
}
function makeArtifact() {
    const artifact = {
        artifact_id: "art_llm_test",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_placeholder",
        sections: [
            {
                section_id: "sec_01",
                title: "Core Section",
                commitments: [makeBlock()],
            },
        ],
        metadata: { created_by: "test" },
    };
    artifact.revision_id = computeRevisionId(artifact);
    return artifact;
}
// ===========================================================================
// 1. Bad JSON
// ===========================================================================
describe("HARD-007 #1: Bad JSON rejected", () => {
    it("rejects completely invalid JSON", () => {
        const result = validateSkillOutput("this is not json at all {{{", "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
        expect(result.gates[0].gate).toBe("json_parse");
        expect(result.gates[0].passed).toBe(false);
    });
    it("rejects truncated JSON (simulating network cutoff)", () => {
        const result = validateSkillOutput('{"proposal_id": "p1", "artifact_id": "a1", "operations": [{"op": "replace_bl', "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
        expect(result.gates[0].gate).toBe("json_parse");
    });
    it("rejects empty string", () => {
        const result = validateSkillOutput("", "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
    });
});
// ===========================================================================
// 2. Unknown block in PatchProposal
// ===========================================================================
describe("HARD-007 #2: Unknown block rejected", () => {
    it("rejects PatchProposal targeting non-existent block", () => {
        const artifact = makeArtifact();
        const proposal = JSON.stringify({
            proposal_id: "p_llm_001",
            artifact_id: artifact.artifact_id,
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_hallucinated_by_llm",
                    replacement_text: "LLM generated this for a block that doesn't exist.",
                },
            ],
            schema_version: "patch_proposal@0.1.0",
        });
        const result = validateSkillOutput(proposal, "blue_patch_agent", "PatchProposal", "quarantine", artifact);
        expect(result.status).toBe("rejected");
        const srcRefGate = result.gates.find((g) => g.gate === "source_reference_gate");
        expect(srcRefGate).toBeDefined();
        expect(srcRefGate.passed).toBe(false);
        expect(srcRefGate.errors[0]).toContain("b_hallucinated_by_llm");
    });
});
// ===========================================================================
// 3. Unauthorized skill output
// ===========================================================================
describe("HARD-007 #3: Unauthorized skill rejected", () => {
    it("rejects unknown skill entirely", () => {
        const result = validateSkillOutput(JSON.stringify({
            issue_id: "i1",
            artifact_id: "a1",
            base_revision_id: "r1",
            target_block_id: "b1",
            issue_type: "test",
            severity: "high",
            message: "test",
            schema_version: "issue@0.1.0",
        }), "rogue_llm_agent", "Issue", "quarantine", null);
        expect(result.status).toBe("rejected");
        const capGate = result.gates.find((g) => g.gate === "capability_gate");
        expect(capGate.passed).toBe(false);
        expect(capGate.errors[0]).toContain("Unknown skill");
    });
});
// ===========================================================================
// 4. Wrong hash in ArtifactPatch
// ===========================================================================
describe("HARD-007 #4: Wrong hash rejected", () => {
    it("applyPatch rejects when expected_old_hash is wrong", () => {
        const artifact = makeArtifact();
        const newBlock = makeBlock({ text: "LLM replacement." });
        const patch = {
            patch_id: "patch_llm_001",
            artifact_id: artifact.artifact_id,
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_target",
                    expected_old_hash: "sha256:llm_made_up_this_hash",
                    new_block: newBlock,
                },
            ],
        };
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("HASH_MISMATCH");
            expect(result.details).toContain("sha256:llm_made_up_this_hash");
        }
    });
    it("applyPatch rejects when new_block content_hash is wrong", () => {
        const artifact = makeArtifact();
        const realOldHash = artifact.sections[0].commitments[0].content_hash;
        const patch = {
            patch_id: "patch_llm_002",
            artifact_id: artifact.artifact_id,
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_target",
                    expected_old_hash: realOldHash,
                    new_block: {
                        block_id: "b_target",
                        type: "invariant",
                        text: "LLM changed this.",
                        terms: [],
                        status: "draft",
                        content_hash: "sha256:llm_computed_wrong_hash",
                    },
                },
            ],
        };
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("NEW_BLOCK_HASH_INVALID");
        }
    });
});
// ===========================================================================
// 5. L1 skill impersonating patch agent
// ===========================================================================
describe("HARD-007 #5: L1 skill impersonation rejected", () => {
    it("rejects L1 linter trying to produce PatchProposal", () => {
        const fakeProposal = JSON.stringify({
            proposal_id: "p_forged",
            artifact_id: "art_001",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_001",
                    replacement_text: "L1 skill trying to write patches.",
                },
            ],
            schema_version: "patch_proposal@0.1.0",
        });
        const result = validateSkillOutput(fakeProposal, "document_linter", // L1 skill
        "PatchProposal", // not in its allowed_outputs
        "quarantine", null);
        expect(result.status).toBe("rejected");
        const capGate = result.gates.find((g) => g.gate === "capability_gate");
        expect(capGate.passed).toBe(false);
        expect(capGate.errors[0]).toContain("not allowed to produce");
    });
});
// ===========================================================================
// 6. Valid JSON but missing required fields
// ===========================================================================
describe("HARD-007 #6: Missing fields rejected", () => {
    it("rejects Issue with missing severity", () => {
        const badIssue = JSON.stringify({
            issue_id: "i1",
            artifact_id: "a1",
            base_revision_id: "r1",
            target_block_id: "b1",
            issue_type: "test",
            // severity: missing!
            message: "LLM forgot severity.",
            schema_version: "issue@0.1.0",
        });
        const result = validateSkillOutput(badIssue, "document_linter", "Issue", "quarantine", null);
        expect(result.status).toBe("rejected");
        const schemaGate = result.gates.find((g) => g.gate === "schema_gate");
        expect(schemaGate.passed).toBe(false);
    });
    it("rejects PatchProposal with missing source_issue_ids", () => {
        const badProposal = JSON.stringify({
            proposal_id: "p1",
            artifact_id: "a1",
            base_revision_id: "r1",
            // source_issue_ids: missing!
            operations: [
                { op: "replace_block", target_block_id: "b1", replacement_text: "x" },
            ],
            schema_version: "patch_proposal@0.1.0",
        });
        const result = validateSkillOutput(badProposal, "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
    });
});
// ===========================================================================
// 7. PatchProposal with empty operations
// ===========================================================================
describe("HARD-007 #7: Empty operations rejected", () => {
    it("rejects PatchProposal with zero operations", () => {
        const emptyOps = JSON.stringify({
            proposal_id: "p_empty",
            artifact_id: "a1",
            base_revision_id: "r1",
            source_issue_ids: ["issue_001"],
            operations: [], // empty!
            schema_version: "patch_proposal@0.1.0",
        });
        const result = validateSkillOutput(emptyOps, "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
    });
});
// ===========================================================================
// 8. Oversized replacement_text
// ===========================================================================
describe("HARD-007 #8: Oversized text rejected", () => {
    it("rejects replacement_text exceeding 10000 chars", () => {
        const oversized = JSON.stringify({
            proposal_id: "p_oversized",
            artifact_id: "a1",
            base_revision_id: "r1",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b1",
                    replacement_text: "A".repeat(10001),
                },
            ],
            schema_version: "patch_proposal@0.1.0",
        });
        const result = validateSkillOutput(oversized, "blue_patch_agent", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
    });
});
// ===========================================================================
// 9. base_revision_id mismatch
// ===========================================================================
describe("HARD-007 #9: Stale revision rejected", () => {
    it("applyPatch rejects when base_revision_id is stale", () => {
        const artifact = makeArtifact();
        const patch = {
            patch_id: "patch_stale",
            artifact_id: artifact.artifact_id,
            base_revision_id: "rev_old_and_stale",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_target",
                    expected_old_hash: artifact.sections[0].commitments[0].content_hash,
                    new_block: makeBlock({ text: "New text." }),
                },
            ],
        };
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toBe("BASE_REVISION_MISMATCH");
        }
    });
});
// ===========================================================================
// 10. L2 agent targeting canonical directly
// ===========================================================================
describe("HARD-007 #10: Direct canonical write rejected", () => {
    it("capability gate rejects L2 agent writing to canonical", () => {
        const result = capabilityGate("blue_patch_agent", "PatchProposal", "canonical" // forbidden target!
        );
        expect(result.passed).toBe(false);
        expect(result.errors[0]).toContain("forbidden");
        expect(result.errors[0]).toContain("canonical");
    });
    it("capability gate rejects L2 agent writing to commit", () => {
        const result = capabilityGate("blue_patch_agent", "PatchProposal", "commit" // forbidden target!
        );
        expect(result.passed).toBe(false);
        expect(result.errors[0]).toContain("forbidden");
        expect(result.errors[0]).toContain("commit");
    });
});
// ===========================================================================
// Meta: every test in this file is a negative test
// ===========================================================================
describe("HARD-007 META", () => {
    it("this file contains only rejection tests (by design)", () => {
        // This is a documentation-as-test.
        // HARD-007 first batch is "只看拒绝能力" — rejection only.
        // If you need to add acceptance tests, create a separate file.
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=llmRejection.test.js.map