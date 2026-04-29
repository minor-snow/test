/**
 * ModuleSpec Seed Artifact
 *
 * ref: P7b-002
 *
 * 20 blocks across 3 sections describing module-level specifications.
 * Contains a mix of:
 *   - Valid linked_interface_blocks + linked_architecture_blocks
 *   - Orphan blocks (missing interface links)
 *   - Stale links (nonexistent interface block IDs)
 *   - Local lint triggers (undefined_term, domain_irrelevant, unsafe_canonical)
 */

import type { Artifact, CommitmentBlock, ArtifactSection } from "../types.js";
import { computeBlockContentHash, computeRevisionId } from "../hash.js";

function makeBlock(
  id: string,
  type: CommitmentBlock["type"],
  text: string,
  opts?: {
    terms?: string[];
    linked_architecture_blocks?: string[];
    linked_interface_blocks?: string[];
  }
): CommitmentBlock {
  const block: CommitmentBlock = {
    block_id: id,
    type,
    text,
    terms: opts?.terms,
    linked_architecture_blocks: opts?.linked_architecture_blocks,
    linked_interface_blocks: opts?.linked_interface_blocks,
    status: "approved",
    content_hash: "",
  };
  block.content_hash = computeBlockContentHash(block);
  return block;
}

export function createModuleSpecSeed(): Artifact {
  // Section 1: Module Dependencies (7 blocks)
  const sec1: ArtifactSection = {
    section_id: "module_dependencies",
    title: "Module Dependencies",
    commitments: [
      makeBlock(
        "b_mod_001", "mechanism",
        "The linter module imports type definitions from the core types module and produces Issue arrays without side effects.",
        { terms: ["linter", "issue"], linked_interface_blocks: ["b_iface_001"], linked_architecture_blocks: ["b_trial_001"] }
      ),
      makeBlock(
        "b_mod_002", "mechanism",
        "The hash module depends only on the stable serializer and Node.js crypto, ensuring deterministic output across platforms.",
        { terms: ["hash", "stable_serializer"], linked_interface_blocks: ["b_iface_003"], linked_architecture_blocks: ["b_trial_004"] }
      ),
      makeBlock(
        "b_mod_003", "constraint",
        "The artifact store module must not import from the linter or patch modules to prevent circular dependencies.",
        { terms: ["artifact_store"], linked_interface_blocks: ["b_iface_005"], linked_architecture_blocks: ["b_trial_008"] }
      ),
      makeBlock(
        "b_mod_004", "mechanism",
        "The schema registry module provides Zod validators and is imported by the validator module for gate enforcement.",
        { terms: ["schema_registry", "validator"], linked_interface_blocks: ["b_iface_004"] }
      ),
      makeBlock(
        "b_mod_005", "constraint",
        "All cross-module imports must use explicit `.js` extensions for ESM compatibility.",
        { terms: ["esm"] }
      ),
      // Orphan: no interface links on a mechanism block
      makeBlock(
        "b_mod_006", "mechanism",
        "The render module converts artifact JSON into human-readable markdown for projection storage.",
        { terms: ["render", "projection"] }
      ),
      // Orphan: no interface links
      makeBlock(
        "b_mod_007", "mechanism",
        "The semantic regression module compares old and new block arrays to detect meaning loss during patch application.",
        { terms: ["semantic_regression"] }
      ),
    ],
  };

  // Section 2: Module Exports (7 blocks)
  const sec2: ArtifactSection = {
    section_id: "module_exports",
    title: "Module Exports",
    commitments: [
      makeBlock(
        "b_mod_008", "interface",
        "The linter module exports a single public function `lintArtifact` that returns Issue arrays.",
        { terms: ["linter", "lint_artifact"], linked_interface_blocks: ["b_iface_001"], linked_architecture_blocks: ["b_trial_010"] }
      ),
      makeBlock(
        "b_mod_009", "interface",
        "The apply patch module exports `compilePatch` and `applyPatch` as separate functions for testability.",
        { terms: ["compile_patch", "apply_patch"], linked_interface_blocks: ["b_iface_008"] }
      ),
      makeBlock(
        "b_mod_010", "interface",
        "The integrity check module exports a single `integrityCheck` function that scans all store artifacts.",
        { terms: ["integrity_check"], linked_interface_blocks: ["b_iface_009"], linked_architecture_blocks: ["b_trial_020"] }
      ),
      // Stale interface link
      makeBlock(
        "b_mod_011", "interface",
        "The report generator module exports `generateReportFromStore` for single-artifact and `generateMultiArtifactReport` for multi-artifact reports.",
        { terms: ["report_generator"], linked_interface_blocks: ["b_iface_nonexistent_001"] }
      ),
      // Stale interface link
      makeBlock(
        "b_mod_012", "interface",
        "The backlog export module exports `generateBacklogItems` and `exportBacklogMarkdown` for operator workflow.",
        { terms: ["backlog_export"], linked_interface_blocks: ["b_iface_phantom_api"] }
      ),
      // undefined_term trigger
      makeBlock(
        "b_mod_013", "mechanism",
        "The `crossArtifactLinter` produces cross-issue arrays that feed into the `issuePrioritizer` queue.",
        { linked_interface_blocks: ["b_iface_002"] }
      ),
      makeBlock(
        "b_mod_014", "constraint",
        "No module may export mutable state. All exports must be functions or readonly type definitions.",
        { terms: ["export"] }
      ),
    ],
  };

  // Section 3: Module Internals (6 blocks)
  const sec3: ArtifactSection = {
    section_id: "module_internals",
    title: "Module Internals",
    commitments: [
      makeBlock(
        "b_mod_015", "invariant",
        "Every public function in the linter module must be a pure function with no side effects.",
        { terms: ["linter", "pure_function"] }
      ),
      // unsafe_canonical_commit trigger
      makeBlock(
        "b_mod_016", "mechanism",
        "The fast-path validator committed instantly to avoid gate latency on trivial patches.",
      ),
      // domain_irrelevant trigger
      makeBlock(
        "b_mod_017", "mechanism",
        "The weather forecast integration provides atmospheric data for ambient display widgets.",
      ),
      makeBlock(
        "b_mod_018", "constraint",
        "Internal helper functions must be prefixed with underscore and not exported from the module boundary.",
        { terms: ["helper", "module"] }
      ),
      // undefined_term triggers
      makeBlock(
        "b_mod_019", "mechanism",
        "The `stableSerialize` function ensures deterministic JSON output by sorting keys recursively before hashing.",
      ),
      // Orphan: mechanism with no links
      makeBlock(
        "b_mod_020", "mechanism",
        "The override patch module allows human operators to bypass failed gates with explicit rationale and risk acceptance.",
        { terms: ["override_patch", "gate"] }
      ),
    ],
  };

  const sections = [sec1, sec2, sec3];

  const artifact: Artifact = {
    artifact_id: "pantheon_module",
    artifact_type: "ModuleSpec",
    schema_version: "module_spec@0.1.0",
    revision_id: "", // computed below
    sections,
    metadata: {
      created_by: "trial_seed",
      created_at: "2025-01-01T00:00:00Z",
      tags: ["p7b", "module_spec", "trial"],
    },
  };

  artifact.revision_id = computeRevisionId(artifact);
  return artifact;
}
