/**
 * Multi-Artifact Trial Runner
 *
 * ref: P7a-004, P7b-006
 *
 * Orchestrates a trial across multiple artifacts.
 * Each cycle:
 *   1. Load current canonical for each artifact from store
 *   2. Run local linter on each artifact
 *   3. Run cross-artifact linter across all artifacts
 *   4. Merge all issues into a single queue
 *   5. Pick next unattempted issue
 *   6. Dispatch to runCycle() with the issue's source artifact
 *   7. Update that artifact's canonical
 *   8. Repeat
 *
 * Does NOT do:
 *   - Automatic cross-artifact patch
 *   - Automatic rebase
 *   - Global dependency graph
 *   - Multi-issue patch
 *   - Parallel cycles
 */
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createArtifact, saveProjection, } from "../artifactStore.js";
import { lintArtifact } from "../linter.js";
import { crossLintArtifacts } from "../crossArtifactLinter.js";
import { prioritizeIssues, getIssueTier, countByTier } from "../issuePrioritizer.js";
import { loadCanonicalArtifact } from "../cockpit/reportGenerator.js";
import { renderMarkdown } from "../renderMarkdown.js";
import { validateSkillOutput } from "../validators.js";
import { saveToQuarantine, promoteToEvidence, } from "../artifactStore.js";
import { runCycle, } from "./trialRunner.js";
import { summarizeRejections, } from "./rejectionTaxonomy.js";
// ---------------------------------------------------------------------------
// Issue dedup key
// ---------------------------------------------------------------------------
function issueKey(issue) {
    return `${issue.artifact_id}|${issue.issue_type}|${issue.target_block_id}|${issue.message}`;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}
/**
 * Load the current canonical artifact from the store.
 * Falls back to the in-memory artifact if store has no canonical yet.
 */
