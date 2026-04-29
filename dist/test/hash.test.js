/**
 * Stable Hash Core – Test Suite
 *
 * ref: 执行宪法 v0.2 §17 Day 1 测试要求
 *
 * Tests:
 *   1. 字段顺序不同，hash 相同
 *   2. 动态 metadata 不影响 content_hash
 *   3. text 改变，hash 改变
 *   4. schema_version 改变，revision_hash 改变
 *
 * ref: §18 成功标准 #2 – block content_hash 稳定
 */
import { describe, it, expect } from "vitest";
import { stableSerialize, SERIALIZATION_VERSION } from "../src/stableSerialize.js";
import { computeHash, computeBlockContentHash, computeArtifactHash, computeRevisionId, extractContentHashInput, extractRevisionHashInput, getHashMeta, } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    return {
        block_id: "b_test_001",
        type: "invariant",
        text: "All entries must pass quarantine before canonical commit.",
        rationale: "Prevents untrusted output from corrupting canonical memory.",
        terms: ["quarantine", "canonical"],
        status: "draft",
        content_hash: "", // will be computed
        ...overrides,
    };
}
function makeArtifact(overrides = {}) {
    const block = makeBlock();
    block.content_hash = computeBlockContentHash(block);
    return {
        artifact_id: "arch_001",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_001",
        parent_revision_id: undefined,
        sections: [
            {
                section_id: "sec_memory",
                title: "Memory Layer",
                commitments: [block],
            },
        ],
        metadata: {
            created_by: "test_user",
            created_at: "2026-04-25T00:00:00Z",
            tags: ["test"],
        },
        ...overrides,
    };
}
// ===========================================================================
// stableSerialize
// ===========================================================================
describe("stableSerialize", () => {
    it("produces identical output regardless of key order", () => {
        // This is the core guarantee – ref: H-01
        const a = { z: 1, a: 2, m: 3 };
        const b = { a: 2, m: 3, z: 1 };
        expect(stableSerialize(a)).toBe(stableSerialize(b));
    });
    it("handles nested objects with different key orders", () => {
        const a = { outer: { z: 1, a: 2 }, x: true };
        const b = { x: true, outer: { a: 2, z: 1 } };
        expect(stableSerialize(a)).toBe(stableSerialize(b));
    });
    it("handles arrays (order preserved)", () => {
        const a = { items: [1, 2, 3] };
        const b = { items: [1, 2, 3] };
        expect(stableSerialize(a)).toBe(stableSerialize(b));
        const c = { items: [3, 2, 1] };
        expect(stableSerialize(a)).not.toBe(stableSerialize(c));
    });
    it("omits undefined values", () => {
        const a = { x: 1, y: undefined };
        const b = { x: 1 };
        expect(stableSerialize(a)).toBe(stableSerialize(b));
    });
    it("exports SERIALIZATION_VERSION as stable_json_v1", () => {
        expect(SERIALIZATION_VERSION).toBe("stable_json_v1");
    });
});
// ===========================================================================
// computeHash
// ===========================================================================
describe("computeHash", () => {
    it("returns sha256-prefixed hex digest", () => {
        const result = computeHash("hello");
        expect(result).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
    it("is deterministic", () => {
        expect(computeHash("test")).toBe(computeHash("test"));
    });
    it("changes with different input", () => {
        expect(computeHash("a")).not.toBe(computeHash("b"));
    });
});
// ===========================================================================
// computeBlockContentHash – ref: H-02
// ===========================================================================
describe("computeBlockContentHash", () => {
    it("Day1-Test-1: 字段顺序不同, hash 相同", () => {
        // Even if the internal block object had keys in different order,
        // extractContentHashInput always selects the same fields
        // and stableSerialize sorts keys.
        const block = makeBlock();
        const hash1 = computeBlockContentHash(block);
        // Create a block with identical semantic content but different property
        // insertion order (simulate by creating a new object manually)
        const block2 = {
            content_hash: "",
            status: "draft",
            terms: ["quarantine", "canonical"],
            rationale: "Prevents untrusted output from corrupting canonical memory.",
            text: "All entries must pass quarantine before canonical commit.",
            type: "invariant",
            block_id: "b_test_001",
        };
        const hash2 = computeBlockContentHash(block2);
        expect(hash1).toBe(hash2);
    });
    it("Day1-Test-2: 动态 metadata 不影响 content_hash", () => {
        const block1 = makeBlock({ status: "draft" });
        const block2 = makeBlock({ status: "approved" });
        // status is NOT a semantic field, so hash should be identical
        expect(computeBlockContentHash(block1)).toBe(computeBlockContentHash(block2));
        // block_id is also NOT a semantic field
        const block3 = makeBlock({ block_id: "b_different_id" });
        expect(computeBlockContentHash(block1)).toBe(computeBlockContentHash(block3));
    });
    it("Day1-Test-3: text 改变, hash 改变", () => {
        const block1 = makeBlock({ text: "Version A" });
        const block2 = makeBlock({ text: "Version B" });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
    it("rationale change causes hash change", () => {
        const block1 = makeBlock({ rationale: "Reason A" });
        const block2 = makeBlock({ rationale: "Reason B" });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
    it("type change causes hash change", () => {
        const block1 = makeBlock({ type: "invariant" });
        const block2 = makeBlock({ type: "mechanism" });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
    it("terms change causes hash change", () => {
        const block1 = makeBlock({ terms: ["a", "b"] });
        const block2 = makeBlock({ terms: ["a", "c"] });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
    it("absent rationale vs present rationale yields different hash", () => {
        const block1 = makeBlock({ rationale: undefined });
        const block2 = makeBlock({ rationale: "Some rationale" });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
    it("absent terms vs present terms yields different hash", () => {
        const block1 = makeBlock({ terms: undefined });
        const block2 = makeBlock({ terms: [] });
        expect(computeBlockContentHash(block1)).not.toBe(computeBlockContentHash(block2));
    });
});
// ===========================================================================
// extractContentHashInput – ref: H-02
// ===========================================================================
describe("extractContentHashInput", () => {
    it("includes only type, text, rationale, terms", () => {
        const block = makeBlock();
        const input = extractContentHashInput(block);
        const keys = Object.keys(input);
        expect(keys).toContain("type");
        expect(keys).toContain("text");
        expect(keys).toContain("rationale");
        expect(keys).toContain("terms");
        // Must NOT include non-semantic fields
        expect(keys).not.toContain("block_id");
        expect(keys).not.toContain("status");
        expect(keys).not.toContain("content_hash");
    });
    it("excludes rationale and terms when undefined", () => {
        const block = makeBlock({ rationale: undefined, terms: undefined });
        const input = extractContentHashInput(block);
        expect("rationale" in input).toBe(false);
        expect("terms" in input).toBe(false);
    });
});
// ===========================================================================
// computeArtifactHash – ref: H-03
// ===========================================================================
describe("computeArtifactHash", () => {
    it("Day1-Test-4: schema_version 改变, revision_hash 改变", () => {
        const art1 = makeArtifact({ schema_version: "architecture_draft@0.1.0" });
        const art2 = makeArtifact({ schema_version: "architecture_draft@0.2.0" });
        expect(computeArtifactHash(art1)).not.toBe(computeArtifactHash(art2));
    });
    it("is deterministic for identical artifacts", () => {
        const art1 = makeArtifact();
        const art2 = makeArtifact();
        expect(computeArtifactHash(art1)).toBe(computeArtifactHash(art2));
    });
    it("ArtifactMetadata does NOT affect revision hash (ref: §4.1.1)", () => {
        const art1 = makeArtifact({
            metadata: { created_by: "alice", created_at: "2020-01-01T00:00:00Z" },
        });
        const art2 = makeArtifact({
            metadata: { created_by: "bob", created_at: "2099-12-31T23:59:59Z", tags: ["x"] },
        });
        expect(computeArtifactHash(art1)).toBe(computeArtifactHash(art2));
    });
    it("artifact_id change causes hash change", () => {
        const art1 = makeArtifact({ artifact_id: "arch_001" });
        const art2 = makeArtifact({ artifact_id: "arch_002" });
        expect(computeArtifactHash(art1)).not.toBe(computeArtifactHash(art2));
    });
    it("parent_revision_id change causes hash change", () => {
        const art1 = makeArtifact({ parent_revision_id: undefined });
        const art2 = makeArtifact({ parent_revision_id: "rev_000" });
        expect(computeArtifactHash(art1)).not.toBe(computeArtifactHash(art2));
    });
    it("block content change causes revision hash change", () => {
        const art1 = makeArtifact();
        // Create art2 with a different block text, which means a different content_hash
        const modifiedBlock = makeBlock({ text: "Modified text" });
        modifiedBlock.content_hash = computeBlockContentHash(modifiedBlock);
        const art2 = makeArtifact({
            sections: [
                {
                    section_id: "sec_memory",
                    title: "Memory Layer",
                    commitments: [modifiedBlock],
                },
            ],
        });
        expect(computeArtifactHash(art1)).not.toBe(computeArtifactHash(art2));
    });
});
// ===========================================================================
// extractRevisionHashInput – ref: H-03
// ===========================================================================
describe("extractRevisionHashInput", () => {
    it("excludes metadata from revision hash input", () => {
        const art = makeArtifact();
        const input = extractRevisionHashInput(art);
        expect("metadata" in input).toBe(false);
        expect("revision_id" in input).toBe(false);
    });
    it("includes structural fields", () => {
        const art = makeArtifact();
        const input = extractRevisionHashInput(art);
        expect(input).toHaveProperty("artifact_id");
        expect(input).toHaveProperty("artifact_type");
        expect(input).toHaveProperty("schema_version");
        expect(input).toHaveProperty("parent_revision_id");
        expect(input).toHaveProperty("sections");
    });
    it("blocks are represented only by block_id + content_hash", () => {
        const art = makeArtifact();
        const input = extractRevisionHashInput(art);
        const block = input.sections[0].commitments[0];
        expect(Object.keys(block).sort()).toEqual(["block_id", "content_hash"]);
    });
});
// ===========================================================================
// computeRevisionId
// ===========================================================================
describe("computeRevisionId", () => {
    it("returns rev_ prefixed string with 12 hex chars", () => {
        const art = makeArtifact();
        const revId = computeRevisionId(art);
        expect(revId).toMatch(/^rev_[0-9a-f]{12}$/);
    });
    it("is deterministic", () => {
        const art1 = makeArtifact();
        const art2 = makeArtifact();
        expect(computeRevisionId(art1)).toBe(computeRevisionId(art2));
    });
    it("changes when artifact content changes", () => {
        const art1 = makeArtifact();
        const modifiedBlock = makeBlock({ text: "Different content" });
        modifiedBlock.content_hash = computeBlockContentHash(modifiedBlock);
        const art2 = makeArtifact({
            sections: [
                {
                    section_id: "sec_memory",
                    title: "Memory Layer",
                    commitments: [modifiedBlock],
                },
            ],
        });
        expect(computeRevisionId(art1)).not.toBe(computeRevisionId(art2));
    });
});
// ===========================================================================
// getHashMeta – ref: H-04
// ===========================================================================
describe("getHashMeta", () => {
    it("returns correct algorithm and serialization version", () => {
        const meta = getHashMeta();
        expect(meta.hash_algorithm).toBe("sha256");
        expect(meta.serialization_version).toBe("stable_json_v1");
    });
});
//# sourceMappingURL=hash.test.js.map