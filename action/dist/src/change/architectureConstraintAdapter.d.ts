/**
 * P30-9: Architecture Constraint Adapter (for Change)
 *
 * Converts an accepted ArchitectureContract into ChangeScopeEntry[]
 * that the changeScopeBuilder can consume.
 *
 * Key safety properties:
 * - Only ACCEPTED relations with review_status "accepted" produce entries
 * - Unreviewed/rejected relations produce nothing
 * - forbidden > review_required > allowed precedence is ALWAYS maintained
 * - User intent CANNOT downgrade architecture-sourced forbidden or review
 * - Advisory-only relations produce info-level entries, never forbidden/review
 *
 * The adapter does NOT consume the contract directly. It takes the
 * projector output (ArchitectureConstraintProjectionEntry[]) which
 * has already resolved contextual vs global constraints.
 *
 * ref: P30
 */
import type { ChangeScopeEntry } from "./types.js";
import type { ArchitectureContract } from "../architecture/types.js";
export type ArchitectureConstraintAdapterInput = {
    /** The active architecture contract (from base branch for PRs) */
    readonly contract: ArchitectureContract;
    /** User-declared change target subjects (module names) */
    readonly targetSubjects: readonly string[];
    /** User-declared target path patterns */
    readonly targetPathPatterns: readonly string[];
};
export type ArchitectureConstraintAdapterResult = {
    /** Scope entries to merge into the change scope */
    readonly entries: readonly ChangeScopeEntry[];
    /** Architecture findings to attach to verification */
    readonly summary: {
        readonly forbidden: number;
        readonly review_required: number;
        readonly allowed: number;
        readonly info: number;
    };
};
/**
 * Convert accepted architecture contract constraints into change scope entries.
 *
 * Only constraints from accepted relations are projected.
 * The `source` field is always "architecture_contract" so the
 * scope builder can distinguish architecture-sourced entries from
 * user-intent or default-rule entries.
 */
export declare function adaptArchitectureConstraints(input: ArchitectureConstraintAdapterInput): ArchitectureConstraintAdapterResult;