async function loadCurrentArtifact(config, artifactId, fallback) {
    const loaded = await loadCanonicalArtifact(config, artifactId);
    return loaded?.artifact ?? fallback;
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function runMultiArtifactTrial(config, seeds) {
    const trialConfig = {
        store: config.store,
        client: config.client,
        overrideMode: config.overrideMode,
        maxCycles: config.maxCycles,
        modelName: config.modelName,
    };
    const report = {
        artifact_count: seeds.length,
        block_count: 0,
        local_issues: 0,
        cross_artifact_issues: 0,
        proposals_generated: 0,
        proposals_committed: 0,
        mechanical_rejections: 0,
        semantic_regressions: 0,
        overrides: 0,
        residual_by_artifact: {},
        cross_residuals: 0,
        rejections_by_category: {},
        final_revision_ids: {},
        issues_by_priority_tier: {},
        attempted_by_priority_tier: {},
        skipped_due_to_budget: 0,
        cycles: [],
    };
    // Ensure output directories
    await ensureDir(join(config.store.dataDir, "llm_runs"));
    await ensureDir(join(config.store.dataDir, "states"));
    // Step 0: Create all seed artifacts in store
    const artifactMap = new Map();
    for (const seed of seeds) {
        const created = await createArtifact(config.store, seed);
        artifactMap.set(created.artifact_id, created);
    }
    // Count total blocks
    report.block_count = seeds.reduce((sum, a) => sum + a.sections.reduce((s, sec) => s + sec.commitments.length, 0), 0);
    // Track attempted issues by composite key
    const attemptedKeys = new Set();
    // Compute initial issue counts from seed state
    {
        const seedArtifacts = Array.from(artifactMap.values());
        for (const artifact of seedArtifacts) {
            report.local_issues += lintArtifact(artifact).length;
        }
        report.cross_artifact_issues = crossLintArtifacts(seedArtifacts).length;
    }
    for (let cycle = 1; cycle <= config.maxCycles; cycle++) {
        // Step 1: Load current canonical for each artifact from store
        const currentArtifacts = [];
        for (const [artifactId, fallback] of artifactMap) {
            const current = await loadCurrentArtifact(config.store, artifactId, fallback);
            artifactMap.set(artifactId, current);
            currentArtifacts.push(current);
        }
        // Step 2: Run local linter on each artifact
        const allLocalIssues = [];
        for (const artifact of currentArtifacts) {
            const issues = lintArtifact(artifact);
            allLocalIssues.push(...issues);
        }
        // Step 3: Run cross-artifact linter
        const crossIssues = crossLintArtifacts(currentArtifacts);
        // Step 4: Sort all issues with IssuePrioritizer (P7b-006)
        const allIssues = prioritizeIssues([...crossIssues, ...allLocalIssues]);
        // Step 5: Pick next unattempted issue
        const nextIssue = allIssues.find(i => !attemptedKeys.has(issueKey(i)));
        if (!nextIssue) {
            // No more issues to fix
            break;
        }
        attemptedKeys.add(issueKey(nextIssue));
        // P7b-006: Track attempted tier
        const tier = getIssueTier(nextIssue.issue_type);
        report.attempted_by_priority_tier[tier] =
            (report.attempted_by_priority_tier[tier] || 0) + 1;
        // Step 6: Dispatch by issue.artifact_id
        const targetArtifact = artifactMap.get(nextIssue.artifact_id);
        if (!targetArtifact) {
            // Should not happen if issues are well-formed
            report.cycles.push({
                cycle,
                issue: nextIssue,
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
                error: `No artifact found for artifact_id "${nextIssue.artifact_id}"`,
            });
            continue;
        }
        // Quarantine + promote the issue
        await saveToQuarantine(config.store, nextIssue.issue_id, {
            ...nextIssue,
            schema_version: "issue@0.1.0",
        });
        const issueValidation = validateSkillOutput(JSON.stringify({ ...nextIssue, schema_version: "issue@0.1.0" }), "document_linter", "Issue", "quarantine", targetArtifact);
        if (issueValidation.status === "validated") {
            await promoteToEvidence(config.store, nextIssue.issue_id, {
                ...nextIssue,
                schema_version: "issue@0.1.0",
            });
        }
        // Step 7: Run cycle (pass all artifacts as peers for cross-link context)
        report.proposals_generated++;
        const { result, newArtifact } = await runCycle(trialConfig, targetArtifact, nextIssue, cycle, currentArtifacts // P7a.1: cross-link context
        );
        report.cycles.push(result);
        // Update stats
        if (result.committed && newArtifact) {
            report.proposals_committed++;
            artifactMap.set(newArtifact.artifact_id, newArtifact);
        }
        if (result.mechanicalRejection) {
            report.mechanical_rejections++;
        }
        if (result.regressionPassed === false) {
            report.semantic_regressions++;
        }
        if (result.overrideApplied) {
            report.overrides++;
        }
    }
    // Save final projections
    for (const [artifactId, artifact] of artifactMap) {
        const md = renderMarkdown(artifact);
        await saveProjection(config.store, artifactId, md);
        report.final_revision_ids[artifactId] = artifact.revision_id;
    }
    // Compute residuals per artifact
    for (const [artifactId, artifact] of artifactMap) {
        const residual = lintArtifact(artifact);
        report.residual_by_artifact[artifactId] = residual.length;
    }
    // Compute cross residuals
    const finalArtifacts = Array.from(artifactMap.values());
    const finalCrossIssues = crossLintArtifacts(finalArtifacts);
    report.cross_residuals = finalCrossIssues.length;
    // Aggregate rejection categories
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
    // P7b-006: Final issue tier stats
    const allFinalLocal = [];
    for (const artifact of finalArtifacts) {
        allFinalLocal.push(...lintArtifact(artifact));
    }
    const allFinalIssues = [...finalCrossIssues, ...allFinalLocal];
    report.issues_by_priority_tier = countByTier(allFinalIssues);
    // skipped_due_to_budget = residual issues that remain after budget exhaustion
    report.skipped_due_to_budget = allFinalIssues.length;
    return report;
}
//# sourceMappingURL=multiArtifactTrialRunner.js.map