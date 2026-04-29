/**
 * Artifact Store – Test Suite
 *
 * ref: 执行宪法 v0.2 §17 Day 3
 * ref: §18 criteria #1 (artifact creation), #3 (revision save/load)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createArtifact, saveRevision, loadRevision, loadCanonicalRevision, loadCanonicalPointer, updateCanonicalPointer, appendAuditLog, loadAuditLog, saveToQuarantine, loadFromQuarantine, promoteToEvidence, loadFromEvidence, saveProjection, } from "../src/artifactStore.js";
import { renderMarkdown } from "../src/renderMarkdown.js";
import { computeBlockContentHash } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Test setup: use a temp directory under the project workspace
// ---------------------------------------------------------------------------
const TEST_DATA_DIR = join(process.cwd(), "data", "_test_tmp");
let config;
beforeEach(async () => {
    config = { dataDir: TEST_DATA_DIR };
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
});
afterEach(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    const block = {
        block_id: "b_mem_001",
        type: "invariant",
        text: "All entries are committed instantly.",
        rationale: "Initial naive design.",
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
        revision_id: "rev_placeholder",
        sections: [
            {
                section_id: "sec_memory",
                title: "Memory Layer",
                commitments: [makeBlock()],
            },
        ],
        metadata: {
            created_by: "test_user",
            created_at: "2026-04-25T00:00:00Z",
        },
        ...overrides,
    };
}
// ===========================================================================
// createArtifact – ref: §18 #1
// ===========================================================================
describe("createArtifact", () => {
    it("§18-#1: a JSON Artifact can be created", async () => {
        const artifact = makeArtifact();
        const created = await createArtifact(config, artifact);
        expect(created.artifact_id).toBe("arch_001");
        expect(created.revision_id).toMatch(/^rev_[0-9a-f]{12}$/);
        expect(created.sections[0].commitments[0].content_hash).toMatch(/^sha256:/);
    });
    it("computes correct content_hash for all blocks", async () => {
        const artifact = makeArtifact();
        const created = await createArtifact(config, artifact);
        for (const section of created.sections) {
            for (const block of section.commitments) {
                const expected = computeBlockContentHash(block);
                expect(block.content_hash).toBe(expected);
            }
        }
    });
    it("sets canonical pointer after creation", async () => {
        const artifact = makeArtifact();
        const created = await createArtifact(config, artifact);
        const pointer = await loadCanonicalPointer(config, "arch_001");
        expect(pointer).not.toBeNull();
        expect(pointer.current_revision_id).toBe(created.revision_id);
    });
    it("creates audit entry", async () => {
        await createArtifact(config, makeArtifact());
        const log = await loadAuditLog(config, "arch_001");
        expect(log.length).toBe(1);
        expect(log[0].entry_type).toBe("artifact_created");
        expect(log[0].artifact_id).toBe("arch_001");
        expect(log[0].details).toHaveProperty("hash_meta");
    });
});
// ===========================================================================
// saveRevision / loadRevision – ref: §18 #3
// ===========================================================================
describe("saveRevision / loadRevision", () => {
    it("§18-#3: revision can be saved and loaded", async () => {
        const artifact = makeArtifact({ revision_id: "rev_test_001" });
        await saveRevision(config, artifact);
        const loaded = await loadRevision(config, "arch_001", "rev_test_001");
        expect(loaded).not.toBeNull();
        expect(loaded.artifact_id).toBe("arch_001");
        expect(loaded.revision_id).toBe("rev_test_001");
        expect(loaded.sections[0].commitments[0].text).toBe("All entries are committed instantly.");
    });
    it("returns null for non-existent revision", async () => {
        const result = await loadRevision(config, "arch_001", "rev_nonexistent");
        expect(result).toBeNull();
    });
    it("refuses to overwrite immutable revision (ref: C-05)", async () => {
        const artifact = makeArtifact({ revision_id: "rev_immutable" });
        await saveRevision(config, artifact);
        await expect(saveRevision(config, artifact)).rejects.toThrow("already exists and is immutable");
    });
    it("preserves all artifact fields through round-trip", async () => {
        const block = makeBlock({
            terms: ["quarantine", "canonical"],
            rationale: "Test rationale",
        });
        const artifact = makeArtifact({
            revision_id: "rev_roundtrip",
            parent_revision_id: "rev_parent",
            sections: [
                {
                    section_id: "sec_01",
                    title: "Test Section",
                    commitments: [block],
                },
            ],
            metadata: {
                created_by: "alice",
                tags: ["test", "roundtrip"],
            },
        });
        await saveRevision(config, artifact);
        const loaded = await loadRevision(config, "arch_001", "rev_roundtrip");
        expect(loaded).toEqual(artifact);
    });
});
// ===========================================================================
// Canonical pointer – ref: C-05
// ===========================================================================
describe("canonical pointer", () => {
    it("returns null when no pointer exists", async () => {
        const pointer = await loadCanonicalPointer(config, "nonexistent");
        expect(pointer).toBeNull();
    });
    it("can be updated to a new revision", async () => {
        const art1 = makeArtifact({ revision_id: "rev_001" });
        const art2 = makeArtifact({ revision_id: "rev_002" });
        await saveRevision(config, art1);
        await saveRevision(config, art2);
        await updateCanonicalPointer(config, "arch_001", "rev_001");
        let pointer = await loadCanonicalPointer(config, "arch_001");
        expect(pointer.current_revision_id).toBe("rev_001");
        await updateCanonicalPointer(config, "arch_001", "rev_002");
        pointer = await loadCanonicalPointer(config, "arch_001");
        expect(pointer.current_revision_id).toBe("rev_002");
    });
    it("rejects pointing to non-existent revision", async () => {
        await expect(updateCanonicalPointer(config, "arch_001", "rev_ghost")).rejects.toThrow("revision rev_ghost not found");
    });
});
// ===========================================================================
// loadCanonicalRevision
// ===========================================================================
describe("loadCanonicalRevision", () => {
    it("resolves pointer and loads revision", async () => {
        const created = await createArtifact(config, makeArtifact());
        const canonical = await loadCanonicalRevision(config, "arch_001");
        expect(canonical).not.toBeNull();
        expect(canonical.revision_id).toBe(created.revision_id);
    });
    it("returns null when no canonical exists", async () => {
        const result = await loadCanonicalRevision(config, "nonexistent");
        expect(result).toBeNull();
    });
});
// ===========================================================================
// Audit log – ref: §15.6
// ===========================================================================
describe("audit log", () => {
    it("append-only: entries accumulate", async () => {
        const entry1 = {
            entry_id: "a1",
            timestamp: "2026-04-25T00:00:00Z",
            entry_type: "artifact_created",
            artifact_id: "arch_001",
            revision_id: "rev_001",
            details: {},
        };
        const entry2 = {
            entry_id: "a2",
            timestamp: "2026-04-25T00:01:00Z",
            entry_type: "revision_saved",
            artifact_id: "arch_001",
            revision_id: "rev_002",
            details: {},
        };
        await appendAuditLog(config, entry1);
        await appendAuditLog(config, entry2);
        const log = await loadAuditLog(config, "arch_001");
        expect(log.length).toBe(2);
        expect(log[0].entry_id).toBe("a1");
        expect(log[1].entry_id).toBe("a2");
    });
    it("returns empty array for artifact with no audit log", async () => {
        const log = await loadAuditLog(config, "nonexistent");
        expect(log).toEqual([]);
    });
});
// ===========================================================================
// Quarantine / Evidence – ref: C-03, C-04
// ===========================================================================
describe("quarantine", () => {
    it("saves and loads quarantined items", async () => {
        const data = { issue_id: "issue_001", untrusted: true };
        await saveToQuarantine(config, "issue_001", data);
        const loaded = await loadFromQuarantine(config, "issue_001");
        expect(loaded).toEqual(data);
    });
    it("returns null for non-existent quarantine item", async () => {
        const result = await loadFromQuarantine(config, "nonexistent");
        expect(result).toBeNull();
    });
});
describe("evidence", () => {
    it("promotes validated item to evidence", async () => {
        const data = { issue_id: "issue_001", validated: true };
        await promoteToEvidence(config, "issue_001", data);
        const loaded = await loadFromEvidence(config, "issue_001");
        expect(loaded).toEqual(data);
    });
    it("returns null for non-existent evidence item", async () => {
        const result = await loadFromEvidence(config, "nonexistent");
        expect(result).toBeNull();
    });
});
// ===========================================================================
// renderMarkdown – ref: C-01
// ===========================================================================
describe("renderMarkdown", () => {
    it("produces Markdown containing artifact info", () => {
        const artifact = makeArtifact({ revision_id: "rev_test" });
        const md = renderMarkdown(artifact);
        expect(md).toContain("ArchitectureDraft");
        expect(md).toContain("arch_001");
        expect(md).toContain("rev_test");
        expect(md).toContain("Memory Layer");
        expect(md).toContain("b_mem_001");
        expect(md).toContain("All entries are committed instantly.");
        expect(md).toContain("read-only projection");
    });
    it("includes block type labels", () => {
        const artifact = makeArtifact();
        const md = renderMarkdown(artifact);
        expect(md).toContain("Invariant");
    });
    it("includes rationale as blockquote", () => {
        const artifact = makeArtifact();
        const md = renderMarkdown(artifact);
        expect(md).toContain("> **Rationale:**");
    });
    it("includes terms when present", () => {
        const block = makeBlock({ terms: ["quarantine", "canonical"] });
        const artifact = makeArtifact({
            sections: [
                {
                    section_id: "sec_01",
                    title: "Test",
                    commitments: [block],
                },
            ],
        });
        const md = renderMarkdown(artifact);
        expect(md).toContain("`quarantine`");
        expect(md).toContain("`canonical`");
    });
    it("includes parent revision when present", () => {
        const artifact = makeArtifact({
            revision_id: "rev_002",
            parent_revision_id: "rev_001",
        });
        const md = renderMarkdown(artifact);
        expect(md).toContain("rev_001");
    });
});
// ===========================================================================
// saveProjection
// ===========================================================================
describe("saveProjection", () => {
    it("saves Markdown projection to /projections/", async () => {
        const artifact = makeArtifact({ revision_id: "rev_proj" });
        const md = renderMarkdown(artifact);
        await saveProjection(config, "arch_001", md);
        const path = join(TEST_DATA_DIR, "projections", "arch_001.md");
        const content = await fs.readFile(path, "utf8");
        expect(content).toContain("ArchitectureDraft");
        expect(content).toContain("read-only projection");
    });
});
// ===========================================================================
// End-to-end: createArtifact → render → save projection
// ===========================================================================
describe("end-to-end artifact lifecycle", () => {
    it("create → load canonical → render → save projection", async () => {
        // Create
        const created = await createArtifact(config, makeArtifact());
        // Load canonical
        const canonical = await loadCanonicalRevision(config, "arch_001");
        expect(canonical).not.toBeNull();
        expect(canonical.revision_id).toBe(created.revision_id);
        // Render
        const md = renderMarkdown(canonical);
        expect(md).toContain("arch_001");
        // Save projection
        await saveProjection(config, "arch_001", md);
        // Verify audit
        const log = await loadAuditLog(config, "arch_001");
        expect(log.length).toBe(1);
        expect(log[0].entry_type).toBe("artifact_created");
    });
});
//# sourceMappingURL=artifactStore.test.js.map