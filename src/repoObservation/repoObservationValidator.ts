/**
 * P20a: Repo Observation Validator
 *
 * Validates structural integrity of RepoObservations.
 * Rejects absolute paths, escaping paths, llm_used: true.
 * Verifies observation_hash recomputes correctly.
 */

import type { RepoObservations, RepoObservationValidationResult } from "./types.js";
import { isRepoRelativePath } from "./pathUtils.js";
import { computeObservationHash } from "./observationHasher.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateRepoObservations(obs: RepoObservations): RepoObservationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema version
  if (obs.schema_version !== "repo_observations.v1") {
    errors.push(`Invalid schema_version: ${obs.schema_version}`);
  }

  // Repo meta
  if (!obs.repo) {
    errors.push("Missing repo meta");
  } else {
    const validStates = ["git_clean", "git_dirty", "working_tree_only"];
    if (!validStates.includes(obs.repo.repo_state)) {
      errors.push(`Invalid repo_state: ${obs.repo.repo_state}`);
    }
    if (!("head_commit_hash" in obs.repo)) {
      errors.push("Missing head_commit_hash field");
    }
    if (!("has_uncommitted_changes" in obs.repo)) {
      errors.push("Missing has_uncommitted_changes field");
    }
    if (!("uncommitted_file_count" in obs.repo)) {
      errors.push("Missing uncommitted_file_count field");
    }
  }

  // Scanner meta
  if (obs.scanner.llm_used !== false) {
    errors.push("scanner.llm_used must be false in P20a");
  }

  // File paths must be repo-relative POSIX
  for (const file of obs.observations.files) {
    if (!isRepoRelativePath(file.path)) {
      errors.push(`File path is not repo-relative POSIX: ${file.path}`);
    }
  }

  // Import edges
  for (const edge of obs.observations.import_edges) {
    if (!isRepoRelativePath(edge.from_file)) {
      errors.push(`Import edge from_file is not repo-relative: ${edge.from_file}`);
    }
    if (!edge.raw_specifier) {
      errors.push(`Import edge missing raw_specifier from ${edge.from_file}`);
    }
  }

  // Sensitive paths evidence
  for (const sp of obs.observations.sensitive_paths) {
    if (!sp.evidence || sp.evidence.length === 0) {
      errors.push(`Sensitive path ${sp.path} missing evidence`);
    }
  }

  // Owner hints evidence
  for (const oh of obs.observations.owner_hints) {
    if (!oh.evidence || oh.evidence.length === 0) {
      errors.push(`Owner hint ${oh.path_pattern} missing evidence`);
    }
  }

  // Non-empty files unless partial_scan
  if (obs.observations.files.length === 0 && !obs.meta.partial_scan) {
    errors.push("observations.files is empty but partial_scan is false");
  }

  // Unknowns exists
  if (!obs.unknowns) {
    errors.push("Missing unknowns");
  }

  // Excluded exists
  if (!obs.excluded) {
    errors.push("Missing excluded");
  }

  // Meta fields
  if (!obs.meta.observation_hash) {
    errors.push("Missing observation_hash");
  }
  if (!("partial_scan" in obs.meta)) {
    errors.push("Missing partial_scan");
  }

  // Observation hash integrity
  if (obs.meta.observation_hash) {
    const recomputed = computeObservationHash(obs);
    if (recomputed !== obs.meta.observation_hash) {
      errors.push(`observation_hash mismatch: stored=${obs.meta.observation_hash}, computed=${recomputed}`);
    }
  }

  // Excluded path validation
  for (const ex of obs.excluded) {
    if (!isRepoRelativePath(ex.path)) {
      errors.push(`Excluded path is not repo-relative: ${ex.path}`);
    }
  }

  return {
    status: errors.length === 0 ? "valid" : "invalid",
    errors,
    warnings,
  };
}
