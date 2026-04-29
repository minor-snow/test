/**
 * Integrity Check �?Test Suite
 *
 * ref: HARD-002
 *
 * Tests that integrityCheck() correctly detects each category of
 * integrity violation without modifying any data.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { integrityCheck } from "../src/integrityCheck.js";
import { createArtifact, saveRevision, updateCanonicalPointer, appendAuditLog, } from "../src/artifactStore.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
let config;
beforeEach(async () => {
    const dataDir = await fs.mkdtemp(join(tmpdir(), "pantheon-integrity-"));
    config = { dataDir };
});
afterEach(async () => {
    await fs.rm(config.dataDir, { recursive: true, force: true });
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
function makeDraftArtifact() {
    return {
        artifact_id: "test_artifact",
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
    };
}
async function createCleanArtifact() {
    return createArtifact(config, makeDraftArtifact());
}
function findingsByCheck(findings, check) {
    return findings.filter((f) => f.check === check);
}
// ===========================================================================
// Clean store: no findings
// ===========================================================================
describe("integrityCheck �?clean store", () => {
    it("reports no findings on a correctly created artifact", async () => {
        await createCleanArtifact();
        const report = await integrityCheck(config);
        expect(report.summary.total).toBe(0);
        expect(report.summary.corruptions).toBe(0);
        expect(report.summary.warnings).toBe(0);
        expect(report.summary.artifacts_scanned).toBe(1);
        expect(report.summary.revisions_scanned).toBe(1);
    });
    it("reports no findings on empty data directory", async () => {
        const report = await integrityCheck(config);
        expect(report.summary.total).toBe(0);
        expect(report.summary.artifacts_scanned).toBe(0);
    });
});
// ===========================================================================
// Check 1: Canonical pointer �?revision exists
// ===========================================================================
describe("Check 1: canonical pointer target", () => {
    it("detects canonical pointing to non-existent revision", async () => {
        const artifact = await createCleanArtifact();
        // Delete the revision file that canonical points to
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        await fs.unlink(revPath);
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_target_missing");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("detects canonical pointer file containing null", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, "null", "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("null");
    });
    it("detects canonical pointer file containing an array", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, '[1,2,3]', "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("array");
    });
    it("detects canonical pointer file containing a string", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, '"just a string"', "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("string");
    });
    it("detects canonical pointer missing current_revision_id", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, JSON.stringify({ some_other_field: "value" }), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("current_revision_id");
    });
    it("detects canonical pointer with missing artifact_id", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, JSON.stringify({ current_revision_id: "rev_123" }), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("artifact_id");
    });
    it("detects canonical pointer with mismatched artifact_id", async () => {
        await createCleanArtifact();
        const canonicalPath = join(config.dataDir, "canonical", "test_artifact.json");
        await fs.writeFile(canonicalPath, JSON.stringify({
            artifact_id: "wrong_artifact",
            current_revision_id: "rev_123",
        }), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "canonical_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("wrong_artifact");
        expect(findings[0].message).toContain("test_artifact");
    });
});
// ===========================================================================
// Check 2: Revision JSON + schema_version
// ===========================================================================
describe("Check 2: revision parse + schema", () => {
    it("detects unparseable revision JSON", async () => {
        const artifact = await createCleanArtifact();
        // Corrupt the revision file
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        await fs.writeFile(revPath, "NOT VALID JSON {{{", "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_parse");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("detects unknown schema_version", async () => {
        const artifact = await createCleanArtifact();
        // Tamper schema_version
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const content = JSON.parse(await fs.readFile(revPath, "utf8"));
        content.schema_version = "unknown_type@9.9.9";
        await fs.writeFile(revPath, JSON.stringify(content), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "schema_version_unknown");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("unknown_type@9.9.9");
    });
});
// ===========================================================================
// Check 3: Block content_hash recomputation
// ===========================================================================
describe("Check 3: block content_hash", () => {
    it("detects tampered block text with stale hash", async () => {
        const artifact = await createCleanArtifact();
        // Tamper block text without updating hash
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const content = JSON.parse(await fs.readFile(revPath, "utf8"));
        content.sections[0].commitments[0].text = "TAMPERED TEXT";
        // content_hash stays the same (stale)
        await fs.writeFile(revPath, JSON.stringify(content), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "block_content_hash_mismatch");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("b_001");
    });
});
// ===========================================================================
// Check 4: Revision ID recomputation
// ===========================================================================
describe("Check 4: revision_id recomputation", () => {
    it("detects in-file revision_id != filename", async () => {
        const artifact = await createCleanArtifact();
        // Rename the revision file to a wrong name
        const oldPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const newPath = join(config.dataDir, "revisions", "test_artifact", "rev_tampered_name.json");
        await fs.rename(oldPath, newPath);
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_id_filename_mismatch");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("detects recomputed revision_id mismatch (content tampering)", async () => {
        const artifact = await createCleanArtifact();
        // Tamper a metadata field (which IS included in revision_id computation)
        // Actually, we need to tamper something in sections
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const content = JSON.parse(await fs.readFile(revPath, "utf8"));
        // Change block text AND fix block hash, so check 3 passes but revision_id is wrong
        const block = content.sections[0].commitments[0];
        block.text = "Tampered text here.";
        block.content_hash = computeBlockContentHash(block);
        // revision_id stays the same (stale) �?recomputation will differ
        await fs.writeFile(revPath, JSON.stringify(content), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_id_recomputation_mismatch");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
});
// ===========================================================================
// Check 5: Parent chain continuity
// ===========================================================================
describe("Check 5: parent chain", () => {
    it("detects broken parent chain (parent deleted)", async () => {
        // Create initial artifact
        const artifact = await createCleanArtifact();
        const rev0 = artifact.revision_id;
        // Create a child revision manually
        const childArtifact = {
            ...artifact,
            parent_revision_id: rev0,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Updated." })],
                },
            ],
        };
        childArtifact.revision_id = computeRevisionId(childArtifact);
        await saveRevision(config, childArtifact);
        await updateCanonicalPointer(config, "test_artifact", childArtifact.revision_id);
        // Delete the parent revision
        const parentPath = join(config.dataDir, "revisions", "test_artifact", `${rev0}.json`);
        await fs.unlink(parentPath);
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "parent_chain_broken");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain(rev0);
    });
});
// ===========================================================================
// Check 6: Orphan revisions
// ===========================================================================
describe("Check 6: orphan revisions", () => {
    it("detects orphan revision not reachable from canonical", async () => {
        const artifact = await createCleanArtifact();
        // Create an orphan revision (not in parent chain)
        const orphan = {
            ...artifact,
            parent_revision_id: undefined,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Orphan revision." })],
                },
            ],
        };
        orphan.revision_id = computeRevisionId(orphan);
        // Write directly to bypass immutability check (different revision_id)
        const orphanPath = join(config.dataDir, "revisions", "test_artifact", `${orphan.revision_id}.json`);
        await fs.writeFile(orphanPath, JSON.stringify(orphan, null, 2), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "orphan_revision");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("warning");
        expect(findings[0].revision_id).toBe(orphan.revision_id);
    });
});
// ===========================================================================
// Check 7: Audit log
// ===========================================================================
describe("Check 7: audit log", () => {
    it("detects unparseable audit log line", async () => {
        await createCleanArtifact();
        // Append garbage to audit log
        const auditPath = join(config.dataDir, "audit", "test_artifact.jsonl");
        await fs.appendFile(auditPath, "NOT JSON LINE\n", "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_line_parse");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("detects missing artifact_created event", async () => {
        const artifact = await createCleanArtifact();
        // Overwrite audit log with only an override entry (no artifact_created)
        const auditPath = join(config.dataDir, "audit", "test_artifact.jsonl");
        const entry = {
            entry_id: "audit_test",
            timestamp: new Date().toISOString(),
            entry_type: "override_applied",
            artifact_id: "test_artifact",
            revision_id: artifact.revision_id,
            details: {},
        };
        await fs.writeFile(auditPath, JSON.stringify(entry) + "\n", "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing_created");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("detects missing audit log for artifact with canonical", async () => {
        await createCleanArtifact();
        // Delete the audit log
        const auditPath = join(config.dataDir, "audit", "test_artifact.jsonl");
        await fs.unlink(auditPath);
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
});
// ===========================================================================
// Check 8: .tmp leftover files
// ===========================================================================
describe("Check 8: .tmp leftover files", () => {
    it("detects .tmp files in revisions directory", async () => {
        await createCleanArtifact();
        // Create a leftover .tmp file
        const tmpPath = join(config.dataDir, "revisions", "test_artifact", "rev_partial.json.tmp");
        await fs.writeFile(tmpPath, '{"partial": true}', "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "tmp_leftover");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("warning");
    });
    it("detects .tmp files in canonical directory", async () => {
        await createCleanArtifact();
        // Create a leftover .tmp file in canonical
        const tmpPath = join(config.dataDir, "canonical", "test_artifact.json.tmp");
        await fs.writeFile(tmpPath, '{"partial": true}', "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "tmp_leftover");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("warning");
    });
});
// ===========================================================================
// Summary validation
// ===========================================================================
describe("IntegrityReport summary", () => {
    it("correctly counts warnings vs corruptions", async () => {
        const artifact = await createCleanArtifact();
        // Create one orphan (warning) and one .tmp (warning)
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
        const orphanPath = join(config.dataDir, "revisions", "test_artifact", `${orphan.revision_id}.json`);
        await fs.writeFile(orphanPath, JSON.stringify(orphan, null, 2), "utf8");
        const tmpPath = join(config.dataDir, "revisions", "test_artifact", "leftover.json.tmp");
        await fs.writeFile(tmpPath, "{}", "utf8");
        const report = await integrityCheck(config);
        expect(report.summary.warnings).toBe(2); // orphan + tmp
        expect(report.summary.corruptions).toBe(0);
        expect(report.summary.total).toBe(2);
    });
});
// ===========================================================================
// P1-2: Malformed revision shape (parseable JSON, bad structure)
// ===========================================================================
describe("P1-2: malformed revision shape", () => {
    it("reports revision_shape_invalid when sections is missing", async () => {
        const artifact = await createCleanArtifact();
        // Write a revision with valid JSON but no sections
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const data = JSON.parse(await fs.readFile(revPath, "utf8"));
        delete data.sections;
        await fs.writeFile(revPath, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("sections");
    });
    it("reports revision_shape_invalid when sections is not an array", async () => {
        const artifact = await createCleanArtifact();
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const data = JSON.parse(await fs.readFile(revPath, "utf8"));
        data.sections = "not an array";
        await fs.writeFile(revPath, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("reports revision_shape_invalid when commitments is missing", async () => {
        const artifact = await createCleanArtifact();
        const revPath = join(config.dataDir, "revisions", "test_artifact", `${artifact.revision_id}.json`);
        const data = JSON.parse(await fs.readFile(revPath, "utf8"));
        data.sections = [{ section_id: "sec_01", title: "Core" }]; // no commitments
        await fs.writeFile(revPath, JSON.stringify(data), "utf8");
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "revision_shape_invalid");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
    });
    it("does NOT crash the scan �?other artifacts are still checked", async () => {
        // Create two artifacts: one clean, one malformed
        const clean = await createCleanArtifact();
        // Create a second artifact manually with malformed shape
        const malformedDir = join(config.dataDir, "revisions", "malformed_art");
        await fs.mkdir(malformedDir, { recursive: true });
        const malformedData = {
            artifact_id: "malformed_art",
            artifact_type: "ArchitectureDraft",
            schema_version: "architecture_draft@0.1.0",
            revision_id: "rev_malformed",
            // sections intentionally missing
            metadata: { created_by: "test" },
        };
        await fs.writeFile(join(malformedDir, "rev_malformed.json"), JSON.stringify(malformedData), "utf8");
        const report = await integrityCheck(config);
        // Scan should NOT have crashed �?both artifacts scanned
        expect(report.summary.artifacts_scanned).toBe(2);
        // Malformed revision should be reported
        const shapeFindings = findingsByCheck(report.findings, "revision_shape_invalid");
        expect(shapeFindings.length).toBe(1);
        expect(shapeFindings[0].artifact_id).toBe("malformed_art");
        // Clean artifact should still have 0 issues related to it
        const cleanFindings = report.findings.filter((f) => f.artifact_id === "test_artifact");
        expect(cleanFindings.length).toBe(0);
    });
    it("reports revision_shape_invalid when file contains null", async () => {
        await createCleanArtifact();
        const malDir = join(config.dataDir, "revisions", "null_art");
        await fs.mkdir(malDir, { recursive: true });
        await fs.writeFile(join(malDir, "rev_null.json"), "null", "utf8");
        const report = await integrityCheck(config);
        const hits = findingsByCheck(report.findings, "revision_shape_invalid")
            .filter((f) => f.artifact_id === "null_art");
        expect(hits.length).toBe(1);
        expect(hits[0].message).toContain("null");
    });
    it("reports revision_shape_invalid when file contains an array", async () => {
        await createCleanArtifact();
        const malDir = join(config.dataDir, "revisions", "arr_art");
        await fs.mkdir(malDir, { recursive: true });
        await fs.writeFile(join(malDir, "rev_arr.json"), "[1,2,3]", "utf8");
        const report = await integrityCheck(config);
        const hits = findingsByCheck(report.findings, "revision_shape_invalid")
            .filter((f) => f.artifact_id === "arr_art");
        expect(hits.length).toBe(1);
        expect(hits[0].message).toContain("array");
    });
    it("reports revision_shape_invalid when file contains a string", async () => {
        await createCleanArtifact();
        const malDir = join(config.dataDir, "revisions", "str_art");
        await fs.mkdir(malDir, { recursive: true });
        await fs.writeFile(join(malDir, "rev_str.json"), '"just a string"', "utf8");
        const report = await integrityCheck(config);
        const hits = findingsByCheck(report.findings, "revision_shape_invalid")
            .filter((f) => f.artifact_id === "str_art");
        expect(hits.length).toBe(1);
        expect(hits[0].message).toContain("string");
    });
    it("reports revision_shape_invalid when file contains a number", async () => {
        await createCleanArtifact();
        const malDir = join(config.dataDir, "revisions", "num_art");
        await fs.mkdir(malDir, { recursive: true });
        await fs.writeFile(join(malDir, "rev_num.json"), "42", "utf8");
        const report = await integrityCheck(config);
        const hits = findingsByCheck(report.findings, "revision_shape_invalid")
            .filter((f) => f.artifact_id === "num_art");
        expect(hits.length).toBe(1);
        expect(hits[0].message).toContain("number");
    });
});
// ===========================================================================
// P2: Audit continuity for canonical revision
// ===========================================================================
describe("P2: audit canonical continuity", () => {
    it("detects canonical revision with no matching audit event", async () => {
        const artifact = await createCleanArtifact();
        // Create a child revision and advance canonical
        const child = {
            ...artifact,
            parent_revision_id: artifact.revision_id,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Updated." })],
                },
            ],
        };
        child.revision_id = computeRevisionId(child);
        await saveRevision(config, child);
        await updateCanonicalPointer(config, "test_artifact", child.revision_id);
        // Do NOT append an audit entry for the new canonical revision
        // (simulating a partial write / crash after pointer update)
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing_canonical_event");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].revision_id).toBe(child.revision_id);
        expect(findings[0].message).toContain("no canonicalization event");
        expect(findings[0].message).toContain("Possible partial write");
    });
    it("passes when canonical revision has override_applied event", async () => {
        const artifact = await createCleanArtifact();
        // Create child and advance canonical
        const child = {
            ...artifact,
            parent_revision_id: artifact.revision_id,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Overridden." })],
                },
            ],
        };
        child.revision_id = computeRevisionId(child);
        await saveRevision(config, child);
        await updateCanonicalPointer(config, "test_artifact", child.revision_id);
        // Append proper audit event
        await appendAuditLog(config, {
            entry_id: "audit_ovr_test",
            timestamp: new Date().toISOString(),
            entry_type: "override_applied",
            artifact_id: "test_artifact",
            revision_id: child.revision_id,
            details: { override_type: "accept_with_known_risk" },
        });
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing_canonical_event");
        expect(findings.length).toBe(0);
    });
    it("detects partial write: patch_applied exists but canonical_updated missing", async () => {
        const artifact = await createCleanArtifact();
        // Create child and advance canonical
        const child = {
            ...artifact,
            parent_revision_id: artifact.revision_id,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Patched." })],
                },
            ],
        };
        child.revision_id = computeRevisionId(child);
        await saveRevision(config, child);
        await updateCanonicalPointer(config, "test_artifact", child.revision_id);
        // Append patch_applied �?proves candidate was created
        // but does NOT prove canonical promotion
        await appendAuditLog(config, {
            entry_id: "audit_patch",
            timestamp: new Date().toISOString(),
            entry_type: "patch_applied",
            artifact_id: "test_artifact",
            revision_id: child.revision_id,
            details: { patch_id: "patch_001" },
        });
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing_canonical_event");
        expect(findings.length).toBe(1);
        expect(findings[0].severity).toBe("corrupt");
        expect(findings[0].message).toContain("canonicalization event");
        expect(findings[0].message).not.toContain("patch_applied");
    });
    it("passes when canonical_updated event is present (not patch_applied)", async () => {
        const artifact = await createCleanArtifact();
        const child = {
            ...artifact,
            parent_revision_id: artifact.revision_id,
            sections: [
                {
                    section_id: "sec_01",
                    title: "Core",
                    commitments: [makeBlock({ text: "Canonical via update." })],
                },
            ],
        };
        child.revision_id = computeRevisionId(child);
        await saveRevision(config, child);
        await updateCanonicalPointer(config, "test_artifact", child.revision_id);
        // canonical_updated is a real canonicalization event
        await appendAuditLog(config, {
            entry_id: "audit_canonical",
            timestamp: new Date().toISOString(),
            entry_type: "canonical_updated",
            artifact_id: "test_artifact",
            revision_id: child.revision_id,
            details: {},
        });
        const report = await integrityCheck(config);
        const findings = findingsByCheck(report.findings, "audit_missing_canonical_event");
        expect(findings.length).toBe(0);
    });
});
//# sourceMappingURL=integrityCheck.test.js.map