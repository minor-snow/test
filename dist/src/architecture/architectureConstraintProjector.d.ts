/**
 * P30: Architecture Constraint Projector
 *
 * Projects architecture constraints into ChangeScopeEntry[] format
 * for injection into the change/repair scope builders.
 *
 * CRITICAL INVARIANTS:
 *
 * Invariant A — Contextual ownership:
 *   owns/located_at/allowed_change are NOT global allowed.
 *   They are projected as "allowed" ONLY when the change/repair target
 *   subject matches the owning module. Otherwise they produce
 *   "architecture_scope_crossed" findings.
 *
 * Invariant B — Architecture constraints cannot be downgraded:
 *   The scope builder MUST apply bucket precedence (forbidden > review > allowed)
 *   AFTER merging architecture constraints. Architecture forbidden cannot be
 *   overridden by user intent.
 *
 * ref: P30
 */
import type { ArchitectureContract } from "./types.js";
export type ArchitectureScopeEntry = {
    readonly path_pattern: string;
    readonly bucket: "allowed" | "review_required" | "forbidden";
    readonly reason_kind: "architecture_boundary" | "architecture_forbidden" | "architecture_review";
    readonly rationale: string;
    readonly source: "architecture_contract";
    readonly constraint_id: string;
    readonly subject: string;
};
export type ProjectArchitectureConstraintsInput = {
    /** The active architecture contract */
    readonly contract: ArchitectureContract;
    /** The declared change/repair target subjects (module names or path patterns) */
    readonly targetSubjects: readonly string[];
    /** The declared change/repair target path patterns */
    readonly targetPathPatterns: readonly string[];
};
/**
 * Project architecture constraints into scope entries.
 *
 * Global constraints are always projected.
 * Contextual constraints are projected as "allowed" only when the
 * change/repair target matches the owning subject.
 * Advisory constraints are never projected (they only appear in findings).
 */
export declare function projectArchitectureConstraints(input: ProjectArchitectureConstraintsInput): ArchitectureScopeEntry[];
