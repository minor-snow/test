/**
 * Trial Artifact Verification
 *
 * ref: P3-001
 *
 * Confirms the frozen seed artifact meets Phase 3 acceptance criteria
 * before any LLM integration begins.
 */
import { describe, it, expect } from "vitest";
import { createTrialArtifact } from "../../src/trial/trialArtifact.js";
import { lintArtifact } from "../../src/linter.js";
import { computeRevisionId } from "../../src/hash.js";
describe("P3-001: Trial Artifact Seed", () => {
    const artifact = createTrialArtifact();
    // ── Structure ──
    it("has 6 sections", () => {
        expect(artifact.sections.length).toBe(6);
    });
    it("has 30-40 blocks total", () => {
        const totalBlocks = artifact.sections.reduce((sum, s) => sum + s.commitments.length, 0);
        expect(totalBlocks).toBeGreaterThanOrEqual(30);
        expect(totalBlocks).toBeLessThanOrEqual(40);
    });
    it("each section has 5-7 blocks", () => {
        for (const section of artifact.sections) {
            expect(section.commitments.length, `Section "${section.title}" has ${section.commitments.length} blocks`).toBeGreaterThanOrEqual(5);
            expect(section.commitments.length, `Section "${section.title}" has ${section.commitments.length} blocks`).toBeLessThanOrEqual(7);
        }
    });
    // ── Identity ──
    it("has correct artifact_type and schema_version", () => {
        expect(artifact.artifact_type).toBe("ArchitectureDraft");
        expect(artifact.schema_version).toBe("architecture_draft@0.1.0");
    });
    it("revision_id is content-addressed (deterministic)", () => {
        const recomputed = computeRevisionId(artifact);
        expect(artifact.revision_id).toBe(recomputed);
    });
    it("is idempotent (calling createTrialArtifact twice yields same revision_id)", () => {
        const a1 = createTrialArtifact();
        const a2 = createTrialArtifact();
        expect(a1.revision_id).toBe(a2.revision_id);
    });
    // ── Block quality ──
    it("most blocks have non-empty real text (not placeholders)", () => {
        const allBlocks = artifact.sections.flatMap((s) => s.commitments);
        const nonEmptyBlocks = allBlocks.filter((b) => b.text.trim().length > 0);
        // At least 85% of blocks should be real content
        const ratio = nonEmptyBlocks.length / allBlocks.length;
        expect(ratio).toBeGreaterThanOrEqual(0.85);
    });
    it("all block_ids are unique", () => {
        const allIds = artifact.sections.flatMap((s) => s.commitments.map((b) => b.block_id));
        expect(new Set(allIds).size).toBe(allIds.length);
    });
    it("all non-empty blocks have valid content_hash", () => {
        const allBlocks = artifact.sections.flatMap((s) => s.commitments);
        for (const block of allBlocks) {
            expect(block.content_hash).toBeTruthy();
            expect(block.content_hash).toMatch(/^sha256:/);
        }
    });
    // ── Linter coverage ──
    it("produces >= 10 linter issues", () => {
        const issues = lintArtifact(artifact);
        expect(issues.length).toBeGreaterThanOrEqual(10);
    });
    it("linter issues cover 3 distinct rule types", () => {
        const issues = lintArtifact(artifact);
        const ruleTypes = new Set(issues.map((i) => i.issue_type));
        expect(ruleTypes.has("unsafe_canonical_commit")).toBe(true);
        expect(ruleTypes.has("undefined_term")).toBe(true);
        expect(ruleTypes.has("empty_block_text")).toBe(true);
        expect(ruleTypes.size).toBeGreaterThanOrEqual(3);
    });
    it("has 3-4 unsafe_canonical_commit issues", () => {
        const issues = lintArtifact(artifact);
        const count = issues.filter((i) => i.issue_type === "unsafe_canonical_commit").length;
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(4);
    });
    it("has >= 3 undefined_term issues", () => {
        const issues = lintArtifact(artifact);
        const count = issues.filter((i) => i.issue_type === "undefined_term").length;
        expect(count).toBeGreaterThanOrEqual(3);
    });
    it("has 2 empty_block_text issues", () => {
        const issues = lintArtifact(artifact);
        const count = issues.filter((i) => i.issue_type === "empty_block_text").length;
        expect(count).toBe(2);
    });
    // ── Diagnostic: print issue summary ──
    it("prints issue breakdown (diagnostic)", () => {
        const issues = lintArtifact(artifact);
        const breakdown = {};
        for (const issue of issues) {
            breakdown[issue.issue_type] = (breakdown[issue.issue_type] || 0) + 1;
        }
        console.log(`\n  Trial artifact linter results:`);
        console.log(`    Total issues: ${issues.length}`);
        for (const [type, count] of Object.entries(breakdown)) {
            console.log(`    ${type}: ${count}`);
        }
    });
});
//# sourceMappingURL=trialArtifact.test.js.map