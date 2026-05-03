/**
 * P20a.2: Observation Quality Metrics
 *
 * Computes quality metrics and unknown taxonomy from repo observations.
 * Splits unknowns into three categories:
 *   - out_of_scope: unsupported files/languages (scanner can't help)
 *   - actionable: unmapped sources, undeclared packages (user can fix)
 *   - intrinsic: dynamic imports, large files (deterministic scanner limit)
 */
import type { RepoObservations, RepoObservationQuality } from "./types.js";
/**
 * Compute quality metrics from observations.
 * Call after unknowns are populated but before hash computation.
 */
export declare function computeObservationQuality(obs: RepoObservations): RepoObservationQuality;
/**
 * Generate operator-facing recommendations based on quality metrics.
 */
export declare function generateObservationRecommendations(input: {
    quality: RepoObservationQuality;
}): string[];
