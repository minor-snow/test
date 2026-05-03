/**
 * Section 21 Fixture
 *
 * ref: HARD-005, 执行宪法 v0.2 §21
 *
 * This is the canonical §21 closed-loop demo artifact.
 * It defines both the input artifact and the expected patch text
 * that triggers the semantic regression → override flow.
 *
 * STATUS: This is a demo fixture, not a production artifact factory.
 */
import { computeBlockContentHash } from "../hash.js";
/**
 * The replacement text that the demo Patch Agent produces.
 *
 * This intentionally contains an undefined technical term
 * (`quarantine_gate`) which triggers the semantic regression
 * gate, forcing the pipeline to halt at `regression_failed`.
 */
export const SECTION21_PATCH_TEXT = "Entries must pass a quarantine_gate before canonical commit.";
/**
 * Create the §21 demo artifact.
 *
 * This artifact has a single block with the naive claim
 * "All entries are committed instantly." which the linter
 * will flag as `unsafe_canonical_commit`.
 */
export function makeSection21Artifact() {
    const block = {
        block_id: "b_mem_001",
        type: "invariant",
        text: "All entries are committed instantly.",
        rationale: "Initial naive design.",
        terms: [],
        status: "draft",
        content_hash: "",
    };
    block.content_hash = computeBlockContentHash(block);
    return {
        artifact_id: "arch_001",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_placeholder",
        sections: [
            {
                section_id: "sec_memory",
                title: "Memory Layer",
                commitments: [block],
            },
        ],
        metadata: {
            created_by: "human_architect",
            created_at: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=section21Fixture.js.map