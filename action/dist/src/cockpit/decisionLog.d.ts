/**
 * Decision Log — System Writer
 *
 * ref: P7b-004
 *
 * Append-only JSONL ledger for release decisions.
 * NOT a full Artifact — no revisions, no linting, no LLM patching.
 *
 * Write point: POST /api/release/multi-decide success
 * Storage: data/decisions/decisions.jsonl
 */
export type DecisionEntry = {
    decision_id: string;
    decision_type: string;
    operator_id: string;
    release_decision_id: string;
    affected_artifacts: string[];
    canonical_revision_ids: Record<string, string>;
    rationale: string;
    created_at: string;
    quality_snapshot?: Record<string, unknown>;
};
/**
 * Append a single DecisionEntry to the JSONL log.
 */
export declare function appendDecisionEntry(dataDir: string, entry: DecisionEntry): Promise<void>;
/**
 * Read all decision entries from the JSONL log.
 * Returns empty array if file doesn't exist.
 */
export declare function readDecisionLog(dataDir: string): Promise<DecisionEntry[]>;
