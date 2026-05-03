/**
 * P30: Architecture Contract Builder
 *
 * Builds the immutable architecture contract from accepted relations.
 * This is the central artifact that constrains change/repair workflows.
 *
 * Three-tier constraint projection (User-Required Invariant A):
 * - Global: forbidden_change, review_required_for, external_service → always apply
 * - Contextual: owns, located_at, allowed_change → only when target matches subject
 * - Advisory: remaining 7 relation types → render findings, never affect verdict
 *
 * ref: P30
 */
import type { ArchitectureRelation, ArchitectureContract } from "./types.js";
export type BuildArchitectureContractInput = {
    readonly archId: string;
    readonly sourceDocumentHash: string;
    readonly revision: number;
    readonly resolvedRelations: readonly ArchitectureRelation[];
    readonly allClaimIds: readonly string[];
};
/**
 * Build an architecture contract from resolved (post-override) relations.
 *
 * Only relations with `review_status === "accepted"` or `review_status === "edited"`
 * are included as constraint-generating. Rejected and unreviewed relations
 * are recorded but do not produce constraints.
 */
export declare function buildArchitectureContract(input: BuildArchitectureContractInput): ArchitectureContract;
