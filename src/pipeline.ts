/**
 * Pipeline Orchestrator
 *
 * ref: 执行宪法 v0.2 §15 MVP 工作流
 *
 * STATUS: This orchestrator is demo-oriented.
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

import {
  createArtifact,
  saveRevision,
  loadCanonicalRevision,
  updateCanonicalPointer,
  appendAuditLog,
  saveToQuarantine,
  promoteToEvidence,
  saveProjection,
  loadAuditLog,
  type StoreConfig,
} from "./artifactStore.js";
import { lintArtifact } from "./linter.js";
import { validateSkillOutput } from "./validators.js";
import { compilePatch, applyPatch } from "./applyPatch.js";
import {
  runSemanticRegression,
  buildRegressionInput,
} from "./semanticRegression.js";
import { applyOverridePatch } from "./applyOverridePatch.js";
import { renderMarkdown } from "./renderMarkdown.js";
import { getHashMeta } from "./hash.js";
import { SECTION21_PATCH_TEXT } from "./demo/section21Fixture.js";
import type {
  Artifact,
  Issue,
  PatchProposal,
  ApplyPatchResult,
  SemanticRegressionResult,
  OverridePatch,
  AuditEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Pipeline state (for cockpit consumption)
// ---------------------------------------------------------------------------

export type PipelineState = {
  phase:
    | "idle"
    | "artifact_created"
    | "linting"
    | "issues_found"
    | "patch_proposed"
    | "patch_compiled"
    | "candidate_created"
    | "regression_checking"
    | "regression_passed"
    | "regression_failed"
    | "override_required"
    | "override_applied"
    | "committed";

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

function initialState(): PipelineState {
  return {
    phase: "idle",
    artifact: null,
    candidateRevision: null,
    issues: [],
    validatedIssues: [],
    patchProposal: null,
    patchResult: null,
    regressionResult: null,
    overrideApplied: false,
    auditLog: [],
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

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
 * @param patchTextOverride - Replacement text for the patch.
 *   The §21 default fixture is used only for the known demo artifact.
 *
 * @returns PipelineState with all intermediate results for the cockpit.
 */
