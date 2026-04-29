/**
 * P20a: Observation Hash
 *
 * Computes a deterministic hash over the full observation content.
 * Excludes: scanned_at, absolute repo_root, meta.observation_hash.
 * Includes: scanner_version, limits, observations, unknowns, excluded,
 *           meta.partial_scan, meta.file_count, meta.unknown_count,
 *           meta.excluded_count, repo_state, head_commit_hash,
 *           has_uncommitted_changes, uncommitted_file_count.
 *
 * All arrays sorted before hash for order-independence.
 */
import type { RepoObservations } from "./types.js";
/**
 * Compute the observation hash for a set of repo observations.
 *
 * The hash is deterministic: identical observations produce identical hashes
 * regardless of array ordering, absolute repo root, or scan timestamp.
 */
export declare function computeObservationHash(obs: RepoObservations): string;
