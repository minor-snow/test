/**
 * P30: Architecture Evidence Aligner
 *
 * Aligns extracted architecture claims with repository evidence.
 * Uses existing repoObservation capabilities (path existence, directory matching,
 * test mapping, manifest matching, config hints).
 *
 * Conservative: only produces evidence types with clear structural backing.
 * No import_hint in MVP to avoid "seems to understand dependency graph" overclaim.
 *
 * ref: P30
 */
import type { ArchitectureClaim, ArchitectureEvidenceCandidate } from "./types.js";
import type { RepoObservations } from "../repoObservation/types.js";
/**
 * For each claim, search the repository observations for supporting evidence.
 * Returns a flat array of evidence candidates linked to their source claims.
 */
export declare function alignArchitectureEvidence(claims: readonly ArchitectureClaim[], observations: RepoObservations): ArchitectureEvidenceCandidate[];
