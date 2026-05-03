/**
 * P20a.2: Repo Scanner Orchestrator
 *
 * Enumerates files, applies limits/exclusions, calls all sub-modules,
 * classifies package imports via manifests, computes quality metrics,
 * collects git status, computes observation hash.
 */
import type { RepoObservations, RepoObservationConfig } from "./types.js";
export declare function scanRepo(input: {
    repoRoot: string;
    config?: RepoObservationConfig;
}): RepoObservations;
