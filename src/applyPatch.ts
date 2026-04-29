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

import { computeBlockContentHash, computeRevisionId } from "./hash.js";
import type {
  Artifact,
  ArtifactPatch,
  ArtifactSection,
  CommitmentBlock,
  PatchProposal,
  PatchIntent,
  ReplaceBlockOperation,
  ApplyPatchResult,
  PatchRejectReason,
} from "./types.js";

// ---------------------------------------------------------------------------
// Block index helpers
// ---------------------------------------------------------------------------

type BlockLocation = {
  section_index: number;
  section_id: string;
  block_index: number;
  block: CommitmentBlock;
};

/**
 * Build a lookup index: block_id → location in the artifact.
 */
function buildBlockIndex(artifact: Artifact): Map<string, BlockLocation> {
  const index = new Map<string, BlockLocation>();
  for (let si = 0; si < artifact.sections.length; si++) {
    const section = artifact.sections[si];
    for (let bi = 0; bi < section.commitments.length; bi++) {
      const block = section.commitments[bi];
      index.set(block.block_id, {
        section_index: si,
        section_id: section.section_id,
        block_index: bi,
        block,
      });
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// compilePatch  – ref: §10.3
// ---------------------------------------------------------------------------

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
export function compilePatch(
  proposal: PatchProposal,
  artifact: Artifact
): ArtifactPatch {
  const blockIndex = buildBlockIndex(artifact);
  const operations: ReplaceBlockOperation[] = [];

  for (const intent of proposal.operations) {
    if (intent.op !== "replace_block") {
      throw new Error(
        `Unsupported PatchOp in MVP: "${intent.op}". Only "replace_block" is implemented.`
      );
    }

    const location = blockIndex.get(intent.target_block_id);
    if (!location) {
      throw new Error(
        `compilePatch: target_block_id "${intent.target_block_id}" not found in artifact "${artifact.artifact_id}"`
      );
    }

    const oldBlock = location.block;

    // Construct new block: preserve structure, update text
    const newBlock: CommitmentBlock = {
      block_id: oldBlock.block_id,
      type: oldBlock.type,
      text: intent.replacement_text,
      rationale: oldBlock.rationale,
      terms: oldBlock.terms,
      // P7a: propagate cross-links from PatchIntent, or preserve existing
      linked_architecture_blocks:
        intent.replacement_linked_architecture_blocks ?? oldBlock.linked_architecture_blocks,
      // P7b: propagate interface links from PatchIntent, or preserve existing
      linked_interface_blocks:
        intent.replacement_linked_interface_blocks ?? oldBlock.linked_interface_blocks,
      status: oldBlock.status,
      content_hash: "", // will be computed below
    };
    newBlock.content_hash = computeBlockContentHash(newBlock);

    operations.push({
      op: "replace_block",
      target_block_id: intent.target_block_id,
      expected_old_hash: oldBlock.content_hash,
      new_block: newBlock,
    });
  }

  return {
    patch_id: `patch_${proposal.proposal_id}`,
    artifact_id: proposal.artifact_id,
    base_revision_id: proposal.base_revision_id,
    source_issue_ids: proposal.source_issue_ids,
    operations,
  };
}

// ---------------------------------------------------------------------------
// applyPatch  – ref: §11
// ---------------------------------------------------------------------------

/**
 * Helper to create a rejection result.
 */
function reject(reason: PatchRejectReason, details: string): ApplyPatchResult {
  return { status: "rejected", reason, details };
}

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
export function applyPatch(
  artifact: Artifact,
  patch: ArtifactPatch
): ApplyPatchResult {
  // §11.1: artifact_id must match
  if (patch.artifact_id !== artifact.artifact_id) {
    return reject(
      "ARTIFACT_ID_MISMATCH",
      `Patch targets "${patch.artifact_id}" but artifact is "${artifact.artifact_id}"`
    );
  }

  // §11.2: base_revision_id must match
  if (patch.base_revision_id !== artifact.revision_id) {
    return reject(
      "BASE_REVISION_MISMATCH",
      `Patch base "${patch.base_revision_id}" does not match artifact revision "${artifact.revision_id}"`
    );
  }

  const blockIndex = buildBlockIndex(artifact);

  // §11.6: all operations must be in the same section
  const sectionIds = new Set<string>();
  for (const op of patch.operations) {
    const location = blockIndex.get(op.target_block_id);
    if (!location) {
      // §11.3: target_block_id must exist
      return reject(
        "TARGET_BLOCK_NOT_FOUND",
        `Block "${op.target_block_id}" does not exist in artifact`
      );
    }
    sectionIds.add(location.section_id);
  }

  if (sectionIds.size > 1) {
    return reject(
      "CROSS_SECTION_OPERATIONS",
      `Patch operations span ${sectionIds.size} sections: [${[...sectionIds].join(", ")}]. ` +
        `All operations must be within the same section.`
    );
  }

  // §11.4: expected_old_hash must match
  for (const op of patch.operations) {
    const location = blockIndex.get(op.target_block_id)!;
    if (op.expected_old_hash !== location.block.content_hash) {
      return reject(
        "HASH_MISMATCH",
        `Block "${op.target_block_id}": expected hash "${op.expected_old_hash}" ` +
          `but current hash is "${location.block.content_hash}"`
      );
    }
  }

  // §11.8: verify new_block content_hash is correct
  for (const op of patch.operations) {
    const expectedHash = computeBlockContentHash(op.new_block);
    if (op.new_block.content_hash !== expectedHash) {
      return reject(
        "NEW_BLOCK_HASH_INVALID",
        `Block "${op.target_block_id}": new_block content_hash "${op.new_block.content_hash}" ` +
          `does not match computed hash "${expectedHash}"`
      );
    }
  }

  // §11.5: elevated_review_required flag (not rejection)
  const elevatedReview = patch.operations.length > 3;

  // --- All checks passed: build candidate revision ---

  // Deep clone sections and apply replacements
  const newSections: ArtifactSection[] = artifact.sections.map((section) => ({
    ...section,
    commitments: section.commitments.map((block) => {
      const op = patch.operations.find(
        (o) => o.target_block_id === block.block_id
      );
      if (op) {
        return { ...op.new_block };
      }
      return { ...block };
    }),
  }));

  // Build candidate artifact
  const candidate: Artifact = {
    ...artifact,
    parent_revision_id: artifact.revision_id,
    sections: newSections,
    metadata: {
      ...artifact.metadata,
      updated_at: new Date().toISOString(),
    },
  };

  // Compute new revision_id from content
  candidate.revision_id = computeRevisionId(candidate);

  return {
    status: "accepted",
    candidate_revision: candidate,
    elevated_review_required: elevatedReview,
  };
}
