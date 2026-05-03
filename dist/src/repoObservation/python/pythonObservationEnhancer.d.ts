/**
 * P25a: Python Observation Enhancer (Orchestrator)
 *
 * Sidecar enhancer that runs all Python observation sub-modules
 * on top of existing RepoObservations, producing python_observations.json.
 *
 * Does NOT modify scanner. Does NOT add to RepoObservations.
 * The sidecar is a standalone artifact.
 */
import type { RepoObservations } from "../types.js";
import type { PythonObservationSidecar, PythonObservationConfig } from "./types.js";
export declare function enhanceWithPythonObservations(observations: RepoObservations, repoRoot: string, config?: PythonObservationConfig): PythonObservationSidecar;
