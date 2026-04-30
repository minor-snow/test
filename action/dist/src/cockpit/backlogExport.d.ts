/**
 * Backlog Export with Provenance
 *
 * ref: Phase 5 P5-003
 *
 * Generates BacklogItem entries from residual issues.
 * Each item carries full provenance: block_id, section_id,
 * canonical_revision_id, source_issue_id, and why_deferred.
 */
import type { BacklogItem, ResidualSnapshot, ReleaseDecision } from "./types.js";
export declare function generateBacklogItems(residual: ResidualSnapshot, canonicalRevisionId: string, releaseDecisionId: string, overrides?: Record<string, string>): BacklogItem[];
export declare function exportBacklogMarkdown(items: BacklogItem[]): string;
export declare const ALLOWED_DECISIONS: readonly ["accepted_clean", "accepted_with_residual_issues", "rejected_requires_cleanup"];
export type AllowedReleaseDecision = (typeof ALLOWED_DECISIONS)[number];
export declare function isAllowedReleaseDecision(value: unknown): value is AllowedReleaseDecision;
export declare function validateReleaseDecision(decision: ReleaseDecision): {
    valid: boolean;
    errors: string[];
};
