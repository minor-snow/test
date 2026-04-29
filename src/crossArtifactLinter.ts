/**
 * Cross-Artifact Linter
 *
 * ref: P7a-002
 *
 * Detects cross-artifact integrity issues by examining links between
 * artifacts. Separate from the single-artifact linter (linter.ts).
 *
 * Rules (all deterministic, no LLM):
 *   1. orphan_interface_contract — InterfaceSpec block missing linked_architecture_blocks
 *   2. stale_link — linked_architecture_blocks references a non-existent block
 *
 * Takes an array of artifacts, returns cross-artifact Issue[].
 */

import type { Artifact, CommitmentBlock, Issue, IssueSeverity } from "./types.js";

// ---------------------------------------------------------------------------
// Block index: maps block_id → { artifact_id, block }
// ---------------------------------------------------------------------------

export type CrossBlockEntry = {
  artifact_id: string;
  block: CommitmentBlock;
  section_id: string;
};

/**
 * Build a global block index across all artifacts.
 */
export function buildCrossBlockIndex(
  artifacts: Artifact[]
): Map<string, CrossBlockEntry> {
  const index = new Map<string, CrossBlockEntry>();
  for (const artifact of artifacts) {
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        index.set(block.block_id, {
          artifact_id: artifact.artifact_id,
          block,
          section_id: section.section_id,
        });
      }
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Helper: create Issue
// ---------------------------------------------------------------------------

let crossIssueSeq = 0;

function crossIssue(
  artifactId: string,
  revisionId: string,
  blockId: string,
  issueType: string,
  severity: IssueSeverity,
  message: string
): Issue {
  crossIssueSeq++;
  return {
    issue_id: `cross_issue_${String(crossIssueSeq).padStart(3, "0")}`,
    artifact_id: artifactId,
    base_revision_id: revisionId,
    target_block_id: blockId,
    issue_type: issueType,
    severity,
    message,
  };
}

// ---------------------------------------------------------------------------
// Rule 1: orphan_interface_contract
// ---------------------------------------------------------------------------

/**
 * InterfaceSpec blocks with type "interface" should have
 * linked_architecture_blocks pointing to at least one ArchitectureDraft block.
 * Missing or empty links indicate an orphan contract.
 */
function checkOrphanInterfaceContracts(artifacts: Artifact[]): Issue[] {
  const issues: Issue[] = [];

  for (const artifact of artifacts) {
    if (artifact.artifact_type !== "InterfaceSpec") continue;

    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        if (block.type !== "interface") continue;

        const links = block.linked_architecture_blocks;
        if (!links || links.length === 0) {
          issues.push(
            crossIssue(
              artifact.artifact_id,
              artifact.revision_id,
              block.block_id,
              "orphan_interface_contract",
              "medium",
              `Interface block "${block.block_id}" has no linked_architecture_blocks. ` +
                `Every interface contract should trace to at least one architecture commitment.`
            )
          );
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 2: stale_link
// ---------------------------------------------------------------------------

/**
 * Any block with linked_architecture_blocks that reference a block_id
 * not found in any ArchitectureDraft artifact.
 */
function checkStaleLinks(
  artifacts: Artifact[],
  globalIndex: Map<string, CrossBlockEntry>
): Issue[] {
  const issues: Issue[] = [];

  // Collect all block_ids that belong to ArchitectureDraft artifacts
  const archBlockIds = new Set<string>();
  for (const artifact of artifacts) {
    if (artifact.artifact_type !== "ArchitectureDraft") continue;
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        archBlockIds.add(block.block_id);
      }
    }
  }

  // Check all artifacts for stale links
  for (const artifact of artifacts) {
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        const links = block.linked_architecture_blocks;
        if (!links || links.length === 0) continue;

        for (const linkedId of links) {
          if (!archBlockIds.has(linkedId)) {
            issues.push(
              crossIssue(
                artifact.artifact_id,
                artifact.revision_id,
                block.block_id,
                "stale_link",
                "high",
                `Block "${block.block_id}" references architecture block "${linkedId}" ` +
                  `which does not exist in any ArchitectureDraft artifact.`
              )
            );
          }
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 3: orphan_module_contract (P7b)
// ---------------------------------------------------------------------------

/**
 * ModuleSpec blocks with type "interface" or "mechanism" should have
 * linked_interface_blocks pointing to at least one InterfaceSpec block.
 * Missing or empty links indicate an orphan module contract.
 */
function checkOrphanModuleContracts(artifacts: Artifact[]): Issue[] {
  const issues: Issue[] = [];

  for (const artifact of artifacts) {
    if (artifact.artifact_type !== "ModuleSpec") continue;

    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        if (block.type !== "interface" && block.type !== "mechanism") continue;

        const links = block.linked_interface_blocks;
        if (!links || links.length === 0) {
          issues.push(
            crossIssue(
              artifact.artifact_id,
              artifact.revision_id,
              block.block_id,
              "orphan_module_contract",
              "medium",
              `Module block "${block.block_id}" has no linked_interface_blocks. ` +
                `Every module interface/mechanism should trace to at least one interface contract.`
            )
          );
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule 4: stale_interface_link (P7b)
// ---------------------------------------------------------------------------

/**
 * Any block with linked_interface_blocks that reference a block_id
 * not found in any InterfaceSpec artifact.
 */
function checkStaleInterfaceLinks(artifacts: Artifact[]): Issue[] {
  const issues: Issue[] = [];

  // Collect all block_ids that belong to InterfaceSpec artifacts
  const ifaceBlockIds = new Set<string>();
  for (const artifact of artifacts) {
    if (artifact.artifact_type !== "InterfaceSpec") continue;
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        ifaceBlockIds.add(block.block_id);
      }
    }
  }

  // Check all artifacts for stale interface links
  for (const artifact of artifacts) {
    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        const links = block.linked_interface_blocks;
        if (!links || links.length === 0) continue;

        for (const linkedId of links) {
          if (!ifaceBlockIds.has(linkedId)) {
            issues.push(
              crossIssue(
                artifact.artifact_id,
                artifact.revision_id,
                block.block_id,
                "stale_interface_link",
                "high",
                `Block "${block.block_id}" references interface block "${linkedId}" ` +
                  `which does not exist in any InterfaceSpec artifact.`
              )
            );
          }
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all cross-artifact lint rules across a set of artifacts.
 * Returns Issue[] with artifact_id set to the artifact containing the problem.
 */
export function crossLintArtifacts(artifacts: Artifact[]): Issue[] {
  // Reset issue counter for deterministic IDs within a single call
  crossIssueSeq = 0;

  const globalIndex = buildCrossBlockIndex(artifacts);

  return [
    ...checkOrphanInterfaceContracts(artifacts),
    ...checkStaleLinks(artifacts, globalIndex),
    ...checkOrphanModuleContracts(artifacts),
    ...checkStaleInterfaceLinks(artifacts),
  ];
}
