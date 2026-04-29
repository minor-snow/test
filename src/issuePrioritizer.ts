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

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

const TIER_MAP: Record<string, number> = {
  // Tier 0: integrity corruption (reserved for future)
  integrity_corruption: 0,

  // Tier 1: stale cross-artifact links
  stale_link: 1,
  stale_interface_link: 1,

  // Tier 2: orphan cross-artifact links
  orphan_interface_contract: 2,
  orphan_module_contract: 2,

  // Tier 3: unsafe canonical commit
  unsafe_canonical_commit: 3,

  // Tier 4: empty block text
  empty_block_text: 4,

  // Tier 5: domain irrelevant content
  domain_irrelevant_content: 5,

  // Tier 6: undefined term
  undefined_term: 6,

  // Tier 7: redundant narrative
  redundant_narrative: 7,
};

/** Default tier for unknown issue types */
const DEFAULT_TIER = 8;

/** Maximum known tier */
export const MAX_TIER = 8;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the priority tier for an issue type.
 * Lower number = higher priority.
 */
export function getIssueTier(issueType: string): number {
  return TIER_MAP[issueType] ?? DEFAULT_TIER;
}

/**
 * Sort issues by priority tier, then by artifact_id, then by target_block_id.
 * Returns a new sorted array (does not mutate input).
 */
export function prioritizeIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const tierA = getIssueTier(a.issue_type);
    const tierB = getIssueTier(b.issue_type);
    if (tierA !== tierB) return tierA - tierB;

    // Same tier: sort by artifact_id for determinism
    if (a.artifact_id !== b.artifact_id) {
      return a.artifact_id.localeCompare(b.artifact_id);
    }

    // Same artifact: sort by target_block_id
    return a.target_block_id.localeCompare(b.target_block_id);
  });
}

/**
 * Compute priority tier statistics from an issue list.
 */
export function countByTier(issues: Issue[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const issue of issues) {
    const tier = getIssueTier(issue.issue_type);
    counts[tier] = (counts[tier] || 0) + 1;
  }
  return counts;
}
