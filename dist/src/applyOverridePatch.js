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
import { computeBlockContentHash, computeRevisionId } from "./hash.js";
import { saveRevision, updateCanonicalPointer, appendAuditLog, } from "./artifactStore.js";
// ---------------------------------------------------------------------------
// Mechanical integrity gates (NOT overridable)
// ---------------------------------------------------------------------------
const NON_OVERRIDABLE_GATES = new Set([
    "json_parse",
    "schema_gate",
    "block_id_existence",
    "expected_old_hash_match",
    "base_revision_id_match",
    "revision_hash_computation",
    "audit_log_append",
    "new_block_hash_invalid",
]);
/**
 * Check if any of the failed gates are non-overridable.
 * ref: C-08 — "人类不能覆盖机械完整性 gate"
 */
export function hasNonOverridableGates(failedGates) {
    return failedGates.filter((g) => NON_OVERRIDABLE_GATES.has(g));
}
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
export async function applyOverridePatch(config, artifact, override) {
    // --- Pre-check: non-overridable gates ---
    const blocked = hasNonOverridableGates(override.failed_gates);
    if (blocked.length > 0) {
        return {
            status: "rejected",
            reason: `Cannot override mechanical integrity gates: [${blocked.join(", ")}]. ` +
                `These gates are never overridable (ref: C-08).`,
        };
    }
    // --- Verify base_revision_id matches ---
    if (override.base_revision_id !== artifact.revision_id) {
        return {
            status: "rejected",
            reason: `Override base_revision_id "${override.base_revision_id}" does not match ` +
                `artifact revision "${artifact.revision_id}"`,
        };
    }
    // --- Build the new revision ---
    let newArtifact;
    switch (override.override_type) {
        case "accept_failed_gate":
        case "accept_with_known_risk":
        case "defer_issue": {
            // These types accept the candidate as-is (or the current state).
            // No block changes — the override just records the decision.
            newArtifact = {
                ...artifact,
                parent_revision_id: artifact.revision_id,
                metadata: {
                    ...artifact.metadata,
                    updated_at: new Date().toISOString(),
                },
            };
            break;
        }
        case "manual_replace_block": {
            // Human provides explicit block replacements
            if (!override.operations || override.operations.length === 0) {
                return {
                    status: "rejected",
                    reason: "manual_replace_block requires at least one operation",
                };
            }
            // --- HARD-001: Mechanical integrity checks (NOT overridable) ---
            // Build block index for lookup
            const blockIndex = new Map();
            for (const section of artifact.sections) {
                for (const block of section.commitments) {
                    blockIndex.set(block.block_id, block);
                }
            }
            // Check 1: Duplicate target_block_id in same override
            const seenBlockIds = new Set();
            for (const op of override.operations) {
                if (seenBlockIds.has(op.target_block_id)) {
                    return {
                        status: "rejected",
                        reason: `Duplicate target_block_id "${op.target_block_id}" in override operations. ` +
                            `Each block may only be targeted once per override.`,
                    };
                }
                seenBlockIds.add(op.target_block_id);
            }
            for (const op of override.operations) {
                // Check 2: target_block_id must exist
                const existingBlock = blockIndex.get(op.target_block_id);
                if (!existingBlock) {
                    return {
                        status: "rejected",
                        reason: `target_block_id "${op.target_block_id}" does not exist in artifact. ` +
                            `Override cannot target non-existent blocks (mechanical integrity).`,
                    };
                }
                // Check 3: expected_old_hash must match
                if (op.expected_old_hash !== undefined &&
                    op.expected_old_hash !== existingBlock.content_hash) {
                    return {
                        status: "rejected",
                        reason: `expected_old_hash mismatch for block "${op.target_block_id}": ` +
                            `expected "${op.expected_old_hash}" but current is "${existingBlock.content_hash}". ` +
                            `Override cannot proceed on stale data (mechanical integrity).`,
                    };
                }
                // Check 4: new_block.block_id must match target_block_id
                if (op.new_block.block_id !== op.target_block_id) {
                    return {
                        status: "rejected",
                        reason: `new_block.block_id "${op.new_block.block_id}" does not match ` +
                            `target_block_id "${op.target_block_id}". ` +
                            `Block ID substitution is forbidden (mechanical integrity).`,
                    };
                }
            }
            // --- All mechanical checks passed: apply replacements ---
            const newSections = artifact.sections.map((section) => ({
                ...section,
                commitments: section.commitments.map((block) => {
                    const op = override.operations.find((o) => o.target_block_id === block.block_id);
                    if (op) {
                        // Recompute hash for correctness (human may provide stale hash)
                        const correctHash = computeBlockContentHash(op.new_block);
                        return {
                            ...op.new_block,
                            content_hash: correctHash,
                        };
                    }
                    return { ...block };
                }),
            }));
            newArtifact = {
                ...artifact,
                parent_revision_id: artifact.revision_id,
                sections: newSections,
                metadata: {
                    ...artifact.metadata,
                    updated_at: new Date().toISOString(),
                },
            };
            break;
        }
        case "request_targeted_rewrite": {
            // This type doesn't create a new revision immediately.
            // It queues a rewrite request. For MVP, we just record the decision.
            newArtifact = {
                ...artifact,
                parent_revision_id: artifact.revision_id,
                metadata: {
                    ...artifact.metadata,
                    updated_at: new Date().toISOString(),
                },
            };
            break;
        }
        default: {
            return {
                status: "rejected",
                reason: `Unknown override_type: "${override.override_type}"`,
            };
        }
    }
    // Compute new revision_id
    newArtifact.revision_id = computeRevisionId(newArtifact);
    // --- Persist ---
    // Save revision
    await saveRevision(config, newArtifact);
    // Update canonical pointer
    await updateCanonicalPointer(config, newArtifact.artifact_id, newArtifact.revision_id);
    // Build audit entry
    const auditEntry = {
        entry_id: `audit_ovr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: override.timestamp,
        entry_type: "override_applied",
        artifact_id: newArtifact.artifact_id,
        revision_id: newArtifact.revision_id,
        details: {
            override_id: override.override_id,
            override_type: override.override_type,
            operator: override.operator,
            failed_gates: override.failed_gates,
            affected_issue_ids: override.affected_issue_ids,
            rationale: override.rationale,
            risk_acceptance: override.risk_acceptance,
            parent_revision_id: artifact.revision_id,
        },
    };
    await appendAuditLog(config, auditEntry);
    return {
        status: "applied",
        new_revision: newArtifact,
        audit_entry: auditEntry,
    };
}
//# sourceMappingURL=applyOverridePatch.js.map