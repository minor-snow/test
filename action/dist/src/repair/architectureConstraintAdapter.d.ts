/**
 * P30-10: Architecture Constraint Adapter (for Repair)
 *
 * Converts an accepted ArchitectureContract into RepairScopeEntry[]
 * that the repairScopeBuilder can consume.
 *
 * Same safety properties as the Change adapter (P30-9):
 * - Only ACCEPTED constraints from reviewed contract produce entries
 * - forbidden > review_required > allowed precedence maintained
 * - Advisory-only relations never produce blocking entries
 * - Repair's existing suspect/impact/scope semantics are preserved
 *
 * The repair adapter does NOT replace suspect surface or impact surface.
 * It ONLY injects architecture-sourced forbidden/review/allowed constraints
 * that are then merged into the shared precedence resolver.
 *
 * ref: P30
 */
import type { RepairScopeEntry } from "./types.js";
import type { ArchitectureContract } from "../architecture/types.js";
export type RepairArchitectureAdapterInput = {
    /** The active architecture contract */
    readonly contract: ArchitectureContract;
    /** Repair target subjects (module names from the bug report) */
    readonly repairSubjects: readonly string[];
};
export type RepairArchitectureAdapterResult = {
    /** Scope entries to merge into the repair scope */
    readonly entries: readonly RepairScopeEntry[];
    /** Summary for audit trail */
    readonly summary: {
        readonly forbidden: number;
        readonly review_required: number;
        readonly allowed: number;
        readonly info: number;
    };
};
/**
 * Convert accepted architecture contract constraints into repair scope entries.
 *
 * Follows the same constraint projection logic as the change adapter,
 * but produces RepairScopeEntry (pattern + source + confidence + audit_weight).
 */
export declare function adaptArchitectureConstraintsForRepair(input: RepairArchitectureAdapterInput): RepairArchitectureAdapterResult;
