/**
 * P20a: Repo Observation Validator
 *
 * Validates structural integrity of RepoObservations.
 * Rejects absolute paths, escaping paths, llm_used: true.
 * Verifies observation_hash recomputes correctly.
 */
import type { RepoObservations, RepoObservationValidationResult } from "./types.js";
export declare function validateRepoObservations(obs: RepoObservations): RepoObservationValidationResult;
