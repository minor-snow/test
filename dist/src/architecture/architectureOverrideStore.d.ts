/**
 * P30: Architecture Override Store
 *
 * JSONL append-only log for architecture overrides.
 * Each line is one override event — the source of truth.
 * `resolveOverrides()` computes the latest-wins semantic view at accept time.
 *
 * Design decision:
 * - JSONL for auditability (each override is a discrete event)
 * - Override event IDs include timestamp for ledger identity
 * - The resolved view is computed, not stored — contract hash
 *   derives from semantic content, not override timestamps
 *
 * ref: P30
 */
import type { ArchitectureOverride, ArchitectureRelation } from "./types.js";
/**
 * Append an override event to the JSONL log.
 */
export declare function appendArchitectureOverride(repoRoot: string, archId: string, override: Omit<ArchitectureOverride, "override_id" | "created_at">): ArchitectureOverride;
/**
 * Load all override events from the JSONL log.
 */
export declare function loadArchitectureOverrides(repoRoot: string, archId: string): ArchitectureOverride[];
/**
 * Apply overrides to relations, producing the resolved semantic view.
 *
 * Latest override wins per (subject, relation_type, object) triple.
 * This is the view used by `arch accept` to build the contract.
 *
 * Returns:
 * - Updated relations with review_status and path_patterns modified
 * - New relations created by `set_mapping`, `set_external`, etc.
 */
export declare function resolveOverrides(relations: readonly ArchitectureRelation[], overrides: readonly ArchitectureOverride[]): ArchitectureRelation[];
