/**
 * Draft Promotion
 *
 * ref: P8-003
 *
 * The ONLY path from quarantine to canonical for LLM-generated drafts.
 *
 * promoteDraft():
 *   1. Reads quarantined draft
 *   2. Re-validates with DraftValidator
 *   3. Saves revision (immutable)
 *   4. Sets canonical pointer
 *   5. Appends audit event: "draft_promoted"
 *
 * This function requires an explicit operator decision.
 * Draft MUST have been quarantined by runIdeaToDraft() first.
 */
import type { Artifact } from "./types.js";
import type { StoreConfig } from "./artifactStore.js";
export type PromoteDraftResult = {
    status: "promoted";
    artifact: Artifact;
    canonical_revision_id: string;
} | {
    status: "rejected";
    reason: string;
};
export type PromoteDraftRequest = {
    quarantine_id: string;
    operator_id: string;
    rationale: string;
    existing_artifact_ids?: string[];
};
/**
 * Promote a quarantined draft to canonical.
 *
 * This is the ONLY legitimate path for an LLM-generated draft
 * to become a canonical artifact.
 *
 * Steps:
 *   1. Load draft from quarantine
 *   2. Re-validate with DraftValidator (structural integrity check)
 *   3. Save as immutable revision
 *   4. Set canonical pointer
 *   5. Append "draft_promoted" audit event
 */
export declare function promoteDraft(store: StoreConfig, request: PromoteDraftRequest): Promise<PromoteDraftResult>;
