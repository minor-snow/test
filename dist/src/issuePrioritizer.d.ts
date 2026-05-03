/**
 * Issue Prioritizer
 *
 * ref: P7b-001
 *
 * Deterministic issue sorter for multi-artifact trials.
 * Pure function: Issue[] → Issue[] (sorted by priority tier).
 *
 * Priority tiers (0 = highest):
 *   0: Integrity corruption (future)
 *   1: stale_link, stale_interface_link — high-severity cross, data rot
 *   2: orphan_interface_contract, orphan_module_contract — required cross-links missing
 *   3: unsafe_canonical_commit — high-severity local
 *   4: empty_block_text — high-severity local
 *   5: domain_irrelevant_content — medium local
 *   6: undefined_term — medium local (high volume)
 *   7: redundant_narrative — low cleanup
 *
 * Within same tier: sort by artifact_id then target_block_id for determinism.
 */
import type { Issue } from "./types.js";
/** Maximum known tier */
export declare const MAX_TIER = 8;
/**
 * Get the priority tier for an issue type.
 * Lower number = higher priority.
 */
export declare function getIssueTier(issueType: string): number;
/**
 * Sort issues by priority tier, then by artifact_id, then by target_block_id.
 * Returns a new sorted array (does not mutate input).
 */
export declare function prioritizeIssues(issues: Issue[]): Issue[];
/**
 * Compute priority tier statistics from an issue list.
 */
export declare function countByTier(issues: Issue[]): Record<number, number>;
