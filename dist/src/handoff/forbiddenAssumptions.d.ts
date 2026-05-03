/**
 * Forbidden Assumptions Projector — Deterministic invariants
 *
 * ref: P11a-007
 *
 * These are hard constraints that implementers MUST NOT violate.
 * Each one references source blocks from P10 artifacts.
 */
import type { Artifact } from "../types.js";
import type { ForbiddenAssumption } from "./types.js";
export declare function projectForbiddenAssumptions(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): ForbiddenAssumption[];
