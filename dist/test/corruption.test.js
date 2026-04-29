/**
 * Corruption Suite
 *
 * ref: HARD-003
 *
 * Tests that the system SAFELY FAILS when data is corrupted.
 * The acceptance criterion is NOT "auto-repair" but
 * "明确报错，不假装 clean" (explicit error, never pretend clean).
 *
 * Each test corrupts data in a specific way, then verifies the system
 * either rejects the operation or reports the corruption.
 *
 * Categories:
 *   A. integrityCheck detections (HARD-002)
 *   B. applyPatch / applyOverridePatch rejections (HARD-001)
 *   C. validator pipeline rejections
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { integrityCheck } from "../src/integrityCheck.js";
import { createArtifact, saveRevision, updateCanonicalPointer, } from "../src/artifactStore.js";
import { applyOverridePatch } from "../src/applyOverridePatch.js";
import { validateSkillOutput } from "../src/validators.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const TEST_DIR = join(process.cwd(), "data", "_test_corruption_tmp");
let config;
beforeEach(async () => {
    config = { dataDir: TEST_DIR };
    await fs.mkdir(TEST_DIR, { recursive: true });
});
afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
});
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides = {}) {
    const block = {
        block_id: "b_001",
        type: "invariant",
        text: "All entries pass quarantine.",
        terms: [],
        status: "draft",
        content_hash: "",
        ...overrides,
    };
    block.content_hash = computeBlockContentHash(block);
    return block;
}
async function createClean() {
    return createArtifact(config, {
        artifact_id: "test_art",
        artifact_type: "ArchitectureDraft",
        schema_version: "architecture_draft@0.1.0",
        revision_id: "rev_placeholder",
        sections: [
            {
                section_id: "sec_01",
                title: "Core",
                commitments: [makeBlock()],
            },
        ],
        metadata: { created_by: "test" },
    });
}
function revPath(revId) {
    return join(TEST_DIR, "revisions", "test_art", `${revId}.json`);
}
// ===========================================================================
// A. integrityCheck detections
// ===========================================================================
describe("CORRUPTION A1: tamper block.text, keep stale content_hash", () => {
    it("integrityCheck reports block_content_hash_mismatch", async () => {
        const artifact = await createClean();
        const path = revPath(artifact.revision_id);
        const data = JSON.parse(await fs.readFile(path, "utf8"));
        data.sections[0].commitments[0].text = "TAMPERED without hash update";
        await fs.writeFile(path, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "block_content_hash_mismatch");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
    });
});
describe("CORRUPTION A2: hand-edit revision_id inside file", () => {
    it("integrityCheck reports revision_id_filename_mismatch", async () => {
        const artifact = await createClean();
        const path = revPath(artifact.revision_id);
        const data = JSON.parse(await fs.readFile(path, "utf8"));
        data.revision_id = "rev_hand_edited";
        await fs.writeFile(path, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "revision_id_filename_mismatch");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
    });
});
describe("CORRUPTION A3: delete canonical-pointed revision", () => {
    it("integrityCheck reports canonical_target_missing", async () => {
        const artifact = await createClean();
        await fs.unlink(revPath(artifact.revision_id));
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "canonical_target_missing");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
    });
});
describe("CORRUPTION A4: delete parent revision", () => {
    it("integrityCheck reports parent_chain_broken", async () => {
        const parent = await createClean();
        // Create child
        const child = {
            ...parent,
            parent_revision_id: parent.revision_id,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Child." })],
                },
            ],
        };
        child.revision_id = computeRevisionId(child);
        await saveRevision(config, child);
        await updateCanonicalPointer(config, "test_art", child.revision_id);
        // Delete parent
        await fs.unlink(revPath(parent.revision_id));
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "parent_chain_broken");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
        expect(hits[0].message).toContain(parent.revision_id);
    });
});
describe("CORRUPTION A5: orphan revision", () => {
    it("integrityCheck reports orphan_revision", async () => {
        const artifact = await createClean();
        // Create orphan (no parent link, not canonical)
        const orphan = {
            ...artifact,
            parent_revision_id: undefined,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "I am orphan." })],
                },
            ],
        };
        orphan.revision_id = computeRevisionId(orphan);
        await fs.writeFile(revPath(orphan.revision_id), JSON.stringify(orphan, null, 2), "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "orphan_revision");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("warning");
    });
});
describe("CORRUPTION A6: .tmp leftover", () => {
    it("integrityCheck reports tmp_leftover", async () => {
        await createClean();
        const tmpPath = join(TEST_DIR, "revisions", "test_art", "rev_partial.json.tmp");
        await fs.writeFile(tmpPath, '{"interrupted": true}', "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "tmp_leftover");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("warning");
    });
});
describe("CORRUPTION A7: unknown schema_version on canonical path", () => {
    it("integrityCheck reports schema_version_unknown", async () => {
        const artifact = await createClean();
        const path = revPath(artifact.revision_id);
        const data = JSON.parse(await fs.readFile(path, "utf8"));
        data.schema_version = "alien_type@42.0.0";
        await fs.writeFile(path, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "schema_version_unknown");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
        expect(hits[0].message).toContain("alien_type@42.0.0");
    });
});
describe("CORRUPTION A11: audit missing critical events", () => {
    it("integrityCheck reports audit_missing_created", async () => {
        await createClean();
        // Overwrite audit log, remove artifact_created
        const auditPath = join(TEST_DIR, "audit", "test_art.jsonl");
        const fakeEntry = JSON.stringify({
            entry_id: "audit_fake",
            timestamp: new Date().toISOString(),
            entry_type: "override_applied",
            artifact_id: "test_art",
            details: {},
        });
        await fs.writeFile(auditPath, fakeEntry + "\n", "utf8");
        const report = await integrityCheck(config);
        const hits = report.findings.filter((f) => f.check === "audit_missing_created");
        expect(hits.length).toBe(1);
        expect(hits[0].severity).toBe("corrupt");
    });
});
// ===========================================================================
// B. applyPatch / applyOverridePatch rejections
// ===========================================================================
describe("CORRUPTION B8: forge unauthorized skill output", () => {
    it("validator rejects L1 skill trying to produce PatchProposal", () => {
        const fakeProposal = JSON.stringify({
            proposal_id: "forged_001",
            artifact_id: "test_art",
            base_revision_id: "rev_001",
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_001",
                    replacement_text: "Injected text.",
                },
            ],
            schema_version: "patch_proposal@0.1.0",
        });
        // L1 linter tries to produce a PatchProposal — forbidden
        const result = validateSkillOutput(fakeProposal, "document_linter", "PatchProposal", "quarantine", null);
        expect(result.status).toBe("rejected");
        expect(result.errors.some((e) => e.includes("not allowed"))).toBe(true);
    });
    it("validator rejects L1 skill impersonating L2 agent", () => {
        const fakeIssue = JSON.stringify({
            issue_id: "issue_forged",
            artifact_id: "test_art",
            base_revision_id: "rev_001",
            target_block_id: "b_001",
            issue_type: "injected",
            severity: "high",
            message: "Forged issue from unknown skill.",
            schema_version: "issue@0.1.0",
        });
        // Unknown skill name — capability gate should reject
        const result = validateSkillOutput(fakeIssue, "fake_agent_pretending_to_be_linter", "Issue", "quarantine", null);
        expect(result.status).toBe("rejected");
        expect(result.errors.some((e) => e.includes("Unknown skill"))).toBe(true);
    });
});
describe("CORRUPTION B9: override targeting non-existent block", () => {
    it("applyOverridePatch rejects with mechanical integrity error", async () => {
        const artifact = await createClean();
        const override = {
            override_id: "ovr_corrupt_b9",
            artifact_id: "test_art",
            base_revision_id: artifact.revision_id,
            override_type: "manual_replace_block",
            operator: { type: "human", id: "attacker" },
            failed_gates: ["undefined_term"],
            affected_issue_ids: [],
            rationale: "Trying to target non-existent block.",
            timestamp: new Date().toISOString(),
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_nonexistent",
                    expected_old_hash: "sha256:whatever",
                    new_block: makeBlock({
                        block_id: "b_nonexistent",
                        text: "Injected block.",
                    }),
                },
            ],
        };
        const result = await applyOverridePatch(config, artifact, override);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toContain("does not exist");
            expect(result.reason).toContain("mechanical integrity");
        }
    });
});
describe("CORRUPTION B10: override with wrong expected_old_hash", () => {
    it("applyOverridePatch rejects stale/tampered hash", async () => {
        const artifact = await createClean();
        const override = {
            override_id: "ovr_corrupt_b10",
            artifact_id: "test_art",
            base_revision_id: artifact.revision_id,
            override_type: "manual_replace_block",
            operator: { type: "human", id: "attacker" },
            failed_gates: ["undefined_term"],
            affected_issue_ids: [],
            rationale: "Trying with wrong hash.",
            timestamp: new Date().toISOString(),
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_001",
                    expected_old_hash: "sha256:this_is_wrong",
                    new_block: makeBlock({ text: "Attempted replacement." }),
                },
            ],
        };
        const result = await applyOverridePatch(config, artifact, override);
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
            expect(result.reason).toContain("expected_old_hash mismatch");
            expect(result.reason).toContain("mechanical integrity");
        }
    });
});
// ===========================================================================
// C. Combined: corruption + detection
// ===========================================================================
describe("CORRUPTION COMBINED: multiple corruptions in one store", () => {
    it("integrityCheck reports ALL findings, not just the first", async () => {
        const artifact = await createClean();
        // Corruption 1: tamper block text
        const path = revPath(artifact.revision_id);
        const data = JSON.parse(await fs.readFile(path, "utf8"));
        data.sections[0].commitments[0].text = "TAMPERED";
        await fs.writeFile(path, JSON.stringify(data), "utf8");
        // Corruption 2: .tmp leftover
        const tmpPath = join(TEST_DIR, "revisions", "test_art", "garbage.json.tmp");
        await fs.writeFile(tmpPath, "{}", "utf8");
        // Corruption 3: orphan revision
        const orphan = {
            ...artifact,
            parent_revision_id: undefined,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Orphan." })],
                },
            ],
        };
        orphan.revision_id = computeRevisionId(orphan);
        await fs.writeFile(revPath(orphan.revision_id), JSON.stringify(orphan, null, 2), "utf8");
        const report = await integrityCheck(config);
        // Should find at least 3 issues (hash mismatch + tmp + orphan)
        // plus revision_id_recomputation_mismatch from the tamper
        expect(report.summary.total).toBeGreaterThanOrEqual(3);
        expect(report.summary.corruptions).toBeGreaterThanOrEqual(1);
        expect(report.summary.warnings).toBeGreaterThanOrEqual(2);
        // Verify specific checks are present
        const checks = new Set(report.findings.map((f) => f.check));
        expect(checks.has("block_content_hash_mismatch")).toBe(true);
        expect(checks.has("tmp_leftover")).toBe(true);
        expect(checks.has("orphan_revision")).toBe(true);
    });
});
describe("CORRUPTION COMBINED: clean store after repair", () => {
    it("integrityCheck reports 0 findings on fresh clean artifact", async () => {
        // This is the baseline: after every corruption test, a fresh
        // store must still pass with zero findings.
        await createClean();
        const report = await integrityCheck(config);
        expect(report.summary.total).toBe(0);
    });
});
//# sourceMappingURL=corruption.test.js.map