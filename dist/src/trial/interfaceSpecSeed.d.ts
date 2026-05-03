/**
 * Phase 7a InterfaceSpec Seed Artifact
 *
 * ref: P7a-003
 *
 * FROZEN seed for the dual-artifact cross-link trial.
 * Describes Pantheon's own API surface as an InterfaceSpec.
 *
 * Structure: 3 sections, ~20 blocks total.
 *
 * Cross-link design:
 *   - 12 blocks with valid linked_architecture_blocks (referencing b_trial_* from trialArtifact)
 *   - 3 blocks with empty linked_architecture_blocks → orphan_interface_contract
 *   - 2 blocks with stale links to non-existent blocks → stale_link
 *   - 3 clean blocks (non-interface types, no links required)
 *
 * Lint trigger design:
 *   - 2 blocks with undefined backtick terms → undefined_term
 *   - 1 block with "committed instantly" → unsafe_canonical_commit
 *
 * DO NOT MODIFY after initial verification.
 */
import type { Artifact } from "../types.js";
export declare function createInterfaceSpecSeed(): Artifact;
