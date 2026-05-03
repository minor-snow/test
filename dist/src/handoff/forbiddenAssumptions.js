/**
 * Forbidden Assumptions Projector — Deterministic invariants
 *
 * ref: P11a-007
 *
 * These are hard constraints that implementers MUST NOT violate.
 * Each one references source blocks from P10 artifacts.
 */
// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------
function findBlocksContaining(artifact, keywords) {
    const matched = [];
    for (const sec of artifact.sections) {
        for (const b of sec.commitments) {
            const text = `${b.text} ${b.rationale || ""}`.toLowerCase();
            if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
                matched.push(b.block_id);
            }
        }
    }
    return matched;
}
function allBlocks(...artifacts) {
    return (kws) => {
        const all = [];
        for (const a of artifacts)
            all.push(...findBlocksContaining(a, kws));
        return all;
    };
}
// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------
export function projectForbiddenAssumptions(architecture, interfaceSpec, moduleSpec) {
    const find = allBlocks(architecture, interfaceSpec, moduleSpec);
    return [
        {
            assumption_id: "FA-001",
            statement: "Do not use LWW for clinical case status, veterinary notes, triage results, risk levels, or suspected conditions unless the field is explicitly listed in the conflict_policy_matrix with policy=last_writer_wins AND a high-risk acceptance exists in the RiskRegister.",
            reason: "Clinical data requires causal ordering via vector clocks to prevent silent data loss from concurrent edits by different clinicians or devices.",
            source_blocks: find(["last-writer-wins", "clinical", "vector clock", "conflict"]),
        },
        {
            assumption_id: "FA-002",
            statement: "Do not silently overwrite remote veterinary edits when syncing local pending reports.",
            reason: "A remote vet may have updated case notes during the offline period. Silent overwrite could discard critical clinical observations.",
            source_blocks: find(["never silently", "overwrite", "veterinary", "clinical"]),
        },
        {
            assumption_id: "FA-003",
            statement: "Do not require users to re-enter completed offline triage data after network restore or app restart.",
            reason: "Offline triage results are persisted in Room and survive process kill. Forcing re-entry causes data loss and wastes clinician time.",
            source_blocks: find(["re-entry", "re-enter", "survive", "persist", "app restart"]),
        },
        {
            assumption_id: "FA-004",
            statement: "Do not treat network failure as terminal for completed offline reports. Failed syncs must remain in the retry queue.",
            reason: "Offline-first architecture guarantees that completed reports are never lost due to network conditions. The retry ledger handles backoff and eventual delivery.",
            source_blocks: find(["network failure", "terminal", "retry", "pending", "queue"]),
        },
        {
            assumption_id: "FA-005",
            statement: "Do not invent new sync states or report lifecycle states outside the defined state machines (PendingReportState, SyncOperationState, ConflictResolutionState).",
            reason: "Undocumented states break the deterministic state machine contracts, make conflict resolution unpredictable, and prevent audit trail completeness.",
            source_blocks: find(["state", "lifecycle", "pending", "sync", "conflict"]),
        },
        {
            assumption_id: "FA-006",
            statement: "Do not omit audit events for conflict resolution transitions. Every conflict detection, clinician review, and resolution action must generate an audit event.",
            reason: "Audit trail is required for clinical compliance and post-incident review. Missing audit events make conflict history non-reconstructable.",
            source_blocks: find(["audit", "conflict", "resolution", "event"]),
        },
        {
            assumption_id: "FA-007",
            statement: "Do not parse the sync_cursor. It is an opaque server-issued token. Client must store and return it as-is.",
            reason: "Cursor format is server-internal. Parsing it creates a coupling that breaks on server-side cursor format changes.",
            source_blocks: find(["sync cursor", "opaque", "server"]),
        },
        {
            assumption_id: "FA-008",
            statement: "Do not auto-resolve conflicts on overlapping clinical fields. If both local and remote versions modified the same clinical field, the conflict must be escalated to clinician review.",
            reason: "Only a clinician can determine which version of a clinical observation is correct. Automated resolution risks patient safety.",
            source_blocks: find(["clinician", "review", "clinical", "auto-resolve", "manual"]),
        },
    ];
}
//# sourceMappingURL=forbiddenAssumptions.js.map