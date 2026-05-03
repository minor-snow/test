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
import { loadFromQuarantine, saveRevision, updateCanonicalPointer, appendAuditLog, } from "./artifactStore.js";
import { validateDraft } from "./draftValidator.js";
import { getHashMeta } from "./hash.js";
// ---------------------------------------------------------------------------
// Promote
// ---------------------------------------------------------------------------
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
export async function promoteDraft(store, request) {
    // Step 1: Load from quarantine
    const quarantined = await loadFromQuarantine(store, request.quarantine_id);
    if (!quarantined) {
        return {
            status: "rejected",
            reason: `Quarantine item "${request.quarantine_id}" not found`,
        };
    }
    // Extract artifact — quarantine may store raw artifact or wrapped object
    let artifactData;
    if (typeof quarantined === "object" &&
        quarantined !== null &&
        "artifact_id" in quarantined) {
        artifactData = quarantined;
    }
    else {
        return {
            status: "rejected",
            reason: "Quarantine item does not contain a valid artifact",
        };
    }
    // Step 2: Re-validate with DraftValidator
    const validation = validateDraft(artifactData, request.existing_artifact_ids ?? []);
    if (validation.status === "rejected") {
        return {
            status: "rejected",
            reason: `Re-validation failed: ${validation.errors.join("; ")}`,
        };
    }
    const artifact = validation.artifact;
    // Step 3: Save revision (immutable)
    try {
        await saveRevision(store, artifact);
    }
    catch (err) {
        // Only swallow the specific "immutable revision exists" error from saveRevision.
        // Any other error (disk, permission, corruption) must propagate.
        const isRevisionExists = err instanceof Error &&
            err.message.startsWith("Revision already exists and is immutable:");
        if (!isRevisionExists) {
            throw err;
        }
    }
    // Step 4: Set canonical pointer
    await updateCanonicalPointer(store, artifact.artifact_id, artifact.revision_id);
    // Step 5: Audit
    await appendAuditLog(store, {
        entry_id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        entry_type: "draft_promoted",
        artifact_id: artifact.artifact_id,
        revision_id: artifact.revision_id,
        details: {
            quarantine_id: request.quarantine_id,
            operator_id: request.operator_id,
            rationale: request.rationale,
            artifact_type: artifact.artifact_type,
            schema_version: artifact.schema_version,
            hash_meta: getHashMeta(),
            block_count: artifact.sections.reduce((sum, s) => sum + s.commitments.length, 0),
        },
    });
    return {
        status: "promoted",
        artifact,
        canonical_revision_id: artifact.revision_id,
    };
}
//# sourceMappingURL=promoteDraft.js.map