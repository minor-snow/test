/**
 * Conflict Policy Matrix Projector — Deterministic field-level strategy
 *
 * ref: P11a-003
 *
 * Rules:
 *   - Clinical/case/vet fields → vector_clock
 *   - Metadata/UI fields → last_writer_wins
 *   - sync_cursor → server_token
 *   - retry_attempt_count → local_only
 *   - conflict-sensitive fields → audit_required = true
 *   - Every entry has source block provenance
 */
import type { Artifact } from "../types.js";
import type { ConflictPolicyEntry } from "./types.js";
export type ConflictProjectionResult = {
    matrix: ConflictPolicyEntry[];
    field_groups_covered: number;
    field_groups_total: number;
    clinical_lww_violations: string[];
};
export declare function projectConflictPolicyMatrix(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): ConflictProjectionResult;
