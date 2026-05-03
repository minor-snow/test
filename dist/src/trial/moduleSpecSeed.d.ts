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
import type { Artifact } from "../types.js";
export declare function createModuleSpecSeed(): Artifact;
