/**
 * ModuleSpec Seed — Tests
 *
 * ref: P7b-002
 */
import { describe, it, expect } from "vitest";
import { createModuleSpecSeed } from "../../src/trial/moduleSpecSeed.js";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
import { createInterfaceSpecSeed } from "../../src/trial/interfaceSpecSeed.js";
import { lintArtifact } from "../../src/linter.js";
import { crossLintArtifacts } from "../../src/crossArtifactLinter.js";
import { computeBlockContentHash } from "../../src/hash.js";
describe("P7b-002: ModuleSpec Seed", () => {
    it("produces a valid ModuleSpec artifact", () => {
        const seed = createModuleSpecSeed();
        expect(seed.artifact_id).toBe("pantheon_module");
        expect(seed.artifact_type).toBe("ModuleSpec");
        expect(seed.schema_version).toBe("module_spec@0.1.0");
        expect(seed.revision_id).toMatch(/^rev_/);
    });
    it("has 3 sections and 20 blocks", () => {
        const seed = createModuleSpecSeed();
        expect(seed.sections.length).toBe(3);
        const totalBlocks = seed.sections.reduce((sum, s) => sum + s.commitments.length, 0);
        expect(totalBlocks).toBe(20);
    });
    it("is deterministic", () => {
        const s1 = createModuleSpecSeed();
        const s2 = createModuleSpecSeed();
        expect(s1.revision_id).toBe(s2.revision_id);
        const ids1 = s1.sections.flatMap(s => s.commitments.map(b => b.block_id));
        const ids2 = s2.sections.flatMap(s => s.commitments.map(b => b.block_id));
        expect(ids1).toEqual(ids2);
    });
    it("has valid content hashes", () => {
        const seed = createModuleSpecSeed();
        for (const section of seed.sections) {
            for (const block of section.commitments) {
                expect(block.content_hash).toBe(computeBlockContentHash(block));
            }
        }
    });
    it("has blocks with linked_interface_blocks", () => {
        const seed = createModuleSpecSeed();
        const linked = seed.sections.flatMap(s => s.commitments.filter(b => b.linked_interface_blocks?.length));
        expect(linked.length).toBeGreaterThanOrEqual(8);
    });
    it("has blocks with linked_architecture_blocks", () => {
        const seed = createModuleSpecSeed();
        const linked = seed.sections.flatMap(s => s.commitments.filter(b => b.linked_architecture_blocks?.length));
        expect(linked.length).toBeGreaterThanOrEqual(4);
    });
    it("local linter finds expected issues", () => {
        const seed = createModuleSpecSeed();
        const issues = lintArtifact(seed);
        expect(issues.length).toBeGreaterThanOrEqual(3);
        const types = new Set(issues.map(i => i.issue_type));
        expect(types.has("undefined_term")).toBe(true);
    });
    it("prints issue breakdown (diagnostic)", () => {
        const arch = createTrialArtifact();
        const iface = createInterfaceSpecSeed();
        const mod = createModuleSpecSeed();
        const localIssues = lintArtifact(mod);
        const crossIssues = crossLintArtifacts([arch, iface, mod]);
        const modCross = crossIssues.filter(i => i.artifact_id === "pantheon_module");
        const byType = {};
        for (const i of [...localIssues, ...modCross]) {
            byType[i.issue_type] = (byType[i.issue_type] || 0) + 1;
        }
        console.log("\n  ModuleSpec seed issue breakdown:");
        console.log(`    Local issues: ${localIssues.length}`);
        console.log(`    Cross issues (ModuleSpec): ${modCross.length}`);
        console.log(`    Total cross issues (all): ${crossIssues.length}`);
        for (const [type, count] of Object.entries(byType)) {
            console.log(`    ${type}: ${count}`);
        }
    });
});
//# sourceMappingURL=moduleSpecSeed.test.js.map