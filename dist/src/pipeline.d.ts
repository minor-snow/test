/**
 * Pipeline Orchestrator
 *
 * ref: 执行宪法 v0.2 §15 MVP 工作流
 *
 * STATUS: This is a GENERAL-PURPOSE orchestrator.
 * For the §21 demo runner, see src/demo/runDemo.ts.
 *
 * Ties together all modules into the canonical workflow:
 *
 *   1. Human writes idea
 *   2. Draft Agent generates JSON Artifact
 *   3. Artifact enters revisions as rev_001
 *   4. Deterministic Linter generates Issue
 *   5. Issue enters quarantine
 *   6. Validator promotes Issue to evidence
 *   7. Patch Agent generates PatchProposal
 *   8. Host compiles PatchProposal into ArtifactPatch
 *   9. applyPatch creates candidate revision
 *  10. Semantic Regression Gate checks candidate
 *  11. If passed, commit to canonical
 *  12. If failed, Human Override Cockpit handles it
 *  13. OverridePatch creates new revision
 *  14. canonical pointer updates
 */
import { type StoreConfig } from "./artifactStore.js";
import type { Artifact, Issue, PatchProposal, ApplyPatchResult, SemanticRegressionResult, OverridePatch, AuditEntry } from "./types.js";
export type PipelineState = {
    phase: "idle" | "artifact_created" | "linting" | "issues_found" | "patch_proposed" | "patch_compiled" | "candidate_created" | "regression_checking" | "regression_passed" | "regression_failed" | "override_required" | "override_applied" | "committed";
    artifact: Artifact | null;
    candidateRevision: Artifact | null;
    issues: Issue[];
    validatedIssues: Issue[];
    patchProposal: PatchProposal | null;
    patchResult: ApplyPatchResult | null;
    regressionResult: SemanticRegressionResult | null;
    overrideApplied: boolean;
    auditLog: AuditEntry[];
    error: string | null;
};
/**
 * Run the full Pantheon pipeline on a draft artifact.
 *
 * ref: §15 — the 14-step MVP workflow.
 *
 * This function runs steps 1-10 (up to semantic regression).
 * If regression fails, the pipeline halts for human override.
 *
 * @param config - Store configuration
 * @param draftArtifact - The artifact to process
 * @param patchTextOverride - Optional replacement text for the patch.
 *   If not provided, uses the §21 default (SECTION21_PATCH_TEXT).
 *   Future: this parameter will be replaced by a real Patch Agent.
 *
 * @returns PipelineState with all intermediate results for the cockpit.
 */
export declare function runPipeline(config: StoreConfig, draftArtifact: Artifact, patchTextOverride?: string): Promise<PipelineState>;
/**
 * Apply a human override to a pipeline that's in regression_failed state.
 *
 * ref: §15 steps 13-14
 */
export declare function applyHumanOverride(config: StoreConfig, state: PipelineState, override: OverridePatch): Promise<PipelineState>;
/**
 * Generate cockpit data for the Override Cockpit UI.
 */
export declare function generateCockpitData(state: PipelineState): Record<string, unknown>;
