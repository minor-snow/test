/**
 * End-to-End Integration Test
 *
 * ref: 执行宪法 v0.2 §17 Day 7, §18, §21
 *
 * This test covers the COMPLETE §21 scenario:
 *
 *   rev_001 → linter issue → patch proposal → candidate revision
 *   → semantic regression failed → human override → rev_002_override
 *   → canonical pointer updated
 *
 * It verifies ALL TEN §18 criteria in a single integration flow.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
// --- All core modules ---
import { createArtifact, saveRevision, loadRevision, loadCanonicalRevision, loadCanonicalPointer, loadAuditLog, saveToQuarantine, loadFromQuarantine, promoteToEvidence, loadFromEvidence, saveProjection, } from "../src/artifactStore.js";
import { computeBlockContentHash, computeRevisionId } from "../src/hash.js";
import { validateForWrite, validateForRead } from "../src/schemaRegistry.js";
import { lintArtifact } from "../src/linter.js";
import { validateSkillOutput } from "../src/validators.js";
import { compilePatch, applyPatch } from "../src/applyPatch.js";
import { runSemanticRegression, buildRegressionInput, } from "../src/semanticRegression.js";
import { applyOverridePatch } from "../src/applyOverridePatch.js";
import { renderMarkdown } from "../src/renderMarkdown.js";
import { runPipeline, applyHumanOverride, generateCockpitData, } from "../src/pipeline.js";
import { makeSection21Artifact, SECTION21_PATCH_TEXT, } from "../src/demo/section21Fixture.js";
// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
const TEST_DATA_DIR = join(process.cwd(), "data", "_test_e2e_tmp");
let config;
beforeEach(async () => {
    config = { dataDir: TEST_DATA_DIR };
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
});
afterEach(async () => {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
});
// §21 artifact factory is imported from src/demo/section21Fixture.ts
// ref: HARD-005 — single source of truth
// ===========================================================================
// §21 Complete Closed Loop
// ===========================================================================
describe("§21 Complete Closed Loop", () => {
    it("full pipeline: rev_001 → linter → patch → regression_failed → override → rev_override → canonical updated", async () => {
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 1: Create JSON Artifact (§18 #1)       ║
        // ╚══════════════════════════════════════════════╝
        const draft = makeSection21Artifact();
        const artifact = await createArtifact(config, draft);
        // §18 #1: A JSON Artifact can be created
        expect(artifact.artifact_id).toBe("arch_001");
        expect(artifact.revision_id).toMatch(/^rev_[0-9a-f]{12}$/);
        expect(artifact.sections[0].commitments[0].content_hash).toMatch(/^sha256:/);
        const rev_001 = artifact.revision_id;
        // §18 #2: Schema validation
        const writeValidation = validateForWrite("architecture_draft", artifact);
        expect(writeValidation.valid).toBe(true);
        const readValidation = validateForRead(artifact);
        expect(readValidation.valid).toBe(true);
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 2: Deterministic Linter (§18 #4)       ║
        // ╚══════════════════════════════════════════════╝
        const issues = lintArtifact(artifact);
        // §18 #4: Linter generates issue for "committed instantly"
        expect(issues.length).toBeGreaterThan(0);
        const unsafeIssue = issues.find((i) => i.issue_type === "unsafe_canonical_commit");
        expect(unsafeIssue).toBeDefined();
        expect(unsafeIssue.target_block_id).toBe("b_mem_001");
        expect(unsafeIssue.severity).toBe("high");
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 3: Issue → Quarantine → Evidence       ║
        // ║  (§18 #5)                                     ║
        // ╚══════════════════════════════════════════════╝
        const issueWithSchema = {
            ...unsafeIssue,
            schema_version: "issue@0.1.0",
        };
        // Issue enters quarantine (ref: C-03)
        await saveToQuarantine(config, unsafeIssue.issue_id, issueWithSchema);
        const quarantined = await loadFromQuarantine(config, unsafeIssue.issue_id);
        expect(quarantined).not.toBeNull();
        // Gate validation (4-gate pipeline)
        const gateResult = validateSkillOutput(JSON.stringify(issueWithSchema), "document_linter", "Issue", "quarantine", artifact);
        // §18 #5: Issue passes all gates
        expect(gateResult.status).toBe("validated");
        expect(gateResult.gates.length).toBe(4);
        expect(gateResult.gates.every((g) => g.passed)).toBe(true);
        // Promote to evidence (ref: C-04)
        await promoteToEvidence(config, unsafeIssue.issue_id, issueWithSchema);
        const evidence = await loadFromEvidence(config, unsafeIssue.issue_id);
        expect(evidence).not.toBeNull();
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 4: PatchProposal → ArtifactPatch       ║
        // ║  (§18 #6)                                     ║
        // ╚══════════════════════════════════════════════╝
        const proposal = {
            proposal_id: "proposal_001",
            artifact_id: "arch_001",
            base_revision_id: rev_001,
            source_issue_ids: [unsafeIssue.issue_id],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: SECTION21_PATCH_TEXT,
                },
            ],
        };
        // §18 #6: PatchProposal compiles to ArtifactPatch
        const artifactPatch = compilePatch(proposal, artifact);
        expect(artifactPatch.operations[0].expected_old_hash).toBe(artifact.sections[0].commitments[0].content_hash);
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 5: applyPatch → Candidate Revision     ║
        // ║  (§18 #7, #8)                                 ║
        // ╚══════════════════════════════════════════════╝
        // §18 #7: applyPatch succeeds on hash match
        const patchResult = applyPatch(artifact, artifactPatch);
        expect(patchResult.status).toBe("accepted");
        if (patchResult.status !== "accepted")
            return;
        const candidate = patchResult.candidate_revision;
        expect(candidate.revision_id).not.toBe(rev_001);
        expect(candidate.parent_revision_id).toBe(rev_001);
        expect(candidate.sections[0].commitments[0].text).toBe(SECTION21_PATCH_TEXT);
        // §18 #8: Verify hash mismatch rejection works
        const tamperedPatch = { ...artifactPatch };
        tamperedPatch.operations = [
            {
                ...artifactPatch.operations[0],
                expected_old_hash: "sha256:wrong",
            },
        ];
        const rejectResult = applyPatch(artifact, tamperedPatch);
        expect(rejectResult.status).toBe("rejected");
        // §18 #3: Candidate can be saved and loaded
        await saveRevision(config, candidate);
        const loaded = await loadRevision(config, "arch_001", candidate.revision_id);
        expect(loaded).not.toBeNull();
        expect(loaded.sections[0].commitments[0].text).toBe(SECTION21_PATCH_TEXT);
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 6: Semantic Regression Gate (§18 #9)    ║
        // ╚══════════════════════════════════════════════╝
        const oldBlocks = artifact.sections.flatMap((s) => s.commitments);
        const newBlocks = candidate.sections.flatMap((s) => s.commitments);
        const regressionInput = buildRegressionInput(oldBlocks, newBlocks);
        const regressionResult = runSemanticRegression(regressionInput);
        // §18 #9: Semantic regression detects undefined "quarantine_gate" term
        expect(regressionResult.status).toBe("failed");
        expect(regressionResult.failed_gates).toContain("undefined_term");
        expect(regressionResult.reasons.some((r) => r.includes("quarantine"))).toBe(true);
        expect(regressionResult.affected_blocks).toContain("b_mem_001");
        // ╔══════════════════════════════════════════════╗
        // ║  STEP 7: Human Override (§18 #10)             ║
        // ╚══════════════════════════════════════════════╝
        const override = {
            override_id: "ovr_20260425_001",
            artifact_id: "arch_001",
            base_revision_id: candidate.revision_id,
            override_type: "accept_with_known_risk",
            operator: { type: "human", id: "architect_lead" },
            failed_gates: ["undefined_term"],
            affected_issue_ids: [unsafeIssue.issue_id],
            rationale: "Accepted for MVP; glossary definition will be added in a follow-up revision.",
            risk_acceptance: {
                accepted_risks: [
                    'Undefined term "quarantine_gate" – meaning clear from context',
                ],
                mitigation_plan: "Will add quarantine_gate to glossary in next revision.",
                revisit_condition: "Before any gate logic implementation references this term.",
            },
            timestamp: new Date().toISOString(),
        };
        // §18 #10: Override generates new revision + updates canonical
        const overrideResult = await applyOverridePatch(config, candidate, override);
        expect(overrideResult.status).toBe("applied");
        if (overrideResult.status !== "applied")
            return;
        const rev_override = overrideResult.new_revision;
        expect(rev_override.revision_id).not.toBe(candidate.revision_id);
        expect(rev_override.parent_revision_id).toBe(candidate.revision_id);
        // Canonical pointer now points to override revision
        const pointer = await loadCanonicalPointer(config, "arch_001");
        expect(pointer.current_revision_id).toBe(rev_override.revision_id);
        // ╔══════════════════════════════════════════════╗
        // ║  VERIFICATION: Full audit trail               ║
        // ╚══════════════════════════════════════════════╝
        const auditLog = await loadAuditLog(config, "arch_001");
        const entryTypes = auditLog.map((e) => e.entry_type);
        expect(entryTypes).toContain("artifact_created");
        expect(entryTypes).toContain("override_applied");
        // Verify override audit entry has full details
        const overrideAudit = auditLog.find((e) => e.entry_type === "override_applied");
        expect(overrideAudit.details).toHaveProperty("override_id", "ovr_20260425_001");
        expect(overrideAudit.details).toHaveProperty("override_type", "accept_with_known_risk");
        expect(overrideAudit.details).toHaveProperty("rationale");
        expect(overrideAudit.details).toHaveProperty("risk_acceptance");
        // ╔══════════════════════════════════════════════╗
        // ║  VERIFICATION: Markdown projection (C-01)     ║
        // ╚══════════════════════════════════════════════╝
        const canonical = await loadCanonicalRevision(config, "arch_001");
        expect(canonical).not.toBeNull();
        const markdown = renderMarkdown(canonical);
        expect(markdown).toContain("ArchitectureDraft");
        expect(markdown).toContain("arch_001");
        expect(markdown).toContain("read-only projection");
        // Save projection
        await saveProjection(config, "arch_001", markdown);
        // ╔══════════════════════════════════════════════╗
        // ║  VERIFICATION: Revision chain integrity       ║
        // ╚══════════════════════════════════════════════╝
        // rev_001 → candidate → rev_override
        const loadedRev001 = await loadRevision(config, "arch_001", rev_001);
        expect(loadedRev001).not.toBeNull();
        expect(loadedRev001.parent_revision_id).toBeUndefined();
        const loadedCandidate = await loadRevision(config, "arch_001", candidate.revision_id);
        expect(loadedCandidate).not.toBeNull();
        expect(loadedCandidate.parent_revision_id).toBe(rev_001);
        const loadedOverride = await loadRevision(config, "arch_001", rev_override.revision_id);
        expect(loadedOverride).not.toBeNull();
        expect(loadedOverride.parent_revision_id).toBe(candidate.revision_id);
    });
});
// ===========================================================================
// Pipeline orchestrator test
// ===========================================================================
describe("Pipeline orchestrator", () => {
    it("runs full pipeline and halts at regression_failed", async () => {
        const state = await runPipeline(config, makeSection21Artifact());
        expect(state.phase).toBe("regression_failed");
        expect(state.artifact).not.toBeNull();
        expect(state.candidateRevision).not.toBeNull();
        expect(state.issues.length).toBeGreaterThan(0);
        expect(state.validatedIssues.length).toBeGreaterThan(0);
        expect(state.regressionResult.status).toBe("failed");
        expect(state.regressionResult.failed_gates).toContain("undefined_term");
        expect(state.error).toBeNull();
    });
    it("human override completes the pipeline", async () => {
        let state = await runPipeline(config, makeSection21Artifact());
        expect(state.phase).toBe("regression_failed");
        const override = {
            override_id: "ovr_pipeline_001",
            artifact_id: "arch_001",
            base_revision_id: state.candidateRevision.revision_id,
            override_type: "accept_with_known_risk",
            operator: { type: "human", id: "pipeline_test" },
            failed_gates: ["undefined_term"],
            affected_issue_ids: state.validatedIssues.map((i) => i.issue_id),
            rationale: "Accepted for pipeline test.",
            risk_acceptance: {
                accepted_risks: ["Undefined terms accepted for MVP"],
            },
            timestamp: new Date().toISOString(),
        };
        state = await applyHumanOverride(config, state, override);
        expect(state.phase).toBe("override_applied");
        expect(state.overrideApplied).toBe(true);
        expect(state.error).toBeNull();
    });
    it("generateCockpitData produces structured output", async () => {
        const state = await runPipeline(config, makeSection21Artifact());
        const cockpitData = generateCockpitData(state);
        expect(cockpitData.phase).toBe("regression_failed");
        expect(cockpitData.failed_gates).toContain("undefined_term");
        expect(cockpitData.diff).not.toBeNull();
        expect(cockpitData.issues).toHaveLength(state.validatedIssues.length);
        expect(cockpitData.audit_log).toBeDefined();
        expect(cockpitData.hash_meta).toBeDefined();
    });
});
// ===========================================================================
// §18 Criteria Summary
// ===========================================================================
describe("§18 Acceptance Criteria – individual verification", () => {
    it("#1: JSON Artifact can be created", async () => {
        const artifact = await createArtifact(config, makeSection21Artifact());
        expect(artifact.artifact_id).toBe("arch_001");
        expect(artifact.revision_id).toMatch(/^rev_/);
    });
    it("#2: Schema validates correctly", () => {
        const draft = makeSection21Artifact();
        // Read path
        const readResult = validateForRead(draft);
        expect(readResult.valid).toBe(true);
        // Write path
        const writeResult = validateForWrite("architecture_draft", draft);
        expect(writeResult.valid).toBe(true);
    });
    it("#3: Revision can be saved and loaded", async () => {
        const artifact = await createArtifact(config, makeSection21Artifact());
        const loaded = await loadRevision(config, "arch_001", artifact.revision_id);
        expect(loaded).not.toBeNull();
        expect(loaded.artifact_id).toBe("arch_001");
    });
    it("#4: Deterministic linter generates issue", () => {
        const draft = makeSection21Artifact();
        const block = draft.sections[0].commitments[0];
        block.content_hash = computeBlockContentHash(block);
        const issues = lintArtifact(draft);
        expect(issues.some((i) => i.issue_type === "unsafe_canonical_commit")).toBe(true);
    });
    it("#5: Issue validated through gate pipeline", () => {
        const artifact = makeSection21Artifact();
        const block = artifact.sections[0].commitments[0];
        block.content_hash = computeBlockContentHash(block);
        artifact.revision_id = computeRevisionId(artifact);
        const issues = lintArtifact(artifact);
        const issue = issues[0];
        const json = JSON.stringify({
            ...issue,
            schema_version: "issue@0.1.0",
        });
        const result = validateSkillOutput(json, "document_linter", "Issue", "quarantine", artifact);
        expect(result.status).toBe("validated");
    });
    it("#6: PatchProposal compiled to ArtifactPatch", () => {
        const artifact = makeSection21Artifact();
        const block = artifact.sections[0].commitments[0];
        block.content_hash = computeBlockContentHash(block);
        artifact.revision_id = computeRevisionId(artifact);
        const proposal = {
            proposal_id: "p1",
            artifact_id: "arch_001",
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: "New text.",
                },
            ],
        };
        const patch = compilePatch(proposal, artifact);
        expect(patch.operations[0].expected_old_hash).toBe(block.content_hash);
    });
    it("#7: applyPatch generates candidate on hash match", () => {
        const artifact = makeSection21Artifact();
        const block = artifact.sections[0].commitments[0];
        block.content_hash = computeBlockContentHash(block);
        artifact.revision_id = computeRevisionId(artifact);
        const proposal = {
            proposal_id: "p2",
            artifact_id: "arch_001",
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: "Updated.",
                },
            ],
        };
        const patch = compilePatch(proposal, artifact);
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("accepted");
    });
    it("#8: applyPatch rejects on hash mismatch", () => {
        const artifact = makeSection21Artifact();
        const block = artifact.sections[0].commitments[0];
        block.content_hash = computeBlockContentHash(block);
        artifact.revision_id = computeRevisionId(artifact);
        const proposal = {
            proposal_id: "p3",
            artifact_id: "arch_001",
            base_revision_id: artifact.revision_id,
            source_issue_ids: ["issue_001"],
            operations: [
                {
                    op: "replace_block",
                    target_block_id: "b_mem_001",
                    replacement_text: "Tampered.",
                },
            ],
        };
        const patch = compilePatch(proposal, artifact);
        patch.operations[0].expected_old_hash = "sha256:tampered";
        const result = applyPatch(artifact, patch);
        expect(result.status).toBe("rejected");
    });
    it("#9: Semantic regression intercepts undefined term", () => {
        const oldBlock = {
            block_id: "b_mem_001",
            type: "invariant",
            text: "All entries are committed instantly.",
            terms: [],
            status: "draft",
            content_hash: "",
        };
        oldBlock.content_hash = computeBlockContentHash(oldBlock);
        const newBlock = {
            block_id: "b_mem_001",
            type: "invariant",
            text: "Entries must pass `quarantine_gate` before commit.",
            terms: [],
            status: "draft",
            content_hash: "",
        };
        newBlock.content_hash = computeBlockContentHash(newBlock);
        const input = buildRegressionInput([oldBlock], [newBlock]);
        const result = runSemanticRegression(input);
        expect(result.status).toBe("failed");
        expect(result.failed_gates).toContain("undefined_term");
    });
    it("#10: Human override generates new revision + updates canonical", async () => {
        const artifact = await createArtifact(config, makeSection21Artifact());
        const override = {
            override_id: "ovr_criteria10",
            artifact_id: "arch_001",
            base_revision_id: artifact.revision_id,
            override_type: "accept_with_known_risk",
            operator: { type: "human", id: "test" },
            failed_gates: ["undefined_term"],
            affected_issue_ids: [],
            rationale: "Testing criterion #10.",
            timestamp: new Date().toISOString(),
        };
        const result = await applyOverridePatch(config, artifact, override);
        expect(result.status).toBe("applied");
        if (result.status === "applied") {
            expect(result.new_revision.revision_id).not.toBe(artifact.revision_id);
            const pointer = await loadCanonicalPointer(config, "arch_001");
            expect(pointer.current_revision_id).toBe(result.new_revision.revision_id);
        }
    });
});
//# sourceMappingURL=e2e.test.js.map