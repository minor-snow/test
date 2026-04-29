/**
 * Draft Agent — Tests
 *
 * ref: P8-002, P9-003
 */
import { describe, it, expect } from "vitest";
import { buildDraftPrompt, buildDraftPromptV2 } from "../../src/trial/draftAgent.js";
// ---------------------------------------------------------------------------
// Test profile
// ---------------------------------------------------------------------------
function testProfile() {
    return {
        profile_id: "test",
        artifact_type: "ArchitectureDraft",
        domain_name: "Test Domain",
        allowed_concepts: ["database", "API"],
        required_concepts: [
            { concept: "source of truth", aliases: ["canonical"], required: true },
            { concept: "failure mode", aliases: ["error handling"], required: true },
        ],
        forbidden_generic_phrases: [
            "enhance user experience",
            "leverage cutting-edge technology",
        ],
        required_sections: [
            { title: "Core Principles", aliases: ["Core Architecture"] },
            { title: "Failure Modes", aliases: ["Error Handling"] },
        ],
        preferred_block_types: ["invariant", "mechanism", "constraint"],
        quality_rubric: {
            min_sections: 5,
            min_blocks: 30,
            max_blocks: 50,
            min_required_concept_coverage: 0.8,
        },
    };
}
// ---------------------------------------------------------------------------
// v1 tests (unchanged)
// ---------------------------------------------------------------------------
describe("P8-002: Draft Agent v1", () => {
    it("includes the idea in the prompt", () => {
        const prompt = buildDraftPrompt("A content moderation pipeline with ML classification");
        expect(prompt).toContain("A content moderation pipeline with ML classification");
    });
    it("specifies ArchitectureDraft as default type", () => {
        const prompt = buildDraftPrompt("Test idea");
        expect(prompt).toContain("ArchitectureDraft");
        expect(prompt).toContain('"artifact_type": "ArchitectureDraft"');
    });
    it("supports custom artifact type", () => {
        const prompt = buildDraftPrompt("Test idea", "InterfaceSpec");
        expect(prompt).toContain("InterfaceSpec");
    });
    it("instructs LLM to NOT generate host fields", () => {
        const prompt = buildDraftPrompt("Test idea");
        expect(prompt).toContain("Do NOT generate revision_id, content_hash");
        expect(prompt).toContain("Do NOT generate linked_architecture_blocks");
    });
    it("specifies valid block types", () => {
        const prompt = buildDraftPrompt("Test idea");
        expect(prompt).toContain("invariant");
        expect(prompt).toContain("mechanism");
        expect(prompt).toContain("constraint");
        expect(prompt).toContain("decision");
        expect(prompt).toContain("risk");
        expect(prompt).toContain("open_question");
    });
    it("requires JSON-only output", () => {
        const prompt = buildDraftPrompt("Test idea");
        expect(prompt).toContain("Output ONLY valid JSON");
        expect(prompt).toContain("No markdown");
    });
    it("specifies block count target", () => {
        const prompt = buildDraftPrompt("Test idea");
        expect(prompt).toContain("25-40 total blocks");
    });
});
// ---------------------------------------------------------------------------
// v2 tests (P9)
// ---------------------------------------------------------------------------
describe("P9-003: Draft Agent v2 (with profile)", () => {
    it("includes the idea in the prompt", () => {
        const prompt = buildDraftPromptV2("Build a data pipeline", testProfile());
        expect(prompt).toContain("Build a data pipeline");
    });
    it("includes domain name", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("Test Domain");
    });
    it("includes required sections", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("Core Principles");
        expect(prompt).toContain("Failure Modes");
        expect(prompt).toContain("MUST include sections");
    });
    it("includes required concepts", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("source of truth");
        expect(prompt).toContain("failure mode");
        expect(prompt).toContain("MUST address each of these concepts");
    });
    it("includes forbidden phrases", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("enhance user experience");
        expect(prompt).toContain("leverage cutting-edge technology");
        expect(prompt).toContain("Forbidden Phrases");
    });
    it("includes good and bad block examples", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("Good Block Example");
        expect(prompt).toContain("Bad Block Example");
        expect(prompt).toContain("reliable and scalable");
    });
    it("requires terms[] and rationale", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("block.terms[] MUST");
        expect(prompt).toContain("block.rationale SHOULD");
    });
    it("uses profile block count range", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain("30-50 total blocks");
    });
    it("uses profile artifact_type", () => {
        const prompt = buildDraftPromptV2("Test idea", testProfile());
        expect(prompt).toContain('"artifact_type": "ArchitectureDraft"');
    });
});
// ---------------------------------------------------------------------------
// P10-001: Migration prompt tests
// ---------------------------------------------------------------------------
import { buildMigrationPrompt } from "../../src/trial/draftAgent.js";
function existingArchitecture() {
    return {
        artifact_id: "pet_triage_architecture",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_test",
        sections: [
            {
                section_id: "sec_network",
                title: "Network Authority",
                commitments: [
                    {
                        block_id: "b_pet_arch_002",
                        type: "constraint",
                        text: "All client triage decisions must request the backend in real time.",
                        terms: ["online_first", "strong_sync"],
                        status: "approved",
                        content_hash: "sha256:test",
                    },
                    {
                        block_id: "b_pet_arch_004",
                        type: "constraint",
                        text: "When network is unavailable, lock triage screen.",
                        terms: ["network_lock"],
                        status: "approved",
                        content_hash: "sha256:test2",
                    },
                ],
            },
        ],
        metadata: { created_by: "test" },
    };
}
function supersededConstraints() {
    return [
        {
            block_id: "b_pet_arch_002",
            text: "All client triage decisions must request the backend in real time.",
            reason: "Offline-first requires local execution.",
            replacement_intent: "Client executes triage tree locally.",
        },
        {
            block_id: "b_pet_arch_004",
            text: "When network is unavailable, lock triage screen.",
            reason: "Offline triage must complete without network.",
            replacement_intent: "Triage completes offline; pending reports stored.",
        },
    ];
}
function migrationProfile() {
    return {
        profile_id: "pet_triage_offline",
        artifact_type: "ArchitectureDraft",
        domain_name: "Pet Triage Offline-First",
        allowed_concepts: ["offline-first", "sync queue", "vector clock"],
        required_concepts: [
            { concept: "offline-first", aliases: ["offline mode"], required: true },
            { concept: "sync queue", aliases: ["upload queue"], required: true },
            { concept: "conflict resolution", aliases: ["reconciliation"], required: true },
        ],
        forbidden_generic_phrases: ["enhance user experience", "leverage AI"],
        required_sections: [
            { title: "Offline Client Decision Engine", aliases: ["Offline Triage Engine"] },
            { title: "Sync Queue", aliases: ["Synchronization Queue"] },
            { title: "Conflict Resolution", aliases: ["Merge Policy"] },
        ],
        preferred_block_types: ["invariant", "mechanism", "constraint"],
        quality_rubric: { min_sections: 3, min_blocks: 10, max_blocks: 40, min_required_concept_coverage: 0.8 },
    };
}
describe("P10-001: Migration Prompt", () => {
    it("includes existing architecture artifact_id", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate to offline-first",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("pet_triage_architecture");
    });
    it("includes existing architecture sections", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("Network Authority");
        expect(prompt).toContain("b_pet_arch_002");
    });
    it("includes superseded constraint block IDs", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("b_pet_arch_002");
        expect(prompt).toContain("b_pet_arch_004");
    });
    it("includes superseded constraint reasons", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("Offline-first requires local execution");
        expect(prompt).toContain("Offline triage must complete without network");
    });
    it("includes replacement intents", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("Client executes triage tree locally");
        expect(prompt).toContain("pending reports stored");
    });
    it("includes required sections from profile", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("Offline Client Decision Engine");
        expect(prompt).toContain("Conflict Resolution");
    });
    it("includes required concepts from profile", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain('"offline-first"');
        expect(prompt).toContain('"sync queue"');
        expect(prompt).toContain('"conflict resolution"');
    });
    it("includes forbidden phrases", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("enhance user experience");
        expect(prompt).toContain("leverage AI");
    });
    it("tells LLM to address superseded constraints explicitly", () => {
        const prompt = buildMigrationPrompt({
            idea: "migrate",
            existingArchitecture: existingArchitecture(),
            supersededConstraints: supersededConstraints(),
            profile: migrationProfile(),
        });
        expect(prompt).toContain("EXPLICITLY OVERRIDDEN");
        expect(prompt).toContain("Do NOT silently drop old constraints");
    });
});
//# sourceMappingURL=draftAgent.test.js.map