export async function runPipeline(
  config: StoreConfig,
  draftArtifact: Artifact,
  patchTextOverride?: string
): Promise<PipelineState> {
  const state = initialState();

  try {
    // ── Step 2-3: Create artifact (save rev_001 + canonical) ──
    state.artifact = await createArtifact(config, draftArtifact);
    state.phase = "artifact_created";

    // ── Step 4: Deterministic Linter ──
    state.phase = "linting";
    const issues = lintArtifact(state.artifact);
    state.issues = issues;

    if (issues.length === 0) {
      state.phase = "committed";
      return state;
    }
    state.phase = "issues_found";

    // ── Step 5: Issues enter quarantine ──
    for (const issue of issues) {
      await saveToQuarantine(config, issue.issue_id, {
        ...issue,
        schema_version: "issue@0.1.0",
      });
    }

    // ── Step 6: Validate and promote to evidence ──
    for (const issue of issues) {
      const issueJson = JSON.stringify({
        ...issue,
        schema_version: "issue@0.1.0",
      });

      const validation = validateSkillOutput(
        issueJson,
        "document_linter",
        "Issue",
        "quarantine",
        state.artifact
      );

      if (validation.status === "validated") {
        await promoteToEvidence(config, issue.issue_id, {
          ...issue,
          schema_version: "issue@0.1.0",
        });
        state.validatedIssues.push(issue);
      }
    }

    if (state.validatedIssues.length === 0) {
      state.phase = "committed";
      return state;
    }

    if (state.validatedIssues.length > 1) {
      state.error =
        "runPipeline demo orchestrator supports exactly one validated issue at a time. " +
        "Use an explicit patch proposal flow for multi-issue artifacts.";
      return state;
    }

    // ── Step 7: Generate PatchProposal ──
    // (In MVP, we simulate a simple Patch Agent that fixes the first issue)
    const firstIssue = state.validatedIssues[0];
    const replacementText = resolvePatchText(state.artifact, patchTextOverride);
    state.patchProposal = {
      proposal_id: `proposal_for_${firstIssue.issue_id}`,
      artifact_id: state.artifact.artifact_id,
      base_revision_id: state.artifact.revision_id,
      source_issue_ids: [firstIssue.issue_id],
      operations: [
        {
          op: "replace_block",
          target_block_id: firstIssue.target_block_id,
          replacement_text: replacementText,
        },
      ],
    };
    state.phase = "patch_proposed";

    // ── Step 8: Host compiles PatchProposal → ArtifactPatch ──
    const artifactPatch = compilePatch(state.patchProposal, state.artifact);
    state.phase = "patch_compiled";

    // ── Step 9: applyPatch creates candidate revision ──
    state.patchResult = applyPatch(state.artifact, artifactPatch);

    if (state.patchResult.status === "rejected") {
      state.error = `Patch rejected: ${state.patchResult.reason} – ${state.patchResult.details}`;
      return state;
    }

    state.candidateRevision = state.patchResult.candidate_revision;
    state.phase = "candidate_created";

    // Save candidate revision
    await saveRevision(config, state.candidateRevision);
    await appendAuditLog(config, {
      entry_id: `audit_patch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      entry_type: "patch_applied",
      artifact_id: state.artifact.artifact_id,
      revision_id: state.candidateRevision.revision_id,
      details: {
        patch_id: artifactPatch.patch_id,
        source_issue_ids: artifactPatch.source_issue_ids,
        operations_count: artifactPatch.operations.length,
        elevated_review:
          state.patchResult.status === "accepted" &&
          state.patchResult.elevated_review_required,
      },
    });

    // ── Step 10: Semantic Regression Gate ──
    state.phase = "regression_checking";

    const oldBlocks = state.artifact.sections.flatMap((s) => s.commitments);
    const newBlocks = state.candidateRevision.sections.flatMap(
      (s) => s.commitments
    );
    const regressionInput = buildRegressionInput(oldBlocks, newBlocks);
    state.regressionResult = runSemanticRegression(regressionInput);

    await appendAuditLog(config, {
      entry_id: `audit_regression_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      entry_type:
        state.regressionResult.status === "passed"
          ? "semantic_regression_passed"
          : "semantic_regression_failed",
      artifact_id: state.artifact.artifact_id,
      revision_id: state.candidateRevision.revision_id,
      details: {
        result: state.regressionResult,
      },
    });

    if (state.regressionResult.status === "passed") {
      // ── Step 11: Commit to canonical ──
      await updateCanonicalPointer(
        config,
        state.artifact.artifact_id,
        state.candidateRevision.revision_id
      );

      await appendAuditLog(config, {
        entry_id: `audit_commit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        entry_type: "canonical_updated",
        artifact_id: state.artifact.artifact_id,
        revision_id: state.candidateRevision.revision_id,
        details: { auto_committed: true },
      });

      const projection = renderMarkdown(state.candidateRevision);
      await saveProjection(
        config,
        state.candidateRevision.artifact_id,
        projection,
      );

      state.phase = "committed";
    } else {
      // ── Step 12: Requires human override ──
      state.phase = "regression_failed";
    }

    // Load final audit log
    state.auditLog = await loadAuditLog(config, state.artifact.artifact_id);

    return state;
  } catch (err) {
    state.error = (err as Error).message;
    return state;
  }
}

function resolvePatchText(
  artifact: Artifact,
  patchTextOverride?: string,
): string {
  if (patchTextOverride) {
    return patchTextOverride;
  }
  if (
    artifact.artifact_id === "arch_001"
    || artifact.artifact_id === "art_section21"
    || artifact.artifact_id === "section21_demo"
  ) {
    return SECTION21_PATCH_TEXT;
  }
  throw new Error(
    "runPipeline requires an explicit patchTextOverride outside the Section 21 demo fixture.",
  );
}

/**
 * Apply a human override to a pipeline that's in regression_failed state.
 *
 * ref: §15 steps 13-14
 */
export async function applyHumanOverride(
  config: StoreConfig,
  state: PipelineState,
  override: OverridePatch
): Promise<PipelineState> {
  if (state.phase !== "regression_failed" || !state.candidateRevision) {
    return {
      ...state,
      error: "Cannot apply override: pipeline is not in regression_failed state",
    };
  }

  const result = await applyOverridePatch(
    config,
    state.candidateRevision,
    override
  );

  if (result.status === "rejected") {
    return {
      ...state,
      error: `Override rejected: ${result.reason}`,
    };
  }

  // Render and save projection
  const md = renderMarkdown(result.new_revision);
  await saveProjection(config, result.new_revision.artifact_id, md);

  // Reload audit log
  const auditLog = await loadAuditLog(
    config,
    result.new_revision.artifact_id
  );

  return {
    ...state,
    phase: "override_applied",
    overrideApplied: true,
    artifact: result.new_revision,
    auditLog,
    error: null,
  };
}

/**
 * Generate cockpit data for the Override Cockpit UI.
 */
export function generateCockpitData(state: PipelineState): Record<string, unknown> {
  return {
    phase: state.phase,
    current_revision: state.artifact?.revision_id ?? null,
    candidate_revision: state.candidateRevision?.revision_id ?? null,
    failed_gates: state.regressionResult?.failed_gates ?? [],
    reasons: state.regressionResult?.reasons ?? [],
    affected_blocks: state.regressionResult?.affected_blocks ?? [],
    issues: state.validatedIssues.map((i) => ({
      issue_id: i.issue_id,
      target_block_id: i.target_block_id,
      issue_type: i.issue_type,
      severity: i.severity,
      message: i.message,
    })),
    diff: state.candidateRevision
      ? {
          old_blocks: state.artifact?.sections.flatMap((s) =>
            s.commitments.map((b) => ({
              block_id: b.block_id,
              text: b.text,
              type: b.type,
            }))
          ),
          new_blocks: state.candidateRevision.sections.flatMap((s) =>
            s.commitments.map((b) => ({
              block_id: b.block_id,
              text: b.text,
              type: b.type,
            }))
          ),
        }
      : null,
    override_applied: state.overrideApplied,
    audit_log: state.auditLog,
    hash_meta: getHashMeta(),
  };
}
