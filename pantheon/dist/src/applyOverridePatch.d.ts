/**
 * Override Patch Application
 *
 * ref: 执行宪法 v0.2 §14, C-08
 *
 * Human Override is a formal commit type, not a secret backdoor.
 * Every override:
 *   - Generates an OverridePatch with rationale + risk acceptance
 *   - Creates a new revision
 *   - Updates the canonical pointer
 *   - Appends an audit log entry
 *   - Maintains the parent revision chain
 *
 * Overridable:
 *   - Semantic regression warnings
 *   - Red-team objections
 *   - Style issues, terminology disagreements
 *
 * NOT overridable (mechanical integrity):
 *   - JSON parse failures
 *   - Schema validation failures
 *   - block_id existence
 *   - expected_old_hash match
 *   - base_revision_id match
 *   - revision hash computation
 *   - audit log append
 */
import { type StoreConfig } from "./artifactStore.js";
import type { Artifact, OverridePatch, AuditEntry } from "./types.js";
/**
 * Check if any of the failed gates are non-overridable.
 * ref: C-08 — "人类不能覆盖机械完整性 gate"
 */
export declare function hasNonOverridableGates(failedGates: string[]): string[];
export type OverrideResult = {
    status: "applied";
    new_revision: Artifact;
    audit_entry: AuditEntry;
} | {
    status: "rejected";
    reason: string;
};
/**
 * Apply a Human Override Patch.
 *
 * ref: §14, C-08
 *
 * @param config - Store configuration
 * @param artifact - The current canonical artifact (or candidate)
 * @param override - The OverridePatch from the human operator
 * @returns OverrideResult
 */
export declare function applyOverridePatch(config: StoreConfig, artifact: Artifact, override: OverridePatch): Promise<OverrideResult>;
