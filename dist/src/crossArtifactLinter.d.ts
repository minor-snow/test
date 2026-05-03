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
import type { Artifact, CommitmentBlock, Issue } from "./types.js";
export type CrossBlockEntry = {
    artifact_id: string;
    block: CommitmentBlock;
    section_id: string;
};
/**
 * Build a global block index across all artifacts.
 */
export declare function buildCrossBlockIndex(artifacts: Artifact[]): Map<string, CrossBlockEntry>;
/**
 * Run all cross-artifact lint rules across a set of artifacts.
 * Returns Issue[] with artifact_id set to the artifact containing the problem.
 */
export declare function crossLintArtifacts(artifacts: Artifact[]): Issue[];
