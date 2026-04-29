/**
 * Phase 3 Trial Artifact — Pantheon ArchitectureDraft
 *
 * ref: P3-001
 *
 * This is the FROZEN seed artifact for the Phase 3 real-artifact trial.
 * It describes Pantheon's own architecture as a real ArchitectureDraft.
 *
 * Structure: 6 sections, 36 blocks total.
 *
 * Linter trigger design (intentionally planted, marked with LINT-TRIGGER):
 *   - 4 blocks contain "committed instantly" → unsafe_canonical_commit
 *   - 4 blocks reference undefined backtick terms → undefined_term
 *   - 2 blocks have empty text → empty_block_text
 *   - All remaining blocks are clean, real architecture descriptions.
 *
 * DO NOT MODIFY after initial verification.
 * Any changes to the trial artifact invalidate the trial baseline.
 */
import type { Artifact } from "../types.js";
export declare function createTrialArtifact(): Artifact;
