/**
 * Trial Runner — Multi-Cycle Pipeline Orchestrator
 *
 * ref: P3-003, P3-004
 *
 * Runs the Pantheon pipeline in multiple cycles against the trial artifact.
 * Each cycle: load canonical → lint → pick issue → LLM patch → apply → regression → commit/override.
 *
 * Supports dual override mode:
 *   - "scripted": uses fixture decisions (for tests/CI)
 *   - "manual": halts for human input (for live trial)
 *
 * After all cycles, if no natural mechanical rejection occurred,
 * runs a forced rejection cycle to prove gate boundaries still hold.
 */
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createArtifact, saveRevision, updateCanonicalPointer, appendAuditLog, saveToQuarantine, promoteToEvidence, saveProjection, } from "../artifactStore.js";
import { lintArtifact } from "../linter.js";
import { validateSkillOutput } from "../validators.js";
import { compilePatch, applyPatch } from "../applyPatch.js";
import { runSemanticRegression, buildRegressionInput, } from "../semanticRegression.js";
import { applyOverridePatch } from "../applyOverridePatch.js";
import { renderMarkdown } from "../renderMarkdown.js";
import { generatePatchProposal, buildPatchPrompt } from "./llmPatchAgent.js";
import { classifyRejection, summarizeRejections, } from "./rejectionTaxonomy.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}
async function saveJson(filePath, data) {
    await ensureDir(join(filePath, ".."));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
// ---------------------------------------------------------------------------
// Single cycle
// ---------------------------------------------------------------------------
export async function runCycle(config, artifact, issue, cycleNum, peerArtifacts // P7a.1: cross-link context
) {
    const result = {
        cycle: cycleNum,
        issue,
        llmRawOutput: null,
        proposalValid: false,
        patchAccepted: false,
        regressionPassed: null,
        overrideApplied: false,
        overrideMode: null,
        mechanicalRejection: false,
        rejectionReason: null,
        rejectionCategories: [],
        committed: false,
        error: null,
    };
    // P6-003: crash-safe archive directory
    const archiveDir = join(config.store.dataDir, "llm_runs", `cycle_${String(cycleNum).padStart(3, "0")}`);
    await ensureDir(archiveDir);
    try {
        // P6-003: Save prompt immediately (crash-safe)
        const prompt = buildPatchPrompt(artifact, issue, peerArtifacts);
        await fs.writeFile(join(archiveDir, "prompt.txt"), prompt, "utf8");
        await saveJson(join(archiveDir, "metadata.json"), {
            cycle: cycleNum,
            issue_id: issue.issue_id,
            target_block_id: issue.target_block_id,
            issue_type: issue.issue_type,
            artifact_id: artifact.artifact_id,
            base_revision_id: artifact.revision_id,
            model: config.modelName ?? "unknown",
            timestamp: new Date().toISOString(),
        });
        // Step 1: Generate PatchProposal via LLM
        const rawOutput = await generatePatchProposal(config.client, artifact, issue, peerArtifacts);
        result.llmRawOutput = rawOutput;
        // P6-003: Save raw output immediately (crash-safe)
        await fs.writeFile(join(archiveDir, "raw_output.txt"), rawOutput, "utf8");
        // Step 2: Validate through gate system
        const validation = validateSkillOutput(rawOutput, "blue_patch_agent", "PatchProposal", "quarantine", artifact);
        // P6-003 + P6-004: Save validation result with taxonomy
        const rejectionRecords = validation.status === "rejected"
            ? classifyRejection(validation.errors, rawOutput)
            : [];
        await saveJson(join(archiveDir, "validation_result.json"), {
            status: validation.status,
            gates: validation.gates,
            errors: validation.errors,
            rejection_records: rejectionRecords,
        });
        if (validation.status === "rejected") {
            result.mechanicalRejection = true;
            result.rejectionReason = validation.errors.join("; ");
            result.rejectionCategories = rejectionRecords.map(r => r.category);
            return { result, newArtifact: null };
        }
        result.proposalValid = true;
        // Step 3: Parse proposal and compile patch
        const proposal = JSON.parse(rawOutput);
        const artifactPatch = compilePatch(proposal, artifact);
        // Step 4: Apply patch
        const patchResult = applyPatch(artifact, artifactPatch);
        if (patchResult.status === "rejected") {
            result.mechanicalRejection = true;
            result.rejectionReason = `${patchResult.reason}: ${patchResult.details}`;
            // P6 audit P1: classify applyPatch rejections too
            result.rejectionCategories = classifyRejection([`${patchResult.reason}: ${patchResult.details}`]).map(r => r.category);
            return { result, newArtifact: null };
        }
        result.patchAccepted = true;
        const candidate = patchResult.candidate_revision;
        // Save candidate revision
        await saveRevision(config.store, candidate);
        await appendAuditLog(config.store, {
            entry_id: `audit_patch_cycle${cycleNum}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            entry_type: "patch_applied",
            artifact_id: artifact.artifact_id,
            revision_id: candidate.revision_id,
            details: {
                patch_id: artifactPatch.patch_id,
                cycle: cycleNum,
                source_issue_ids: artifactPatch.source_issue_ids,
            },
        });
        // Step 5: Semantic Regression
        const oldBlocks = artifact.sections.flatMap((s) => s.commitments);
        const newBlocks = candidate.sections.flatMap((s) => s.commitments);
        const regressionInput = buildRegressionInput(oldBlocks, newBlocks);
        const regressionResult = runSemanticRegression(regressionInput);
        await appendAuditLog(config.store, {
            entry_id: `audit_regression_cycle${cycleNum}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            entry_type: regressionResult.status === "passed"
                ? "semantic_regression_passed"
                : "semantic_regression_failed",
            artifact_id: artifact.artifact_id,
            revision_id: candidate.revision_id,
            details: { result: regressionResult, cycle: cycleNum },
        });
        if (regressionResult.status === "passed") {
            result.regressionPassed = true;
            // Commit to canonical
            await updateCanonicalPointer(config.store, artifact.artifact_id, candidate.revision_id);
            await appendAuditLog(config.store, {
                entry_id: `audit_commit_cycle${cycleNum}_${Date.now()}`,
                timestamp: new Date().toISOString(),
                entry_type: "canonical_updated",
                artifact_id: artifact.artifact_id,
                revision_id: candidate.revision_id,
                details: { auto_committed: true, cycle: cycleNum },
            });
            result.committed = true;
            return { result, newArtifact: candidate };
        }
        // Regression failed → override
        result.regressionPassed = false;
        if (config.overrideMode === "scripted") {
            // Scripted override: accept with known risk
            const override = {
                override_id: `override_cycle${cycleNum}_${Date.now()}`,
                artifact_id: artifact.artifact_id,
                base_revision_id: candidate.revision_id,
                override_type: "accept_with_known_risk",
                operator: { type: "human", id: "trial_runner_scripted" },
                failed_gates: regressionResult.failed_gates,
                affected_issue_ids: [issue.issue_id],
                rationale: `Scripted override for trial cycle ${cycleNum}. ` +
                    `Failed gates: ${regressionResult.failed_gates.join(", ")}`,
                risk_acceptance: {
                    accepted_risks: regressionResult.reasons,
                    mitigation_plan: "Trial environment — not production data.",
                },
                timestamp: new Date().toISOString(),
            };
            const overrideResult = await applyOverridePatch(config.store, candidate, override);
            if (overrideResult.status === "applied") {
                result.overrideApplied = true;
                result.overrideMode = "scripted";
                result.committed = true;
                return { result, newArtifact: overrideResult.new_revision };
            }
            else {
                result.error = `Override rejected: ${overrideResult.reason}`;
                return { result, newArtifact: null };
            }
        }
        else {
            // Manual mode — halt (caller must handle)
            result.overrideMode = "manual";
            result.error = "MANUAL_OVERRIDE_REQUIRED";
            return { result, newArtifact: null };
        }
    }
    catch (err) {
        result.error = err.message;
        // P6 audit P4: classify exception as unknown rejection
        result.rejectionCategories = ["unknown"];
        return { result, newArtifact: null };
    }
}
// ---------------------------------------------------------------------------
// Forced rejection cycle
// ---------------------------------------------------------------------------
async function runForcedRejectionCycle(config, artifact, cycleNum) {
    // Construct a tampered PatchProposal that targets a non-existent block
    const tamperedProposal = JSON.stringify({
        proposal_id: "proposal_forced_rejection",
        artifact_id: artifact.artifact_id,
        base_revision_id: artifact.revision_id,
        source_issue_ids: ["forced_test_issue"],
        operations: [
            {
                op: "replace_block",
                target_block_id: "b_nonexistent_forced_test",
                replacement_text: "This block does not exist.",
            },
        ],
        schema_version: "patch_proposal@0.1.0",
    });
    const validation = validateSkillOutput(tamperedProposal, "blue_patch_agent", "PatchProposal", "quarantine", artifact);
    const rejRecords = validation.status === "rejected"
        ? classifyRejection(validation.errors, tamperedProposal)
        : [];
    return {
        cycle: cycleNum,
        issue: null,
        llmRawOutput: tamperedProposal,
        proposalValid: false,
        patchAccepted: false,
        regressionPassed: null,
        overrideApplied: false,
        overrideMode: null,
        mechanicalRejection: validation.status === "rejected",
        rejectionReason: validation.status === "rejected"
            ? validation.errors.join("; ")
            : null,
        rejectionCategories: rejRecords.map(r => r.category),
        committed: false,
        error: null,
    };
}
// ---------------------------------------------------------------------------
// Main trial runner
// ---------------------------------------------------------------------------
export async function runTrial(config, seedArtifact) {
    const report = {
        total_cycles: 0,
        issues_found: 0,
        issues_by_rule: {},
        proposals_generated: 0,
        proposals_accepted: 0,
        proposals_rejected_semantic: 0,
        natural_rejection_count: 0,
        forced_rejection_count: 0,
        override_count: 0,
        override_mode_breakdown: { manual: 0, scripted: 0 },
        rejections_by_category: {},
        final_canonical_revision_id: "",
        integrity_clean: false,
        final_readability_note: "",
        cycles: [],
    };
    // Ensure output directories
    await ensureDir(join(config.store.dataDir, "llm_runs"));
    await ensureDir(join(config.store.dataDir, "states"));
    // Step 0: Create artifact in store
    let currentArtifact = await createArtifact(config.store, seedArtifact);
    // Track which issues we've already attempted
    const attemptedIssueBlocks = new Set();
    for (let cycle = 1; cycle <= config.maxCycles; cycle++) {
        // Lint current canonical
        const issues = lintArtifact(currentArtifact);
        // Record issue stats (only on first cycle for total count)
        if (cycle === 1) {
            report.issues_found = issues.length;
            for (const issue of issues) {
                report.issues_by_rule[issue.issue_type] =
                    (report.issues_by_rule[issue.issue_type] || 0) + 1;
            }
        }
        // Find next unattempted issue
        const nextIssue = issues.find((i) => !attemptedIssueBlocks.has(i.target_block_id));
        if (!nextIssue) {
            // No more issues to fix
            break;
        }
        attemptedIssueBlocks.add(nextIssue.target_block_id);
        // Quarantine + promote the issue
        await saveToQuarantine(config.store, nextIssue.issue_id, {
            ...nextIssue,
            schema_version: "issue@0.1.0",
        });
        const issueValidation = validateSkillOutput(JSON.stringify({ ...nextIssue, schema_version: "issue@0.1.0" }), "document_linter", "Issue", "quarantine", currentArtifact);
        if (issueValidation.status === "validated") {
            await promoteToEvidence(config.store, nextIssue.issue_id, {
                ...nextIssue,
                schema_version: "issue@0.1.0",
            });
        }
        // Run cycle
        report.proposals_generated++;
        const { result, newArtifact } = await runCycle(config, currentArtifact, nextIssue, cycle);
        report.cycles.push(result);
        report.total_cycles = cycle;
        // Save pipeline state snapshot
        await saveJson(join(config.store.dataDir, "states", `cycle_${cycle}.json`), result);
        // Update stats
        if (result.mechanicalRejection) {
            report.natural_rejection_count++;
        }
        if (result.patchAccepted) {
            report.proposals_accepted++;
        }
        if (result.regressionPassed === false) {
            report.proposals_rejected_semantic++;
        }
        if (result.overrideApplied) {
            report.override_count++;
            if (result.overrideMode === "manual") {
                report.override_mode_breakdown.manual++;
            }
            else {
                report.override_mode_breakdown.scripted++;
            }
        }
        // Advance canonical if we got a new artifact
        if (newArtifact) {
            currentArtifact = newArtifact;
        }
        else if (result.error === "MANUAL_OVERRIDE_REQUIRED") {
            // In manual mode, halt the trial
            break;
        }
        // If mechanical rejection, continue to next issue
    }
    // Forced rejection if no natural rejections occurred
    if (report.natural_rejection_count === 0) {
        const forcedResult = await runForcedRejectionCycle(config, currentArtifact, report.total_cycles + 1);
        report.cycles.push(forcedResult);
        if (forcedResult.mechanicalRejection) {
            report.forced_rejection_count++;
        }
    }
    // Save final projection
    const finalMd = renderMarkdown(currentArtifact);
    await saveProjection(config.store, currentArtifact.artifact_id, finalMd);
    report.final_canonical_revision_id = currentArtifact.revision_id;
    // P6-004: Aggregate rejection categories across all cycles
    const allRejRecords = [];
    for (const c of report.cycles) {
        if (c.rejectionCategories.length > 0) {
            const rawError = c.rejectionReason || c.error || "unknown";
            allRejRecords.push(...c.rejectionCategories.map(cat => ({
                category: cat,
                gate: null,
                raw_error: rawError,
            })));
        }
    }
    report.rejections_by_category = summarizeRejections(allRejRecords);
    return report;
}
//# sourceMappingURL=trialRunner.js.map