/**
 * Implementation Task Projector — Deterministic task definitions
 *
 * ref: P11a-006
 *
 * Tasks are 100% deterministic. No LLM generation.
 * Each task has source blocks, acceptance criteria, and required tests.
 */
import type { Artifact } from "../types.js";
import type { ImplementationTask } from "./types.js";
export declare function projectImplementationTasks(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): ImplementationTask[];
