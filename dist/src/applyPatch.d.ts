/**
 * Patch System
 *
 * ref: 执行宪法 v0.2 §10, §11
 *
 * Two main functions:
 *
 *   compilePatch(proposal, artifact)
 *     PatchProposal → ArtifactPatch
 *     Host code fills expected_old_hash and constructs new_block.
 *     LLM never generates ArtifactPatch directly. (ref: §10.3)
 *
 *   applyPatch(artifact, patch)
 *     ArtifactPatch → candidate revision | rejection
 *     Pure deterministic function. (ref: §11, C-07)
 *
 * Design:
 *   - applyPatch only guarantees physical correctness (ref: C-07)
 *   - Semantic correctness is checked by Semantic Regression Gate (§12)
 *   - Operations > 3 are not rejected, but flagged elevated_review_required (ref: §11.5)
 *   - All operations must be within the same section (ref: §11.6)
 */
import type { Artifact, ArtifactPatch, PatchProposal, ApplyPatchResult } from "./types.js";
/**
 * Compile a PatchProposal into an ArtifactPatch.
 *
 * ref: §10.3 — "ArtifactPatch 由宿主代码从 PatchProposal 编译生成。LLM 不直接生成 ArtifactPatch。"
 *
 * This function:
 *   1. Resolves each PatchIntent.target_block_id against the artifact.
 *   2. Fills expected_old_hash from the current block.
 *   3. Constructs the new CommitmentBlock with updated text and computed hash.
 *   4. Returns a fully-formed ArtifactPatch ready for applyPatch().
 *
 * @throws if a target_block_id is not found in the artifact.
 */
export declare function compilePatch(proposal: PatchProposal, artifact: Artifact): ArtifactPatch;
/**
 * Apply an ArtifactPatch to an artifact, producing a candidate revision.
 *
 * ref: §11 — applyPatch is a pure deterministic function.
 * ref: C-07 — It only guarantees physical correctness.
 *
 * Checks (in order):
 *   1. artifact_id match
 *   2. base_revision_id match
 *   3. target_block_id exists
 *   4. expected_old_hash match
 *   5. operations > 3 → flag elevated_review_required (not reject)
 *   6. operations in same section
 *   7. new_block content_hash correct
 *
 * On success: returns candidate revision with new revision_id.
 * On failure: returns rejection with reason.
 */
export declare function applyPatch(artifact: Artifact, patch: ArtifactPatch): ApplyPatchResult;
