/**
 * Cross-Artifact Linter — Tests
 *
 * ref: P7a-002
 */
import { describe, it, expect } from "vitest";
import { crossLintArtifacts, buildCrossBlockIndex } from "../src/crossArtifactLinter.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(id, text, type = "invariant", links) {
    const b = {
        block_id: id,
        type,
        text,
        terms: [],
        linked_architecture_blocks: links,
        status: "draft",
        content_hash: "",
    };
    b.content_hash = computeBlockContentHash(b);
    return b;
}
function makeSection(id, blocks) {
    return { section_id: id, title: id, commitments: blocks };
}
function makeArtifact(id, type, schemaVersion, sections) {
    const a = {
        artifact_id: id,
        artifact_type: type,
        schema_version: schemaVersion,
        revision_id: "rev_placeholder",
        sections,
        metadata: {},
    };
    a.revision_id = computeRevisionId(a);
    return a;
}
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function createArchDraft() {
    return makeArtifact("arch_001", "ArchitectureDraft", "architecture_draft@0.1.0", [
        makeSection("sec_core", [
            makeBlock("b_arch_001", "Core pipeline invariant."),
            makeBlock("b_arch_002", "Canonical pointer is immutable per revision."),
            makeBlock("b_arch_003", "All revisions are content-addressed."),
        ]),
    ]);
}
function createInterfaceSpec(opts) {
    const orphanCount = opts?.orphanCount ?? 0;
    const staleLinks = opts?.staleLinks ?? [];
    const blocks = [
        // Valid linked blocks
        makeBlock("b_iface_001", "GET /api/revisions returns revision list.", "interface", ["b_arch_001"]),
        makeBlock("b_iface_002", "POST /api/patch applies a patch proposal.", "interface", ["b_arch_002"]),
        // Non-interface block (no links required)
        makeBlock("b_iface_003", "Error codes follow RFC 7807.", "constraint"),
    ];
    // Add orphan interface blocks (type=interface, no links)
    for (let i = 0; i < orphanCount; i++) {
        blocks.push(makeBlock(`b_iface_orphan_${i + 1}`, `Orphan endpoint ${i + 1}.`, "interface"));
    }
    // Add blocks with stale links
    for (let i = 0; i < staleLinks.length; i++) {
        blocks.push(makeBlock(`b_iface_stale_${i + 1}`, `Endpoint referencing stale block.`, "interface", [staleLinks[i]]));
    }
    return makeArtifact("iface_001", "InterfaceSpec", "interface_spec@0.1.0", [
        makeSection("sec_api", blocks),
    ]);
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("P7a-002: buildCrossBlockIndex", () => {
    it("indexes blocks across multiple artifacts", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec();
        const index = buildCrossBlockIndex([arch, iface]);
        expect(index.size).toBe(arch.sections[0].commitments.length + iface.sections[0].commitments.length);
        expect(index.get("b_arch_001")?.artifact_id).toBe("arch_001");
        expect(index.get("b_iface_001")?.artifact_id).toBe("iface_001");
    });
});
describe("P7a-002: orphan_interface_contract", () => {
    it("detects orphan interface blocks with no links", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec({ orphanCount: 2 });
        const issues = crossLintArtifacts([arch, iface]);
        const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
        expect(orphans.length).toBe(2);
        expect(orphans[0].artifact_id).toBe("iface_001");
        expect(orphans[0].target_block_id).toBe("b_iface_orphan_1");
        expect(orphans[0].severity).toBe("medium");
    });
    it("does not flag non-interface blocks without links", () => {
        const arch = createArchDraft();
        // iface_003 is type=constraint, no links — should not be flagged
        const iface = createInterfaceSpec();
        const issues = crossLintArtifacts([arch, iface]);
        const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
        expect(orphans.length).toBe(0);
    });
    it("does not flag interface blocks with valid links", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec(); // b_iface_001 and b_iface_002 have valid links
        const issues = crossLintArtifacts([arch, iface]);
        const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
        expect(orphans.length).toBe(0);
    });
    it("ignores ArchitectureDraft blocks (only checks InterfaceSpec)", () => {
        // ArchitectureDraft blocks never need linked_architecture_blocks
        const arch = createArchDraft();
        const issues = crossLintArtifacts([arch]);
        const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
        expect(orphans.length).toBe(0);
    });
});
describe("P7a-002: stale_link", () => {
    it("detects stale links to non-existent architecture blocks", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec({ staleLinks: ["b_nonexistent_999"] });
        const issues = crossLintArtifacts([arch, iface]);
        const stale = issues.filter(i => i.issue_type === "stale_link");
        expect(stale.length).toBe(1);
        expect(stale[0].artifact_id).toBe("iface_001");
        expect(stale[0].target_block_id).toBe("b_iface_stale_1");
        expect(stale[0].severity).toBe("high");
        expect(stale[0].message).toContain("b_nonexistent_999");
    });
    it("does not flag valid links", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec(); // b_iface_001 links to b_arch_001 (valid)
        const issues = crossLintArtifacts([arch, iface]);
        const stale = issues.filter(i => i.issue_type === "stale_link");
        expect(stale.length).toBe(0);
    });
    it("detects multiple stale links on different blocks", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec({
            staleLinks: ["b_ghost_1", "b_ghost_2", "b_ghost_3"],
        });
        const issues = crossLintArtifacts([arch, iface]);
        const stale = issues.filter(i => i.issue_type === "stale_link");
        expect(stale.length).toBe(3);
    });
    it("does not flag blocks without linked_architecture_blocks", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec();
        const issues = crossLintArtifacts([arch, iface]);
        const stale = issues.filter(i => i.issue_type === "stale_link");
        expect(stale.length).toBe(0);
    });
});
describe("P7a-002: combined rules", () => {
    it("finds both orphans and stale links in same artifact set", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec({
            orphanCount: 1,
            staleLinks: ["b_phantom"],
        });
        const issues = crossLintArtifacts([arch, iface]);
        const orphans = issues.filter(i => i.issue_type === "orphan_interface_contract");
        const stale = issues.filter(i => i.issue_type === "stale_link");
        expect(orphans.length).toBe(1);
        expect(stale.length).toBe(1);
        expect(issues.length).toBe(2);
    });
    it("returns empty for clean artifact set", () => {
        const arch = createArchDraft();
        const iface = createInterfaceSpec();
        const issues = crossLintArtifacts([arch, iface]);
        expect(issues.length).toBe(0);
    });
    it("returns empty for single ArchitectureDraft (no InterfaceSpec)", () => {
        const arch = createArchDraft();
        const issues = crossLintArtifacts([arch]);
        expect(issues.length).toBe(0);
    });
});
//# sourceMappingURL=crossArtifactLinter.test.js.map